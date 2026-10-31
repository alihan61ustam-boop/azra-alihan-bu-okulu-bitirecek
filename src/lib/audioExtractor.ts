export interface WavChunk {
  index: number;
  startSec: number;
  endSec: number;
  durationSec: number;
  base64Wav: string;
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
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format = 1
  view.setUint16(22, 1, true); // Mono = 1 channel
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // 16-bit
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
 * Decodes the real audio track of ANY video/audio Blob or File in the browser,
 * downsamples to 6000 Hz mono 16-bit PCM WAV, and slices into 4-minute chunks
 * so Gemini can transcribe 100% of the real spoken words with exact timestamps.
 */
export async function extractWavChunksFromMediaBlob(
  blob: Blob,
  chunkDurationSec = 240,
  targetSampleRate = 6000
): Promise<{ chunks: WavChunk[]; totalDurationSec: number }> {
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

  // Downsample to targetSampleRate (6000 Hz) if browser decoded at a higher rate
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

    chunks.push({
      index: idx,
      startSec,
      endSec,
      durationSec,
      base64Wav: encodeMonoPcm16ToWavBase64(slice, targetSampleRate),
    });
  }

  return { chunks, totalDurationSec };
}
