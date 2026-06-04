// Tiny offline queue for attendance submissions.
// Stored in localStorage and flushed when the browser regains connectivity.

import { upsertAttendance } from "@/lib/attendance.functions";

export type QueuedAttendance = {
  id: string;
  queued_at: number;
  date: string;
  term_id?: string | null;
  class_id: string;
  records: { student_id: string; status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"; note?: string | null }[];
};

const KEY = "attendance_queue_v1";

function read(): QueuedAttendance[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function write(q: QueuedAttendance[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(q));
  window.dispatchEvent(new CustomEvent("attendance-queue-changed"));
}

export function getQueue(): QueuedAttendance[] {
  return read();
}

export function enqueueAttendance(entry: Omit<QueuedAttendance, "id" | "queued_at">) {
  const q = read();
  q.push({ ...entry, id: crypto.randomUUID(), queued_at: Date.now() });
  write(q);
}

export function removeFromQueue(id: string) {
  write(read().filter((e) => e.id !== id));
}

let flushing = false;

export async function flushQueue(): Promise<{ synced: number; failed: number }> {
  if (flushing) return { synced: 0, failed: 0 };
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }
  flushing = true;
  let synced = 0;
  let failed = 0;
  try {
    for (const entry of read()) {
      try {
        await upsertAttendance({
          data: {
            date: entry.date,
            term_id: entry.term_id ?? null,
            records: entry.records,
          },
        });
        removeFromQueue(entry.id);
        synced++;
      } catch (e) {
        console.error("[offline-queue] failed entry", entry.id, e);
        failed++;
      }
    }
  } finally {
    flushing = false;
  }
  return { synced, failed };
}

export function onQueueChange(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener("attendance-queue-changed", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("attendance-queue-changed", handler);
    window.removeEventListener("storage", handler);
  };
}
