import { astronomicalGlossaryEntries } from "./astronomicalGlossary";
import { worldLoreGlossaryEntries } from "./worldLoreGlossary";

export type GameGlossaryEntry = Readonly<{
  id: string;
  label: string;
  aliases: readonly string[];
  short: string;
  detail: readonly string[];
  advice?: readonly string[];
}>;

export type GameGlossaryTextToken = Readonly<{
  text: string;
  glossaryId?: string;
}>;

export const gameGlossaryHoverDwellMs = 480;
export const gameGlossaryHoverReleaseMs = 180;
export const gameGlossaryTypewriterMsPerCharacter = 7.5;
export const gameGlossaryTypewriterMinDurationMs = 240;
export const gameGlossaryTypewriterMaxDurationMs = 1_650;
export const gameGlossaryDetailMsPerCharacter = 3.2;
export const gameGlossaryDetailMinDurationMs = 96;
export const gameGlossaryDetailMaxDurationMs = 520;

const mechanicGlossaryEntries = [
  {
    id: "logbook",
    label: "LOGBOOK",
    aliases: ["LOGBOOK"],
    short: "Hover any word for a brief explanation; left-click it to open the full entry.",
    detail: [
      "Hover any word in the command log for a brief explanation. Left-click it to open the full entry; left-click the title to go back."
    ]
  },
  {
    id: "burn-out",
    label: "BURN OUT",
    aliases: ["BURN OUT", "BURNS OUT", "BURNED OUT"],
    short: "Use an ordinary BURN to leave the current orbit, including a contested lock.",
    detail: [
      "BURN OUT is not a separate command: choose a valid destination and confirm a normal BURN. The ship pays the transfer cost and leaves its orbit.",
      "Departing ends a contested lock and breaks every firing solution aimed at that ship. It is the reliable escape, provided you reserved enough ΔV to use it."
    ]
  },
  {
    id: "mandatory-launch",
    label: "MANDATORY LAUNCH",
    aliases: ["MANDATORY LAUNCH", "MANDATORY LAUNCHES"],
    short: "When a shipyard finishes a hull, its incumbent ship must BURN to make room.",
    detail: [
      "After five eligible WORK turns, the new ship remains at the shipyard while the incumbent must BURN to another valid destination.",
      "This departure resolves before missile impacts and ordinary arrivals. Plan the final WORK turn with enough ΔV and a useful route, or production can leave you with a forced loss."
    ]
  },
  {
    id: "firing-solution",
    label: "FIRING SOLUTION",
    aliases: ["FIRING SOLUTION", "FIRING SOLUTIONS", "MISSILE SOLUTION", "MISSILE SOLUTIONS"],
    short: "A delayed missile attack tied to one predicted target ship and impact time.",
    detail: [
      "FIRE does not deal immediate damage. It creates a firing solution whose ETA follows the same orbital timing model used by an equivalent BURN.",
      "The solution follows that ship until impact, unless the target BURNS and breaks it. EVADE can absorb the impact, but other future solutions remain active.",
      "A useful solution threatens future ΔV and WORK. Several timed solutions can be stronger than one isolated shot because the target must keep paying, moving or giving up production."
    ]
  },
  {
    id: "tritium-access",
    label: "tritium access",
    aliases: ["TRITIUM ACCESS"],
    short: "A faction can still produce TRITIUM or can realistically regain access soon.",
    detail: [
      "A faction retains tritium access while it can operate a tritium plant, reach one, contest one or use imminent shipyard output to restore that route.",
      "Victory depends on this practical access rather than current ownership alone. A temporary retreat is survivable if ships and ΔV still make recovery credible."
    ]
  },
  {
    id: "tritium-collapse",
    label: "tritium collapse",
    aliases: ["TRITIUM COLLAPSE"],
    short: "The match ends when only one faction retains a credible route to tritium.",
    detail: [
      "Tritium collapse is not a score threshold or a count of occupied orbits. It occurs when every rival has lost any plausible short-term route to produce or contest TRITIUM.",
      "The check considers ships, shared ΔV, active transfers, nearby routes and imminent shipyard output. Denying recovery can therefore be more decisive than taking another empty orbit."
    ]
  },
  {
    id: "left-click",
    label: "LEFT CLICK",
    aliases: ["LEFT CLICK", "LEFT-CLICK"],
    short: "Select a target, or confirm the valid order currently shown in preview.",
    detail: [
      "A single LEFT CLICK selects a ship or orbit. If a valid BURN or FIRE preview is already visible, the same gesture confirms and queues that order.",
      "Queued commands appear in the log before EXECUTE, so you can still inspect their destination, ETA and projected ΔV cost before committing the turn."
    ]
  },
  {
    id: "right-click",
    label: "RIGHT CLICK",
    aliases: ["RIGHT CLICK", "RIGHT-CLICK"],
    short: "Enter FIRE mode with a click, or orbit the camera by dragging the right button.",
    detail: [
      "A stationary RIGHT CLICK enters FIRE mode when the selected ship is allowed to fire. Holding and dragging the same button orbits the camera instead.",
      "The gesture changes only your planning context until you confirm a target; merely entering FIRE mode never queues a shot."
    ]
  },
  {
    id: "double-click",
    label: "DOUBLE CLICK",
    aliases: ["DOUBLE CLICK", "DOUBLE-CLICK"],
    short: "Centre the camera on a visible body, orbit, ship or trajectory.",
    detail: [
      "DOUBLE CLICK changes camera focus without issuing an order or altering the simulation. Use a single LEFT CLICK when you mean to select.",
      "Focusing a moving body can make routes easier to read, but it never changes their cost, ETA or legality."
    ]
  },
  {
    id: "mouse-wheel",
    label: "MOUSE WHEEL",
    aliases: ["MOUSE WHEEL", "WHEEL"],
    short: "Move the camera closer to or farther from its focus or the screen centre.",
    detail: [
      "The MOUSE WHEEL controls camera distance only. Transfer and firing calculations remain identical at every visual scale.",
      "Zoom out to compare routes and threats; zoom in when overlapping markers make a selection difficult."
    ]
  },
  {
    id: "camera",
    label: "CAMERA",
    aliases: ["CAMERA"],
    short: "Your viewpoint on the map; camera movement cannot alter a simulation result.",
    detail: [
      "The CAMERA controls focus, distance, orbit and pan, while ships and bodies keep their simulated positions independently.",
      "Changing the view can improve your reading of the map, but it never changes range, ΔV, ETA, order legality or resolution."
    ]
  },
  {
    id: "zoom",
    label: "ZOOM",
    aliases: ["ZOOM", "ZOOMS", "ZOOMED", "ZOOMING"],
    short: "Change camera distance toward the current focus or screen centre.",
    detail: [
      "ZOOM changes only the visual scale. It cannot alter orbit geometry, BURN cost, FIRE timing or the selected gameplay target.",
      "Use a wider view for route comparison and a closer view for precise interaction."
    ]
  },
  {
    id: "pan",
    label: "PAN",
    aliases: ["PAN", "PANS", "PANNED", "PANNING"],
    short: "Move the viewed region without moving any body or ship in the simulation.",
    detail: [
      "PAN shifts the camera across the map while every simulated position remains unchanged.",
      "Drag with the left button to pan. A stationary LEFT CLICK still selects or confirms, so release without dragging when you intend to act."
    ]
  },
  {
    id: "focus",
    label: "FOCUS",
    aliases: ["FOCUS", "FOCUSES", "FOCUSED", "FOCUSING"],
    short: "Make one visible target the centre followed by the camera.",
    detail: [
      "FOCUS belongs to the camera, not to the simulation. DOUBLE CLICK assigns it to a visible body, orbit, ship or trajectory.",
      "A moving focused body remains centred as TURN animation advances, which helps you follow a local engagement without changing its outcome."
    ]
  },
  {
    id: "select",
    label: "SELECT",
    aliases: ["SELECT", "SELECTS", "SELECTED", "SELECTING", "SELECTION"],
    short: "Choose the ship, orbit or command that your next input will address.",
    detail: [
      "SELECT establishes the current interaction context but does not spend ΔV or resolve an action.",
      "A selected ship exposes legal BURN or FIRE previews. Only a later confirmation queues the order, so you can inspect alternatives safely."
    ]
  },
  {
    id: "confirm",
    label: "CONFIRM",
    aliases: ["CONFIRM", "CONFIRMS", "CONFIRMED", "CONFIRMING"],
    short: "Turn the currently visible valid preview into a queued order.",
    detail: [
      "CONFIRM records the previewed origin, destination or target, cost and ETA in the current plan.",
      "The order remains pending until EXECUTE. Read the projected ΔV and log entry before committing if several ships draw from the same reserve."
    ]
  },
  {
    id: "transfer",
    label: "TRANSFER",
    aliases: ["TRANSFER", "TRANSFERS", "TRANSIT", "DEPARTURE", "DEPARTURES"],
    short: "The deterministic interval between a BURN departure and its destination.",
    detail: [
      "A TRANSFER begins when BURN spends ΔV and the ship leaves its origin. The ship reaches its destination at the displayed T+ETA.",
      "FIRE uses the equivalent travel model for missile timing. Compare the two clocks when deciding whether movement will escape or meet a threat."
    ]
  },
  {
    id: "destination",
    label: "DESTINATION",
    aliases: ["DESTINATION", "DESTINATIONS"],
    short: "The orbit a BURN will reach or a firing solution predicts for its target.",
    detail: [
      "A DESTINATION must satisfy the current route, occupancy, protection and ΔV rules before it can be confirmed.",
      "Selecting a destination previews the result without commitment. Check its future position and timing, because the body continues moving during the transfer."
    ]
  },
  {
    id: "origin",
    label: "ORIGIN",
    aliases: ["ORIGIN", "ORIGINS"],
    short: "The orbit or transfer state from which the active ship issues an order.",
    detail: [
      "The ORIGIN supplies the starting geometry and gravity modifier used to calculate a route.",
      "A queued order remains attached to the ship that issued it. Another ship at a different origin may see a different cost and ETA for the same destination."
    ]
  },
  {
    id: "route",
    label: "ROUTE",
    aliases: ["ROUTE", "ROUTES"],
    short: "The legal connection currently used to calculate transfer cost and ETA.",
    detail: [
      "A ROUTE is calculated from the current orbital state; the visible trajectory is only its presentation.",
      "As bodies move, the same pair of orbits can produce a different cost or ETA. Timing a BURN well can preserve ΔV for survival and later operations."
    ]
  },
  {
    id: "crew",
    label: "CREW",
    aliases: ["CREW"],
    short: "The people operating a ship, including reserve teams assigned to future hulls.",
    detail: [
      "Ships are manned because automation can reduce the watch but cannot assume legal responsibility for lethal release.",
      "An independent complement needs at least twelve people across command, flight, reactor, weapons, systems and medicine.",
      "A typical opening ship carries four complements, or 48 people: one active complement and three reserve crews for expected shipyard output.",
      "Reserve teams share the parent ship's life support until commissioning. CREW has no separate statistic, but SIGNAL LOST means those people were not recovered."
    ]
  },
  {
    id: "hull",
    label: "HULL",
    aliases: ["DISASSEMBLED HULLS", "DISASSEMBLED HULL", "HULL", "HULLS", "DISASSEMBLED"],
    short: "A disassembled ship body that a shipyard completes through five WORK steps.",
    detail: [
      "Shipyards store pressure sections, docking spines, radiators and drive modules as protected subassemblies. Each eligible WORK mates and tests more of them.",
      "At 5/5 the hull becomes an ordinary ship. The incumbent supplies its crew, fuel canisters and command keys during commissioning.",
      "HULL describes what the yard is assembling; players do not manage hulls as a separate inventory."
    ]
  },
  {
    id: "resource",
    label: "RESOURCE",
    aliases: ["RESOURCE", "RESOURCES"],
    short:
      "A quantity that can be produced or spent; current command accounting exposes global ΔV.",
    detail: [
      "Command accounting does not ask you to move cargo or maintain a separate inventory aboard each ship.",
      "Eligible WORK at a tritium plant adds to the faction-wide ΔV reserve, which every ship then uses for movement, survival and contested upkeep."
    ]
  },
  {
    id: "cost",
    label: "COST",
    aliases: ["COST", "COSTS", "COSTING"],
    short: "The ΔV removed from the faction-wide reserve when an action or obligation resolves.",
    detail: [
      "BURN pays at departure, EVADE at impact and CONTESTED upkeep at the start of the turn. These obligations all draw from the same reserve.",
      "FIRE and completed ship production cost zero ΔV, but FIRE still gives up that ship's WORK. A zero fuel cost is therefore not a free strategic choice."
    ]
  },
  {
    id: "execute",
    label: "EXECUTE",
    aliases: ["EXECUTE", "EXECUTED", "EXECUTES"],
    short: "Commit every queued order and resolve the current turn in a fixed phase order.",
    detail: [
      "EXECUTE locks the current plan and advances one deterministic TURN. Before committing, make sure projected ΔV still covers the survival costs you expect.",
      "Resolution pays contested upkeep first, then moves mandatory launches, resolves missile impacts and EVADE, handles arrivals, and finally resolves ordinary actions and the economy.",
      "The log reports events in this same causal order, so an earlier entry can explain why a later action failed or never occurred."
    ]
  },
  {
    id: "contested",
    label: "CONTESTED",
    aliases: ["CONTESTED", "CONTEST", "CONTESTS", "CONTESTING"],
    short:
      "Opposing ships share one orbit, locking each other down while both factions pay upkeep.",
    detail: [
      "CONTESTED means one ship from each faction occupies the same orbit. It is a physical lock rather than immediate damage, and neither side can add another ship there.",
      "Each faction pays 2 ΔV at the start of every turn. The locked ships cannot WORK, FIRE or EVADE; they may only STAY or BURN OUT.",
      "The ships circle for each other's blind angle while an outside support ship can add a second attack vector. A same-turn arrival creates the lock only after missile impacts, so it cannot block an EVADE that already resolved."
    ]
  },
  {
    id: "evade",
    label: "EVADE",
    aliases: ["EVADE", "EVADES", "EVADED", "EVADING"],
    short: "Automatic survival at impact: pay 1 ΔV per incoming missile or lose the ship.",
    detail: [
      "EVADE is automatic rather than a preventive order. When a missile reaches a non-CONTESTED ship, the faction pays 1 ΔV for that impact and the ship survives.",
      "Several missiles arriving in the same turn each demand payment. If the next 1 ΔV is unavailable, or the target is already CONTESTED, that missile destroys the ship.",
      "An evading ship cannot WORK that turn, and later firing solutions remain active. EVADE also resolves before same-turn arrivals, so reserve ΔV for every known impact instead of relying on late support."
    ]
  },
  {
    id: "fire",
    label: "FIRE",
    aliases: ["FIRE", "FIRES", "FIRED", "FIRING"],
    short: "Give up this ship's WORK to create a delayed missile threat at zero ΔV cost.",
    detail: [
      "FIRE costs zero ΔV but consumes the ship's action, so a productive ship gives up WORK for that turn. A CONTESTED ship cannot FIRE.",
      "The order launches one delayed missile and creates a firing solution; it deals no immediate damage and uses the same timing model as an equivalent BURN.",
      "At impact, the target must pay for EVADE, lose its WORK, move earlier or be destroyed. BURNING away before impact breaks every firing solution attached to that ship."
    ]
  },
  {
    id: "burn",
    label: "BURN",
    aliases: ["BURN", "BURNS", "BURNED", "BURNING"],
    short: "Move a ship by spending shared ΔV now and waiting for the displayed transfer ETA.",
    detail: [
      "BURN requires an origin, a legal destination and a current route. Its cost includes the route and origin gravity modifier, paid from global faction ΔV at departure.",
      "The deterministic ETA is usually T+2 to T+7. The ship cannot WORK or FIRE on departure, and after arrival it must wait until the following turn before it can WORK.",
      "Departure breaks every firing solution aimed at the ship. A CONTESTED ship can also escape this way after paying that turn's upkeep and the normal transfer cost."
    ]
  },
  {
    id: "work",
    label: "WORK",
    aliases: ["WORK", "WORKS", "WORKED", "WORKING"],
    short: "The automatic productive outcome when an eligible ship takes no conflicting action.",
    detail: [
      "WORK happens automatically when a ship began the turn at an operating tritium plant or shipyard, remains uncontested and neither BURNS, FIRES nor EVADES.",
      "A tritium plant adds +2 ΔV, while a shipyard advances by 1/5. You issue no WORK order, but a ship that arrives during the turn must wait until the next one.",
      "An enemy that contests the orbit before the economy phase stops production. Every BURN or FIRE by a worker therefore includes the output surrendered that turn."
    ]
  },
  {
    id: "stay",
    label: "STAY",
    aliases: ["STAY", "STAYS", "STAYED", "STAYING"],
    short: "Remain in the current orbit instead of issuing a movement order this turn.",
    detail: [
      "STAY leaves the ship in place. Outside CONTESTED, an otherwise eligible ship will automatically WORK without another command.",
      "Inside CONTESTED, staying preserves the lock and costs upkeep but permits no productive or offensive action. Hold only when denying the orbit is worth the continuing ΔV."
    ]
  },
  {
    id: "delta-v",
    label: "ΔV",
    aliases: ["ΔV", "DELTA-V", "DELTA V"],
    short: "The faction-wide reserve used for movement, evasion and contested upkeep.",
    detail: [
      "ΔV belongs to the faction rather than individual ships. Every BURN draws from the same reserve used by automatic EVADE and CONTESTED upkeep.",
      "WORK at tritium plants replenishes it. A legal order can still be strategically unaffordable if it leaves another ship unable to evade or maintain a vital lock."
    ]
  },
  {
    id: "dv-chart",
    label: "ΔV TREND",
    aliases: [],
    short:
      "Up to four previous reserve samples plus the live visible-commitment projection; open the Logbook for the exact construction.",
    detail: [
      "The ΔV TREND is a compact chronological chart for one faction. It keeps at most five bars: up to four previous resolved-state balances followed by the current planning projection on the right.",
      "The live bar begins with current faction ΔV and subtracts visible queued BURN costs, next-turn CONTESTED upkeep and known next-turn EVADE costs. It is a visible-commitment projection, not a promise of every future income or threat.",
      "Bar height is normalized inside that faction's own five-sample window. The scale ceiling is the greater of 10 ΔV or the largest displayed value; each non-negative value fills a 12-pixel range above a 2-pixel floor, then rounds to a whole pixel. The floor keeps a zero reserve visible.",
      "Use the chart to scan direction and pressure quickly: a falling shape exposes shrinking freedom to BURN, EVADE or hold CONTESTED, while a rising shape shows recovered operating margin. Read the printed balances for exact values and direct player-versus-enemy comparison, because each faction chart has its own scale."
    ]
  },
  {
    id: "tritium",
    label: "TRITIUM",
    aliases: ["TRITIUM"],
    short: "The productive resource that restores ΔV and ultimately determines victory.",
    detail: [
      "One eligible WORK result at a tritium plant produces +2 ΔV during the economy phase. BURN, FIRE, EVADE or CONTESTED status prevents that income.",
      "Natural tritium survives only in traces. Gas-giant skimmers harvest deuterium, while lithium-6 blankets breed tritium whose 12.3-year half-life makes stockpiles perishable.",
      "Command accounting combines fuel and resupply margin in the faction reserve, with no separate reserve for each hull. Losing every credible short-term route to tritium ends the match."
    ]
  },
  {
    id: "shipyard",
    label: "SHIPYARD",
    aliases: ["SHIPYARD", "SHIPYARDS"],
    short: "A facility that assembles one new ship after five eligible WORK turns.",
    detail: [
      "A SHIPYARD adds 1/5 progress for each eligible WORK turn and produces one new ship at 5/5. Production costs no ΔV.",
      "The worker must begin the turn there and remain available; BURN, FIRE, EVADE or CONTESTED status prevents progress. Stored progress belongs to the yard and can be captured.",
      "At completion, the new ship stays at the yard while the incumbent supplies a reserve crew and performs MANDATORY LAUNCH. Reserve a destination and its cost in advance."
    ]
  },
  {
    id: "protected",
    label: "PROTECTED",
    aliases: ["PROTECTED"],
    short: "An orbit where warfare and contesting are disabled by immediate enforcement.",
    detail: [
      "PROTECTED orbits form the enforced Earth-Moon corridor. Weapons remain offline and opposing ships cannot create a contested lock there.",
      "Launches are registered, nuclear packages remain safed and point-defense forces are already present, so legal prohibition and physical response operate on the same clock.",
      "The law continues beyond the corridor, but immediate protection does not. Ordinary destinations remain open to FIRE and CONTESTED occupation."
    ]
  },
  {
    id: "barren",
    label: "BARREN",
    aliases: ["BARREN", "STAGING"],
    short: "An orbit with no tritium plant or shipyard, valued for position and timing.",
    detail: [
      "A BARREN orbit cannot support WORK, but ships can occupy, contest or escape through it, FIRE from it and use it for TRANSFER.",
      "Its value is positional: a barren orbit may shorten a route, open a second firing angle, support a contested lock or provide an affordable escape."
    ]
  },
  {
    id: "missile",
    label: "MISSILE",
    aliases: ["MISSILE", "MISSILES"],
    short: "A delayed FIRE threat aimed at one target ship and one future impact.",
    detail: [
      "FIRE launches one autonomous nuclear missile-drone from a magazine of roughly ten to twelve. It pursues predicted geometry rather than the target's present position.",
      "The missile watches defensive tracers and jinks toward the single turret's blind angle, but its deterministic ETA causes no immediate damage.",
      "At impact, a non-CONTESTED target automatically EVADES if its faction can pay 1 ΔV. BURNING earlier breaks the solution; failing either defense destroys the ship."
    ]
  },
  {
    id: "impact",
    label: "IMPACT",
    aliases: ["IMPACT", "IMPACTS", "IMPACTING"],
    short: "The moment an incoming missile forces EVADE or destroys its target.",
    detail: [
      "Missile IMPACT resolves after mandatory departures but before ships reach their destinations in the same turn.",
      "A ship arriving on the impact turn is therefore too late to create a contest and block the target's EVADE. To deny EVADE, establish the lock one turn earlier."
    ]
  },
  {
    id: "eta",
    label: "ETA / T±",
    aliases: ["ETA", "T+", "T-"],
    short: "Turns until a destination or impact; T+ marks transfer time and T- an incoming threat.",
    detail: [
      "ETA is measured in turns. A BURN displays T+N for its transfer horizon, while an inbound missile displays T-N for the turns remaining before impact.",
      "Timing is deterministic for the current orbital state. Compare these clocks to see whether a BURN escapes a missile, reaches support or arrives too late to matter."
    ]
  },
  {
    id: "projection-arrow",
    label: "->",
    aliases: ["->"],
    short: "Separates the current value from its projection after queued orders.",
    detail: [
      "Read the arrow from left to right: the first value is current and the second includes the effects of all queued planning.",
      "The projection remains uncommitted until EXECUTE. Use it to catch a plan that spends the ΔV another ship needs for upkeep or EVADE."
    ]
  },
  {
    id: "turn",
    label: "TURN",
    aliases: ["TURN", "TURNS"],
    short: "One simultaneous planning phase followed by a deterministic resolution cycle.",
    detail: [
      "Every faction plans against the same visible state. EXECUTE then freezes all orders and resolves them simultaneously through a fixed sequence of phases.",
      "One turn corresponds roughly to an Earth-Moon transfer of three days, although the interface advances in whole turns rather than continuous time.",
      "Movement and actions resolve before WORK and the economy. The command log preserves this chronology so you can trace each result to its cause."
    ]
  },
  {
    id: "orbit",
    label: "orbit",
    aliases: ["orbit", "orbits", "orbital"],
    short: "A moving playable position associated with a planet or moon.",
    detail: [
      "Commands target an orbit rather than the visible surface of its planet or moon. The body supplies gravity and a moving spatial reference.",
      "As orbital phase changes, transfer timing and cost can change with it. Camera position and visual scale never affect those calculations."
    ]
  },
  {
    id: "ship",
    label: "SHIP",
    aliases: ["SHIP", "SHIPS"],
    short: "A manned vessel that moves, fights, works and carries crews for future ships.",
    detail: [
      "A ship resolves each turn through WORK, EVADE, BURN or FIRE, subject to the restrictions of a CONTESTED orbit.",
      "Its modular spine carries habitat, reactor, radiator and weapon sections, including one rapid-fire turret and ten to twelve missiles. Life support covers the active complement and reserve crews for future hulls.",
      "Ships carry physical canisters and reaction mass, but command accounting keeps no separate reserve for each hull. Every cost comes from global faction ΔV."
    ]
  },
  {
    id: "faction",
    label: "FACTION",
    aliases: ["FACTION", "FACTIONS", "PLAYER", "ENEMY"],
    short: "One side in the conflict, sharing ships, industry and a global ΔV reserve.",
    detail: [
      "A FACTION represents one corporate industrial network, including ships, yards, tritium plants, compute and command authority.",
      "All of its ships draw from one ΔV reserve, so every order competes with future movement, EVADE and contested upkeep elsewhere.",
      "The corporation remains subject to terrestrial law, but distant enforcement cannot control events in real time. Victory depends on practical tritium access rather than score or territorial totals."
    ]
  },
  {
    id: "upkeep",
    label: "UPKEEP",
    aliases: ["UPKEEP"],
    short: "The 2 ΔV each faction pays per turn for a ship held in a contested orbit.",
    detail: [
      "CONTESTED upkeep resolves before mandatory departures, missile impacts and ordinary actions. Each faction pays 2 ΔV for its locked ship.",
      "A contested orbit can deny valuable production, but the lock draws from the same reserve used for BURN and EVADE. Leave when the denial is no longer worth that cost."
    ]
  },
  {
    id: "victory",
    label: "VICTORY",
    aliases: ["VICTORY", "WINS", "WIN"],
    short: "Become the only faction that still has a credible route to tritium.",
    detail: [
      "VICTORY occurs when every rival has lost any realistic short-term route to TRITIUM, while your own faction still retains one.",
      "Access includes current extraction, movement, contesting and imminent shipyard output. You do not need to occupy every orbit; you need to remove every credible recovery route."
    ]
  },
  {
    id: "signal-lost",
    label: "SIGNAL LOST",
    aliases: ["SIGNAL LOST", "CREW LOST"],
    short: "The log has confirmed that a ship was destroyed and its crew was not recovered.",
    detail: [
      "SIGNAL LOST records the result of destruction, while the preceding log entries preserve the action, impact or unpaid cost that caused it.",
      "Every ship is manned. A loss kills at least one twelve-person watch and may also erase the reserve complements carried for future hulls.",
      "The first attributable loss near Saturn turned industrial competition into both a murder investigation and an armed conflict.",
      "Earth receives such telemetry after roughly eighty minutes, far sooner than any enforcement fleet can reach the scene."
    ]
  },
  {
    id: "year-2079",
    label: "2079",
    aliases: ["2079"],
    short: "The year open corporate war begins beyond the protected Earth-Moon corridor.",
    detail: [
      "Fusion is mature, while AI-scale compute expands until electricity, fabrication capacity and heat rejection become the practical limits.",
      "Robotic mines, atmospheric skimmers and tritium plants have made parts of the outer system independent of terrestrial fuel deliveries.",
      "Earth and the MOON remain PROTECTED, and registered ships still fall under terrestrial jurisdiction, but enforcement assets are concentrated near home.",
      "Corporate factions therefore own the only complete industrial fleets near the gas and ice giants when the first attributable hostile action occurs near Saturn."
    ]
  },
  {
    id: "production",
    label: "PRODUCTION",
    aliases: ["PRODUCTION", "PRODUCES", "PRODUCE", "PROGRESS"],
    short: "The economy-phase result of eligible WORK at a tritium plant or shipyard.",
    detail: [
      "PRODUCTION resolves after movement and actions. Tritium WORK adds ΔV, while shipyard WORK advances assembly by one step.",
      "BURN, FIRE, EVADE, same-turn arrival and CONTESTED status all prevent production. Protecting eligibility is often as important as occupying the facility."
    ]
  }
] as const satisfies readonly GameGlossaryEntry[];

const mechanicAdviceById: Readonly<Record<string, readonly string[]>> = {
  "burn-out": [
    "Leave before impact to break every firing solution on that ship; waiting until the impact turn is too late if the orbit is already contested.",
    "Compare the escape cost with the next upkeep payment. A costly exit can still be cheaper than maintaining a lock that no longer denies anything valuable."
  ],
  "mandatory-launch": [
    "Before the yard reaches 5/5, reserve enough ΔV for a legal departure and identify a destination that improves tritium access or support geometry.",
    "An enemy can time pressure around completion because the incumbent's departure is compulsory and resolves before ordinary arrivals."
  ],
  "firing-solution": [
    "One solution usually taxes 1 ΔV and one WORK result; several timed solutions can exhaust the reserve or keep a productive ship idle for several turns.",
    "A single BURN breaks all solutions on the departing ship, so combine missile pressure with route denial or a contested lock when possible."
  ],
  "tritium-access": [
    "Count safe plants, threatened plants and recovery routes separately. Current ownership is weak if no ship can survive long enough to WORK there.",
    "A shipyard close to completion can preserve access indirectly by producing the ship needed to contest or recover a plant."
  ],
  "tritium-collapse": [
    "To finish a rival, remove every short recovery path rather than merely taking its present plant.",
    "Protect at least one affordable fallback route of your own; a large ΔV balance cannot prevent collapse if no ship can reach tritium."
  ],
  "left-click": [
    "Preview first and confirm second; the log lets you compare cost and ETA before EXECUTE commits the order."
  ],
  "right-click": [
    "Entering FIRE mode is reversible. Use it to inspect possible targets before deciding whether the lost WORK is justified."
  ],
  "double-click": [
    "Focus dense engagements when markers overlap, then return to a wider view before comparing long routes."
  ],
  "mouse-wheel": [
    "Zoom out for strategic comparison and back in for precise confirmation; scale never changes legality."
  ],
  camera: [
    "Use camera changes to improve information, then judge orders only by their displayed cost, ETA and consequences."
  ],
  zoom: [
    "A wide view exposes competing routes, while a close view reduces accidental target selection."
  ],
  pan: [
    "Pan without changing focus when you need to compare a nearby support ship with the orbit it may defend."
  ],
  focus: [
    "Follow the threatened orbit during resolution, but inspect the full map again before planning the next turn."
  ],
  select: ["Selection is safe to change. Compare several previews before you spend shared ΔV."],
  confirm: [
    "After confirmation, read the projected faction balance; another ship may need that reserve for EVADE or upkeep."
  ],
  transfer: [
    "Compare the transfer clock with missile impacts, enemy movement and the first turn on which the ship can WORK.",
    "A faster route is not automatically better if its cost removes the reserve needed on arrival."
  ],
  destination: [
    "Prefer destinations that provide production, a second attack vector, route access or a credible escape on the following turn."
  ],
  origin: [
    "The same destination can be cheap from one orbit and wasteful from another, so compare which ship should make the move."
  ],
  route: [
    "Recheck routes each turn: orbital motion can turn an expensive transfer into an affordable window, or close a window you planned to use."
  ],
  resource: [
    "Treat every ΔV point as shared insurance as well as fuel; local gains and losses affect every ship in the faction."
  ],
  cost: [
    "Evaluate a cost together with the income surrendered and the survival reserve left afterward, not as an isolated number."
  ],
  execute: [
    "Before EXECUTE, check the projected balance against 1 ΔV for each known impact and 2 ΔV for each contested ship.",
    "Use phase order deliberately: a mandatory departure can escape before impact, while a same-turn friendly arrival cannot enable EVADE."
  ],
  contested: [
    "Project at least two upkeep payments before entering a lock. If the opponent can outlast your reserve, the apparent denial may become a trap.",
    "A lock on a tritium plant or nearly complete yard can justify the cost; a lock on an empty orbit usually needs a route or firing advantage.",
    "Outside support converts the target's inability to EVADE into a kill threat, so preserve one uncontested firing ship when you can."
  ],
  evade: [
    "Reserve 1 ΔV for every missile shown on the same impact turn, not merely for every targeted ship.",
    "FIRE against a worker can be effective without a kill because each EVADE also removes that turn's income or shipyard progress."
  ],
  fire: [
    "Compare your lost WORK with the target's expected loss: an isolated shot often trades one production result for one future production result.",
    "Time FIRE to arrive when upkeep, another missile or a forced launch already constrains the target's ΔV.",
    "A support shot into CONTESTED is especially dangerous because the target cannot EVADE unless it BURNS out before impact."
  ],
  burn: [
    "After subtracting the BURN cost, keep enough reserve for known EVADE impacts and any contested upkeep due before the next income.",
    "Judge the destination by the first useful turn after arrival, because a ship cannot WORK on the turn it reaches the orbit.",
    "Use departure defensively when it breaks more future missile cost than the transfer itself consumes."
  ],
  work: [
    "A productive ship has an implicit income value each turn: +2 ΔV at tritium or 1/5 of a hull at a yard.",
    "When comparing FIRE or BURN, include that lost output in the price of the order.",
    "Denying enemy WORK for several turns can be more valuable than occupying a barren orbit or launching an isolated missile."
  ],
  stay: [
    "Staying is an economic action when it preserves WORK, and a denial action when it maintains a contested lock."
  ],
  "delta-v": [
    "Forecast the reserve as current ΔV minus queued BURN, upkeep and known EVADE costs, plus only the income that can still resolve.",
    "A low enemy reserve makes timed pressure valuable, but only if the target cannot simply BURN away and erase every solution.",
    "Do not spend to zero while a ship faces an impact, a contested payment or a mandatory launch."
  ],
  tritium: [
    "Stable tritium income compounds: protecting one worker for three turns creates 6 ΔV that can fund several later transfers.",
    "Pressure an enemy plant when denying +2 ΔV also makes its future EVADE, upkeep or recovery route unaffordable."
  ],
  shipyard: [
    "Treat progress near 5/5 as a timed objective. Defend the final WORK turn and pre-plan the incumbent's mandatory departure.",
    "Because progress is capturable, contesting a rival yard at 4/5 can deny a ship now and provide one to you later."
  ],
  protected: [
    "Use protected orbits as safe endpoints only when their routes advance a wider plan; they cannot be used to create combat pressure."
  ],
  barren: [
    "A barren orbit earns its cost only through timing, access, escape or a second firing angle."
  ],
  missile: [
    "Read every missile by impact turn. Several impacts on one turn create a burst cost; impacts across several turns can deny repeated WORK.",
    "If the target has an affordable BURN route, pair missile pressure with route denial or accept that the shot may force movement rather than destruction."
  ],
  impact: [
    "Establish CONTESTED one turn before impact if you intend to block EVADE; an arrival on the impact turn resolves too late."
  ],
  eta: [
    "Compare T+ and T- values directly to identify escapes, support windows and turns in which production will be denied."
  ],
  "projection-arrow": [
    "Treat the right-hand balance as a warning about committed obligations, then inspect the exact BURN, upkeep and impact entries that create it."
  ],
  turn: [
    "Plan across at least the next two turns when upkeep or missiles are involved; a plan that survives only the current EXECUTE is not solvent."
  ],
  orbit: [
    "An orbit is valuable when it improves production, access, timing or attack geometry; occupancy alone does not advance victory."
  ],
  ship: [
    "Preserve ships with unique access or support geometry. Equal hulls can have very different strategic value because of position and ETA."
  ],
  faction: [
    "Evaluate the whole reserve and fleet together: one ship's aggressive move can make another ship's automatic defense fail."
  ],
  upkeep: [
    "Enter a contested lock only if the denied production, delayed movement or support opportunity is worth 2 ΔV every turn."
  ],
  victory: [
    "Attack recovery capacity in order: safe tritium, affordable routes, supporting ships and imminent yard output."
  ],
  production: [
    "Before ordering a productive ship, count the output it will forfeit and ask whether the order denies at least as much future value to the rival."
  ]
};

const mechanicGlossaryEntriesWithAdvice = mechanicGlossaryEntries.map(
  (entry): GameGlossaryEntry => {
    const advice = mechanicAdviceById[entry.id];
    return advice === undefined ? entry : { ...entry, advice };
  }
);

export const gameGlossaryEntries = [
  ...mechanicGlossaryEntriesWithAdvice,
  ...worldLoreGlossaryEntries,
  ...astronomicalGlossaryEntries
] as const satisfies readonly GameGlossaryEntry[];

const gameGlossaryById = new Map<string, GameGlossaryEntry>(
  gameGlossaryEntries.map((entry) => [entry.id, entry])
);
const dynamicGameGlossaryById = new Map<string, GameGlossaryEntry>();

const sortedGlossaryAliases = gameGlossaryEntries
  .flatMap((entry) => entry.aliases.map((alias) => ({ alias, entry })))
  .sort((first, second) => second.alias.length - first.alias.length);

export function getGameGlossaryEntry(id: string): GameGlossaryEntry | undefined {
  const staticEntry = gameGlossaryById.get(id);

  if (staticEntry !== undefined) {
    return staticEntry;
  }

  const cachedEntry = dynamicGameGlossaryById.get(id);

  if (cachedEntry !== undefined) {
    return cachedEntry;
  }

  const dynamicEntry = createDynamicGameGlossaryEntry(id);

  if (dynamicEntry !== undefined) {
    dynamicGameGlossaryById.set(id, dynamicEntry);
  }

  return dynamicEntry;
}

export function tokenizeGameGlossaryText(text: string): readonly GameGlossaryTextToken[] {
  const tokens: GameGlossaryTextToken[] = [];
  let plainStart = 0;
  let index = 0;

  while (index < text.length) {
    const match = findGameGlossaryTokenAt(text, index);

    if (match === null) {
      index += 1;
      continue;
    }

    if (plainStart < index) {
      tokens.push({ text: text.slice(plainStart, index) });
    }

    const end = index + match.length;
    tokens.push({
      text: text.slice(index, end),
      glossaryId: match.glossaryId
    });
    index = end;
    plainStart = end;
  }

  if (plainStart < text.length) {
    tokens.push({ text: text.slice(plainStart) });
  }

  return tokens.length > 0 ? tokens : [{ text }];
}

function findGameGlossaryTokenAt(
  text: string,
  index: number
): Readonly<{ length: number; glossaryId: string }> | null {
  const contextualValue = findContextualGameValueAt(text, index);

  if (contextualValue !== null) {
    return contextualValue;
  }

  const alias = findGlossaryAliasAt(text, index);

  if (alias !== null) {
    return {
      length: alias.alias.length,
      glossaryId: alias.entry.id
    };
  }

  const number = /^[+-]?(?:\d[\d,]*(?:\.\d+)?|\.\d+)/u.exec(text.slice(index))?.[0];

  if (number !== undefined) {
    return {
      length: number.length,
      glossaryId: `value:number:${number}`
    };
  }

  const word = /^[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/u.exec(text.slice(index))?.[0];

  return word === undefined
    ? null
    : {
        length: word.length,
        glossaryId: `word:${word.toLocaleLowerCase("en-US")}`
      };
}

function findContextualGameValueAt(
  text: string,
  index: number
): Readonly<{ length: number; glossaryId: string }> | null {
  const remainingText = text.slice(index);

  if (/^2079\b/u.test(remainingText)) {
    return null;
  }

  const eta = /^T[+-]\d+/iu.exec(remainingText)?.[0];

  if (eta !== undefined) {
    return {
      length: eta.length,
      glossaryId: `value:eta:${eta.toLocaleUpperCase("en-US")}`
    };
  }

  const progress = /^\d+\/\d+/u.exec(remainingText)?.[0];

  if (progress !== undefined) {
    return {
      length: progress.length,
      glossaryId: `value:progress:${progress}`
    };
  }

  const deltaV = /^[+-]?\d+(?:\.\d+)?(?=\s*ΔV\b)/iu.exec(remainingText)?.[0];

  if (deltaV !== undefined) {
    return {
      length: deltaV.length,
      glossaryId: `value:delta-v:${deltaV}`
    };
  }

  const duration = /^~?\d+(?:\.\d+)?(?=\s*days?\b)/iu.exec(remainingText)?.[0];

  if (duration !== undefined) {
    return {
      length: duration.length,
      glossaryId: `value:days:${duration}`
    };
  }

  const turnCount = /^\d+(?:\.\d+)?(?=\s*turns?\b)/iu.exec(remainingText)?.[0];

  if (turnCount !== undefined) {
    return {
      length: turnCount.length,
      glossaryId: `value:turn-count:${turnCount}`
    };
  }

  const number = /^\d+(?:\.\d+)?/u.exec(remainingText)?.[0];

  if (number === undefined) {
    return null;
  }

  const priorText = text.slice(0, index);

  if (/\bTURN\s*$/iu.test(priorText)) {
    return {
      length: number.length,
      glossaryId: `value:turn:${number}`
    };
  }

  return null;
}

function createDynamicGameGlossaryEntry(id: string): GameGlossaryEntry | undefined {
  if (id.startsWith("word:")) {
    const word = id.slice("word:".length);
    const grammar = getOrdinaryWordGlossaryCopy(word);
    return {
      id,
      label: word.toLocaleUpperCase("en-US"),
      aliases: [],
      short:
        grammar?.short ??
        `"${word}" keeps its ordinary meaning here and names no separate game rule.`,
      detail: grammar?.detail ?? [
        `"${word}" keeps its ordinary grammatical meaning in the surrounding log sentence. It does not name an independent simulation rule.`
      ],
      advice: [
        "Read this word together with the adjacent action, value or condition; that neighbouring term carries the gameplay consequence."
      ]
    };
  }

  const [prefix, kind, ...rawParts] = id.split(":");

  if (prefix !== "value" || kind === undefined || rawParts.length === 0) {
    return undefined;
  }

  const raw = rawParts.join(":");

  if (kind === "turn") {
    return {
      id,
      label: raw,
      aliases: [],
      short: `The current TURN index, displayed as ${raw}.`,
      detail: [
        `${raw} identifies one planning and resolution cycle in the command log. A leading zero aligns the column but does not change the duration.`
      ],
      advice: [
        "Compare this turn with T+ and T- values to place departures, destinations and impacts on one timeline."
      ]
    };
  }

  if (kind === "delta-v") {
    const meaning = raw.startsWith("-")
      ? "a ΔV cost"
      : raw.startsWith("+")
        ? "a ΔV gain"
        : "a ΔV reserve or projection";
    return {
      id,
      label: raw,
      aliases: [],
      short: `${raw} is ${meaning} on this log line.`,
      detail: [
        `Read ${raw} together with the adjacent ΔV token.`,
        "A minus sign marks expenditure, a plus sign marks income, and no sign indicates a stored or projected faction-wide balance."
      ],
      advice: [
        "Judge the value by the reserve left after every known BURN, upkeep payment and EVADE on the same planning horizon."
      ]
    };
  }

  if (kind === "eta") {
    const isArrival = raw.includes("+");
    return {
      id,
      label: raw,
      aliases: [],
      short: isArrival
        ? `${raw} places the destination that many turns after the current command.`
        : `${raw} leaves that many turns before IMPACT.`,
      detail: [
        isArrival
          ? `${raw} is the deterministic transfer horizon for the visible BURN.`
          : `${raw} is a deterministic incoming MISSILE countdown.`,
        "The number counts EXECUTE cycles rather than animation time, and camera movement cannot change it."
      ],
      advice: [
        "Compare this clock with competing transfers, impact times and the first turn on which a ship can WORK."
      ]
    };
  }

  if (kind === "progress") {
    const [completed = "0", required = "0"] = raw.split("/");
    return {
      id,
      label: raw,
      aliases: [],
      short: `${completed} completed WORK steps out of ${required} required.`,
      detail: [
        `${raw} is the assembly progress stored at this shipyard: ${completed} eligible WORK steps are complete and ${required} finishes the hull.`
      ],
      advice: [
        "Because progress belongs to the yard, count how many uninterrupted WORK turns remain and whether an enemy can contest it first."
      ]
    };
  }

  if (kind === "days") {
    return {
      id,
      label: raw,
      aliases: [],
      short: `${raw} Earth days supplies physical scale for the TURN reference.`,
      detail: [
        `${raw} is a physical-duration reference rather than a separate command. Resolution still advances in whole turns.`
      ],
      advice: [
        "Use the value to understand the operational scale, while planning with the integer TURN and ETA shown by the interface."
      ]
    };
  }

  if (kind === "turn-count") {
    return {
      id,
      label: raw,
      aliases: [],
      short: `${raw} complete EXECUTE cycles.`,
      detail: [
        `${raw} counts complete deterministic turns rather than renderer frames or real-time seconds.`
      ],
      advice: [
        "Multiply per-turn WORK or upkeep by this count to expose the full economic consequence of waiting."
      ]
    };
  }

  if (kind === "number") {
    return {
      id,
      label: raw,
      aliases: [],
      short: `${raw} is a literal quantity; the adjacent unit or sentence gives it meaning.`,
      detail: [
        `The log preserves ${raw} exactly as recorded. Its neighbouring unit or noun determines whether it describes time, distance, mass, cost or state.`
      ],
      advice: [
        "Use the number only after identifying its unit and whether the line describes a current, projected or already resolved value."
      ]
    };
  }

  return undefined;
}

function getOrdinaryWordGlossaryCopy(
  word: string
): Readonly<{ short: string; detail: readonly string[] }> | undefined {
  const grammar: Readonly<Record<string, Readonly<{ short: string; detail: readonly string[] }>>> =
    {
      a: {
        short: "Indefinite article: introduces one non-specific object or action.",
        detail: [
          "A marks a singular item without identifying a particular instance.",
          "It connects sentence grammar only and creates no simulation state."
        ]
      },
      the: {
        short: "Definite article: points to the specific object already identified by context.",
        detail: [
          "THE narrows the following noun to the current known instance.",
          "Selection and legality still come from the adjacent game term."
        ]
      },
      to: {
        short: "Direction or infinitive marker linking an action to its result or destination.",
        detail: [
          "TO can connect movement with a destination or a verb with its purpose.",
          "The linked action and target carry the actual rule."
        ]
      },
      and: {
        short: "Conjunction: both connected statements or inputs apply.",
        detail: [
          "AND joins requirements without making them alternatives.",
          "Unless the sentence says otherwise, every joined condition remains relevant."
        ]
      },
      or: {
        short: "Conjunction: the connected terms are alternatives.",
        detail: [
          "OR separates mutually available readings, actions or outcomes.",
          "Choosing one does not imply executing the other."
        ]
      },
      in: {
        short: "Locative relation: inside a state, interval, mode or place.",
        detail: [
          "IN binds the following noun to the current context.",
          "The adjacent state or place defines the gameplay consequence."
        ]
      },
      out: {
        short: "Direction away from the current state, focus or containing orbit.",
        detail: [
          "OUT marks exit or outward camera motion.",
          "Only a linked BURN changes simulation position."
        ]
      },
      on: {
        short: "Locative relation: attached to, occupying or acting upon the following object.",
        detail: [
          "ON identifies the surface, orbit or target receiving the described relation.",
          "The following game term supplies the rule."
        ]
      },
      not: {
        short: "Negation: the following condition or action does not apply.",
        detail: [
          "NOT reverses the truth of the phrase it modifies.",
          "It is a hard exclusion when used in a rule sentence."
        ]
      },
      every: {
        short: "Universal quantity: the statement applies to each member without exception.",
        detail: [
          "EVERY repeats the stated rule for all matching ships, turns or events.",
          "Exceptions must be stated separately."
        ]
      },
      can: {
        short: "Permission or capability under the current conditions.",
        detail: [
          "CAN means the action is available if all linked legality checks pass.",
          "It does not queue or EXECUTE the action."
        ]
      },
      must: {
        short: "Mandatory condition: resolution cannot legally bypass the stated requirement.",
        detail: [
          "MUST is stronger than availability or advice.",
          "The current phase remains constrained until the requirement resolves or its failure rule applies."
        ]
      }
    };

  return grammar[word];
}

function findGlossaryAliasAt(
  text: string,
  index: number
): Readonly<{ alias: string; entry: GameGlossaryEntry }> | null {
  for (const candidate of sortedGlossaryAliases) {
    const end = index + candidate.alias.length;

    if (
      end > text.length ||
      text.slice(index, end).toLocaleUpperCase("en-US") !==
        candidate.alias.toLocaleUpperCase("en-US") ||
      !hasGlossaryBoundary(text, index, end, candidate.alias)
    ) {
      continue;
    }

    return candidate;
  }

  return null;
}

function hasGlossaryBoundary(text: string, start: number, end: number, alias: string): boolean {
  const first = alias[0] ?? "";
  const last = alias.at(-1) ?? "";
  const previous = start > 0 ? (text[start - 1] ?? "") : "";
  const next = end < text.length ? (text[end] ?? "") : "";

  return (
    (!isGlossaryWordCharacter(first) || !isGlossaryWordCharacter(previous)) &&
    (!isGlossaryWordCharacter(last) || !isGlossaryWordCharacter(next))
  );
}

function isGlossaryWordCharacter(value: string): boolean {
  return /[\p{L}\p{N}_]/u.test(value);
}
