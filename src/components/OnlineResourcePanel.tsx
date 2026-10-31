"use client";

import React, { useRef, useState } from "react";
import {
  Globe,
  Search,
  Plus,
  Check,
  ExternalLink,
  Loader2,
  BookOpen,
  FileUp,
  Trash2,
  Edit3,
  Save,
} from "lucide-react";
import {
  ApiKeysConfig,
  Course,
  CourseResource,
  ExternalToolConfig,
} from "@/types/academic";
import { agentRegistry } from "@/lib/agents/registry";
import { AgentSearchItem } from "@/lib/agents/types";
import { MathMarkdown } from "@/components/MathMarkdown";

export function OnlineResourcePanel({
  course,
  resources,
  apiKeys,
  toolConfigs,
  onAddResource,
  onDeleteResource,
  onUpdateCourseSyllabus,
}: {
  course: Course;
  resources: CourseResource[];
  apiKeys: ApiKeysConfig;
  toolConfigs: ExternalToolConfig[];
  onAddResource: (res: CourseResource) => void;
  onDeleteResource: (id: string) => void;
  onUpdateCourseSyllabus: (newSyllabus: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [discovered, setDiscovered] = useState<AgentSearchItem[]>([]);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});
  const [editingSyllabus, setEditingSyllabus] = useState(false);
  const [syllabusDraft, setSyllabusDraft] = useState(course.syllabus);
  const fileRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setSyllabusDraft(course.syllabus);
    setEditingSyllabus(false);
    setDiscovered([]);
  }, [course.id, course.syllabus]);

  // Extract topic chips from course syllabus lines
  const topicSuggestions = course.syllabus
    .split("\n")
    .map((line) => line.replace(/^\d+\.\s*Hafta:\s*/i, "").trim())
    .filter(Boolean)
    .slice(0, 4);

  const runDiscovery = async (searchTopic?: string) => {
    const q = (searchTopic ?? query).trim();
    if (!q) return;
    setQuery(q);
    setIsSearching(true);
    try {
      const results = await agentRegistry.executeEnabledTools(
        q,
        {
          courseTitle: course.title,
          courseCode: course.code,
          syllabus: course.syllabus,
          apiKeys,
        },
        toolConfigs
      );
      setDiscovered(results);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSaveDiscovered = (item: AgentSearchItem) => {
    const newRes: CourseResource = {
      id: `res-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      courseId: course.id,
      title: item.title,
      source: item.source,
      url: item.url,
      summary: item.summary,
      contentMarkdown: item.contentMarkdown,
      resourceType: item.resourceType,
      createdAt: new Date().toISOString(),
    };
    onAddResource(newRes);
    setAddedIds((p) => ({ ...p, [item.id]: true }));
  };

  const handleLocalNoteUpload = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "").slice(0, 18000);
      onAddResource({
        id: `res-file-${Date.now()}`,
        courseId: course.id,
        title: file.name,
        source: "Yerel Yüklenen Ders Dosyası",
        summary: `${file.name} dosyasından aktarılan ders materyali (${text.length} karakter).`,
        contentMarkdown: text,
        resourceType: "file",
        createdAt: new Date().toISOString(),
      });
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Online Discovery Box */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/35 p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10">
              <Globe className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Online Akademik Kaynak &amp; Soru Seti Tarayıcı
              </h3>
              <p className="text-xs text-zinc-400">
                Aktif Ajanlar:{" "}
                {toolConfigs
                  .filter((t) => t.enabled)
                  .map((t) => t.name.split(" ")[0])
                  .join(", ") || "Yok"}
              </p>
            </div>
          </div>

          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md,.tex,.csv,.json"
              className="hidden"
              onChange={(e) => handleLocalNoteUpload(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:text-white cursor-pointer"
            >
              <FileUp className="h-3.5 w-3.5" />
              <span>Not Dosyası Yükle (.md / .txt / .tex)</span>
            </button>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            runDiscovery();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`${course.title} için konu ara (örn: Euler-Lagrange, Maxwell Dalga Denklemi, Tünelleme)...`}
            className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:border-amber-500/60 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-40 cursor-pointer"
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            <span>Kaynak Çek</span>
          </button>
        </form>

        {/* Syllabus Topic Quick Chips */}
        {topicSuggestions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-zinc-500">Müfredat Önerileri:</span>
            {topicSuggestions.map((topic, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => runDiscovery(topic)}
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[11px] text-zinc-300 hover:border-amber-500/40 hover:text-amber-300 cursor-pointer"
              >
                {topic}
              </button>
            ))}
          </div>
        )}

        {/* Discovered Results */}
        {discovered.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-zinc-800/80">
            <div className="text-xs font-semibold text-amber-300">
              Bulunan Akademik Kaynaklar ({discovered.length}) — Ders Odasına Eklemek İçin Seçin:
            </div>
            {discovered.map((item) => {
              const isAdded = Boolean(addedIds[item.id]);
              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/90 p-4 space-y-2.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-[10px] font-semibold uppercase text-amber-400">
                        {item.source}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-white">
                        {item.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 px-2.5 py-1 text-[11px] text-zinc-400 hover:text-white"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>Kaynağa Git</span>
                        </a>
                      )}
                      <button
                        type="button"
                        disabled={isAdded}
                        onClick={() => handleSaveDiscovered(item)}
                        className={`inline-flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                          isAdded
                            ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                            : "bg-amber-400 text-zinc-950 hover:bg-amber-300"
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Odaya Eklendi</span>
                          </>
                        ) : (
                          <>
                            <Plus className="h-3.5 w-3.5" />
                            <span>Ders Bilgi Bankasına Ekle</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <MathMarkdown content={item.contentMarkdown} />
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Course Syllabus Editor */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/25 p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-zinc-300" />
            <h3 className="text-sm font-bold text-white">
              {course.code} Haftalık Müfredat (AI Eğitmen Kısıt Bağlamı)
            </h3>
          </div>
          {editingSyllabus ? (
            <button
              type="button"
              onClick={() => {
                onUpdateCourseSyllabus(syllabusDraft);
                setEditingSyllabus(false);
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1 text-xs font-bold text-zinc-950 cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Kaydet</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setEditingSyllabus(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-300 hover:text-white cursor-pointer"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Müfredatı Düzenle</span>
            </button>
          )}
        </div>

        {editingSyllabus ? (
          <textarea
            rows={5}
            value={syllabusDraft}
            onChange={(e) => setSyllabusDraft(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 font-mono text-xs text-zinc-200 focus:border-amber-500/60 focus:outline-none"
          />
        ) : (
          <pre className="whitespace-pre-wrap rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-3.5 font-mono text-xs leading-relaxed text-zinc-300">
            {course.syllabus}
          </pre>
        )}
      </section>

      {/* Saved Course Knowledge Base Resources */}
      <section className="space-y-3">
        <h3 className="text-sm font-bold text-white">
          Bu Ders Odasına Kayıtlı Kaynaklar &amp; Notlar ({resources.length})
        </h3>

        {resources.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/20 p-6 text-center text-xs text-zinc-500">
            Henüz bu derse özel harici kaynak eklenmedi. Yukarıdaki akademik
            tarayıcıdan makale veya formül özeti çekebilirsiniz.
          </div>
        ) : (
          <div className="grid gap-3">
            {resources.map((res) => (
              <div
                key={res.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/35 p-4 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-[10px] font-semibold uppercase text-amber-400">
                      {res.source}
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-white">
                      {res.title}
                    </h4>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {res.url && (
                      <a
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-zinc-800 p-1.5 text-zinc-400 hover:text-white"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => onDeleteResource(res.id)}
                      className="rounded-lg border border-zinc-800 p-1.5 text-zinc-500 hover:border-red-500/40 hover:text-red-400 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <MathMarkdown content={res.contentMarkdown} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
