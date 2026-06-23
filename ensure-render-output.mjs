import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const clientDir = join(process.cwd(), "dist", "client");
const distDir = join(process.cwd(), "dist");

if (!existsSync(join(clientDir, "index.html"))) {
  console.warn("No dist/client/index.html found. Skipping Render output normalisation.");
  process.exit(0);
}

mkdirSync(distDir, { recursive: true });
cpSync(clientDir, distDir, { recursive: true, force: true, errorOnExist: false });
writeFileSync(join(distDir, "_redirects"), "/* /index.html 200\n");
writeFileSync(join(clientDir, "_redirects"), "/* /index.html 200\n");
console.log("Render output ready: app available at both dist/ and dist/client/.");
