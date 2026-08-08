import { expect, test, type Page } from "@playwright/test";

async function completeLogbookIntroduction(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Explain mouse wheel" }).click();
  await page.locator(".command-glossary-detail__tutorial-action").click();
  await page.locator(".command-glossary-detail__label").click();
  await expect(page.locator(".command-console")).toContainText(
    "Left-click the Moon orbit to select the ship."
  );
}

async function clickCinematicTarget(page: Page, targetKey: string): Promise<void> {
  await page.locator(`.cinematic-label[data-target="${targetKey}"]`).dispatchEvent("click");
}

async function findUnoccupiedProductiveTarget(page: Page): Promise<string> {
  const targetKey = await page.locator('.cinematic-label[data-target^="node:"]').evaluateAll(
    (labels) =>
      labels
        .map((label) => ({
          targetKey: (label as HTMLElement).dataset["target"] ?? "",
          description: (label.textContent ?? "").toLowerCase()
        }))
        .find(
          ({ targetKey: candidate, description }) =>
            candidate !== "node:moon_node" &&
            candidate !== "node:earth_node" &&
            !description.includes("opponent") &&
            (description.includes("tritium") || description.includes("shipyard"))
        )?.targetKey ?? null
  );

  expect(targetKey).not.toBeNull();
  return targetKey ?? "";
}

test("opening controls and first BURN remain recoverable after cancellation", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/?tutorial=1", { waitUntil: "commit" });
  const commandConsole = page.locator(".command-console.is-tutorial");
  await expect(commandConsole).toBeVisible();
  await completeLogbookIntroduction(page);

  const canvas = page.locator(".cinematic-canvas");
  const canvasBounds = await canvas.boundingBox();
  expect(canvasBounds).not.toBeNull();
  const centerX = (canvasBounds?.x ?? 0) + (canvasBounds?.width ?? 0) / 2;
  const centerY = (canvasBounds?.y ?? 0) + (canvasBounds?.height ?? 0) / 2;

  await page.mouse.dblclick(centerX, centerY);
  await page.mouse.move(centerX - 160, centerY - 100);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(centerX - 115, centerY - 75, { steps: 5 });
  await page.mouse.up({ button: "right" });
  await page.mouse.move(centerX - 120, centerY + 80);
  await page.mouse.down({ button: "left" });
  await page.mouse.move(centerX - 150, centerY + 55, { steps: 5 });
  await page.mouse.up({ button: "left" });
  await page.mouse.move(centerX, centerY);
  await page.mouse.wheel(0, -360);
  await page.mouse.wheel(0, 360);

  await clickCinematicTarget(page, "node:moon_node");
  await expect(commandConsole).toContainText("Left-click the destination to confirm the BURN");

  const productiveTargetKey = await findUnoccupiedProductiveTarget(page);
  await clickCinematicTarget(page, productiveTargetKey);
  await expect(commandConsole).toContainText("BURN from Moon to");
  await expect(page.locator(".command-console__execute")).toBeVisible();

  await clickCinematicTarget(page, productiveTargetKey);
  await expect(commandConsole).toContainText("PLAYER 50 ΔV -> 50 ΔV");
  await expect(page.locator(".command-console__execute")).toBeHidden();

  await clickCinematicTarget(page, productiveTargetKey);
  await expect(commandConsole).toContainText("BURN from Moon to");
  await page.locator(".command-console__execute").click();

  await expect(commandConsole).toContainText(
    /Fusion torch drives consume tritium|A SHIPYARD stores a disassembled hull/u
  );
  await expect(commandConsole).toContainText("Left-click the destination to confirm the BURN");
  expect(pageErrors).toEqual([]);
});
