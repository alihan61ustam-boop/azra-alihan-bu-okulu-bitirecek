"use client";

import React, { useState } from "react";
import {
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  Database,
  Cpu,
  Wrench,
  X,
  ExternalLink,
  RotateCcw,
} from "lucide-react";
import {
  ApiKeysConfig,
  ExternalToolConfig,
  GeminiModelId,
} from "@/types/academic";
import { validateGeminiApiKey } from "@/lib/gemini/client";
import { testSupabaseConnection } from "@/lib/hybridStore";

type SettingsTab = "gemini" | "agency" | "database";

export function ApiRegistryModal({
  isOpen,
  apiKeys,
  toolConfigs,
  onClose,
  onSaveApiKeys,
  onSaveToolConfigs,
  onResetSampleData,
}: {
  isOpen: boolean;
  apiKeys: ApiKeysConfig;
  toolConfigs: ExternalToolConfig[];
  onClose: () => void;
  onSaveApiKeys: (cfg: ApiKeysConfig) => void;
  onSaveToolConfigs: (tools: ExternalToolConfig[]) => void;
  onResetSampleData: () => void;
}) {
  const [tab, setTab] = useState<SettingsTab>("gemini");
  const [draftKeys, setDraftKeys] = useState<ApiKeysConfig>(apiKeys);
  const [showKey, setShowKey] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    message: string;
  } | null>(null);

  const [testingDb, setTestingDb] = useState(false);
  const [dbResult, setDbResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  // Custom adapter form
  const [customName, setCustomName] = useState("");
  const [customEndpoint, setCustomEndpoint] = useState("");
  const [customApiKey, setCustomApiKey] = useState("");

  React.useEffect(() => {
    if (isOpen) {
      setDraftKeys(apiKeys);
      setValidationResult(null);
      setDbResult(null);
    }
  }, [isOpen, apiKeys]);

  if (!isOpen) return null;

  const handleValidateAndSaveGemini = async () => {
    setValidating(true);
    setValidationResult(null);
    const res = await validateGeminiApiKey(
      draftKeys.geminiApiKey,
      draftKeys.geminiModel
    );
    if (res.activeModel && res.activeModel !== draftKeys.geminiModel) {
      const updated = { ...draftKeys, geminiModel: res.activeModel };
      setDraftKeys(updated);
      onSaveApiKeys(updated);
    } else {
      onSaveApiKeys(draftKeys);
    }
    setValidationResult(res);
    setValidating(false);
  };

  const handleToggleTool = (id: string) => {
    const updated = toolConfigs.map((t) =>
      t.id === id ? { ...t, enabled: !t.enabled } : t
    );
    onSaveToolConfigs(updated);
  };

  const handleAddCustomTool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customEndpoint.trim()) return;
    const newTool: ExternalToolConfig = {
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      description: "Kullanıcı tarafından eklenen özel akademik REST API adaptörü.",
      category: "custom",
      endpointUrl: customEndpoint.trim(),
      apiKey: customApiKey.trim() || undefined,
      enabled: true,
      isBuiltIn: false,
    };
    onSaveToolConfigs([...toolConfigs, newTool]);
    setCustomName("");
    setCustomEndpoint("");
    setCustomApiKey("");
  };

  const handleDeleteCustomTool = (id: string) => {
    onSaveToolConfigs(toolConfigs.filter((t) => t.id !== id));
  };

  const handleTestDb = async () => {
    setTestingDb(true);
    onSaveApiKeys(draftKeys);
    const res = await testSupabaseConnection(
      draftKeys.supabaseUrl,
      draftKeys.supabaseAnonKey
    );
    setDbResult(res);
    setTestingDb(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="my-auto w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10">
              <KeyRound className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Birleşik API &amp; Akademik Araç Merkezi (Agency Registry)
              </h3>
              <p className="text-[11px] text-zinc-400">
                AES-GCM şifreli anahtar kasası, modüler ajan adaptörleri ve hibrit veritabanı
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-800/80 px-5 pt-2 gap-2">
          {(
            [
              {
                id: "gemini",
                label: "Gemini AI Motoru",
                icon: <Cpu className="h-3.5 w-3.5" />,
              },
              {
                id: "agency",
                label: "Akademik Araçlar (lib/agents)",
                icon: <Wrench className="h-3.5 w-3.5" />,
              },
              {
                id: "database",
                label: "Hibrit DB & Supabase",
                icon: <Database className="h-3.5 w-3.5" />,
              },
            ] as { id: SettingsTab; label: string; icon: React.ReactNode }[]
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-semibold transition cursor-pointer ${
                tab === item.id
                  ? "border-amber-400 text-white"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* TAB 1: GEMINI API KEY & MODEL */}
          {tab === "gemini" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-200">
                    Google Gemini API Anahtarı
                  </span>
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 hover:underline"
                  >
                    <span>Ücretsiz Anahtar Al (Google AI Studio)</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <p className="text-[11px] leading-relaxed text-zinc-400">
                  Anahtarınız sunucuya gönderilmez; Web Crypto AES-256-GCM ile
                  yalnızca kendi tarayıcınızda şifrelenerek saklanır ve doğrudan
                  Google Gemini API&apos;sine bağlanır.
                </p>

                <div className="relative pt-1">
                  <input
                    type={showKey ? "text" : "password"}
                    placeholder="AIzaSy..."
                    value={draftKeys.geminiApiKey}
                    onChange={(e) =>
                      setDraftKeys({ ...draftKeys, geminiApiKey: e.target.value })
                    }
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 pl-3.5 pr-10 font-mono text-xs text-white focus:border-amber-500/60 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((p) => !p)}
                    className="absolute right-3 top-3.5 text-zinc-400 hover:text-white cursor-pointer"
                  >
                    {showKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-300">
                  Multimodal Ders İşleme &amp; Fizik Eğitmeni Modeli
                </label>
                <select
                  value={draftKeys.geminiModel}
                  onChange={(e) =>
                    setDraftKeys({
                      ...draftKeys,
                      geminiModel: e.target.value as GeminiModelId,
                    })
                  }
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-xs text-white focus:border-amber-500/60 focus:outline-none"
                >
                  <option value="gemini-3-flash-preview">
                    gemini-3-flash-preview (Önerilen • Yeni Nesil Hızlı Multimodal Video/Ses + LaTeX)
                  </option>
                  <option value="gemini-3.5-flash">
                    gemini-3.5-flash (Gelişmiş Çok Kanallı Analiz)
                  </option>
                  <option value="gemini-3.1-flash-lite">
                    gemini-3.1-flash-lite (Hızlı &amp; Düşük Gecikmeli)
                  </option>
                  <option value="gemini-3.1-pro-preview">
                    gemini-3.1-pro-preview (İleri Düzey Teorik Fizik &amp; Türetmeler)
                  </option>
                </select>
              </div>

              {validationResult && (
                <div
                  className={`flex items-center gap-2.5 rounded-xl border p-3 text-xs ${
                    validationResult.valid
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-red-500/30 bg-red-500/10 text-red-300"
                  }`}
                >
                  {validationResult.valid ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span>{validationResult.message}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onSaveApiKeys(draftKeys);
                    onClose();
                  }}
                  className="rounded-xl border border-zinc-800 px-4 py-2.5 text-xs font-medium text-zinc-300 hover:text-white cursor-pointer"
                >
                  Kaydet &amp; Kapat
                </button>
                <button
                  type="button"
                  disabled={validating}
                  onClick={handleValidateAndSaveGemini}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-zinc-950 hover:bg-zinc-200 disabled:opacity-50 cursor-pointer"
                >
                  {validating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  <span>Kaydet &amp; Canlı Doğrula</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: AGENCY / EXTERNAL TOOLS REGISTRY */}
          {tab === "agency" && (
            <div className="space-y-4">
              <div className="space-y-2.5">
                {toolConfigs.map((tool) => (
                  <div
                    key={tool.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3.5"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">
                          {tool.name}
                        </span>
                        <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                          {tool.category}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-zinc-400">
                        {tool.description}
                      </p>
                      <div className="mt-1 truncate font-mono text-[10px] text-zinc-500">
                        {tool.endpointUrl}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!tool.isBuiltIn && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomTool(tool.id)}
                          className="rounded-lg p-1.5 text-zinc-500 hover:text-red-400 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleToggleTool(tool.id)}
                        className={`rounded-full px-3 py-1 font-mono text-[11px] font-semibold transition cursor-pointer ${
                          tool.enabled
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : "bg-zinc-900 text-zinc-500 border border-zinc-800"
                        }`}
                      >
                        {tool.enabled ? "Aktif" : "Pasif"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Register Custom Academic Endpoint */}
              <form
                onSubmit={handleAddCustomTool}
                className="rounded-xl border border-zinc-800 bg-zinc-900/25 p-4 space-y-3"
              >
                <div className="text-xs font-bold text-white">
                  + Özel Akademik API / Araç Adaptörü Kaydet
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <input
                    type="text"
                    placeholder="Araç Adı (Örn: Wolfram / OpenAlex)"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-amber-500/60 focus:outline-none"
                  />
                  <input
                    type="password"
                    placeholder="Opsiyonel API Anahtarı (Bearer)"
                    value={customApiKey}
                    onChange={(e) => setCustomApiKey(e.target.value)}
                    className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-amber-500/60 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://api.openalex.org/works?search={query}"
                    value={customEndpoint}
                    onChange={(e) => setCustomEndpoint(e.target.value)}
                    className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-xs text-white focus:border-amber-500/60 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 rounded-xl bg-white px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-zinc-200 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Ekle</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: HYBRID DATABASE & SUPABASE */}
          {tab === "database" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3.5 text-xs text-emerald-200">
                <strong>Hibrit Yerel Depolama Aktif:</strong> Tüm dersleriniz,
                sohbet geçmişiniz ve yüklediğiniz video/ses dosyaları (IndexedDB)
                hiçbir kurulum gerektirmeden tarayıcınızda otomatik kaydedilir.
                İsteğe bağlı olarak cihazlar arası bulut senkronizasyonu için
                aşağıdan Supabase (PostgreSQL + pgvector) bağlayabilirsiniz.
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-300">
                    Supabase Project URL (Opsiyonel)
                  </label>
                  <input
                    type="url"
                    placeholder="https://xyzcompany.supabase.co"
                    value={draftKeys.supabaseUrl}
                    onChange={(e) =>
                      setDraftKeys({ ...draftKeys, supabaseUrl: e.target.value })
                    }
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs font-mono text-white focus:border-amber-500/60 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-300">
                    Supabase Anon Public Key (Opsiyonel)
                  </label>
                  <input
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                    value={draftKeys.supabaseAnonKey}
                    onChange={(e) =>
                      setDraftKeys({
                        ...draftKeys,
                        supabaseAnonKey: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs font-mono text-white focus:border-amber-500/60 focus:outline-none"
                  />
                </div>
              </div>

              {dbResult && (
                <div
                  className={`rounded-xl border p-3 text-xs ${
                    dbResult.ok
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                  }`}
                >
                  {dbResult.message}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={onResetSampleData}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-zinc-400 hover:border-red-500/40 hover:text-red-300 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Örnek Fizik Derslerini Sıfırla</span>
                </button>

                <button
                  type="button"
                  disabled={testingDb}
                  onClick={handleTestDb}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-zinc-200 cursor-pointer"
                >
                  {testingDb && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Kaydet &amp; Supabase Bağlantısını Test Et</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
