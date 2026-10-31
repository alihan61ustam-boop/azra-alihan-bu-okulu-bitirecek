"use client";

import React, { useState, useRef } from "react";
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
} from "lucide-react";
import { ApiKeysConfig, Course, Lecture } from "@/types/academic";
import { processLectureMultimodal } from "@/lib/gemini/client";
import { saveMediaBlob } from "@/lib/mediaDb";

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
  const [title, setTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sourceUrlOrNotes, setSourceUrlOrNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStage, setProgressStage] = useState("");
  const [progressPercent, setProgressPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const hasKey = Boolean(apiKeys.geminiApiKey?.trim());

  const handleFilePick = (file: File | undefined) => {
    if (!file) return;
    setSelectedFile(file);
    if (!title.trim()) {
      const base = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
      setTitle(base);
    }
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasKey) {
      setError(
        "Analize başlamadan önce Gemini API anahtarınızı tanımlamanız gerekiyor."
      );
      return;
    }
    if (!selectedFile && !sourceUrlOrNotes.trim()) {
      setError(
        "Lütfen bir ders videosu/ses dosyası seçin veya ders bağlantısı / transkripti girin."
      );
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProgressStage("Gemini Multimodal motoru hazırlanıyor...");
    setProgressPercent(8);

    try {
      const lectureTitle =
        title.trim() ||
        `${course.title} — Yeni Ders Analizi (${new Date().toLocaleDateString("tr-TR")})`;

      const extracted = await processLectureMultimodal({
        apiKey: apiKeys.geminiApiKey,
        model: apiKeys.geminiModel,
        course,
        lectureTitle,
        file: selectedFile || undefined,
        sourceUrlOrNotes: sourceUrlOrNotes || undefined,
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
        createdAt: new Date().toISOString(),
      };

      onLectureCreated(newLecture, selectedFile || undefined);
      setTitle("");
      setSelectedFile(null);
      setSourceUrlOrNotes("");
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ders işlenirken beklenmeyen bir hata oluştu."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="my-auto w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10">
              <Video className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Multimodal Ders Videosu &amp; Ses İşleyici
              </h3>
              <p className="text-xs text-zinc-400">
                Hedef Oda:{" "}
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

        {!hasKey && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5">
            <div className="flex items-start gap-2.5 text-xs text-amber-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <span>
                Canlı video/ses analizi ve tahta OCR işlemi için Gemini API
                anahtarınızı ekleyin.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenApiSettings();
              }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-zinc-950 hover:bg-amber-300 cursor-pointer"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>Anahtar Gir</span>
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-300">
              Ders Kaydı Başlığı
            </label>
            <input
              type="text"
              required
              disabled={isProcessing}
              placeholder="Örn: Hafta 5 — Harmonik Salınıcı ve Merdiven Operatörleri"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:border-amber-500/60 focus:outline-none"
            />
          </div>

          {/* Drag & Drop File Zone */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-300">
              Video, Ses veya Tahta Fotoğrafı Yükle (MP4, WebM, MP3, WAV, PNG/JPG)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,audio/*,image/*"
              className="hidden"
              onChange={(e) => handleFilePick(e.target.files?.[0])}
            />
            <div
              onClick={() => !isProcessing && fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (!isProcessing) handleFilePick(e.dataTransfer.files?.[0]);
              }}
              className={`flex flex-col items-center justify-center rounded-xl border border-dashed p-5 text-center transition cursor-pointer ${
                selectedFile
                  ? "border-amber-500/50 bg-amber-500/5"
                  : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70"
              }`}
            >
              {selectedFile ? (
                <div className="space-y-1.5">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
                    {selectedFile.type.startsWith("audio") ? (
                      <FileAudio className="h-5 w-5" />
                    ) : (
                      <Video className="h-5 w-5" />
                    )}
                  </div>
                  <div className="text-xs font-semibold text-white">
                    {selectedFile.name}
                  </div>
                  <div className="font-mono text-[11px] text-zinc-400">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB •{" "}
                    {selectedFile.type || "medya"}
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Upload className="mx-auto h-6 w-6 text-zinc-400" />
                  <p className="text-xs font-medium text-zinc-200">
                    Dosyayı buraya sürükleyin veya seçmek için tıklayın
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Gemini hem konuşulanları dinler hem de tahtadaki formülleri LaTeX olarak çıkarır
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Optional Direct URL / Transcript / Extra Context */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-300">
              <Link2 className="h-3.5 w-3.5 text-zinc-400" />
              <span>
                Veya Doğrudan Medya URL&apos;si / Ders Notu &amp; Transkript Metni
              </span>
            </label>
            <textarea
              rows={3}
              disabled={isProcessing}
              placeholder="Video URL'si (https://.../lecture.mp4) veya işlenmesini istediğiniz ders transkripti / konu notlarını buraya yapıştırabilirsiniz..."
              value={sourceUrlOrNotes}
              onChange={(e) => setSourceUrlOrNotes(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-amber-500/60 focus:outline-none"
            />
          </div>

          {/* Live Progress Bar */}
          {isProcessing && (
            <div className="rounded-xl border border-amber-500/30 bg-zinc-900/90 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 font-medium text-amber-300">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {progressStage}
                </span>
                <span className="font-mono text-zinc-400">{progressPercent}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
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
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-50 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Analiz Ediliyor...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Gemini ile Dersi İşle</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
