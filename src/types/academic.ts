export type CourseIconName =
  | "Orbit"
  | "Zap"
  | "Atom"
  | "Flame"
  | "Sigma"
  | "Waves"
  | "BookOpen"
  | "Sparkles";

export interface Course {
  id: string;
  code: string;
  title: string;
  professor: string;
  semester: string;
  description: string;
  syllabus: string;
  iconName: CourseIconName;
  createdAt: string;
}

export interface TimelineSegment {
  id: string;
  timestamp: string; // e.g. "04:20"
  seconds: number;
  title: string;
  summary: string;
  spokenTranscript: string;
  equations: string[]; // LaTeX strings without outer $$ delimiters
  isExamAlert: boolean;
  professorQuote?: string;
}

export interface WhiteboardExtraction {
  id: string;
  timestamp: string;
  seconds: number;
  title: string;
  latex: string; // Clean LaTeX formula
  variablesExplanation: string;
  diagramNote?: string;
}

export interface ExamAlert {
  id: string;
  timestamp: string;
  seconds: number;
  severity: "critical" | "important";
  professorQuote: string;
  topic: string;
  examTip: string;
}

export interface ConceptNode {
  id: string;
  concept: string;
  formula?: string;
  description: string;
  connectsTo?: string;
}

export interface PracticeQuestion {
  id: string;
  difficulty: "Kavramsal" | "Vize" | "Final";
  question: string;
  hint: string;
  solutionMarkdown: string;
}

export interface Lecture {
  id: string;
  courseId: string;
  title: string;
  recordedDate: string;
  sourceType: "video" | "audio" | "url" | "sample";
  mediaBlobKey?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  durationLabel: string;
  executiveSummary: string;
  timeline: TimelineSegment[];
  whiteboardExtractions: WhiteboardExtraction[];
  examAlerts: ExamAlert[];
  conceptMap: ConceptNode[];
  practiceQuestions: PracticeQuestion[];
  createdAt: string;
}

export interface CourseResource {
  id: string;
  courseId: string;
  title: string;
  source: string;
  url?: string;
  summary: string;
  contentMarkdown: string;
  resourceType: "paper" | "notes" | "problem_set" | "file";
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  courseId: string;
  role: "user" | "assistant";
  content: string;
  attachmentName?: string;
  imageDataUrl?: string;
  createdAt: string;
}

export type GeminiModelId =
  | "gemini-2.5-flash"
  | "gemini-2.0-flash"
  | "gemini-2.5-pro";

export interface ExternalToolConfig {
  id: string;
  name: string;
  description: string;
  category: "academic" | "math" | "search" | "custom";
  endpointUrl: string;
  apiKey?: string;
  enabled: boolean;
  isBuiltIn: boolean;
}

export interface ApiKeysConfig {
  geminiApiKey: string;
  geminiModel: GeminiModelId;
  supabaseUrl: string;
  supabaseAnonKey: string;
  wolframAppId: string;
}
