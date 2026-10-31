"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Clock,
  Copy,
  Check,
  FileText,
  Flame,
  HelpCircle,
  Layers,
  MessageSquarePlus,
  Play,
  Plus,
  Sigma,
  Sparkles,
  Trash2,
  ChevronDown,
  ChevronUp,
  Download,
  ArrowRight,
} from "lucide-react";
import { Course, Lecture } from "@/types/academic";
import { LatexFormula, MathMarkdown } from "@/components/MathMarkdown";
import { loadMediaObjectUrl } from "@/lib/mediaDb";

type NoteFilter =
  | "all"
  | "alerts"
  | "whiteboard"
  | "timeline"
  | "practice";

export function LectureNoteViewer({
  course,
  lectures,
  activeLectureId,
  onSelectLecture,
  onOpenUploadModal,
  onDeleteLecture,
  onAskTutor,
}: {
  course: Course;
  lectures: Lecture[];
  activeLectureId: string;
  onSelectLecture: (id: string) => void;
  onOpenUploadModal: () => void;
  onDeleteLecture: (id: string) => void;
  onAskTutor: (promptText: string) => void;
}) {
  const activeLecture =
    lectures.find((l) => l.id === activeLectureId) || lectures[0];

  const [filter, setFilter] = useState<NoteFilter>("all");
  const [mediaObjectUrl, setMediaObjectUrl] = useState<string | null>(null);
  const [activeTimestamp, setActiveTimestamp] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openTranscripts, setOpenTranscripts] = useState<Record<string, boolean>>(
    {}
  );
  const [openHints, setOpenHints] = useState<Record<string, boolean>>({});
  const [openSolutions, setOpenSolutions] = useState<Record<string, boolean>>({});

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let revokedUrl: string | null = null;
    async function hydrateMedia() {
      setActiveTimestamp(null);
      if (!activeLecture) {
        setMediaObjectUrl(null);
        return;
      }
      if (activeLecture.mediaBlobKey) {
        const objUrl = await loadMediaObjectUrl(activeLecture.mediaBlobKey);
        revokedUrl = objUrl;
        setMediaObjectUrl(objUrl);
      } else if (activeLecture.mediaUrl) {
        setMediaObjectUrl(activeLecture.mediaUrl);
      } else {
        setMediaObjectUrl(null);
      }
    }
    hydrateMedia();
    return () => {
      if (revokedUrl && revokedUrl.startsWith("blob:")) {
        URL.revokeObjectURL(revokedUrl);
      }
    };
  }, [activeLecture]);

  const handleJumpToTimestamp = (timestamp: string, seconds: number) => {
    setActiveTimestamp(timestamp);
    playerContainerRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });

    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play().catch(() => {});
    } else if (audioRef.current) {
      audioRef.current.currentTime = seconds;
      audioRef.current.play().catch(() => {});
    }
  };

  const handleCopyLatex = (id: string, latex: string) => {
    navigator.clipboard?.writeText(`$$${latex}$$`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleExportMarkdown = () => {
    if (!activeLecture) return;
    const lines: string[] = [
      `# ${course.code} — ${course.title}`,
      `## ${activeLecture.title} (${activeLecture.recordedDate})`,
      "",
      `### Yönetici Özeti`,
      activeLecture.executiveSummary,
      "",
      `### Hoca Vurguları & Sınav Uyarıları`,
      ...activeLecture.examAlerts.map(
        (a) =>
          `- **[${a.timestamp}] ${a.topic}:** "${a.professorQuote}" *(İpucu: ${a.examTip})*`
      ),
      "",
      `### Tahta & LaTeX Denklemleri`,
      ...activeLecture.whiteboardExtractions.map(
        (w) =>
          `#### [${w.timestamp}] ${w.title}\n$$${w.latex}$$\n${w.variablesExplanation}\n`
      ),
      "",
      `### Dakika Dakika Ders Akışı`,
      ...activeLecture.timeline.map(
        (t) =>
          `- **[${t.timestamp}] ${t.title}:** ${t.summary}`
      ),
    ];
    const blob = new Blob([lines.join("\n")], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${course.code.replace(/\s+/g, "_")}_${activeLecture.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!activeLecture) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-10 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
          <Sparkles className="h-6 w-6 text-amber-400" />
        </div>
        <h3 className="text-base font-bold text-white">
          Bu Ders Odasında Henüz İşlenmiş Kayıt Yok
        </h3>
        <p className="mt-1.5 max-w-md text-xs leading-relaxed text-zinc-400">
          İlk ders videonu veya ses kaydını (MP4, WebM, MP3, WAV) yükle; Gemini
          dakika dakika zaman çizelgesini, tahtadaki LaTeX formülleri ve hocanın
          sınav uyarılarını otomatik çıkarsın.
        </p>
        <button
          type="button"
          onClick={onOpenUploadModal}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-zinc-950 hover:bg-zinc-200 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>İlk Ders Kaydını Yükle &amp; İşle</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 sm:p-6">
      {/* Lecture Selector Bar & Upload Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800/90 bg-zinc-900/35 p-3">
        <div className="flex flex-1 items-center gap-2 min-w-[220px]">
          <select
            value={activeLecture.id}
            onChange={(e) => onSelectLecture(e.target.value)}
            className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs sm:text-sm font-semibold text-white focus:border-amber-500/60 focus:outline-none"
          >
            {lectures.map((lec) => (
              <option key={lec.id} value={lec.id}>
                {lec.title} ({lec.durationLabel})
              </option>
            ))}
          </select>

          {lectures.length > 1 && (
            <button
              type="button"
              onClick={() => onDeleteLecture(activeLecture.id)}
              title="Bu Ders Kaydını Sil"
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-zinc-400 hover:border-red-500/40 hover:text-red-400 cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportMarkdown}
            title="Ders Notunu Markdown + LaTeX Olarak İndir"
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-zinc-700 hover:text-white cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">.MD İndir</span>
          </button>

          <button
            type="button"
            onClick={onOpenUploadModal}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-zinc-950 transition hover:bg-zinc-200 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Yeni Video / Ses İşle</span>
          </button>
        </div>
      </div>

      {/* Media Player OR Interactive Timestamp Bar */}
      <div
        ref={playerContainerRef}
        className="overflow-hidden rounded-2xl border border-zinc-800/90 bg-[#050507]"
      >
        {mediaObjectUrl ? (
          <div className="p-3 space-y-2">
            {activeLecture.sourceType === "audio" ||
            activeLecture.mediaMimeType?.startsWith("audio") ? (
              <audio
                ref={audioRef}
                controls
                src={mediaObjectUrl}
                className="w-full"
              />
            ) : (
              <video
                ref={videoRef}
                controls
                src={mediaObjectUrl}
                className="max-h-80 w-full rounded-xl bg-black object-contain"
              />
            )}
            <div className="flex items-center justify-between px-1 text-[11px] text-zinc-400">
              <span>
                Aşağıdaki herhangi bir{" "}
                <code className="font-mono text-amber-300">[DK:SN]</code>{" "}
                etiketine tıklayarak kayıtta o saniyeye atlayabilirsin.
              </span>
              {activeTimestamp && (
                <span className="font-mono text-amber-300">
                  Aktif Konum: {activeTimestamp}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-amber-400">
                <Play className="h-3.5 w-3.5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-zinc-200">
                  {activeLecture.title}
                </div>
                <div className="text-[11px] text-zinc-500">
                  {activeLecture.recordedDate} • Süre:{" "}
                  <span className="font-mono text-zinc-300">
                    {activeLecture.durationLabel}
                  </span>{" "}
                  {activeTimestamp && (
                    <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-amber-300">
                      Seçili Zaman Damgası: {activeTimestamp}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {activeLecture.timeline.map((seg) => (
                <button
                  key={seg.id}
                  type="button"
                  onClick={() => handleJumpToTimestamp(seg.timestamp, seg.seconds)}
                  className={`rounded-md border px-2 py-1 font-mono text-[11px] transition cursor-pointer ${
                    activeTimestamp === seg.timestamp
                      ? "border-amber-400 bg-amber-500/20 text-amber-200"
                      : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  {seg.timestamp}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Section Filter Pills */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-800/80 pb-3">
        {(
          [
            { id: "all", label: "Tüm Analiz" },
            {
              id: "alerts",
              label: `Sınav Uyarıları (${activeLecture.examAlerts.length})`,
            },
            {
              id: "whiteboard",
              label: `Tahta & LaTeX (${activeLecture.whiteboardExtractions.length})`,
            },
            {
              id: "timeline",
              label: `Dakika Dakika (${activeLecture.timeline.length})`,
            },
            {
              id: "practice",
              label: `Kavram Haritası & Sorular (${activeLecture.practiceQuestions.length})`,
            },
          ] as { id: NoteFilter; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
              filter === tab.id
                ? "bg-zinc-100 text-zinc-950 font-semibold"
                : "bg-zinc-900/60 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. EXECUTIVE SUMMARY */}
      {filter === "all" && (
        <section className="rounded-2xl border border-zinc-800/90 bg-zinc-900/30 p-4 sm:p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <FileText className="h-3.5 w-3.5 text-amber-400" />
            <span>Yönetici Özeti (Executive Summary)</span>
          </div>
          <MathMarkdown content={activeLecture.executiveSummary} />
        </section>
      )}

      {/* 2. PROFESSOR FOCUS / EXAM ALERTS */}
      {(filter === "all" || filter === "alerts") &&
        activeLecture.examAlerts.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  Hoca Vurguları &amp; Sınav Uyarıları
                </h3>
              </div>
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-amber-300">
                SINAV ODAKLI
              </span>
            </div>

            <div className="grid gap-3">
              {activeLecture.examAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4 space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleJumpToTimestamp(alert.timestamp, alert.seconds)
                        }
                        className="inline-flex items-center gap-1 rounded-md border border-amber-400/40 bg-zinc-950 px-2 py-0.5 font-mono text-xs font-semibold text-amber-300 hover:bg-amber-500/20 cursor-pointer"
                      >
                        <Clock className="h-3 w-3" />
                        <span>{alert.timestamp}</span>
                      </button>
                      <span className="text-xs sm:text-sm font-bold text-amber-200">
                        {alert.topic}
                      </span>
                    </div>

                    <span
                      className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                        alert.severity === "critical"
                          ? "bg-amber-400 text-zinc-950"
                          : "border border-amber-400/40 text-amber-300"
                      }`}
                    >
                      {alert.severity === "critical"
                        ? "Sınavda Çıkabilir!"
                        : "Hoca Vurgusu"}
                    </span>
                  </div>

                  <blockquote className="border-l-2 border-amber-400/70 pl-3 text-xs sm:text-sm italic text-zinc-200">
                    &ldquo;{alert.professorQuote}&rdquo;
                  </blockquote>

                  <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/80 p-3">
                    <div className="mb-1 text-[11px] font-semibold text-amber-300">
                      Çalışma &amp; Tam Puan İpucu:
                    </div>
                    <MathMarkdown content={alert.examTip} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      {/* 3. WHITEBOARD & EQUATION EXTRACTION */}
      {(filter === "all" || filter === "whiteboard") &&
        activeLecture.whiteboardExtractions.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Sigma className="h-4 w-4 text-zinc-200" />
              <h3 className="text-sm font-bold text-white">
                Tahta &amp; Denklem Çıkarımı (LaTeX / KaTeX)
              </h3>
            </div>

            <div className="grid gap-3">
              {activeLecture.whiteboardExtractions.map((wb) => (
                <div
                  key={wb.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleJumpToTimestamp(wb.timestamp, wb.seconds)
                        }
                        className="inline-flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-0.5 font-mono text-xs text-zinc-300 hover:border-amber-400/50 hover:text-amber-300 cursor-pointer"
                      >
                        <Clock className="h-3 w-3" />
                        <span>{wb.timestamp}</span>
                      </button>
                      <h4 className="text-xs sm:text-sm font-semibold text-white">
                        {wb.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          onAskTutor(
                            `"${wb.title}" formülünün ($$${wb.latex}$$) fiziksel anlamını ve adım adım nasıl türetildiğini anlatır mısın?`
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[11px] text-zinc-300 hover:border-amber-500/40 hover:text-amber-300 cursor-pointer"
                      >
                        <MessageSquarePlus className="h-3 w-3" />
                        <span>Türetilişini Sor</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyLatex(wb.id, wb.latex)}
                        title="LaTeX Kodunu Kopyala"
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 font-mono text-[11px] text-zinc-400 hover:text-white cursor-pointer"
                      >
                        {copiedId === wb.id ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span className="text-emerald-400">LaTeX</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>LaTeX</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Rendered KaTeX Formula Box */}
                  <div className="overflow-x-auto rounded-xl border border-zinc-800/90 bg-[#050507] px-4 py-3.5 text-center">
                    <LatexFormula latex={wb.latex} displayMode />
                  </div>

                  <MathMarkdown content={wb.variablesExplanation} />

                  {wb.diagramNote && (
                    <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-400">
                      <MathMarkdown content={wb.diagramNote} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

      {/* 4. MINUTE-BY-MINUTE BREAKDOWN */}
      {(filter === "all" || filter === "timeline") &&
        activeLecture.timeline.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-zinc-200" />
              <h3 className="text-sm font-bold text-white">
                Dakika Dakika Ders Akışı &amp; Transkript
              </h3>
            </div>

            <div className="relative space-y-3 pl-4 before:absolute before:top-2 before:bottom-2 before:left-1.5 before:w-px before:bg-zinc-800">
              {activeLecture.timeline.map((seg) => {
                const isSelected = activeTimestamp === seg.timestamp;
                const isOpenTranscript = Boolean(openTranscripts[seg.id]);

                return (
                  <div
                    key={seg.id}
                    className={`relative rounded-2xl border p-4 transition ${
                      isSelected
                        ? "border-amber-500/50 bg-zinc-900/80"
                        : seg.isExamAlert
                        ? "border-amber-500/25 bg-zinc-900/40"
                        : "border-zinc-800/90 bg-zinc-900/25"
                    }`}
                  >
                    <span
                      className={`absolute -left-[13px] top-5 h-2.5 w-2.5 rounded-full border-2 border-zinc-950 ${
                        seg.isExamAlert ? "bg-amber-400" : "bg-zinc-500"
                      }`}
                    />

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() =>
                            handleJumpToTimestamp(seg.timestamp, seg.seconds)
                          }
                          className="inline-flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-0.5 font-mono text-xs font-semibold text-amber-300 hover:border-amber-400 cursor-pointer"
                        >
                          <Play className="h-2.5 w-2.5" />
                          <span>{seg.timestamp}</span>
                        </button>
                        <h4 className="text-xs sm:text-sm font-bold text-white">
                          {seg.title}
                        </h4>
                      </div>

                      {seg.isExamAlert && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-300">
                          <Flame className="h-3 w-3" /> Sınav Vurgusu
                        </span>
                      )}
                    </div>

                    <div className="mt-2">
                      <MathMarkdown content={seg.summary} />
                    </div>

                    {seg.equations.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {seg.equations.map((eq, i) => (
                          <div
                            key={i}
                            className="overflow-x-auto rounded-xl border border-zinc-800/90 bg-[#050507] px-3 py-2 text-center"
                          >
                            <LatexFormula latex={eq} displayMode />
                          </div>
                        ))}
                      </div>
                    )}

                    {seg.spokenTranscript && (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenTranscripts((p) => ({
                              ...p,
                              [seg.id]: !p[seg.id],
                            }))
                          }
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-zinc-200 cursor-pointer"
                        >
                          {isOpenTranscript ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                          <span>
                            {isOpenTranscript
                              ? "Konuşma Transkriptini Gizle"
                              : "Hocanın Konuşma Transkriptini Göster"}
                          </span>
                        </button>

                        {isOpenTranscript && (
                          <div className="mt-2 rounded-xl border border-zinc-800/80 bg-zinc-950/90 p-3 text-xs leading-relaxed text-zinc-300">
                            &ldquo;{seg.spokenTranscript}&rdquo;
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

      {/* 5. CONCEPT MAP & PRACTICE QUESTIONS */}
      {(filter === "all" || filter === "practice") && (
        <section className="space-y-5">
          {activeLecture.conceptMap.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-zinc-200" />
                <h3 className="text-sm font-bold text-white">
                  Kavram Haritası (Concept Map)
                </h3>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {activeLecture.conceptMap.map((node) => (
                  <div
                    key={node.id}
                    className="flex flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-900/35 p-4 space-y-2.5"
                  >
                    <div className="space-y-1.5">
                      <div className="text-xs font-bold text-white">
                        {node.concept}
                      </div>
                      {node.formula && (
                        <div className="overflow-x-auto rounded-lg border border-zinc-800/80 bg-zinc-950 px-2.5 py-1.5 text-center text-xs">
                          <LatexFormula
                            latex={node.formula}
                            displayMode={false}
                          />
                        </div>
                      )}
                      <MathMarkdown content={node.description} />
                    </div>

                    {node.connectsTo && (
                      <div className="flex items-center gap-1.5 pt-2 border-t border-zinc-800/70 font-mono text-[10px] text-amber-300">
                        <ArrowRight className="h-3 w-3 shrink-0" />
                        <span className="truncate">{node.connectsTo}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeLecture.practiceQuestions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  Vize &amp; Final Sınav Provası Soruları
                </h3>
              </div>

              <div className="space-y-3">
                {activeLecture.practiceQuestions.map((pq, idx) => (
                  <div
                    key={pq.id}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900/35 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-zinc-300">
                        Soru #{idx + 1}
                      </span>
                      <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-300">
                        {pq.difficulty} Düzeyi
                      </span>
                    </div>

                    <MathMarkdown content={pq.question} />

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenHints((p) => ({ ...p, [pq.id]: !p[pq.id] }))
                        }
                        className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-700 hover:text-white cursor-pointer"
                      >
                        {openHints[pq.id] ? "İpucunu Gizle" : "İpucu Göster"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setOpenSolutions((p) => ({
                            ...p,
                            [pq.id]: !p[pq.id],
                          }))
                        }
                        className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 cursor-pointer"
                      >
                        {openSolutions[pq.id]
                          ? "Çözümü Gizle"
                          : "Adım Adım Çözümü Aç"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onAskTutor(
                            `Şu sınav sorusunu birlikte adım adım çözelim ve benzer bir varyasyon daha sor:\n\n${pq.question}`
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/20 cursor-pointer"
                      >
                        <MessageSquarePlus className="h-3.5 w-3.5" />
                        <span>AI Eğitmenle Çöz</span>
                      </button>
                    </div>

                    {openHints[pq.id] && (
                      <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
                        <div className="mb-1 text-[11px] font-semibold text-amber-300">
                          İpucu:
                        </div>
                        <MathMarkdown content={pq.hint} />
                      </div>
                    )}

                    {openSolutions[pq.id] && (
                      <div className="rounded-xl border border-zinc-800 bg-[#050507] p-4">
                        <MathMarkdown content={pq.solutionMarkdown} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
