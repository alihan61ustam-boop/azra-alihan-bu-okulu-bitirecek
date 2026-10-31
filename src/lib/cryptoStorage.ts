import { ApiKeysConfig, GeminiModelId } from "@/types/academic";

const STORAGE_KEY = "azra_alihan_encrypted_keys_v1";
const SALT_PHRASE = "AzraVeAlihanBuOkuluBitirecek::2026::PhysicsVault";

const DEFAULT_KEYS: ApiKeysConfig = {
  geminiApiKey: "",
  geminiModel: "gemini-2.5-flash",
  supabaseUrl: "",
  supabaseAnonKey: "",
  wolframAppId: "",
};

async function deriveAesKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(SALT_PHRASE),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("azra-alihan-academic-salt"),
      iterations: 50000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function saveEncryptedApiKeys(
  config: ApiKeysConfig
): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    if (!window.crypto?.subtle) {
      localStorage.setItem(STORAGE_KEY, btoa(encodeURIComponent(JSON.stringify(config))));
      return;
    }
    const key = await deriveAesKey();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(JSON.stringify(config));
    const cipherBuf = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encoded
    );
    const payload = JSON.stringify({
      v: 1,
      iv: bytesToBase64(iv),
      ct: bytesToBase64(new Uint8Array(cipherBuf)),
    });
    localStorage.setItem(STORAGE_KEY, payload);
  } catch {
    localStorage.setItem(
      STORAGE_KEY,
      btoa(encodeURIComponent(JSON.stringify(config)))
    );
  }
}

export async function loadEncryptedApiKeys(): Promise<ApiKeysConfig> {
  if (typeof window === "undefined") return DEFAULT_KEYS;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_KEYS;

  try {
    if (raw.startsWith("{") && window.crypto?.subtle) {
      const parsed = JSON.parse(raw) as { iv: string; ct: string };
      const key = await deriveAesKey();
      const ivBytes = base64ToBytes(parsed.iv);
      const ctBytes = base64ToBytes(parsed.ct);
      const plainBuf = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: ivBytes as BufferSource },
        key,
        ctBytes as BufferSource
      );
      const decoded = JSON.parse(new TextDecoder().decode(plainBuf));
      return {
        ...DEFAULT_KEYS,
        ...decoded,
        geminiModel: (decoded.geminiModel as GeminiModelId) || "gemini-2.5-flash",
      };
    }
    const fallbackDecoded = JSON.parse(decodeURIComponent(atob(raw)));
    return { ...DEFAULT_KEYS, ...fallbackDecoded };
  } catch {
    return DEFAULT_KEYS;
  }
}
