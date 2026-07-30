import {
  createTutorialSpacerRow,
  tutorialCompleteHintClassName,
  tutorialLineClassName,
  type TutorialCommandTimelineRow
} from "./rowCore";

export function createTutorialFirstBurnCostRows(
  playerClassName: string
): readonly TutorialCommandTimelineRow[] {
  return [
    {
      parts: [{ text: "BURN", className: playerClassName }, { text: " costs ΔV." }],
      className: tutorialLineClassName
    },
    createTutorialSpacerRow("tutorial:first-burn-cost:spacer"),
    {
      parts: [{ text: "ΔV is a global resource shared among all your ships." }],
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
        { text: " requires time (T=Earth-Moon transfer ~3 days) and ΔV." }
      ],
      className: tutorialLineClassName,
      key: "tutorial:first-burn-time-cost"
    },
    {
      parts: [
        { text: "The arrival marker shows where the destination will be at " },
        { text: "ARRIVAL", className: playerClassName },
        { text: ", not where it is now." }
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
        { text: " in the same turn, not both." }
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
      parts: [{ text: "SHIPYARDS store disassembled hulls." }],
      className: tutorialLineClassName
    },
    {
      parts: [{ text: "Crew splits from active ship to commission them." }],
      className: tutorialLineClassName
    },
    createTutorialSpacerRow(),
    {
      parts: [
        {
          text: "A ship that starts the turn on a SHIPYARD orbit advances Production by 1/5 unless it "
        },
        { text: "BURN", className: playerClassName },
        { text: "s" },
        { text: ", " },
        { text: "FIRE", className: playerClassName },
        { text: "s" },
        { text: ", " },
        { text: "EVADE", className: playerClassName },
        { text: "s" },
        { text: " or becomes CONTESTED." }
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
      parts: [{ text: "An orbit can hold only one ship per faction and a maximum of two ships." }],
      className: tutorialLineClassName
    },
    createTutorialSpacerRow(),
    {
      parts: [
        {
          text: "The faction working a shipyard at 5/5 must execute a "
        },
        { text: "BURN", className: playerClassName },
        {
          text: " to another valid destination or hull assembly progress resets to 0/5."
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
              { text: " toward the enemy shipyard to " },
              { text: "CONTEST", className: "command-console__event-contested" },
              { text: " it." }
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
        { text: " enemy contact. " },
        { text: "Ships in transit can be targeted by firing at their destination." }
      ],
      className: tutorialLineClassName
    },
    {
      parts: [
        { text: "The X marks the target's predicted position at " },
        { text: "IMPACT", className: "command-console__event-contested" },
        { text: ", not its current position." }
      ],
      className: tutorialLineClassName,
      key: "tutorial:shipyard-fire-impact-marker"
    }
  ];
}

export function createTutorialEnemyContactVictoryWarningRows(): readonly TutorialCommandTimelineRow[] {
  return [
    createTutorialSpacerRow("tutorial:first-enemy-kill-victory-warning:before"),
    {
      parts: [{ text: "TUTORIAL COMPLETE. NORMAL MATCH CONTROL RESTORED." }],
      className: tutorialCompleteHintClassName,
      key: "tutorial:first-enemy-kill-handoff"
    },
    createTutorialSpacerRow("tutorial:first-enemy-kill-victory-warning:handoff-spacer"),
    {
      parts: [
        { text: "WARNING:", className: "command-console__event-contested" },
        { text: " enemy contact." }
      ],
      className: tutorialLineClassName
    },
    createTutorialSpacerRow("tutorial:first-enemy-kill-victory-warning:spacer"),
    {
      parts: [
        { text: "Remain the last faction with operational tritium extracting capabilities." }
      ],
      className: tutorialLineClassName
    }
  ];
}

export function createTutorialPostVictoryActionRows(
  playerClassName: string
): readonly TutorialCommandTimelineRow[] {
  return [
    createTutorialSpacerRow("tutorial:post-victory-actions:before"),
    {
      parts: [{ text: "Every ship can act once every turn." }],
      className: tutorialLineClassName,
      key: "tutorial:post-victory-actions:intro"
    },
    createTutorialSpacerRow("tutorial:post-victory-actions:between-actions"),
    {
      parts: [
        { text: "Either " },
        { text: "BURN", className: playerClassName },
        { text: ", " },
        { text: "FIRE", className: playerClassName },
        { text: ", " },
        { text: "WORK", className: playerClassName },
        { text: " or " },
        { text: "EVADE", className: playerClassName },
        { text: "." }
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
        { text: "." }
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
        { text: "Ships will automatically " },
        { text: "EVADE", className: playerClassName },
        { text: " or " },
        { text: "WORK", className: playerClassName },
        { text: " to extract Tritium or advance production if they don't " },
        { text: "BURN", className: playerClassName },
        { text: " or " },
        { text: "FIRE", className: playerClassName },
        { text: "." }
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
        { text: "." }
      ],
      className: tutorialLineClassName
    },
    createTutorialSpacerRow(),
    {
      parts: [
        { text: "CONTESTED", className: "command-console__event-contested" },
        {
          text: " orbits cannot extract Tritium or advance production. Both factions must each spend 2 ΔV at the beginning of the turn or lose their ship."
        }
      ],
      className: tutorialLineClassName
    },
    {
      parts: [
        {
          text: "Shipyard progress will not reset, the faction holding the orbit at 5/5 will launch a new ship."
        }
      ],
      className: tutorialLineClassName
    },
    {
      parts: [
        { text: "To disengage, " },
        { text: "BURN", className: playerClassName },
        { text: " to any other orbit." }
      ],
      className: tutorialLineClassName
    }
  ];
}
