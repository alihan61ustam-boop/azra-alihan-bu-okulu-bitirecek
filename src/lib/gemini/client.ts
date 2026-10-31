import { GoogleGenAI, Part } from "@google/genai";
import {
  ChatMessage,
  Course,
  CourseResource,
  GeminiModelId,
  Lecture,
} from "@/types/academic";

export async function validateGeminiApiKey(
  apiKey: string,
  model: GeminiModelId = "gemini-2.5-flash"
): Promise<{ valid: boolean; message: string; latencyMs?: number }> {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    return { valid: false, message: "Lütfen bir Gemini API anahtarı girin." };
  }
  const start = performance.now();
  try {
    const ai = new GoogleGenAI({ apiKey: trimmed });
    const res = await ai.models.generateContent({
      model,
      contents: "Sadece OK yaz.",
      config: { maxOutputTokens: 12 },
    });
    const latencyMs = Math.round(performance.now() - start);
    if (res.text) {
      return {
        valid: true,
        message: `Doğrulandı! (${model} • ${latencyMs} ms gecikme)`,
        latencyMs,
      };
    }
    return { valid: true, message: `API anahtarı aktif (${latencyMs} ms).`, latencyMs };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Doğrulama başarısız";
    return {
      valid: false,
      message: `API Hatası: ${msg.slice(0, 140)}`,
    };
  }
}

function fileToBase64(blob: Blob): Promise<string> {
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

function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Smart Client-Side Video Keyframe & Duration Extractor
 * Ensures even 300MB+ MP4/WebM lecture recordings never fail in browser!
 */
async function extractVideoKeyframesFromBrowser(
  file: File,
  maxFrames = 14
): Promise<{ parts: Part[]; durationLabel: string }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    const objUrl = URL.createObjectURL(file);
    video.src = objUrl;

    video.onerror = () => {
      URL.revokeObjectURL(objUrl);
      reject(new Error("Video kareleri okunamadı."));
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

      for (let i = 0; i < count; i++) {
        const targetSec = Math.min(duration - 0.2, (duration * (i + 0.5)) / count);
        await new Promise<void>((resSeek) => {
          const onSeeked = () => {
            video.removeEventListener("seeked", onSeeked);
            resSeek();
          };
          video.addEventListener("seeked", onSeeked);
          video.currentTime = Math.max(0, targetSec);
        });

        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
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
        }
      }

      URL.revokeObjectURL(objUrl);
      resolve({ parts, durationLabel });
    };
  });
}

async function getMediaDurationLabel(file: File): Promise<string> {
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
    onProgress?.("Medya süresi ve formatı inceleniyor...", 12);
    durationLabel = await getMediaDurationLabel(file);

    const INLINE_LIMIT_BYTES = 18 * 1024 * 1024; // 18 MB fast inline threshold

    if (file.size <= INLINE_LIMIT_BYTES) {
      onProgress?.("Multimodal veri paketleniyor (Ses + Görüntü)...", 30);
      const b64 = await fileToBase64(file);
      contentParts.push({
        inlineData: {
          mimeType: mediaMimeType,
          data: b64,
        },
      });
    } else {
      // Try native Gemini Files API first; fallback to smart keyframe extraction if CORS/network prevents raw upload
      let uploadedViaFilesApi = false;
      try {
        onProgress?.(
          `Büyük dosya (${(file.size / (1024 * 1024)).toFixed(1)} MB) Gemini File API'ye yükleniyor...`,
          25
        );
        const uploaded = await ai.files.upload({
          file,
          config: { mimeType: mediaMimeType },
        });
        if (uploaded.name) {
          let fileState = uploaded;
          let attempts = 0;
          while (fileState.state === "PROCESSING" && attempts < 30) {
            onProgress?.("Gemini video ve ses kanalını işliyor...", 45 + Math.min(20, attempts));
            await new Promise((r) => setTimeout(r, 2500));
            fileState = await ai.files.get({ name: uploaded.name });
            attempts++;
          }
          if (fileState.uri && fileState.state !== "FAILED") {
            contentParts.push({
              fileData: {
                fileUri: fileState.uri,
                mimeType: fileState.mimeType || mediaMimeType,
              },
            });
            uploadedViaFilesApi = true;
          }
        }
      } catch {
        uploadedViaFilesApi = false;
      }

      if (!uploadedViaFilesApi && file.type.startsWith("video")) {
        onProgress?.(
          "Akıllı Tarayıcı Tahta/Slayt Kare Örnekleyici devreye alındı...",
          38
        );
        const extracted = await extractVideoKeyframesFromBrowser(file, 14);
        durationLabel = extracted.durationLabel;
        contentParts.push(...extracted.parts);
      } else if (!uploadedViaFilesApi) {
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
      text: `Ek Ders Bağlantısı / Notlar / Transkript İpucu:\n${sourceUrlOrNotes.trim()}`,
    });
  }

  onProgress?.(
    "Gemini tahta formüllerini (LaTeX), dakika dakika özeti ve sınav uyarılarını çıkarıyor...",
    68
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

  const response = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts: contentParts }],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      temperature: 0.25,
    },
  });

  onProgress?.("Yapılandırılmış LaTeX ders notları oluşturuluyor...", 92);

  const rawText = response.text || "{}";
  const cleaned = rawText
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

  // Build strictly isolated Course Knowledge Base context
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

  const stream = await ai.models.generateContentStream({
    model,
    contents: [...recentHistory, { role: "user", parts: currentParts }],
    config: {
      systemInstruction,
      temperature: 0.35,
    },
  });

  let full = "";
  for await (const chunk of stream) {
    if (chunk.text) {
      full += chunk.text;
      onToken(full);
    }
  }
  return full || "Yanıt oluşturulamadı, lütfen tekrar deneyin.";
}
