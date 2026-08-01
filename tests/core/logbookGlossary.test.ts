import { describe, expect, it } from "vitest";

import { getGameGlossaryEntry, tokenizeGameGlossaryText } from "../../src/ui/gameGlossary";

describe("Logbook glossary copy", () => {
  it("uses a dedicated terse operational tooltip without invented lore", () => {
    const entry = getGameGlossaryEntry("logbook");

    expect(entry).toEqual({
      id: "logbook",
      label: "LOGBOOK",
      aliases: ["LOGBOOK"],
      short: "Hover any word for a brief explanation; left-click it to open the full entry.",
      detail: [
        "Hover any word in the command log for a brief explanation. Left-click it to open the full entry; left-click the title to go back."
      ]
    });
    expect(tokenizeGameGlossaryText("Open the Logbook.")).toContainEqual({
      text: "Logbook",
      glossaryId: "logbook"
    });
    expect([entry?.short, ...(entry?.detail ?? [])].join(" ")).not.toMatch(
      /\b(?:OS|operating system|lore)\b/iu
    );
  });
});
