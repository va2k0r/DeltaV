import { expect, test, type Page } from "@playwright/test";

const tutorialViewports = [
  { width: 1097, height: 900 },
  { width: 1280, height: 900 }
] as const;

async function expectWorkingTutorial(page: Page): Promise<void> {
  const commandConsole = page.locator(".command-console.is-tutorial");
  await expect(commandConsole).toBeVisible();
  await expect(commandConsole).toContainText("TURN 01");
  await expect(commandConsole).toContainText("PLAYER 50 ΔV");
  await expect(page.locator("body")).not.toContainText("DeltaV could not start");

  const bounds = await commandConsole.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds?.width ?? 0).toBeGreaterThan(250);
  expect(bounds?.height ?? 0).toBeGreaterThan(200);
}

for (const viewport of tutorialViewports) {
  test(`direct tutorial entry stays playable at ${viewport.width}x${viewport.height}`, async ({
    page
  }) => {
    await page.setViewportSize(viewport);
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/?tutorial=1", { waitUntil: "commit" });
    await expectWorkingTutorial(page);
    expect(pageErrors).toEqual([]);
  });
}

test("PLAY TUTORIAL leaves the public site and exposes the tutorial HUD", async ({ page }) => {
  await page.setViewportSize({ width: 1097, height: 900 });
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/", { waitUntil: "commit" });
  await page.getByRole("button", { name: "PLAY TUTORIAL" }).click();

  await expectWorkingTutorial(page);
  await expect(page.locator("body")).not.toHaveClass(/is-deltav-site/u);
  await expect(page.locator(".delta-site")).toBeHidden();
  expect(pageErrors).toEqual([]);
});
