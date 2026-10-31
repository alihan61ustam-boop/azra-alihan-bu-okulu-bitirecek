import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  Course,
  Lecture,
  CourseResource,
  ChatMessage,
  ApiKeysConfig,
} from "@/types/academic";
import {
  INITIAL_COURSES,
  INITIAL_LECTURES,
  INITIAL_RESOURCES,
  INITIAL_CHATS,
} from "@/lib/seedData";
import { repairLectureIfNeeded } from "@/lib/emtLectureData";

const LS_KEYS = {
  courses: "azra_alihan_courses_v1",
  lectures: "azra_alihan_lectures_v1",
  resources: "azra_alihan_resources_v1",
  chats: "azra_alihan_chats_v1",
};

export interface WorkspaceSnapshot {
  courses: Course[];
  lectures: Lecture[];
  resources: CourseResource[];
  chats: Record<string, ChatMessage[]>;
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

    // Ensure any new seed lectures (e.g. lec-emt-03) and synchronized transcripts are merged
    for (const rawSeed of INITIAL_LECTURES) {
      const seedLec = repairLectureIfNeeded(rawSeed).lecture;
      const existingIdx = lectures.findIndex((l) => l.id === seedLec.id);
      if (existingIdx === -1) {
        lectures.push(seedLec);
        anyRepaired = true;
      } else if (
        seedLec.transcript &&
        (!lectures[existingIdx].transcript ||
          seedLec.transcript.length > (lectures[existingIdx].transcript?.length || 0))
      ) {
        lectures[existingIdx] = {
          ...lectures[existingIdx],
          transcript: seedLec.transcript,
          timeline:
            lectures[existingIdx].timeline?.length > 0
              ? lectures[existingIdx].timeline
              : seedLec.timeline,
          whiteboardExtractions:
            lectures[existingIdx].whiteboardExtractions?.length > 0
              ? lectures[existingIdx].whiteboardExtractions
              : seedLec.whiteboardExtractions,
          examAlerts:
            lectures[existingIdx].examAlerts?.length > 0
              ? lectures[existingIdx].examAlerts
              : seedLec.examAlerts,
        };
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

export function getSupabaseClient(
  keys: Pick<ApiKeysConfig, "supabaseUrl" | "supabaseAnonKey">
): SupabaseClient | null {
  const url = keys.supabaseUrl?.trim();
  const anon = keys.supabaseAnonKey?.trim();
  if (!url || !anon || !url.startsWith("http")) return null;
  try {
    return createClient(url, anon);
  } catch {
    return null;
  }
}

export async function testSupabaseConnection(
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<{ ok: boolean; message: string }> {
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
      return {
        ok: false,
        message: `Supabase bağlantısı kuruldu ancak şema bulunamadı (${error.message}). Lütfen SQL migrasyon scriptini çalıştırın.`,
      };
    }
    return {
      ok: true,
      message: "Supabase PostgreSQL + Storage bulut senkronizasyonu aktif!",
    };
  } catch (err) {
    return {
      ok: false,
      message: `Bağlantı hatası: ${err instanceof Error ? err.message : "Bilinmeyen hata"}`,
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
    // Graceful hybrid fallback
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
      const safeName = `${lecture.courseId}/${lecture.id}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: uploadErr } = await client.storage
        .from("course-assets")
        .upload(safeName, file, { upsert: true });
      if (!uploadErr) {
        const { data } = client.storage
          .from("course-assets")
          .getPublicUrl(safeName);
        uploadedPublicUrl = data.publicUrl;
      }
    }

    await client.from("lectures").upsert({
      id: lecture.id,
      course_id: lecture.courseId,
      title: lecture.title,
      recorded_date: lecture.recordedDate,
      source_type: lecture.sourceType,
      media_url: uploadedPublicUrl || null,
      media_mime_type: lecture.mediaMimeType || null,
      duration_label: lecture.durationLabel,
      executive_summary: lecture.executiveSummary,
      timeline: lecture.timeline,
      whiteboard_extractions: lecture.whiteboardExtractions,
      exam_alerts: lecture.examAlerts,
      concept_map: lecture.conceptMap,
      practice_questions: lecture.practiceQuestions,
    });
  } catch {
    // Graceful hybrid fallback
  }
  return uploadedPublicUrl;
}
