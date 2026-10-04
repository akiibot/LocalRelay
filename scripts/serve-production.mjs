import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname } from "node:path";
const root = resolve("dist");
const config = JSON.parse(await readFile("vercel.json", "utf8"));
const routes =
  /^\/(?:$|operators(?:\/[^/]+)?$|request\/[^/]+$|reply\/[^/]+$|outbox$|evaluation$|diagnostics$|simulate$|demo$)/;
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".css": "text/css; charset=utf-8",
  ".bin": "application/octet-stream",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};
createServer(async (req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  const headers = config.headers[0].headers;
  for (const h of headers) res.setHeader(h.key, h.value);
  res.setHeader(
    "Cache-Control",
    pathname.startsWith("/assets/")
      ? "public, max-age=31536000, immutable"
      : "public, max-age=0, must-revalidate",
  );
  try {
    let file = resolve(root, "." + decodeURIComponent(pathname));
    if (!file.startsWith(root + "/")) {
      if (pathname === "/") file = root + "/index.html";
      else throw new Error("Invalid path");
    }
    try {
      if (!(await stat(file)).isFile()) throw new Error("Not file");
    } catch {
      if (routes.test(pathname)) file = root + "/index.html";
      else throw new Error("Missing asset");
    }
    const data = await readFile(file);
    res.setHeader(
      "Content-Type",
      types[extname(file)] || "application/octet-stream",
    );
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
}).listen(4173, "127.0.0.1", () =>
  console.log("Production artifact http://127.0.0.1:4173"),
);
