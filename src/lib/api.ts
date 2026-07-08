const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;
const STORAGE_KEY = "sensofon_posters";

export type PosterRecord = {
  id: string;
  type: "social" | "poster";
  title: string;
  fields: Record<string, string>;
  thumbnail: string;
  created_at: string;
};

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readLocal(): PosterRecord[] {
  if (!canUseLocalStorage()) return [];
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeLocal(items: PosterRecord[]) {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }
}

export async function listPosters(): Promise<PosterRecord[]> {
  if (!BASE) return readLocal();
  const res = await fetch(`${BASE}/api/posters`);
  if (!res.ok) throw new Error("Errore nel caricamento");
  return res.json();
}

export async function createPoster(body: {
  type: string;
  title: string;
  fields: Record<string, string>;
  thumbnail: string;
}): Promise<PosterRecord> {
  if (!BASE) {
    const record: PosterRecord = {
      id: `${Date.now()}`,
      type: body.type as "social" | "poster",
      title: body.title,
      fields: body.fields,
      thumbnail: body.thumbnail,
      created_at: new Date().toISOString(),
    };
    const items = [record, ...readLocal()];
    writeLocal(items);
    return record;
  }

  const res = await fetch(`${BASE}/api/posters`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Errore nel salvataggio");
  return res.json();
}

export async function deletePoster(id: string): Promise<void> {
  if (!BASE) {
    writeLocal(readLocal().filter((item) => item.id !== id));
    return;
  }
  const res = await fetch(`${BASE}/api/posters/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Errore nell'eliminazione");
}
