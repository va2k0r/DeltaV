import {
  createTutorialSpacerRow,
  tutorialLineClassName,
  type TutorialCommandTimelineRow
} from "./rowCore";

export function createTutorialFirstBurnCostRows(
  playerClassName: string
): readonly TutorialCommandTimelineRow[] {
  return [
    {
      parts: [
        { text: "A " },
        { text: "BURN", className: playerClassName },
        { text: " spends ΔV to move a ship between orbits." }
      ],
      className: tutorialLineClassName
    },
    createTutorialSpacerRow("tutorial:first-burn-cost:spacer"),
    {
      parts: [
        {
          text: "All of your ships share one ΔV reserve, so an expensive transfer leaves less available for later movement, EVADE and contested upkeep."
        }
      ],
      className: tutorialLineClassName
    }
  ];
}

export function createTutorialFirstBurnTimeCostRows(
  playerClassName: string
): readonly TutorialCommandTimelineRow[] {
  return [
    createTutorialSpacerRow("tutorial:first-burn-time-cost:lead-spacer"),
    {
      parts: [
        { text: "Every " },
        { text: "BURN", className: playerClassName },
        {
          text: " commits both time and ΔV. Its T+ value is the number of turns before the ship reaches its destination; one Earth-Moon transfer is roughly three days."
        }
      ],
      className: tutorialLineClassName,
      key: "tutorial:first-burn-time-cost"
    },
    {
      parts: [
        {
          text: "The destination marker shows where that orbit will be when the transfer ends, not where it is now. Compare ETA and cost before you confirm."
        }
      ],
      className: tutorialLineClassName,
      key: "tutorial:first-burn-arrival-marker"
    }
  ];
}

export function createTutorialOpeningYearTimelineRows(
  isTutorialActive: boolean,
  turn: number
): readonly TutorialCommandTimelineRow[] {
  if (!isTutorialActive || turn !== 0) {
    return [];
  }

  return [
    {
      parts: [{ text: "2079" }],
      className: "command-console__line--turn",
      key: "tutorial-opening-year"
    }
  ];
}

export function createTutorialShipyardFireWorkChoiceRows(
  playerClassName: string
): readonly TutorialCommandTimelineRow[] {
  return [
    {
      parts: [
        { text: "A ship can either " },
        { text: "FIRE", className: playerClassName },
        { text: " or " },
        { text: "WORK", className: playerClassName },
        {
          text: " in a turn, not both. FIRE is worthwhile when the future pressure on the target matters more than the production you give up now."
        }
      ],
      className: tutorialLineClassName
    }
  ];
}

export function createTutorialShipyardProductionRows(
  playerClassName: string
): readonly TutorialCommandTimelineRow[] {
  return [
    {
      parts: [
        {
          text: "A SHIPYARD stores a disassembled hull and turns five eligible WORK results into one new ship."
        }
      ],
      className: tutorialLineClassName
    },
    {
      parts: [
        {
          text: "When assembly finishes, a reserve crew transfers from the incumbent ship to commission the new hull. Production itself costs no ΔV."
        }
      ],
      className: tutorialLineClassName
    },
    createTutorialSpacerRow(),
    {
      parts: [
        {
          text: "A ship that began the turn at the yard adds 1/5 progress if it remains eligible to WORK. It makes no progress if it "
        },
        { text: "BURN", className: playerClassName },
        { text: "s" },
        { text: ", " },
        { text: "FIRE", className: playerClassName },
        { text: "s" },
        { text: ", " },
        { text: "EVADE", className: playerClassName },
        { text: "s" },
        {
          text: " or becomes CONTESTED. Because progress stays with the yard, leaving a nearly finished hull behind may hand it to an enemy."
        }
      ],
      className: tutorialLineClassName
    },
    createTutorialSpacerRow()
  ];
}

export function createTutorialMandatoryLaunchRows(
  playerClassName: string,
  includeContestPrompt: boolean
): readonly TutorialCommandTimelineRow[] {
  return [
    {
      parts: [
        {
          text: "An orbit can hold one ship from each faction, for a maximum of two ships. Your own ships therefore cannot stack in the same orbit."
        }
      ],
      className: tutorialLineClassName
    },
    createTutorialSpacerRow(),
    {
      parts: [
        {
          text: "At 5/5, the new ship stays at the yard and the incumbent must execute a "
        },
        { text: "BURN", className: playerClassName },
        {
          text: " to another valid destination. Keep enough ΔV and at least one useful route available before the final WORK turn."
        }
      ],
      className: tutorialLineClassName
    },
    ...(includeContestPrompt
      ? [
          createTutorialSpacerRow("tutorial:mandatory-launch-contest-spacer"),
          {
            parts: [
              { text: "BURN", className: playerClassName },
              { text: " to the enemy shipyard to " },
              { text: "CONTEST", className: "command-console__event-contested" },
              {
                text: " it. This stops production immediately and can let you inherit any progress already stored there."
              }
            ],
            className: tutorialLineClassName
          }
        ]
      : [])
  ];
}

export function createTutorialShipyardFirePromptRows(): readonly TutorialCommandTimelineRow[] {
  return [
    {
      parts: [
        { text: "WARNING:", className: "command-console__event-contested" },
        {
          text: " enemy contact. A ship in transit can be targeted through its destination, because FIRE predicts where the target will be when the missile arrives."
        }
      ],
      className: tutorialLineClassName
    },
    {
      parts: [
        { text: "The X marks the target's predicted position at " },
        { text: "impact", className: "command-console__event-contested" },
        {
          text: ", not its current position. Confirm only after checking that ETA still creates useful pressure."
        }
      ],
      className: tutorialLineClassName,
      key: "tutorial:shipyard-fire-impact-marker"
    }
  ];
}

export function createTutorialEnemyContactVictoryRows(): readonly TutorialCommandTimelineRow[] {
  return [
    createTutorialSpacerRow("tutorial:first-enemy-kill-victory:before"),
    {
      parts: [
        {
          text: "You win by remaining the only faction with a credible route to tritium. Protect your own access while denying rivals the plants, ΔV or ships needed to recover theirs."
        }
      ],
      className: tutorialLineClassName,
      key: "tutorial:first-enemy-kill-victory"
    }
  ];
}

export function createTutorialPostVictoryActionRows(
  playerClassName: string
): readonly TutorialCommandTimelineRow[] {
  return [
    createTutorialSpacerRow("tutorial:post-victory-actions:before"),
    {
      parts: [
        {
          text: "Each ship resolves one operational outcome per turn."
        }
      ],
      className: tutorialLineClassName,
      key: "tutorial:post-victory-actions:intro"
    },
    createTutorialSpacerRow("tutorial:post-victory-actions:between-actions"),
    {
      parts: [
        { text: "A ship may " },
        { text: "BURN", className: playerClassName },
        { text: ", " },
        { text: "FIRE", className: playerClassName },
        { text: " or remain in place; if it remains eligible, it will " },
        { text: "WORK", className: playerClassName },
        { text: " automatically. It will also " },
        { text: "EVADE", className: playerClassName },
        { text: " automatically when a missile impacts and the faction can pay." }
      ],
      className: tutorialLineClassName,
      key: "tutorial:post-victory-actions:actions"
    },
    createTutorialSpacerRow("tutorial:post-victory-actions:between-contested"),
    {
      parts: [
        { text: "CONTESTED", className: "command-console__event-contested" },
        { text: " ships cannot " },
        { text: "FIRE", className: playerClassName },
        { text: ", " },
        { text: "WORK", className: playerClassName },
        { text: " or " },
        { text: "EVADE", className: playerClassName },
        {
          text: ". They may stay and preserve the lock, or BURN out; a support ship outside the lock can still FIRE into it."
        }
      ],
      className: tutorialLineClassName,
      key: "tutorial:post-victory-actions:contested"
    }
  ];
}

export function createTutorialPostVictoryAutomaticBehaviorRows(
  playerClassName: string
): readonly TutorialCommandTimelineRow[] {
  return [
    createTutorialSpacerRow("tutorial:post-victory-automatic-behavior:before"),
    {
      parts: [
        { text: "A stationary eligible ship performs " },
        { text: "WORK", className: playerClassName },
        { text: " automatically. When a missile impacts, it instead attempts to " },
        { text: "EVADE", className: playerClassName },
        {
          text: " automatically, paying 1 ΔV per missile. No separate WORK or EVADE order is required."
        }
      ],
      className: tutorialLineClassName,
      key: "tutorial:post-victory-automatic-behavior"
    }
  ];
}

export function createTutorialShipyardContestedRuleRows(
  playerClassName: string
): readonly TutorialCommandTimelineRow[] {
  return [
    {
      parts: [
        { text: "An orbit occupied by ships from two different factions becomes " },
        { text: "CONTESTED", className: "command-console__event-contested" },
        {
          text: ". The ships are locked in the same local fight rather than damaging each other immediately."
        }
      ],
      className: tutorialLineClassName
    },
    createTutorialSpacerRow(),
    {
      parts: [
        { text: "CONTESTED", className: "command-console__event-contested" },
        {
          text: " ships cannot WORK, FIRE or EVADE. Each faction pays 2 ΔV at the start of every turn to keep its ship in the lock."
        }
      ],
      className: tutorialLineClassName
    },
    {
      parts: [
        {
          text: "Shipyard progress pauses but does not reset, so the faction that later controls the yard can continue from the stored value."
        }
      ],
      className: tutorialLineClassName
    },
    {
      parts: [
        { text: "To disengage, " },
        { text: "BURN", className: playerClassName },
        {
          text: " to another orbit after paying upkeep. Holding can still be correct when it denies valuable production or lets an outside support ship attack."
        }
      ],
      className: tutorialLineClassName
    }
  ];
}
