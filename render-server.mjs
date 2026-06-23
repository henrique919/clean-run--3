import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const port = Number(process.env.PORT || 4173);
const rootCandidates = [
  join(process.cwd(), "dist", "client"),
  join(process.cwd(), "dist"),
];
const root = rootCandidates.find((dir) => existsSync(join(dir, "index.html")));

if (!root) {
  console.error("No built app found. Expected dist/client/index.html or dist/index.html. Run npm run build first.");
  process.exit(1);
}

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0] || "/");
  const clean = normalize(decoded).replace(/^([.][.][\\/])+/, "");
  return join(root, clean === "/" ? "index.html" : clean);
}

const server = createServer((req, res) => {
  try {
    let filePath = safePath(req.url || "/");
    if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
      filePath = join(root, "index.html");
    }

    const type = mime[extname(filePath)] || "application/octet-stream";
    res.writeHead(200, { "content-type": type });
    createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error(error);
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end("Server error");
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`CleanRun IQ serving ${root} on port ${port}`);
});
