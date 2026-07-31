import { astronomicalGlossaryEntries } from "./astronomicalGlossary";
import { worldLoreGlossaryEntries } from "./worldLoreGlossary";

export type GameGlossaryEntry = Readonly<{
  id: string;
  label: string;
  aliases: readonly string[];
  short: string;
  detail: readonly string[];
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
    id: "burn-out",
    label: "BURN OUT",
    aliases: ["BURN OUT", "BURNS OUT", "BURNED OUT"],
    short: "Leave the current orbit or contested lock by committing a transfer BURN.",
    detail: [
      "BURN OUT is not a separate action from BURN. It means choosing a valid destination and leaving the current orbit.",
      "A contested ship may STAY or BURN OUT. Departing breaks every active firing solution aimed at that ship, but the faction must still afford the transfer cost."
    ]
  },
  {
    id: "mandatory-launch",
    label: "MANDATORY LAUNCH",
    aliases: ["MANDATORY LAUNCH", "MANDATORY LAUNCHES"],
    short:
      "A completed shipyard forces its incumbent ship to BURN out before resolution continues.",
    detail: [
      "After five eligible WORK turns, the newly assembled ship remains at the SHIPYARD. The incumbent ship must execute a legal BURN to another destination.",
      "Mandatory launch departures resolve before missile impacts and ordinary arrivals. If the required departure cannot be completed, the launch requirement fails under the current scenario rules."
    ]
  },
  {
    id: "firing-solution",
    label: "FIRING SOLUTION",
    aliases: ["FIRING SOLUTION", "FIRING SOLUTIONS", "MISSILE SOLUTION", "MISSILE SOLUTIONS"],
    short: "The live prediction connecting a fired missile to one specific target ship.",
    detail: [
      "FIRE creates a firing solution rather than immediate damage. Its ETA follows the same transfer timing model as BURN.",
      "The solution remains attached to its target until impact or until the target departs with BURN. EVADE absorbs missiles paid for at impact; it does not erase unrelated future solutions."
    ]
  },
  {
    id: "tritium-collapse",
    label: "TRITIUM COLLAPSE",
    aliases: ["TRITIUM COLLAPSE"],
    short: "The victory state: only one faction retains a strategically viable path to tritium.",
    detail: [
      "Victory is not awarded for score or abstract territory. A faction wins when every rival has lost a plausible short-term route to produce or contest TRITIUM.",
      "The viability check considers current ships, ΔV, active transfers, nearby access and imminent SHIPYARD output."
    ]
  },
  {
    id: "left-click",
    label: "LEFT CLICK",
    aliases: ["LEFT CLICK", "LEFT-CLICK"],
    short: "Select once; when a valid preview is visible, confirm the proposed order.",
    detail: [
      "A single LEFT CLICK selects a ship or orbit. With a valid BURN or FIRE preview already visible, it confirms and queues that order.",
      "The log records the queued command before EXECUTE, so its ETA, destination and projected ΔV cost can still be inspected."
    ]
  },
  {
    id: "right-click",
    label: "RIGHT CLICK",
    aliases: ["RIGHT CLICK", "RIGHT-CLICK"],
    short: "Enter FIRE mode for a selected ship; dragging the right button orbits the camera.",
    detail: [
      "A stationary RIGHT CLICK enters FIRE mode when the selected ship can fire. RIGHT CLICK and drag is reserved for camera orbit.",
      "The interaction is contextual: the renderer may distinguish a click from a drag, but neither gesture changes core simulation rules."
    ]
  },
  {
    id: "double-click",
    label: "DOUBLE CLICK",
    aliases: ["DOUBLE CLICK", "DOUBLE-CLICK"],
    short: "Focus the camera on the selected body, orbit, ship or trajectory.",
    detail: [
      "DOUBLE CLICK changes only camera focus. It never issues a gameplay order or changes simulation state.",
      "Single LEFT CLICK remains selection; DOUBLE CLICK is the deliberate focus gesture."
    ]
  },
  {
    id: "mouse-wheel",
    label: "MOUSE WHEEL",
    aliases: ["MOUSE WHEEL", "WHEEL"],
    short: "Zoom toward the current focus or the screen centre.",
    detail: [
      "The MOUSE WHEEL controls camera distance. Zoom is presentation state only and never affects range, ETA or the legality of an order.",
      "Transfer and firing calculations remain identical at every camera scale."
    ]
  },
  {
    id: "camera",
    label: "CAMERA",
    aliases: ["CAMERA"],
    short: "Presentation viewpoint only; it cannot change any simulation result.",
    detail: [
      "The CAMERA owns focus, distance, orbit and pan.",
      "It never owns gameplay position, range, ΔV, ETA, legality or resolution."
    ]
  },
  {
    id: "zoom",
    label: "ZOOM",
    aliases: ["ZOOM", "ZOOMS", "ZOOMED", "ZOOMING"],
    short: "Change camera distance toward the current focus or screen centre.",
    detail: [
      "ZOOM changes visual scale only.",
      "It cannot alter orbit geometry, BURN cost, FIRE timing or selection state."
    ]
  },
  {
    id: "pan",
    label: "PAN",
    aliases: ["PAN", "PANS", "PANNED", "PANNING"],
    short: "Translate the camera's visual focus without moving any body or ship.",
    detail: [
      "PAN changes the viewed region while preserving simulation positions.",
      "LEFT CLICK and drag performs the gesture; a stationary click remains selection."
    ]
  },
  {
    id: "focus",
    label: "FOCUS",
    aliases: ["FOCUS", "FOCUSES", "FOCUSED", "FOCUSING"],
    short: "Make one visible target the camera's tracked centre.",
    detail: [
      "FOCUS is presentation state.",
      "DOUBLE CLICK assigns it. A moving focused body may remain centred while TURN animation advances."
    ]
  },
  {
    id: "select",
    label: "SELECT",
    aliases: ["SELECT", "SELECTS", "SELECTED", "SELECTING", "SELECTION"],
    short: "Choose the ship, orbit or command that subsequent input will address.",
    detail: [
      "SELECT establishes interaction context without resolving an action.",
      "The selected target may expose BURN or FIRE previews; only confirmation queues an order."
    ]
  },
  {
    id: "confirm",
    label: "CONFIRM",
    aliases: ["CONFIRM", "CONFIRMS", "CONFIRMED", "CONFIRMING"],
    short: "Accept the currently visible valid preview as a queued order.",
    detail: [
      "CONFIRM copies the previewed origin, destination, target, cost and ETA into planning state.",
      "The order remains pending until EXECUTE."
    ]
  },
  {
    id: "transfer",
    label: "TRANSFER",
    aliases: ["TRANSFER", "TRANSFERS", "TRANSIT", "ARRIVAL", "ARRIVALS", "DEPARTURE", "DEPARTURES"],
    short: "The deterministic interval between BURN departure and arrival.",
    detail: [
      "A TRANSFER begins when BURN spends ΔV and removes the SHIP from its origin.",
      "It ends at T+ETA. FIRE uses the equivalent travel model for missile timing."
    ]
  },
  {
    id: "destination",
    label: "DESTINATION",
    aliases: ["DESTINATION", "DESTINATIONS"],
    short: "The orbit where a valid BURN will arrive or a FIRE solution expects its target.",
    detail: [
      "A DESTINATION must be reachable under current route, occupancy, protection and ΔV rules.",
      "Selecting it previews; confirming it queues."
    ]
  },
  {
    id: "origin",
    label: "ORIGIN",
    aliases: ["ORIGIN", "ORIGINS"],
    short: "The orbit or transfer state from which the active ship issues its order.",
    detail: [
      "ORIGIN determines the starting geometry and gravity modifier.",
      "The queued order remains attached to its issuing SHIP."
    ]
  },
  {
    id: "route",
    label: "ROUTE",
    aliases: ["ROUTE", "ROUTES"],
    short: "The currently legal connection used to calculate cost and ETA.",
    detail: [
      "A ROUTE is simulation data, not the decorative trajectory line.",
      "Orbital state can change its transfer score, cost and timing."
    ]
  },
  {
    id: "crew",
    label: "CREW",
    aliases: ["CREW"],
    short: "The people operating this ship—and the reserve complements for hulls not yet launched.",
    detail: [
      "Ships are manned. Automation reduces watch size; it does not hold legal responsibility for lethal release.",
      "A minimum independent complement is twelve: command, flight, reactor, weapons, systems and medicine.",
      "A typical opening ship carries four complements—48 people—to crew itself and three expected SHIPYARD outputs.",
      "Reserve teams use the parent ship's life-support capacity until commissioning.",
      "CREW has no separate game statistic. SIGNAL LOST means those people were not recovered."
    ]
  },
  {
    id: "hull",
    label: "HULL",
    aliases: ["DISASSEMBLED HULLS", "DISASSEMBLED HULL", "HULL", "HULLS", "DISASSEMBLED"],
    short: "A disassembled ship body completed by five eligible SHIPYARD work steps.",
    detail: [
      "SHIPYARDS park pressure sections, docking spines, radiators and drive modules as protected subassemblies.",
      "WORK mates, tests and fuels them. At 5/5 the output becomes one ordinary SHIP.",
      "Crew, tritium canisters and command keys arrive from the incumbent ship during commissioning.",
      "HULL is production language, not a separate game inventory."
    ]
  },
  {
    id: "resource",
    label: "RESOURCE",
    aliases: ["RESOURCE", "RESOURCES"],
    short: "A spendable or productive quantity; current gameplay exposes only global ΔV.",
    detail: [
      "The current rules have no cargo or local ship inventories.",
      "TRITIUM WORK adds to the faction-wide ΔV reserve."
    ]
  },
  {
    id: "cost",
    label: "COST",
    aliases: ["COST", "COSTS", "COSTING"],
    short: "A quantity removed from the faction-wide ΔV reserve when its rule resolves.",
    detail: [
      "BURN pays at departure. EVADE pays at impact. CONTESTED upkeep pays first each TURN.",
      "FIRE and completed SHIP production cost 0 ΔV."
    ]
  },
  {
    id: "execute",
    label: "EXECUTE",
    aliases: ["EXECUTE", "EXECUTED", "EXECUTES"],
    short: "Commit the planned orders and resolve the current turn in its fixed phase order.",
    detail: [
      "Freeze every queued order. Advance the deterministic simulation one TURN.",
      "01  CONTESTED upkeep.",
      "02  MANDATORY LAUNCH departures.",
      "03  MISSILE IMPACT and automatic EVADE.",
      "04  BURN arrivals and INTERCEPT resolution.",
      "05  WORK eligibility, FIRE, BURN and INTERCEPT orders.",
      "06  TRITIUM income, SHIPYARD progress, production completion.",
      "The log reports causes and consequences in this exact order."
    ]
  },
  {
    id: "intercept",
    label: "INTERCEPT",
    aliases: ["INTERCEPT", "INTERCEPTS", "INTERCEPTED", "INTERCEPTING"],
    short:
      "A BURN against a moving ship that cancels its transfer and creates a temporary contested orbit.",
    detail: [
      "INTERCEPT targets a ship already in transfer. A successful intercept cancels that transfer and places the target and interceptor in a temporary CONTESTED orbit.",
      "No WORK is possible there. The temporary orbit disappears when one ship BURNS out or is destroyed."
    ]
  },
  {
    id: "contested",
    label: "CONTESTED",
    aliases: ["CONTESTED", "CONTEST", "CONTESTS", "CONTESTING"],
    short: "Two opposing factions share an orbit: both are physically locked and pay upkeep.",
    detail: [
      "Two FACTIONS occupy the same orbit. Physical lock, not damage; maximum one SHIP per faction.",
      "2 ΔV upkeep per contested ship and faction, paid first each TURN.",
      "WORK, FIRE, EVADE and INTERCEPT are blocked.",
      "STAY and BURN OUT remain legal.",
      "Physically, both ships circle for the other's blind angle, kill exposed drones and spend thrust denying a clean terminal geometry.",
      "The duel consumes every outward weapon and defensive schedule; neither side can perform a separate action.",
      "A support ship outside the lock adds the second attack vector one turret cannot cover.",
      "Same-turn arrival contests only after MISSILE IMPACT; outside ships may FIRE into the lock."
    ]
  },
  {
    id: "evade",
    label: "EVADE",
    aliases: ["EVADE", "EVADES", "EVADED", "EVADING"],
    short:
      "Automatic survival at missile impact: pay 1 ΔV for each incoming missile or lose the ship.",
    detail: [
      "Automatic defensive outcome. Not a preventive player order.",
      "Triggered when a MISSILE reaches a non-CONTESTED target.",
      "Costs 1 ΔV per missile IMPACTING that SHIP this TURN.",
      "Each paid impact is absorbed. If the next 1 ΔV cannot be paid, that missile destroys the target.",
      "The evading ship cannot WORK that turn.",
      "CONTESTED ships cannot evade.",
      "Resolves before same-turn BURN arrivals.",
      "Paid impacts are absorbed. Unrelated future FIRING SOLUTIONS remain active."
    ]
  },
  {
    id: "fire",
    label: "FIRE",
    aliases: ["FIRE", "FIRES", "FIRED", "FIRING"],
    short: "Give up this ship's WORK to create a future missile threat at zero ΔV cost.",
    detail: [
      "Active SHIP outcome.",
      "Costs 0 ΔV.",
      "The firing ship cannot WORK that TURN.",
      "Creates one delayed MISSILE and one FIRING SOLUTION. No immediate damage.",
      "Uses the same travel model as the equivalent BURN.",
      "Creates future EVADE cost, denied WORK, ΔV pressure and forced movement.",
      "Multiple ships may FIRE at one target.",
      "Target BURN breaks every firing solution attached to that departing ship.",
      "CONTESTED ships cannot fire."
    ]
  },
  {
    id: "burn",
    label: "BURN",
    aliases: ["BURN", "BURNS", "BURNED", "BURNING"],
    short: "Move a ship by spending shared ΔV now and waiting for its transfer ETA.",
    detail: [
      "Active SHIP outcome and movement order.",
      "Requires one ORIGIN, one valid DESTINATION and one current ROUTE.",
      "Costs the route plus the origin gravity modifier. Paid from global faction ΔV at departure.",
      "Deterministic transfer shown as T+ETA. Normally T+2 to T+7.",
      "The burning ship cannot WORK or FIRE that TURN.",
      "The ship follows its committed transfer until ARRIVAL.",
      "Arrival can CONTEST immediately. It cannot WORK until the following turn.",
      "Departure breaks every FIRING SOLUTION targeting that ship.",
      "A CONTESTED ship may exit. It pays prior upkeep, then the normal transfer cost."
    ]
  },
  {
    id: "work",
    label: "WORK",
    aliases: ["WORK", "WORKS", "WORKED", "WORKING"],
    short: "The automatic productive outcome when an eligible ship receives no conflicting action.",
    detail: [
      "Automatic productive SHIP outcome.",
      "Requires an operating tritium plant or SHIPYARD, no contest, presence before movement, and no BURN, FIRE or EVADE.",
      "TRITIUM produces +2 ΔV during the economy phase.",
      "SHIPYARD advances construction by 1/5.",
      "A ship arriving by BURN this TURN waits until the following turn.",
      "CONTESTED state, active order, EVADE, BARREN and PROTECTED locations deny work.",
      "A pre-existing worker stops if the site becomes contested before the economy phase."
    ]
  },
  {
    id: "stay",
    label: "STAY",
    aliases: ["STAY", "STAYS", "STAYED", "STAYING"],
    short: "Issue no movement order and remain in the current orbit through this turn.",
    detail: [
      "STAY means the ship remains where it is. Outside CONTESTED, an otherwise eligible ship may automatically WORK.",
      "Inside CONTESTED, staying preserves the physical lock and incurs contested upkeep, but no productive or offensive action is possible."
    ]
  },
  {
    id: "delta-v",
    label: "ΔV",
    aliases: ["ΔV", "DELTA-V", "DELTA V"],
    short: "The faction-wide reserve spent on movement, evasion and contested upkeep.",
    detail: [
      "ΔV is global to the faction, not stored on individual ships. Every BURN draws from the same reserve used by automatic EVADE and CONTESTED upkeep.",
      "WORK at tritium plants replenishes the reserve. Spending ΔV is therefore spending future mobility and survival, even when the immediate order is legal."
    ]
  },
  {
    id: "tritium",
    label: "TRITIUM",
    aliases: ["TRITIUM"],
    short: "The productive resource that restores ΔV and ultimately determines victory.",
    detail: [
      "One eligible WORK result produces +2 ΔV during the economy phase.",
      "Stored as global faction reserve; the simulation tracks no canister, convoy or local inventory.",
      "The physical output is certified D-T fusion fuel, reaction mass and tritium production margin compressed into one number.",
      "Natural tritium exists only in traces. Gas-giant skimmers harvest deuterium; lithium-6 blankets breed the tritium.",
      "Its 12.3-year half-life makes stockpiles perishable and bookkeeping strategic.",
      "CONTESTED state or BURN, FIRE and EVADE prevent income.",
      "Losing every viable short-window route to tritium causes TRITIUM COLLAPSE."
    ]
  },
  {
    id: "shipyard",
    label: "SHIPYARD",
    aliases: ["SHIPYARD", "SHIPYARDS"],
    short: "A shipbuilding facility that assembles one new ship after five eligible WORK turns.",
    detail: [
      "A SHIPYARD converts time into one new SHIP.",
      "Progress increases by 1/5 per eligible WORK turn.",
      "Progress belongs to the yard, not the faction. It can be captured and continued.",
      "BURN, FIRE, EVADE, CONTESTED state or same-turn ARRIVAL prevents progress.",
      "Stored hull modules are mated around a docking spine; the incumbent supplies fuel and one reserve crew.",
      "At 5/5, the assembled ship remains at the yard and the incumbent performs MANDATORY LAUNCH.",
      "Production itself costs 0 ΔV."
    ]
  },
  {
    id: "protected",
    label: "PROTECTED",
    aliases: ["PROTECTED"],
    short: "An orbit where warfare and contesting are disabled.",
    detail: [
      "PROTECTED orbits represent the enforced Earth-Moon corridor. They cannot be contested; weapons are offline.",
      "Here law and force share a clock: launches are registered, nuclear packages remain safed and interceptors are already present.",
      "Outside the corridor the same law persists, but a public enforcement ship may be months or years away.",
      "Protection applies only within designated orbits and does not extend to ordinary destinations."
    ]
  },
  {
    id: "barren",
    label: "BARREN",
    aliases: ["BARREN", "STAGING"],
    short:
      "An orbit without a tritium plant or shipyard; its value is position, timing and access.",
    detail: [
      "A BARREN orbit cannot support WORK, but ships can occupy it, FIRE from it, EVADE there, contest it and use it for TRANSFER or INTERCEPT.",
      "A barren orbit should matter because it changes a decision: route timing, missile geometry, support or escape."
    ]
  },
  {
    id: "missile",
    label: "MISSILE",
    aliases: ["MISSILE", "MISSILES"],
    short: "A delayed FIRE threat travelling toward one target ship and one future impact.",
    detail: [
      "FIRE launches one autonomous nuclear missile-drone from a magazine of roughly ten to twelve.",
      "It attacks predicted geometry, watches defensive tracers and jinks toward the single turret's blind angle.",
      "The deterministic ETA creates no immediate damage.",
      "At IMPACT a non-CONTESTED target automatically EVADES if its faction can pay 1 ΔV.",
      "BURN before impact breaks the firing solution; no affordable geometry means the ship is destroyed."
    ]
  },
  {
    id: "impact",
    label: "IMPACT",
    aliases: ["IMPACT", "IMPACTS", "IMPACTING"],
    short: "The resolution moment when an incoming missile forces EVADE or destroys its target.",
    detail: [
      "Missile IMPACT resolves after mandatory departures and before same-turn ship arrivals.",
      "Because arrivals happen later, a ship arriving on the impact turn cannot contest the target early enough to block that target's EVADE."
    ]
  },
  {
    id: "eta",
    label: "ETA / T±",
    aliases: ["ETA", "T+", "T-"],
    short: "Turns until an arrival or impact; T+ marks arrival, T- marks an approaching threat.",
    detail: [
      "ETA is measured in turns. A BURN order is displayed as T+N to show its arrival horizon; an inbound missile is displayed as T-N to show turns remaining before impact.",
      "Transfer timing is deterministic for the current orbital state. The preview shows the plan that can be executed now."
    ]
  },
  {
    id: "projection-arrow",
    label: "->",
    aliases: ["->"],
    short: "Separates the current value from its projected value after queued orders.",
    detail: [
      "Read left to right: current state, then projected state.",
      "The right-hand value includes queued planning effects but is not committed until EXECUTE."
    ]
  },
  {
    id: "turn",
    label: "TURN",
    aliases: ["TURN", "TURNS"],
    short: "One simultaneous planning and deterministic resolution cycle.",
    detail: [
      "Every FACTION queues orders against one shared visible state.",
      "EXECUTE freezes the plan.",
      "Resolution is deterministic, simultaneous and phase-ordered.",
      "T=Earth-Moon transfer ≈3 days.",
      "WORK resolves after movement and actions.",
      "The command log is the player-facing chronology."
    ]
  },
  {
    id: "orbit",
    label: "orbit",
    aliases: ["orbit", "orbits", "orbital"],
    short: "The moving playable position attached to a planet or moon.",
    detail: [
      "Commands target an orbit, not the visual planet or moon itself. Bodies provide gravity and moving spatial reference.",
      "Orbital phase changes transfer timing and cost, but camera position and visual scale never change the simulation."
    ]
  },
  {
    id: "ship",
    label: "SHIP",
    aliases: ["SHIP", "SHIPS"],
    short: "A manned fusion vessel, weapons platform and carrier for the crews of future ships.",
    detail: [
      "Operational unit: each TURN resolves as WORK, EVADE, BURN or FIRE, subject to CONTESTED restrictions.",
      "A docking spine carries replaceable habitat, reactor, radiator and weapon modules.",
      "The weapon section mounts one rapid-fire turret and approximately ten to twelve nuclear missile-drones.",
      "Life support is provisioned for the active complement and the reserve crews expected to commission new hulls.",
      "Ships physically carry canisters and reaction mass, but the game exposes no local inventory.",
      "Every cost is paid from global faction ΔV."
    ]
  },
  {
    id: "faction",
    label: "FACTION",
    aliases: ["FACTION", "FACTIONS", "PLAYER", "ENEMY"],
    short: "One side in the conflict, sharing ships, production and a global ΔV reserve.",
    detail: [
      "A FACTION is one corporate industrial network: ships, yards, tritium plants, compute and command authority.",
      "All ships pay from one ΔV reserve, so they compete for the same future movement and survival budget.",
      "On Earth the corporation remains subject to law, tax, sanctions and arrest.",
      "In the outer system no government owns a comparable fleet already close enough to intervene.",
      "Faction viability, rather than score or formal sovereignty, determines VICTORY."
    ]
  },
  {
    id: "upkeep",
    label: "UPKEEP",
    aliases: ["UPKEEP"],
    short: "The 2 ΔV paid each turn for every faction ship held in a contested orbit.",
    detail: [
      "CONTESTED upkeep resolves first. Each contested ship and faction pays 2 ΔV before mandatory departures, missile impacts or ordinary actions.",
      "Holding a physical lock is therefore a continuing claim on the same global reserve used for BURN and EVADE."
    ]
  },
  {
    id: "victory",
    label: "VICTORY",
    aliases: ["VICTORY", "WINS", "WIN"],
    short: "Be the only faction with a strategically viable path to continuing tritium access.",
    detail: [
      "VICTORY occurs when only one faction remains tritium-viable within the short operational window.",
      "The check includes production, movement, contesting and imminent shipyard output. It is not a score threshold or a requirement to occupy every orbit."
    ]
  },
  {
    id: "signal-lost",
    label: "SIGNAL LOST",
    aliases: ["SIGNAL LOST", "CREW LOST"],
    short: "The log has confirmed that a ship was destroyed or irrecoverably lost.",
    detail: [
      "SIGNAL LOST confirms destruction; the surrounding entries preserve the resolved mechanical cause.",
      "Ships are manned. A normal loss kills at least one twelve-person watch and may erase several reserve complements.",
      "The first openly attributable loss near Saturn converted industrial competition into a murder investigation and armed conflict.",
      "Earth receives the telemetry in about eighty minutes. No enforcement fleet can arrive on that clock.",
      "The message is a consequence, not a separate action."
    ]
  },
  {
    id: "year-2079",
    label: "2079",
    aliases: ["2079"],
    short: "The year corporate war begins beyond the protected Earth-Moon corridor.",
    detail: [
      "Fusion power is mature; AI-scale compute expands until electricity, fabrication and discarded heat become the limits.",
      "Robotic mines, atmospheric skimmers and tritium plants have made the first outer systems independent of terrestrial fuel.",
      "Earth and MOON remain PROTECTED. Registered ships remain under terrestrial jurisdiction; enforcement assets are concentrated in the corridor.",
      "Corporate FACTIONS own the only complete industrial fleets near the gas and ice giants.",
      "The first attributable hostile action occurs near Saturn. Terrestrial authorities begin legal and diplomatic review after receiving the telemetry."
    ]
  },
  {
    id: "production",
    label: "PRODUCTION",
    aliases: ["PRODUCTION", "PRODUCES", "PRODUCE", "PROGRESS"],
    short: "The economy-phase result of eligible WORK at tritium plants or shipyards.",
    detail: [
      "PRODUCTION happens after actions. TRITIUM work adds ΔV; SHIPYARD work advances assembly by one step.",
      "BURN, FIRE, EVADE, same-turn arrival and CONTESTED state can all prevent a ship from contributing production that turn."
    ]
  }
] as const satisfies readonly GameGlossaryEntry[];

export const gameGlossaryEntries = [
  ...mechanicGlossaryEntries,
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
        `"${word}" is part of the surrounding log sentence.`,
        "It qualifies or connects the adjacent mechanic, body, value or action.",
        "No independent simulation state is attached to this word."
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
        `${raw} identifies one planning and resolution cycle in the command log.`,
        "Leading zeroes preserve column alignment. They do not change duration or resolution order."
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
        "A minus sign is expenditure. A plus sign is income. No sign is a stored or projected faction-wide balance.",
        "The number belongs to the visible command or telemetry result; it is not a resource carried by one SHIP."
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
        ? `${raw} places an ARRIVAL that many turns after the current command.`
        : `${raw} leaves that many turns before IMPACT.`,
      detail: [
        isArrival
          ? `${raw} is a deterministic future BURN arrival horizon.`
          : `${raw} is a deterministic incoming MISSILE countdown.`,
        "The number counts EXECUTE cycles, not animation time.",
        "Camera motion and zoom never change it."
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
        `${raw} is stored SHIPYARD assembly progress.`,
        "The numerator is completed eligible WORK. The denominator is completion.",
        "Progress belongs to the yard and can be captured."
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
        `${raw} is a setting-scale duration, not a separate command.`,
        "The simulation resolves in integer turns; renderer animation does not represent the full physical interval."
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
        `${raw} is a count of whole simulation turns.`,
        "It measures deterministic rule cycles, not renderer frames or real-time seconds."
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
        `The log preserves ${raw} exactly as recorded.`,
        "Read the neighbouring unit or noun to distinguish time, distance, mass, temperature, count, cost or state.",
        "The number alone creates no additional rule."
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
