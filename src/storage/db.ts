import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { requestSchema, type RelayRequest } from "../domain/schema";
import { action, expire } from "../domain/state";
interface Store extends DBSchema {
  requests: { key: string; value: RelayRequest };
  preferences: { key: string; value: unknown };
  evaluation: { key: string; value: unknown };
}
let opening: Promise<IDBPDatabase<Store>> | undefined;
export function database() {
  if (!opening)
    opening = openDB<Store>("localrelay", 1, {
      upgrade(db) {
        db.createObjectStore("requests", { keyPath: "id" });
        db.createObjectStore("preferences");
        db.createObjectStore("evaluation");
      },
      blocked() {
        window.dispatchEvent(new Event("storage-blocked"));
      },
      blocking() {
        void opening?.then((db) => db.close());
        opening = undefined;
      },
    });
  return opening;
}
export async function save(r: RelayRequest) {
  const db = await database();
  const next = requestSchema.parse(r);
  const tx = db.transaction("requests", "readwrite");
  const old = await tx.store.get(r.id);
  if (
    old &&
    JSON.stringify(next.events.slice(0, old.events.length)) !==
      JSON.stringify(old.events)
  ) {
    tx.abort();
    await tx.done.catch(() => {});
    throw new Error(
      "This request changed in another tab. Reload before acting.",
    );
  }
  if (
    old &&
    (JSON.stringify(old.card) !== JSON.stringify(next.card) ||
      old.renderedRequest !== next.renderedRequest ||
      old.wireId !== next.wireId ||
      old.modelVersion !== next.modelVersion ||
      old.templateVersion !== next.templateVersion ||
      old.originalText !== next.originalText ||
      old.mode !== next.mode ||
      old.entryMode !== next.entryMode ||
      old.createdAt !== next.createdAt ||
      old.expiresAt !== next.expiresAt ||
      JSON.stringify(old.operatorSnapshot) !==
        JSON.stringify(next.operatorSnapshot))
  ) {
    tx.abort();
    await tx.done.catch(() => {});
    throw new Error("Reviewed snapshots are immutable; create a new revision.");
  }
  await tx.store.put(next);
  await tx.done;
}
export async function list(now = new Date()) {
  const db = await database();
  const values = await db.getAll("requests");
  const records: RelayRequest[] = [];
  for (const value of values) {
    const result = requestSchema.safeParse(value);
    if (!result.success)
      throw new Error(
        "Stored record is incompatible or damaged. Export/review your data before clearing it.",
      );
    if (Date.parse(result.data.deleteAfter) <= now.getTime()) {
      await db.delete("requests", result.data.id);
      continue;
    }
    const r = expire(result.data, now);
    if (r !== result.data) await db.put("requests", r);
    records.push(r);
  }
  return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function remove(id: string) {
  const db = await database();
  await db.delete("requests", id);
}
export async function clearAll() {
  const db = await database();
  const tx = db.transaction(
    ["requests", "preferences", "evaluation"],
    "readwrite",
  );
  for (const store of ["requests", "preferences", "evaluation"] as const)
    await tx.objectStore(store).clear();
  await tx.done;
  window.dispatchEvent(new Event("localrelay-data-cleared"));
}
export async function preference(key: string, value?: unknown) {
  const db = await database();
  if (value !== undefined) await db.put("preferences", value, key);
  return db.get("preferences", key);
}
export function wireId(existing: string[], revision = 1) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let i = 0; i < 100; i++) {
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    const id =
      Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("") +
      `.${revision}`;
    if (!existing.includes(id)) return id;
  }
  throw new Error("Unable to allocate a local request ID.");
}

export async function saveRevision(next: RelayRequest, previousId: string) {
  const db = await database();
  const tx = db.transaction("requests", "readwrite");
  const raw = await tx.store.get(previousId);
  try {
    const previous = requestSchema.parse(raw);
    if (
      next.wireId !==
        previous.wireId.split(".")[0] + "." + (previous.revision + 1) ||
      next.revision !== previous.revision + 1 ||
      next.operatorSnapshot.id !== previous.operatorSnapshot.id
    )
      throw new Error("Revision identity mismatch.");
    if (previous.state === "SUPERSEDED")
      throw new Error("This revision was already superseded.");
    await tx.store.put(requestSchema.parse(next));
    await tx.store.put(action(previous, "supersede"));
    await tx.done;
  } catch (e) {
    tx.abort();
    await tx.done.catch(() => {});
    throw e;
  }
}
