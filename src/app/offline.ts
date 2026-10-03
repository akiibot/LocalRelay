import { registerSW } from "virtual:pwa-register";
import { loadModel } from "../ai/model";
export let updateAvailable = false;
function signalUpdate() {
  updateAvailable = true;
  window.dispatchEvent(new Event("localrelay-update"));
}
function watchRegistration(reg: ServiceWorkerRegistration) {
  if (reg.waiting && navigator.serviceWorker.controller) signalUpdate();
  const watch = () => {
    const installing = reg.installing;
    if (installing)
      installing.addEventListener("statechange", () => {
        if (
          installing.state === "installed" &&
          navigator.serviceWorker.controller
        )
          signalUpdate();
      });
  };
  watch();
  reg.addEventListener("updatefound", watch);
}
let activationRequested = false;
let reloading = false;
function reloadAfterActivation() {
  if (activationRequested && !reloading) {
    reloading = true;
    location.reload();
  }
}
registerSW({
  immediate: true,
  onNeedRefresh: signalUpdate,
  onNeedReload: reloadAfterActivation,
  onRegisteredSW(_url, reg) {
    if (reg) watchRegistration(reg);
  },
});
export async function activateUpdate() {
  activationRequested = true;
  const reg = await navigator.serviceWorker.getRegistration();
  if (reg?.waiting) {
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      reloadAfterActivation,
      { once: true },
    );
    reg.waiting.postMessage({ type: "SKIP_WAITING" });
  } else reloadAfterActivation();
}
export async function checkOffline() {
  if (!("serviceWorker" in navigator) || !("caches" in window))
    throw new Error(
      "This browser cannot prepare offline files. Use Android Chrome over HTTPS.",
    );
  if (!navigator.serviceWorker.controller)
    throw new Error(
      "Preparing offline files: waiting for service-worker control. Retry shortly.",
    );
  const registration = await navigator.serviceWorker.getRegistration();
  if (registration?.waiting) signalUpdate();
  const cached = await caches.match("/offline-assets.json");
  let manifest: {
    version: string;
    assets: { path: string; bytes: number; sha256: string }[];
  };
  if (navigator.onLine) {
    try {
      const response = await fetch("/offline-assets.json", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Readiness manifest unavailable.");
      manifest = await response.clone().json();
      const cache = await caches.open("localrelay-readiness-v1");
      await cache.put("/offline-assets.json", response);
    } catch (e) {
      if (!cached) throw e;
      manifest = await cached.json();
    }
  } else {
    if (!cached)
      throw new Error(
        "Preparation incomplete: readiness manifest is missing. Reconnect and retry.",
      );
    manifest = await cached.json();
  }
  if (!manifest.assets.length) throw new Error("Empty offline asset manifest.");
  for (const asset of manifest.assets) {
    const response = await caches.match(asset.path, { ignoreSearch: true });
    if (!response)
      throw new Error(
        `Preparation incomplete: missing cached asset ${asset.path}. Reconnect and retry.`,
      );
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength !== asset.bytes)
      throw new Error(
        "Cached asset size mismatch. Update/reprepare the application.",
      );
    const hash = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
      (b) => b.toString(16).padStart(2, "0"),
    ).join("");
    if (hash !== asset.sha256)
      throw new Error(
        "Cached asset integrity mismatch. Update/reprepare the application.",
      );
  }
  const model = await loadModel();
  return {
    assets: manifest.assets.length,
    bytes: manifest.assets.reduce((n, a) => n + a.bytes, 0),
    modelVersion: model.metadata.version,
  };
}
