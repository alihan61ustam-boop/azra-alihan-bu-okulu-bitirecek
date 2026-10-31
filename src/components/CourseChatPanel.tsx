"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Send,
  Sparkles,
  ImagePlus,
  X,
  Trash2,
  ShieldCheck,
  KeyRound,
  Loader2,
} from "lucide-react";
import {
  ApiKeysConfig,
  ChatMessage,
  Course,
  CourseResource,
  Lecture,
} from "@/types/academic";
import { MathMarkdown } from "@/components/MathMarkdown";
import {
  extractCleanErrorMessage,
  streamCourseTutorChat,
} from "@/lib/gemini/client";

const QUICK_PROMPTS = [
  "Bu dersteki tüm sınav uyarılarını özetle",
  "Tahtadaki formülleri sıfırdan adım adım türet",
  "Vize seviyesinde 2 klasik soru sor",
  "Bu konuyu sezgisel bir fizik örneğiyle sadeleştir",
];

export function CourseChatPanel({
  course,
  lectures,
  resources,
  messages,
  apiKeys,
  externalTriggerPrompt,
  onClearExternalTrigger,
  onUpdateMessages,
  onOpenApiSettings,
}: {
  course: Course;
  lectures: Lecture[];
  resources: CourseResource[];
  messages: ChatMessage[];
  apiKeys: ApiKeysConfig;
  externalTriggerPrompt: string | null;
  onClearExternalTrigger: () => void;
  onUpdateMessages: (msgs: ChatMessage[]) => void;
  onOpenApiSettings: () => void;
}) {
  const [input, setInput] = useState("");
  const [attachedImage, setAttachedImage] = useState<{
    name: string;
    dataUrl: string;
  } | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);

  const hasKey = Boolean(apiKeys.geminiApiKey?.trim());

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  useEffect(() => {
    if (externalTriggerPrompt) {
      setInput(externalTriggerPrompt);
      onClearExternalTrigger();
    }
  }, [externalTriggerPrompt, onClearExternalTrigger]);

  const handleImageSelect = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAttachedImage({
        name: file.name,
        dataUrl: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  const sendMessage = async (textOverride?: string) => {
    const promptText = (textOverride ?? input).trim();
    if (!promptText || isStreaming) return;

    if (!hasKey) {
      setError(
        "AI Eğitmen yanıtı için sağ üstteki 'API & Araçlar' menüsünden Gemini API anahtarınızı kaydedin."
      );
      return;
    }

    setError(null);
    const userMsg: ChatMessage = {
      id: `msg-u-${Date.now()}`,
      courseId: course.id,
      role: "user",
      content: promptText,
      attachmentName: attachedImage?.name,
      imageDataUrl: attachedImage?.dataUrl,
      createdAt: new Date().toISOString(),
    };

    const currentImage = attachedImage?.dataUrl;
    const updatedHistory = [...messages, userMsg];
    onUpdateMessages(updatedHistory);
    setInput("");
    setAttachedImage(null);
    setIsStreaming(true);
    setStreamingContent("");

    try {
      const finalReply = await streamCourseTutorChat({
        apiKey: apiKeys.geminiApiKey,
        model: apiKeys.geminiModel,
        course,
        lectures,
        resources,
        history: messages,
        userPrompt: promptText,
        imageDataUrl: currentImage,
        onToken: (acc) => setStreamingContent(acc),
      });

      const assistantMsg: ChatMessage = {
        id: `msg-a-${Date.now()}`,
        courseId: course.id,
        role: "assistant",
        content: finalReply,
        createdAt: new Date().toISOString(),
      };
      onUpdateMessages([...updatedHistory, assistantMsg]);
    } catch (err) {
      setError(extractCleanErrorMessage(err));
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
    }
  };

  const handleResetChat = () => {
    const resetMsg: ChatMessage = {
      id: `msg-reset-${Date.now()}`,
      courseId: course.id,
      role: "assistant",
      content: `**${course.title} (${course.code})** sohbet geçmişi temizlendi. Bu dersin ${lectures.length} ders kaydı ve ${resources.length} ek akademik kaynağı hafızamda hazır!`,
      createdAt: new Date().toISOString(),
    };
    onUpdateMessages([resetMsg]);
  };

  return (
    <div className="flex h-full flex-col bg-[#070709]">
      {/* Isolated Context Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span className="truncate text-xs font-bold text-white">
              {course.code} İzole AI Eğitmen
            </span>
          </div>
          <p className="truncate text-[10px] text-zinc-400">
            Bağlam: Sadece {course.title} ({lectures.length} kayıt,{" "}
            {resources.length} kaynak)
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetChat}
          title="Sohbeti Temizle"
          className="rounded-lg border border-zinc-800 bg-zinc-900 p-1.5 text-zinc-400 hover:text-white cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 space-y-3.5 overflow-y-auto p-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.role === "user" ? "items-end" : "items-start"
            }`}
          >
            <div
              className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 ${
                msg.role === "user"
                  ? "border border-zinc-700 bg-zinc-800/90 text-zinc-100"
                  : "border border-zinc-800/90 bg-zinc-900/55 text-zinc-200"
              }`}
            >
              {msg.imageDataUrl && (
                <img
                  src={msg.imageDataUrl}
                  alt={msg.attachmentName || "Ek"}
                  className="mb-2 max-h-44 rounded-lg border border-zinc-700 object-contain"
                />
              )}
              <MathMarkdown content={msg.content} />
            </div>
          </div>
        ))}

        {isStreaming && (
          <div className="flex flex-col items-start">
            <div className="max-w-[92%] rounded-2xl border border-amber-500/25 bg-zinc-900/70 px-3.5 py-2.5">
              {streamingContent ? (
                <MathMarkdown content={streamingContent} />
              ) : (
                <div className="flex items-center gap-2 text-xs text-amber-300">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Ders notları ve LaTeX formüller taranıyor...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 space-y-2">
            <div>{error}</div>
            {!hasKey && (
              <button
                type="button"
                onClick={onOpenApiSettings}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-zinc-950 hover:bg-amber-300 cursor-pointer"
              >
                <KeyRound className="h-3 w-3" />
                <span>Gemini API Anahtarını Tanımla</span>
              </button>
            )}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick Prompts */}
      <div className="flex gap-1.5 overflow-x-auto border-t border-zinc-800/70 px-3 py-2">
        {QUICK_PROMPTS.map((qp) => (
          <button
            key={qp}
            type="button"
            disabled={isStreaming}
            onClick={() => sendMessage(qp)}
            className="shrink-0 rounded-lg border border-zinc-800 bg-zinc-900/80 px-2.5 py-1 text-[11px] text-zinc-300 transition hover:border-amber-500/40 hover:text-amber-300 disabled:opacity-40 cursor-pointer"
          >
            {qp}
          </button>
        ))}
      </div>

      {/* Composer */}
      <div className="border-t border-zinc-800/80 p-3 space-y-2">
        {attachedImage && (
          <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300">
            <span className="truncate">📎 {attachedImage.name}</span>
            <button
              type="button"
              onClick={() => setAttachedImage(null)}
              className="text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex items-end gap-2"
        >
          <input
            ref={imgInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleImageSelect(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => imgInputRef.current?.click()}
            title="Defter / Soru Fotoğrafı Ekle"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 transition hover:border-zinc-700 hover:text-white cursor-pointer"
          >
            <ImagePlus className="h-4 w-4" />
          </button>

          <textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={`${course.title} hakkında soru sor...`}
            className="flex-1 resize-none rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs sm:text-sm text-white placeholder-zinc-500 focus:border-amber-500/60 focus:outline-none"
          />

          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-35 cursor-pointer"
          >
            {isStreaming ? (
              <Sparkles className="h-4 w-4 animate-pulse" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
