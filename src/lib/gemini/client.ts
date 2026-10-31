import { GoogleGenAI, Part } from "@google/genai";
import {
  ChatMessage,
  Course,
  CourseResource,
  GeminiModelId,
  Lecture,
  TranscriptItem,
} from "@/types/academic";
import {
  formatRealTranscriptToGoogleDriveStyle,
  formatSecToTimestamp,
} from "@/lib/emtLectureData";
import {
  extractWavChunksFromMediaBlob,
  verifyAndCalibrateBlockWith4Checkpoints,
  WavChunk,
} from "@/lib/audioExtractor";

export const CANDIDATE_MODELS: GeminiModelId[] = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3.1-flash-lite-preview",
  "gemini-3-flash-preview",
  "gemini-3.5-flash",
  "gemini-3.1-pro-preview",
];

const AUDIO_WORKER_MODELS: string[] = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3.1-flash-lite-preview",
  "gemini-3-flash-preview",
];

export function extractCleanErrorMessage(err: unknown): string {
  if (!err) return "Bilinmeyen bir hata oluştu.";
  let msg = err instanceof Error ? err.message : String(err);
  try {
    if (msg.includes('{"error":') || msg.includes('{"message":')) {
      const match = msg.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed.error?.message) {
          msg = parsed.error.message;
        } else if (parsed.message) {
          msg = parsed.message;
        }
      }
    }
  } catch {
    // keep msg
  }

  if (msg.includes("404") || msg.includes("no longer available") || msg.includes("NOT_FOUND")) {
    return "Seçili model bu API anahtarında kullanılamıyor. Sistem otomatik olarak Gemini 3 Flash modeline geçti.";
  }
  if (
    msg.includes("429") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("Too Many Requests") ||
    msg.includes("quota")
  ) {
    return "Gemini API istek kotası aşıldı (429). Lütfen birkaç saniye bekleyip tekrar deneyin.";
  }
  if (msg.includes("API_KEY_INVALID") || msg.includes("API key not valid")) {
    return "Geçersiz Gemini API anahtarı. Lütfen API & Araçlar menüsünden anahtarınızı kontrol edin.";
  }
  return msg.length > 220 ? msg.slice(0, 217) + "..." : msg;
}

export async function validateGeminiApiKey(
  apiKey: string,
  model: GeminiModelId = "gemini-3-flash-preview"
): Promise<{ valid: boolean; message: string; latencyMs?: number; activeModel?: GeminiModelId }> {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    return { valid: false, message: "Lütfen bir Gemini API anahtarı girin." };
  }

  // List of models to try in order
  const testList = Array.from(
    new Set<GeminiModelId>([
      model,
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite",
      "gemini-flash-lite-latest",
      "gemini-3.1-flash-lite-preview",
      "gemini-3-flash-preview",
      "gemini-3.5-flash",
    ])
  );

  let lastError = "";
  for (const candidate of testList) {
    const start = performance.now();
    try {
      const ai = new GoogleGenAI({ apiKey: trimmed });
      const res = await ai.models.generateContent({
        model: candidate,
        contents: "Sadece OK yaz.",
        config: { maxOutputTokens: 12 },
      });
      const latencyMs = Math.round(performance.now() - start);
      if (res.text) {
        return {
          valid: true,
          message: `Doğrulandı! (${candidate} • ${latencyMs} ms gecikme)`,
          latencyMs,
          activeModel: candidate,
        };
      }
    } catch (err) {
      lastError = extractCleanErrorMessage(err);
      // If 404, try next candidate
      continue;
    }
  }

  return {
    valid: false,
    message: `API Hatası: ${lastError}`,
  };
}

export function fileToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const commaIdx = result.indexOf(",");
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Smart Client-Side Video Keyframe & Duration Extractor
 * Works with any MP4, WebM, MKV, MOV video file in modern browsers.
 */
export async function extractVideoKeyframesFromBrowser(
  file: File,
  maxFrames = 12
): Promise<{ parts: Part[]; durationLabel: string; thumbnailDataUrl?: string }> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    const objUrl = URL.createObjectURL(file);
    video.src = objUrl;

    const cleanup = (parts: Part[], durationLabel: string, thumb?: string) => {
      URL.revokeObjectURL(objUrl);
      resolve({ parts, durationLabel, thumbnailDataUrl: thumb });
    };

    video.onerror = () => {
      cleanup([], "45:00", undefined);
    };

    video.onloadedmetadata = async () => {
      const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 60;
      const durationLabel = formatSeconds(duration);
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 1280 / Math.max(video.videoWidth || 1280, 1));
      canvas.width = Math.max(320, Math.round((video.videoWidth || 1280) * scale));
      canvas.height = Math.max(180, Math.round((video.videoHeight || 720) * scale));
      const ctx = canvas.getContext("2d");

      const parts: Part[] = [];
      const count = Math.min(maxFrames, Math.max(4, Math.ceil(duration / 45)));
      let thumbnailDataUrl: string | undefined;

      for (let i = 0; i < count; i++) {
        const targetSec = Math.min(duration - 0.2, (duration * (i + 0.5)) / count);
        await new Promise<void>((resSeek) => {
          const timer = setTimeout(() => resSeek(), 1800);
          const onSeeked = () => {
            clearTimeout(timer);
            video.removeEventListener("seeked", onSeeked);
            resSeek();
          };
          video.addEventListener("seeked", onSeeked);
          video.currentTime = Math.max(0, targetSec);
        });

        if (ctx) {
          try {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
            if (!thumbnailDataUrl) thumbnailDataUrl = dataUrl;
            const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
            parts.push({
              text: `[Zaman Damgası Kare ${formatSeconds(targetSec)} (${Math.round(targetSec)} sn)]:`,
            });
            parts.push({
              inlineData: {
                mimeType: "image/jpeg",
                data: base64,
              },
            });
          } catch {
            // continue
          }
        }
      }

      cleanup(parts, durationLabel, thumbnailDataUrl);
    };
  });
}

export async function getMediaDurationLabel(file: File): Promise<string> {
  return new Promise((resolve) => {
    const el = document.createElement(
      file.type.startsWith("audio") ? "audio" : "video"
    );
    el.preload = "metadata";
    const url = URL.createObjectURL(file);
    el.src = url;
    const cleanup = (label: string) => {
      URL.revokeObjectURL(url);
      resolve(label);
    };
    el.onloadedmetadata = () => {
      if (Number.isFinite(el.duration) && el.duration > 0) {
        cleanup(formatSeconds(el.duration));
      } else {
        cleanup("45:00");
      }
    };
    el.onerror = () => cleanup("45:00");
  });
}

function tryRepairTruncatedJson(str: string): string {
  let s = str.trim();
  const lastBrace = s.lastIndexOf("}");
  if (lastBrace > 0 && lastBrace < s.length - 1) {
    s = s.slice(0, lastBrace + 1);
  }
  const stack: string[] = [];
  let inStr = false;
  let esc = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (esc) {
      esc = false;
      continue;
    }
    if (ch === "\\" && inStr) {
      esc = true;
      continue;
    }
    if (ch === '"') {
      inStr = !inStr;
      continue;
    }
    if (!inStr) {
      if (ch === "{") stack.push("}");
      else if (ch === "[") stack.push("]");
      else if ((ch === "}" || ch === "]") && stack.length > 0) {
        stack.pop();
      }
    }
  }
  if (inStr) s += '"';
  while (stack.length > 0) {
    s += stack.pop();
  }
  return s;
}

export function robustJsonParse<T = Record<string, unknown>>(raw: string): T {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  // 1. Direct standard parse
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // 2. Character-by-character LaTeX backslash repair
    let repaired = "";
    try {
      let inString = false;
      let escaped = false;

      for (let i = 0; i < cleaned.length; i++) {
        const char = cleaned[i];

        if (escaped) {
          escaped = false;
          if (char === '"' || char === "\\" || char === "/") {
            repaired += char;
          } else if (char === "b" || char === "f") {
            repaired += char;
          } else if (char === "n" || char === "r" || char === "t") {
            const peekWord = cleaned.slice(i, i + 5);
            if (/^[a-zA-Z]{2,}/.test(peekWord)) {
              repaired += "\\" + char;
            } else {
              repaired += char;
            }
          } else if (
            char === "u" &&
            /^[0-9a-fA-F]{4}/.test(cleaned.slice(i + 1, i + 5))
          ) {
            repaired += char;
          } else {
            repaired += "\\" + char;
          }
          continue;
        }

        if (char === "\\" && inString) {
          escaped = true;
          repaired += "\\";
          continue;
        }

        if (char === '"') {
          inString = !inString;
          repaired += char;
          continue;
        }

        if (inString && (char === "\n" || char === "\r")) {
          repaired += char === "\n" ? "\\n" : "\\r";
          continue;
        }

        repaired += char;
      }

      return JSON.parse(repaired) as T;
    } catch {
      // 3. Try closing truncated JSON brackets/braces
      try {
        const closed = tryRepairTruncatedJson(repaired || cleaned);
        return JSON.parse(closed) as T;
      } catch {
        try {
          const relaxed = tryRepairTruncatedJson(
            cleaned.replace(/\\(?!["\\/])/g, "\\\\")
          );
          return JSON.parse(relaxed) as T;
        } catch {
          return {} as T;
        }
      }
    }
  }
}

function unwrapAndNormalizeLectureJson(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  let obj: unknown = raw;
  if (Array.isArray(obj)) {
    obj = obj[0] || {};
  }
  if (typeof obj !== "object" || obj === null) return {};

  let rec = obj as Record<string, unknown>;
  // If wrapped inside a single outer property (e.g. { lecture: { ... } } or { analiz: { ... } })
  const keys = Object.keys(rec);
  if (
    keys.length === 1 &&
    typeof rec[keys[0]] === "object" &&
    rec[keys[0]] !== null &&
    !Array.isArray(rec[keys[0]])
  ) {
    rec = rec[keys[0]] as Record<string, unknown>;
  }

  return {
    executiveSummary:
      rec.executiveSummary ??
      rec.summary ??
      rec.ozet ??
      rec.dersOzeti ??
      rec.yoneticiOzeti,
    timeline:
      rec.timeline ??
      rec.chapters ??
      rec.bolumler ??
      rec.dakikaDakika ??
      rec.segments,
    whiteboardExtractions:
      rec.whiteboardExtractions ??
      rec.whiteboard ??
      rec.equations ??
      rec.formulas ??
      rec.tahta ??
      rec.denklemler,
    examAlerts:
      rec.examAlerts ??
      rec.alerts ??
      rec.warnings ??
      rec.sinavUyarilari ??
      rec.hocaVurgulari,
    conceptMap:
      rec.conceptMap ??
      rec.concepts ??
      rec.kavramHaritasi ??
      rec.kavramlar,
    practiceQuestions:
      rec.practiceQuestions ??
      rec.questions ??
      rec.sorular ??
      rec.calismaSorulari,
    transcript:
      rec.transcript ??
      rec.transkript ??
      rec.subtitles ??
      rec.konusmaDokumu ??
      rec.captions,
  };
}

export function generateFallbackTranscript(
  timeline: Array<{
    timestamp?: string;
    seconds?: number;
    spokenTranscript?: string;
    summary?: string;
    title?: string;
    isExamAlert?: boolean;
    professorQuote?: string;
  }>,
  executiveSummary?: string,
  baseId = Date.now()
): TranscriptItem[] {
  const items: TranscriptItem[] = [];
  let counter = 0;

  if (Array.isArray(timeline) && timeline.length > 0) {
    for (const seg of timeline) {
      const baseSec = Number(seg.seconds ?? 0);
      const textToSplit =
        seg.spokenTranscript?.trim() ||
        seg.summary?.trim() ||
        seg.title?.trim() ||
        "";

      const sentences = textToSplit
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 2);

      if (sentences.length === 0 && textToSplit) {
        sentences.push(textToSplit);
      }

      sentences.forEach((sentence, idx) => {
        const sentenceSec = Math.max(0, baseSec + idx * 7);
        const lower = sentence.toLowerCase();
        const isExam =
          Boolean(seg.isExamAlert) ||
          lower.includes("sınav") ||
          lower.includes("vize") ||
          lower.includes("final") ||
          lower.includes("dikkat") ||
          lower.includes("unutmayın") ||
          lower.includes("sorarım");
        const isFormula =
          lower.includes("formül") ||
          lower.includes("denklem") ||
          lower.includes("eşittir") ||
          lower.includes("grad") ||
          lower.includes("rotasyonel") ||
          lower.includes("diverjans");

        const isImportant = isExam || isFormula;
        const importanceType: TranscriptItem["importanceType"] = isExam
          ? "exam_alert"
          : isFormula
          ? "formula"
          : "casual";

        items.push({
          id: `tr-${baseId}-${counter++}`,
          timestamp: formatSeconds(sentenceSec),
          seconds: sentenceSec,
          text: sentence,
          isImportant,
          importanceType,
          importanceNote: isExam
            ? "Sınav Uyarısı"
            : isFormula
            ? "Kritik Formül"
            : undefined,
          isProfessorHighlight: isImportant,
        });
      });
    }
  }

  if (items.length === 0 && executiveSummary) {
    const sentences = executiveSummary
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 2);
    sentences.forEach((sentence, idx) => {
      const sec = idx * 10;
      const lower = sentence.toLowerCase();
      const isImportant =
        lower.includes("sınav") ||
        lower.includes("vize") ||
        lower.includes("formül") ||
        lower.includes("denklem");
      items.push({
        id: `tr-${baseId}-${counter++}`,
        timestamp: formatSeconds(sec),
        seconds: sec,
        text: sentence,
        isImportant,
        importanceType: isImportant ? "core_concept" : "casual",
        importanceNote: isImportant ? "Önemli Kavram" : undefined,
        isProfessorHighlight: isImportant,
      });
    });
  }

  return items;
}

function convertPossibleMmssNumber(
  num: number,
  chunkDurationSec: number,
  allRawNumbersInChunk: number[]
): number {
  const rounded = Math.round(num);
  if (rounded >= 100) {
    const mins = Math.floor(rounded / 100);
    const secs = rounded % 100;
    const has60To99 = allRawNumbersInChunk.some((n) => n >= 62 && n <= 98);
    // If Gemini encoded M:SS as integer MMSS (e.g. 102 for 01:02, 205 for 02:05)
    if (
      secs < 60 &&
      (!has60To99 || rounded > chunkDurationSec + 5) &&
      mins * 60 + secs <= chunkDurationSec + 10
    ) {
      return mins * 60 + secs;
    }
  }
  return rounded;
}

function parseRelativeSecFromChunkItem(
  rawVal: unknown,
  chunk: WavChunk,
  itemIndex: number,
  totalItems: number,
  allRawNumbersInChunk: number[] = []
): number {
  if (typeof rawVal === "string") {
    const trimmed = rawVal.trim();
    if (trimmed.includes(":")) {
      const parts = trimmed.split(":").map((p) => parseInt(p.trim(), 10));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        const parsedSec = parts[0] * 60 + parts[1];
        if (
          parsedSec >= chunk.startSec &&
          chunk.startSec >= 120 &&
          parsedSec <= chunk.endSec + 10
        ) {
          return parsedSec;
        }
        return (
          chunk.startSec +
          Math.max(0, Math.min(chunk.durationSec, parsedSec))
        );
      }
      if (
        parts.length === 3 &&
        !isNaN(parts[0]) &&
        !isNaN(parts[1]) &&
        !isNaN(parts[2])
      ) {
        const parsedSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
        if (
          parsedSec >= chunk.startSec &&
          chunk.startSec >= 120 &&
          parsedSec <= chunk.endSec + 10
        ) {
          return parsedSec;
        }
        return (
          chunk.startSec +
          Math.max(0, Math.min(chunk.durationSec, parsedSec))
        );
      }
    }
    const num = parseFloat(trimmed);
    if (!isNaN(num)) {
      return parseRelativeSecFromChunkItem(
        num,
        chunk,
        itemIndex,
        totalItems,
        allRawNumbersInChunk
      );
    }
  }

  if (typeof rawVal === "number" && Number.isFinite(rawVal)) {
    const asStr = String(rawVal);
    if (asStr.includes(".") && rawVal < 10) {
      const [mPart, sPart] = asStr.split(".");
      if (
        sPart &&
        sPart.length === 2 &&
        Number(sPart) < 60 &&
        Number(mPart) > 0
      ) {
        const mmss = Number(mPart) * 60 + Number(sPart);
        if (mmss <= chunk.durationSec + 5) return chunk.startSec + mmss;
      }
    }
    const converted = convertPossibleMmssNumber(
      rawVal,
      chunk.durationSec,
      allRawNumbersInChunk
    );
    if (
      converted >= chunk.startSec &&
      chunk.startSec >= 180 &&
      converted <= chunk.endSec + 10
    ) {
      return Math.round(converted);
    }
    return (
      chunk.startSec +
      Math.max(0, Math.min(chunk.durationSec, Math.round(converted)))
    );
  }

  // Proportional fallback within the chunk if sec is missing
  const ratio = itemIndex / Math.max(1, totalItems);
  return Math.round(chunk.startSec + ratio * chunk.durationSec);
}

async function transcribeSingleAudioChunk(
  ai: GoogleGenAI,
  chunk: WavChunk,
  nowId: number
): Promise<TranscriptItem[]> {
  const burstsText =
    chunk.speechBursts && chunk.speechBursts.length > 0
      ? chunk.speechBursts
          .map((b) => `${b.startRelSec}s-${b.endRelSec}s`)
          .join(", ")
      : `0s-${chunk.durationSec}s`;
  const [cp0, cp1, cp2, cp3] = chunk.acousticCheckpoints || [
    0,
    Math.floor(chunk.durationSec * 0.33),
    Math.floor(chunk.durationSec * 0.66),
    chunk.durationSec - 1,
  ];

  const prompt = `Bu ${chunk.durationSec} saniyelik (1 dakikalık) gerçek ders ses kaydını dikkatle dinle.
FİZİKSEL SES DALGASI (AKUSTİK) BİLGİSİ:
- Bu 1 dakikalık ses bloğunda hocanın aktif konuştuğu saniye aralıkları: [${burstsText}]
- Blok içindeki 4 akustik referans noktası: [Başlangıç: ${cp0}. sn, 2. Nokta: ${cp1}. sn, 3. Nokta: ${cp2}. sn, Bitiş: ${cp3}. sn]

GÖREVİN:
Ses kaydında hocanın ağzından çıkan GERÇEK SÖZLERİ BİREBİR (kelimesi kelimesine, hiçbir şeyi özetlemeden ve uydurmadan) Google Drive video transkripti gibi her 4-5 saniyede bir zaman damgalı alt yazı satırları olarak JSON dizisi halinde döndür.
KESİN KURALLAR:
1. SADECE ses kaydında gerçekten duyduğun sözleri yaz. Asla ses kaydında olmayan bir cümle uydurma!
2. "sec" alanı bu 1 dakikalık ses kaydının başından (0. saniyeden) itibaren geçen TAM SAYI saniyedir (0 ile ${chunk.durationSec - 1} arasında tam sayı, örnek: 0, 3, 8, 14, 22, 35, 48, 56). Sessiz saniyelere cümle koyma, konuşmanın gerçekten duyulduğu saniyeyi yaz.
3. Her satır 5-9 kelimelik doğal konuşma parçası olsun (cümle devam ediyorsa sonuna ... koyabilirsin).
JSON Dizisi Şeması:
[
  {
    "sec": ${cp0},
    "text": "Ses kaydında duyulan birebir gerçek sözler...",
    "isImportant": false,
    "importanceType": "casual" | "exam_alert" | "formula" | "core_concept",
    "importanceNote": "Önemliyse kısa etiket"
  }
]`;

  // Rotate primary worker model by chunk index to distribute rate limits
  const orderedModels = [
    AUDIO_WORKER_MODELS[chunk.index % AUDIO_WORKER_MODELS.length],
    ...AUDIO_WORKER_MODELS.filter(
      (_, idx) => idx !== chunk.index % AUDIO_WORKER_MODELS.length
    ),
  ];

  for (const m of orderedModels) {
    try {
      const res = await ai.models.generateContent({
        model: m,
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: "audio/wav",
                  data: chunk.base64Wav,
                },
              },
              { text: prompt },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
          maxOutputTokens: 16384,
        },
      });

      if (res.text) {
        const parsed = robustJsonParse<unknown>(res.text);
        const arr: Array<Record<string, unknown>> = Array.isArray(parsed)
          ? parsed
          : Array.isArray((parsed as Record<string, unknown>)?.transcript)
          ? ((parsed as Record<string, unknown>).transcript as Array<
              Record<string, unknown>
            >)
          : Array.isArray((parsed as Record<string, unknown>)?.items)
          ? ((parsed as Record<string, unknown>).items as Array<
              Record<string, unknown>
            >)
          : [];

        if (arr.length > 0) {
          const allRawNums = arr
            .map((it) => Number(it.sec ?? it.seconds ?? it.offsetSec))
            .filter((n) => Number.isFinite(n));

          const rawChunkItems: TranscriptItem[] = arr
            .map((item, idx) => {
              const rawSec =
                item.time ??
                item.timestamp ??
                item.sec ??
                item.seconds ??
                item.offsetSec;
              const absSec = parseRelativeSecFromChunkItem(
                rawSec,
                chunk,
                idx,
                arr.length,
                allRawNums
              );
              const text = String(item.text || "").trim();
              const lower = text.toLowerCase();
              const isImportant =
                Boolean(item.isImportant) ||
                lower.includes("sınav") ||
                lower.includes("vize") ||
                lower.includes("final") ||
                lower.includes("dikkat") ||
                lower.includes("unutmayın") ||
                lower.includes("eşittir");
              const importanceType: TranscriptItem["importanceType"] =
                (item.importanceType as TranscriptItem["importanceType"]) ||
                (lower.includes("sınav") ||
                lower.includes("vize") ||
                lower.includes("unutmayın")
                  ? "exam_alert"
                  : lower.includes("eşittir") ||
                    lower.includes("integral") ||
                    lower.includes("grad")
                  ? "formula"
                  : isImportant
                  ? "core_concept"
                  : "casual");

              return {
                id: `tr-60s-${nowId}-${chunk.index}-${idx}`,
                timestamp: formatSecToTimestamp(absSec),
                seconds: absSec,
                text,
                isImportant,
                importanceType,
                importanceNote: item.importanceNote
                  ? String(item.importanceNote)
                  : isImportant
                  ? importanceType === "exam_alert"
                    ? "🔥 Sınav Vurgusu"
                    : importanceType === "formula"
                    ? "📐 Formül Anlatımı"
                    : "💡 Önemli Nokta"
                  : undefined,
                isProfessorHighlight: isImportant,
              };
            })
            .filter((t) => t.text.length > 1);

          // 4-Point Checkpoint Verification inside this 1-minute block before moving on
          const { items: verifiedBlockItems } =
            verifyAndCalibrateBlockWith4Checkpoints(
              rawChunkItems,
              chunk.startSec,
              chunk.durationSec,
              chunk.voicedRelSeconds
            );
          return verifiedBlockItems;
        }
      }
    } catch {
      continue;
    }
  }

  // Fallback to dedicated speech-to-text model gemini-3.5-transcribe
  try {
    const sttRes = await ai.models.generateContent({
      model: "gemini-3.5-transcribe",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: "audio/wav",
                data: chunk.base64Wav,
              },
            },
            { text: "Transcribe the spoken Turkish audio verbatim." },
          ],
        },
      ],
    });

    const parts = sttRes.candidates?.[0]?.content?.parts as
      | Array<{ text?: string; audioTranscription?: { text?: string } }>
      | undefined;
    const rawText =
      parts?.[0]?.audioTranscription?.text ||
      parts?.map((p) => p.text || "").join(" ") ||
      sttRes.text ||
      "";

    if (rawText.trim()) {
      const words = rawText.trim().split(/\s+/);
      const CHUNK_WORDS = 7;
      const phrases: string[] = [];
      for (let w = 0; w < words.length; w += CHUNK_WORDS) {
        const isLast = w + CHUNK_WORDS >= words.length;
        phrases.push(
          words.slice(w, w + CHUNK_WORDS).join(" ") + (isLast ? "" : "...")
        );
      }
      const step = chunk.durationSec / Math.max(1, phrases.length);
      return phrases.map((ph, idx) => {
        const absSec = Math.round(chunk.startSec + idx * step);
        return {
          id: `tr-stt-${nowId}-${chunk.index}-${idx}`,
          timestamp: formatSecToTimestamp(absSec),
          seconds: absSec,
          text: ph,
          isImportant: false,
          importanceType: "casual",
        };
      });
    }
  } catch {
    // ignore
  }

  return [];
}

export interface ProcessLectureOptions {
  apiKey: string;
  model: GeminiModelId;
  course: Course;
  lectureTitle: string;
  file?: File;
  sourceUrlOrNotes?: string;
  onProgress?: (stage: string, percent: number) => void;
  onPartialTranscript?: (items: TranscriptItem[]) => void;
}

export async function processLectureMultimodal(
  opts: ProcessLectureOptions
): Promise<Omit<Lecture, "id" | "courseId" | "createdAt" | "mediaBlobKey">> {
  const {
    apiKey,
    model,
    course,
    lectureTitle,
    file,
    sourceUrlOrNotes,
    onProgress,
    onPartialTranscript,
  } = opts;

  const trimmedKey = apiKey.trim();
  if (!trimmedKey) {
    throw new Error(
      "Ders videosu/sesi işlemek için sağ üstteki API & Araçlar menüsünden Gemini API anahtarınızı girin."
    );
  }

  const ai = new GoogleGenAI({ apiKey: trimmedKey });
  const contentParts: Part[] = [];
  let durationLabel = "45:00";
  let sourceType: Lecture["sourceType"] = "url";
  let mediaMimeType: string | undefined;
  const nowId = Date.now();
  let realAudioTranscript: TranscriptItem[] = [];

  if (file) {
    mediaMimeType = file.type || "video/mp4";
    sourceType = file.type.startsWith("audio") ? "audio" : "video";
    onProgress?.(
      "Videonun gerçek ses kanalı çözülüyor (AudioContext PCM)...",
      10
    );

    // 1. EXTRACT & TRANSCRIBE REAL AUDIO FROM VIDEO/AUDIO FILE (1-MINUTE BLOCKS + 4-POINT CHECKPOINT VERIFICATION)
    try {
      const { chunks, totalDurationSec } = await extractWavChunksFromMediaBlob(
        file,
        60,
        6000
      );
      if (totalDurationSec > 0) {
        durationLabel = formatSeconds(totalDurationSec);
      }

      const accumulated: TranscriptItem[] = [];
      const BATCH_SIZE = 4;

      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        const startMinLabel = formatSeconds(batch[0].startSec);
        const endMinLabel = formatSeconds(batch[batch.length - 1].endSec);
        const pct = Math.min(
          75,
          Math.round(15 + ((i + batch.length) / chunks.length) * 60)
        );

        onProgress?.(
          `Gerçek video sesi saniye saniye yazıya dökülüyor (${startMinLabel} – ${endMinLabel} / ${durationLabel})...`,
          pct
        );

        const batchResults = await Promise.all(
          batch.map((c) => transcribeSingleAudioChunk(ai, c, nowId))
        );

        for (const chunkItems of batchResults) {
          accumulated.push(...chunkItems);
        }

        const formattedSoFar = formatRealTranscriptToGoogleDriveStyle(accumulated);
        realAudioTranscript = formattedSoFar;
        if (formattedSoFar.length > 0) {
          onPartialTranscript?.(formattedSoFar);
        }
      }
    } catch (audioErr) {
      console.warn("Ses kanalı ayrıştırma uyarısı:", audioErr);
      durationLabel = await getMediaDurationLabel(file);
    }

    // 2. EXTRACT VISUAL WHITEBOARD KEYFRAMES
    if (sourceType === "video") {
      onProgress?.(
        "Videodan tahta/kağıt kareleri ve formül görüntüleri çıkarılıyor...",
        78
      );
      const extracted = await extractVideoKeyframesFromBrowser(file, 12);
      if (extracted.durationLabel && durationLabel === "45:00") {
        durationLabel = extracted.durationLabel;
      }
      if (extracted.parts.length > 0) {
        contentParts.push(...extracted.parts);
      }
    }
  }

  if (sourceUrlOrNotes?.trim()) {
    contentParts.push({
      text: `Ek Ders Bağlantısı / Transkript / Konu Notları:\n${sourceUrlOrNotes.trim()}`,
    });
  }

  if (realAudioTranscript.length > 0) {
    const transcriptDigest = realAudioTranscript
      .map((t) => `[${t.timestamp}] ${t.text}`)
      .join("\n");
    contentParts.push({
      text: `BU VİDEONUN GERÇEK SES KAYDINDAN ÇIKARILMIŞ SANİYE SANİYE KONUŞMA DÖKÜMÜ (TRANSKRİPT):\n${transcriptDigest.slice(
        0,
        48000
      )}`,
    });
  }

  onProgress?.(
    "Videodaki gerçek konuşmalara göre konu anlatımları, tahta formülleri (LaTeX) ve sınav uyarıları oluşturuluyor...",
    86
  );

  const systemInstruction = `Sen "Azra&Alihan Bu Okulu Bitirecek" akademik platformunun Multimodal Fizik ve Mühendislik Ders Analiz Motorusun.
Ders: ${course.title} (${course.code})
İşlenen Kayıt Başlığı: ${lectureTitle}
Video Süresi: ${durationLabel}

GÖREVİN:
Sana verilen gerçek video konuşma dökümünü (transkripti) ve tahta karelerini inceleyerek, SADECE bu videoda gerçekten anlatılan konulara, tanımlara ve denklemlere dayanan aşağıdaki JSON nesnesini üret:
1) executiveSummary: Videoda anlatılanların kapsamlı özeti (formüller $...$ içinde).
2) timeline: Videodaki konuşma akışına birebir uyan, zaman damgalı detaylı konu anlatımı bölümleri (timestamp "MM:SS", seconds sayısal saniye, title, summary [o dakikalarda hocanın anlattığı konunun detaylı anlatımı], spokenTranscript [hocanın o bölümdeki gerçek sözleri], equations dizisi [saf LaTeX], isExamAlert boolean, varsa professorQuote).
3) whiteboardExtractions: Videoda geçen tüm formüller ve diyagramlar (timestamp, seconds, title, latex [saf LaTeX], variablesExplanation [$...$ ile değişken tanımları], diagramNote).
4) examAlerts: Hocanın videoda vurguladığı önemli noktalar ve sınav uyarıları (timestamp, seconds, severity: "critical" | "important", topic, professorQuote, examTip).
5) conceptMap: Videodaki kavramların haritası (concept, formula [saf LaTeX], description, connectsTo).
6) practiceQuestions: Videoda işlenen konularla birebir ilgili 3 adet çözümlü soru (difficulty: "Kavramsal" | "Vize" | "Final", question, hint, solutionMarkdown [$...$ ve $$...$$ LaTeX çözümlü]).
${
  realAudioTranscript.length === 0
    ? `7) transcript: Saniye saniye konuşma dökümü dizisi [{timestamp, seconds, text, isImportant, importanceType, importanceNote}].`
    : ""
}

ÖNEMLİ BİÇİMLENDİRME KURALI:
Tüm LaTeX formüllerindeki ters slash (backslash) işaretlerini JSON formatında geçerli kalması için ÇİFT TERS SLASH (örnek: \\\\nabla, \\\\vec, \\\\frac, \\\\partial) olarak yaz.
SADECE geçerli bir JSON nesnesi döndür.`;

  contentParts.push({
    text: `Lütfen "${lectureTitle}" (Süre: ${durationLabel}) dersinin gerçek konuşma dökümüne ve görüntülerine göre detaylı konu anlatımlarını ve LaTeX formüllerini JSON şemasında döndür.`,
  });

  const modelsToTry = Array.from(
    new Set<GeminiModelId>([
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite",
      "gemini-flash-lite-latest",
      "gemini-3.1-flash-lite-preview",
      model,
      "gemini-3-flash-preview",
      "gemini-3.5-flash",
    ])
  );

  let responseText = "";
  let lastErr: unknown = null;

  for (const m of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model: m,
        contents: [{ role: "user", parts: contentParts }],
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.2,
          maxOutputTokens: 32768,
        },
      });
      if (response.text) {
        responseText = response.text;
        break;
      }
    } catch (err) {
      lastErr = err;
      continue;
    }
  }

  onProgress?.("Yapılandırılmış ders notları tamamlanıyor...", 96);

  const rawParsed = responseText
    ? robustJsonParse<unknown>(responseText)
    : {};
  const parsed = unwrapAndNormalizeLectureJson(rawParsed);

  let finalTimeline: Lecture["timeline"] = Array.isArray(parsed.timeline)
    ? parsed.timeline.map((t: Record<string, unknown>, i: number) => ({
        id: `seg-${nowId}-${i}`,
        timestamp: String(t.timestamp || formatSeconds(i * 300)),
        seconds: Number(t.seconds ?? i * 300),
        title: String(t.title || `Bölüm ${i + 1}`),
        summary: String(t.summary || ""),
        spokenTranscript: String(t.spokenTranscript || ""),
        equations: Array.isArray(t.equations) ? t.equations.map(String) : [],
        isExamAlert: Boolean(t.isExamAlert),
        professorQuote: t.professorQuote ? String(t.professorQuote) : undefined,
      }))
    : [];

  // If timeline was not returned by the summary call, build it directly from the REAL audio transcript chunks (zero fake templates!)
  if (finalTimeline.length === 0 && realAudioTranscript.length > 0) {
    const WINDOW_SEC = 300; // 5-minute chapters from actual spoken words
    const maxSec = realAudioTranscript[realAudioTranscript.length - 1].seconds;
    const numWindows = Math.max(1, Math.ceil((maxSec + 1) / WINDOW_SEC));
    for (let w = 0; w < numWindows; w++) {
      const wStart = w * WINDOW_SEC;
      const wEnd = (w + 1) * WINDOW_SEC;
      const slice = realAudioTranscript.filter(
        (t) => t.seconds >= wStart && t.seconds < wEnd
      );
      if (slice.length === 0) continue;
      const combinedSpeech = slice.map((s) => s.text.replace(/\.\.\.$/, "")).join(" ");
      const hasImportant = slice.some((s) => s.isImportant);
      finalTimeline.push({
        id: `seg-real-${nowId}-${w}`,
        timestamp: slice[0].timestamp,
        seconds: slice[0].seconds,
        title: `Bölüm ${w + 1} (${slice[0].timestamp} – ${
          slice[slice.length - 1].timestamp
        }) Konu Akışı`,
        summary: combinedSpeech.slice(0, 420) + (combinedSpeech.length > 420 ? "..." : ""),
        spokenTranscript: combinedSpeech,
        equations: [],
        isExamAlert: hasImportant,
      });
    }
  }

  const finalWhiteboard = Array.isArray(parsed.whiteboardExtractions)
    ? parsed.whiteboardExtractions.map(
        (w: Record<string, unknown>, i: number) => ({
          id: `wb-${nowId}-${i}`,
          timestamp: String(w.timestamp || "00:00"),
          seconds: Number(w.seconds ?? 0),
          title: String(w.title || `Formül #${i + 1}`),
          latex: String(w.latex || ""),
          variablesExplanation: String(w.variablesExplanation || ""),
          diagramNote: w.diagramNote ? String(w.diagramNote) : undefined,
        })
      )
    : [];

  let finalAlerts: Lecture["examAlerts"] = Array.isArray(parsed.examAlerts)
    ? parsed.examAlerts.map((e: Record<string, unknown>, i: number) => ({
        id: `ea-${nowId}-${i}`,
        timestamp: String(e.timestamp || "00:00"),
        seconds: Number(e.seconds ?? 0),
        severity: (e.severity === "important" ? "important" : "critical") as
          | "important"
          | "critical",
        topic: String(e.topic || "Hoca Vurgusu"),
        professorQuote: String(e.professorQuote || ""),
        examTip: String(e.examTip || ""),
      }))
    : [];

  if (finalAlerts.length === 0 && realAudioTranscript.length > 0) {
    finalAlerts = realAudioTranscript
      .filter((t) => t.isImportant)
      .slice(0, 6)
      .map((t, i) => ({
        id: `ea-real-${nowId}-${i}`,
        timestamp: t.timestamp,
        seconds: t.seconds,
        severity: t.importanceType === "exam_alert" ? "critical" : "important",
        topic: t.importanceNote || "Ders Vurgusu",
        professorQuote: t.text,
        examTip: "Videonun bu saniyesindeki açıklamayı dikkatle tekrar izleyin.",
      }));
  }

  const finalConcepts = Array.isArray(parsed.conceptMap)
    ? parsed.conceptMap.map((c: Record<string, unknown>, i: number) => ({
        id: `cm-${nowId}-${i}`,
        concept: String(c.concept || ""),
        formula: c.formula ? String(c.formula) : undefined,
        description: String(c.description || ""),
        connectsTo: c.connectsTo ? String(c.connectsTo) : undefined,
      }))
    : [];

  const finalQuestions = Array.isArray(parsed.practiceQuestions)
    ? parsed.practiceQuestions.map(
        (q: Record<string, unknown>, i: number) => ({
          id: `pq-${nowId}-${i}`,
          difficulty: (
            q.difficulty === "Final" || q.difficulty === "Kavramsal"
              ? q.difficulty
              : "Vize"
          ) as "Kavramsal" | "Vize" | "Final",
          question: String(q.question || ""),
          hint: String(q.hint || ""),
          solutionMarkdown: String(q.solutionMarkdown || ""),
        })
      )
    : [];

  let finalTranscript: TranscriptItem[] = realAudioTranscript;
  if (
    finalTranscript.length === 0 &&
    Array.isArray(parsed.transcript) &&
    parsed.transcript.length > 0
  ) {
    finalTranscript = formatRealTranscriptToGoogleDriveStyle(
      (parsed.transcript as Array<Record<string, unknown>>).map((tr, i) => {
        const isImportant =
          Boolean(tr.isImportant) ||
          Boolean(tr.isProfessorHighlight) ||
          tr.importanceType === "exam_alert" ||
          tr.importanceType === "formula" ||
          tr.importanceType === "core_concept";
        return {
          id: `tr-${nowId}-${i}`,
          timestamp: String(
            tr.timestamp || formatSeconds(Number(tr.seconds ?? i * 5))
          ),
          seconds: Number(tr.seconds ?? i * 5),
          text: String(tr.text || ""),
          isImportant,
          importanceType:
            (tr.importanceType as TranscriptItem["importanceType"]) ||
            (isImportant ? "exam_alert" : "casual"),
          importanceNote: tr.importanceNote
            ? String(tr.importanceNote)
            : undefined,
          isProfessorHighlight: isImportant,
        };
      })
    );
  }

  const synthesizedSummary =
    typeof parsed.executiveSummary === "string" &&
    parsed.executiveSummary.trim()
      ? parsed.executiveSummary
      : realAudioTranscript.length > 0
      ? realAudioTranscript
          .slice(0, 18)
          .map((t) => t.text.replace(/\.\.\.$/, ""))
          .join(" ")
      : `${lectureTitle} dersi işlendi.`;

  if (!responseText && realAudioTranscript.length === 0 && lastErr) {
    throw new Error(
      `Ders analizi oluşturulamadı: ${extractCleanErrorMessage(lastErr)}`
    );
  }

  return {
    title: lectureTitle,
    recordedDate: new Date().toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    sourceType,
    mediaUrl:
      !file && sourceUrlOrNotes?.trim().startsWith("http")
        ? sourceUrlOrNotes.trim()
        : undefined,
    mediaMimeType,
    durationLabel,
    executiveSummary: synthesizedSummary,
    timeline: finalTimeline,
    whiteboardExtractions: finalWhiteboard,
    examAlerts: finalAlerts,
    conceptMap: finalConcepts,
    practiceQuestions: finalQuestions,
    transcript: finalTranscript,
    isRealAudioTranscript: realAudioTranscript.length > 0,
  };
}

export interface StreamTutorOptions {
  apiKey: string;
  model: GeminiModelId;
  course: Course;
  lectures: Lecture[];
  resources: CourseResource[];
  history: ChatMessage[];
  userPrompt: string;
  imageDataUrl?: string;
  onToken: (accumulatedText: string) => void;
}

export async function streamCourseTutorChat(
  opts: StreamTutorOptions
): Promise<string> {
  const {
    apiKey,
    model,
    course,
    lectures,
    resources,
    history,
    userPrompt,
    imageDataUrl,
    onToken,
  } = opts;

  const trimmedKey = apiKey.trim();
  if (!trimmedKey) {
    throw new Error(
      "AI Eğitmen ile konuşmak için sağ üstteki 'API & Araçlar' butonundan Gemini API anahtarınızı ekleyin."
    );
  }

  const ai = new GoogleGenAI({ apiKey: trimmedKey });

  const lecturesDigest = lectures
    .map((lec) => {
      const formulas = lec.whiteboardExtractions
        .map((w) => `  - [${w.timestamp}] ${w.title}: $$${w.latex}$$ (${w.variablesExplanation})`)
        .join("\n");
      const alerts = lec.examAlerts
        .map((a) => `  - [${a.timestamp}] SINAV UYARISI (${a.topic}): "${a.professorQuote}" -> İpucu: ${a.examTip}`)
        .join("\n");
      const transcriptSnippet = lec.transcript && lec.transcript.length > 0
        ? lec.transcript.slice(0, 30).map((t) => `  [${t.timestamp}] ${t.text}`).join("\n")
        : "";
      return `DERS KAYDI: ${lec.title} (${lec.recordedDate})\nÖzet: ${lec.executiveSummary}\nTahta Formülleri:\n${formulas}\nHoca Vurguları:\n${alerts}${transcriptSnippet ? `\nKonuşma Dökümü (Transkript):\n${transcriptSnippet}` : ""}`;
    })
    .join("\n\n---\n\n");

  const resourcesDigest = resources
    .map((r) => `- ${r.title} (${r.source}): ${r.summary}\n${r.contentMarkdown.slice(0, 600)}`)
    .join("\n\n");

  const systemInstruction = `Sen "Azra&Alihan Bu Okulu Bitirecek" platformunda SADECE "${course.title} (${course.code})" dersine atanmış izole Yapay Zeka Fizik Eğitmenisin.
Dersi Veren Hoca: ${course.professor}
Ders Açıklaması: ${course.description}
Müfredat:
${course.syllabus}

BU DERSE AİT İŞLENMİŞ DERS VİDEOLARI VE TAHTA NOTLARI:
${lecturesDigest || "Henüz ders kaydı eklenmemiş."}

BU DERSE EKLENMİŞ AKADEMİK KAYNAKLAR:
${resourcesDigest || "Ek kaynak yok."}

KESİN PEDAGOJİK VE AKADEMİK KURALLARIN:
1. Yalnızca "${course.title}" dersi ve bu ders için gerekli matematiksel fizik araçları kapsamında yanıt ver. Başka derslerin konularıyla bağlamı karıştırma.
2. Azra'ya karşı her zaman motive edici, sabırlı, berrak ve akademik olarak titiz bir Türkçe kullan.
3. Açıklamalarını mantıksal bir pedagojik akışla yapılandır:
   - **Fiziksel Sezgi & Kavramsal Temel:** (Gerektiğinde Thales kehribar gözlemi, elektrostatik CGS vs SI katsayı farkı, Newton mekaniği benzetimleri gibi sezgisel köprüler kur).
   - **Matematiksel Formülasyon & Vektör Analizi:** (Konum vektörleri $\\vec{r}_1, \\vec{r}_2$, bağıl konum $\\vec{r}_{12} = \\vec{r}_2 - \\vec{r}_1$, gradyen, diverjans ve rotasyonel adımları).
   - **Adım Adım İspat / Çözüm:** Kritik matematiksel adımları atlamadan, sınır koşullarını ve integralleri adım adım göster.
   - **Hoca Vurguları & Sınav Uyarıları:** Hocanın ders kayıtlarında belirttiği sınav uyarılarını (zaman damgası ile) ve öğrencilerin en sık hata yaptığı işaret veya birim tuzaklarını hatırlat.
4. Tüm matematiksel ve fiziksel denklemleri standart LaTeX formatında yaz: satır içi için $...$ ve blok denklemler için kendi satırında $$...$$ kullan.
5. Sorulan konu hocanın sınav uyarılarında (SINAV UYARISI) geçiyorsa mutlaka zaman damgasını belirterek Azra'ya hatırlat!
6. Her zaman Azra'nın bu okulu yüksek dereceyle bitireceğine tam güvenen, destekleyici ve ilham verici bir üslup takın.`;

  const recentHistory = history.slice(-10).map((m) => ({
    role: m.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: m.content }] as Part[],
  }));

  const currentParts: Part[] = [];
  if (imageDataUrl && imageDataUrl.includes(",")) {
    const mimeMatch = imageDataUrl.match(/^data:([^;]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
    const data = imageDataUrl.slice(imageDataUrl.indexOf(",") + 1);
    currentParts.push({ inlineData: { mimeType, data } });
  }
  currentParts.push({ text: userPrompt });

  const modelsToTry = Array.from(
    new Set<GeminiModelId>([
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite",
      "gemini-flash-lite-latest",
      "gemini-3.1-flash-lite-preview",
      model,
      "gemini-3-flash-preview",
      "gemini-3.5-flash",
    ])
  );

  let full = "";
  let lastErr: unknown = null;

  for (const candidateModel of modelsToTry) {
    try {
      const stream = await ai.models.generateContentStream({
        model: candidateModel,
        contents: [...recentHistory, { role: "user", parts: currentParts }],
        config: {
          systemInstruction,
          temperature: 0.35,
        },
      });

      full = "";
      for await (const chunk of stream) {
        if (chunk.text) {
          full += chunk.text;
          onToken(full);
        }
      }
      if (full) return full;
    } catch (err) {
      lastErr = err;
      // If 404 or model not found, try the next candidate model
      continue;
    }
  }

  if (!full) {
    throw new Error(extractCleanErrorMessage(lastErr));
  }
  return full;
}
