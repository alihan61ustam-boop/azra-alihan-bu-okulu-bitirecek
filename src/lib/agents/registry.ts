import { GoogleGenAI } from "@google/genai";
import { ExternalToolConfig } from "@/types/academic";
import {
  AgentExecutionContext,
  AgentSearchItem,
  AgentToolAdapter,
} from "@/lib/agents/types";

const TOOLS_STORAGE_KEY = "azra_alihan_agent_tools_v1";

/**
 * 1. ArXiv Physics & Mathematics Preprint Adapter
 */
const arxivAdapter: AgentToolAdapter = {
  id: "arxiv-physics",
  name: "ArXiv Fizik & Matematik Makale Tarayıcı",
  description:
    "ArXiv açık erişim arşivinden seçili fizik konusuyla ilgili akademik makale ve ders notlarını çeker.",
  category: "academic",
  defaultEndpoint: "https://export.arxiv.org/api/query",
  execute: async (query: string): Promise<AgentSearchItem[]> => {
    try {
      const encoded = encodeURIComponent(`all:${query} AND cat:physics*`);
      const res = await fetch(
        `https://export.arxiv.org/api/query?search_query=${encoded}&start=0&max_results=3`
      );
      if (!res.ok) return [];
      const xmlText = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, "text/xml");
      const entries = Array.from(doc.querySelectorAll("entry"));

      return entries.map((entry, idx) => {
        const title =
          entry.querySelector("title")?.textContent?.replace(/\s+/g, " ").trim() ||
          `ArXiv Fizik Makalesi #${idx + 1}`;
        const summary =
          entry
            .querySelector("summary")
            ?.textContent?.replace(/\s+/g, " ")
            .trim() || "";
        const idUrl = entry.querySelector("id")?.textContent?.trim() || "";
        const authors = Array.from(entry.querySelectorAll("author > name"))
          .map((n) => n.textContent?.trim())
          .filter(Boolean)
          .slice(0, 3)
          .join(", ");

        return {
          id: `arxiv-${Date.now()}-${idx}`,
          title,
          source: `ArXiv Preprint${authors ? ` • ${authors}` : ""}`,
          url: idUrl,
          summary: summary.slice(0, 340) + (summary.length > 340 ? "..." : ""),
          contentMarkdown: `### ${title}\n**Yazarlar:** ${authors || "ArXiv Araştırma Grubu"}\n\n**Özet:**\n${summary}\n\n${idUrl ? `[ArXiv Orijinal Makale / PDF Bağlantısı](${idUrl})` : ""}`,
          resourceType: "paper",
        };
      });
    } catch {
      return [];
    }
  },
};

/**
 * 2. Wikipedia Academic Physics Adapter (TR + EN CORS-native)
 */
const wikipediaAdapter: AgentToolAdapter = {
  id: "wikipedia-physics",
  name: "Wikipedia Akademik Fizik Ansiklopedisi",
  description:
    "Türkçe ve İngilizce Wikipedia üzerinden kavramsal fizik özetleri ve temel tanımlar getirir.",
  category: "search",
  defaultEndpoint: "https://tr.wikipedia.org/w/api.php",
  execute: async (query: string): Promise<AgentSearchItem[]> => {
    const items: AgentSearchItem[] = [];
    for (const lang of ["tr", "en"] as const) {
      try {
        const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
          query
        )}&srlimit=2&format=json&origin=*`;
        const res = await fetch(searchUrl);
        if (!res.ok) continue;
        const data = await res.json();
        const hits: Array<{ title: string; snippet: string; pageid: number }> =
          data?.query?.search || [];

        for (const hit of hits) {
          const cleanSnippet = hit.snippet
            .replace(/<[^>]+>/g, "")
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, "&");
          const pageUrl = `https://${lang}.wikipedia.org/?curid=${hit.pageid}`;
          items.push({
            id: `wiki-${lang}-${hit.pageid}`,
            title: `${hit.title} (${lang.toUpperCase()} Akademik Ansiklopedi)`,
            source: `Wikipedia (${lang.toUpperCase()})`,
            url: pageUrl,
            summary: cleanSnippet,
            contentMarkdown: `### ${hit.title}\n${cleanSnippet}\n\nDetaylı okuma için: [${pageUrl}](${pageUrl})`,
            resourceType: "notes",
          });
        }
      } catch {
        // continue
      }
    }
    return items.slice(0, 3);
  },
};

/**
 * 3. CrossRef Open Academic Literature & Textbook Adapter
 */
const crossrefAdapter: AgentToolAdapter = {
  id: "crossref-scholar",
  name: "CrossRef Akademik Yayın & Ders Kitabı Dizini",
  description:
    "DOI kayıtlı uluslararası fizik makalelerini, ders kitaplarını ve referans kaynakları tarar.",
  category: "academic",
  defaultEndpoint: "https://api.crossref.org/works",
  execute: async (query: string): Promise<AgentSearchItem[]> => {
    try {
      const res = await fetch(
        `https://api.crossref.org/works?query=${encodeURIComponent(
          query + " physics"
        )}&rows=2`
      );
      if (!res.ok) return [];
      const json = await res.json();
      const works = json?.message?.items || [];
      return works.map(
        (
          w: {
            DOI?: string;
            title?: string[];
            URL?: string;
            publisher?: string;
            author?: Array<{ given?: string; family?: string }>;
          },
          i: number
        ) => {
          const title = w.title?.[0] || `Akademik Referans #${i + 1}`;
          const authors = (w.author || [])
            .slice(0, 3)
            .map((a) => `${a.given || ""} ${a.family || ""}`.trim())
            .join(", ");
          const publisher = w.publisher || "Akademik Yayıncı";
          return {
            id: `crossref-${Date.now()}-${i}`,
            title,
            source: `CrossRef • ${publisher}`,
            url: w.URL || (w.DOI ? `https://doi.org/${w.DOI}` : undefined),
            summary: `${authors ? `Yazarlar: ${authors}. ` : ""}DOI: ${w.DOI || "Belirtilmemiş"}.`,
            contentMarkdown: `### ${title}\n- **Yayıncı:** ${publisher}\n- **Yazarlar:** ${authors || "Belirtilmemiş"}\n- **DOI:** \`${w.DOI || "-"}\``,
            resourceType: "paper" as const,
          };
        }
      );
    } catch {
      return [];
    }
  },
};

/**
 * 4. Gemini Academic Notes & Problem Set Synthesizer Adapter
 */
const geminiAcademicAdapter: AgentToolAdapter = {
  id: "gemini-open-courseware",
  name: "Gemini Açık Ders Notu & Soru Seti Sentezleyici",
  description:
    "Seçili ders müfredatına uygun LaTeX formül özeti ve çözümlü sınav çalışma soruları üretir.",
  category: "math",
  defaultEndpoint: "https://generativelanguage.googleapis.com",
  execute: async (
    query: string,
    ctx: AgentExecutionContext
  ): Promise<AgentSearchItem[]> => {
    const key = ctx.apiKeys.geminiApiKey?.trim();
    if (!key) return [];
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      const prompt = `Sen üniversite düzeyinde bir fizik profesörüsün. "${ctx.courseTitle} (${ctx.courseCode})" dersi kapsamında "${query}" konusu için Türkçe olarak:
1) Temel kavram özeti ve kritik LaTeX formülleri ($...$ ve $$...$$ kullanarak),
2) Vize/Final seviyesinde 2 adet çözümlü çalışma sorusu hazırla.
Yanıtı doğrudan temiz Markdown + LaTeX olarak ver.`;

      const resp = await ai.models.generateContent({
        model: ctx.apiKeys.geminiModel || "gemini-2.5-flash",
        contents: prompt,
      });
      const md = resp.text?.trim();
      if (!md) return [];

      return [
        {
          id: `gemini-synth-${Date.now()}`,
          title: `${query} — LaTeX Formül Özeti & Çözümlü Sınav Soruları`,
          source: `Gemini Akademik Sentez (${ctx.courseCode})`,
          summary: `${ctx.courseTitle} müfredatına göre özel oluşturulmuş formül özeti ve çözümlü çalışma seti.`,
          contentMarkdown: md,
          resourceType: "problem_set",
        },
      ];
    } catch {
      return [];
    }
  },
};

/**
 * Registry Class — Extensible Adapter Architecture (`lib/agents/`)
 */
class AgentToolRegistry {
  private adapters = new Map<string, AgentToolAdapter>();

  constructor() {
    this.register(geminiAcademicAdapter);
    this.register(arxivAdapter);
    this.register(wikipediaAdapter);
    this.register(crossrefAdapter);
  }

  register(adapter: AgentToolAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  getAllBuiltInConfigs(): ExternalToolConfig[] {
    return Array.from(this.adapters.values()).map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      category: a.category,
      endpointUrl: a.defaultEndpoint,
      enabled: true,
      isBuiltIn: true,
    }));
  }

  loadSavedToolConfigs(): ExternalToolConfig[] {
    const builtIns = this.getAllBuiltInConfigs();
    if (typeof window === "undefined") return builtIns;
    try {
      const raw = localStorage.getItem(TOOLS_STORAGE_KEY);
      if (!raw) return builtIns;
      const saved: ExternalToolConfig[] = JSON.parse(raw);
      const merged = builtIns.map((b) => {
        const match = saved.find((s) => s.id === b.id);
        return match ? { ...b, enabled: match.enabled, apiKey: match.apiKey } : b;
      });
      const customs = saved.filter((s) => !s.isBuiltIn);
      return [...merged, ...customs];
    } catch {
      return builtIns;
    }
  }

  saveToolConfigs(configs: ExternalToolConfig[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(TOOLS_STORAGE_KEY, JSON.stringify(configs));
  }

  async executeEnabledTools(
    query: string,
    ctxBase: Omit<AgentExecutionContext, "toolConfig">,
    configs: ExternalToolConfig[]
  ): Promise<AgentSearchItem[]> {
    const enabled = configs.filter((c) => c.enabled);
    const settled = await Promise.all(
      enabled.map(async (cfg) => {
        const adapter = this.adapters.get(cfg.id);
        if (adapter) {
          return adapter.execute(query, { ...ctxBase, toolConfig: cfg });
        }
        // Custom user-registered REST endpoint execution
        if (!cfg.isBuiltIn && cfg.endpointUrl) {
          try {
            const url = cfg.endpointUrl.includes("{query}")
              ? cfg.endpointUrl.replace("{query}", encodeURIComponent(query))
              : `${cfg.endpointUrl}${cfg.endpointUrl.includes("?") ? "&" : "?"}q=${encodeURIComponent(query)}`;
            const headers: Record<string, string> = {};
            if (cfg.apiKey) {
              headers["Authorization"] = `Bearer ${cfg.apiKey}`;
            }
            const res = await fetch(url, { headers });
            if (!res.ok) return [];
            const data = await res.json();
            const preview = JSON.stringify(data, null, 2).slice(0, 900);
            return [
              {
                id: `custom-${cfg.id}-${Date.now()}`,
                title: `${cfg.name}: "${query}" Yanıtı`,
                source: cfg.name,
                url: cfg.endpointUrl,
                summary: "Özel kayıtlı API uç noktasından alınan yapılandırılmış yanıt.",
                contentMarkdown: `### ${cfg.name} Sonucu\n\`\`\`json\n${preview}\n\`\`\``,
                resourceType: "notes" as const,
              },
            ];
          } catch {
            return [];
          }
        }
        return [];
      })
    );
    return settled.flat();
  }
}

export const agentRegistry = new AgentToolRegistry();
