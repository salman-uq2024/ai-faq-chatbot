#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const distDir = path.join(cwd, "dist");
const isoDate = new Date().toISOString().split("T")[0];
const zipName = `ai-faq-chatbot-${isoDate}.zip`;
const zipPath = path.join(distDir, zipName);

if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

if (existsSync(zipPath)) {
  rmSync(zipPath);
}

runCommand("npm", ["run", "build"], { cwd });

const itemsToInclude = [
  "src",
  "public",
  "tests",
  "scripts",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "next.config.ts",
  "postcss.config.mjs",
  "eslint.config.mjs",
  "playwright.config.ts",
  ".env.example",
  "README.md",
  ".gitignore",
];

const zipArgs = [
  "-r",
  zipPath,
  ...itemsToInclude,
  "-x",
  "node_modules/*",
  "-x",
  "dist/*",
  "-x",
  "data/*",
  "-x",
  ".next/*",
];

const zipResult = spawnSync("zip", zipArgs, { cwd, stdio: "inherit" });
if (zipResult.status !== 0) {
  throw new Error(`zip command failed with status ${zipResult.status}`);
}

console.log(`\nCreated ${zipPath}`);

function runCommand(command, args, options) {
  const result = spawnSync(command, args, { stdio: "inherit", ...options });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with status ${result.status}`);
  }
}
