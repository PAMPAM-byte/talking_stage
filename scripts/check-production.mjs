import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";

// Check actual build output rather than assuming a route guard removes tooling.
async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory() ? files(join(directory, entry.name)) : join(directory, entry.name)))).flat();
}
for (const file of await files(".next/static")) {
  if (!/\.(js|css)$/.test(file)) continue;
  const content = await readFile(file, "utf8");
  for (const marker of ["DEMO-NOT-A-TRANSACTION", "Choose a scenario and load", "lab-mock-controls", "draft-0", "demo-user-a", "Developer review scenarios", "appearanceContinuity", "Chat review controls", "Messages review controls", "Toggle broken photo", "Reset chat preview", "Personal-space review controls", "Payment review controls", "Request policy review controls", "Load request sample"]) assert(!content.includes(marker), `Development tooling found in production: ${file}`);
}

const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3101"], { windowsHide: true, stdio: "pipe" });
let serverOutput = "";
server.stdout.on("data", (data) => { serverOutput += data.toString(); });
server.stderr.on("data", (data) => { serverOutput += data.toString(); });
try {
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    if (server.exitCode !== null) throw new Error(`Production server exited: ${serverOutput}`);
    try { const response = await fetch("http://127.0.0.1:3101"); if (response.ok) { ready = true; break; } } catch { /* Wait for local server readiness. */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert(ready, `Production server did not become ready: ${serverOutput}`);
  const home = await fetch("http://127.0.0.1:3101");
  assert.equal(home.status, 200);
  assert(!(await home.text()).includes("Explore the design system"), "Development entry link is visible in production.");
  const preview = await fetch("http://127.0.0.1:3101/dev/design-system");
  assert.equal(preview.status, 404, "Development preview should be unavailable in production.");
  console.log("Production checks passed: home 200, preview 404, development link/fixtures/tooling excluded.");
} finally {
  server.kill();
}
