import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";

// Check actual build output rather than assuming a route guard removes tooling.
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const serverSecrets = ['AUTH_FLOW_SECRET', 'SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'OPENAI_API_KEY'].map(name => process.env[name]).filter(value => value && value.length >= 16);
async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory() ? files(join(directory, entry.name)) : join(directory, entry.name)))).flat();
}
for (const file of await files(".next/static")) {
  if (!/\.(js|css)$/.test(file)) continue;
  const content = await readFile(file, "utf8");
  for (const secret of serverSecrets) assert(!content.includes(secret), `Server secret found in client output: ${file}`);
  for (const marker of ['https://api.openai.com/v1/responses','talkingstage_reply','talkingstage_summary','Published character direction (subordinate to these product rules)']) assert(!content.includes(marker), `Private AI integration found in client output: ${file}`);
  // The real editor's field label is public UI vocabulary, not private content.
  for (const marker of ["DEMO-NOT-A-TRANSACTION", "Choose a scenario and load", "lab-mock-controls", "draft-0", "demo-user-a", "Developer review scenarios", "appearanceContinuity", "Chat review controls", "Messages review controls", "Toggle broken photo", "Reset chat preview", "Personal-space review controls", "Payment review controls", "Request policy review controls", "Load request sample", "Administration review controls", "Open selected preview", "sample-report-pressure", "SYNTHETIC PRIVATE STAGE9 DIRECTION"]) assert(!content.includes(marker), `Development tooling or private direction found in production: ${file}`);
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
  for (const path of ["/admin", "/admin/access", "/admin/characters/char-amara", "/admin/reports/sample-report-pressure"]) {
    const admin = await fetch("http://127.0.0.1:3101" + path); const html = await admin.text();
    assert.equal(admin.status, 200); assert(html.includes("Account services are unavailable") || admin.url.endsWith("/sign-in"), "Production admin must require a real configured account.");
    assert(!html.includes("Appearance and continuity") && !html.includes("Private character direction"), "Private instructions leaked into production admin HTML.");
  }
  for (const path of ["/discover", "/messages", "/settings", "/payments/demo-payment"]) {
    const privatePage = await fetch("http://127.0.0.1:3101" + path, { headers: { Cookie: "talkingstage:mock-onboarding:v1=adult; ts-adult=forged" } });
    const html = await privatePage.text();
    assert(html.includes("Account services are unavailable") || privatePage.url.endsWith("/sign-in"), "Private routes must fail closed without real authentication.");
    assert(!html.includes("Frontend preview · fictional adult AI characters"), "Private mock workspace was rendered in production.");
  }
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
    const page = await browser.newPage();
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      for (const path of ["/onboarding/age", "/sign-in", "/recover", "/auth/error", "/discover"]) {
        await page.goto("http://127.0.0.1:3101" + path);
        assert.equal(await page.locator("main").count(), 1);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path} overflows at ${width}px`);
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("http://127.0.0.1:3101/onboarding/age");
    assert.equal(await page.getByRole("checkbox", { name: "I am 18 or older" }).isChecked(), false);
    await page.screenshot({ path: `docs/reviews/stage-8/age-${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'unconfigured'}-390.png`, fullPage: true });
    await page.getByRole("button", { name: "I am under 18" }).click();
    await page.getByText("You can return when you are eligible.").waitFor();
    assert.equal(await page.getByRole("checkbox", { name: "I am 18 or older" }).count(), 0);
    await page.goto("http://127.0.0.1:3101/sign-in");
    const unavailable = await page.getByText("Account services are unavailable", { exact: true }).count() > 0;
    assert.equal(await page.getByRole("button", { name: "Sign in", exact: true }).isDisabled(), unavailable);
    await page.screenshot({ path: `docs/reviews/stage-8/sign-in-${unavailable ? 'unconfigured' : 'configured'}-390.png`, fullPage: true });
    assert.deepEqual(errors, [], "Production account screens have browser errors");
  } finally { await browser.close(); }
  console.log("Production checks passed: development exclusions, private-route denial and responsive account UI.");
} finally {
  server.kill();
}
