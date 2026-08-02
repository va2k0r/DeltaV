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
    date: "2026-08-02",
    deck: "Every ship draws movement, defense and contested upkeep from the same fuel reserve. Depleting that reserve can defeat a fleet whose ships are still intact.",
    body: [
      "Most of DeltaV's strategy follows from the fact that a fleet can still have ships but no longer have enough mobility to use them effectively.",
      "Each side has one shared reserve of delta-v, meaning the amount of change in speed the fleet can still produce. Moving to another orbit spends it. Dodging a missile spends it. Keeping a ship beside an enemy in a contested orbit spends it every turn. A larger fleet has more options, but all of those ships depend on the same reserve.",
      "Tritium plants are the only reliable way to refill that reserve. A ship that gives an entire turn to a plant adds two points of delta-v; the interface calls this WORK. Moving, firing or dodging means giving up that work, so a missile can affect the economy without hitting its target.",
      "The interface calls a movement order a BURN. The destination keeps moving while the ship is in flight, and the same route can become cheaper, slower or unaffordable as the Solar System changes shape. Choosing a destination also means checking whether the ship will arrive in time and retain enough fuel for the following turn.",
      "Arrival does not grant an instant turn of production. A new ship can block an enemy immediately, but it must survive until the following turn before operating a plant or shipyard. A reinforcement that arrives one beat after a missile or a completed hull has missed the decisive moment, even if the map makes it look close.",
      "Enemy ships can share a valuable orbit and make it contested. Neither can work, fire or dodge there, and both sides pay to keep the lock in place. A supporting ship is often more dangerous just outside: it can fire on the pinned enemy, cover an escape or wait for another arrival without surrendering its freedom to act.",
      "Shipyards turn time into new hulls, but not into a private stockpile. Work already completed remains at the yard if control changes. When a hull is finished, the ship that assembled it must leave and the new ship stays behind. Production therefore creates a departure that an opponent can anticipate.",
      "Orders are chosen simultaneously. Ships, fuel, construction and weapons already in flight are public; the choice being made now is not. Strategy comes from creating several believable futures and committing before the opponent reveals which future was chosen.",
      "Victory follows the same logic as the fuel reserve. A side remains in the war while it still has a credible route back to tritium, whether through a working ship, a journey already under way, a contest it can afford or a hull close enough to completion to reopen the map. The war ends when every such route has closed, not when the last model disappears from the screen.",
      "DeltaV leaves out component damage, manual piloting and exact spacecraft flight plans. It keeps moving destinations, travel time, visible attacks and the competition between industrial work and military action because those elements affect fleet-level decisions."
    ]
  },
  {
    category: "DESIGN / HARD SCIENCE FICTION",
    slug: "plausibility-sells-the-fantasy",
    title: "Plausibility Sells the Fantasy",
    date: "2026-07-31",
    deck: "The military rules begin with a practical question: what can a crewed structure do once an enemy has measured its orbit?",
    body: [
      "The military and industrial rules became easier to define after separating what can be protected on a planetary surface from what remains exposed in orbit.",
      "A crewed station needs power and must release waste heat through radiators. If it cannot move far enough to spoil an attacker's prediction, armour only makes the eventual attack harder. A base beneath rock has a different advantage: it can be dispersed, buried and hidden beyond the local horizon until something has to launch.",
      "That distinction shaped the economy. Tritium plants and shipyards sit on or near planetary bodies, but they need a mobile ship in orbit to become useful. The facility does not defend itself across the map. Its military value comes from the ship that can reach it, remain there long enough to work and still afford the response when an enemy arrives.",
      "A conventional production queue created an awkward fiction: complete warships could apparently wait in perfect safety until deployment. Shipyards were therefore treated as protected stocks of hull sections, engines, radiators and other major assemblies. A working ship brings the crew, fuel and command presence needed to turn those parts into another active vessel.",
      "When construction finishes, the newly assembled ship remains at the yard and the ship that worked there must depart. Its next route has to be affordable before the final turn of construction. An opponent can see that moment coming and prepare for the forced movement.",
      "Construction also belongs to the place, not to the flag above it. If a yard changes hands halfway through a hull, the work does not evaporate. Capturing a nearly finished ship can be more valuable than taking an untouched facility, and industry becomes something to threaten without giving every building a health bar.",
      "The setting does not imply a perfect simulation. Sizes and distances are compressed so the Solar System can be read, and a missile encounter stands in for guidance, defenses and a final maneuver. The physical reasoning is used to keep those simplifications consistent with one another."
    ]
  },
  {
    category: "SENSORS / INFORMATION",
    slug: "there-is-no-stealth-in-space",
    title: "There Is No Stealth in Space",
    date: "2026-07-31",
    deck: "Ships, trajectories, fuel and construction are visible. The uncertainty lies in what an opponent will do next with that public information.",
    references: [
      {
        label: "Stealth in Space — Children of a Dead Earth",
        href: "https://childrenofadeadearth.wordpress.com/2016/07/12/stealth-in-space/"
      }
    ],
    body: [
      "DeltaV assumes that active spacecraft and their trajectories can be tracked reliably. A ship can leave, pass behind a body for a moment or choose not to light its engines, but it does not disappear because a detection roll failed.",
      "The Children of a Dead Earth article linked above follows the problem through engines, power plants and radiators. An active interplanetary ship has several signatures to suppress at once, and a path already measured remains informative even after the engine shuts down.",
      "DeltaV starts after the fleets and their industries are active. Ships are visible. Journeys and missiles show where they are going and when they will arrive. There is no separate search action and no memory game about which contact was seen by which unit.",
      "Even the shared fuel reserves are public. That is not presented as miraculous sensor data. Since spending is visible, a patient player could reconstruct the same total in a notebook. Showing it directly removes bookkeeping and keeps the uncertainty where it can produce a decision.",
      "Only the order being chosen now remains hidden. A visible ship may be able to reach several valuable places. A missile may be intended to force a dodge, interrupt a final construction turn, clear a route or punish a ship already pinned by another. The trajectory becomes public after launch, once all sides have revealed their plans together.",
      "Several credible uses for each visible ship leave room for deception without hidden contacts. The player reads fuel, timing and opportunity instead of maintaining a second map of uncertain detections."
    ]
  },
  {
    category: "AI / STRATEGY",
    slug: "how-the-ai-thinks-in-orbits",
    title: "How the Computer Opponent Chooses an Order",
    date: "2026-07-23",
    deck: "The opponent looks first at fuel, future arrivals and work that can be interrupted. It is allowed to make mistakes, but not to cheat.",
    body: [
      "The computer opponent was designed to use the same public information and the same fuel constraints available to the player.",
      "The opponent sees ships, fuel, journeys already under way, launched missiles and work completed at shipyards. It never sees the order currently being chosen. Every side plans from the same opening position, and only then are the orders brought together.",
      "It first estimates which tritium plants will still work after known arrivals and missile impacts. It then sets aside fuel for dodges, contested orbits and the forced departure that follows a completed hull.",
      "Possible plans include securing a second source of tritium, meeting an expansion, stealing work from a half-built yard or firing at a productive ship. Each plan needs an actual route, an arrival turn and enough fuel left for the rest of the fleet. Two attractive moves can be rejected together when their combined cost makes both reckless.",
      "The last working tritium ship receives special care. Sending it away or using it to fire also gives up the income it would have produced. The opponent usually moves that ship only after another fuel source is secure or when staying would close the final route to recovery.",
      "Missiles are judged by what they interrupt. Another shot is useful when it will consume the last point needed for a dodge, stop a decisive work turn or reach a ship that cannot evade because an enemy already shares its orbit. Firing at a comfortable target simply because the weapon is available is usually a bad trade.",
      "Near the end of a match, the opponent checks every visible route by which the enemy could return to tritium. A ship already travelling, a nearby support vessel or a nearly completed hull can keep the war open. The opponent is not allowed to call the position won just because the obvious route has failed.",
      "Its choices are repeatable. When the same bad move appears again, the reason can be followed back to a fuel estimate, a threat or an escape route it valued poorly, which makes that part of its strategy possible to revise."
    ]
  },
  {
    category: "TIME / SCALE",
    slug: "why-one-turn-is-three-days",
    title: "Why One Turn Is About Three Days",
    date: "2026-05-24",
    deck: "Three days gives ships time to move, missiles time to be answered and industry time to produce something worth interrupting.",
    body: [
      "One turn represents roughly three days. This interval keeps local movement, missile warning and industrial work visible as separate events.",
      "The scale began with a useful human reference: a journey between Earth and the Moon. It is not a claim that every route lasts an exact number of days. Destinations keep moving, and travel still depends on where they will be when a ship arrives.",
      "A short journey inside one planetary system can finish in one turn. A missile always needs at least two, guaranteeing a full turn of warning. Longer reinforcements cross several turns while the changing arrangement of the planets alters their cost and timing.",
      "Shorter turns made too many decisions feel like waiting for counters to fall. Longer turns swallowed local movement, missile warning and several stages of construction inside one click. Three days leaves room for all three to interfere with one another.",
      "Industry shares the same clock. A ship must spend the full turn at a tritium plant or shipyard to make progress. A ship that has just arrived waits until the next turn. Moving, firing or dodging consumes the same span of time and therefore replaces the work that could have happened.",
      "All sides prepare orders for that period and resolve them together. This carries some of the uncertainty of distant command without asking the player to schedule messages or calculate communication delay. The smooth movement between turns helps the eye follow the result and does not add moments in which orders can change."
    ]
  },
  {
    category: "WEAPONS",
    slug: "why-deltav-begins-with-missiles",
    title: "Why DeltaV Begins with Missiles",
    date: "2026-05-24",
    deck: "A missile takes time to arrive, which gives both sides a decision before impact. Guns and lasers need a different scale of combat to do the same.",
    references: [
      {
        label: "Space Guns — Children of a Dead Earth",
        href: "https://childrenofadeadearth.wordpress.com/2016/06/14/space-guns/"
      },
      {
        label: "The Photon Lance — Children of a Dead Earth",
        href: "https://childrenofadeadearth.wordpress.com/2016/07/02/the-photon-lance/"
      }
    ],
    body: [
      "Missiles were chosen first because their travel time creates a decision between launch and impact. A weapon that resolved immediately would need a different combat scale.",
      "The weapon travels toward one specific ship and remains visible while it closes. If the target leaves its orbit, the firing solution breaks. If it stays, the countdown continues and the defender must decide whether the work being done there is worth the coming dodge.",
      "A ship with fuel and room to maneuver survives automatically when the missile arrives. The dodge costs fuel and cancels that turn's production. A ship pinned beside an enemy cannot dodge; a fleet with an empty reserve cannot pay for survival. Guidance, defensive fire and final corrections are compressed into those outcomes because position and timing are the command decisions.",
      "Lasers would arrive too quickly for the same warning. Their useful limits would come from optics, wavelength, power, cooling, aim and the exposed face of the target. Without some of those constraints, a beam would only be a line with an arbitrary range.",
      "Guns ask for relative velocity, approach direction, spread, ammunition, heat and a much closer view of the encounter. DeltaV can say that two enemies in one orbit prevent safe work. It does not yet follow the seconds of a gun pass closely enough to make those details honest.",
      "Missiles also avoid a separate ammunition economy for now. The firing ship gives up its own work that turn. A launch from a tritium plant sacrifices fuel production; a launch from a yard delays the next hull. Even a clean miss has occupied time that could have been used elsewhere.",
      "Guns and lasers may be added only after their physical limits can support decisions that missiles do not already provide. Changing the graphic alone would leave the current combat rule unchanged."
    ]
  },
  {
    category: "SIMULATION / BALANCE",
    slug: "what-a-missile-is-for",
    title: "What Missiles Do to Production",
    date: "2026-07-23",
    deck: "Two hundred matched games showed that missiles win through chains of pressure: an impact matters, but so do every dodge, departure and lost turn of work before it.",
    body: [
      "The role of missiles was tested in two hundred matched games. Each opening was played twice, with the starting sides exchanged, and one opponent was forbidden to fire.",
      "The side allowed to use missiles won 69.1 percent of the games that reached a clear result. That advantage survived the exchange of starting positions, so it could not be dismissed as one fortunate side of the map.",
      "Impacts explained only part of the result. Targets also spent fuel to dodge, abandoned work to leave or arrived too late to restart production. The firing ship sacrificed its own work as well, so every launch exchanged useful time in the current turn for possible disruption later.",
      "The side with missiles often collected less tritium because its workers spent turns firing. It still tended to finish with more ships. The side without missiles could hold a larger fuel reserve and yet lose the routes and hulls needed to use it.",
      "The results also corrected an earlier assumption about missile pressure: no firing side won without at least one actual impact. Dodges and interrupted work increased the value of an attack but did not replace lethality. The strongest attacks used that pressure to create the position for a later hit.",
      "More missiles were not automatically better. The chance of a kill dropped sharply after the first shot. Very deep salvos almost never destroyed the target, although they frequently forced repeated dodges. Another launch was worthwhile only when it crossed a real threshold: the last point of fuel, the final construction turn or a target already unable to evade.",
      "Some matches lasted the full two hundred turns because firing kept the opponent poor without closing every route back to tritium. Those loops changed the opponent's priorities: it now values the end of a recovery path more than the continuation of pressure for its own sake.",
      "The resulting targeting rule checks what a missile will change on arrival. It values launches that interrupt a production or movement schedule the opponent cannot easily restore."
    ]
  },
  {
    category: "TACTICS",
    slug: "contested-orbits",
    title: "When Enemies Share an Orbit",
    date: "2026-05-25",
    deck: "Two enemies in the same useful orbit stop each other from working or dodging. Fuel, support and the timing of withdrawal decide which side can stay.",
    body: [
      "When opponents meet in the same useful orbit, DeltaV treats the position as an ongoing standoff rather than opening a separate combat screen.",
      "The game marks the orbit CONTESTED. Both ships remain, neither side can operate the local plant or yard, and neither ship can fire or dodge. Each fleet pays two points of delta-v per turn to keep its vessel in the standoff.",
      "The payment happens before the rest of the turn. If one side cannot afford it, that ship is lost, but the survivor still does not work immediately because the orbit was contested when the turn began. Production can resume on the following turn.",
      "Missiles make the lock dangerous. A ship that began the turn contested cannot dodge an impact, even if the enemy beside it is removed moments earlier. A friendly arrival during that turn is also too late to rewrite the opening condition. Support has to be established before the weapon reaches the orbit.",
      "Leaving is legal and often sensible. The departing ship gives up the facility and spends fuel on the journey, but missiles aimed at its old path lose their target. Withdrawal preserves a fleet at the price of admitting that this position is no longer worth its future cost.",
      "The second friendly ship usually belongs nearby rather than inside the lock. From outside it can fire at the pinned enemy, cover the most likely exit or wait for reinforcements. One ship denies the facility; the other decides whether the denial can be sustained.",
      "A tritium plant produces the same two fuel points that one contested ship spends each turn. Future income, missile timing, the cost of escape and nearby support determine whether maintaining that exchange is worthwhile for either side."
    ]
  },
  {
    category: "VICTORY / ECONOMY",
    slug: "war-ends-before-last-ship-dies",
    title: "Why Access to Fuel Decides Victory",
    date: "2026-05-25",
    deck: "A side remains in the war while one credible route to tritium is still open. Extra ships cannot postpone defeat once every route has closed.",
    body: [
      "The victory condition is based on future access to fuel rather than the number of ships that remain on the map.",
      "A fleet can be intact but unable to pay for another useful movement. It can occupy several planets and moons that will not produce the fuel needed to leave them. Counting ships or territory would reward positions that are already dead.",
      "DeltaV instead asks whether each side can return to tritium. A ship may already be working at a plant, travelling toward one or close enough to reach one with the remaining reserve. Arrival alone does not count: it must survive until the following turn and actually begin production.",
      "The check applies known costs before adding expected income. Contested ships must be maintained, visible missiles must be escaped or dodged and a ship finishing a hull may be forced to leave its yard. Tritium that will be interrupted by one of those events is not counted.",
      "Every route is checked separately. One may end in an unaffordable standoff, another under a missile, and a third may remain viable because a support ship can arrive first. The match stays open as long as one of those futures can still be reached honestly.",
      "A nearly completed shipyard can also preserve a side's chances. The new hull may reach fuel when every existing ship is stranded, provided construction can finish and the current worker can make its required departure.",
      "Defeat is declared only after those possibilities are gone. Ships elsewhere may still exist, but they cannot change the position. This ends the match before several turns of unavoidable decline without cutting off a recovery that remains possible."
    ]
  },
  {
    category: "PLANETARIUM",
    slug: "map-of-future-positions",
    title: "Designing the Planetarium Around Future Position",
    date: "2026-07-26",
    deck: "The planetarium bends size and distance for readability, but every order still points to where its destination will be when the journey ends.",
    body: [
      "The planetarium uses different visual scales for bodies, moon systems and interplanetary distance so that all three remain readable in the same view.",
      "At a literal scale, a planet would disappear before its moons and a destination across the Solar System could share the same view. DeltaV compresses the gaps between planetary systems, compresses local moon systems differently and enlarges bodies that would otherwise be pixels.",
      "The strategic position is not flattened with them. Every planet and moon advances along its orbit. When a ship is ordered to move, the destination is placed where it will be on arrival, not where it is now. The preview shows that future position, which is why a correct journey may appear to aim into empty space.",
      "The bright route is a diagram rather than a claim about an exact spacecraft path. It rises away from the orbital plane so it can be followed through a crowded view. Cost and arrival are settled first; the curve is then allowed to choose clarity.",
      "That freedom has limits. One early route drew a graceful loop around both ends and looked completely wrong even though its numbers were right. The saved match and camera view made the mismatch obvious: a readable calculation still needs a drawing that suggests the same maneuver.",
      "Shadows, enlarged planets, orbit rings and the Sun's glow follow the same separation. They affect how the player reads the scene but do not change what a ship can afford or where it arrives."
    ]
  },
  {
    category: "PLAYTEST / INTERFACE",
    slug: "playing-past-the-tutorial",
    title: "What a Full Tutorial Playthrough Found",
    date: "2026-07-30",
    deck: "A full playthrough found several moments where the match resolved correctly but the interface taught a rule that did not exist.",
    body: [
      "A complete playthrough of the public build found several turns where the rules resolved correctly but the interface described a different event.",
      "The public build was played beyond its guided sequence into ordinary matches. Whenever a result felt suspicious, the turn, the visible history and the camera position were kept together. Continuing the match mattered because several problems appeared only after earlier journeys, missiles and unfinished construction had accumulated.",
      "In one turn, a target left before a missile arrived. The ship survived and the weapon disappeared correctly, but the history announced that the crew had died. In another, an enemy captured a half-built yard and then worked there. Both moments were labelled WORK, making one ship appear to build twice in a single turn.",
      "A quieter error gave the computer opponent extra fuel during the tutorial. The journey cost was correct, but it was paid from a reserve that had silently been refilled. Nothing on the map or in the history could explain the increase.",
      "The final fixes were mostly changes in meaning, not spectacle. A broken missile solution now says that the target escaped. Capturing a yard and adding another turn of work are distinct events. Existing fuel is no longer replaced. The menu pauses the clock even when a new turn begins behind it.",
      "The replay itself exposed another edge. Clicking a highlighted word could open its explanation while preventing the same row from rewinding to the moment it described. Treating the whole row as one event made the interaction agree with the history it was supposed to clarify.",
      "Every visible cost, capture, escape or death now comes from the event that changed the match. This matters because a correct number beside the wrong explanation can teach the player an incorrect rule."
    ]
  },
  {
    category: "STRUCTURE",
    slug: "simulation-that-can-disagree",
    title: "Keeping the Rules Separate from the Screen",
    date: "2026-07-23",
    deck: "The match result is resolved before the planetarium draws it, so changing an animation or route curve does not alter fuel, timing or survival.",
    body: [
      "DeltaV resolves what happened in a turn before the planetarium decides how that result should be shown.",
      "The rules decide whether an order is legal, how much fuel it costs, when a ship or missile arrives, whether a facility works and when a side has lost its last path to tritium. Only after that result exists does the planetarium animate it.",
      "A destroyed ship may remain visible for a final moment. A journey line may bend away from a crowded orbit. Planets may be enlarged until they can be read. None of those choices can refund fuel, delay an arrival or save the ship underneath the animation.",
      "The simpler two-dimensional view reads the same match. If the views disagree about where a ship is, the recorded turn settles the question. If both pictures agree but the history describes a death that never occurred, the explanation is wrong rather than the result.",
      "This structure also allows entire matches to be played without graphics. Unfair openings and repetitive opponents can be found in large groups, then the interesting position can be opened in the planetarium and examined as a player would see it.",
      "This structure cannot show whether a rule is enjoyable. It can separately show whether the rule worked, whether the opponent handled it and whether the screen explained the result accurately."
    ]
  },
  {
    category: "MAP GENERATION / BALANCE",
    slug: "auditing-procedural-maps-before-turn-one",
    title: "How Generated Maps Are Checked",
    date: "2026-07-23",
    deck: "A new map is discarded before turn one if fuel access, opening pressure or escape routes leave one side without a reasonable response.",
    body: [
      "Generated maps are checked before play because a different arrangement can still produce an unfair or uninteresting opening.",
      "The planets are not dragged into invented positions. The generator works with the Solar System as it stands, choosing roles and starting forces among eligible planets and moons while keeping Earth and the Moon outside the war economy.",
      "Every proposed opening is judged by real journeys. Can each side reach fuel? Is a second source available after the obvious one is contested? Can one player attack a shipyard before the defender has a meaningful choice? Does a three-sided start leave one fleet exposed to both opponents with no useful exit?",
      "Hundreds of layouts may be considered for a single opening. Many fail, and some random starts produce no acceptable result at all. In that case the game prefers a fixed map that has already passed the checks over a novel position known to be broken.",
      "That safety net once made different random starts produce the same map often enough to look like a failed generator. The starts were different; they had simply all been rejected before falling back to the same approved layout.",
      "The game now tries fresh starts before giving up and keeps the reason each map failed. In a sample of one hundred requests, ninety-nine distinct playable layouts appeared and only two needed the fixed fallback. Those duplicate fallbacks remain visible in the results.",
      "These checks cover the opening. Complete matches are still needed to find maps where both sides can survive indefinitely, one rich system dominates every route or an escape is technically possible but never strategically useful."
    ]
  },
  {
    category: "DEVELOPMENT",
    slug: "what-the-machine-was-good-for",
    title: "What the Machine Was Good For",
    date: "2026-08-01",
    deck: "DeltaV is openly vibe-coded. Fast generation made broad experimentation possible; canon, replays and taste were needed to decide which results deserved to stay.",
    body: [
      "DeltaV is openly vibe-coded. Generative tools have produced much of the software, while the direction of the game has been judged through playable results rather than assumed from the generated work.",
      "Generative tools were useful for making a question playable quickly. The archive moves through a real-time lander, predicted orbits, gun duels, the Orbital Maneuver AI prototype and finally fleet command. Each version could be tried before the previous direction required a larger commitment.",
      "That speed also produced confident nonsense. A new resource appeared without a reason. Physical orbits were described as abstract territories. A journey line looped beautifully around both ends while implying the wrong maneuver. A lighting change was declared successful when the comparison image barely changed.",
      "The useful response was not to pretend every line of the project was understood in traditional engineering detail. It was to make the game leave evidence that could be judged: one current set of rules, exact replays, visible before-and-after images and many matches that could expose a bad idea repeatedly.",
      "The machine was especially good at breadth. It could generate many openings, play hundreds of matches, preserve strange failures and offer several ways to express the same rule. Direction still came from deciding which outcome felt like DeltaV and refusing the ones that merely looked finished.",
      "That distinction matters for the computer opponent too. The opponent inside the game is not a generative model improvising during play. It follows fixed priorities, sees only public information and can repeat its mistakes. The tool helping to build the game and the adversary playing it are deliberately different things.",
      "The current rule documents and replay process are used to compare generated changes with the game that is already playable, especially when a change affects several parts of a match at once."
    ]
  },
  {
    category: "PROJECT STRUCTURE",
    slug: "schema-first-content-and-vanilla-pack",
    title: "What Can Change Without Changing a Match",
    date: "2026-08-02",
    deck: "The planetarium, menus and map content can be replaced without also changing how fuel, movement, missiles and production resolve.",
    body: [
      "DeltaV has already replaced large parts of its appearance and interface. The early two-dimensional prototypes, the current three-dimensional planetarium and the simpler tactical view can all present the same kinds of movement and combat without owning their rules.",
      "The match rules live in a part of the game that can run without drawing a screen. This is what headless means here. It decides whether an order is legal, how much fuel it costs, when ships and missiles arrive, whether a ship can work and when a side has lost access to tritium.",
      "Other parts have narrower jobs. The renderer draws the three-dimensional Solar System and its animations. The interface handles clicks, menus, previews and the written history. The content describes which planets and moons are active, where facilities exist and which values a scenario uses. Any of these can be rewritten or replaced while the match rules continue to receive the same kind of information.",
      "A BURN from the Moon to Venus shows the full path. The player's click first becomes a command naming the ship and destination. The simulation checks that command against the current fuel and rules, resolves the turn and produces a snapshot, meaning a complete record of the match at that moment. The renderer reads the snapshot and draws the ship in transit. The simpler two-dimensional view can read the same snapshot and show the same journey differently.",
      "This separation has prevented visual changes from altering results. A journey curve once looped around both ends and suggested the wrong maneuver, but the ship still paid the correct cost and reached the correct place because the drawing did not decide either value. The curve could be replaced without rewriting movement.",
      "It also makes disagreements easier to locate. During a playtest, a target escaped before a missile arrived but the history reported that its crew had died. The simulation snapshot contained the surviving ship, so the error belonged to the interface text rather than the missile rule. In another turn, the interface described a shipyard capture as a second turn of work even though the stored construction had changed hands correctly.",
      "Maps and scenarios use the same arrangement. Changing which moon contains a shipyard changes the input to the match, not the meaning of construction. If the construction rule itself changes, the headless simulation and its saved replays must change deliberately; a new planet model or menu layout does not require that rule to be touched."
    ]
  },
  {
    category: "PLAYTEST / DEVELOPMENT",
    slug: "replay-led-debugging-became-the-workflow",
    title: "Using Replays to Investigate Strange Turns",
    date: "2026-08-02",
    deck: "A suspicious turn is preserved and replayed instead of being argued from memory. The result, the explanation and the image can then be compared at the same moment.",
    body: [
      "Unusual turns are saved because memory alone is rarely precise enough to identify which part of a match looked wrong.",
      "DeltaV keeps the complete position around unusual moments. The same turn can be reopened with the same ships, fuel, journeys and missiles, then viewed from the planetarium or the simpler tactical map.",
      "This proved useful whenever different parts of the game told different stories. A ship could survive correctly while the history mourned its crew. A capture and a turn of construction could look like two turns of work. A route could have the right cost and still be drawn like a knot.",
      "Replaying the exact moment removes the temptation to fix whichever part is easiest. First the result is compared with the current rule. Then the opponent's decision, the written explanation and the picture are checked against that same result.",
      "Some faults only exist across time. A menu can pause the current clock but fail to pause the next one. A live view can be correct while rewinding restores an older, misleading sentence. Preserving the sequence catches those failures better than a single image.",
      "Even when the rule is working, replaying the saved turn can show that the interface gave the player an inaccurate explanation of the result."
    ]
  },
  {
    category: "GAME DESIGN",
    slug: "delta-v-secrecy-is-timing-not-stealth",
    title: "Secrecy in DeltaV Is About Timing",
    date: "2026-08-01",
    deck: "Everyone sees the same ships, trajectories and resources. What remains secret is the next commitment, revealed only after all sides have chosen.",
    body: [
      "DeltaV keeps ships and existing trajectories visible while hiding the orders currently being chosen.",
      "The map reveals current fuel, visible journeys, missiles in flight and work completed at shipyards. What it withholds is the order being chosen during the present turn.",
      "That single unknown is enough because one ship may have several affordable futures. It can protect production, leave before a missile arrives, contest a yard or fire and sacrifice its own work. The opponent has to prepare for intentions without inventing unseen units.",
      "Simultaneous planning turns information into timing. A move that would be safe after seeing the enemy order may be reckless when both choices must be locked first. Surprise comes from commitment, not from a random failure to detect an object that was already active in space.",
      "This limited information gap keeps larger positions readable. Players study the same public facts and can still reach different conclusions about the opponent's next commitment."
    ]
  },
  {
    category: "DESIGN / STRATEGY",
    slug: "shipyard-completion-is-a-commitment",
    title: "Why Completing a Hull Forces a Departure",
    date: "2026-08-02",
    deck: "Finishing a ship forces the current worker to leave the yard, turning production into a visible movement problem rather than a passive reward.",
    body: [
      "Completing a hull also forces the ship currently working at the yard to leave.",
      "When construction finishes, the new vessel remains at the yard and the ship that did the work must leave. The departure needs a legal destination and enough fuel, so the final construction turn cannot be separated from the map around it.",
      "The rule prevents yards from becoming safe warehouses. A nearly completed hull announces a coming movement. The producing side may delay the last turn because every exit is dangerous; the opponent may time a missile, an arrival or a nearby support ship around that hesitation.",
      "The new ship is therefore not simply more material. It changes which vessel holds the yard, exposes the old worker to a route and can consume fuel at the exact moment the fleet hoped to become stronger.",
      "Both sides can see the approach of this production deadline. The producing fleet must therefore consider whether it can afford the movement and change of positions that completion requires."
    ]
  },
  {
    category: "AI / STRATEGY",
    slug: "deterministic-opponent-for-better-mistakes",
    title: "Why the Opponent Does Not Learn Mid-Match",
    date: "2026-08-02",
    deck: "The computer opponent uses fixed priorities and makes the same decision from the same position, so repeated mistakes can be investigated directly.",
    body: [
      "The computer opponent follows fixed priorities and produces the same decision when it receives the same position.",
      "DeltaV's opponent follows fixed priorities and chooses the same order from the same position. It does not learn the player's habits during a match and does not receive a private difficulty bonus.",
      "That consistency suits a strategy game built around public information. Players learn how fuel, timing and contested positions shape behavior instead of trying to guess an unseen mood. The opponent can still surprise them because simultaneous orders hide its immediate intention.",
      "Repeatability is just as valuable when the opponent is wrong. A wasteful missile, a premature retreat or a missed recovery route can be reopened exactly. The cause remains there long enough to be understood.",
      "Repeatable mistakes can be linked to the opponent's reading of fuel, threats or recovery routes and revised without adding hidden information or bonuses."
    ]
  },
  {
    category: "COMBAT / DESIGN",
    slug: "the-long-argument-over-one-dodge",
    title: "Why Evasion Became Automatic",
    date: "2026-08-02",
    deck: "Evasion changed repeatedly before becoming an automatic fuel cost paid on impact, without requiring a separate defensive order from the player.",
    body: [
      "The evasion rule changed several times because it had to account for fuel, multiple incoming missiles, lost production and the amount of defensive input expected from the player.",
      "Early versions treated a dodge as a large emergency burn that cleared every missile aimed at the ship. Later versions made the price rise with the number of incoming weapons. Both made sense on paper, but they encouraged the player to manage a separate defensive action instead of thinking about production and position.",
      "Under the current rule, an unpinned ship automatically spends one point of delta-v when a missile arrives. Several missiles arriving together demand one point each, and the ship loses its turn of work.",
      "The attacker can see whether the defending fleet has enough fuel, can stack arrivals to exceed the available reserve or can first contest the orbit and remove the target's room to evade. The defender plans around the threat without confirming the same survival choice after every impact.",
      "A ship that leaves before impact breaks the firing solution entirely. A ship that remains beside an enemy cannot dodge at all. Those positional answers are more interesting than opening a defensive menu after the important decisions have already been made.",
      "The one-point cost is simpler than the earlier versions, while the relevant choices remain in the timing of launches, the available fuel and the target's position when the missile arrives."
    ]
  },
  {
    category: "TIMING / TACTICS",
    slug: "a-missile-arrives-before-reinforcement",
    title: "A Missile Arrives Before the Reinforcement",
    date: "2026-08-02",
    deck: "Several days went into deciding how a forced shipyard departure, a missile impact and a reinforcement arrival resolve when they share one turn.",
    body: [
      "Several days were spent deciding the order of three events that can affect the same orbit in one turn: a forced shipyard departure, a missile impact and a reinforcement arrival.",
      "DeltaV resolves the forced departure first, then the missile, then the incoming ship. The new hull left at the yard can still dodge if the orbit was not already contested when the turn began. Only after the weapon has been answered does the reinforcement arrive and change control of the position.",
      "Putting the reinforcement first would let a ship launched days earlier erase the defender's ability to dodge at the final instant. Putting the missile before the forced departure would punish a ship that had already committed to leaving. Both answers created tactics that felt detached from the orders players had actually made.",
      "To pin a target for an incoming missile, the attacking ship must already share its orbit before that turn begins. Arriving during the same turn is too late to affect that impact.",
      "This order also keeps construction consistent. The worker leaves because the new hull exists, the hull answers any threat already due, and only then does the arriving ship contest the yard."
    ]
  },
  {
    category: "ECONOMY / STRATEGY",
    slug: "the-most-valuable-yard-is-half-built",
    title: "Why Shipyard Progress Can Be Captured",
    date: "2026-08-02",
    deck: "Construction stays at the yard when control changes. Taking an enemy's unfinished hull can be more valuable than owning an idle shipyard from the start.",
    body: [
      "Construction progress remains at a shipyard when control changes, so a partly completed enemy hull can affect the value of an attack.",
      "Construction progress belongs to the yard, not to the side that began it. If one fleet completes two turns of work at Mars and is driven away, another fleet can capture Mars and continue from there.",
      "Resetting the counter on capture was the obvious clean rule, but it made unfinished work strategically weightless. The defender lost only future access, while the attacker gained the same empty facility it could have taken at any other moment.",
      "Persistent progress increases the value of a yard as completion approaches. Its owner may stay longer to protect the investment, while an attacker may spend more fuel than the location is normally worth because part of the next hull is already complete.",
      "The rule also gives meaning to interruption. Firing from the yard delays construction. A missile that forces a dodge delays it again. A contest freezes the work without erasing it, so both sides can wait beside a valuable unfinished hull neither is currently able to complete.",
      "When the yard changes hands, the history now says CAPTURE before it says WORK. This wording was corrected during playtesting because calling both events work concealed the transfer of stored construction."
    ]
  },
  {
    category: "MAP / STRATEGY",
    slug: "why-the-solar-system-got-smaller",
    title: "Why DeltaV Uses Twenty-Two Playable Places",
    date: "2026-08-02",
    deck: "The current map uses 22 planets and moons. It includes enough local positions for support and route control without asking the player to manage every real moon in the Solar System.",
    body: [
      "The current runtime map contains 22 playable places. They are Mercury, Venus, Earth, the Moon, Mars, Phobos, Deimos, Jupiter, Io, Europa, Ganymede, Callisto, Saturn, Titan, Iapetus, Uranus, Oberon, Titania, Neptune, Triton, Pluto and Charon.",
      "Earlier map studies also considered asteroids, Trojan groups, more distant objects and different selections of moons. Adding real names was easy, but many of those locations repeated a decision that already existed nearby or added another place to wait without changing the surrounding routes.",
      "The current set keeps the major planets as the large-scale structure and gives the most important outer systems several local positions. Mars has Phobos and Deimos; Jupiter has Io, Europa, Ganymede and Callisto; Saturn has Titan and Iapetus; Uranus has Oberon and Titania. These moons allow a fleet to support a nearby contest, approach from another orbit or remain outside a full position without creating a new class of unit.",
      "Earth and the Moon are included because they orient the whole map and form the protected corridor, not because they provide another battlefield. Pluto and Charon are separate playable places in the current runtime, which gives the outer edge a local relationship instead of treating the pair as one combined destination.",
      "Not every real moon becomes playable. A moon is included when its position can change access to fuel, construction, support or movement between systems. Smaller satellites can remain visible as part of the Solar System without adding another location the player must inspect every turn.",
      "Twenty-two places leave room for local tactics without losing the larger geography. The player can read Mars, Jupiter, Saturn, Uranus and the outer edge as different groups while the changing alignment between those groups continues to alter long journeys."
    ]
  },
  {
    category: "TACTICS",
    slug: "the-third-ship-stays-outside",
    title: "Why the Third Ship Stays Outside",
    date: "2026-08-02",
    deck: "A contested orbit holds one ship from each side. Additional ships remain outside, where support becomes a separate tactical role instead of a larger stack.",
    body: [
      "A contested orbit accepts one ship from each side. A third ship remains outside and supports the contest from a separate position.",
      "A normal orbit holds one ship. A contested orbit holds two opponents. Another arrival waits outside rather than turning the location into a stack of units whose individual roles are difficult to read.",
      "From that outer position, support remains active. It can fire on the enemy pinned inside, threaten the route of withdrawal or wait to occupy the facility after the contest ends.",
      "The limit also keeps numerical superiority from resolving itself automatically. Three ships do not become a larger damage total applied to one defender. They must arrive in the right order, preserve fuel and use time to convert their extra freedom into an actual advantage.",
      "If an orbit is already full when another ship arrives, the waiting ship remains exposed and may still receive orders, but it has not joined the contest. The time needed to enter after a place becomes available must be included in the plan.",
      "The capacity limit allows support, blockade and relief to remain distinct uses for the same kind of ship instead of combining every nearby vessel into one stack."
    ]
  },
  {
    category: "MAP / INFORMATION",
    slug: "a-moving-map-without-a-time-machine",
    title: "Why DeltaV Does Not Show Every Future Route",
    date: "2026-08-02",
    deck: "The planetarium shows the journey that can be ordered now, not an unlimited forecast. Moving geography remains a source of timing without becoming a planning spreadsheet.",
    body: [
      "An early planning version allowed the player to move the map forward and inspect routes that would become available on later turns.",
      "DeltaV tried that idea and removed it. A full future scrubber turned the map into a timetable that had to be searched before every order. The orbit stopped feeling like a changing opportunity and became another layer of calculation performed outside the turn.",
      "The current preview answers the immediate question. If a ship leaves now, it shows the cost, travel time, route and position of the destination on arrival. That is enough to compare the commitments actually available this turn.",
      "Future windows still exist because the bodies keep moving. Waiting can improve one route and worsen another, but the player reads that possibility from the shape and rhythm of the map rather than consulting a perfect catalogue of later prices.",
      "The current information horizon is intended to explain the consequence of an available order without requiring the player to search every future turn for the lowest possible route cost."
    ]
  },
  {
    category: "LORE / DESIGN",
    slug: "how-the-lore-became-part-of-the-rules",
    title: "How the Lore Became Part of the Rules",
    date: "2026-08-02",
    deck: "The setting developed to explain the limits already present in play: one vital fuel, corporate fleets, protected space around Earth and a war with no fixed campaign length.",
    body: [
      "The lore developed alongside the rules and was revised whenever the setting implied a kind of game that DeltaV was not trying to become.",
      "Tritium first needed to explain why one compact resource could support movement, industry and political power without adding cargo routes and several separate economies. Making it important to fusion travel and to the AI-heavy economy on Earth gave the fleet's delta-v reserve a wider context while leaving the player with one resource to manage.",
      "Corporate fleets provided a reason for several comparable factions to fight without turning the match into a conventional war between states. They can operate through private security, contractors and deniable actions, which suits limited forces and shared ship capabilities better than national navies fighting an unrestricted total war.",
      "That premise created another problem around Earth and the Moon. These are the most familiar places on the map, but allowing them to be conquered, mined and attacked made every match gravitate toward Earth. The setting now gives terrestrial states a continuing monopoly of force in that corridor, where debris, nuclear weapons and damage to civilian infrastructure would trigger intervention. The two bodies remain useful for orientation and transit but are outside the corporate war.",
      "Beyond the Moon, enforcement becomes less credible as distance and cost increase. This explains why the conflict can continue around Jupiter, Saturn and the outer planets without implying that governments have disappeared. It also supports the restrained language of the command log: the war is observable from Earth, but its operational details arrive through corporate reports rather than a complete public account.",
      "The 2079 Saturn incident was added later as the first confirmed use of a registered ship weapon against another registered vessel. It gives the log a specific historical point without defining a complete chronology for the campaign that follows.",
      "No fixed duration is assigned to that conflict. One turn is useful to think of as roughly three days for movement and warning, but a thirty-turn match is not automatically a ninety-day historical war. Keeping those scales separate avoids forcing balance changes or unusually long matches to rewrite the setting.",
      "The current lore is kept when it explains a rule, a boundary or the tone of the information shown to the player. Named heroes, mechanical faction advantages and additional political detail remain outside the baseline because they do not yet solve a problem that appears in play."
    ]
  },
  {
    category: "VISUAL DEVELOPMENT",
    slug: "from-hard-scifi-to-cartoon-space-and-back",
    title: "From Hard Sci-Fi to Cartoon Space and Back",
    date: "2026-08-02",
    deck: "The visual direction moved from a dark lander prototype through brighter ships and softer space imagery before returning to a restrained strategic planetarium.",
    body: [
      "The first preserved build, DeltaV Arcade v4, already used a dark field, a sparse interface and a very small spacecraft against a large planet. Its presentation was simple, but the scale made the vehicle look vulnerable and kept the surrounding space dominant.",
      "The Orbital Maneuver AI prototype moved in a more cartoonish direction. It used colorful clouds, a dense starfield, soft rounded panels and a bright white ship that could be read immediately while it turned and fired. Those choices helped a real-time action prototype, where the player needed to find the vehicle quickly, but they made space feel warmer and less severe than the later strategy game required.",
      "A later ship reference explored a large illuminated ring, a central crewed body and clearly separated solar structures. It had a memorable silhouette and communicated function better than a generic spacecraft shape. At the normal strategic scale, however, the ring asked to be viewed as a hero object and made the ship appear much larger than its role on the map.",
      "The current direction returned to hard sci-fi without pursuing photorealism. Ships are small systems of engine light, secondary lights and brief correction burns. Planets remain clean and somewhat stylized, but hard lighting, sparse stars, thin orbit lines and restrained color restore distance and physical exposure to the scene.",
      "Some features from the brighter phase remained because they improved recognition. Faction color stays on operational lights and orbit lines, ships still have small attitude changes, and planets are enlarged enough to remain identifiable. Color now describes ownership, movement or danger instead of decorating the whole background.",
      "The opening view places the major planets close to a common line through the Sun, with some in conjunction and others in opposition. The first reason is simply that it looks good. The alignment gives the wide image a clear structure, creates large areas of empty space for the interface and makes the different planetary scales easier to compare. A random spread was more astronomically ordinary but looked like unrelated points rather than one Solar System.",
      "The alignment is an opening composition, not a bonus hidden in the rules or a claim about one exact historical date. Once the match advances, the planets continue along their accelerated orbits and the arrangement breaks apart into the changing route geometry used by play."
    ],
    figures: [
      {
        afterParagraph: 0,
        src: new URL("./assets/devlog/visual-history-arcade-v4.png", import.meta.url).href,
        alt: "DeltaV Arcade v4 with a small white lander resting against a large blue planet",
        caption:
          "DeltaV Arcade v4: the earliest preserved build already gave most of the frame to the planet and the surrounding darkness."
      },
      {
        afterParagraph: 1,
        src: new URL("./assets/devlog/visual-history-orbital-maneuver-ai.png", import.meta.url)
          .href,
        alt: "Orbital Maneuver AI with a bright white ship, colorful space clouds and rounded controls",
        caption:
          "Orbital Maneuver AI: stronger color and a more immediately readable vehicle suited the real-time prototype, but shifted the overall tone."
      },
      {
        afterParagraph: 2,
        src: new URL("../../resources/DeltaV-ship-user-angle-v2.png", import.meta.url).href,
        alt: "Intermediate DeltaV ship reference built around a large illuminated structural ring",
        caption:
          "The ring-ship reference gave the vehicle a distinctive functional silhouette while making it visually dominant at close range."
      },
      {
        afterParagraph: 5,
        src: new URL("./assets/devlog/machine-development.png", import.meta.url).href,
        alt: "Current DeltaV planetarium with sparse orbit lines, small ships and planets arranged across the Sun",
        caption:
          "The current planetarium uses the opening alignment as a composition, then allows the bodies to move apart during play."
      }
    ]
  }
] as const satisfies readonly DevlogEntry[];

export const devlogEntries: readonly DevlogEntry[] = [...devlogArchive].sort((left, right) =>
  right.date.localeCompare(left.date)
);
