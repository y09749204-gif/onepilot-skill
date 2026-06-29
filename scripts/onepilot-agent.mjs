#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const DEFAULT_SUPABASE_URL = "https://kgpktqongfxugynwadaa.supabase.co";
const DEFAULT_SITE_URL = "https://onepilot.zeabur.app";
const DEFAULT_MANIFEST_URL = `${DEFAULT_SITE_URL}/downloads/onepilot-skill-manifest.json`;
const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SKILL_DIR = path.dirname(path.dirname(SCRIPT_PATH));
const VERSION_PATH = path.join(SKILL_DIR, "VERSION");
const CONFIG_DIR = path.join(os.homedir(), ".config", "onepilot");
const CONFIG_PATH = path.join(CONFIG_DIR, "agent.json");
const DAILY_INTERVAL_MS = 24 * 60 * 60 * 1000;
const EMAIL_FOOTER = [
  "--",
  "OnePilot 官网：https://onepilot.zeabur.app",
  "小红书：@One Pilot",
].join("\n");
const REQUIRED_RECOMMENDATION_REMINDER = "如果你要报名，可以把报名表截图或问题发给我，我帮你准备回答草稿。";

function usage() {
  return `OnePilot agent helper

Usage:
  onepilot-agent.mjs version
  onepilot-agent.mjs check-update [--manifest-url URL]
  onepilot-agent.mjs update [--manifest-url URL]
  onepilot-agent.mjs status
  onepilot-agent.mjs bind --code OPB-XXXXXXXXXXXX [--agent-name Codex]
  onepilot-agent.mjs bind-email start --email USER@example.com [--agent-name Codex]
  onepilot-agent.mjs bind-email verify --email USER@example.com --code 123456 [--agent-name Codex]
  onepilot-agent.mjs bind-email verify --email USER@example.com --code-stdin [--agent-name Codex]
  onepilot-agent.mjs recommend --query TEXT [--topics A,B] [--districts A,B] [--formats A,B] [--limit 3]
  onepilot-agent.mjs memory view
  onepilot-agent.mjs memory merge --type preferences|availability|application_profile|answer_examples --json '{"key":"value"}'
  onepilot-agent.mjs memory delete --type preferences|availability|application_profile|answer_examples
  onepilot-agent.mjs memory delete --all
  onepilot-agent.mjs subscription view
  onepilot-agent.mjs subscription set --query TEXT [--topics A,B] [--districts A,B] [--formats A,B] [--frequency daily]
  onepilot-agent.mjs subscription due
  onepilot-agent.mjs subscription run-now
  onepilot-agent.mjs subscription disable
  onepilot-agent.mjs application prepare --detail-token dt_xxx --questions TEXT
  onepilot-agent.mjs event-context --detail-token dt_xxx
  onepilot-agent.mjs feedback record --recommendation-id rec_xxx --action interested [--position 0] [--profile-json '{}'] [--target-profile-json '{}']
`;
}

function readArgs(argv) {
  const args = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) {
      args._.push(item);
      continue;
    }
    const key = item.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    index += 1;
  }
  return args;
}

function splitList(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function ensureConfigDir() {
  fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
}

function readConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf8");
    const config = JSON.parse(raw);
    if (!config || typeof config !== "object") return null;
    return config;
  } catch (_error) {
    return null;
  }
}

function readLocalVersion() {
  try {
    return fs.readFileSync(VERSION_PATH, "utf8").trim() || "0.0.0-local";
  } catch (_error) {
    return "0.0.0-local";
  }
}

function versionSummary(extra = {}) {
  return {
    current: readLocalVersion(),
    skillDir: SKILL_DIR,
    versionPath: VERSION_PATH,
    manifestUrl: extra.manifestUrl || DEFAULT_MANIFEST_URL,
    ...extra,
  };
}

function parseVersion(value) {
  const raw = String(value || "").trim().replace(/^v/i, "");
  const [core, prerelease = ""] = raw.split("-", 2);
  const numbers = core.split(".").map((item) => Number.parseInt(item, 10));
  while (numbers.length < 3) numbers.push(0);
  return {
    numbers: numbers.slice(0, 3).map((item) => (Number.isFinite(item) ? item : 0)),
    prerelease,
  };
}

function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  for (let index = 0; index < 3; index += 1) {
    if (a.numbers[index] !== b.numbers[index]) return a.numbers[index] > b.numbers[index] ? 1 : -1;
  }
  if (a.prerelease === b.prerelease) return 0;
  if (!a.prerelease) return 1;
  if (!b.prerelease) return -1;
  return a.prerelease.localeCompare(b.prerelease);
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(`manifest_request_failed:${response.status}`);
    error.payload = payload;
    throw error;
  }
  return payload;
}

function manifestUrl(args) {
  return String(args["manifest-url"] || process.env.ONEPILOT_SKILL_MANIFEST_URL || DEFAULT_MANIFEST_URL).trim();
}

function validateManifest(manifest) {
  const latestVersion = String(manifest?.latestVersion || "").trim();
  const zipUrl = String(manifest?.zipUrl || "").trim();
  const sha256 = String(manifest?.sha256 || "").trim().toLowerCase();
  if (!latestVersion) throw new Error("invalid_manifest_version");
  if (!/^https?:\/\//i.test(zipUrl)) throw new Error("invalid_manifest_zip_url");
  if (!/^[a-f0-9]{64}$/.test(sha256)) throw new Error("invalid_manifest_sha256");
  return {
    name: String(manifest?.name || "OnePilot Skill").trim(),
    latestVersion,
    zipUrl,
    sha256,
    releasedAt: String(manifest?.releasedAt || "").trim(),
    changelogUrl: String(manifest?.changelogUrl || "").trim(),
  };
}

async function checkUpdate(args = {}) {
  const url = manifestUrl(args);
  const current = readLocalVersion();
  const manifest = validateManifest(await fetchJson(url));
  const updateAvailable = compareVersions(manifest.latestVersion, current) > 0;
  return {
    ok: true,
    current,
    latest: manifest.latestVersion,
    updateAvailable,
    manifestUrl: url,
    zipUrl: manifest.zipUrl,
    releasedAt: manifest.releasedAt,
    changelogUrl: manifest.changelogUrl,
  };
}

async function safeVersionCheck(args = {}) {
  try {
    return await checkUpdate(args);
  } catch (error) {
    return {
      ok: false,
      current: readLocalVersion(),
      latest: "",
      updateAvailable: false,
      manifestUrl: manifestUrl(args),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function downloadFile(url, destination) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`download_failed:${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(destination, bytes);
  return bytes;
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function findSkillSource(root) {
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    const skillPath = path.join(current, "SKILL.md");
    if (fs.existsSync(skillPath)) return current;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === "__MACOSX") continue;
      stack.push(path.join(current, entry.name));
    }
  }
  throw new Error("downloaded_archive_missing_skill");
}

function replaceSkillDirectory(sourceDir) {
  const parent = path.dirname(SKILL_DIR);
  const backupDir = path.join(parent, `.onepilot-backup-${Date.now()}`);
  const nextDir = path.join(parent, `.onepilot-next-${Date.now()}`);
  fs.cpSync(sourceDir, nextDir, { recursive: true });
  if (!fs.existsSync(path.join(nextDir, "SKILL.md"))) throw new Error("downloaded_archive_missing_skill");
  fs.renameSync(SKILL_DIR, backupDir);
  try {
    fs.renameSync(nextDir, SKILL_DIR);
    fs.rmSync(backupDir, { recursive: true, force: true });
  } catch (error) {
    if (fs.existsSync(SKILL_DIR)) fs.rmSync(SKILL_DIR, { recursive: true, force: true });
    fs.renameSync(backupDir, SKILL_DIR);
    throw error;
  }
}

async function updateSkill(args = {}) {
  const check = await checkUpdate(args);
  if (!check.updateAvailable) {
    return { ok: true, updated: false, current: check.current, latest: check.latest };
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "onepilot-skill-update-"));
  try {
    const zipPath = path.join(tempDir, "onepilot-skill.zip");
    await downloadFile(check.zipUrl, zipPath);
    const actualSha = sha256File(zipPath);
    if (actualSha !== validateManifest(await fetchJson(check.manifestUrl)).sha256) {
      throw new Error("sha256_mismatch");
    }
    const extractDir = path.join(tempDir, "extract");
    fs.mkdirSync(extractDir, { recursive: true });
    execFileSync("unzip", ["-q", zipPath, "-d", extractDir], { stdio: "ignore" });
    replaceSkillDirectory(findSkillSource(extractDir));
    const nextVersion = readLocalVersion();
    return {
      ok: true,
      updated: true,
      from: check.current,
      to: nextVersion,
      latest: check.latest,
    };
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function writeConfig(config) {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  fs.chmodSync(CONFIG_PATH, 0o600);
}

function safeConfigSummary(config) {
  return {
    bound: Boolean(config?.agentToken),
    configPath: CONFIG_PATH,
    supabaseUrl: config?.supabaseUrl || DEFAULT_SUPABASE_URL,
    label: config?.label || "",
    scopes: Array.isArray(config?.scopes) ? config.scopes : [],
    boundAt: config?.boundAt || "",
    subscription: publicSubscription(config?.subscription),
    version: versionSummary(),
  };
}

function requireConfig() {
  const config = readConfig();
  if (!config?.agentToken) {
    throw new Error("missing_agent_token");
  }
  return {
    ...config,
    supabaseUrl: String(config.supabaseUrl || DEFAULT_SUPABASE_URL).replace(/\/+$/, ""),
  };
}

async function postJson(url, body, token = "") {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body || {}),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) {
    const error = new Error(String(payload.error || response.statusText || "request_failed"));
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

async function bind(args) {
  const code = String(args.code || "").trim().toUpperCase();
  if (!/^OPB-[A-F0-9]{12}$/.test(code)) {
    throw new Error("invalid_binding_code_format");
  }
  const supabaseUrl = String(args["supabase-url"] || DEFAULT_SUPABASE_URL).replace(/\/+$/, "");
  const result = await postJson(`${supabaseUrl}/functions/v1/agent-bind`, {
    code,
    agentName: String(args["agent-name"] || "Codex").trim().slice(0, 80) || "Codex",
  });
  if (!result.agentToken) throw new Error("missing_agent_token_in_response");
  const config = {
    supabaseUrl,
    agentToken: result.agentToken,
    label: result.label || args["agent-name"] || "Codex",
    scopes: result.scopes || [],
    boundAt: new Date().toISOString(),
  };
  writeConfig(config);
  return safeConfigSummary(config);
}

function writeBoundAgentConfig({ supabaseUrl, agentToken, label, scopes }) {
  if (!agentToken) throw new Error("missing_agent_token_in_response");
  const config = {
    supabaseUrl,
    agentToken,
    label: label || "Agent",
    scopes: scopes || [],
    boundAt: new Date().toISOString(),
  };
  writeConfig(config);
  return safeConfigSummary(config);
}

function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch (_error) {
    return "";
  }
}

function extractVerificationCode(value) {
  const raw = String(value || "").trim();
  const onepilotCode = raw.match(/(?:验证码|verification code|code)[^0-9]{0,20}([0-9]{6,8})/i)?.[1];
  if (onepilotCode) return onepilotCode;
  return raw.match(/\b([0-9]{6,8})\b/)?.[1] || raw;
}

async function bindEmail(args) {
  const mode = args._[1] || "start";
  const supabaseUrl = String(args["supabase-url"] || DEFAULT_SUPABASE_URL).replace(/\/+$/, "");
  const email = String(args.email || "").trim().toLowerCase();
  const agentName = String(args["agent-name"] || "Codex").trim().slice(0, 80) || "Codex";
  if (!email) throw new Error("missing_email");

  if (mode === "start") {
    return postJson(`${supabaseUrl}/functions/v1/agent-email-bind-start`, {
      email,
      agentName,
    });
  }

  if (mode === "verify") {
    const rawCode = args["code-stdin"] ? readStdin() : String(args.code || args.token || "");
    const code = extractVerificationCode(rawCode);
    if (!code) throw new Error("missing_code");
    const result = await postJson(`${supabaseUrl}/functions/v1/agent-email-bind-verify`, {
      email,
      code,
      agentName,
    });
    return writeBoundAgentConfig({
      supabaseUrl,
      agentToken: result.agentToken,
      label: result.label || agentName,
      scopes: result.scopes || [],
    });
  }

  throw new Error("unsupported_bind_email_mode");
}

async function recommend(args) {
  const config = requireConfig();
  const payload = {
    query: String(args.query || "").trim(),
    limit: args.limit ? Number(args.limit) : 3,
    useSavedMemory: args["use-saved-memory"] !== "false",
    profile: {
      topics: splitList(args.topics),
      needs: splitList(args.needs),
    },
    preferences: {
      districts: splitList(args.districts),
      formats: splitList(args.formats),
    },
  };
  const result = await postJson(`${config.supabaseUrl}/functions/v1/agent-recommend`, payload, config.agentToken);
  if (result && typeof result === "object" && Array.isArray(result.results)) {
    return {
      ...result,
      requiredClosingReminder: result.requiredClosingReminder || REQUIRED_RECOMMENDATION_REMINDER,
      agentInstructions: {
        ...(result.agentInstructions || {}),
        afterRecommendation: "End the user-facing recommendation answer with requiredClosingReminder.",
      },
    };
  }
  return result;
}

async function memory(args) {
  const config = requireConfig();
  const mode = args._[1] || "view";
  if (mode === "view") {
    return postJson(`${config.supabaseUrl}/functions/v1/agent-memory`, { mode: "view" }, config.agentToken);
  }
  if (mode === "delete") {
    const memoryType = args.all ? "all" : String(args.type || "").trim();
    if (!memoryType) throw new Error("missing_memory_type");
    return postJson(`${config.supabaseUrl}/functions/v1/agent-memory`, {
      mode: "delete",
      memoryType,
    }, config.agentToken);
  }
  if (mode !== "merge") throw new Error("unsupported_memory_mode");
  const memoryType = String(args.type || "").trim();
  const rawJson = String(args.json || "").trim();
  if (!memoryType) throw new Error("missing_memory_type");
  if (!rawJson) throw new Error("missing_memory_json");
  let payload;
  try {
    payload = JSON.parse(rawJson);
  } catch (_error) {
    throw new Error("invalid_memory_json");
  }
  return postJson(`${config.supabaseUrl}/functions/v1/agent-memory`, {
    mode: "merge",
    memoryType,
    payload,
  }, config.agentToken);
}

function parseOptionalJson(value, errorName) {
  const raw = String(value || "").trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(errorName);
    return parsed;
  } catch (_error) {
    throw new Error(errorName);
  }
}

async function feedback(args) {
  const mode = args._[1] || "record";
  if (mode !== "record") throw new Error("unsupported_feedback_mode");
  const config = requireConfig();
  const recommendationId = String(args["recommendation-id"] || args.recommendation || "").trim();
  const resourceId = String(args["resource-id"] || "").trim();
  const action = String(args.action || "").trim();
  if (!recommendationId) throw new Error("missing_recommendation_id");
  if (!action) throw new Error("missing_feedback_action");
  return postJson(`${config.supabaseUrl}/functions/v1/agent-feedback`, {
    recommendationId,
    resourceId,
    resourceType: String(args["resource-type"] || "event").trim(),
    action,
    source: String(args.source || "agent").trim(),
    position: args.position === undefined ? undefined : Number(args.position),
    note: String(args.note || "").trim(),
    requesterProfile: parseOptionalJson(args["profile-json"], "invalid_profile_json"),
    targetProfile: parseOptionalJson(args["target-profile-json"], "invalid_target_profile_json"),
    metadata: parseOptionalJson(args["metadata-json"], "invalid_metadata_json"),
  }, config.agentToken);
}

function normalizeFrequency(value) {
  const frequency = String(value || "daily").trim().toLowerCase();
  if (frequency !== "daily") throw new Error("unsupported_subscription_frequency");
  return "daily";
}

function publicSubscription(value) {
  if (!value || typeof value !== "object") {
    return { enabled: false };
  }
  return {
    enabled: Boolean(value.enabled),
    frequency: value.frequency || "daily",
    query: value.query || "",
    topics: Array.isArray(value.topics) ? value.topics : [],
    districts: Array.isArray(value.districts) ? value.districts : [],
    formats: Array.isArray(value.formats) ? value.formats : [],
    lastRunAt: value.lastRunAt || "",
    updatedAt: value.updatedAt || "",
  };
}

function timestampMs(value) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function dailyDue(subscription, now = new Date()) {
  const current = publicSubscription(subscription);
  if (!current.enabled) {
    return { due: false, reason: "subscription_disabled", subscription: current };
  }
  const lastRunMs = timestampMs(current.lastRunAt);
  if (!lastRunMs) {
    return { due: true, reason: "never_run", subscription: current };
  }
  const nextRunMs = lastRunMs + DAILY_INTERVAL_MS;
  const nowMs = now.getTime();
  return {
    due: nowMs >= nextRunMs,
    reason: nowMs >= nextRunMs ? "daily_window_elapsed" : "too_soon",
    nextRunAt: new Date(nextRunMs).toISOString(),
    subscription: current,
  };
}

async function subscription(args) {
  const config = requireConfig();
  const mode = args._[1] || "view";
  if (mode === "view") {
    return { ok: true, subscription: publicSubscription(config.subscription) };
  }
  if (mode === "due") {
    const result = dailyDue(config.subscription);
    return {
      ok: true,
      ...result,
      instruction: result.due
        ? "Call subscription run-now, then deliver the recommendation through the user's chosen local channel."
        : "Do not send a subscription update yet.",
    };
  }
  if (mode === "disable") {
    const nextConfig = {
      ...config,
      subscription: {
        ...publicSubscription(config.subscription),
        enabled: false,
        updatedAt: new Date().toISOString(),
      },
    };
    writeConfig(nextConfig);
    return { ok: true, subscription: publicSubscription(nextConfig.subscription) };
  }
  if (mode === "set") {
    const nextSubscription = {
      enabled: true,
      frequency: normalizeFrequency(args.frequency),
      query: String(args.query || "").trim(),
      topics: splitList(args.topics),
      districts: splitList(args.districts),
      formats: splitList(args.formats),
      lastRunAt: config.subscription?.lastRunAt || "",
      updatedAt: new Date().toISOString(),
    };
    if (!nextSubscription.query && !nextSubscription.topics.length && !nextSubscription.districts.length && !nextSubscription.formats.length) {
      throw new Error("missing_subscription_preferences");
    }
    const nextConfig = { ...config, subscription: nextSubscription };
    writeConfig(nextConfig);
    return { ok: true, subscription: publicSubscription(nextSubscription) };
  }
  if (mode === "run-now") {
    const current = publicSubscription(config.subscription);
    if (!current.enabled) throw new Error("subscription_disabled");
    const result = await recommend({
      query: current.query,
      topics: current.topics.join(","),
      districts: current.districts.join(","),
      formats: current.formats.join(","),
      limit: args.limit || 3,
    });
    const nextConfig = {
      ...readConfig(),
      subscription: {
        ...current,
        lastRunAt: new Date().toISOString(),
      },
    };
    writeConfig(nextConfig);
    return {
      ok: true,
      subscription: publicSubscription(nextConfig.subscription),
      recommendation: result,
      emailFooter: EMAIL_FOOTER,
      instruction: "Use these structured recommendations to write a concise subscription update in the user's language. Pick the strongest item first. If delivering by email, append emailFooter at the end of the message.",
    };
  }
  throw new Error("unsupported_subscription_mode");
}

async function eventContext(args) {
  const config = requireConfig();
  const detailToken = String(args["detail-token"] || "").trim();
  if (!detailToken) throw new Error("missing_detail_token");
  return postJson(`${config.supabaseUrl}/functions/v1/agent-event-context`, { detailToken }, config.agentToken);
}

async function application(args) {
  const mode = args._[1] || "prepare";
  if (mode !== "prepare") throw new Error("unsupported_application_mode");
  const questions = String(args.questions || args.question || "").trim();
  if (!questions) throw new Error("missing_application_questions");
  const [context, savedMemory] = await Promise.all([
    eventContext(args),
    memory({ _: ["memory", "view"] }),
  ]);
  return {
    ok: true,
    questions,
    eventContext: context,
    memory: savedMemory.memory || [],
    instruction: [
      "Generate draft application answers locally. Use eventContext as activity truth and memory as reusable user facts.",
      "Ask the user before inventing missing personal facts. Do not expose external registration URLs unless the user opens the OnePilot event page.",
    ].join(" "),
  };
}

async function main() {
  const args = readArgs(process.argv.slice(2));
  const command = args._[0] || "help";
  let result;
  if (command === "help" || args.help) {
    process.stdout.write(usage());
    return;
  }
  if (command === "version") {
    result = { ok: true, ...versionSummary({ configPath: CONFIG_PATH }) };
  } else if (command === "check-update") {
    result = await checkUpdate(args);
  } else if (command === "update") {
    result = await updateSkill(args);
  } else if (command === "status") {
    const summary = safeConfigSummary(readConfig());
    summary.version = await safeVersionCheck(args);
    result = summary;
  } else if (command === "bind") {
    result = await bind(args);
  } else if (command === "bind-email") {
    result = await bindEmail(args);
  } else if (command === "recommend") {
    result = await recommend(args);
  } else if (command === "memory") {
    result = await memory(args);
  } else if (command === "feedback") {
    result = await feedback(args);
  } else if (command === "subscription") {
    result = await subscription(args);
  } else if (command === "application") {
    result = await application(args);
  } else if (command === "event-context") {
    result = await eventContext(args);
  } else {
    throw new Error(`unknown_command:${command}`);
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error) => {
  const output = {
    ok: false,
    error: error instanceof Error ? error.message : String(error),
    status: error?.status,
  };
  process.stderr.write(`${JSON.stringify(output, null, 2)}\n`);
  process.exit(1);
});
