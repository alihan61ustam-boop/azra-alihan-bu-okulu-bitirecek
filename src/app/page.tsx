"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  BookOpen,
  Columns2,
  Globe,
  Heart,
  KeyRound,
  Menu,
  MessageSquareText,
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
  getSupabaseClient,
  loadLocalWorkspace,
  resetLocalWorkspaceToDefaults,
  saveLocalWorkspace,
  syncCourseToSupabase,
  syncLectureToSupabase,
} from "@/lib/hybridStore";
import {
  BUILTIN_GEMINI_KEY,
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
    geminiModel: "gemini-3-flash-preview",
    supabaseUrl: "",
    supabaseAnonKey: "",
    wolframAppId: "",
  });
  const [toolConfigs, setToolConfigs] = useState<ExternalToolConfig[]>([]);

  // Initial client hydration
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
    loadEncryptedApiKeys().then((loaded) => {
      setApiKeys(loaded);
    });
    setHydrated(true);
  }, []);

  // Persist workspace whenever data changes
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
    setCourses((prev) => [...prev, newCourse]);
    setChats((prev) => ({
      ...prev,
      [newCourse.id]: [
        {
          id: `msg-init-${newCourse.id}`,
          courseId: newCourse.id,
          role: "assistant",
          content: `Merhaba Azra! Yeni açtığın **${newCourse.title} (${newCourse.code})** çalışma odasının özel AI eğitmeniyim. İlk ders videonu yükleyebilir veya doğrudan müfredat konularından soru sorabilirsin!`,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
    setActiveCourseId(newCourse.id);
    setActiveLectureId("");

    const sb = getSupabaseClient(apiKeys);
    await syncCourseToSupabase(sb, newCourse);
  };

  const handleDeleteCourse = (courseId: string) => {
    if (courses.length <= 1) return;
    const remaining = courses.filter((c) => c.id !== courseId);
    setCourses(remaining);
    setLectures((prev) => prev.filter((l) => l.courseId !== courseId));
    setResources((prev) => prev.filter((r) => r.courseId !== courseId));
    if (activeCourseId === courseId) {
      handleSelectCourse(remaining[0].id);
    }
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
  };

  const handleAttachMediaToLecture = async (lectureId: string, file: File) => {
    setLectures((prev) =>
      prev.map((l) =>
        l.id === lectureId
          ? {
              ...l,
              mediaBlobKey: `blob-${lectureId}`,
              mediaMimeType: file.type || "video/mp4",
              sourceType: file.type.startsWith("audio") ? "audio" : "video",
            }
          : l
      )
    );
  };

  const handleUpdateLecture = useCallback((updated: Lecture) => {
    setLectures((prev) =>
      prev.map((l) => (l.id === updated.id ? updated : l))
    );
  }, []);

  const handleSaveApiKeys = async (cfg: ApiKeysConfig) => {
    setApiKeys(cfg);
    await saveEncryptedApiKeys(cfg);
  };

  const handleSaveToolConfigs = (tools: ExternalToolConfig[]) => {
    setToolConfigs(tools);
    agentRegistry.saveToolConfigs(tools);
  };

  const handleResetSamples = () => {
    const snap = resetLocalWorkspaceToDefaults();
    setCourses(snap.courses);
    setLectures(snap.lectures);
    setResources(snap.resources);
    setChats(snap.chats);
    setActiveCourseId(snap.courses[0].id);
    setActiveLectureId(snap.lectures[0].id);
    setApiModalOpen(false);
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
                onAddResource={(res) => setResources((prev) => [res, ...prev])}
                onDeleteResource={(id) =>
                  setResources((prev) => prev.filter((r) => r.id !== id))
                }
                onUpdateCourseSyllabus={(newSyllabus) =>
                  setCourses((prev) =>
                    prev.map((c) =>
                      c.id === activeCourse.id
                        ? { ...c, syllabus: newSyllabus }
                        : c
                    )
                  )
                }
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
              onUpdateMessages={(newMsgs) =>
                setChats((prev) => ({
                  ...prev,
                  [activeCourse.id]: newMsgs,
                }))
              }
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
