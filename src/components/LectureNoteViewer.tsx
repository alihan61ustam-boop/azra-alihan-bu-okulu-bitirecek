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
  Video,
  Search,
  X,
  Volume2,
} from "lucide-react";
import { Course, Lecture, TranscriptItem } from "@/types/academic";
import { LatexFormula, MathMarkdown } from "@/components/MathMarkdown";
import { loadMediaObjectUrl, saveMediaBlob } from "@/lib/mediaDb";
import { generateFallbackTranscript } from "@/lib/gemini/client";

type NoteFilter =
  | "all"
  | "alerts"
  | "whiteboard"
  | "timeline"
  | "transcript"
  | "practice";

export function LectureNoteViewer({
  course,
  lectures,
  activeLectureId,
  onSelectLecture,
  onOpenUploadModal,
  onDeleteLecture,
  onAskTutor,
  onAttachMedia,
}: {
  course: Course;
  lectures: Lecture[];
  activeLectureId: string;
  onSelectLecture: (id: string) => void;
  onOpenUploadModal: () => void;
  onDeleteLecture: (id: string) => void;
  onAskTutor: (promptText: string) => void;
  onAttachMedia?: (lectureId: string, file: File) => void;
}) {
  const activeLecture =
    lectures.find((l) => l.id === activeLectureId) || lectures[0];

  const [filter, setFilter] = useState<NoteFilter>("all");
  const [mediaObjectUrl, setMediaObjectUrl] = useState<string | null>(null);
  const [activeTimestamp, setActiveTimestamp] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState<boolean>(true);
  const [transcriptSearch, setTranscriptSearch] = useState<string>("");
  const [transcriptTab, setTranscriptTab] = useState<"all" | "important">("all");
  const [autoScrollTranscript, setAutoScrollTranscript] = useState<boolean>(true);
  const [openTranscripts, setOpenTranscripts] = useState<Record<string, boolean>>(
    {}
  );
  const [openHints, setOpenHints] = useState<Record<string, boolean>>({});
  const [openSolutions, setOpenSolutions] = useState<Record<string, boolean>>({});

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const directVideoInputRef = useRef<HTMLInputElement>(null);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);

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

  const transcriptItems: TranscriptItem[] = React.useMemo(() => {
    if (!activeLecture) return [];
    if (activeLecture.transcript && activeLecture.transcript.length > 0) {
      return activeLecture.transcript;
    }
    return generateFallbackTranscript(
      activeLecture.timeline,
      activeLecture.executiveSummary,
      2000
    );
  }, [activeLecture]);

  const activeTranscriptIndex = React.useMemo(() => {
    if (!transcriptItems || transcriptItems.length === 0) return -1;
    let idx = -1;
    for (let i = 0; i < transcriptItems.length; i++) {
      if (currentTime >= transcriptItems[i].seconds) {
        idx = i;
      } else {
        break;
      }
    }
    return idx;
  }, [transcriptItems, currentTime]);

  useEffect(() => {
    if (!autoScrollTranscript || activeTranscriptIndex < 0 || transcriptSearch) return;
    const targetElement = document.getElementById(
      `transcript-row-${activeTranscriptIndex}`
    );
    if (targetElement && transcriptContainerRef.current) {
      targetElement.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activeTranscriptIndex, autoScrollTranscript, transcriptSearch]);

  const importantTranscriptCount = React.useMemo(() => {
    return transcriptItems.filter((t) => t.isImportant).length;
  }, [transcriptItems]);

  const filteredTranscript = React.useMemo(() => {
    let list = transcriptItems;
    if (transcriptTab === "important") {
      list = list.filter((item) => item.isImportant);
    }
    if (!transcriptSearch.trim()) return list;
    const q = transcriptSearch.trim().toLowerCase();
    return list.filter(
      (item) =>
        item.text.toLowerCase().includes(q) ||
        item.timestamp.toLowerCase().includes(q) ||
        (item.importanceNote && item.importanceNote.toLowerCase().includes(q))
    );
  }, [transcriptItems, transcriptTab, transcriptSearch]);

  const handleJumpToTranscript = (item: TranscriptItem, index: number) => {
    setActiveTimestamp(item.timestamp);
    setCurrentTime(item.seconds);

    if (videoRef.current) {
      videoRef.current.currentTime = item.seconds;
      videoRef.current.play().catch(() => {});
    } else if (audioRef.current) {
      audioRef.current.currentTime = item.seconds;
      audioRef.current.play().catch(() => {});
    }
  };

  const handleJumpToTimestamp = (timestamp: string, seconds: number) => {
    setActiveTimestamp(timestamp);
    setCurrentTime(seconds);
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

      {/* Hidden Input for Direct Video/Audio Attachment */}
      <input
        ref={directVideoInputRef}
        type="file"
        accept="video/mp4,video/webm,video/x-matroska,video/quicktime,video/avi,video/*,.mp4,.mkv,.webm,.mov,.avi,.m4v,.ts,audio/*,.mp3,.wav,.m4a"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file || !activeLecture) return;
          const key = `blob-${activeLecture.id}`;
          await saveMediaBlob(key, file);
          const objUrl = URL.createObjectURL(file);
          setMediaObjectUrl(objUrl);
          onAttachMedia?.(activeLecture.id, file);
        }}
      />

      {/* Media Player & Synchronized Transcript Panel (Google Drive / Vids Style) */}
      <div
        ref={playerContainerRef}
        className="overflow-hidden rounded-2xl border border-zinc-800/90 bg-[#050507] shadow-2xl"
      >
        {/* Top Header Bar across the player */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-zinc-800/80 px-3.5 py-2.5 bg-zinc-950/70">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/20">
              <Video className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <div className="text-xs font-bold text-zinc-100 truncate flex items-center gap-2">
                <span>{activeLecture.title}</span>
                {mediaObjectUrl && (
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Medya Hazır
                  </span>
                )}
              </div>
              <div className="text-[11px] text-zinc-500 font-mono">
                {activeLecture.recordedDate} • Süre: {activeLecture.durationLabel}
                {activeTimestamp && (
                  <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-300">
                    Aktif Konum: {activeTimestamp}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Speed selection */}
            <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900 p-0.5">
              {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => {
                    setPlaybackRate(rate);
                    if (videoRef.current) videoRef.current.playbackRate = rate;
                    if (audioRef.current) audioRef.current.playbackRate = rate;
                  }}
                  className={`px-1.5 py-0.5 font-mono text-[10px] font-semibold rounded transition cursor-pointer ${
                    playbackRate === rate
                      ? "bg-amber-400 text-zinc-950"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            {/* Toggle Transcript Panel Button */}
            <button
              type="button"
              onClick={() => setIsTranscriptOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                isTranscriptOpen
                  ? "border-sky-500/40 bg-sky-500/15 text-sky-300"
                  : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Transkript</span>
              <span className="rounded bg-sky-500/20 px-1 py-0.2 font-mono text-[10px] text-sky-200">
                {transcriptItems.length}
              </span>
            </button>

            {/* Attach or change video */}
            <button
              type="button"
              onClick={() => directVideoInputRef.current?.click()}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300 hover:text-white cursor-pointer transition hover:bg-zinc-800"
            >
              {mediaObjectUrl ? "Farklı Video Seç" : "Video Bağla"}
            </button>
          </div>
        </div>

        {/* Player and Transcript Side-by-Side Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[360px] divide-y lg:divide-y-0 lg:divide-x divide-zinc-800/80">
          {/* Main Player Column (Left) */}
          <div
            className={`${
              isTranscriptOpen ? "lg:col-span-7 xl:col-span-8" : "lg:col-span-12"
            } p-3 sm:p-4 flex flex-col justify-between space-y-3 bg-[#020204]`}
          >
            {mediaObjectUrl ? (
              activeLecture.sourceType === "audio" ||
              activeLecture.mediaMimeType?.startsWith("audio") ? (
                <div className="flex flex-col items-center justify-center py-10 px-4 rounded-xl border border-zinc-800/80 bg-zinc-950/60 space-y-4">
                  <div className="h-16 w-16 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 animate-pulse">
                    <Volume2 className="h-8 w-8" />
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-semibold text-zinc-200">
                      {activeLecture.title}
                    </div>
                    <div className="text-xs text-zinc-500">Ses Kaydı Oynatılıyor</div>
                  </div>
                  <audio
                    ref={audioRef}
                    controls
                    src={mediaObjectUrl}
                    onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    className="w-full max-w-md"
                  />
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden bg-black border border-zinc-800/80 flex items-center justify-center shadow-inner">
                  <video
                    ref={videoRef}
                    controls
                    src={mediaObjectUrl}
                    onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    className="max-h-[460px] w-full object-contain"
                  />
                </div>
              )
            ) : (
              /* Visual Stage when video is not attached yet */
              <div className="relative rounded-xl border border-zinc-800/80 bg-gradient-to-b from-zinc-950/80 to-zinc-900/40 p-6 flex flex-col justify-between min-h-[300px]">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400 border border-amber-500/20">
                    <Sparkles className="h-3 w-3" />
                    <span>Akademik Ders Alanı</span>
                  </div>
                  <h3 className="text-base font-semibold text-zinc-100">
                    {activeLecture.title}
                  </h3>
                  <p className="text-xs text-zinc-400 line-clamp-2">
                    {activeLecture.executiveSummary}
                  </p>
                </div>

                <div
                  onClick={() => directVideoInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={async (e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (!file || !activeLecture) return;
                    const key = `blob-${activeLecture.id}`;
                    await saveMediaBlob(key, file);
                    const objUrl = URL.createObjectURL(file);
                    setMediaObjectUrl(objUrl);
                    onAttachMedia?.(activeLecture.id, file);
                  }}
                  className="my-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 p-4 text-center hover:border-amber-500/50 hover:bg-zinc-900/70 transition cursor-pointer group"
                >
                  <Video className="mx-auto h-7 w-7 text-zinc-500 group-hover:text-amber-400 transition" />
                  <div className="mt-2 text-xs font-semibold text-zinc-200">
                    Kendi ders videonu yükle veya sürükle (.mp4, .mkv, .webm)
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    Sağdaki transkripte tıkladığında video anında o saniyeye atlar.
                  </div>
                </div>

                <div className="text-[11px] text-zinc-500 flex items-center justify-between">
                  <span>Kayıt Tarihi: {activeLecture.recordedDate}</span>
                  <span className="font-mono text-zinc-400">
                    Tahmini Süre: {activeLecture.durationLabel}
                  </span>
                </div>
              </div>
            )}

            {/* Quick Timeline Chips under player */}
            <div className="pt-2 border-t border-zinc-800/70">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-400 font-medium">
                  Hızlı Bölüm Atlama:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {activeLecture.timeline.map((seg) => (
                    <button
                      key={seg.id}
                      type="button"
                      onClick={() => handleJumpToTimestamp(seg.timestamp, seg.seconds)}
                      className={`rounded-md border px-2 py-0.5 font-mono text-[11px] transition cursor-pointer ${
                        activeTimestamp === seg.timestamp
                          ? "border-amber-400 bg-amber-500/20 text-amber-200 shadow-sm"
                          : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                      }`}
                    >
                      {seg.timestamp}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Dedicated Synchronized Transcript Column (Right) */}
          {isTranscriptOpen && (
            <div className="lg:col-span-5 xl:col-span-4 flex flex-col bg-[#08080b]">
              {/* Transcript Header (Matching Google Drive / Vids screenshot) */}
              <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-zinc-800/80 bg-zinc-950/90">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-100">Transkript</span>
                  <span className="inline-flex items-center gap-1 rounded bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-400 border border-sky-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
                    Canlı Takip
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    title={
                      autoScrollTranscript
                        ? "Otomatik kaydırmayı durdur"
                        : "Otomatik kaydırmayı aç"
                    }
                    onClick={() => setAutoScrollTranscript((prev) => !prev)}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition cursor-pointer border ${
                      autoScrollTranscript
                        ? "border-sky-500/30 bg-sky-500/15 text-sky-300"
                        : "border-zinc-800 bg-zinc-900 text-zinc-500"
                    }`}
                  >
                    Oto-Kaydır: {autoScrollTranscript ? "Açık" : "Kapalı"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsTranscriptOpen(false)}
                    className="rounded p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                    title="Paneli Kapat"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Search Bar & Filter Tabs */}
              <div className="p-2.5 border-b border-zinc-800/80 bg-zinc-950/40 space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                  <input
                    type="text"
                    value={transcriptSearch}
                    onChange={(e) => setTranscriptSearch(e.target.value)}
                    placeholder="Transkript arayın (tüm kelimeler)..."
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900/90 pl-8 pr-7 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:border-sky-500/50 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
                  />
                  {transcriptSearch && (
                    <button
                      type="button"
                      onClick={() => setTranscriptSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Filter Tabs: Tümü vs Önemli Vurgular */}
                <div className="flex items-center gap-1 border-t border-zinc-800/60 pt-2">
                  <button
                    type="button"
                    onClick={() => setTranscriptTab("all")}
                    className={`flex-1 rounded-md py-1 text-[11px] font-medium transition cursor-pointer text-center ${
                      transcriptTab === "all"
                        ? "bg-zinc-800 text-white font-semibold shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    Tüm Sözler ({transcriptItems.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTranscriptTab("important")}
                    className={`flex-1 rounded-md py-1 text-[11px] font-medium transition cursor-pointer text-center flex items-center justify-center gap-1 ${
                      transcriptTab === "important"
                        ? "bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30 shadow-sm"
                        : "text-zinc-400 hover:text-amber-300"
                    }`}
                  >
                    <Flame className="h-3 w-3 text-amber-400" />
                    <span>Önemli Vurgular ({importantTranscriptCount})</span>
                  </button>
                </div>

                {transcriptSearch && (
                  <div className="px-1 text-[10px] text-zinc-400">
                    {filteredTranscript.length} eşleşme bulundu
                  </div>
                )}
              </div>

              {/* Scrollable Sentence List */}
              <div
                ref={transcriptContainerRef}
                className="flex-1 overflow-y-auto max-h-[440px] p-2 space-y-1 text-xs divide-y divide-zinc-900"
              >
                {filteredTranscript.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500 text-xs">
                    Aranan kritere uygun konuşma bulunamadı.
                  </div>
                ) : (
                  filteredTranscript.map((item, index) => {
                    const isActive = activeTranscriptIndex === index;
                    return (
                      <div
                        key={item.id}
                        id={`transcript-row-${index}`}
                        onClick={() => handleJumpToTranscript(item, index)}
                        className={`group flex items-start gap-2.5 rounded-lg p-2 transition cursor-pointer ${
                          isActive
                            ? item.isImportant
                              ? "bg-amber-950/40 border border-amber-500/50 text-white shadow-[0_0_15px_rgba(251,191,36,0.2)]"
                              : "bg-sky-950/40 border border-sky-500/40 text-white shadow-[0_0_15px_rgba(56,189,248,0.15)]"
                            : item.isImportant
                            ? "bg-zinc-900/40 border-l-2 border-amber-500/60 hover:bg-zinc-900/80 text-zinc-200"
                            : "hover:bg-zinc-900/70 text-zinc-300"
                        }`}
                      >
                        {/* Timestamp Button */}
                        <button
                          type="button"
                          className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold transition cursor-pointer ${
                            isActive
                              ? item.isImportant
                                ? "bg-amber-400 text-zinc-950 font-bold"
                                : "bg-sky-500 text-zinc-950 font-bold"
                              : item.isImportant
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/35 hover:bg-amber-500/30"
                              : "bg-sky-500/15 text-sky-400 hover:bg-sky-500/25 border border-sky-500/30"
                          }`}
                        >
                          {item.timestamp}
                        </button>

                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-xs leading-relaxed ${
                              isActive
                                ? item.isImportant
                                  ? "text-amber-100 font-semibold"
                                  : "text-sky-100 font-medium"
                                : item.isImportant
                                ? "text-zinc-100 font-medium"
                                : "text-zinc-300"
                            }`}
                          >
                            {item.text}
                          </p>

                          {/* Extra Highlighting for Important Sentences */}
                          {item.isImportant ? (
                            <div className="mt-1 flex flex-wrap items-center gap-1">
                              {item.importanceType === "exam_alert" ? (
                                <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-300 border border-amber-500/30">
                                  <Flame className="h-2.5 w-2.5 text-amber-400" />
                                  {item.importanceNote || "Sınav Uyarısı"}
                                </span>
                              ) : item.importanceType === "formula" ? (
                                <span className="inline-flex items-center gap-1 rounded bg-violet-500/15 px-1.5 py-0.5 text-[9px] font-bold text-violet-300 border border-violet-500/30">
                                  <Sigma className="h-2.5 w-2.5 text-violet-400" />
                                  {item.importanceNote || "Kritik Formül"}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300 border border-emerald-500/30">
                                  <Sparkles className="h-2.5 w-2.5 text-emerald-400" />
                                  {item.importanceNote || "Temel Kavram"}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[9px] text-zinc-600 block mt-0.5">
                              Genel konuşma
                            </span>
                          )}
                        </div>

                        {isActive && (
                          <span
                            className={`shrink-0 animate-pulse mt-0.5 ${
                              item.isImportant ? "text-amber-400" : "text-sky-400"
                            }`}
                          >
                            <Volume2 className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
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
              id: "transcript",
              label: `Transkript (${transcriptItems.length})`,
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

      {/* 5. DEDICATED FULL TRANSCRIPT SECTION */}
      {filter === "transcript" && (
        <section className="rounded-2xl border border-zinc-800/90 bg-zinc-900/30 p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-sky-400" />
              <h3 className="text-sm font-bold text-white">
                Tam Ders Transkripti &amp; Konuşma Metni
              </h3>
              <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-sky-300">
                {transcriptItems.length} Cümle
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                const fullText = transcriptItems
                  .map((t) => `[${t.timestamp}] ${t.text}`)
                  .join("\n\n");
                navigator.clipboard?.writeText(fullText);
                setCopiedId("transcript-all");
                setTimeout(() => setCopiedId(null), 1800);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-300 hover:text-white cursor-pointer"
            >
              {copiedId === "transcript-all" ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Kopyalandı</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Tüm Transkripti Kopyala</span>
                </>
              )}
            </button>
          </div>

          <div className="grid gap-2 max-h-[600px] overflow-y-auto pr-2 divide-y divide-zinc-900">
            {transcriptItems.map((item, idx) => {
              const isActive = activeTranscriptIndex === idx;
              return (
                <div
                  key={item.id}
                  onClick={() => handleJumpToTranscript(item, idx)}
                  className={`flex items-start gap-3 rounded-xl border p-3 transition cursor-pointer ${
                    isActive
                      ? item.isImportant
                        ? "border-amber-500/60 bg-amber-950/30 text-white shadow-[0_0_15px_rgba(251,191,36,0.2)]"
                        : "border-sky-500/50 bg-sky-950/30 text-white shadow-[0_0_15px_rgba(56,189,248,0.15)]"
                      : item.isImportant
                      ? "border-amber-500/30 bg-amber-500/[0.04] hover:bg-zinc-900/80 text-zinc-200"
                      : "border-zinc-800/80 bg-[#050507] hover:border-zinc-700 hover:bg-zinc-900/60 text-zinc-300"
                  }`}
                >
                  <button
                    type="button"
                    className={`shrink-0 rounded px-2 py-0.5 font-mono text-xs font-semibold cursor-pointer ${
                      isActive
                        ? item.isImportant
                          ? "bg-amber-400 text-zinc-950 font-bold"
                          : "bg-sky-500 text-zinc-950 font-bold"
                        : item.isImportant
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "bg-sky-500/15 text-sky-400 border border-sky-500/30"
                    }`}
                  >
                    {item.timestamp}
                  </button>
                  <div className="flex-1 space-y-1">
                    <p className={`text-xs sm:text-sm leading-relaxed ${item.isImportant ? "font-medium text-zinc-100" : "text-zinc-300"}`}>
                      {item.text}
                    </p>
                    {item.isImportant ? (
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {item.importanceType === "exam_alert" ? (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                            <Flame className="h-3 w-3 text-amber-400" />
                            {item.importanceNote || "Sınav Uyarısı"}
                          </span>
                        ) : item.importanceType === "formula" ? (
                          <span className="inline-flex items-center gap-1 rounded bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold text-violet-300 border border-violet-500/30">
                            <Sigma className="h-3 w-3 text-violet-400" />
                            {item.importanceNote || "Kritik Formül"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                            <Sparkles className="h-3 w-3 text-emerald-400" />
                            {item.importanceNote || "Temel Kavram"}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-zinc-600 block">
                        Genel konuşma / ders akışı
                      </span>
                    )}
                  </div>
                  {isActive && (
                    <span className={`shrink-0 flex items-center gap-1 text-[11px] font-mono ${item.isImportant ? "text-amber-400" : "text-sky-400"}`}>
                      <Volume2 className="h-4 w-4 animate-pulse" />
                      <span>Oynatılıyor</span>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 6. CONCEPT MAP & PRACTICE QUESTIONS */}
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
