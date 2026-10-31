"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  Video,
  FileAudio,
  Link2,
  X,
  Loader2,
  Sparkles,
  AlertCircle,
  KeyRound,
  FileText,
  CheckCircle2,
  Play,
  Film,
} from "lucide-react";
import { ApiKeysConfig, Course, Lecture } from "@/types/academic";
import {
  extractCleanErrorMessage,
  formatSeconds,
  processLectureMultimodal,
} from "@/lib/gemini/client";
import { saveMediaBlob } from "@/lib/mediaDb";

type UploadMode = "video" | "audio" | "url" | "notes";

export function LectureProcessorModal({
  isOpen,
  course,
  apiKeys,
  onClose,
  onOpenApiSettings,
  onLectureCreated,
}: {
  isOpen: boolean;
  course: Course;
  apiKeys: ApiKeysConfig;
  onClose: () => void;
  onOpenApiSettings: () => void;
  onLectureCreated: (lecture: Lecture, rawFile?: File) => void;
}) {
  const [mode, setMode] = useState<UploadMode>("video");
  const [title, setTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [videoMeta, setVideoMeta] = useState<{
    duration: string;
    width?: number;
    height?: number;
  } | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [notesText, setNotesText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStage, setProgressStage] = useState("");
  const [progressPercent, setProgressPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // Revoke preview object URL on unmount or file change
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!isOpen) return null;

  const hasKey = Boolean(apiKeys.geminiApiKey?.trim());

  const handleFilePick = (file: File | undefined, forcedType?: "video" | "audio") => {
    if (!file) return;

    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    const objUrl = URL.createObjectURL(file);
    setPreviewUrl(objUrl);
    setError(null);

    if (!title.trim()) {
      const cleanName = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
      setTitle(cleanName);
    }

    const isVideo = forcedType === "video" || file.type.startsWith("video") || /\.(mp4|mkv|webm|mov|avi|m4v|ts)$/i.test(file.name);
    if (isVideo) {
      setMode("video");
      const v = document.createElement("video");
      v.preload = "metadata";
      v.src = objUrl;
      v.onloadedmetadata = () => {
        setVideoMeta({
          duration: formatSeconds(v.duration || 0),
          width: v.videoWidth,
          height: v.videoHeight,
        });
      };
    } else if (file.type.startsWith("audio") || /\.(mp3|wav|m4a|aac|ogg)$/i.test(file.name)) {
      setMode("audio");
      const a = document.createElement("audio");
      a.preload = "metadata";
      a.src = objUrl;
      a.onloadedmetadata = () => {
        setVideoMeta({
          duration: formatSeconds(a.duration || 0),
        });
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasKey) {
      setError(
        "Ders analizi için Gemini API anahtarınızı tanımlamanız gerekiyor."
      );
      return;
    }
    if (!selectedFile && !sourceUrl.trim() && !notesText.trim()) {
      setError(
        "Lütfen bir ders videosu/ses dosyası seçin veya bir video bağlantısı / ders notu girin."
      );
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProgressStage("Gemini Multimodal video motoru hazırlanıyor...");
    setProgressPercent(10);

    try {
      const lectureTitle =
        title.trim() ||
        `${course.title} — Ders Analizi (${new Date().toLocaleDateString("tr-TR")})`;

      const combinedUrlOrNotes = [sourceUrl.trim(), notesText.trim()]
        .filter(Boolean)
        .join("\n\n");

      const extracted = await processLectureMultimodal({
        apiKey: apiKeys.geminiApiKey,
        model: apiKeys.geminiModel,
        course,
        lectureTitle,
        file: selectedFile || undefined,
        sourceUrlOrNotes: combinedUrlOrNotes || undefined,
        onProgress: (stage, pct) => {
          setProgressStage(stage);
          setProgressPercent(pct);
        },
      });

      const lectureId = `lec-${Date.now()}`;
      let mediaBlobKey: string | undefined;

      if (selectedFile) {
        mediaBlobKey = `blob-${lectureId}`;
        await saveMediaBlob(mediaBlobKey, selectedFile);
      }

      const newLecture: Lecture = {
        ...extracted,
        id: lectureId,
        courseId: course.id,
        mediaBlobKey,
        mediaUrl: !selectedFile && sourceUrl.trim() ? sourceUrl.trim() : undefined,
        createdAt: new Date().toISOString(),
      };

      onLectureCreated(newLecture, selectedFile || undefined);
      setTitle("");
      setSelectedFile(null);
      setPreviewUrl(null);
      setVideoMeta(null);
      setSourceUrl("");
      setNotesText("");
      onClose();
    } catch (err) {
      setError(extractCleanErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-5 backdrop-blur-sm overflow-y-auto">
      <div className="my-auto w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10">
              <Film className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Ders Videosu &amp; Ses İşleyici
              </h3>
              <p className="text-xs text-zinc-400">
                Hedef Ders:{" "}
                <span className="font-semibold text-zinc-200">
                  {course.code} — {course.title}
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-white disabled:opacity-40 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="mt-4 flex flex-wrap gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/60 p-1">
          <button
            type="button"
            onClick={() => setMode("video")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition cursor-pointer ${
              mode === "video"
                ? "bg-white text-zinc-950 shadow-xs"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Video className="h-3.5 w-3.5 text-amber-500" />
            <span>Ders Videosu Yükle</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("audio")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition cursor-pointer ${
              mode === "audio"
                ? "bg-white text-zinc-950 shadow-xs"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <FileAudio className="h-3.5 w-3.5 text-emerald-500" />
            <span>Ses Kaydı Yükle</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("url")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition cursor-pointer ${
              mode === "url"
                ? "bg-white text-zinc-950 shadow-xs"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Link2 className="h-3.5 w-3.5 text-sky-400" />
            <span>Video Linki / URL</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("notes")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition cursor-pointer ${
              mode === "notes"
                ? "bg-white text-zinc-950 shadow-xs"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <FileText className="h-3.5 w-3.5 text-purple-400" />
            <span>Transkript / Not</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-300">
              Ders Kaydı / Bölüm Başlığı
            </label>
            <input
              type="text"
              required
              disabled={isProcessing}
              placeholder="Örn: Hafta 4 — Maxwell Yer Değiştirme Akımı ve Dalga Denklemi"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:border-amber-500/60 focus:outline-none"
            />
          </div>

          {/* TAB 1: VIDEO UPLOAD */}
          {mode === "video" && (
            <div className="space-y-3">
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/webm,video/x-matroska,video/quicktime,video/avi,video/*,.mp4,.mkv,.webm,.mov,.avi,.m4v,.ts"
                className="hidden"
                onChange={(e) => handleFilePick(e.target.files?.[0], "video")}
              />

              {previewUrl && selectedFile ? (
                <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                        <Play className="h-3.5 w-3.5 fill-amber-400" />
                      </span>
                      <div>
                        <div className="text-xs font-bold text-white truncate max-w-xs">
                          {selectedFile.name}
                        </div>
                        <div className="font-mono text-[10px] text-zinc-400">
                          {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB •{" "}
                          {videoMeta?.duration ? `Süre: ${videoMeta.duration}` : "Video Hazır"}
                          {videoMeta?.width ? ` • ${videoMeta.width}x${videoMeta.height}` : ""}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => videoInputRef.current?.click()}
                      className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300 hover:text-white cursor-pointer"
                    >
                      Farklı Video Seç
                    </button>
                  </div>

                  <video
                    controls
                    src={previewUrl}
                    className="max-h-56 w-full rounded-lg bg-black object-contain border border-zinc-800/80"
                  />
                </div>
              ) : (
                <div
                  onClick={() => !isProcessing && videoInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (!isProcessing) handleFilePick(e.dataTransfer.files?.[0], "video");
                  }}
                  className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-800 bg-zinc-900/35 p-6 text-center transition hover:border-amber-500/50 hover:bg-zinc-900/60 cursor-pointer"
                >
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
                    <Video className="h-6 w-6" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">
                    Bilgisayarından Ders Videosu Seç veya Buraya Sürükle
                  </h4>
                  <p className="mt-1 font-mono text-[11px] text-zinc-400">
                    Desteklenen Formatlar: .MP4, .MKV, .WEBM, .MOV, .AVI
                  </p>
                  <button
                    type="button"
                    className="mt-3.5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-zinc-950 transition hover:bg-zinc-200"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>Ders Videosu Dosyası Seç</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: AUDIO UPLOAD */}
          {mode === "audio" && (
            <div className="space-y-3">
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/mpeg,audio/wav,audio/mp4,audio/ogg,audio/aac,audio/x-m4a,audio/*,.mp3,.wav,.m4a,.aac,.ogg"
                className="hidden"
                onChange={(e) => handleFilePick(e.target.files?.[0], "audio")}
              />

              {previewUrl && selectedFile ? (
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">
                        {selectedFile.name}
                      </div>
                      <div className="font-mono text-[10px] text-zinc-400">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB •{" "}
                        {videoMeta?.duration ? `Süre: ${videoMeta.duration}` : "Ses Kaydı Hazır"}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => audioInputRef.current?.click()}
                      className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300 hover:text-white cursor-pointer"
                    >
                      Farklı Ses Dosyası Seç
                    </button>
                  </div>
                  <audio controls src={previewUrl} className="w-full" />
                </div>
              ) : (
                <div
                  onClick={() => !isProcessing && audioInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (!isProcessing) handleFilePick(e.dataTransfer.files?.[0], "audio");
                  }}
                  className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-800 bg-zinc-900/35 p-6 text-center transition hover:border-emerald-500/50 hover:bg-zinc-900/60 cursor-pointer"
                >
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                    <FileAudio className="h-6 w-6" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">
                    Ses Kaydı Dosyası Seç veya Sürükle
                  </h4>
                  <p className="mt-1 font-mono text-[11px] text-zinc-400">
                    Formatlar: .MP3, .WAV, .M4A, .AAC, .OGG
                  </p>
                  <button
                    type="button"
                    className="mt-3.5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-zinc-950 transition hover:bg-zinc-200"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>Ses Dosyası Seç</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: VIDEO URL */}
          {mode === "url" && (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-300">
                  Doğrudan Video URL&apos;si veya Paylaşım Bağlantısı
                </label>
                <input
                  type="url"
                  disabled={isProcessing}
                  placeholder="https://example.com/lecture-recording.mp4 veya YouTube bağlantısı"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 font-mono text-xs text-white placeholder-zinc-500 focus:border-amber-500/60 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">
                  Ek Video Notu veya İşlenecek Konu Detayları (Opsiyonel)
                </label>
                <textarea
                  rows={2}
                  disabled={isProcessing}
                  placeholder="Hocanın üzerinde durduğu konular, tahtadaki temel formüller vb..."
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-amber-500/60 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* TAB 4: TRANSCRIPT & NOTES */}
          {mode === "notes" && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                Ders Transkripti, Tahta Notları veya Çözülecek Problem Metni
              </label>
              <textarea
                rows={5}
                disabled={isProcessing}
                placeholder="Ders boyunca konuşulanları veya tahta notlarını buraya yapıştırın. Gemini tahta formüllerini (LaTeX), sınav uyarılarını ve dakika dakika özeti otomatik çıkarır..."
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-xs text-white placeholder-zinc-500 focus:border-amber-500/60 focus:outline-none"
              />
            </div>
          )}

          {/* Progress Indicator */}
          {isProcessing && (
            <div className="rounded-xl border border-amber-500/30 bg-zinc-900/90 p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 font-semibold text-amber-300">
                  <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                  {progressStage}
                </span>
                <span className="font-mono text-xs text-zinc-300">{progressPercent}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-800/80">
            <button
              type="button"
              disabled={isProcessing}
              onClick={onClose}
              className="rounded-xl border border-zinc-800 px-4 py-2.5 text-xs font-medium text-zinc-400 hover:text-white disabled:opacity-40 cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-xs font-bold text-zinc-950 transition hover:bg-amber-300 disabled:opacity-50 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Ders Analiz Ediliyor...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Gemini Multimodal ile Dersi İşle</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
