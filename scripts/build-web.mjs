// Builds the static frontend and copies it into the backend's ./web folder, which the backend serves.
// Usage: npm run build:web [-- <target-dir>]   (default target: ../lab-portal-backend/web)
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.resolve(root, process.argv[2] || "../lab-portal-backend/web");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");

const result = spawnSync(process.execPath, [nextBin, "build"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, STATIC_EXPORT: "true", NEXT_PUBLIC_API_URL: "/api" },
});
if (result.status !== 0) process.exit(result.status ?? 1);

fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(path.join(root, "out"), target, { recursive: true });
console.log(`Static frontend copied to ${target}`);
