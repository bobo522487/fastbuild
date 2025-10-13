import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const workspaceRoot = process.cwd();
const repoRoot = resolve(__dirname, "..");

const candidateEnvFiles = [
  resolve(workspaceRoot, ".env.test.local"),
  resolve(workspaceRoot, ".env.test"),
  resolve(repoRoot, ".env.test.local"),
  resolve(repoRoot, ".env.test"),
  resolve(repoRoot, ".env"),
];

for (const path of candidateEnvFiles) {
  if (existsSync(path)) {
    loadEnv({ path, override: true });
    break;
  }
}

process.env.NODE_ENV ??= "test";
