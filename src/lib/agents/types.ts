import { ApiKeysConfig, ExternalToolConfig } from "@/types/academic";

export interface AgentSearchItem {
  id: string;
  title: string;
  source: string;
  url?: string;
  summary: string;
  contentMarkdown: string;
  resourceType: "paper" | "notes" | "problem_set";
}

export interface AgentExecutionContext {
  courseTitle: string;
  courseCode: string;
  syllabus: string;
  apiKeys: ApiKeysConfig;
  toolConfig: ExternalToolConfig;
}

export interface AgentToolAdapter {
  id: string;
  name: string;
  description: string;
  category: "academic" | "math" | "search" | "custom";
  defaultEndpoint: string;
  execute: (
    query: string,
    ctx: AgentExecutionContext
  ) => Promise<AgentSearchItem[]>;
}
