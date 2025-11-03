const HASH_FALLBACK_PREFIX = "selection";

export async function computeSelectionHash(clipIds: string[]): Promise<string | null> {
  const filtered = clipIds.filter((value) => typeof value === "string" && value.trim().length > 0);
  if (filtered.length === 0) {
    return null;
  }

  const unique = Array.from(new Set(filtered.map((value) => value.trim()))).sort();
  const payload = unique.join("|");

  if (typeof window !== "undefined" && window.crypto?.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(payload);
      const digest = await window.crypto.subtle.digest("SHA-256", data);
      const view = new Uint8Array(digest);
      return Array.from(view)
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
    } catch {
      // fall back to non-cryptographic hash below
    }
  }

  let hash = 0;
  for (let index = 0; index < payload.length; index += 1) {
    hash = (hash * 31 + payload.charCodeAt(index)) >>> 0;
  }
  return `${HASH_FALLBACK_PREFIX}-${hash.toString(16).padStart(8, "0")}`;
}
