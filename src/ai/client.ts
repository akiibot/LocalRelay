import type { Scores } from "./features";
let worker: Worker | undefined;
const pending = new Map<
  string,
  {
    resolve: (s: Scores) => void;
    reject: (e: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }
>();
function reset(reason: string) {
  worker?.terminate();
  worker = undefined;
  for (const p of pending.values()) {
    clearTimeout(p.timer);
    p.reject(new Error(reason));
  }
  pending.clear();
}
export function analyzeLocal(text: string): Promise<Scores> {
  return new Promise((resolve, reject) => {
    if (!worker) {
      worker = new Worker(
        new URL("../workers/inference.worker.ts", import.meta.url),
        { type: "module" },
      );
      worker.onerror = () =>
        reset("Local inference worker failed. Use the manual form.");
      worker.onmessage = (e) => {
        const p = pending.get(e.data.id);
        if (!p) return;
        clearTimeout(p.timer);
        pending.delete(e.data.id);
        if (e.data.error) {
          p.reject(new Error(e.data.error));
          reset(e.data.error);
        } else p.resolve(e.data.result as Scores);
      };
    }
    const id = crypto.randomUUID();
    pending.set(id, {
      resolve,
      reject,
      timer: setTimeout(
        () => reset("Local model timed out. Use the manual form."),
        10000,
      ),
    });
    worker.postMessage({ id, text });
  });
}
