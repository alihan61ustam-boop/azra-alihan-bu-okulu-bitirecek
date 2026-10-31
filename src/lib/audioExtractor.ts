import { TranscriptItem } from "@/types/academic";
import { formatSecToTimestamp } from "@/lib/emtLectureData";

export interface SpeechBurst {
  startRelSec: number;
  endRelSec: number;
}

export interface WavSubPart {
  partNumber: number; // 1, 2, 3, or 4 within the 4-minute package
  startSec: number; // Absolute second in video (e.g. 0, 60, 120, 180)
  endSec: number;
  durationSec: number; // Up to 60s
  base64Wav: string;
  firstVoiceRelSec: number;
  lastVoiceRelSec: number;
  voicedRelSeconds: number[];
  speechBursts: SpeechBurst[];
}

export interface WavChunk {
  index: number;
  startSec: number;
  endSec: number;
  durationSec: number; // 240s (4 minutes)
  base64Wav: string;
  subParts: WavSubPart[];
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(sub));
  }
  return btoa(binary);
}

function encodeMonoPcm16ToWavBase64(
  samples: Float32Array,
  sampleRate: number
): string {
  const numSamples = samples.length;
  const dataBytes = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, dataBytes, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return uint8ToBase64(new Uint8Array(buffer));
}

function analyzeSliceVoiceActivity(
  slice: Float32Array,
  sampleRate: number,
  durationSec: number
): {
  firstVoiceRelSec: number;
  lastVoiceRelSec: number;
  voicedRelSeconds: number[];
  speechBursts: SpeechBurst[];
} {
  const rmsBySec: number[] = [];
  for (let s = 0; s < durationSec; s++) {
    const start = s * sampleRate;
    const end = Math.min(slice.length, (s + 1) * sampleRate);
    if (end <= start) {
      rmsBySec.push(0);
      continue;
    }
    let sumSq = 0;
    for (let i = start; i < end; i++) {
      sumSq += slice[i] * slice[i];
    }
    rmsBySec.push(Math.sqrt(sumSq / (end - start)));
  }

  const sortedRms = [...rmsBySec].sort((a, b) => a - b);
  const p15 = sortedRms[Math.floor(sortedRms.length * 0.15)] || 0;
  const p85 = sortedRms[Math.floor(sortedRms.length * 0.85)] || 0.01;
  const threshold = Math.max(0.0025, p15 + (p85 - p15) * 0.16);

  const voicedRelSeconds: number[] = [];
  for (let s = 0; s < durationSec; s++) {
    if (rmsBySec[s] >= threshold) {
      voicedRelSeconds.push(s);
    }
  }

  if (voicedRelSeconds.length === 0) {
    for (let s = 0; s < durationSec; s++) {
      voicedRelSeconds.push(s);
    }
  }

  const speechBursts: SpeechBurst[] = [];
  let burstStart = voicedRelSeconds[0];
  let prev = voicedRelSeconds[0];
  for (let i = 1; i < voicedRelSeconds.length; i++) {
    const cur = voicedRelSeconds[i];
    if (cur - prev > 2) {
      speechBursts.push({ startRelSec: burstStart, endRelSec: prev + 1 });
      burstStart = cur;
    }
    prev = cur;
  }
  speechBursts.push({ startRelSec: burstStart, endRelSec: prev + 1 });

  return {
    firstVoiceRelSec: voicedRelSeconds[0] ?? 0,
    lastVoiceRelSec:
      voicedRelSeconds[voicedRelSeconds.length - 1] ??
      Math.max(0, durationSec - 1),
    voicedRelSeconds,
    speechBursts,
  };
}

async function decodeMediaBlobToMonoPcm(
  blob: Blob,
  targetSampleRate = 6000
): Promise<{ monoSamples: Float32Array; totalDurationSec: number }> {
  const arrayBuffer = await blob.arrayBuffer();

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;

  let audioCtx: AudioContext;
  try {
    audioCtx = new AudioCtx({ sampleRate: targetSampleRate });
  } catch {
    audioCtx = new AudioCtx();
  }

  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    try {
      await audioCtx.close();
    } catch {
      // ignore
    }
  }

  const totalDurationSec = audioBuffer.duration;
  const srcRate = audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels;
  const ch0 = audioBuffer.getChannelData(0);
  const ch1 = numChannels > 1 ? audioBuffer.getChannelData(1) : null;

  let monoSamples: Float32Array;
  if (srcRate === targetSampleRate) {
    if (!ch1) {
      monoSamples = ch0;
    } else {
      monoSamples = new Float32Array(ch0.length);
      for (let i = 0; i < ch0.length; i++) {
        monoSamples[i] = (ch0[i] + ch1[i]) * 0.5;
      }
    }
  } else {
    const ratio = srcRate / targetSampleRate;
    const outLength = Math.floor(ch0.length / ratio);
    monoSamples = new Float32Array(outLength);
    for (let i = 0; i < outLength; i++) {
      const startIdx = Math.floor(i * ratio);
      const endIdx = Math.min(ch0.length, Math.floor((i + 1) * ratio));
      let sum = 0;
      let count = 0;
      for (let j = startIdx; j < endIdx; j++) {
        sum += ch1 ? (ch0[j] + ch1[j]) * 0.5 : ch0[j];
        count++;
      }
      monoSamples[i] = count > 0 ? sum / count : 0;
    }
  }

  return { monoSamples, totalDurationSec };
}

/**
 * Slices the decoded video audio into 4-minute (240s) packages.
 * Each 4-minute package also contains 4 internal 60-second WavSubParts
 * with physical PCM voice onset/offset metadata so Gemini processes
 * 4 minutes at a time (never hitting rate limits) while every 60-second
 * minute boundary is hardware-locked to the exact second!
 */
export async function extractWavChunksFromMediaBlob(
  blob: Blob,
  chunkDurationSec = 240,
  targetSampleRate = 6000
): Promise<{ chunks: WavChunk[]; totalDurationSec: number }> {
  const { monoSamples, totalDurationSec } = await decodeMediaBlobToMonoPcm(
    blob,
    targetSampleRate
  );

  const pkgSec = Math.max(60, chunkDurationSec);
  const samplesPerPkg = pkgSec * targetSampleRate;
  const totalPackages = Math.max(
    1,
    Math.ceil(monoSamples.length / samplesPerPkg)
  );
  const chunks: WavChunk[] = [];

  for (let idx = 0; idx < totalPackages; idx++) {
    const pkgStartSample = idx * samplesPerPkg;
    const pkgEndSample = Math.min(
      monoSamples.length,
      (idx + 1) * samplesPerPkg
    );
    if (pkgEndSample <= pkgStartSample) continue;

    const pkgSlice = monoSamples.subarray(pkgStartSample, pkgEndSample);
    const pkgStartSec = Math.round(pkgStartSample / targetSampleRate);
    const pkgEndSec = Math.round(pkgEndSample / targetSampleRate);
    const pkgDurationSec = Math.max(1, pkgEndSec - pkgStartSec);

    // Build up to 4 internal 60-second sub-parts inside this 4-minute package
    const subParts: WavSubPart[] = [];
    const subSec = 60;
    const samplesPerSub = subSec * targetSampleRate;
    const numSubs = Math.max(1, Math.ceil(pkgSlice.length / samplesPerSub));

    for (let s = 0; s < numSubs; s++) {
      const subStartSample = s * samplesPerSub;
      const subEndSample = Math.min(pkgSlice.length, (s + 1) * samplesPerSub);
      if (subEndSample <= subStartSample) continue;

      const subSlice = pkgSlice.subarray(subStartSample, subEndSample);
      const absStartSec =
        pkgStartSec + Math.round(subStartSample / targetSampleRate);
      const absEndSec =
        pkgStartSec + Math.round(subEndSample / targetSampleRate);
      const subDurSec = Math.max(1, absEndSec - absStartSec);

      const {
        firstVoiceRelSec,
        lastVoiceRelSec,
        voicedRelSeconds,
        speechBursts,
      } = analyzeSliceVoiceActivity(subSlice, targetSampleRate, subDurSec);

      subParts.push({
        partNumber: s + 1,
        startSec: absStartSec,
        endSec: absEndSec,
        durationSec: subDurSec,
        base64Wav: encodeMonoPcm16ToWavBase64(subSlice, targetSampleRate),
        firstVoiceRelSec,
        lastVoiceRelSec,
        voicedRelSeconds,
        speechBursts,
      });
    }

    chunks.push({
      index: idx,
      startSec: pkgStartSec,
      endSec: pkgEndSec,
      durationSec: pkgDurationSec,
      base64Wav: encodeMonoPcm16ToWavBase64(pkgSlice, targetSampleRate),
      subParts,
    });
  }

  return { chunks, totalDurationSec };
}

/**
 * Preserves Gemini's natural relative speech timing (NEVER overwrites with word-count ratios!),
 * while anchoring each 60-second sub-part's start and end to the physical voice onset/offset
 * if Gemini drifted across an initial/trailing silence or outside the sub-part window.
 */
export function anchorSubPartItemsToVoiceOnset(
  items: TranscriptItem[],
  subPart: WavSubPart
): TranscriptItem[] {
  if (!items || items.length === 0) return [];

  const n = items.length;
  const rels = items.map((it) =>
    Math.max(
      0,
      Math.min(subPart.durationSec - 1, it.seconds - subPart.startSec)
    )
  );

  const minModelRel = rels[0];
  const maxModelRel = rels[n - 1];
  const targetStart = subPart.firstVoiceRelSec;
  const targetEnd = Math.max(targetStart + 1, subPart.lastVoiceRelSec);

  // Check if Gemini's start/end for this 60s sub-part already match the physical voice onset/offset within 3s
  const startDrift = Math.abs(minModelRel - targetStart);
  const endDrift = Math.abs(maxModelRel - targetEnd);

  let isMonotonic = true;
  for (let i = 1; i < n; i++) {
    if (rels[i] < rels[i - 1]) {
      isMonotonic = false;
      break;
    }
  }

  // If Gemini's timestamps are already well-aligned with the voice onset/offset, keep them untouched!
  if (startDrift <= 3 && endDrift <= 5 && isMonotonic) {
    return items;
  }

  // If there is a constant shift (e.g. initial silence of 2s-8s wasn't accounted for), shift/scale smoothly while keeping Gemini's exact relative intervals!
  const modelSpan = Math.max(1, maxModelRel - minModelRel);
  const voiceSpan = Math.max(1, targetEnd - targetStart);

  let prevAbs = subPart.startSec + targetStart;
  return items.map((item, i) => {
    let newRel: number;
    if (n === 1) {
      newRel = targetStart;
    } else if (modelSpan >= 4) {
      // Preserve Gemini's exact relative spacing between sentences!
      const normalized = (rels[i] - minModelRel) / modelSpan;
      newRel = Math.round(targetStart + normalized * voiceSpan);
    } else {
      const ratio = i / Math.max(1, n - 1);
      newRel = Math.round(targetStart + ratio * voiceSpan);
    }

    // Snap away from dead silence (>3s gap) if needed
    if (subPart.voicedRelSeconds.length > 0) {
      let closestVoice = subPart.voicedRelSeconds[0];
      let minDiff = Math.abs(newRel - closestVoice);
      for (const v of subPart.voicedRelSeconds) {
        const d = Math.abs(newRel - v);
        if (d < minDiff) {
          minDiff = d;
          closestVoice = v;
        }
      }
      if (minDiff >= 2) {
        newRel = closestVoice;
      }
    }

    let absSec = subPart.startSec + Math.max(0, Math.min(subPart.durationSec - 1, newRel));
    if (i > 0 && absSec < prevAbs) {
      absSec = prevAbs;
    }
    prevAbs = absSec;

    return {
      ...item,
      seconds: absSec,
      timestamp: formatSecToTimestamp(absSec),
    };
  });
}
