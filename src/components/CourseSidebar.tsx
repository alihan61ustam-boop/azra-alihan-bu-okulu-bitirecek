"use client";

import React, { useState } from "react";
import {
  Orbit,
  Zap,
  Atom,
  Flame,
  Sigma,
  Waves,
  BookOpen,
  Sparkles,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  KeyRound,
  Heart,
  HelpCircle,
  Trash2,
  X,
  GraduationCap,
} from "lucide-react";
import { Course, CourseIconName, Lecture } from "@/types/academic";

export function renderCourseIcon(
  iconName: CourseIconName,
  className = "h-4 w-4"
) {
  switch (iconName) {
    case "Orbit":
      return <Orbit className={className} />;
    case "Zap":
      return <Zap className={className} />;
    case "Atom":
      return <Atom className={className} />;
    case "Flame":
      return <Flame className={className} />;
    case "Sigma":
      return <Sigma className={className} />;
    case "Waves":
      return <Waves className={className} />;
    case "Sparkles":
      return <Sparkles className={className} />;
    default:
      return <BookOpen className={className} />;
  }
}

const ICON_OPTIONS: { value: CourseIconName; label: string }[] = [
  { value: "Atom", label: "Atom / Kuantum" },
  { value: "Orbit", label: "Yörünge / Mekanik" },
  { value: "Zap", label: "Elektromanyetizma" },
  { value: "Flame", label: "Termodinamik" },
  { value: "Sigma", label: "Matematiksel Fizik" },
  { value: "Waves", label: "Optik & Dalgalar" },
  { value: "BookOpen", label: "Genel Ders" },
];

export function CourseSidebar({
  courses,
  lectures,
  activeCourseId,
  collapsed,
  hasGeminiKey,
  onToggleCollapse,
  onSelectCourse,
  onAddCourse,
  onDeleteCourse,
  onOpenApiSettings,
  onReplaySurprise,
  onReplayTutorial,
}: {
  courses: Course[];
  lectures: Lecture[];
  activeCourseId: string;
  collapsed: boolean;
  hasGeminiKey: boolean;
  onToggleCollapse: () => void;
  onSelectCourse: (courseId: string) => void;
  onAddCourse: (course: Omit<Course, "id" | "createdAt">) => void;
  onDeleteCourse: (courseId: string) => void;
  onOpenApiSettings: () => void;
  onReplaySurprise: () => void;
  onReplayTutorial: () => void;
}) {
  const [showNewModal, setShowNewModal] = useState(false);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [professor, setProfessor] = useState("");
  const [description, setDescription] = useState("");
  const [syllabus, setSyllabus] = useState("");
  const [iconName, setIconName] = useState<CourseIconName>("Sigma");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAddCourse({
      code: code.trim() || "FİZ 300",
      title: title.trim(),
      professor: professor.trim() || "Ders Öğretim Üyesi",
      semester: "2026-2027 Dönemi",
      description:
        description.trim() ||
        `${title.trim()} dersine özel izole çalışma alanı ve yapay zeka bilgi bankası.`,
      syllabus:
        syllabus.trim() ||
        `1. Hafta: Temel Kavramlar\n2. Hafta: Matematiksel Formülasyon\n3. Hafta: Problem Çözümleri ve Vize Hazırlığı`,
      iconName,
    });
    setCode("");
    setTitle("");
    setProfessor("");
    setDescription("");
    setSyllabus("");
    setShowNewModal(false);
  };

  return (
    <>
      <aside
        className={`flex flex-col border-r border-zinc-800/80 bg-[#050507] transition-all duration-200 ${
          collapsed ? "w-16" : "w-72"
        } shrink-0`}
      >
        {/* Brand Header */}
        <div className="flex h-14 items-center justify-between border-b border-zinc-800/80 px-3.5">
          {!collapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10">
                <GraduationCap className="h-4 w-4 text-amber-400" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-xs font-bold tracking-tight text-white">
                  Azra&amp;Alihan
                </div>
                <div className="truncate text-[10px] font-medium text-amber-400/90">
                  Bu Okulu Bitirecek
                </div>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            title={collapsed ? "Menüyü Genişlet" : "Menüyü Daralt"}
            className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800/90 bg-zinc-900/60 text-zinc-400 transition hover:border-zinc-700 hover:text-white cursor-pointer"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Courses Header */}
        <div className="flex items-center justify-between px-3.5 pt-4 pb-2">
          {!collapsed && (
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              İzole Ders Odaları ({courses.length})
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            title="Yeni Ders Ekle"
            className={`flex items-center justify-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/80 text-xs font-medium text-zinc-200 transition hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-300 cursor-pointer ${
              collapsed ? "mx-auto h-9 w-9" : "px-2 py-1"
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            {!collapsed && <span className="text-[11px]">Yeni Ders</span>}
          </button>
        </div>

        {/* Course List */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-2.5 py-1">
          {courses.map((course) => {
            const isActive = course.id === activeCourseId;
            const courseLectures = lectures.filter(
              (l) => l.courseId === course.id
            );
            const alertCount = courseLectures.reduce(
              (acc, l) => acc + l.examAlerts.length,
              0
            );

            return (
              <div key={course.id} className="group relative">
                <button
                  type="button"
                  onClick={() => onSelectCourse(course.id)}
                  title={`${course.code} — ${course.title}`}
                  className={`flex w-full items-center gap-3 rounded-xl border px-2.5 py-2.5 text-left transition cursor-pointer ${
                    isActive
                      ? "border-zinc-700 bg-zinc-900 text-white shadow-sm"
                      : "border-transparent text-zinc-400 hover:border-zinc-800/80 hover:bg-zinc-900/40 hover:text-zinc-200"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                      isActive
                        ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                        : "border-zinc-800 bg-zinc-950 text-zinc-400"
                    }`}
                  >
                    {renderCourseIcon(course.iconName)}
                  </div>

                  {!collapsed && (
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-[10px] font-semibold text-zinc-500">
                          {course.code}
                        </span>
                        {alertCount > 0 && (
                          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] font-medium text-amber-300">
                            {alertCount} sınav
                          </span>
                        )}
                      </div>
                      <div className="truncate text-xs font-semibold">
                        {course.title}
                      </div>
                      <div className="truncate text-[10px] text-zinc-500">
                        {courseLectures.length} ders kaydı
                      </div>
                    </div>
                  )}
                </button>

                {!collapsed && courses.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteCourse(course.id);
                    }}
                    title="Dersi Sil"
                    className="absolute right-2 bottom-2 hidden rounded p-1 text-zinc-600 hover:bg-red-500/10 hover:text-red-400 group-hover:block cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom Actions: Surprise Replay, Tutorial & API Status */}
        <div className="border-t border-zinc-800/80 p-2.5 space-y-1.5">
          <button
            type="button"
            onClick={onReplaySurprise}
            title="Alihan'ın Sürpriz Mesajını Aç"
            className="flex w-full items-center gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/5 px-2.5 py-2 text-xs font-medium text-rose-300 transition hover:border-rose-500/40 hover:bg-rose-500/15 cursor-pointer"
          >
            <Heart className="h-4 w-4 shrink-0 fill-rose-400 text-rose-400 mx-auto sm:mx-0" />
            {!collapsed && <span className="truncate">Alihan&apos;ın Notu</span>}
          </button>

          <button
            type="button"
            onClick={onReplayTutorial}
            title="Mini Rehberi Tekrar Göster"
            className="flex w-full items-center gap-2.5 rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-2.5 py-2 text-xs text-zinc-300 transition hover:border-zinc-700 hover:text-white cursor-pointer"
          >
            <HelpCircle className="h-4 w-4 shrink-0 text-zinc-400 mx-auto sm:mx-0" />
            {!collapsed && <span className="truncate">Özellik Rehberi</span>}
          </button>

          <button
            type="button"
            onClick={onOpenApiSettings}
            title="Gemini API ve Akademik Araç Ayarları"
            className="flex w-full items-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-2.5 text-left transition hover:border-zinc-700 cursor-pointer"
          >
            <div className="relative mx-auto sm:mx-0">
              <KeyRound className="h-4 w-4 text-zinc-300" />
              <span
                className={`absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ${
                  hasGeminiKey ? "bg-emerald-400" : "bg-amber-400 animate-pulse"
                }`}
              />
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold text-zinc-100">
                  API &amp; Araç Merkezi
                </div>
                <div className="truncate text-[10px] text-zinc-400">
                  {hasGeminiKey
                    ? "Gemini Anahtarı Hazır"
                    : "Gemini Anahtarı Ekle"}
                </div>
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* New Course Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <h3 className="text-sm font-bold text-white">
                Yeni İzole Ders Çalışma Odası Oluştur
              </h3>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-900 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-zinc-400">
                    Ders Kodu
                  </label>
                  <input
                    type="text"
                    placeholder="FİZ 305"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-xs text-white focus:border-amber-500/60 focus:outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-[11px] font-medium text-zinc-400">
                    Ders Adı *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Optik ve Dalgalar"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-amber-500/60 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-zinc-400">
                    Öğretim Üyesi
                  </label>
                  <input
                    type="text"
                    placeholder="Prof. Dr. ..."
                    value={professor}
                    onChange={(e) => setProfessor(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-amber-500/60 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-zinc-400">
                    Simge
                  </label>
                  <select
                    value={iconName}
                    onChange={(e) =>
                      setIconName(e.target.value as CourseIconName)
                    }
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-amber-500/60 focus:outline-none"
                  >
                    {ICON_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-zinc-400">
                  Kısa Açıklama
                </label>
                <input
                  type="text"
                  placeholder="Dersin kapsamı..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-amber-500/60 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-zinc-400">
                  Haftalık Müfredat / Konular (AI Eğitmen Bağlamı)
                </label>
                <textarea
                  rows={3}
                  placeholder="1. Hafta: Girişim ve Kırınım&#10;2. Hafta: Fresnel Denklemleri..."
                  value={syllabus}
                  onChange={(e) => setSyllabus(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-amber-500/60 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="rounded-xl border border-zinc-800 px-4 py-2 text-xs text-zinc-400 hover:text-white cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 cursor-pointer"
                >
                  Ders Odasını Aç
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
