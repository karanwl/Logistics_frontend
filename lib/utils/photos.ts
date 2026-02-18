export type PhotoSource = {
  raw: string;
  primary: string;
  fallback?: string;
};

export function normalizePhotoUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    const candidate = typeof item === "string" ? item.trim() : "";
    if (!candidate || seen.has(candidate)) continue;
    seen.add(candidate);
    out.push(candidate);
  }

  return out;
}

export function s3RefToHttps(ref: string): string | null {
  const trimmed = ref.trim();
  if (!trimmed.startsWith("s3://")) return null;

  const body = trimmed.slice("s3://".length);
  const slash = body.indexOf("/");
  if (slash <= 0 || slash === body.length - 1) return null;

  const bucket = body.slice(0, slash);
  const key = body.slice(slash + 1);
  return `https://${bucket}.s3.amazonaws.com/${key}`;
}

export function resolvePhotoUrl(raw: string): string {
  const value = raw.trim();
  if (!value) return value;
  if (value.startsWith("/uploads/")) return `/api-proxy${value}`;

  const s3Url = s3RefToHttps(value);
  return s3Url || value;
}

export function toPhotoSource(rawUrl: string): PhotoSource {
  const raw = rawUrl.trim();
  if (!raw) {
    return { raw, primary: raw };
  }

  if (raw.startsWith("http://")) {
    return { raw, primary: `https://${raw.slice("http://".length)}`, fallback: raw };
  }

  return { raw, primary: resolvePhotoUrl(raw) };
}
