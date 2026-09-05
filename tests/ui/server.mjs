import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../../", import.meta.url));
const fixture = path.join(root, "tests/ui/fixture");
const server = await createServer({
  configFile: false,
  root: fixture,
  plugins: [react()],
  resolve: { alias: [
    { find: /^@\/server\/actions\/.*/, replacement: path.join(fixture, "actions.ts") },
    { find: "next/navigation", replacement: path.join(fixture, "navigation.ts") },
    { find: "next/link", replacement: path.join(fixture, "Link.tsx") },
    { find: "@", replacement: path.join(root, "src") },
  ] },
  css: { postcss: path.join(root, "postcss.config.mjs") },
  server: { host: "127.0.0.1", port: 4174, strictPort: true, fs: { allow: [root] } },
});
await server.listen();
