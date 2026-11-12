// Regenerates public/gtfs-rt.js from lib/gtfs-realtime.ts so the browser can read official feeds directly.
// Run after changing lib/gtfs-realtime.ts:  node scripts/build-gtfs-client.mjs
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
const esbuild = ["node_modules/esbuild/bin/esbuild", "node_modules/.bin/esbuild"].find(existsSync);
if (!esbuild) throw new Error("esbuild is not installed (it comes with Vite). Run npm ci.");
execFileSync(process.execPath, [esbuild, "lib/gtfs-realtime.ts", "--bundle", "--format=iife", "--global-name=GTFSRT", "--minify", "--banner:js=/* Generated from lib/gtfs-realtime.ts by scripts/build-gtfs-client.mjs. Do not edit. */", "--outfile=public/gtfs-rt.js"], { stdio: "inherit" });
