export type DevlogReference = Readonly<{
  label: string;
  href: string;
}>;

export type DevlogFigure = Readonly<{
  afterParagraph: number;
  src: string;
  reducedMotionSrc?: string;
  alt: string;
  caption: string;
}>;

export type DevlogEntry = Readonly<{
  category: string;
  slug: string;
  title: string;
  date: string;
  deck: string;
  body: readonly string[];
  references?: readonly DevlogReference[];
  figures?: readonly DevlogFigure[];
}>;

const turn36ScreenshotUrl = new URL(
  "../../diagnostics/tutorial-deep-pass-deployed-2026-07-30/screens/58-turn36-clean.png",
  import.meta.url
).href;

const burnPretzelScreenshotUrl = new URL(
  "../../diagnostics/tutorial-deep-pass-deployed-2026-07-30/screens/28-burn-pretzel-zoomed.png",
  import.meta.url
).href;

const replayRewoundScreenshotUrl = new URL(
  "../../diagnostics/tutorial-deep-pass-deployed-2026-07-30/screens/53-replay-rewound.png",
  import.meta.url
).href;

const campaignScreenshotUrl = new URL(
  "../../diagnostics/tutorial-deep-pass-deployed-2026-07-30/screens/31-t14-system-view.png",
  import.meta.url
).href;

const mandatoryLaunchScreenshotUrl = new URL(
  "../../diagnostics/tutorial-deep-pass-deployed-2026-07-30/screens/38-mandatory-launch-preview.png",
  import.meta.url
).href;

const openInformationScreenshotUrl = new URL(
  "../../diagnostics/tutorial-deep-pass-deployed-2026-07-30/screens/32-t14-fit-system.png",
  import.meta.url
).href;

const firePreviewScreenshotUrl = new URL(
  "../../diagnostics/tutorial-deep-pass-deployed-2026-07-30/screens/17-fire-preview-phobos.png",
  import.meta.url
).href;

const burnAnimationUrl = new URL("./assets/devlog/orbital-burn.gif", import.meta.url).href;
const burnAnimationPosterUrl = new URL(
  "../../diagnostics/tutorial-deep-pass-deployed-2026-07-30/screens/11-burn-long-resolution-650ms.png",
  import.meta.url
).href;

const fireAnimationUrl = new URL("./assets/devlog/fire-resolution.gif", import.meta.url).href;
const fireAnimationPosterUrl = new URL(
  "../../diagnostics/tutorial-deep-pass-deployed-2026-07-30/screens/22-fire-after-resolution.png",
  import.meta.url
).href;

const contestedAnimationUrl = new URL("./assets/devlog/contested-orbit.gif", import.meta.url).href;
const contestedAnimationPosterUrl = new URL(
  "../../diagnostics/tutorial-deep-pass-deployed-2026-07-30/screens/24-contested-frame-2.png",
  import.meta.url
).href;

/**
 * A public, extradiegetic devlog. Claims must remain traceable to the project archive, canon,
 * diagnostics or simulation output. Publication dates follow the development record at day-level
 * precision; entries are presented newest first.
 */
const devlogArchive = [
  {
    category: "STRATEGY",
    slug: "how-to-wage-war-in-space",
    title: "How to Wage War in Space",
    date: "2026-08-01",
    deck: "Orbital warfare is about what can be reached, when it can be reached and what the trip will cost. DeltaV has no front line and little reason to fight over empty space.",
    body: [
      "Empty space cannot be held in the same way as land. Every useful position is moving, and a ship that appears to be retreating may be improving its route to an encounter several turns away. Position is therefore a list of options: where the fleet can go, when it can arrive, which enemy can get there first and how much fuel will remain afterwards.",
      "The objective follows the same logic. A faction stays in the war while it has a workable route to tritium, the resource that restores the delta-v used to move and evade. Destroying the enemy fleet can remove that route, but occupying a productive orbit, stealing work from a shipyard or forcing repeated evasions may cost less. A ship matters because of the moves its remaining reserve still allows.",
      "The map is organized around planets and moons, not territory. Their changing positions open and close transfer windows. A moon can provide a cheap staging point near tritium, a shipyard or an expected route. For that reason, a barren moon may be more useful than a productive one when it offers the only affordable support position near a contested orbit.",
      "A command decision compares whole plans across several turns. The relevant values are arrival time, delta-v left on arrival, exposure to missiles and the WORK turns given up by every ship involved. A short route can still be a poor choice if it arrives too late or leaves no reserve for the response.",
      "Delta-v is fuel, but it also sets how many options a faction can keep open. A large reserve pays for expensive departures, repeated evasions and forced transfers. Spending it changes the position even when no ship is lost. At low reserve, a visible missile can close a route because the target cannot afford both the transfer and the likely evasion.",
      "Production has its own timing. A ship that uses WORK cannot FIRE in the same turn, and a ship forced to EVADE loses that turn's production. Five WORK turns at a shipyard complete a vessel, but the progress stays with the yard and can be stolen. An industrial attack can therefore succeed by interrupting work or arriving just before completion, without destroying the facility.",
      "Missiles also work through timing. FIRE sets an arrival turn instead of causing immediate damage, so the target has time to change its plan. An uncontested ship with enough reserve will usually evade, spending delta-v and losing its WORK for that turn. A missile becomes lethal after repeated attacks drain the reserve, when a contested orbit blocks evasion, or when leaving would surrender a more valuable position. The best target is often the ship whose work or transfer schedule can be disrupted, not the easiest hull to destroy.",
      "Local superiority is not a simple hull count. Two ships in a contested orbit can hold each other in place while both factions pay upkeep. A third ship outside the contest may decide the outcome by firing at the trapped opponent, reaching the reinforcement route first or threatening the escape route. Sending every available hull into the contest can remove the outside support needed to sustain it.",
      "Orders resolve at the same time, so a faction cannot react to an enemy choice made earlier in the turn. Everyone sees the same map, but not the orders being prepared. A ship able to reach three destinations forces the opponent to prepare for all three even though it will choose only one. The uncertainty comes from intent and cost, not hidden units.",
      "Campaign planning begins by counting each side's workable routes to tritium. The next step is to find which routes can be made too expensive. Denying a WORK turn is worthwhile when it costs less than the income prevented. Missiles should arrive after a target has committed to work or movement, and shipyards are most vulnerable near completion. A battle has little value when it changes none of the routes, production, support or recovery options that follow it.",
      "DeltaV does not calculate every detail of real spaceflight. Geometry sets the available routes, delta-v sets which routes can be afforded, and timing sets when a choice can no longer be changed. The cheapest transfer, the earliest arrival and the move that keeps a faction supplied are often three different orders."
    ],
    figures: [
      {
        afterParagraph: 2,
        src: campaignScreenshotUrl,
        alt: "A DeltaV system view showing several planetary systems, ships and future routes",
        caption:
          "The campaign view is read as a set of routes and arrival times. Empty space has no value by itself."
      }
    ]
  },
  {
    category: "DESIGN / HARD SCIENCE FICTION",
    slug: "plausibility-sells-the-fantasy",
    title: "Plausibility Sells the Fantasy",
    date: "2026-07-31",
    deck: "DeltaV derives its units and objectives from the constraints of orbital warfare, then introduces only the abstractions required to make those constraints playable.",
    body: [
      "Under DeltaV's assumptions, an exposed crewed installation that cannot move is strategically dead in the water. Its position is known, its machinery must radiate heat, and it cannot spend delta-v to force an attacker to recalculate the approach. Armour and defensive weapons can make an attack more expensive, but only movement can prevent the encounter before close combat begins.",
      "A surface installation has better prospects because rock provides armour and a moon supplies an obstructing horizon. It can be buried, dispersed and difficult to identify precisely. Its military problem begins when it needs to affect another orbit. Propellant, finished hardware and people must emerge through a limited set of launch corridors, after which their trajectories become visible and predictable. DeltaV therefore treats tritium plants and shipyards as strategic locations whose military value depends on mobile forces able to reach and operate them.",
      "DeltaV therefore has no immobile stations acting as roadblocks, no planetary batteries with arbitrary range and no civilian population represented as hit points. Ships are the military units because they carry enough delta-v to change position before an attack arrives. A facility matters only when a mobile force can work there, contest it or block access to it.",
      "A normal build queue hides a great deal of transport. A finished warship needs crew, fuel and command equipment, while a completed ship left on the surface or beside a fixed station would inherit the same vulnerability as the facility. DeltaV shipyards therefore store disassembled hulls: protected pressure sections, docking spines, radiators and drive modules that remain in pieces until a ship supervises launch, assembly and testing.",
      "The ship working the yard carries the reserve personnel, fuel canisters and command authority required to commission the new hull. When assembly finishes, a reserve complement transfers across and the incumbent must burn away, leaving the newly commissioned ship at the yard. Mandatory launch converts the logistics into a game rule: a route and its cost must be reserved before completion, while the opposing faction can schedule pressure around a departure known to be compulsory.",
      "The stored hull is one plausible answer, not the only engineering answer. What matters is that industry can stay under armour and spread across several facilities, while military power appears only after the parts and crew become a mobile ship. Shipyard progress can be captured because the finished parts and completed tests remain at the site.",
      "DeltaV makes other compromises of the same kind. Astronomical distances are compressed unevenly so that moons remain visible without making interplanetary travel feel local. Transfers are expressed as discrete orders rather than continuously replanned burns. Terminal combat becomes missile pressure, evasion and orbital contests instead of a second-by-second guidance simulation. Tritium reserves are public even though no telescope could read the gauge, because the uncertainty belongs in simultaneous intent rather than private accounting.",
      "The standard is not whether every displayed curve could serve as a real flight plan. Each rule must preserve the strategic pressure created by physics, and each simplification needs a clear purpose. The setting remains believable when players can predict the broad result from the situation and the game states its exceptions clearly."
    ],
    figures: [
      {
        afterParagraph: 4,
        src: mandatoryLaunchScreenshotUrl,
        alt: "A mandatory launch preview from Saturn toward a completed shipyard at Mars",
        caption:
          "A completed hull forces the working ship to reserve and execute a departure. The logistics appear on the map as a route, a cost and a deadline."
      }
    ]
  },
  {
    category: "SENSORS / INFORMATION",
    slug: "there-is-no-stealth-in-space",
    title: "There Is No Stealth in Space",
    date: "2026-07-31",
    deck: "A warship is a hot machine throwing reaction mass into a cold background. It may be distant, poorly resolved and difficult to identify, but those limitations do not justify fog of war or a concealed economy in DeltaV.",
    references: [
      {
        label: "Stealth in Space — Children of a Dead Earth",
        href: "https://childrenofadeadearth.wordpress.com/2016/07/12/stealth-in-space/"
      }
    ],
    body: [
      "The Children of a Dead Earth article linked above works through the engineering cost of hiding exhaust, radiators and a combat-capable power system. Space offers an excellent cold background and very little in the way of a convenient horizon. A vessel can reduce a particular signature, coast after a previously observed burn or hide hardware on a planetary surface, but none of those measures makes an operating interplanetary warship disappear at a militarily useful range.",
      "DeltaV adopts the strategic consequence without pretending to simulate an infrared telescope. Every ship, transfer and missile is visible to every commander, including its destination and arrival turn once it has launched. Shipyard progress and faction tritium reserves are also public, so the interface reveals exactly how much delta-v remains available for burns, upkeep and evasion.",
      "A telescope would not read a propellant gauge from across the Solar System. Showing the reserve is a game-design choice, not a claim about sensor resolution. If that number were hidden, players would need an external ledger or would have to guess whether an escape was affordable. With a public reserve, everyone knows what an opponent can pay for while the chosen order and willingness to pay remain unknown.",
      "Complete information does not make an opponent predictable. Orders are simultaneous, and only the commander knows which cost is acceptable. A ship beside a tritium plant may WORK, FIRE or depart, and a large reserve makes all three believable. Deception therefore comes from posture, commitment and resource allocation rather than undiscovered units.",
      "The distinction between detection and identification also survives. The game exposes mechanically relevant state because hiding it would add bookkeeping, yet the strategic meaning of that state is not labelled. A missile with a visible arrival time may be intended to drain one point of delta-v, cancel a productive turn, drive a ship out of a contested orbit or distract support from a shipyard. The projectile supplies position and timing but not the strategic purpose of the order.",
      "Removing fog of war changes the interface as much as the balance. The planetarium must show distant threats without filling the screen with warnings, and the log must show how a reserve was spent. Dotted trajectories, arrival labels and public reserves are part of the shared game state, not optional hints.",
      "Plausible concealment remains possible for dormant hardware on or beneath a moon, civilian traffic whose purpose is misrepresented, or vehicles accepting severe limits on power and travel time. The current rules instead model mobile forces after propulsion and combat systems are active. At that operational stage, hidden reserves would primarily add accounting uncertainty while visible orders and simultaneous intent already provide strategic uncertainty."
    ],
    figures: [
      {
        afterParagraph: 2,
        src: openInformationScreenshotUrl,
        alt: "A wide DeltaV system view with visible ships, reserves and movement markers",
        caption:
          "Ships and reserves are public. The unknown is which of the visible options each faction will choose."
      }
    ]
  },
  {
    category: "AI / STRATEGY",
    slug: "how-the-ai-thinks-in-orbits",
    title: "How the AI Thinks in Orbits",
    date: "2026-07-23",
    deck: "The AI does not begin by looking for the highest-value target. It first checks whether the faction can still move, evade and produce after the attack.",
    body: [
      "The opponent is not a language model and it does not learn during a match. It is a rule-based planner using the same public information as the player: every orbit, transfer, missile, shipyard and tritium reserve. It cannot see the human orders being prepared during the current turn. Rival AI factions receive the same limitation.",
      "Every faction plans from a frozen copy of the state at the start of the turn. Without that copy, an AI processed later could react to an order that should still be secret. The game checks that planning did not change the shared state, then combines all orders only after every faction has finished. Processing order therefore gives no faction extra information.",
      "The planner first asks whether the faction can keep paying its costs. It checks safe and threatened tritium, usable income, upkeep in contested orbits, likely evasion costs, forced departures from completed shipyards and the reserve left afterwards. That estimate selects a broad approach: cautious expansion, normal expansion, recovery from a shortage or closing the remaining enemy supply routes.",
      "The AI then considers concrete actions: racing for tritium, securing a second source, stealing work from a nearly complete shipyard or firing at a productive ship. These targets are valuable for different reasons. The yard contains work that can be captured, the tritium orbit provides income, and a missile can cancel WORK or force the target to spend reserve.",
      "Each proposed action must pass an affordability check. A burn is rejected when it abandons the last safe tritium worker, spends reserve needed for an incoming missile, creates upkeep the faction cannot sustain or completes a ship without enough delta-v to move the old ship out of the yard. A valuable target does not justify a plan that leaves the attacking faction unable to operate.",
      "The planner repeats that check after all orders have been chosen. Several attacks may be affordable on their own but impossible to maintain together. When the full plan costs too much, the AI cancels the least useful new contest. If existing contests already cause the shortage, it looks for the cheapest one to leave.",
      "The AI can also create a small fork by threatening two tritium sources or combining a missile with a movement problem. It chooses a fork when the opponent cannot pay every resulting cost at once, not simply because several attacks are legal.",
      "The last active tritium worker receives special protection. Earlier planning rules could send that ship toward a valuable target and remove the income needed to finish the operation or survive the response. The current rule allows departure only when another tritium route is available or the move produces a result worth the lost income.",
      "The planner is still a collection of forecasts, priorities and vetoes rather than a general intelligence. It does not search every campaign to the end, and playtesting can overturn its assumptions. When it repeats a bad strategy, the selected target, score and rejection reasons can be inspected directly.",
      "This makes the planner a practical test of DeltaV's strategy. Terms such as safe tritium, affordable contest, useful missile and stealable yard need exact meanings before the AI can act on them. Repeated failures show which parts of the game still lack a clear rule for judging a position."
    ]
  },
  {
    category: "TIME / SCALE",
    slug: "why-one-turn-is-three-days",
    title: "Why One Turn Is About Three Days",
    date: "2026-05-24",
    deck: "A turn is a block of planning time, not a stopwatch. About three days lets orbits and logistics change without turning a local crisis into one large calculation.",
    body: [
      "The Earth–Moon transfer provides the rough scale: one turn represents about three days. Not every displayed arc is a literal three-day flight, and match length does not set an official duration for the fictional war. The conversion simply tells the player whether a warning should be understood in days, seconds or months.",
      "A much shorter turn caused two problems. Orbital phases changed too little between decisions, and even modest transfers required a stack of nearly empty turns. The player was nominally in command at all times but rarely had a new strategic fact to consider. A much longer turn had the opposite defect: local maneuvers and industrial work collapsed into the same coarse interval, making it difficult to create a threat that could be observed and answered before resolution.",
      "At this scale, the shortest ship transfer can finish in one turn while a missile needs at least two. The defender therefore gets a chance to plan before impact, and a nearby ship may move sooner than the weapon threatening it. Longer routes change with orbital alignment, producing useful transfer windows without asking the player to run a full orbital calculation.",
      "Industry uses the same clock. A shipyard needs five uninterrupted WORK turns to finish a hull, placing construction at roughly two weeks rather than an afternoon or a fiscal quarter. Progress is public and can be stolen, so both sides can plan around the completion turn. Completion also tells everyone when the working ship will be forced to leave during mandatory launch.",
      "The turn also suits command across several planetary systems. Communication delay makes continuous remote control less plausible, while local crews and software can carry out orders already received. DeltaV does not track message delay as another resource. Simultaneous planning keeps the relevant result: commanders commit a group of orders that cannot be revised halfway through resolution.",
      "Physical scale is compressed in layers. Interplanetary distance is compressed more than travel inside a moon system; otherwise most of a campaign would be spent waiting. The important relationships remain intact: local action is faster than distant reinforcement, missiles provide warning, production can be interrupted, and poor alignment costs time or delta-v.",
      "The interface uses whole turns to coordinate orders and approximate days only to communicate scale. The conversion does not alter the rules or claim the precision of a real flight plan."
    ],
    figures: [
      {
        afterParagraph: 2,
        src: burnAnimationUrl,
        reducedMotionSrc: burnAnimationPosterUrl,
        alt: "A ship moving along a long transfer preview over three captured stages",
        caption:
          "A long transfer resolves across one planning interval. The loop pauses before departure and after arrival so the change in position remains readable."
      }
    ]
  },
  {
    category: "WEAPONS",
    slug: "why-deltav-begins-with-missiles",
    title: "Why DeltaV Begins with Missiles",
    date: "2026-05-24",
    deck: "Lasers, railguns and nuclear devices all belong in space warfare. Missiles come first because they create decisions on the orbital map without requiring a full close-combat simulation.",
    body: [
      "Each plausible weapon needs a different close-combat model. Lasers arrive at light speed but depend on aperture, beam quality, aiming and heat rejection. Railguns and coilguns depend on power, barrel mass, recoil, projectile mass and accuracy. Nuclear payloads lose the atmospheric blast wave familiar on Earth, so distance and radiation become more important. Any one of these systems could support a large simulation by itself.",
      "DeltaV begins one level above that engineering detail. Its central decisions concern reach, timing and the shared delta-v reserve, so the first weapon needed to participate in all three. A missile leaves a known orbit, follows a visible transfer and arrives in a future turn. Its propulsion can be evaluated by the same geometry used for ships, while its travel time creates room for evasion, reinforcement and the possibility that the target will voluntarily abandon something productive.",
      "A laser does not fit the current level of detail. At this scale, firing and impact would happen together, so the real decisions would concern heat, aiming, time on target, armour and component damage. Without those variables the laser becomes an arbitrary range check. With them, DeltaV would need a separate close-combat and ship-design game.",
      "Railguns have the same problem from another direction. Their chance to hit depends on distance, relative speed, projectile spread, target size and the approach chosen before the encounter. DeltaV decides whether two ships can force a local contest, but it does not simulate the few seconds in which they pass each other at several kilometres per second. A gun added without that encounter model would leave out the variables that decide the shot.",
      "Missiles permit a cleaner abstraction because the defender's response is itself an orbital maneuver. An uncontested target with enough delta-v automatically evades each impacting missile at a cost of one. The rule collects guidance, terminal defense and a great deal of detailed engineering into a result that remains strategically useful: the attack forces movement expenditure and interrupts WORK. If the target is already contested or cannot pay, the impact destroys it. There are no hit points to erode because hull damage is not the scale at which the player is commanding.",
      "FIRE costs no delta-v at launch, although the firing ship forfeits its action and therefore cannot WORK during that turn. This prevents ammunition accounting from becoming a second economy while preserving a substantial cost for casual attacks. A ship beside a tritium plant gives up immediate income to create future pressure; whether the exchange is favourable depends on the target's reserve, work schedule and available escape routes.",
      "Choosing missiles first does not remove lasers or guns from the setting. It sets a design rule: a weapon belongs in DeltaV when it creates a distinct command problem that can be shown on the map. Missiles do that through travel time, reserve cost and interrupted work. A laser or railgun will need its own clear decision, not just a different effect for the same result."
    ],
    figures: [
      {
        afterParagraph: 1,
        src: firePreviewScreenshotUrl,
        alt: "A FIRE preview aimed at a ship approaching Phobos",
        caption:
          "The firing solution shows target, arrival and warning time before the order is committed."
      }
    ]
  },
  {
    category: "SIMULATION / BALANCE",
    slug: "what-a-missile-is-for",
    title: "What a Missile Is Actually For",
    date: "2026-07-23",
    deck: "The first FIRE rule was expensive and easy to evade. Matches on paired maps tested whether missiles changed a campaign or merely added activity to the screen.",
    body: [
      "The test compared pairs of generated maps. One AI could FIRE and the other could not, then their starting positions were swapped and the match was repeated. The firing policy won a clear majority of decisive matches. Swapping sides mattered because a favourable starting geometry could otherwise decide the result before missile policy had any effect.",
      "Destructive impacts accounted for only a small fraction of the advantage. Most missiles were evaded, diverted by a departing target or launched at the cost of productive work by the firing ship. The policy succeeded because those exchanges repeatedly disrupted the opponent's schedule. Evasions consumed delta-v, threatened ships abandoned productive orbits, and WORK disappeared on both sides of the firing solution.",
      "FIRE changed strategic outcomes, although geometry and endgame choices still decided whether the advantage could be used. Successful attacks shared clear conditions: missiles arrived against productive ships, low reserves or positions the defender could not cheaply leave.",
      "The benchmark did not show that firing whenever possible was sensible. A target with ample delta-v will evade, and the attacking ship may surrender more tritium than the defender spends. FIRE becomes attractive when impact coincides with productive work, when several missiles make evasion expensive, or when leaving the orbit would concede a shipyard, tritium plant or local support position. Firing priority is therefore calculated from the target's WORK schedule and projected reserve before the probability of hull destruction.",
      "Two coordinated missiles illustrate the difference. If they arrive against an uncontested ship with sufficient reserve, the ship can survive both by paying twice and losing the turn's work. If another ship has already made the orbit contested, evasion is unavailable and the same impacts become lethal. If the target burns away before impact, the firing solutions are broken. Every outcome depends on preparation visible several turns earlier.",
      "A useful firing doctrine follows from the opportunity cost. Prefer productive targets, ships already constrained by another commitment, and arrivals that coincide with a transfer window the defender wants to use. Avoid firing merely because the command is legal. Pressure several parts of the reserve when possible, because a missile that forces an expensive burn may matter more than one that finally hits an immobile ship.",
      "The test kept FIRE because it changed strategy in a way ordinary movement did not. It also set a balance requirement: missiles need costs that prevent players from selecting FIRE every turn. Those costs are the lost WORK turn, visible travel time and automatic evasion. Further tuning should adjust that exchange rather than introduce hit points unrelated to the rest of the game."
    ],
    figures: [
      {
        afterParagraph: 2,
        src: fireAnimationUrl,
        reducedMotionSrc: fireAnimationPosterUrl,
        alt: "A missile strike shown from firing preview through impact and aftermath",
        caption:
          "The loop holds on the firing solution, advances through impact and stops on the resulting state."
      }
    ]
  },
  {
    category: "TACTICS",
    slug: "contested-orbits",
    title: "Contested Orbits and the Geometry of a Siege",
    date: "2026-05-25",
    deck: "Opposing ships in the same useful orbit lock each other out of normal work. The ships and routes around that orbit decide which side can afford to stay.",
    body: [
      "Resolving local combat immediately would make it too simple. The first ship to reach a productive orbit would either capture it outright or enter a fight decided by unit count. CONTESTED instead means that two crewed ships deny each other safe operation without opening a separate close-combat game.",
      "A contested ship cannot WORK, FIRE or EVADE. It may stay or burn away, and each faction in the orbit pays two delta-v per turn. That payment covers continued maneuver, readiness and local control; it is not damage to the hull.",
      "With equal reserves and one ship per faction, a contest is a symmetric resource drain. Support outside the orbit breaks that symmetry. A supporting ship can fire into the position, reach a reinforcement route first or occupy the likely escape route, while the vessel inside prevents the target from evading. The local balance therefore includes the surrounding support geometry rather than only the ships inside the contested orbit.",
      "Productive sites make the timing sharper. Contested tritium produces nothing, so an attacker may accept the same upkeep cost as the defender merely to stop income. At a shipyard, existing progress is frozen but remains attached to the facility. Arriving shortly before completion can therefore capture work already performed, provided the attacker can survive the local response and eventually clear the contest.",
      "Remaining is rational when denied production exceeds upkeep, support is approaching, or departure would give the opponent an immediate strategic route. Departure is rational when continued upkeep consumes the reserve required for a higher-value burn. Public reserves allow both factions to estimate the turn on which maintaining the contest ceases to be viable.",
      "The rule leaves close combat unresolved and keeps only the consequences needed at campaign scale. A detailed combat layer would be useful only if it added decisions not already covered by contest, outside support, upkeep and escape routes."
    ],
    figures: [
      {
        afterParagraph: 1,
        src: contestedAnimationUrl,
        reducedMotionSrc: contestedAnimationPosterUrl,
        alt: "Two opposing ships entering the same orbit and creating a contested state",
        caption:
          "Two ships enter the same useful orbit. Production stops, evasion closes and both factions begin paying upkeep."
      }
    ]
  },
  {
    category: "VICTORY / ECONOMY",
    slug: "war-ends-before-last-ship-dies",
    title: "Tritium Viability as a Victory Condition",
    date: "2026-05-25",
    deck: "DeltaV does not wait for every ship to be destroyed. A faction loses when it no longer has a workable route to the tritium needed for movement, evasion and attack.",
    body: [
      "A conventional elimination rule waits until the final hull has been destroyed even when the remaining fleet has no affordable route to production or contact. A score based on bodies, facilities or territory has the related defect of measuring possession without testing whether a faction can continue to move and contest those assets.",
      "The victory check asks whether each faction still has a believable route to produce tritium or contest access to it within the next few turns. Ships already working count, but so do ships in transit, affordable transfers and vessels about to leave a shipyard. A large fleet can therefore lose while it is still intact if none of those ships can restore supply.",
      "This changes the meaning of defense. Protecting the last tritium source is not equivalent to protecting a capital in a territorial game, because the relevant object is a path rather than a place. A faction may deliberately abandon the current plant if it can reach another source with enough reserve to survive the journey. Conversely, occupying several valuable orbits means little when none can replenish the movement required to hold them.",
      "Missiles and contested upkeep become decisive through this rule without needing a destruction quota. Repeated evasion can push a reserve below the cost of the only recovery burn. A contest can make an otherwise productive source economically unavailable. A well-timed arrival can close the last viable route even if most of the opposing fleet remains untouched elsewhere.",
      "The viability check also tells the AI when to change posture. Once opponents have no stable tritium and the leading faction can maintain its own access, expansion becomes less important than closing the remaining recovery routes. When its own projection turns negative, the same planner stops treating attacks as ordinary opportunities and enters a conservative recovery mode. Victory and AI strategy are consequently evaluating the same material question from different sides.",
      "The check looks only a few turns ahead and includes orders already in progress. Searching every possible future would be too expensive, while checking only the current orbit would end some matches too early. Defeat is declared when no route inside that short horizon can restore tritium access or contest the opponent's supply."
    ]
  },
  {
    category: "PLANETARIUM",
    slug: "map-of-future-positions",
    title: "Designing the Planetarium Around Future Position",
    date: "2026-07-26",
    deck: "The planetarium is built to show future position, not literal scale. Distances, body sizes and curves are adjusted only when the real proportions would hide a useful decision.",
    body: [
      "Astronomical scale is hostile to interface design. Render the Solar System literally and the moons disappear beside their planets, ships disappear beside the moons, and most of the screen becomes distance without usable information. Equalize every separation and the opposite happens: a transfer between planets feels equivalent to moving between neighbouring moons. DeltaV compresses both, but it compresses interplanetary space more aggressively so that local and distant movement remain different classes of commitment.",
      "Bodies follow predictable orbital paths, while their starting positions vary with the map seed. Transfer windows come from those positions rather than a random event. A route can become cheaper as the destination moves into a favourable place, and the same order on another turn may cost more or arrive later. The player does not need to solve the orbital equations, but the map must show that destination and travel time belong to the same decision.",
      "Transfer previews use orbital geometry without claiming flight-plan accuracy. An arc leaves the current orbit, rises out of the common plane so it can be seen and meets the predicted destination. The rules calculate cost, duration and arrival; the curve shows how they fit together. One early BURN curve doubled back around its endpoints even though every number was valid, so the shape described the wrong maneuver.",
      "The camera is part of the interface. Left drag pans, right drag orbits, the wheel changes scale and a double click selects a new focus. Pitch limits prevent an unreadable edge-on view while keeping enough perspective to separate high transfers from local orbits. Stable controls let the player compare the same position across several turns.",
      "Long shadows, enlarged bodies and luminous orbital rings are explicit visual distortions. Shadows separate small bodies from a dark background and establish the direction of the central light source. Enlarged bodies maintain visibility across compressed distance scales. Orbit rings expose trajectory and future position. Each distortion is retained only when it communicates a relationship used by the rules.",
      "The same rule applies around the map. Command history must be wide enough to explain a complicated turn without covering the emptiness that communicates system scale. Tooltips, dotted paths and labels are reserved for information needed to plan or understand an outcome. Repeated and decorative information is removed."
    ],
    figures: [
      {
        afterParagraph: 2,
        src: burnPretzelScreenshotUrl,
        alt: "A malformed DeltaV burn preview looping around Mars and Deimos",
        caption:
          "The curve folded back through the local system despite valid endpoints and cost, so it did not represent the transfer order."
      }
    ]
  },
  {
    category: "PLAYTEST / INTERFACE",
    slug: "playing-past-the-tutorial",
    title: "Playing Past the Tutorial",
    date: "2026-07-30",
    deck: "Long play sessions exposed problems that rule tests could not see: misleading curves, controls fighting over the same click and a command history that ran out of room.",
    body: [
      "The test continued through the tutorial and into a normal match, until several fleets, transfers and missiles overlapped on the same map. Performance remained comfortable. The important failures came from correct game state being shown in a misleading way.",
      "The BURN pretzel was the clearest example. Origin, destination, cost and ETA all passed their tests, while the curve between them looped around the local system and showed the wrong maneuver. Automated checks could confirm the numbers but not whether a moving camera made the path understandable.",
      "The same session exposed a firing preview detached from its target, support fire that disappeared at wide zoom, command history clipping after longer explanations and a glossary interaction that captured a click intended for replay. These defects did not alter simulation state, but each prevented the player from reading or operating on that state correctly.",
      "Saved states allow the exact turn and camera context to be reopened after a correction. Replay verification checks both deterministic state and the explanation associated with it. A correction is incomplete when the current turn renders properly but rewinding restores the misleading presentation.",
      "The command history serves the same requirement. Hovering or selecting an event can return the planetarium to the ships, missiles and orbits involved, while the Logbook explains the relevant rule without covering the map permanently. Instruction is attached to the record of the match because a specific failure is more useful than generic advice once several causes overlap.",
      "Readability is part of correctness when orders are committed several turns ahead. A failed order should be explained by orbital geometry, insufficient delta-v or an enemy choice. The presentation must not hide those causes or suggest rules that do not exist."
    ],
    figures: [
      {
        afterParagraph: 0,
        src: turn36ScreenshotUrl,
        alt: "A wide DeltaV match with planets, ships, transfers and the command history visible",
        caption:
          "The extended match contained enough simultaneous movement and fire to expose failures hidden by isolated test scenes."
      },
      {
        afterParagraph: 3,
        src: replayRewoundScreenshotUrl,
        alt: "The DeltaV planetarium rewound with the matching command history visible",
        caption:
          "Replay restores the state, the camera and the explanation attached to the same event."
      }
    ]
  },
  {
    category: "ARCHITECTURE",
    slug: "simulation-that-can-disagree",
    title: "Separating Simulation from Presentation",
    date: "2026-07-23",
    deck: "The early prototype kept rules, controls and drawing in one page. That made experiments fast but made it difficult to tell whether a strange result came from the game or the picture.",
    body: [
      "The single-page browser prototype supported experiments with real-time piloting, orbital assistance, lasers, touch controls and several incompatible rule sets. Once the turn-based game needed repeatable results, that structure became risky: moving a label could alter state, and a drawing shortcut could quietly become a rule.",
      "The replacement separated a deterministic headless simulation from every browser and rendering concern. Core logic owns legal orders, transfer cost, missile arrival, contested upkeep, production and victory. It has no knowledge of Canvas, WebGL, camera focus, lighting, labels or animation. The planetarium consumes a result after the simulation has decided it, which is why a cinematic impact can be delayed for emphasis without delaying the actual rule.",
      "A temporary two-dimensional renderer remains useful for debugging and accessibility, while the three-dimensional planetarium is the player-facing view. Both read the same snapshots, and neither may decide that a ship can afford a burn or that an impact should destroy it. If the views disagree, the simulation can be inspected independently of animation timing.",
      "The simulation can now run matches without drawing them. Weapon policies can be compared across generated maps, then useful failures can be reopened in the browser. A saved seed reproduces the same opening, while content checks keep scenario values within the rules.",
      "Repeatable simulation is a development tool, not a requirement that every match play the same way. Starting phases, maps and enemy decisions provide variation. A recorded outcome can still be replayed until its cause is understood, separating a real rule interaction from a bug in state or order resolution.",
      "The architecture enforces a strict ownership rule. Rendering may clarify, exaggerate and dramatize the state, but only the headless simulation may determine legality and outcome. Any disagreement between picture and state is therefore a presentation defect rather than an ambiguous gameplay result."
    ]
  },
  {
    category: "AI / DEVELOPMENT",
    slug: "what-the-machine-was-good-for",
    title: "What the Machine Was Good For",
    date: "2026-08-01",
    deck: "Artificial intelligence contributed throughout development, but useful output appeared only when tests, recorded matches and direct inspection could reject a wrong answer.",
    body: [
      "The first prototypes could be generated as complete browser files. That was fast enough to test whether orbital movement produced useful decisions, but poor at preserving rules from one version to the next. Once the project had a repository, repeatable tests, recorded matches and browser control, the machine shifted from replacing the whole prototype to changing one system and checking the effects elsewhere.",
      "This capability did not improve judgment automatically. The machine invented a resource called DCC, renamed physical orbits as abstract nodes, forgot established rules when new ones arrived and once described a lighting improvement that produced an almost identical image. It also drew the circle that became the BURN pretzel. Each failure identified a missing constraint, source of project memory or verification step.",
      "Canon files preserve vocabulary and rule priority. The headless simulation checks outcomes without graphics, while browser sessions expose problems of scale, motion and interaction. Saved states connect the calculated result to the picture on screen. A change is proposed, run, inspected and revised with the failure kept as evidence.",
      "Artificial intelligence also appears inside DeltaV's science fiction, where distance prevents a remote authority from making every useful decision near the outer planets. Fleets and industrial systems need local models because instructions can arrive after the operational situation has changed. The game does not represent this as an intelligence statistic. Compute remains constrained by power, heat, communications and maintenance, the same physical systems that constrain every other useful machine in space.",
      "The same requirement applies inside the setting. A model is useful only when instruments can detect a bad result and an operator can reject it. During development those instruments are tests, recorded matches and the running game. For a fleet they are sensors, local information and the physical systems available on site.",
      "No list of model names is needed. The visible change is from whole-file generation to small repository edits, terminal experiments, controlled matches and direct inspection of the running game. Better constraints and faster checks mattered more than claims about model capability."
    ]
  }
] as const satisfies readonly DevlogEntry[];

export const devlogEntries: readonly DevlogEntry[] = [...devlogArchive].sort((left, right) =>
  right.date.localeCompare(left.date)
);
