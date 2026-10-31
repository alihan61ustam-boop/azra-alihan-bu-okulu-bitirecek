import { GoogleGenAI, Part } from "@google/genai";
import {
  ChatMessage,
  Course,
  CourseResource,
  GeminiModelId,
  Lecture,
  TranscriptItem,
} from "@/types/academic";

export const CANDIDATE_MODELS: GeminiModelId[] = [
  "gemini-3-flash-preview",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-3.1-pro-preview",
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
      "gemini-3-flash-preview",
      "gemini-3.5-flash",
      "gemini-3.1-flash-lite",
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

export function robustJsonParse<T = Record<string, unknown>>(raw: string): T {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  // 1. Direct standard parse
  try {
    return JSON.parse(cleaned) as T;
  } catch (e1) {
    // 2. Character-by-character LaTeX backslash repair
    try {
      let inString = false;
      let escaped = false;
      let result = "";

      for (let i = 0; i < cleaned.length; i++) {
        const char = cleaned[i];

        if (escaped) {
          escaped = false;
          if (char === '"' || char === '\\' || char === '/') {
            result += char;
          } else if (char === 'b' || char === 'f') {
            result += char;
          } else if (char === 'n' || char === 'r' || char === 't') {
            const peekWord = cleaned.slice(i, i + 5);
            // If \nabla, \nu, \times, \theta, \rho -> double escape for LaTeX
            if (/^[a-zA-Z]{2,}/.test(peekWord)) {
              result += '\\' + char;
            } else {
              result += char;
            }
          } else if (char === 'u' && /^[0-9a-fA-F]{4}/.test(cleaned.slice(i + 1, i + 5))) {
            result += char;
          } else {
            // Illegal JSON escape (e.g. \v for \vec, \p for \phi, \a for \alpha, \d for \delta, \f for \frac)
            result += '\\' + char;
          }
          continue;
        }

        if (char === '\\' && inString) {
          escaped = true;
          result += '\\';
          continue;
        }

        if (char === '"') {
          inString = !inString;
          result += char;
          continue;
        }

        if (inString && (char === '\n' || char === '\r')) {
          result += char === '\n' ? '\\n' : '\\r';
          continue;
        }

        result += char;
      }

      return JSON.parse(result) as T;
    } catch {
      // 3. Fallback: regex replace any backslash not followed by valid escape
      try {
        const relaxed = cleaned.replace(/\\(?!["\\/])/g, "\\\\");
        return JSON.parse(relaxed) as T;
      } catch {
        throw new Error(
          `JSON biçimlendirme hatası giderilemedi (${extractCleanErrorMessage(e1)}). Lütfen tekrar deneyin.`
        );
      }
    }
  }
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

export interface ProcessLectureOptions {
  apiKey: string;
  model: GeminiModelId;
  course: Course;
  lectureTitle: string;
  file?: File;
  sourceUrlOrNotes?: string;
  onProgress?: (stage: string, percent: number) => void;
}

export async function processLectureMultimodal(
  opts: ProcessLectureOptions
): Promise<Omit<Lecture, "id" | "courseId" | "createdAt" | "mediaBlobKey">> {
  const { apiKey, model, course, lectureTitle, file, sourceUrlOrNotes, onProgress } =
    opts;

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

  if (file) {
    mediaMimeType = file.type || "video/mp4";
    sourceType = file.type.startsWith("audio") ? "audio" : "video";
    onProgress?.("Ders videosu / ses kaydı inceleniyor...", 12);
    durationLabel = await getMediaDurationLabel(file);

    const INLINE_LIMIT_BYTES = 18 * 1024 * 1024; // 18 MB inline limit

    if (file.size <= INLINE_LIMIT_BYTES) {
      onProgress?.("Multimodal video ve ses verisi hazırlanıyor...", 30);
      try {
        const b64 = await fileToBase64(file);
        contentParts.push({
          inlineData: {
            mimeType: mediaMimeType,
            data: b64,
          },
        });
      } catch {
        // Fallback to keyframes if base64 conversion fails
        const extracted = await extractVideoKeyframesFromBrowser(file, 10);
        contentParts.push(...extracted.parts);
      }
    } else {
      // Large video: Smart keyframe sampling + transcript prompt
      onProgress?.(
        `Büyük video dosyası (${(file.size / (1024 * 1024)).toFixed(1)} MB) için akıllı tahta kareleri çıkarılıyor...`,
        30
      );
      const extracted = await extractVideoKeyframesFromBrowser(file, 14);
      if (extracted.durationLabel) durationLabel = extracted.durationLabel;
      if (extracted.parts.length > 0) {
        contentParts.push(...extracted.parts);
      } else {
        // If browser video decoding fails, slice first chunk
        const sliceBlob = file.slice(0, INLINE_LIMIT_BYTES, mediaMimeType);
        const b64 = await fileToBase64(sliceBlob);
        contentParts.push({
          inlineData: { mimeType: mediaMimeType, data: b64 },
        });
      }
    }
  }

  if (sourceUrlOrNotes?.trim()) {
    contentParts.push({
      text: `Ek Ders Bağlantısı / Transkript / Konu Notları:\n${sourceUrlOrNotes.trim()}`,
    });
  }

  onProgress?.(
    "Gemini tahta formüllerini (LaTeX), dakika dakika özeti ve sınav uyarılarını analiz ediyor...",
    65
  );

  const systemInstruction = `Sen "Azra&Alihan Bu Okulu Bitirecek" akademik platformunun Multimodal Fizik ve Mühendislik Ders Analiz Motorusun.
Ders: ${course.title} (${course.code})
Müfredat Bağlamı: ${course.syllabus}
İşlenen Kayıt Başlığı: ${lectureTitle}

GÖREVİN:
Verilen ders videosunu, ses kaydını, tahta karelerini veya ders notunu inceleyerek TAMAMEN TÜRKÇE ve yüksek akademik doğrulukta aşağıdaki JSON yapısını üret:
1) executiveSummary: Dersin kapsamlı yönetici özeti (formüller $...$ içinde).
2) timeline: Dakika dakika ders akışı (timestamp "MM:SS", seconds sayısal saniye, title, summary, spokenTranscript, equations dizisi [sadece saf LaTeX, dışına $$ koymadan, örn. "\\\\nabla \\\\cdot \\\\mathbf{E} = \\\\rho / \\\\varepsilon_0"], isExamAlert boolean, varsa professorQuote).
3) whiteboardExtractions: Tahtada veya slaytta yer alan tüm önemli formüller ve diyagramlar (timestamp, seconds, title, latex [saf LaTeX], variablesExplanation [$...$ ile değişken tanımları], diagramNote).
4) examAlerts: Hocanın "bu kısım sınavda çıkabilir", "bunu sakın unutmayın", "vizede/finalde sorarım" dediği veya ses/bağlam olarak çok vurguladığı kritik noktalar (timestamp, seconds, severity: "critical" | "important", topic, professorQuote, examTip).
5) conceptMap: Kavram haritası düğümleri (concept, formula [saf LaTeX], description, connectsTo).
6) practiceQuestions: Bu dersten sınavda çıkabilecek 2 veya 3 adet çalışma sorusu (difficulty: "Kavramsal" | "Vize" | "Final", question, hint, solutionMarkdown [$...$ ve $$...$$ LaTeX çözümlü]).
7) transcript: Google Drive / Vids transkript paneli gibi videodaki/ses kaydındaki konuşmaların EKSİKSİZ VE BİREBİR (verbatim) konuşma dökümü.
   - ASLA konuşmaları özetleme, atlama veya kısaltma.
   - Hocanın selamlaması ("iyi akşamlar", "merhaba"), duraksamaları ("eee", "şey"), teknik sözleri, sınıf yoklaması ("öğrenci arkadaş da yok", "sisteme yükleniyordur") dahil GEREKLİ VE GEREKSİZ TÜM SÖZLERİNİ tek tek cümle cümle zaman damgasıyla listele.
   - Her eleman:
     {
       "timestamp": "MM:SS",
       "seconds": sayısal saniye,
       "text": "Hocanın ağzından çıkan tam cümle (birebir sözler, tüm duraklamalar dahil)",
       "isImportant": boolean (Eğer sınav uyarısı, kritik fizik formülü veya can alıcı kavram anlatımı ise true; sıradan, idari veya dolgu konuşması ise false),
       "importanceType": "exam_alert" | "formula" | "core_concept" | "casual",
       "importanceNote": "Kısa açıklama (örn. 'Vize Sınav Sorusu', 'Kritik Formül', 'Temel Tanım')"
     }

ÖNEMLİ BİÇİMLENDİRME KURALI:
Tüm LaTeX formüllerindeki ters slash (backslash) işaretlerini JSON formatında geçerli kalması için ÇİFT TERS SLASH (örnek: \\\\nabla, \\\\vec, \\\\frac, \\\\partial) olarak yaz. Asla tek ters slash bırakma.
SADECE geçerli bir JSON nesnesi döndür.`;

  contentParts.push({
    text: `Lütfen "${lectureTitle}" dersini analiz et ve istenen JSON şemasında döndür.`,
  });

  const modelsToTry = Array.from(
    new Set<GeminiModelId>([
      model,
      "gemini-3-flash-preview",
      "gemini-3.5-flash",
      "gemini-3.1-flash-lite",
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
          temperature: 0.25,
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

  if (!responseText) {
    throw new Error(
      `Ders analizi oluşturulamadı: ${extractCleanErrorMessage(lastErr)}`
    );
  }

  onProgress?.("Yapılandırılmış LaTeX ders notları oluşturuluyor...", 92);

  const parsed = robustJsonParse<Record<string, unknown>>(responseText);

  const nowId = Date.now();

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
    executiveSummary:
      typeof parsed.executiveSummary === "string" && parsed.executiveSummary.trim()
        ? parsed.executiveSummary
        : `${lectureTitle} dersinin temel fiziksel prensipleri ve matematiksel formülasyonu analiz edildi.`,
    timeline: Array.isArray(parsed.timeline)
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
      : [],
    whiteboardExtractions: Array.isArray(parsed.whiteboardExtractions)
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
      : [],
    examAlerts: Array.isArray(parsed.examAlerts)
      ? parsed.examAlerts.map((e: Record<string, unknown>, i: number) => ({
          id: `ea-${nowId}-${i}`,
          timestamp: String(e.timestamp || "00:00"),
          seconds: Number(e.seconds ?? 0),
          severity: e.severity === "important" ? "important" : "critical",
          topic: String(e.topic || "Sınav Vurgusu"),
          professorQuote: String(e.professorQuote || ""),
          examTip: String(e.examTip || ""),
        }))
      : [],
    conceptMap: Array.isArray(parsed.conceptMap)
      ? parsed.conceptMap.map((c: Record<string, unknown>, i: number) => ({
          id: `cm-${nowId}-${i}`,
          concept: String(c.concept || ""),
          formula: c.formula ? String(c.formula) : undefined,
          description: String(c.description || ""),
          connectsTo: c.connectsTo ? String(c.connectsTo) : undefined,
        }))
      : [],
    practiceQuestions: Array.isArray(parsed.practiceQuestions)
      ? parsed.practiceQuestions.map(
          (q: Record<string, unknown>, i: number) => ({
            id: `pq-${nowId}-${i}`,
            difficulty:
              q.difficulty === "Final" || q.difficulty === "Kavramsal"
                ? q.difficulty
                : "Vize",
            question: String(q.question || ""),
            hint: String(q.hint || ""),
            solutionMarkdown: String(q.solutionMarkdown || ""),
          })
        )
      : [],
    transcript:
      Array.isArray(parsed.transcript) && parsed.transcript.length > 0
        ? (parsed.transcript as Array<Record<string, unknown>>).map((tr, i) => {
            const isImportant =
              Boolean(tr.isImportant) ||
              Boolean(tr.isProfessorHighlight) ||
              tr.importanceType === "exam_alert" ||
              tr.importanceType === "formula" ||
              tr.importanceType === "core_concept";
            return {
              id: `tr-${nowId}-${i}`,
              timestamp: String(
                tr.timestamp || formatSeconds(Number(tr.seconds ?? i * 15))
              ),
              seconds: Number(tr.seconds ?? i * 15),
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
        : generateFallbackTranscript(
            Array.isArray(parsed.timeline)
              ? (parsed.timeline as Array<{
                  timestamp?: string;
                  seconds?: number;
                  spokenTranscript?: string;
                  summary?: string;
                  title?: string;
                }>)
              : [],
            typeof parsed.executiveSummary === "string"
              ? parsed.executiveSummary
              : "",
            nowId
          ),
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
      model,
      "gemini-3-flash-preview",
      "gemini-3.5-flash",
      "gemini-3.1-flash-lite",
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
