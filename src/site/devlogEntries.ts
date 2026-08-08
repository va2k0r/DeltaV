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
  deck: string;
  body: readonly string[];
  playToWin: string;
  references?: readonly DevlogReference[];
  figures: readonly DevlogFigure[];
}>;

/**
 * DeltaV's public field manual. Each article explains one rule in plain English, shows it in the
 * game, and ends with a practical way to use it. Inline links use the restricted [label](#slug)
 * syntax rendered by the site; article copy cannot inject arbitrary HTML.
 */
export const devlogEntries = [
  {
    category: "START HERE",
    slug: "how-to-wage-war-in-space",
    title: "How You Win a War in DeltaV",
    deck: "You do not need to destroy every enemy ship. You need to cut the enemy off from tritium.",
    body: [
      "DeltaV has four basic orders. WORK makes fuel or builds a ship. BURN moves a ship. FIRE launches a missile. EVADE happens automatically when a missile hits. If two enemies share an orbit, that orbit becomes CONTESTED.",
      "Most of these rules use the same shared supply of ΔV. A ship that [WORKS](#why-productive-ships-often-receive-no-order) at tritium adds 2 ΔV. A BURN spends ΔV. Each missile you evade spends 1 ΔV. Each CONTESTED ship spends 2 ΔV per turn.",
      "This is why the game stays interesting even though the rules are small. Spending fuel to win one orbit may leave you unable to defend the next one. Leaving a ship in place may be stronger than moving it.",
      "The match ends when only one faction still has a workable route to [tritium](#fuel-access-decides-the-war). The long game is simply this: make sure you can earn fuel again after the next few orders resolve, and make sure your opponent cannot."
    ],
    playToWin:
      "Keep two different ways to reach tritium and try to leave the enemy with one. A plan that saves a ship but closes your last route to fuel is a losing plan.",
    figures: [
      {
        afterParagraph: 1,
        src: new URL("./assets/devlog/devlog-how-to-wage-war-in-space.gif", import.meta.url).href,
        alt: "A DeltaV match with ship routes, missile routes, arrival times and productive orbits visible",
        caption:
          "Watch the clocks on the map. Movement, missiles and production can all become due on different turns."
      }
    ]
  },
  {
    category: "ECONOMY",
    slug: "why-productive-ships-often-receive-no-order",
    title: "When Doing Nothing Produces Fuel or a Ship",
    deck: "A ship works automatically when you leave it alone on a tritium orbit or shipyard.",
    body: [
      "There is no WORK button. A ship works when it starts the turn at a useful orbit and does not BURN, FIRE or EVADE. The orbit must also be free of enemy ships.",
      "One turn of WORK at tritium gives your faction 2 ΔV. One turn of WORK at a shipyard adds 1/5 to the new ship. A ship that arrives this turn cannot work until the next turn.",
      "Every order therefore has a simple hidden price. [FIRE](#why-firing-a-missile-costs-no-fuel) from a tritium orbit costs no fuel, but you miss the 2 ΔV that the ship would have produced. FIRE from a shipyard delays the new ship by one turn.",
      "If a ship is already earning something useful, moving it should solve a bigger problem than the income you give up."
    ],
    playToWin:
      "Before ordering a productive ship, count what it would make by staying. Leave it alone unless the order is worth more than 2 ΔV at tritium or one turn of construction at a shipyard.",
    figures: [
      {
        afterParagraph: 1,
        src: new URL(
          "./assets/devlog/devlog-why-productive-ships-often-receive-no-order.gif",
          import.meta.url
        ).href,
        alt: "The DeltaV turn history showing automatic WORK at tritium orbits and shipyards",
        caption:
          "No production order is needed. The history records WORK when an eligible ship stays in place."
      }
    ]
  },
  {
    category: "MOVEMENT",
    slug: "a-burn-is-a-budget-not-a-destination",
    title: "Before You BURN, Count What Happens Next",
    deck: "A route can be legal and still leave you without enough ΔV to survive the next turn.",
    body: [
      "Select a ship and a destination to preview a BURN. The game shows the ΔV cost and the arrival turn. You pay that cost from the faction's shared ΔV, not from fuel stored on that ship.",
      "A label such as T+3 means the ship arrives in three turns. If the destination produces tritium or ships, the newcomer must wait one more turn before it can WORK.",
      "Now count the costs that will happen before that first WORK. An incoming missile costs 1 ΔV to evade. A [CONTESTED ship](#when-enemies-share-an-orbit) costs 2 ΔV at the start of each turn. A shipyard may also force another BURN when it finishes a ship.",
      "Example: with 6 ΔV, a 3 ΔV BURN leaves 3. If two missiles will hit before your next income, only 1 ΔV remains for every other ship and route."
    ],
    playToWin:
      "After previewing a BURN, subtract 1 ΔV for every known missile impact and 2 ΔV for every CONTESTED turn due before your next income. Do not move if the remainder cannot pay for the next move you must make.",
    figures: [
      {
        afterParagraph: 1,
        src: new URL("./assets/devlog/orbital-burn.gif", import.meta.url).href,
        alt: "A BURN preview from Venus to Mars showing an arrival at T plus 3 and a cost of 3 delta-v",
        caption:
          "The preview says Venus to Mars, T+3, for 3 ΔV. The ship can first WORK there on the following turn."
      }
    ]
  },
  {
    category: "MISSILES",
    slug: "why-firing-a-missile-costs-no-fuel",
    title: "Why Firing a Missile Costs No Fuel",
    deck: "FIRE costs 0 ΔV. The ship that fires cannot WORK in the same turn.",
    body: [
      "DeltaV does not ask you to buy or count missiles. FIRE removes no ΔV. A ship that fires cannot WORK in the same turn. It produces no fuel and adds nothing to a shipyard.",
      "The missile reaches its target on the shown turn. If the target is not CONTESTED and its faction can pay 1 ΔV, it [evades](#evasion-became-automatic) automatically and survives. If it cannot pay, the ship is destroyed. The target can also BURN away before impact; this cancels every missile aimed at that ship.",
      "Where you fire from changes the real price. FIRE from tritium gives up 2 ΔV of income. FIRE from a shipyard gives up 1/5 of a ship. FIRE from a barren orbit gives up no production at all.",
      "A missile is useful even when it does not destroy a ship. It can make the enemy spend fuel, miss a turn of WORK or leave an important orbit."
    ],
    playToWin:
      "Fire from barren orbits whenever possible. Before firing from tritium, ask whether the shot will cost the enemy more than the 2 ΔV you are giving up. If not, keep working.",
    figures: [
      {
        afterParagraph: 1,
        src: new URL("./assets/devlog/fire-resolution.gif", import.meta.url).href,
        alt: "A FIRE preview aimed at a ship with a visible missile arrival time in the DeltaV interface",
        caption:
          "Watch the target and the T-minus label. FIRE costs no ΔV now, but the firing ship gives up this turn's WORK."
      }
    ]
  },
  {
    category: "MISSILES / ADVANCED",
    slug: "when-another-missile-is-worth-firing",
    title: "When Is a Second Missile Worth Firing?",
    deck: "Fire again only when the extra missile changes what the target can afford to do.",
    body: [
      "In 200 matched test games, the side allowed to use missiles won 69.1% of games with a clear winner. No firing side won without at least one missile reaching its target. Missiles matter, but drawing more red lines is not enough.",
      "Each missile that hits on the same turn costs the target 1 ΔV. Two hits cost 2 ΔV. If the target has only 1 ΔV, the second missile destroys it. This is a good reason to stack shots.",
      "There is another useful pattern. If missiles arrive on different turns, the target may lose WORK on each of those turns. This can be stronger than making it pay several points once.",
      "Each [FIRE](#why-firing-a-missile-costs-no-fuel) also stops the firing ship from working. A second missile is wasteful when the target can easily pay and the second launcher gives up valuable production."
    ],
    playToWin:
      "Fire the extra missile only if it changes the result. Good results are: the target cannot pay EVADE, loses another WORK, must leave, or is already CONTESTED. Otherwise, keep the second ship working.",
    figures: [
      {
        afterParagraph: 2,
        src: new URL("./assets/devlog/devlog-what-a-missile-is-for.gif", import.meta.url).href,
        alt: "Several DeltaV missile routes reaching targets on the same and on different turns",
        caption:
          "Missiles arriving together drain ΔV at once. Missiles arriving on separate turns can stop WORK more than once."
      }
    ]
  },
  {
    category: "DEFENSE",
    slug: "evasion-became-automatic",
    title: "What Happens When a Missile Hits",
    deck: "The target pays 1 ΔV and evades automatically. If it cannot pay, it is destroyed.",
    body: [
      "EVADE is automatic because clicking a button to make the only sensible choice was not interesting. Your real decision happens earlier, when you decide how much ΔV to keep.",
      "When one missile hits a ship, the faction pays 1 ΔV and the ship survives. Two missiles hitting together cost 2 ΔV. A ship that evades cannot WORK that turn. Other missiles aimed at the same ship stay active until they arrive.",
      "A [CONTESTED ship](#when-enemies-share-an-orbit) cannot evade. A ship whose faction cannot pay the next 1 ΔV is also destroyed. Both results are visible in advance, so you can count them before committing orders.",
      "A BURN cancels every missile aimed at the departing ship. Sometimes paying once to leave is cheaper than paying several EVADES and losing several turns of WORK."
    ],
    playToWin:
      "Keep 1 ΔV for each missile that will hit a ship you need to keep in place. If leaving costs less than all remaining EVADES plus lost WORK, BURN before the first impact.",
    figures: [
      {
        afterParagraph: 1,
        src: new URL("./assets/devlog/devlog-the-long-argument-over-one-dodge.gif", import.meta.url)
          .href,
        alt: "The DeltaV turn history showing a missile impact followed by an automatic EVADE payment",
        caption:
          "The missile hits, 1 ΔV is removed automatically, and the ship survives but does not WORK that turn."
      }
    ]
  },
  {
    category: "CONTESTED",
    slug: "when-enemies-share-an-orbit",
    title: "What CONTESTED Actually Does",
    deck: "Both ships stop working. Each faction pays 2 ΔV per turn until one ship leaves or dies.",
    body: [
      "An orbit becomes CONTESTED when ships from two factions occupy it. The ships do not exchange normal weapon damage. They hold each other in place.",
      "At the start of every turn, each faction pays 2 ΔV for its ship in that orbit. A CONTESTED ship cannot WORK, FIRE or EVADE. It can stay or BURN away. If its faction cannot pay the 2 ΔV, the ship is destroyed.",
      "At a tritium orbit, the cost is larger than it first appears. You pay 2 ΔV and also miss the 2 ΔV that WORK would have produced. Compared with holding the orbit alone, the lock costs you 4 ΔV per turn.",
      "The lock becomes one-sided when a [second friendly ship stays outside](#why-a-third-ship-stays-outside). The inside ship keeps the enemy pinned. The outside ship can still FIRE or cover the escape route."
    ],
    playToWin:
      "Stay CONTESTED only when stopping the enemy's WORK is worth your 2 ΔV upkeep plus your own lost WORK. If you have no outside support and the enemy does, leave before the lock empties your reserve.",
    figures: [
      {
        afterParagraph: 1,
        src: new URL("./assets/devlog/contested-orbit.gif", import.meta.url).href,
        alt: "Two opposing ships sharing the same highlighted orbit while the CONTESTED rules are shown",
        caption:
          "The two ships share one orbit. Neither can WORK, FIRE or EVADE, and both sides pay 2 ΔV each turn."
      }
    ]
  },
  {
    category: "CONTESTED / SUPPORT",
    slug: "why-a-third-ship-stays-outside",
    title: "Why the Third Ship Waits Outside",
    deck: "A CONTESTED orbit holds one ship from each side. Extra ships remain outside and can still act.",
    body: [
      "A normal orbit holds one ship. A CONTESTED orbit holds the two opposing ships. A third ship does not join the lock when it arrives.",
      "That is useful. The outside ship can FIRE at the pinned enemy, wait for it to leave or take the orbit after the lock ends. Putting another ship inside would only make the map harder to read without adding a new choice.",
      "Timing still matters. [Missiles hit before ships arrive](#why-a-missile-arrives-before-reinforcement). If your support ship reaches the orbit on the same turn as your missile, the target may EVADE before the new arrival creates a lock.",
      "To stop EVADE, create CONTESTED one turn before the missile hits."
    ],
    playToWin:
      "Use one ship to hold the enemy and keep the next ship free. Send support early enough to create CONTESTED before impact, not on the impact turn.",
    figures: [
      {
        afterParagraph: 1,
        src: new URL("./assets/devlog/devlog-the-third-ship-stays-outside.gif", import.meta.url)
          .href,
        alt: "A CONTESTED orbit with another ship and its possible support routes visible nearby",
        caption:
          "The locked pair fills the orbit. The useful third ship stays outside, where it can still FIRE or move."
      }
    ]
  },
  {
    category: "TURN ORDER",
    slug: "why-a-missile-arrives-before-reinforcement",
    title: "What Resolves First on a Busy Turn?",
    deck: "Pay CONTESTED upkeep first. Then resolve forced departures, missile hits and ship arrivals.",
    body: [
      "Several things can become due on the same turn. DeltaV always resolves them in the same order so that the clocks on the map have one clear result.",
      "First, factions pay CONTESTED upkeep. Second, old ships make any forced shipyard departure. Third, missiles hit and targets EVADE. Fourth, travelling ships arrive. Actions and WORK come after those steps.",
      "Example: a new ship is waiting at a finished yard, a missile is about to hit it and an enemy ship is arriving. The old worker leaves first. The new ship then pays EVADE. Only after that does the enemy arrive and make the yard CONTESTED.",
      "This is why a same-turn reinforcement cannot stop [EVADE](#evasion-became-automatic). The enemy must already be in the orbit when the missile phase begins."
    ],
    playToWin:
      "For a complicated turn, write four words in order: upkeep, departure, impact, arrival. If your plan needs an arrival to change an earlier step, it will not work.",
    figures: [
      {
        afterParagraph: 2,
        src: new URL(
          "./assets/devlog/devlog-a-missile-arrives-before-reinforcement.gif",
          import.meta.url
        ).href,
        alt: "A missile and a travelling ship approaching the same DeltaV orbit on the same turn",
        caption:
          "The paths meet on the map, but not in the rules: the missile resolves before the travelling ship arrives."
      }
    ]
  },
  {
    category: "SHIPYARDS",
    slug: "why-building-a-ship-makes-another-leave",
    title: "What Happens When a Shipyard Reaches 5/5?",
    deck: "The new ship stays at the yard. The old ship must BURN away or be destroyed.",
    body: [
      "A shipyard needs five turns of WORK to finish a ship. The ship already at the yard supplies the crew and completes the final assembly.",
      "When progress reaches 5/5, the new ship remains at the shipyard. The old ship must choose a legal BURN destination. Its departure happens before missile impacts and normal arrivals. The BURN cost comes from the faction's shared ΔV.",
      "A finished ship is therefore not free. If you have no ΔV for the old ship's route, or every destination is bad, completing 5/5 can cost you the old ship.",
      "You can delay completion by making the worker FIRE or BURN instead of taking the fifth WORK. The stored 4/5 remains, but it can also be [captured](#why-shipyard-progress-can-be-captured)."
    ],
    playToWin:
      "Before taking the fifth WORK, preview the old ship's exit. Finish only if you can pay that BURN and still keep enough ΔV for known missile hits and CONTESTED upkeep.",
    figures: [
      {
        afterParagraph: 1,
        src: new URL(
          "./assets/devlog/devlog-shipyard-completion-is-a-commitment.gif",
          import.meta.url
        ).href,
        alt: "A DeltaV shipyard reaching five out of five and asking the old ship to choose a BURN route",
        caption:
          "At 5/5, the new ship stays in the yard. The ship that performed the WORK must leave immediately."
      }
    ]
  },
  {
    category: "SHIPYARDS / CAPTURE",
    slug: "why-shipyard-progress-can-be-captured",
    title: "Why a Half-Built Shipyard Is Valuable",
    deck: "Construction stays at the shipyard when control changes. The new owner continues from the same number.",
    body: [
      "Shipyard progress belongs to the place, not to the faction. If one faction builds to 3/5 and leaves, the next faction that controls the yard starts from 3/5.",
      "The arithmetic is simple. Capturing a yard at 4/5 saves four turns of WORK compared with capturing it at 0/5. The new owner needs only one more eligible turn to finish the ship and trigger the [forced departure](#why-building-a-ship-makes-another-leave).",
      "CONTESTED stops construction but does not erase it. This makes an almost finished yard worth fighting over even before a ship appears.",
      "Attack too early and you steal very little. Attack too late and the defender already has the new ship."
    ],
    playToWin:
      "Treat each stored fifth as one saved ship-turn. When route costs are similar, attack a yard at 4/5 before an empty yard. Defend the turn before completion, not only the turn after it.",
    figures: [
      {
        afterParagraph: 1,
        src: new URL(
          "./assets/devlog/devlog-the-most-valuable-yard-is-half-built.gif",
          import.meta.url
        ).href,
        alt: "A DeltaV shipyard showing stored construction progress while control of the orbit changes",
        caption:
          "The owner changes, but the construction number does not. The captured work now helps the attacker."
      }
    ]
  },
  {
    category: "VICTORY",
    slug: "fuel-access-decides-the-war",
    title: "How DeltaV Decides Who Won",
    deck: "Ship count does not decide the match. Future access to tritium does.",
    body: [
      "A faction can own several ships and still be unable to move again. Destroying those stranded ships would only make the match longer. DeltaV instead asks which factions can still produce tritium or regain access to it.",
      "A faction may still be alive because a ship is already [WORKING](#why-productive-ships-often-receive-no-order) or travelling to tritium. An affordable contest or a ship that will soon leave a yard can also count.",
      "Known costs count against those plans. Subtract incoming EVADES, CONTESTED upkeep and forced departures. Remember that a ship arriving at tritium waits one more turn before it can WORK.",
      "When only one faction still has a workable route to tritium, that faction wins. Ships that can never affect fuel access no longer matter."
    ],
    playToWin:
      "Count how many separate routes each faction has to future tritium. Protect your second route before making your best route stronger. Attack the enemy's last route before wasting time on stranded ships.",
    figures: [
      {
        afterParagraph: 2,
        src: new URL("./assets/devlog/devlog-war-ends-before-last-ship-dies.gif", import.meta.url)
          .href,
        alt: "A late DeltaV position with several ships but very few remaining routes to tritium",
        caption:
          "Do not count ship icons. Follow each ship's affordable path and ask which faction can still reach tritium."
      }
    ]
  },
  {
    category: "INFORMATION",
    slug: "secrecy-is-about-timing",
    title: "What Is Hidden When Every Ship Is Visible?",
    deck: "Ships, ΔV and existing routes are public. Only the orders being chosen now are hidden.",
    body: [
      "DeltaV does not hide units. You can see every ship, every faction's ΔV, every missile already in flight and every shipyard's progress.",
      "Factions choose orders at the same time and reveal them together. You know what an enemy ship can afford to do, but you do not know whether it will stay, BURN or FIRE this turn.",
      "Do not choose an order that works only if the enemy makes your favourite move. List the moves it can actually pay for. Then choose an order that leaves you safe against the worst one.",
      "For example, if your route works when the enemy stays but loses your last tritium orbit when it BURNS, the route is unsafe. [Visible ships](#there-is-no-stealth-in-space) still create uncertainty because their next decisions are hidden."
    ],
    playToWin:
      "For each important enemy ship, write down stay, BURN and FIRE, then remove the choices it cannot afford. Prefer the plan that keeps a tritium route open against every remaining choice.",
    figures: [
      {
        afterParagraph: 1,
        src: new URL(
          "./assets/devlog/devlog-delta-v-secrecy-is-timing-not-stealth.gif",
          import.meta.url
        ).href,
        alt: "A public DeltaV planning state with ships, fuel totals, routes and impact times visible",
        caption:
          "Everything already on the map is public. The hidden information is the order each faction is choosing now."
      }
    ]
  },
  {
    category: "HARD SCIENCE FICTION",
    slug: "there-is-no-stealth-in-space",
    title: "There Is No Stealth in Space",
    deck: "An active spacecraft produces heat, and its path can be measured. DeltaV keeps ships visible.",
    references: [
      {
        label: "Stealth in Space — Children of a Dead Earth",
        href: "https://childrenofadeadearth.wordpress.com/2016/07/12/stealth-in-space/"
      }
    ],
    body: [
      "A crewed spacecraft needs power. Power creates waste heat, and radiators must release that heat into space. An engine burn is even easier to see. Once observers measure the ship's path, they can continue to predict where it is going.",
      "DeltaV therefore shows active ships, journeys and missiles. It also shows faction ΔV because players could reconstruct that number by writing down every public payment.",
      "The map tells you what the enemy can do, not what it will choose. That uncertainty comes from [simultaneous orders](#secrecy-is-about-timing), not from invisible units or random detection rolls.",
      "This helps you ignore fake threats. If an enemy can see your ship but does not have enough ΔV to reach it and survive the known costs, that route is not dangerous yet."
    ],
    playToWin:
      "Use the public ΔV total. Subtract the enemy's known EVADES and upkeep from it, then check which BURNS remain affordable. Spend your attention on those routes, not on impossible attacks.",
    figures: [
      {
        afterParagraph: 1,
        src: new URL("./assets/devlog/devlog-there-is-no-stealth-in-space.gif", import.meta.url)
          .href,
        alt: "Visible ships and their plotted routes spread across the DeltaV planetarium",
        caption:
          "No detection roll is hiding a fleet. Ships and routes stay visible; the next orders do not."
      }
    ]
  },
  {
    category: "FLEET DESIGN",
    slug: "why-deltav-has-one-kind-of-ship",
    title: "Why Every Ship Has the Same Abilities",
    deck: "A ship's job comes from its position and its next order, not from a class chosen before the match.",
    body: [
      "DeltaV once considered scouts, tankers, missile ships and industrial ships. Those labels made many turns automatic: the tanker refuelled, the missile ship fired and the industrial ship stayed home.",
      "Now every ship can WORK, BURN, FIRE and enter CONTESTED. A ship becomes a [worker](#why-productive-ships-often-receive-no-order) by staying at tritium. It becomes a blockader by sharing an orbit with an enemy. The same ship can do a different job later.",
      "Equal abilities do not make ships equally valuable. A ship at Saturn with 6 ΔV available can affect more useful places than a ship three turns away with a missile about to hit it.",
      "Position, travel time and fuel replace unit statistics. Moving a flexible ship into a dead end can be a larger loss than losing one turn of production."
    ],
    playToWin:
      "Keep at least one ship with two or more useful destinations it can still afford. Use that ship to reinforce tritium, support a CONTESTED orbit or take a nearly finished yard.",
    figures: [
      {
        afterParagraph: 1,
        src: new URL("./assets/devlog/devlog-why-deltav-has-one-kind-of-ship.gif", import.meta.url)
          .href,
        alt: "One selected DeltaV ship with several surrounding planets, moons and possible jobs",
        caption:
          "The ship has no printed class. Its orbit and next order decide whether it produces, attacks or supports."
      }
    ]
  },
  {
    category: "MAP / STRATEGY",
    slug: "how-saturn-became-the-dangerous-exception",
    title: "Why Saturn Is Worth Fighting Over",
    deck: "Saturn provides tritium, Titan builds ships and Iapetus gives nearby ships room to act.",
    body: [
      "Most parts of the map make you travel between fuel and ship production. Saturn is the exception because three different useful orbits sit in the same planetary system.",
      "Saturn produces 2 ΔV per WORK. Titan is a shipyard. Iapetus is a [barren staging orbit](#why-most-moons-stay-outside-the-war) that can hold a support ship without stopping production elsewhere.",
      "You still need separate ships for the three jobs. A worker at Saturn cannot protect Titan at the same time. A ship at Iapetus can FIRE or cover a route, but it earns nothing while it waits.",
      "Titan also announces its danger five turns in advance. Its progress is visible, can be captured, and forces the old worker to leave when it reaches 5/5."
    ],
    playToWin:
      "Do not pile every ship onto one Saturn orbit. Use one ship for fuel, one for the yard and one for support only when needed. Attack by forcing the defender to stop WORK at one of them.",
    figures: [
      {
        afterParagraph: 1,
        src: new URL(
          "./assets/devlog/devlog-how-saturn-became-the-dangerous-exception.gif",
          import.meta.url
        ).href,
        alt: "Saturn, Titan and Iapetus shown together with nearby DeltaV ship routes",
        caption:
          "Saturn makes fuel, Titan builds ships and Iapetus holds support. One ship cannot perform all three jobs."
      }
    ]
  },
  {
    category: "MAP DESIGN",
    slug: "why-most-moons-stay-outside-the-war",
    title: "Why Only Some Moons Are Playable",
    deck: "A moon appears as an active orbit only when it creates a different movement or support choice.",
    body: [
      "The Solar System has hundreds of moons. Making all of them playable filled the map with places that did the same thing. Most were only extra places to wait.",
      "The reference map has 18 active orbits: four tritium planets, four shipyards, Earth and the Moon, and eight barren staging orbits. Barren means the orbit produces nothing, not that it is useless.",
      "A barren moon can give a ship a cheap route, a safe place to FIRE or a position outside CONTESTED. Deimos, Callisto and [Iapetus](#how-saturn-became-the-dangerous-exception) stay active because each changes how a nearby valuable orbit can be attacked or defended.",
      "A distant moon with no useful next move is not territory. It is a dead end."
    ],
    playToWin:
      "Before moving to a barren orbit, count how many productive places the ship can reach next. Prefer one staging orbit with two useful exits over a refuge with none.",
    figures: [
      {
        afterParagraph: 1,
        src: new URL("./assets/devlog/devlog-why-the-solar-system-got-smaller.gif", import.meta.url)
          .href,
        alt: "The DeltaV Solar System showing a small set of active planets and moons",
        caption:
          "Only bodies that change a decision are active. Other real moons remain part of the background."
      }
    ]
  },
  {
    category: "TIME / SCALE",
    slug: "why-one-turn-is-about-three-days",
    title: "Why One Turn Lasts About Three Days",
    deck: "This scale gives you time to see a missile coming and choose an answer before it hits.",
    body: [
      "One turn represents about three days of operations. Shorter turns created too many turns in which nothing happened. Longer turns made movement, missiles and construction finish together too often.",
      "A short local BURN can take one turn. A missile takes at least two turns, so its target always gets a warning. A ship that arrives at a productive orbit waits until the next turn before it can WORK.",
      "These delays create the strategy. You may see a missile at T+2, a ship arriving at T+2 and a yard finishing on T+2, but they do not all resolve together. The [turn order](#why-a-missile-arrives-before-reinforcement) still decides the result.",
      "The three-day number sets the pace of decisions. It is not a promise that every match represents the same number of historical days."
    ],
    playToWin:
      "Compare the turn when each result becomes useful: impact turn for a missile, arrival plus one for WORK, and 5/5 for a shipyard departure. The lowest ETA does not always help first.",
    figures: [
      {
        afterParagraph: 1,
        src: new URL("./assets/devlog/devlog-why-one-turn-is-three-days.gif", import.meta.url).href,
        alt: "A DeltaV ship completing a multi-turn journey while the turn history advances",
        caption: "Arrival finishes the journey. Production still waits until the following turn."
      }
    ]
  },
  {
    category: "WEAPONS / DESIGN",
    slug: "why-deltav-begins-with-missiles",
    title: "Why Missiles Are the First Weapon",
    deck: "A missile takes time to arrive, so both players get a meaningful decision before impact.",
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
      "DeltaV needed a weapon that mattered on a map measured in turns. A missile shows its target and arrival time. The defender can see it coming and decide whether to keep working, pay EVADE or leave.",
      "A laser would hit too quickly at this scale. A gun fight would be decided during a short close pass. Making either one interesting would require a separate tactical combat system.",
      "Missiles use rules that are already in the game: travel time, ΔV, [CONTESTED](#when-enemies-share-an-orbit) and WORK. They add a future problem without adding ammunition, weapon ranges or a second battle screen.",
      "That is also the test for any future weapon. It should create a new decision, not merely show a different animation before damage."
    ],
    playToWin:
      "Aim for a turn when the target already has another problem: low ΔV, CONTESTED upkeep, a forced departure or a second impact. A missile is strongest when the cheap answer is already gone.",
    figures: [
      {
        afterParagraph: 0,
        src: new URL("./assets/devlog/devlog-why-deltav-begins-with-missiles.gif", import.meta.url)
          .href,
        alt: "A visible missile path crossing the DeltaV map toward a target several turns away",
        caption:
          "The missile's travel time is the point. The defender sees the threat and gets another planning turn."
      }
    ]
  },
  {
    category: "WORLD / INDUSTRY",
    slug: "plausibility-sells-the-fantasy",
    title: "What a Shipyard Is Actually Building",
    deck: "The yard stores protected parts. The ship already there turns those parts into an active spacecraft.",
    body: [
      "A complete spacecraft needs power and radiators, so it is hot, visible and exposed. Parts can be switched off, spread out and stored under rock until they are needed.",
      "A DeltaV shipyard therefore builds and stores the major parts of a ship. The ship already in orbit supplies crew and finishes the assembly. When the new ship is ready, it stays and the old ship [must leave](#why-building-a-ship-makes-another-leave).",
      "This also explains why construction progress can be captured. The parts are still physically at the yard when another faction takes control.",
      "The fiction exists to make the rule easy to remember: the yard stores work, not a queue of finished ships."
    ],
    playToWin:
      "Treat shipyard progress as stored turns. Attack after the defender has added several fifths, but before 5/5. When defending, keep enough ΔV for the old ship's forced BURN.",
    figures: [
      {
        afterParagraph: 1,
        src: new URL("./assets/devlog/devlog-plausibility-sells-the-fantasy.gif", import.meta.url)
          .href,
        alt: "A DeltaV spacecraft showing its exposed structure, drive and large radiator ring",
        caption:
          "A complete ship is exposed and active. A shipyard can protect separate parts until the final assembly."
      }
    ]
  },
  {
    category: "WORLD / LORE",
    slug: "how-the-lore-became-part-of-the-rules",
    title: "Why the War Stops at Earth and Starts Beyond the Moon",
    deck: "Earth and the Moon are protected. The fight is over tritium and industry farther out.",
    body: [
      "Tritium powers the fusion drives used by corporate fleets. It is the game's only resource because the war is about keeping ships able to move, not managing several cargo lists.",
      "Earth and the Moon are protected by terrestrial governments. Fighting there would threaten civilians and fill important orbits with debris. In the game they provide orientation and routes, but no WORK and no CONTESTED battle.",
      "Farther from Earth, policing is slower and more expensive. Corporate fleets use contractors and deniable attacks instead of declaring a total war. The 2079 [Saturn incident](#how-saturn-became-the-dangerous-exception) is the first confirmed weapon use by a registered ship.",
      "The setting gives the map a boundary the player can understand: protected space near Earth, corporate war around the resources of the outer Solar System."
    ],
    playToWin:
      "Do not defend Earth or the Moon as if they produced something. Use them only when travelling through the protected corridor gives a cheaper route back to a productive orbit.",
    figures: [
      {
        afterParagraph: 1,
        src: new URL(
          "./assets/devlog/devlog-how-the-lore-became-part-of-the-rules.gif",
          import.meta.url
        ).href,
        alt: "The protected Earth-Moon area and corporate routes farther across the DeltaV Solar System",
        caption:
          "Earth and the Moon anchor the map but produce nothing. The playable war happens farther out."
      }
    ]
  }
] as const satisfies readonly DevlogEntry[];
