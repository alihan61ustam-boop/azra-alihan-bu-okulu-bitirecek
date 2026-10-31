import { Lecture, TranscriptItem } from "@/types/academic";

export function parseDurationToSeconds(durationLabel?: string): number {
  if (!durationLabel) return 2400;
  const parts = durationLabel.split(":").map((p) => parseInt(p.trim(), 10));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  if (
    parts.length === 3 &&
    !isNaN(parts[0]) &&
    !isNaN(parts[1]) &&
    !isNaN(parts[2])
  ) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 2400;
}

export function formatSecToTimestamp(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Formats real transcribed items into Google-Drive-style 4-5 second (6-8 word) lines
 * WITHOUT ever inventing or replacing any text. Only subdivides long spoken sentences
 * from the actual transcript across their real timestamp interval.
 */
export function formatRealTranscriptToGoogleDriveStyle(
  rawItems: TranscriptItem[]
): TranscriptItem[] {
  if (!rawItems || rawItems.length === 0) return [];

  const sorted = [...rawItems]
    .filter((item) => item.text && item.text.trim().length > 0)
    .sort((a, b) => a.seconds - b.seconds);

  const expanded: TranscriptItem[] = [];
  let counter = 0;

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i];
    const nextSec =
      i + 1 < sorted.length
        ? Math.max(item.seconds + 3, sorted[i + 1].seconds)
        : item.seconds + 8;
    const gap = Math.max(3, nextSec - item.seconds);
    const words = item.text.trim().split(/\s+/);
    const CHUNK_WORDS = 7;

    if (words.length > CHUNK_WORDS + 2 && gap >= 5) {
      const chunks: string[] = [];
      for (let w = 0; w < words.length; w += CHUNK_WORDS) {
        const isLast = w + CHUNK_WORDS >= words.length;
        chunks.push(
          words.slice(w, w + CHUNK_WORDS).join(" ") + (isLast ? "" : "...")
        );
      }
      const step = gap / chunks.length;
      chunks.forEach((chunkText, cIdx) => {
        const s = Math.round(item.seconds + cIdx * step);
        const isLast = cIdx === chunks.length - 1;
        expanded.push({
          ...item,
          id: `tr-real-${s}-${counter++}`,
          timestamp: formatSecToTimestamp(s),
          seconds: s,
          text: chunkText,
          isImportant: isLast ? item.isImportant : false,
          importanceType: isLast ? item.importanceType : "casual",
          importanceNote: isLast ? item.importanceNote : undefined,
        });
      });
    } else {
      expanded.push({
        ...item,
        id: item.id || `tr-real-${item.seconds}-${counter++}`,
        timestamp: formatSecToTimestamp(item.seconds),
      });
    }
  }

  return expanded;
}

/**
 * Does NOT overwrite lectures with any fake template.
 * Only clears out any previously injected template on user-uploaded videos
 * so that the real audio transcription engine can transcribe the actual video file.
 */
export function repairLectureIfNeeded(lec: Lecture): {
  lecture: Lecture;
  repaired: boolean;
} {
  // If this is a user-uploaded video (has mediaBlobKey) and was previously filled with
  // the static template (not marked isRealAudioTranscript), clear the fake template
  // so LectureNoteViewer immediately triggers real audio extraction from IndexedDB!
  if (lec.mediaBlobKey && !lec.isRealAudioTranscript) {
    const hasOldStaticTemplate =
      lec.transcript?.some((t) => t.id.startsWith("tr-emt40-")) ||
      lec.timeline?.some((s) => s.id.startsWith("seg-emt40-"));

    if (hasOldStaticTemplate) {
      return {
        repaired: true,
        lecture: {
          ...lec,
          transcript: [],
          timeline: [],
          whiteboardExtractions: [],
          examAlerts: [],
          conceptMap: [],
          practiceQuestions: [],
          isRealAudioTranscript: false,
        },
      };
    }
  }

  return { lecture: lec, repaired: false };
}
