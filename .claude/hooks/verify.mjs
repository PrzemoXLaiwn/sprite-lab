// Stop hook: before Claude finishes a turn, typecheck + unit tests — but only
// when TypeScript files changed since the last green run. A failure blocks
// the stop (exit 2) and hands the errors back to Claude to fix.
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";

const input = JSON.parse(fs.readFileSync(0, "utf8") || "{}");
// Second stop in a row after a failure: don't loop forever, let the report through
if (input.stop_hook_active) process.exit(0);
process.chdir(process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd());

const run = (cmd) => execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 32 * 1024 * 1024 });

let status;
try {
  status = run("git status --porcelain -- src *.ts *.mts");
} catch {
  process.exit(0); // not a git checkout — nothing to compare against
}
const tsFiles = status.split("\n").filter((l) => /\.(ts|tsx|mts)$/.test(l.trim()));
if (!tsFiles.length) process.exit(0);

// Skip when the exact same changes were already verified
const diff = run("git diff HEAD -- src *.ts *.mts") + tsFiles.join("\n");
const hash = createHash("sha1").update(diff).digest("hex");
const cache = ".claude/.verify-cache";
if (fs.existsSync(cache) && fs.readFileSync(cache, "utf8") === hash) process.exit(0);

const failures = [];
for (const [name, cmd] of [["typecheck", "npx tsc --noEmit -p ."], ["unit tests", "npx vitest run --reporter=dot"]]) {
  try {
    run(cmd);
  } catch (e) {
    const out = `${e.stdout ?? ""}${e.stderr ?? ""}`.replace(/\x1b\[[0-9;]*m/g, "");
    failures.push(`### ${name} failed\n${out.split("\n").filter(Boolean).slice(-40).join("\n")}`);
  }
}

if (failures.length) {
  process.stderr.write(`Verification failed — fix before finishing:\n\n${failures.join("\n\n")}\n`);
  process.exit(2);
}
fs.writeFileSync(cache, hash);
