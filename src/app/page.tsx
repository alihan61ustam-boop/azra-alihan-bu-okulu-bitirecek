"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Check,
  Cloud,
  Columns2,
  Copy,
  Database,
  ExternalLink,
  Globe,
  Heart,
  KeyRound,
  Loader2,
  Menu,
  MessageSquareText,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";
import {
  ApiKeysConfig,
  ChatMessage,
  Course,
  CourseResource,
  ExternalToolConfig,
  Lecture,
} from "@/types/academic";
import {
  INITIAL_CHATS,
  INITIAL_COURSES,
  INITIAL_LECTURES,
  INITIAL_RESOURCES,
} from "@/lib/seedData";
import {
  clearCourseChatInSupabase,
  deleteCourseFromSupabase,
  deleteLectureFromSupabase,
  deleteResourceFromSupabase,
  fetchWorkspaceFromSupabase,
  getSupabaseClient,
  loadLocalWorkspace,
  pushEntireWorkspaceToSupabase,
  resetLocalWorkspaceToDefaults,
  saveLocalWorkspace,
  SUPABASE_QUICK_SETUP_SQL,
  syncChatMessageToSupabase,
  syncCourseToSupabase,
  syncLectureToSupabase,
  syncResourceToSupabase,
} from "@/lib/hybridStore";
import {
  BUILTIN_GEMINI_KEY,
  BUILTIN_SUPABASE_ANON_KEY,
  BUILTIN_SUPABASE_URL,
  loadEncryptedApiKeys,
  saveEncryptedApiKeys,
} from "@/lib/cryptoStorage";
import { agentRegistry } from "@/lib/agents/registry";
import { deleteMediaBlob } from "@/lib/mediaDb";
import { WelcomeSurpriseFlow } from "@/components/WelcomeSurpriseFlow";
import { CourseSidebar, renderCourseIcon } from "@/components/CourseSidebar";
import { LectureNoteViewer } from "@/components/LectureNoteViewer";
import { CourseChatPanel } from "@/components/CourseChatPanel";
import { OnlineResourcePanel } from "@/components/OnlineResourcePanel";
import { LectureProcessorModal } from "@/components/LectureProcessorModal";
import { ApiRegistryModal } from "@/components/ApiRegistryModal";

type ActiveTab = "notes" | "resources" | "chat";

export default function HomePage() {
  // Surprise pop-up opens automatically on EVERY entry / page reload as requested
  const [surpriseOpen, setSurpriseOpen] = useState(true);
  const [surpriseStep, setSurpriseStep] = useState<
    "question" | "thanks" | "tutorial"
  >("question");

  // Workspace Data State
  const [hydrated, setHydrated] = useState(false);
  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES);
  const [lectures, setLectures] = useState<Lecture[]>(INITIAL_LECTURES);
  const [resources, setResources] =
    useState<CourseResource[]>(INITIAL_RESOURCES);
  const [chats, setChats] =
    useState<Record<string, ChatMessage[]>>(INITIAL_CHATS);

  // Cloud Sync State
  const [cloudStatus, setCloudStatus] = useState<
    "syncing" | "connected" | "needs_schema" | "offline"
  >("syncing");
  const [sqlCopied, setSqlCopied] = useState(false);
  const [pushingSchemaSync, setPushingSchemaSync] = useState(false);

  // Active Navigation State
  const [activeCourseId, setActiveCourseId] = useState<string>(
    INITIAL_COURSES[0].id
  );
  const [activeLectureId, setActiveLectureId] = useState<string>(
    INITIAL_LECTURES[0].id
  );
  const [activeTab, setActiveTab] = useState<ActiveTab>("notes");
  const [splitView, setSplitView] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modals & Cross-Component Triggers
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [apiModalOpen, setApiModalOpen] = useState(false);
  const [tutorTriggerPrompt, setTutorTriggerPrompt] = useState<string | null>(
    null
  );

  // API & Agency Tool Configs
  const [apiKeys, setApiKeys] = useState<ApiKeysConfig>({
    geminiApiKey: BUILTIN_GEMINI_KEY,
    geminiModel: "gemini-3.5-flash-lite",
    supabaseUrl: BUILTIN_SUPABASE_URL,
    supabaseAnonKey: BUILTIN_SUPABASE_ANON_KEY,
    wolframAppId: "",
  });
  const [toolConfigs, setToolConfigs] = useState<ExternalToolConfig[]>([]);

  const realtimeChannelRef = useRef< ReturnType<NonNullable<ReturnType<typeof getSupabaseClient>>["channel"]> | null >(null);

  const broadcastWorkspaceChange = useCallback(() => {
    try {
      realtimeChannelRef.current?.send({
        type: "broadcast",
        event: "workspace_updated",
        payload: { ts: Date.now() },
      });
    } catch {
      // ignore
    }
  }, []);

  const syncFromCloud = useCallback(
    async (keysOverride?: ApiKeysConfig) => {
      const sb = getSupabaseClient(keysOverride || apiKeys);
      const localSnap = loadLocalWorkspace();
      const res = await fetchWorkspaceFromSupabase(sb, localSnap);
      setCloudStatus(res.status);
      if (res.status === "connected") {
        setCourses(res.snapshot.courses);
        setLectures(res.snapshot.lectures);
        setResources(res.snapshot.resources);
        setChats(res.snapshot.chats);
      }
      return res.status;
    },
    [apiKeys]
  );

  // Initial client hydration + Supabase cloud fetch
  useEffect(() => {
    const snap = loadLocalWorkspace();
    setCourses(snap.courses);
    setLectures(snap.lectures);
    setResources(snap.resources);
    setChats(snap.chats);
    if (snap.courses.length > 0) {
      const firstCourseId = snap.courses[0].id;
      setActiveCourseId(firstCourseId);
      const firstLec = snap.lectures.find((l) => l.courseId === firstCourseId);
      if (firstLec) setActiveLectureId(firstLec.id);
    }

    setToolConfigs(agentRegistry.loadSavedToolConfigs());
    loadEncryptedApiKeys().then(async (loaded) => {
      setApiKeys(loaded);
      const sb = getSupabaseClient(loaded);
      const res = await fetchWorkspaceFromSupabase(sb, snap);
      setCloudStatus(res.status);
      if (res.status === "connected") {
        setCourses(res.snapshot.courses);
        setLectures(res.snapshot.lectures);
        setResources(res.snapshot.resources);
        setChats(res.snapshot.chats);
      }
    });
    setHydrated(true);
  }, []);

  // Realtime subscription + periodic cloud sync across different IPs/devices
  useEffect(() => {
    if (!hydrated) return;
    const sb = getSupabaseClient(apiKeys);
    if (!sb) return;

    const channel = sb
      .channel("azra-alihan-shared-db")
      .on("broadcast", { event: "workspace_updated" }, () => {
        syncFromCloud();
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public" },
        () => {
          syncFromCloud();
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    const interval = setInterval(() => {
      syncFromCloud();
    }, 15000);

    return () => {
      clearInterval(interval);
      sb.removeChannel(channel);
      realtimeChannelRef.current = null;
    };
  }, [hydrated, apiKeys, syncFromCloud]);

  // Persist workspace locally whenever data changes
  useEffect(() => {
    if (!hydrated) return;
    saveLocalWorkspace({ courses, lectures, resources, chats });
  }, [courses, lectures, resources, chats, hydrated]);

  const activeCourse =
    courses.find((c) => c.id === activeCourseId) || courses[0];
  const courseLectures = lectures.filter(
    (l) => l.courseId === activeCourse.id
  );
  const courseResources = resources.filter(
    (r) => r.courseId === activeCourse.id
  );
  const courseMessages = chats[activeCourse.id] || [
    {
      id: `welcome-${activeCourse.id}`,
      courseId: activeCourse.id,
      role: "assistant",
      content: `Merhaba Azra! **${activeCourse.title} (${activeCourse.code})** izole çalışma odasındasın. Bu derse ait formüller, sınav uyarıları ve konular hakkında istediğini sorabilirsin.`,
      createdAt: new Date().toISOString(),
    },
  ];

  const handleSelectCourse = (courseId: string) => {
    setActiveCourseId(courseId);
    const firstLec = lectures.find((l) => l.courseId === courseId);
    setActiveLectureId(firstLec ? firstLec.id : "");
    setMobileMenuOpen(false);
  };

  const handleAddCourse = async (data: Omit<Course, "id" | "createdAt">) => {
    const newCourse: Course = {
      ...data,
      id: `course-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const initMsg: ChatMessage = {
      id: `msg-init-${newCourse.id}`,
      courseId: newCourse.id,
      role: "assistant",
      content: `Merhaba Azra! Yeni açtığın **${newCourse.title} (${newCourse.code})** çalışma odasının özel AI eğitmeniyim. İlk ders videonu yükleyebilir veya doğrudan müfredat konularından soru sorabilirsin!`,
      createdAt: new Date().toISOString(),
    };

    setCourses((prev) => [...prev, newCourse]);
    setChats((prev) => ({
      ...prev,
      [newCourse.id]: [initMsg],
    }));
    setActiveCourseId(newCourse.id);
    setActiveLectureId("");

    const sb = getSupabaseClient(apiKeys);
    await syncCourseToSupabase(sb, newCourse);
    await syncChatMessageToSupabase(sb, initMsg);
    broadcastWorkspaceChange();
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (courses.length <= 1) return;
    const remaining = courses.filter((c) => c.id !== courseId);
    setCourses(remaining);
    setLectures((prev) => prev.filter((l) => l.courseId !== courseId));
    setResources((prev) => prev.filter((r) => r.courseId !== courseId));
    if (activeCourseId === courseId) {
      handleSelectCourse(remaining[0].id);
    }
    const sb = getSupabaseClient(apiKeys);
    await deleteCourseFromSupabase(sb, courseId);
    broadcastWorkspaceChange();
  };

  const handleLectureCreated = async (newLecture: Lecture, rawFile?: File) => {
    const sb = getSupabaseClient(apiKeys);
    const cloudUrl = await syncLectureToSupabase(sb, newLecture, rawFile);
    const finalized: Lecture = cloudUrl
      ? { ...newLecture, mediaUrl: cloudUrl }
      : newLecture;

    setLectures((prev) => [finalized, ...prev]);
    setActiveLectureId(finalized.id);
    setActiveTab("notes");
    broadcastWorkspaceChange();
  };

  const handleDeleteLecture = async (lectureId: string) => {
    const target = lectures.find((l) => l.id === lectureId);
    if (target?.mediaBlobKey) {
      await deleteMediaBlob(target.mediaBlobKey);
    }
    const next = lectures.filter((l) => l.id !== lectureId);
    setLectures(next);
    const nextForCourse = next.filter((l) => l.courseId === activeCourse.id);
    setActiveLectureId(nextForCourse[0]?.id || "");

    const sb = getSupabaseClient(apiKeys);
    await deleteLectureFromSupabase(sb, lectureId);
    broadcastWorkspaceChange();
  };

  const handleAttachMediaToLecture = async (lectureId: string, file: File) => {
    let targetLecture: Lecture | undefined;
    setLectures((prev) =>
      prev.map((l) => {
        if (l.id === lectureId) {
          targetLecture = {
            ...l,
            mediaBlobKey: `blob-${lectureId}`,
            mediaMimeType: file.type || "video/mp4",
            sourceType: file.type.startsWith("audio") ? "audio" : "video",
          };
          return targetLecture;
        }
        return l;
      })
    );

    if (targetLecture) {
      const sb = getSupabaseClient(apiKeys);
      const cloudUrl = await syncLectureToSupabase(sb, targetLecture, file);
      if (cloudUrl) {
        setLectures((prev) =>
          prev.map((l) =>
            l.id === lectureId ? { ...l, mediaUrl: cloudUrl } : l
          )
        );
      }
      broadcastWorkspaceChange();
    }
  };

  const handleUpdateLecture = useCallback(
    async (updated: Lecture, file?: File) => {
      setLectures((prev) =>
        prev.map((l) => (l.id === updated.id ? updated : l))
      );
      const sb = getSupabaseClient(apiKeys);
      const cloudUrl = await syncLectureToSupabase(sb, updated, file);
      if (cloudUrl && cloudUrl !== updated.mediaUrl) {
        setLectures((prev) =>
          prev.map((l) =>
            l.id === updated.id ? { ...l, mediaUrl: cloudUrl } : l
          )
        );
      }
      broadcastWorkspaceChange();
    },
    [apiKeys, broadcastWorkspaceChange]
  );

  const handleSaveApiKeys = async (cfg: ApiKeysConfig) => {
    setApiKeys(cfg);
    await saveEncryptedApiKeys(cfg);
    await syncFromCloud(cfg);
  };

  const handleSaveToolConfigs = (tools: ExternalToolConfig[]) => {
    setToolConfigs(tools);
    agentRegistry.saveToolConfigs(tools);
  };

  const handleResetSamples = async () => {
    const snap = resetLocalWorkspaceToDefaults();
    setCourses(snap.courses);
    setLectures(snap.lectures);
    setResources(snap.resources);
    setChats(snap.chats);
    setActiveCourseId(snap.courses[0].id);
    setActiveLectureId(snap.lectures[0].id);
    setApiModalOpen(false);
    const sb = getSupabaseClient(apiKeys);
    await pushEntireWorkspaceToSupabase(sb, snap);
    broadcastWorkspaceChange();
  };

  const handleCopySqlAndOpenDashboard = () => {
    navigator.clipboard?.writeText(SUPABASE_QUICK_SETUP_SQL);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 4000);
    window.open(
      "https://supabase.com/dashboard/project/yfblbiqrstnedcnqnxfw/sql/new",
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleCompleteSchemaAndPush = async () => {
    setPushingSchemaSync(true);
    try {
      const sb = getSupabaseClient(apiKeys);
      await pushEntireWorkspaceToSupabase(sb, {
        courses,
        lectures,
        resources,
        chats,
      });
      await syncFromCloud();
      broadcastWorkspaceChange();
    } finally {
      setPushingSchemaSync(false);
    }
  };

  const handleAskTutorFromNotes = useCallback(
    (promptText: string) => {
      setTutorTriggerPrompt(promptText);
      if (!splitView) {
        setActiveTab("chat");
      }
    },
    [splitView]
  );

  const hasGeminiKey = Boolean(apiKeys.geminiApiKey?.trim());

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#09090b] text-zinc-100">
      {/* Opening Romantic Surprise Pop-up & 5-Step Mini Tutorial */}
      <WelcomeSurpriseFlow
        isOpen={surpriseOpen}
        initialStep={surpriseStep}
        onComplete={() => setSurpriseOpen(false)}
      />

      {/* Desktop Left Sidebar */}
      <div className="hidden md:flex">
        <CourseSidebar
          courses={courses}
          lectures={lectures}
          activeCourseId={activeCourse.id}
          collapsed={sidebarCollapsed}
          hasGeminiKey={hasGeminiKey}
          onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
          onSelectCourse={handleSelectCourse}
          onAddCourse={handleAddCourse}
          onDeleteCourse={handleDeleteCourse}
          onOpenApiSettings={() => setApiModalOpen(true)}
          onReplaySurprise={() => {
            setSurpriseStep("question");
            setSurpriseOpen(true);
          }}
          onReplayTutorial={() => {
            setSurpriseStep("tutorial");
            setSurpriseOpen(true);
          }}
        />
      </div>

      {/* Mobile Drawer Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 flex h-full">
            <CourseSidebar
              courses={courses}
              lectures={lectures}
              activeCourseId={activeCourse.id}
              collapsed={false}
              hasGeminiKey={hasGeminiKey}
              onToggleCollapse={() => setMobileMenuOpen(false)}
              onSelectCourse={handleSelectCourse}
              onAddCourse={handleAddCourse}
              onDeleteCourse={handleDeleteCourse}
              onOpenApiSettings={() => {
                setMobileMenuOpen(false);
                setApiModalOpen(true);
              }}
              onReplaySurprise={() => {
                setMobileMenuOpen(false);
                setSurpriseStep("question");
                setSurpriseOpen(true);
              }}
              onReplayTutorial={() => {
                setMobileMenuOpen(false);
                setSurpriseStep("tutorial");
                setSurpriseOpen(true);
              }}
            />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="m-3 h-9 w-9 flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Workspace Header */}
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 bg-[#050507] px-3 sm:px-5 py-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 md:hidden cursor-pointer"
            >
              <Menu className="h-4 w-4" />
            </button>

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300">
              {renderCourseIcon(activeCourse.iconName)}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="rounded bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                  {activeCourse.code}
                </span>
                <h1 className="truncate text-sm sm:text-base font-bold text-white">
                  {activeCourse.title}
                </h1>
              </div>
              <p className="truncate text-[11px] text-zinc-400">
                {activeCourse.professor} • {activeCourse.description}
              </p>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2">
            {/* Supabase Shared Cloud Status Badge */}
            <button
              type="button"
              onClick={() => syncFromCloud()}
              title="Farklı IP ve cihazlarla ortak Supabase veritabanını şimdi senkronize et"
              className={`hidden sm:inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold transition cursor-pointer ${
                cloudStatus === "connected"
                  ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                  : cloudStatus === "needs_schema"
                  ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                  : "border-zinc-800 bg-zinc-900 text-zinc-400"
              }`}
            >
              <Cloud className="h-3.5 w-3.5" />
              <span>
                {cloudStatus === "connected"
                  ? "Ortak DB Aktif"
                  : cloudStatus === "needs_schema"
                  ? "Tablo Kurulumu Bekliyor"
                  : "Bulut Senkron"}
              </span>
            </button>

            {/* Workspace Tabs */}
            <div className="flex items-center rounded-xl border border-zinc-800 bg-zinc-900/70 p-0.5">
              <button
                type="button"
                onClick={() => setActiveTab("notes")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                  activeTab === "notes"
                    ? "bg-zinc-100 text-zinc-950 font-semibold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Ders Notları</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("resources")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                  activeTab === "resources"
                    ? "bg-zinc-100 text-zinc-950 font-semibold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Globe className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Online Kaynak Çek</span>
                <span className="sm:hidden">Kaynak</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("chat")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition lg:hidden cursor-pointer ${
                  activeTab === "chat"
                    ? "bg-zinc-100 text-zinc-950 font-semibold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <MessageSquareText className="h-3.5 w-3.5" />
                <span>AI Eğitmen</span>
              </button>
            </div>

            {/* Split-View Toggle (Desktop) */}
            <button
              type="button"
              onClick={() => setSplitView((p) => !p)}
              title="Bölünmüş Ekran (Sol: Notlar, Sağ: Derse Özel AI Sohbet)"
              className={`hidden lg:inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition cursor-pointer ${
                splitView
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                  : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
              }`}
            >
              <Columns2 className="h-3.5 w-3.5" />
              <span>Bölünmüş Ekran</span>
            </button>

            {/* Quick Video Upload */}
            <button
              type="button"
              onClick={() => setUploadModalOpen(true)}
              title="Yeni Ders Videosu / Ses Kaydı Yükle"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-200 hover:border-zinc-700 hover:text-white cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5 text-amber-400" />
              <span>Ders Yükle</span>
            </button>

            {/* Surprise Quick Button */}
            <button
              type="button"
              onClick={() => {
                setSurpriseStep("question");
                setSurpriseOpen(true);
              }}
              title="Alihan'ın Sürpriz Mesajını Aç"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 cursor-pointer"
            >
              <Heart className="h-4 w-4 fill-rose-400 text-rose-400" />
            </button>

            {/* API Key Quick Button */}
            <button
              type="button"
              onClick={() => setApiModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-200 hover:border-zinc-700 hover:text-white cursor-pointer"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  hasGeminiKey ? "bg-emerald-400" : "bg-amber-400 animate-pulse"
                }`}
              />
              <KeyRound className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">API &amp; Araçlar</span>
            </button>
          </div>
        </header>

        {/* 1-Click Supabase Table Setup Banner (Only shown if tables haven't been created in yfblbiqrstnedcnqnxfw yet) */}
        {cloudStatus === "needs_schema" && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-100">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 shrink-0 text-amber-400" />
              <span>
                <strong>Supabase Bağlantısı Hazır (`yfblbiqrstnedcnqnxfw`):</strong>{" "}
                Farklı IP&apos;lerin aynı tabloları görmesi için SQL kurulum kodunu Supabase SQL Editor&apos;e yapıştırıp <strong>Run</strong> tuşuna basın:
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopySqlAndOpenDashboard}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-zinc-950 hover:bg-amber-300 cursor-pointer transition"
              >
                {sqlCopied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>SQL Kopyalandı! (SQL Editor Açıldı)</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>1. SQL Kopyala &amp; Supabase SQL Editor&apos;ü Aç</span>
                    <ExternalLink className="h-3 w-3" />
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={pushingSchemaSync}
                onClick={handleCompleteSchemaAndPush}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/50 bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-50 cursor-pointer transition"
              >
                {pushingSchemaSync ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                <span>2. Run Yaptım, Şimdi Bağlan &amp; Verileri Aktar</span>
              </button>
            </div>
          </div>
        )}

        {/* Split-View / Tabbed Body */}
        <main className="flex min-h-0 flex-1 overflow-hidden">
          {/* Left / Main Pane */}
          <div
            className={`min-w-0 flex-1 overflow-y-auto ${
              activeTab === "chat" ? "hidden lg:block" : "block"
            }`}
          >
            {activeTab === "resources" ? (
              <OnlineResourcePanel
                course={activeCourse}
                resources={courseResources}
                apiKeys={apiKeys}
                toolConfigs={toolConfigs}
                onAddResource={async (res) => {
                  setResources((prev) => [res, ...prev]);
                  const sb = getSupabaseClient(apiKeys);
                  await syncResourceToSupabase(sb, res);
                  broadcastWorkspaceChange();
                }}
                onDeleteResource={async (id) => {
                  setResources((prev) => prev.filter((r) => r.id !== id));
                  const sb = getSupabaseClient(apiKeys);
                  await deleteResourceFromSupabase(sb, id);
                  broadcastWorkspaceChange();
                }}
                onUpdateCourseSyllabus={async (newSyllabus) => {
                  let updatedCourse: Course | undefined;
                  setCourses((prev) =>
                    prev.map((c) => {
                      if (c.id === activeCourse.id) {
                        updatedCourse = { ...c, syllabus: newSyllabus };
                        return updatedCourse;
                      }
                      return c;
                    })
                  );
                  if (updatedCourse) {
                    const sb = getSupabaseClient(apiKeys);
                    await syncCourseToSupabase(sb, updatedCourse);
                    broadcastWorkspaceChange();
                  }
                }}
              />
            ) : (
              <LectureNoteViewer
                course={activeCourse}
                lectures={courseLectures}
                activeLectureId={activeLectureId}
                apiKeys={apiKeys}
                onSelectLecture={setActiveLectureId}
                onOpenUploadModal={() => setUploadModalOpen(true)}
                onDeleteLecture={handleDeleteLecture}
                onAskTutor={handleAskTutorFromNotes}
                onAttachMedia={handleAttachMediaToLecture}
                onUpdateLecture={handleUpdateLecture}
              />
            )}
          </div>

          {/* Right Pane: Isolated Course AI Tutor (Desktop Split-View OR Mobile Chat Tab) */}
          <div
            className={`${
              activeTab === "chat"
                ? "flex w-full lg:w-[410px] xl:w-[450px]"
                : splitView
                ? "hidden lg:flex lg:w-[410px] xl:w-[450px]"
                : "hidden"
            } shrink-0 border-l border-zinc-800/80 flex-col`}
          >
            <CourseChatPanel
              course={activeCourse}
              lectures={courseLectures}
              resources={courseResources}
              messages={courseMessages}
              apiKeys={apiKeys}
              externalTriggerPrompt={tutorTriggerPrompt}
              onClearExternalTrigger={() => setTutorTriggerPrompt(null)}
              onUpdateMessages={async (newMsgs) => {
                setChats((prev) => ({
                  ...prev,
                  [activeCourse.id]: newMsgs,
                }));
                const sb = getSupabaseClient(apiKeys);
                if (newMsgs.length <= 1) {
                  await clearCourseChatInSupabase(sb, activeCourse.id);
                }
                const lastMsg = newMsgs[newMsgs.length - 1];
                if (lastMsg && !lastMsg.content.endsWith("...")) {
                  await syncChatMessageToSupabase(sb, lastMsg);
                  broadcastWorkspaceChange();
                }
              }}
              onOpenApiSettings={() => setApiModalOpen(true)}
            />
          </div>
        </main>
      </div>

      {/* Multimodal Lecture Upload & Processing Modal */}
      <LectureProcessorModal
        isOpen={uploadModalOpen}
        course={activeCourse}
        apiKeys={apiKeys}
        onClose={() => setUploadModalOpen(false)}
        onOpenApiSettings={() => setApiModalOpen(true)}
        onLectureCreated={handleLectureCreated}
      />

      {/* Unified API Key & Agency Tool Registry Modal */}
      <ApiRegistryModal
        isOpen={apiModalOpen}
        apiKeys={apiKeys}
        toolConfigs={toolConfigs}
        onClose={() => setApiModalOpen(false)}
        onSaveApiKeys={handleSaveApiKeys}
        onSaveToolConfigs={handleSaveToolConfigs}
        onResetSampleData={handleResetSamples}
      />
    </div>
  );
}
