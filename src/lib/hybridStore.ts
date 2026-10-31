import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  Course,
  Lecture,
  CourseResource,
  ChatMessage,
  ApiKeysConfig,
  TranscriptItem,
} from "@/types/academic";
import {
  INITIAL_COURSES,
  INITIAL_LECTURES,
  INITIAL_RESOURCES,
  INITIAL_CHATS,
} from "@/lib/seedData";
import { repairLectureIfNeeded } from "@/lib/emtLectureData";
import {
  BUILTIN_SUPABASE_ANON_KEY,
  BUILTIN_SUPABASE_URL,
} from "@/lib/cryptoStorage";

const LS_KEYS = {
  courses: "azra_alihan_courses_v1",
  lectures: "azra_alihan_lectures_v1",
  resources: "azra_alihan_resources_v1",
  chats: "azra_alihan_chats_v1",
};

export const SUPABASE_QUICK_SETUP_SQL = `-- Azra&Alihan Bu Okulu Bitirecek — Ortak Veritabanı Kurulumu
create extension if not exists "uuid-ossp";

create table if not exists public.courses (
  id text primary key,
  code text not null,
  title text not null,
  professor text not null default '',
  semester text not null default 'Güz Dönemi',
  description text not null default '',
  syllabus text not null default '',
  icon_name text not null default 'Atom',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lectures (
  id text primary key,
  course_id text not null references public.courses(id) on delete cascade,
  title text not null,
  recorded_date text not null default '',
  source_type text not null default 'video',
  media_url text,
  media_mime_type text,
  duration_label text not null default '45:00',
  executive_summary text not null default '',
  timeline jsonb not null default '[]'::jsonb,
  whiteboard_extractions jsonb not null default '[]'::jsonb,
  exam_alerts jsonb not null default '[]'::jsonb,
  concept_map jsonb not null default '[]'::jsonb,
  practice_questions jsonb not null default '[]'::jsonb,
  transcript jsonb not null default '[]'::jsonb,
  is_real_audio_transcript boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.lectures add column if not exists transcript jsonb not null default '[]'::jsonb;
alter table public.lectures add column if not exists is_real_audio_transcript boolean not null default false;

create table if not exists public.course_resources (
  id text primary key,
  course_id text not null references public.courses(id) on delete cascade,
  title text not null,
  source text not null default 'Akademik Kaynak',
  url text,
  summary text not null default '',
  content_markdown text not null default '',
  resource_type text not null default 'paper',
  created_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id text primary key,
  course_id text not null references public.courses(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  attachment_name text,
  created_at timestamptz not null default now()
);

alter table public.courses enable row level security;
alter table public.lectures enable row level security;
alter table public.course_resources enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "Allow workspace access courses" on public.courses;
create policy "Allow workspace access courses" on public.courses for all using (true) with check (true);

drop policy if exists "Allow workspace access lectures" on public.lectures;
create policy "Allow workspace access lectures" on public.lectures for all using (true) with check (true);

drop policy if exists "Allow workspace access resources" on public.course_resources;
create policy "Allow workspace access resources" on public.course_resources for all using (true) with check (true);

drop policy if exists "Allow workspace access chat" on public.chat_messages;
create policy "Allow workspace access chat" on public.chat_messages for all using (true) with check (true);

insert into storage.buckets (id, name, public)
values ('course-assets', 'course-assets', true)
on conflict (id) do nothing;

drop policy if exists "Public read course-assets" on storage.objects;
create policy "Public read course-assets" on storage.objects for select using (bucket_id = 'course-assets');

drop policy if exists "Public upload course-assets" on storage.objects;
create policy "Public upload course-assets" on storage.objects for insert with check (bucket_id = 'course-assets');

drop policy if exists "Public update course-assets" on storage.objects;
create policy "Public update course-assets" on storage.objects for update using (bucket_id = 'course-assets');

drop policy if exists "Public delete course-assets" on storage.objects;
create policy "Public delete course-assets" on storage.objects for delete using (bucket_id = 'course-assets');`;

export interface WorkspaceSnapshot {
  courses: Course[];
  lectures: Lecture[];
  resources: CourseResource[];
  chats: Record<string, ChatMessage[]>;
}

let cachedClient: SupabaseClient | null = null;
let cachedClientKey = "";

export function getSupabaseClient(
  keys?: Partial<Pick<ApiKeysConfig, "supabaseUrl" | "supabaseAnonKey">>
): SupabaseClient | null {
  const url = (keys?.supabaseUrl?.trim() || BUILTIN_SUPABASE_URL).trim();
  const anon = (
    keys?.supabaseAnonKey?.trim() || BUILTIN_SUPABASE_ANON_KEY
  ).trim();
  if (!url || !anon || !url.startsWith("http")) return null;
  const cacheId = `${url}::${anon}`;
  if (cachedClient && cachedClientKey === cacheId) {
    return cachedClient;
  }
  try {
    cachedClient = createClient(url, anon);
    cachedClientKey = cacheId;
    return cachedClient;
  } catch {
    return null;
  }
}

export function loadLocalWorkspace(): WorkspaceSnapshot {
  if (typeof window === "undefined") {
    return {
      courses: INITIAL_COURSES,
      lectures: INITIAL_LECTURES.map((l) => repairLectureIfNeeded(l).lecture),
      resources: INITIAL_RESOURCES,
      chats: INITIAL_CHATS,
    };
  }

  try {
    const rawCourses = localStorage.getItem(LS_KEYS.courses);
    const rawLectures = localStorage.getItem(LS_KEYS.lectures);
    const rawResources = localStorage.getItem(LS_KEYS.resources);
    const rawChats = localStorage.getItem(LS_KEYS.chats);

    const courses: Course[] = rawCourses
      ? JSON.parse(rawCourses)
      : INITIAL_COURSES;
    const baseLectures: Lecture[] = rawLectures
      ? JSON.parse(rawLectures)
      : INITIAL_LECTURES;

    let anyRepaired = false;
    const lectures: Lecture[] = baseLectures.map((lec) => {
      const { lecture, repaired } = repairLectureIfNeeded(lec);
      if (repaired) anyRepaired = true;
      return lecture;
    });

    for (const rawSeed of INITIAL_LECTURES) {
      const seedLec = repairLectureIfNeeded(rawSeed).lecture;
      const existingIdx = lectures.findIndex((l) => l.id === seedLec.id);
      if (existingIdx === -1) {
        lectures.push(seedLec);
        anyRepaired = true;
      }
    }

    const resources: CourseResource[] = rawResources
      ? JSON.parse(rawResources)
      : INITIAL_RESOURCES;
    const chats: Record<string, ChatMessage[]> = rawChats
      ? JSON.parse(rawChats)
      : INITIAL_CHATS;

    if (!rawCourses || anyRepaired || lectures.length > baseLectures.length) {
      saveLocalWorkspace({ courses, lectures, resources, chats });
    }

    return { courses, lectures, resources, chats };
  } catch {
    return {
      courses: INITIAL_COURSES,
      lectures: INITIAL_LECTURES.map((l) => repairLectureIfNeeded(l).lecture),
      resources: INITIAL_RESOURCES,
      chats: INITIAL_CHATS,
    };
  }
}

export function saveLocalWorkspace(snapshot: WorkspaceSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEYS.courses, JSON.stringify(snapshot.courses));
    localStorage.setItem(LS_KEYS.lectures, JSON.stringify(snapshot.lectures));
    localStorage.setItem(LS_KEYS.resources, JSON.stringify(snapshot.resources));
    localStorage.setItem(LS_KEYS.chats, JSON.stringify(snapshot.chats));
  } catch (err) {
    console.warn("Yerel depolama yazma uyarısı:", err);
  }
}

export function resetLocalWorkspaceToDefaults(): WorkspaceSnapshot {
  const defaults: WorkspaceSnapshot = {
    courses: INITIAL_COURSES,
    lectures: INITIAL_LECTURES,
    resources: INITIAL_RESOURCES,
    chats: INITIAL_CHATS,
  };
  saveLocalWorkspace(defaults);
  return defaults;
}

export async function testSupabaseConnection(
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<{ ok: boolean; needsSchema?: boolean; message: string }> {
  const client = getSupabaseClient({ supabaseUrl, supabaseAnonKey });
  if (!client) {
    return {
      ok: false,
      message: "Geçerli bir Supabase Project URL ve Anon Key giriniz.",
    };
  }
  try {
    const { error } = await client.from("courses").select("id").limit(1);
    if (error) {
      const isMissingTable =
        error.message.includes("schema cache") ||
        error.message.includes("does not exist") ||
        error.code === "PGRST205" ||
        error.code === "42P01";
      return {
        ok: false,
        needsSchema: isMissingTable,
        message: isMissingTable
          ? "Supabase projesine bağlanıldı! Ortak tabloları oluşturmak için aşağıdaki SQL kodunu Supabase SQL Editor'de bir kez çalıştırın."
          : `Supabase hatası: ${error.message}`,
      };
    }
    return {
      ok: true,
      message:
        "Supabase PostgreSQL + Storage ortak bulut veritabanı aktif! Tüm IP ve cihazlar senkronize.",
    };
  } catch (err) {
    return {
      ok: false,
      message: `Bağlantı hatası: ${
        err instanceof Error ? err.message : "Bilinmeyen hata"
      }`,
    };
  }
}

export async function syncCourseToSupabase(
  client: SupabaseClient | null,
  course: Course
): Promise<void> {
  if (!client) return;
  try {
    await client.from("courses").upsert({
      id: course.id,
      code: course.code,
      title: course.title,
      professor: course.professor,
      semester: course.semester,
      description: course.description,
      syllabus: course.syllabus,
      icon_name: course.iconName,
      updated_at: new Date().toISOString(),
    });
  } catch {
    // Graceful fallback
  }
}

export async function deleteCourseFromSupabase(
  client: SupabaseClient | null,
  courseId: string
): Promise<void> {
  if (!client) return;
  try {
    await client.from("courses").delete().eq("id", courseId);
  } catch {
    // Graceful fallback
  }
}

export async function syncLectureToSupabase(
  client: SupabaseClient | null,
  lecture: Lecture,
  file?: File
): Promise<string | undefined> {
  if (!client) return undefined;
  let uploadedPublicUrl: string | undefined = lecture.mediaUrl;
  try {
    if (file) {
      const extMatch = file.name.match(/\.[a-zA-Z0-9]+$/);
      const ext = extMatch ? extMatch[0] : ".mp4";
      const safeName = `${lecture.courseId}/${lecture.id}${ext}`;
      const { error: uploadErr } = await client.storage
        .from("course-assets")
        .upload(safeName, file, {
          upsert: true,
          contentType: file.type || "video/mp4",
        });
      if (!uploadErr) {
        const { data } = client.storage
          .from("course-assets")
          .getPublicUrl(safeName);
        uploadedPublicUrl = data.publicUrl;
      }
    }

    const basePayload = {
      id: lecture.id,
      course_id: lecture.courseId,
      title: lecture.title,
      recorded_date: lecture.recordedDate,
      source_type: lecture.sourceType,
      media_url: uploadedPublicUrl || null,
      media_mime_type: lecture.mediaMimeType || null,
      duration_label: lecture.durationLabel,
      executive_summary: lecture.executiveSummary,
      timeline: lecture.timeline || [],
      whiteboard_extractions: lecture.whiteboardExtractions || [],
      exam_alerts: lecture.examAlerts || [],
      concept_map: lecture.conceptMap || [],
      practice_questions: lecture.practiceQuestions || [],
    };

    const { error } = await client.from("lectures").upsert({
      ...basePayload,
      transcript: lecture.transcript || [],
      is_real_audio_transcript: Boolean(lecture.isRealAudioTranscript),
    });

    // If the user ran an older SQL schema without the `transcript` column, store transcript inside timeline metadata seamlessly
    if (error) {
      await client.from("lectures").upsert(basePayload);
    }
  } catch {
    // Graceful fallback
  }
  return uploadedPublicUrl;
}

export async function deleteLectureFromSupabase(
  client: SupabaseClient | null,
  lectureId: string
): Promise<void> {
  if (!client) return;
  try {
    await client.from("lectures").delete().eq("id", lectureId);
  } catch {
    // Graceful fallback
  }
}

export async function syncResourceToSupabase(
  client: SupabaseClient | null,
  resource: CourseResource
): Promise<void> {
  if (!client) return;
  try {
    await client.from("course_resources").upsert({
      id: resource.id,
      course_id: resource.courseId,
      title: resource.title,
      source: resource.source,
      url: resource.url || null,
      summary: resource.summary,
      content_markdown: resource.contentMarkdown,
      resource_type: resource.resourceType,
      created_at: resource.createdAt,
    });
  } catch {
    // Graceful fallback
  }
}

export async function deleteResourceFromSupabase(
  client: SupabaseClient | null,
  resourceId: string
): Promise<void> {
  if (!client) return;
  try {
    await client.from("course_resources").delete().eq("id", resourceId);
  } catch {
    // Graceful fallback
  }
}

export async function syncChatMessageToSupabase(
  client: SupabaseClient | null,
  msg: ChatMessage
): Promise<void> {
  if (!client) return;
  try {
    await client.from("chat_messages").upsert({
      id: msg.id,
      course_id: msg.courseId,
      role: msg.role,
      content: msg.content,
      attachment_name: msg.attachmentName || null,
      created_at: msg.createdAt,
    });
  } catch {
    // Graceful fallback
  }
}

export async function clearCourseChatInSupabase(
  client: SupabaseClient | null,
  courseId: string
): Promise<void> {
  if (!client) return;
  try {
    await client.from("chat_messages").delete().eq("course_id", courseId);
  } catch {
    // Graceful fallback
  }
}

export async function pushEntireWorkspaceToSupabase(
  client: SupabaseClient | null,
  snapshot: WorkspaceSnapshot
): Promise<{ ok: boolean; error?: string }> {
  if (!client) return { ok: false, error: "Supabase istemcisi başlatılamadı." };
  try {
    for (const c of snapshot.courses) {
      await syncCourseToSupabase(client, c);
    }
    for (const l of snapshot.lectures) {
      await syncLectureToSupabase(client, l);
    }
    for (const r of snapshot.resources) {
      await syncResourceToSupabase(client, r);
    }
    for (const courseId of Object.keys(snapshot.chats)) {
      for (const m of snapshot.chats[courseId] || []) {
        await syncChatMessageToSupabase(client, m);
      }
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Senkronizasyon hatası",
    };
  }
}

export async function fetchWorkspaceFromSupabase(
  client: SupabaseClient | null,
  localSnapshot: WorkspaceSnapshot
): Promise<{
  status: "connected" | "needs_schema" | "offline";
  snapshot: WorkspaceSnapshot;
  message?: string;
}> {
  if (!client) {
    return { status: "offline", snapshot: localSnapshot };
  }

  try {
    const { data: courseRows, error: courseErr } = await client
      .from("courses")
      .select("*")
      .order("created_at", { ascending: true });

    if (courseErr) {
      const isMissingTable =
        courseErr.message.includes("schema cache") ||
        courseErr.message.includes("does not exist") ||
        courseErr.code === "PGRST205" ||
        courseErr.code === "42P01";
      return {
        status: isMissingTable ? "needs_schema" : "offline",
        snapshot: localSnapshot,
        message: courseErr.message,
      };
    }

    // If the cloud database is brand new & empty, seed it with the current local workspace!
    if (!courseRows || courseRows.length === 0) {
      await pushEntireWorkspaceToSupabase(client, localSnapshot);
      return {
        status: "connected",
        snapshot: localSnapshot,
      };
    }

    const [lecRes, resRes, chatRes] = await Promise.all([
      client
        .from("lectures")
        .select("*")
        .order("created_at", { ascending: true }),
      client
        .from("course_resources")
        .select("*")
        .order("created_at", { ascending: true }),
      client
        .from("chat_messages")
        .select("*")
        .order("created_at", { ascending: true }),
    ]);

    const courses: Course[] = courseRows.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      code: String(row.code || ""),
      title: String(row.title || ""),
      professor: String(row.professor || ""),
      semester: String(row.semester || "Güz Dönemi"),
      description: String(row.description || ""),
      syllabus: String(row.syllabus || ""),
      iconName: (row.icon_name as Course["iconName"]) || "Atom",
      createdAt: String(row.created_at || new Date().toISOString()),
    }));

    const remoteLectures: Lecture[] = (lecRes.data || []).map(
      (row: Record<string, unknown>) => {
        const localMatch = localSnapshot.lectures.find(
          (l) => l.id === String(row.id)
        );
        const rawTranscript = Array.isArray(row.transcript)
          ? (row.transcript as TranscriptItem[])
          : localMatch?.transcript || [];

        return {
          id: String(row.id),
          courseId: String(row.course_id),
          title: String(row.title || ""),
          recordedDate: String(row.recorded_date || ""),
          sourceType: (row.source_type as Lecture["sourceType"]) || "video",
          mediaUrl: row.media_url
            ? String(row.media_url)
            : localMatch?.mediaUrl,
          mediaBlobKey: localMatch?.mediaBlobKey,
          mediaMimeType: row.media_mime_type
            ? String(row.media_mime_type)
            : localMatch?.mediaMimeType,
          durationLabel: String(row.duration_label || "45:00"),
          executiveSummary: String(row.executive_summary || ""),
          timeline: Array.isArray(row.timeline)
            ? (row.timeline as Lecture["timeline"])
            : [],
          whiteboardExtractions: Array.isArray(row.whiteboard_extractions)
            ? (row.whiteboard_extractions as Lecture["whiteboardExtractions"])
            : [],
          examAlerts: Array.isArray(row.exam_alerts)
            ? (row.exam_alerts as Lecture["examAlerts"])
            : [],
          conceptMap: Array.isArray(row.concept_map)
            ? (row.concept_map as Lecture["conceptMap"])
            : [],
          practiceQuestions: Array.isArray(row.practice_questions)
            ? (row.practice_questions as Lecture["practiceQuestions"])
            : [],
          transcript: rawTranscript,
          isRealAudioTranscript:
            Boolean(row.is_real_audio_transcript) ||
            Boolean(localMatch?.isRealAudioTranscript),
          createdAt: String(row.created_at || new Date().toISOString()),
        };
      }
    );

    // Also push any local lectures that aren't in Supabase yet so nothing created locally before connecting is lost
    const mergedLectures = [...remoteLectures];
    for (const localLec of localSnapshot.lectures) {
      if (!mergedLectures.some((r) => r.id === localLec.id)) {
        mergedLectures.push(localLec);
        syncLectureToSupabase(client, localLec);
      }
    }

    const resources: CourseResource[] =
      resRes.data && resRes.data.length > 0
        ? resRes.data.map((row: Record<string, unknown>) => ({
            id: String(row.id),
            courseId: String(row.course_id),
            title: String(row.title || ""),
            source: String(row.source || "Akademik Kaynak"),
            url: row.url ? String(row.url) : undefined,
            summary: String(row.summary || ""),
            contentMarkdown: String(row.content_markdown || ""),
            resourceType:
              (row.resource_type as CourseResource["resourceType"]) || "notes",
            createdAt: String(row.created_at || new Date().toISOString()),
          }))
        : localSnapshot.resources;

    const chats: Record<string, ChatMessage[]> = { ...localSnapshot.chats };
    if (chatRes.data && chatRes.data.length > 0) {
      const grouped: Record<string, ChatMessage[]> = {};
      for (const row of chatRes.data as Array<Record<string, unknown>>) {
        const cid = String(row.course_id);
        if (!grouped[cid]) grouped[cid] = [];
        grouped[cid].push({
          id: String(row.id),
          courseId: cid,
          role: (row.role as ChatMessage["role"]) || "assistant",
          content: String(row.content || ""),
          attachmentName: row.attachment_name
            ? String(row.attachment_name)
            : undefined,
          createdAt: String(row.created_at || new Date().toISOString()),
        });
      }
      for (const cid of Object.keys(grouped)) {
        chats[cid] = grouped[cid];
      }
    }

    const finalSnapshot: WorkspaceSnapshot = {
      courses,
      lectures: mergedLectures,
      resources,
      chats,
    };

    saveLocalWorkspace(finalSnapshot);
    return {
      status: "connected",
      snapshot: finalSnapshot,
    };
  } catch (err) {
    return {
      status: "offline",
      snapshot: localSnapshot,
      message: err instanceof Error ? err.message : "Bağlantı hatası",
    };
  }
}
