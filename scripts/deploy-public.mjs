#!/usr/bin/env node
/*
 * Publishes Naviya as a public website on your own Cloudflare account (free plan is enough to start).
 *   npm run deploy:public
 * First run: opens a browser to log in to Cloudflare, creates the "naviya-db" database, builds, sets up
 * tables and deploys. Later runs reuse the same database. Settings: naviya.public.json (no secrets).
 * Optional secret for live traffic:  npm run deploy:public -- --secret NAVIYA_TOMTOM_KEY
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
process.chdir(root);
const wrangler = path.join(root, "node_modules", "wrangler", "bin", "wrangler.js");
const vinext = path.join(root, "node_modules", "vinext", "dist", "cli.js");
const builtConfig = path.join("dist", "server", "wrangler.json");
const step = (text) => console.log(`\n▶ ${text}`);
const fail = (text) => { console.error(`\n✖ ${text}`); process.exit(1); };

if (!existsSync(wrangler) || !existsSync(vinext)) fail("Dependencies are missing. Run `npm ci` first.");
const settings = JSON.parse(readFileSync("naviya.public.json", "utf8"));
if (!/^[a-z0-9-]{1,60}$/.test(settings.workerName || "")) fail('naviya.public.json: "workerName" must be lowercase letters, numbers and dashes.');
if (!/^[a-z0-9-]{1,60}$/.test(settings.databaseName || "")) fail('naviya.public.json: "databaseName" must be lowercase letters, numbers and dashes.');
const customDomains = (settings.customDomains || []).map((d) => String(d).trim().toLowerCase()).filter(Boolean);
for (const d of customDomains) if (!/^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(d)) fail(`naviya.public.json: "${d}" is not a valid domain (write it without https:// or slashes).`);
const vars = Object.fromEntries(Object.entries(settings.vars || {}).filter(([, v]) => typeof v === "string" && v.trim()));

function run(file, args, { capture = false, env = {} } = {}) {
  const result = spawnSync(process.execPath, [file, ...args], { stdio: capture ? ["inherit", "pipe", "pipe"] : "inherit", env: { ...process.env, WRANGLER_SEND_METRICS: "false", ...env }, encoding: "utf8" });
  if (result.error) fail(result.error.message);
  return result;
}
const wr = (args, opts) => run(wrangler, args, opts);
function json(text) { const start = text.search(/[\[{]/); try { return JSON.parse(text.slice(start)); } catch { return null; } }

step("Checking your Cloudflare login");
let who = wr(["whoami"], { capture: true });
if (who.status !== 0 || /not authenticated|You are not logged in/i.test(who.stdout + who.stderr)) {
  console.log("A browser window will open. Log in to Cloudflare (or create a free account) and allow access.");
  if (wr(["login"]).status !== 0) fail("Cloudflare login did not finish.");
}

step(`Finding database "${settings.databaseName}"`);
const findDb = () => (json(wr(["d1", "list", "--json"], { capture: true }).stdout) || []).find((d) => d.name === settings.databaseName);
let db = findDb();
if (!db) {
  console.log("Creating it (first deploy only)…");
  const created = wr(["d1", "create", settings.databaseName], { capture: true });
  if (created.status !== 0) fail("Could not create the database:\n" + created.stderr);
  db = findDb();
}
const databaseId = db?.uuid || db?.database_id || db?.id;
if (!databaseId) fail("Could not read the database ID from Cloudflare.");
console.log(`Using database ${databaseId}`);

step("Building Naviya for public hosting");
const deployEnv = { NAVIYA_PUBLIC_DEPLOY: JSON.stringify({ workerName: settings.workerName, databaseName: settings.databaseName, databaseId, vars, customDomains }) };
if (run(vinext, ["build"], { env: deployEnv }).status !== 0) fail("The build failed. Fix the error above and run again.");
if (!existsSync(builtConfig)) fail(`The build did not produce ${builtConfig}.`);

step("Setting up database tables");
const tablesOut = wr(["d1", "execute", "DB", "--remote", "--config", builtConfig, "--command", "SELECT name FROM sqlite_master WHERE type='table'", "--json"], { capture: true });
const existing = new Set(((json(tablesOut.stdout) || [])[0]?.results || []).map((r) => r.name));
for (const file of readdirSync("drizzle").filter((f) => /^\d{4}_.*\.sql$/.test(f)).sort()) {
  const sql = readFileSync(path.join("drizzle", file), "utf8");
  const firstTable = (sql.match(/CREATE TABLE\s+[`"]?([\w]+)[`"]?/i) || [])[1];
  if (firstTable && existing.has(firstTable)) { console.log(`✓ ${file} already applied`); continue; }
  console.log(`Applying ${file}`);
  if (wr(["d1", "execute", "DB", "--remote", "--config", builtConfig, "--file", path.join("drizzle", file), "--yes"]).status !== 0) fail(`Could not apply ${file}.`);
}

const secretFlag = process.argv.indexOf("--secret");
if (secretFlag > -1) {
  const name = process.argv[secretFlag + 1];
  if (!/^NAVIYA_[A-Z_]+$/.test(name || "")) fail("Usage: npm run deploy:public -- --secret NAVIYA_TOMTOM_KEY");
  step(`Saving secret ${name} (you will be asked to paste it)`);
  if (wr(["secret", "put", name, "--config", builtConfig]).status !== 0) fail("Could not save the secret.");
}

step("Deploying");
// Run interactively so Wrangler can ask questions, such as choosing your workers.dev subdomain on a new account.
if (wr(["deploy", "--config", builtConfig]).status !== 0) {
  fail([
    "Deploy failed. If the message above says you need a workers.dev subdomain:",
    "  1. Open https://dash.cloudflare.com and go to Workers & Pages.",
    "  2. Choose a subdomain name when asked (one time only, e.g. your name).",
    "  3. Run `npm run deploy:public` again.",
  ].join("\n"));
}
console.log(`\n\u2705 Naviya is live. ${customDomains.length ? "Open https://" + customDomains[0] + " (a new domain can take a few minutes to start working)" : "Open the https://\u2026workers.dev address shown above"}.`);
console.log("Run `npm run deploy:public` again after each update.");
