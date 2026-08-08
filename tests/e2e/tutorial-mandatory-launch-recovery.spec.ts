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

async function findNodeTargetByText(page: Page, text: string): Promise<string> {
  const targetKey = await page.locator('.cinematic-label[data-target^="node:"]').evaluateAll(
    (labels, expectedText) =>
      labels
        .map((label) => ({
          targetKey: (label as HTMLElement).dataset["target"] ?? "",
          text: (label.textContent ?? "").toLowerCase()
        }))
        .find(({ text: labelText }) => labelText.includes(String(expectedText).toLowerCase()))
        ?.targetKey ?? null,
    text
  );

  expect(targetKey).not.toBeNull();
  return targetKey ?? "";
}

async function findLatestEnemyBurnDestinationTarget(page: Page): Promise<string> {
  const consoleText = (await page.locator(".command-console.is-tutorial").textContent()) ?? "";
  const matches = [...consoleText.matchAll(/ENEMY[^;]*?BURN from [^;]*? to ([^;]+);/gu)];
  const destinationName = matches.at(-1)?.[1]?.trim();
  expect(destinationName).toBeTruthy();
  return findNodeTargetByText(page, destinationName ?? "");
}

async function findUnoccupiedRouteTargets(
  page: Page,
  excludedTargets: readonly string[]
): Promise<readonly string[]> {
  return page.locator('.cinematic-label[data-target^="node:"]').evaluateAll(
    (labels, exclusions) =>
      labels
        .map((label) => ({
          targetKey: (label as HTMLElement).dataset["target"] ?? "",
          text: (label.textContent ?? "").toLowerCase()
        }))
        .filter(({ targetKey, text }) => {
          return (
            !exclusions.includes(targetKey) &&
            targetKey !== "node:earth_node" &&
            targetKey !== "node:moon_node" &&
            !text.includes("player") &&
            !text.includes("opponent") &&
            (text.includes("barren") || text.includes("tritium") || text.includes("shipyard"))
          );
        })
        .map(({ targetKey }) => targetKey),
    [...excludedTargets]
  );
}

async function queueFirstAllowedRoute(
  page: Page,
  excludedTargets: readonly string[]
): Promise<string> {
  const execute = page.locator(".command-console__execute");
  const candidates = await findUnoccupiedRouteTargets(page, excludedTargets);

  for (const candidate of candidates) {
    await clickCinematicTarget(page, candidate);
    await page.waitForTimeout(80);
    if ((await execute.isVisible()) && (await execute.isEnabled())) {
      return candidate;
    }
  }

  throw new Error("No legal tutorial BURN destination could be queued.");
}

async function clickExecute(page: Page): Promise<void> {
  const execute = page.locator(".command-console__execute");
  await expect(execute).toBeVisible();
  await expect(execute).toBeEnabled();
  await execute.click();
}

test("mandatory launch remains playable after cancel and requeue", async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/?tutorial=1", { waitUntil: "commit" });
  const commandConsole = page.locator(".command-console.is-tutorial");
  await expect(commandConsole).toBeVisible();
  await completeLogbookIntroduction(page);

  await clickCinematicTarget(page, "node:moon_node");
  const tritiumTarget = await findNodeTargetByText(page, "tritium");
  await clickCinematicTarget(page, tritiumTarget);
  await clickExecute(page);

  await expect(commandConsole).toContainText(
    /Fusion torch drives consume tritium|A SHIPYARD stores a disassembled hull/u
  );
  await expect(commandConsole).toContainText("Left-click the destination to confirm the BURN");
  const shipyardTarget = await findNodeTargetByText(page, "shipyard");
  await clickCinematicTarget(page, shipyardTarget);
  await clickExecute(page);

  await expect(commandConsole).toContainText("A SHIPYARD stores a disassembled hull");
  for (let turn = 0; turn < 8; turn += 1) {
    const execute = page.locator(".command-console__execute");
    if (!(await execute.isVisible()) || !(await execute.isEnabled())) {
      break;
    }
    await execute.click();
    await page.waitForTimeout(100);
  }

  await expect(commandConsole).toContainText("Right-click anywhere to enter FIRE");
  await clickCinematicTarget(page, shipyardTarget);
  await page.locator(".cinematic-canvas").click({ button: "right", position: { x: 40, y: 40 } });
  await expect(commandConsole).toContainText("Left-click the target marker");

  const opponentTarget = await findLatestEnemyBurnDestinationTarget(page);
  await clickCinematicTarget(page, opponentTarget);
  await clickExecute(page);

  let handledContestedHold = false;
  for (let step = 0; step < 18; step += 1) {
    const text = (await commandConsole.textContent()) ?? "";
    if (text.includes("At 5/5, the new ship stays at the yard")) {
      break;
    }

    const execute = page.locator(".command-console__execute");
    if ((await execute.isVisible()) && (await execute.isEnabled())) {
      await execute.click();
      await page.waitForTimeout(120);
      continue;
    }

    if (text.includes("To disengage, BURN to another orbit") && !handledContestedHold) {
      const contestedOrigin = await findNodeTargetByText(page, "contested");
      await clickCinematicTarget(page, contestedOrigin);
      const queuedDestination = await queueFirstAllowedRoute(page, [contestedOrigin]);
      await clickCinematicTarget(page, queuedDestination);
      await expect(execute).toBeVisible();
      await expect(execute).toBeEnabled();
      await execute.click();
      handledContestedHold = true;
      continue;
    }

    await page.waitForTimeout(200);
  }

  await expect(commandConsole).toContainText("At 5/5, the new ship stays at the yard");
  const mandatoryExecute = page.locator(".command-console__execute");
  await expect(mandatoryExecute).toBeVisible();
  await expect(mandatoryExecute).toBeDisabled();

  const mandatoryDestination = await queueFirstAllowedRoute(page, [shipyardTarget]);
  await expect(mandatoryExecute).toBeEnabled();
  await clickCinematicTarget(page, mandatoryDestination);
  await expect(mandatoryExecute).toBeDisabled();

  await clickCinematicTarget(page, mandatoryDestination);
  await expect(mandatoryExecute).toBeEnabled();
  const transcriptLengthBeforeLaunch = ((await commandConsole.textContent()) ?? "").length;
  await mandatoryExecute.click();

  for (let turn = 0; turn < 6; turn += 1) {
    await page.waitForTimeout(180);
    if (!(await commandConsole.evaluate((element) => element.classList.contains("is-tutorial")))) {
      break;
    }
    if ((await mandatoryExecute.isVisible()) && (await mandatoryExecute.isEnabled())) {
      await mandatoryExecute.click();
    }
  }

  await expect
    .poll(async () => ((await commandConsole.textContent()) ?? "").length)
    .toBeGreaterThan(transcriptLengthBeforeLaunch);
  const tutorialStillActive = await commandConsole.evaluate((element) =>
    element.classList.contains("is-tutorial")
  );
  if (tutorialStillActive) {
    const liveRows = page.locator(".command-console__live-rows");
    const hasExecutableTurn =
      (await mandatoryExecute.isVisible()) && (await mandatoryExecute.isEnabled());
    const hasActionablePrompt = ((await liveRows.textContent()) ?? "").trim().length > 0;
    expect(hasExecutableTurn || hasActionablePrompt).toBe(true);
  }

  expect(pageErrors).toEqual([]);
});
