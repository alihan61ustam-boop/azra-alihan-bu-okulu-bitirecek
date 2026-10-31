import { TranscriptItem } from "@/types/academic";
import { formatSecToTimestamp } from "@/lib/emtLectureData";

export interface SpeechBurst {
  startRelSec: number;
  endRelSec: number;
}

export interface WavChunk {
  index: number;
  startSec: number;
  endSec: number;
  durationSec: number;
  base64Wav: string;
  /** Relative seconds (0..durationSec-1) where voice energy is above noise floor */
  voicedRelSeconds: number[];
  /** Contiguous speech intervals inside this chunk */
  speechBursts: SpeechBurst[];
  /** 4 physical acoustic checkpoints [start, 33%, 66%, end] in relative seconds */
  acousticCheckpoints: [number, number, number, number];
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

/**
 * Analyzes a mono PCM slice to find which seconds contain actual spoken voice
 * and computes 4 physical acoustic checkpoints [0%, 33%, 66%, 95%].
 */
function analyzeSliceVoiceActivity(
  slice: Float32Array,
  sampleRate: number,
  durationSec: number
): {
  voicedRelSeconds: number[];
  speechBursts: SpeechBurst[];
  acousticCheckpoints: [number, number, number, number];
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
  const p20 = sortedRms[Math.floor(sortedRms.length * 0.2)] || 0;
  const p85 = sortedRms[Math.floor(sortedRms.length * 0.85)] || 0.01;
  const threshold = Math.max(0.003, p20 + (p85 - p20) * 0.18);

  const voicedRelSeconds: number[] = [];
  for (let s = 0; s < durationSec; s++) {
    if (rmsBySec[s] >= threshold) {
      voicedRelSeconds.push(s);
    }
  }

  // Fallback if audio is very quiet/uniform
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

  const pickQuantile = (q: number) =>
    voicedRelSeconds[
      Math.min(
        voicedRelSeconds.length - 1,
        Math.max(0, Math.floor((voicedRelSeconds.length - 1) * q))
      )
    ];

  const acousticCheckpoints: [number, number, number, number] = [
    pickQuantile(0),
    pickQuantile(0.33),
    pickQuantile(0.66),
    pickQuantile(0.95),
  ];

  return { voicedRelSeconds, speechBursts, acousticCheckpoints };
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
 * Decodes the real audio track of ANY video/audio Blob or File in the browser,
 * downsamples to 6000 Hz mono 16-bit PCM WAV, and slices into 1-minute (60s) chunks
 * with 4-point acoustic voice activity checkpoints.
 */
export async function extractWavChunksFromMediaBlob(
  blob: Blob,
  chunkDurationSec = 60,
  targetSampleRate = 6000
): Promise<{ chunks: WavChunk[]; totalDurationSec: number }> {
  const { monoSamples, totalDurationSec } = await decodeMediaBlobToMonoPcm(
    blob,
    targetSampleRate
  );

  const samplesPerChunk = chunkDurationSec * targetSampleRate;
  const totalChunks = Math.max(
    1,
    Math.ceil(monoSamples.length / samplesPerChunk)
  );
  const chunks: WavChunk[] = [];

  for (let idx = 0; idx < totalChunks; idx++) {
    const startSample = idx * samplesPerChunk;
    const endSample = Math.min(
      monoSamples.length,
      (idx + 1) * samplesPerChunk
    );
    if (endSample <= startSample) continue;

    const slice = monoSamples.subarray(startSample, endSample);
    const startSec = Math.round(startSample / targetSampleRate);
    const endSec = Math.round(endSample / targetSampleRate);
    const durationSec = Math.max(1, endSec - startSec);

    const { voicedRelSeconds, speechBursts, acousticCheckpoints } =
      analyzeSliceVoiceActivity(slice, targetSampleRate, durationSec);

    chunks.push({
      index: idx,
      startSec,
      endSec,
      durationSec,
      base64Wav: encodeMonoPcm16ToWavBase64(slice, targetSampleRate),
      voicedRelSeconds,
      speechBursts,
      acousticCheckpoints,
    });
  }

  return { chunks, totalDurationSec };
}

/**
 * 4-Point Checkpoint Tester & Calibrator for a single block:
 * Takes 4 sample points inside the block (0%, 33%, 66%, 95%) and compares
 * the transcript timestamps against the physical acoustic voice curve (voicedRelSeconds).
 * - If the 4 sample points pass the test (within tolerance), keeps the block's timestamps untouched!
 * - If any checkpoint fails (e.g. 01:02 became 01:42 or timestamps drifted), calibrates
 *   ONLY that block onto the physical voicedRelSeconds curve!
 */
export function verifyAndCalibrateBlockWith4Checkpoints(
  blockItems: TranscriptItem[],
  blockStartSec: number,
  blockDurationSec: number,
  voicedRelSeconds: number[]
): { items: TranscriptItem[]; recalibrated: boolean } {
  if (!blockItems || blockItems.length === 0) {
    return { items: [], recalibrated: false };
  }
  if (voicedRelSeconds.length === 0) {
    return { items: blockItems, recalibrated: false };
  }

  const n = blockItems.length;
  // Compute cumulative word weights so we know where 0%, 33%, 66%, 95% of speech sits
  const wordCounts = blockItems.map((it) =>
    Math.max(1, it.text.trim().split(/\s+/).length)
  );
  const totalWords = wordCounts.reduce((a, b) => a + b, 0);
  const cumWords: number[] = [];
  let running = 0;
  for (let i = 0; i < n; i++) {
    cumWords.push(running);
    running += wordCounts[i];
  }

  // Expected relative second for item i based on physical acoustic voice activity
  const expectedRelSecForIndex = (i: number): number => {
    const ratio = totalWords > 0 ? cumWords[i] / totalWords : i / Math.max(1, n);
    const vIdx = Math.min(
      voicedRelSeconds.length - 1,
      Math.max(0, Math.floor(ratio * (voicedRelSeconds.length - 1)))
    );
    return voicedRelSeconds[vIdx];
  };

  // Sample 4 checkpoints in this block: [0, 33%, 66%, last]
  const sampleIndices = Array.from(
    new Set([
      0,
      Math.floor((n - 1) * 0.33),
      Math.floor((n - 1) * 0.66),
      n - 1,
    ])
  );

  // Allow tighter tolerance (5s) for 60s blocks and 9s for 240s blocks
  const maxAllowedDriftSec = blockDurationSec <= 75 ? 5 : 9;
  let failedCheckpoints = 0;

  for (const sIdx of sampleIndices) {
    const actualRel = blockItems[sIdx].seconds - blockStartSec;
    const expectedRel = expectedRelSecForIndex(sIdx);
    const drift = Math.abs(actualRel - expectedRel);
    if (drift > maxAllowedDriftSec) {
      failedCheckpoints++;
    }
  }

  // Also check if timestamps in this block are non-monotonic or bunched up
  let nonMonotonic = false;
  for (let i = 1; i < n; i++) {
    if (blockItems[i].seconds < blockItems[i - 1].seconds) {
      nonMonotonic = true;
      break;
    }
  }

  // If the 4 sample points pass the test, DO NOT touch this block — move to the next block!
  if (failedCheckpoints === 0 && !nonMonotonic) {
    return { items: blockItems, recalibrated: false };
  }

  // Otherwise, this block failed the 4-point test: calibrate its timestamps to the physical voice curve
  let prevAbs = blockStartSec;
  const calibrated = blockItems.map((item, i) => {
    const targetRel = expectedRelSecForIndex(i);
    let newAbs = blockStartSec + targetRel;
    if (i > 0 && newAbs <= prevAbs) {
      newAbs = Math.min(blockStartSec + blockDurationSec - 1, prevAbs + 1);
    }
    prevAbs = newAbs;
    return {
      ...item,
      seconds: newAbs,
      timestamp: formatSecToTimestamp(newAbs),
    };
  });

  return { items: calibrated, recalibrated: true };
}

/**
 * Inspects an already-transcribed lecture against its real video/audio Blob in IndexedDB:
 * Tests each block at 4 checkpoints against the real PCM audio waveform.
 * Blocks that pass the 4-point test are left 100% untouched; ONLY blocks with drifted
 * timestamps (like the 00:00-04:00 block where 01:02 became 01:42) are recalibrated!
 */
export async function verifyAndFixTranscriptWithMediaBlob(
  blob: Blob,
  transcript: TranscriptItem[]
): Promise<{ items: TranscriptItem[]; anyRecalibrated: boolean }> {
  if (!transcript || transcript.length === 0) {
    return { items: transcript, anyRecalibrated: false };
  }

  const { monoSamples, totalDurationSec } = await decodeMediaBlobToMonoPcm(
    blob,
    6000
  );
  const sampleRate = 6000;

  // Detect whether this transcript was originally created with 60s blocks or 240s blocks
  const isOneMinBlocks = transcript.some((t) => t.id?.includes("-60s-"));
  const blockSec = isOneMinBlocks ? 60 : 240;
  const numBlocks = Math.max(1, Math.ceil(totalDurationSec / blockSec));

  const sorted = [...transcript].sort((a, b) => a.seconds - b.seconds);
  const output: TranscriptItem[] = [];
  let anyRecalibrated = false;

  for (let b = 0; b < numBlocks; b++) {
    const startSec = b * blockSec;
    const endSec = Math.min(
      Math.ceil(totalDurationSec),
      (b + 1) * blockSec
    );
    const durationSec = Math.max(1, endSec - startSec);
    const blockItems = sorted.filter(
      (t) =>
        t.seconds >= startSec &&
        (b === numBlocks - 1 ? t.seconds <= endSec + 30 : t.seconds < endSec)
    );
    if (blockItems.length === 0) continue;

    const startSample = startSec * sampleRate;
    const endSample = Math.min(monoSamples.length, endSec * sampleRate);
    const slice = monoSamples.subarray(startSample, endSample);
    const { voicedRelSeconds } = analyzeSliceVoiceActivity(
      slice,
      sampleRate,
      durationSec
    );

    const { items: verifiedItems, recalibrated } =
      verifyAndCalibrateBlockWith4Checkpoints(
        blockItems,
        startSec,
        durationSec,
        voicedRelSeconds
      );

    if (recalibrated) anyRecalibrated = true;
    output.push(...verifiedItems);
  }

  return {
    items: output.length > 0 ? output : sorted,
    anyRecalibrated,
  };
}
