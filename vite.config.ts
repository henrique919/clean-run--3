// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro,
//     componentTagger, VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection.
//
// Outside Lovable, Nitro is skipped unless forced. Render needs the Nitro node
// server output so the app can serve SSR routes instead of returning plain
// "Not Found" from a static publish directory.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  nitro: {
    preset: "node-server",
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    server: { entry: "server" },
  },
});
