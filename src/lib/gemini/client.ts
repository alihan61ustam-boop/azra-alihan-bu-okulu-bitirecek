import { GoogleGenAI, Part } from "@google/genai";
import {
  ChatMessage,
  Course,
  CourseResource,
  GeminiModelId,
  Lecture,
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

  const cleaned = responseText
    .replace(/^```json\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const parsed = JSON.parse(cleaned);

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
      parsed.executiveSummary ||
      `${lectureTitle} dersinin temel fiziksel prensipleri ve matematiksel formülasyonu analiz edildi.`,
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
      return `DERS KAYDI: ${lec.title} (${lec.recordedDate})\nÖzet: ${lec.executiveSummary}\nTahta Formülleri:\n${formulas}\nHoca Vurguları:\n${alerts}`;
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

KESİN KURALLARIN:
1. Yalnızca "${course.title}" dersi ve bu ders için gerekli matematiksel fizik araçları kapsamında yanıt ver. Başka derslerin konularıyla bağlamı karıştırma.
2. Azra'ya karşı her zaman motive edici, sabırlı, berrak ve akademik olarak titiz bir Türkçe kullan.
3. Tüm matematiksel ve fiziksel denklemleri standart LaTeX formatında yaz: satır içi için $...$ ve blok denklemler için kendi satırında $$...$$ kullan.
4. Sorulan konu hocanın sınav uyarılarında (SINAV UYARISI) geçiyorsa mutlaka zaman damgasını belirterek Azra'ya hatırlat!`;

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
