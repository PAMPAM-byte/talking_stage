import { test, expect } from "@playwright/test";

test("adult onboarding, preferences, refresh, sign out and protected access", async ({ page }) => {
  await page.goto("/onboarding/age");
  await page.getByLabel("I am 18 or older").check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page).toHaveURL(/\/register$/);
  await page.getByRole("button", { name: "Create demo account" }).click();
  await expect(page.getByLabel("Email address")).toHaveAttribute("aria-invalid", "true");
  await page.getByLabel("Email address").fill("person@example.test");
  await page.getByLabel("Password", { exact: true }).fill("ExamplePassword123!");
  await page.getByLabel("I understand the characters are fictional AI and agree to the draft terms.").check();
  await page.getByRole("button", { name: "Create demo account" }).click();
  await expect(page).toHaveURL(/\/onboarding\/assurance$/);
  await page.getByLabel("Simulated verification result").selectOption("pending");
  await page.getByRole("button", { name: "Run verification preview" }).click();
  await expect(page.getByText("Verification pending", { exact: true })).toBeVisible();
  await page.goto("/discover");
  await expect(page).toHaveURL(/\/onboarding\/assurance$/);
  await page.getByLabel("Simulated verification result").selectOption("approved");
  await page.getByRole("button", { name: "Run verification preview" }).click();
  await expect(page).toHaveURL(/\/onboarding\/preferences$/);
  await page.getByLabel("Preferred name").fill("Pampam");
  await page.getByRole("button", { name: "Women", exact: true }).click();
  await page.getByRole("button", { name: "Men", exact: true }).click();
  await page.getByLabel("Conversation language").selectOption("english_pidgin");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page).toHaveURL(/\/onboarding\/complete$/);
  await expect(page.getByText("Women and Men · English with Pidgin", { exact: true })).toBeVisible();
  await page.getByLabel("I understand I’m chatting with fictional AI characters.").check();
  await page.getByRole("button", { name: "Explore characters" }).click();
  await expect(page.getByText("Welcome, Pampam.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Welcome, Pampam.", { exact: true })).toBeVisible();
  const storage = await page.evaluate(() => sessionStorage.getItem("talkingstage:mock-onboarding:v1"));
  expect(storage).not.toContain("person@example.test");
  expect(storage).not.toContain("ExamplePassword123!");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.goto("/discover");
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("underage access, invalid sign-in, recovery expiration and generic acknowledgement", async ({ page }) => {
  await page.goto("/onboarding/age");
  await page.getByLabel("I am under 18").check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "TalkingStage is for adults." })).toBeVisible();
  await page.goto("/discover");
  await expect(page).toHaveURL(/\/onboarding\/age$/);
  await page.goto("/sign-in");
  await page.evaluate(() => sessionStorage.removeItem("talkingstage:mock-onboarding:v1"));
  await page.reload();
  await page.getByLabel("Email address").fill("unknown@example.test");
  await page.getByLabel("Password", { exact: true }).fill("IncorrectPassword!");
  await page.getByRole("button", { name: "Sign in to preview" }).click();
  await expect(page.getByText("The email or password isn't correct.", { exact: true })).toBeVisible();
  await page.goto("/recover");
  await page.getByLabel("Email address").fill("unknown@example.test");
  await page.getByRole("button", { name: "Send recovery link" }).click();
  await expect(page.getByText("Check your inbox", { exact: true })).toBeVisible();
  await page.goto("/recover/complete?reference=expired");
  await page.getByLabel("New password", { exact: true }).fill("SamplePassword123!");
  await page.getByLabel("Confirm new password").fill("SamplePassword123!");
  await page.getByRole("button", { name: "Reset password", exact: true }).click();
  await expect(page.getByText("This recovery link is invalid or has expired. Request a new one.", { exact: true })).toBeVisible();
  await page.goto("/recover/complete?reference=demo-valid");
  await page.getByLabel("New password", { exact: true }).fill("SamplePassword123!");
  await page.getByLabel("Confirm new password").fill("SamplePassword123!");
  await page.getByRole("button", { name: "Reset password", exact: true }).click();
  await expect(page.getByText("Password reset preview complete", { exact: true })).toBeVisible();
});

test("landing, account, and policy layouts are responsive and capture review images", async ({ page }) => {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/", "/onboarding/age", "/sign-in", "/recover", "/terms", "/privacy", "/payment-information", "/support"]) {
      await page.goto(route);
      await expect(page.locator("main")).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.locator(".landing-portrait__image img")).toBeVisible();
    await page.screenshot({ path: `docs/reviews/stage-2/landing-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/onboarding/age");
  await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeEnabled();
  await page.screenshot({ path: "docs/reviews/stage-2/age-390.png", fullPage: true });
  await page.goto("/sign-in");
  await expect(page.getByRole("button", { name: "Sign in to preview" })).toBeEnabled();
  await page.screenshot({ path: "docs/reviews/stage-2/sign-in-390.png", fullPage: true });
});

test("registration drafts and retry survive navigation without storing credentials", async ({ page }) => {
  await page.goto("/onboarding/age");
  await page.getByLabel("I am 18 or older").check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Email address").fill("draft@example.test");
  await page.getByRole("link", { name: "Back", exact: true }).click();
  await page.getByLabel("I am 18 or older").check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByLabel("Email address")).toHaveValue("draft@example.test");
  await page.getByLabel("Password", { exact: true }).fill("SamplePassword123!");
  await page.getByLabel("I understand the characters are fictional AI and agree to the draft terms.").check();
  await page.getByText("Preview response controls", { exact: true }).click();
  await page.getByLabel("Simulated response").selectOption("offline");
  await page.getByRole("button", { name: "Create demo account" }).click();
  await expect(page.getByText("You're offline. Reconnect and try again.", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Email address")).toHaveValue("draft@example.test");
  await page.getByLabel("Simulated response").selectOption("ready");
  await page.getByRole("button", { name: "Create demo account" }).click();
  await expect(page).toHaveURL(/\/onboarding\/assurance$/);
});

test("demo sign-in resumes onboarding and session expiry clears access", async ({ page }) => {
  await page.goto("/sign-in?returnTo=https://example.com");
  await page.getByLabel("Email address").fill("pending@talkingstage.example");
  await page.getByLabel("Password", { exact: true }).fill("TalkingStage123!");
  await page.getByRole("button", { name: "Sign in to preview" }).click();
  await expect(page).toHaveURL(/\/onboarding\/assurance$/);
  await page.goto("/sign-in?returnTo=//example.com");
  await page.getByLabel("Email address").fill("demo@talkingstage.example");
  await page.getByLabel("Password", { exact: true }).fill("TalkingStage123!");
  await page.getByRole("button", { name: "Sign in to preview" }).click();
  await expect(page).toHaveURL(/\/discover$/);
  await page.goto("/session-expired");
  await expect(page.getByText("Your session has expired. Sign in to continue.", { exact: true })).toBeVisible();
  await page.goto("/discover");
  await expect(page).toHaveURL(/\/sign-in$/);
});
