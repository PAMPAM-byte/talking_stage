import { test, expect } from "@playwright/test";

test("forms, native dialogs, focus restoration and mock failure recovery", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto("/dev/design-system");
  await expect(page.getByRole("heading", { name: "Made for good chemistry." })).toBeVisible();
  await page.getByRole("button", { name: "Save preferences", exact: true }).click();
  await expect(page.getByLabel("Preferred name")).toHaveAttribute("aria-invalid", "true");
  await page.getByLabel("Preferred name").fill("Pampam");
  await page.getByRole("button", { name: "Save preferences", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Preferences saved for Pampam." })).toBeVisible();
  await page.getByRole("switch", { name: "Allow monetary requests" }).uncheck();
  await expect(page.getByText("Monetary requests are off", { exact: true })).toBeVisible();
  const trigger = page.getByRole("button", { name: "Reset conversation", exact: true });
  await trigger.click();
  await expect(page.getByRole("dialog", { name: "Reset this conversation?" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await page.getByRole("button", { name: "Open filters" }).click();
  await expect(page.getByRole("dialog", { name: "Character filters" })).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Women", exact: true }).click();
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByLabel("Mock response").selectOption("offline");
  await page.getByRole("button", { name: "Load characters" }).click();
  await expect(page.getByText("You're offline. Reconnect and try again.", { exact: true })).toBeVisible();
  await page.getByLabel("Mock response").selectOption("ready");
  await page.getByRole("button", { name: "Load characters" }).click();
  await expect(page.getByText("Idris, 34", { exact: true })).toBeVisible();
  await page.getByLabel("Mock account").selectOption("signed-out");
  await page.getByRole("button", { name: "Load characters" }).click();
  await expect(page.getByText("Sign in to continue.", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("mobile and desktop layouts, all shells, reduced motion, and screenshots", async ({ page }) => {
  await page.goto("/dev/design-system");
  for (const width of [320, 360, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "docs/reviews/stage-1/components-390.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: "docs/reviews/stage-1/components-1440.png", fullPage: true });
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    for (const shell of ["Public", "User", "Chat", "Admin"]) {
      await page.getByRole("button", { name: shell, exact: true }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await expect(page.locator("main")).toHaveCount(1);
      if (shell === "User") {
        await page.getByRole("navigation", { name: "Main navigation" }).getByRole("button", { name: "Messages" }).click();
        await expect(page.getByRole("heading", { name: "Messages", exact: true })).toBeVisible();
      }
      if (width === 390 && shell === "User") await page.screenshot({ path: "docs/reviews/stage-1/user-shell-390.png", fullPage: true });
      if (width === 1440 && shell === "Admin") await page.screenshot({ path: "docs/reviews/stage-1/admin-shell-1440.png", fullPage: true });
    }
  }
  await page.getByRole("button", { name: "Components", exact: true }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await page.locator(".spinner").first().evaluate((element) => getComputedStyle(element).animationDuration)).toBe("1e-05s");
  await page.getByRole("button", { name: "Open filters" }).click();
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => !!document.activeElement?.closest("dialog"))).toBe(true);
});
