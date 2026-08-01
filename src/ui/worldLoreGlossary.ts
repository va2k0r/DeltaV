import type { GameGlossaryEntry } from "./gameGlossary";

export const worldLoreGlossaryEntries = [
  {
    id: "fusion-torch",
    label: "FUSION TORCH",
    aliases: ["FUSION TORCH", "FUSION TORCHES", "TORCH DRIVE", "TORCH DRIVES", "TORCH"],
    short: "A fusion engine that sustains acceleration by accepting extreme fuel and heat loads.",
    detail: [
      "A torch combines a reactor, power plant and magnetic exhaust nozzle. Fusion supplies the energy, while bulk hydrogen carries momentum away.",
      "Because the drive can thrust for days rather than minutes, interplanetary transfers become routine operations instead of generational voyages.",
      "Its limits come from neutron shielding, magnet performance and radiator capacity rather than from a conventional combustion chamber."
    ]
  },
  {
    id: "fusion",
    label: "FUSION",
    aliases: ["FUSION", "FUSION ENERGY", "FUSION POWER", "FUSION FUEL"],
    short: "By 2079, fusion supplies abundant firm power but still imposes severe thermal costs.",
    detail: [
      "In 2058, a commercial D-T station first exported firm power while breeding enough tritium to replace everything it consumed.",
      "Its neutrons both damage reactor walls and breed replacement fuel from lithium-6, so automated maintenance and rapid materials testing remain essential.",
      "Fusion makes energy abundant, but magnets, enriched lithium, turbines and heat-rejection capacity still limit how much useful power a site can deliver."
    ]
  },
  {
    id: "nuclear",
    label: "NUCLEAR",
    aliases: ["NUCLEAR WARFARE", "NUCLEAR", "THERMONUCLEAR"],
    short: "A mature energy regime whose civilian abundance did not simplify military use.",
    detail: [
      "Fusion stations power cities and server farms, while compact propulsion reached ships only after stationary generation had matured.",
      "Fission remains useful in triggers, remote backup plants and weapons packages, alongside fusion-powered propulsion, sensors and fabrication.",
      "Earth-Moon treaties interdict nuclear combat. The same law applies farther out, although the forces able to enforce it become increasingly remote."
    ]
  },
  {
    id: "artificial-intelligence",
    label: "ARTIFICIAL INTELLIGENCE",
    aliases: ["ARTIFICIAL INTELLIGENCE", "ARTIFICIAL INTELLIGENCES", "AI"],
    short:
      "The main accelerator of 2079 industry, shifting its limits back toward energy and materials.",
    detail: [
      "In 2043, the first certified materials loop let models choose, fabricate, irradiate and reject candidates without waiting for a human shortlist.",
      "That process expanded testing from dozens of materials to millions, making electricity, fabrication throughput and discarded heat the next constraints.",
      "Deployed fleets therefore run local compute: an eighty-minute delay from Earth permits oversight, but not tactical command."
    ]
  },
  {
    id: "server-farm",
    label: "SERVER FARM",
    aliases: [
      "AI SERVER FARM",
      "AI SERVER FARMS",
      "SERVER FARM",
      "SERVER FARMS",
      "DATACENTER",
      "DATACENTERS"
    ],
    short: "An industrial campus that converts electricity into prediction, design and control.",
    detail: [
      "By 2069, the largest campuses connected directly to fusion stations and dedicated cooling works so that power and heat could scale together.",
      "More electricity supports more training, search and industrial scheduling until memory, verified data or fabrication becomes the next bottleneck.",
      "Outer-system farms avoid terrestrial latency by controlling local mines, yards and traffic, making industrial connections as important as scale."
    ]
  },
  {
    id: "compute",
    label: "COMPUTE",
    aliases: ["COMPUTE", "COMPUTATION", "COMPUTING", "COMPUTATIONAL", "PROCESSING POWER"],
    short:
      "A strategic industrial input measured by useful decisions rather than processor count alone.",
    detail: [
      "Raw operations provide only a starting measure because memory, interconnect, model efficiency and verified data determine how much becomes useful work.",
      "A state can purchase processors more quickly than it can reproduce a proprietary fleet, its training record and the robotic supply chain it controls.",
      "Corporate advantage therefore comes from an integrated operating history, not from a single intelligence score."
    ]
  },
  {
    id: "heat-rejection",
    label: "HEAT REJECTION",
    aliases: ["HEAT REJECTION", "WASTE HEAT", "COOLING", "HEAT"],
    short: "The physical ceiling shared by fusion plants, computers and inhabited ships.",
    detail: [
      "Almost every joule used for computation becomes heat. On Earth, air, water and ground can carry it away; in vacuum, a ship must radiate it.",
      "Proximity to a cold planet offers little help without matter to conduct or convect the heat, so radiator temperature and area set usable capacity.",
      "Large radiators consequently increase power output while also enlarging the ship's visible and vulnerable silhouette."
    ]
  },
  {
    id: "radiator",
    label: "RADIATOR",
    aliases: ["RADIATOR", "RADIATORS", "RADIATOR WING", "RADIATOR WINGS"],
    short: "A large, fragile surface that releases waste heat as infrared radiation.",
    detail: [
      "Torch power, life support and compute all depend on how much heat the radiator wings can emit into space.",
      "The panels fold for docking but extend far beyond the armoured spine in flight, and their roots create blind angles in point-defense coverage.",
      "Isolated punctures are manageable, whereas losing an entire cooling loop forces the crew to shut systems down long before cabin temperature falls."
    ]
  },
  {
    id: "materials",
    label: "MATERIALS",
    aliases: ["MATERIAL SCIENCE", "MATERIALS", "COMPONENTS", "COMPONENT"],
    short:
      "The materials stack that made fusion components fail slowly, predictably and repairably.",
    detail: [
      "Practical fusion did not depend on one alloy, but on replaceable tungsten faces, low-activation steels, ceramics, superconductors and monitored joints.",
      "AI accelerated discovery, automated foundries preserved consistency, and robotic hot cells replaced parts that neutron damage would inevitably degrade.",
      "The resulting plants became reliable because maintenance and replacement were designed into every component from the beginning."
    ]
  },
  {
    id: "automated-mining",
    label: "AUTOMATED MINING",
    aliases: [
      "AUTOMATED MINING",
      "AUTONOMOUS MINING",
      "MINING",
      "EXTRACTION",
      "EXTRACTING",
      "EXTRACTS",
      "EXTRACT"
    ],
    short:
      "A robotic industry that surveys, extracts, refines and repairs without resident operators.",
    detail: [
      "Near Saturn, local models assign claims, reroute haulers and cannibalise failed machinery because no operator on Earth can steer equipment in real time.",
      "A 2076 pilot first reproduced an extractor, power loop and operating software from mostly local stock, while retaining imported specialist parts.",
      "Rocky drones recover lithium feedstock and atmospheric skimmers collect deuterium-rich hydrogen before orbital plants certify the finished fusion fuel.",
      "Controlling extraction therefore requires power, spares, compute and traffic authority, not merely ownership of the ground being worked."
    ]
  },
  {
    id: "mining-drone",
    label: "MINING DRONE",
    aliases: ["MINING DRONE", "MINING DRONES", "DRONE MINE", "DRONE MINES", "DRONE", "DRONES"],
    short:
      "A replaceable machine able to improvise while operating far beyond real-time supervision.",
    detail: [
      "Mining drones share tools, maps and failure models, and most operate without a permanent human controller.",
      "A damaged unit is recovered only when its expected value exceeds the cost of the trip; otherwise nearby machines reuse it as parts stock.",
      "This autonomy made outer-system industry affordable and slowed the effect of terrestrial embargoes, while signed decision logs preserved legal evidence."
    ]
  },
  {
    id: "tritium-breeding",
    label: "TRITIUM PLANT",
    aliases: [
      "TRITIUM PLANT",
      "TRITIUM PLANTS",
      "TRITIUM PRODUCTION",
      "TRITIUM BREEDING",
      "BREEDER BLANKET",
      "BREEDER BLANKETS",
      "BREEDER",
      "BREEDING"
    ],
    short: "An industrial plant that manufactures tritium from lithium-6 and fusion neutrons.",
    detail: [
      "Tritium cannot be mined from an ancient seam because its 12.3-year half-life removed any primordial deposits long ago.",
      "Inside the plant, a breeder blanket captures reactor neutrons in lithium-6 and feeds the resulting tritium back into the fuel cycle.",
      "The cycle must produce slightly more tritium than its reactors consume, since only that surplus can start new reactors and supply ships.",
      "A tritium site is therefore a tightly controlled production and refining complex rather than a deposit of radioactive hydrogen."
    ]
  },
  {
    id: "deuterium",
    label: "DEUTERIUM",
    aliases: ["DEUTERIUM"],
    short: "Stable heavy hydrogen that is plentiful and easier to store than tritium.",
    detail: [
      "Gas-giant skimmers separate deuterium from immense hydrogen flows, using large plants but drawing on a source effectively inexhaustible at this scale.",
      "Deuterium supplies the stable half of D-T fuel, while tritium plants manufacture the perishable half from lithium-6.",
      "Operational ledgers combine both industrial chains when they report certified TRITIUM output available to the fleet."
    ]
  },
  {
    id: "lithium-six",
    label: "LITHIUM-6",
    aliases: ["LITHIUM-6", "LITHIUM 6", "LI-6", "LITHIUM"],
    short: "The stable feedstock from which fusion plants manufacture tritium.",
    detail: [
      "Lithium-6 is stable, transportable and easier to stockpile than the tritium it will eventually become.",
      "Lunar and asteroid refineries enrich it before shipment to the neutron blankets inside tritium plants.",
      "Raw lithium is seldom the constraint; the scarce asset is enriched stock already inside a functioning, neutron-tight fuel cycle.",
      "Without that cycle, abundant lithium-bearing rock cannot provide usable fuel on an operational timescale."
    ]
  },
  {
    id: "continuous-acceleration",
    label: "CONTINUOUS ACCELERATION",
    aliases: ["CONTINUOUS ACCELERATION", "ACCELERATION"],
    short: "Moderate thrust sustained long enough to reshape transfer time and firing geometry.",
    detail: [
      "Chemical engines deliver brief impulses, whereas torch ships keep changing velocity for as long as their reactors and radiators can sustain the load.",
      "Crew acceleration remains modest, but the velocity accumulated over days can be very large.",
      "A BURN therefore represents a guided thrust programme rather than one flash from a nozzle, including margins retained for later manoeuvres."
    ]
  },
  {
    id: "reaction-mass",
    label: "REACTION MASS",
    aliases: ["REACTION MASS", "PROPELLANT"],
    short: "Matter expelled astern so that fusion energy can produce momentum.",
    detail: [
      "Tritium provides concentrated energy but little of the exhaust mass, so torch drives heat abundant hydrogen and expel it through a magnetic nozzle.",
      "Higher exhaust velocity reduces the mass needed for a manoeuvre, while sustained high thrust consumes that mass more quickly.",
      "Fleet accounting combines fusion fuel, reaction mass and safety margins into the global ΔV reserve used for planning."
    ]
  },
  {
    id: "year-2043",
    label: "2043",
    aliases: ["2043"],
    short: "The year materials discovery became a continuous, machine-speed process.",
    detail: [
      "Candidate selection, fabrication, irradiation and failure analysis began running continuously under one audited model stack.",
      "The advance came from throughput, since millions of informative failures could now replace a small number of carefully chosen experiments.",
      "That acceleration in 2043 provided the materials base for the mature fusion economy of 2079."
    ]
  },
  {
    id: "year-2058",
    label: "2058",
    aliases: ["2058"],
    short: "The year commercial fusion closed both its tritium and maintenance cycles.",
    detail: [
      "One D-T station exported firm power for a full accounting year while producing all the replacement tritium it required.",
      "Robotic hot-cell maintenance also turned neutron damage from an experiment-ending failure into a predictable operating cost.",
      "By 2079, twenty-one years of replication and maintenance experience have made fusion ordinary infrastructure."
    ]
  },
  {
    id: "year-2069",
    label: "2069",
    aliases: ["2069"],
    short: "The year large-scale compute began absorbing the fusion surplus built to support it.",
    detail: [
      "The largest AI campuses began contracting whole reactors together with the cooling works needed to use their output.",
      "Efficiency gains reduced the cost of each operation, but the released power was quickly redirected into larger searches, models and industrial schedules.",
      "By 2079, strategic compute is limited as much by delivered power and removed heat as by processor availability."
    ]
  },
  {
    id: "year-2076",
    label: "2076",
    aliases: ["2076"],
    short:
      "The year an outer-system industrial branch reproduced its core capacity from local stock.",
    detail: [
      "A pilot mine built a second extractor, power loop and processing line without waiting for a work order from Earth.",
      "The branch still used imported components where local manufacture was inefficient, so its autonomy was substantial rather than absolute.",
      "By 2079, that qualified independence supports the fleets now fighting over outer-system production."
    ]
  },
  {
    id: "point-defense",
    label: "POINT DEFENSE",
    aliases: ["POINT DEFENSE", "POINT-DEFENSE", "DEFENSE"],
    short: "A rapid-fire turret that can defend one ship only within its current engagement cone.",
    detail: [
      "The turret places tracer bursts around a predicted crossing point and tightens them through a spiral-zeroing pattern.",
      "A missile-drone observes that stream, jinks between corrections and searches for the blind angle near the radiator roots.",
      "EVADE spends 1 ΔV to rotate and translate the ship until the attacker returns to the gun's solved cone.",
      "Within that cone the fire-control system is highly reliable, but geometry matters more than accuracy once the target leaves it.",
      "Two coordinated missiles from opposed vectors can exceed what one turret and one hull translation are able to cover."
    ]
  },
  {
    id: "hard-kill",
    label: "HARD-KILL",
    aliases: ["HARD-KILL", "HARD KILL"],
    short: "Defense that destroys an incoming weapon before its terminal solution closes.",
    detail: [
      "Electronic deception first increases uncertainty, after which hard-kill fire attacks the missile's sensors, control surfaces and propulsion.",
      "The turret does not need to penetrate the warhead casing, but it must destroy the missile far enough away for debris and nuclear effects to miss the ship.",
      "A successful EVADE therefore records a completed defensive manoeuvre, not evidence that the original shot was harmless."
    ]
  },
  {
    id: "kinetic",
    label: "KINETIC",
    aliases: ["KINETIC", "KINETICS"],
    short: "A weapon effect produced by mass and high relative velocity rather than explosives.",
    detail: [
      "Point defense fires dense, inert projectiles at high cadence because closing velocity lets even a small penetrator destroy guidance or coolant hardware.",
      "The ammunition is inexpensive enough for regular practice, although the mass of a useful magazine remains significant.",
      "Its main weakness is geometry: once fired, a projectile cannot correct its path after the missile has watched it pass."
    ]
  },
  {
    id: "spiral-zeroing",
    label: "SPIRAL ZEROING",
    aliases: ["SPIRAL ZEROING", "ZEROING"],
    short: "A converging fire-control search that uses observed misses to solve a firing solution.",
    detail: [
      "Tracer telemetry reports where each burst crossed the target plane, allowing the turret to place the next burst closer to the predicted crossing point.",
      "Fire control also rotates the error vector so that a missile cannot remain safe by jinking repeatedly to one side.",
      "The spiral contracts faster than a human correction loop could manage; missile guidance survives by changing planes or exceeding turret travel."
    ]
  },
  {
    id: "tracer",
    label: "TRACER",
    aliases: ["TRACER FIRE", "TRACER", "TRACERS"],
    short: "Instrumented rounds that report each miss to the fire-control system that caused it.",
    detail: [
      "A 2079 tracer carries an emitter and timed breakup pattern that reports the actual projectile stream against the predicted target plane.",
      "Mixed into each burst, these rounds let fire control correct barrel flex, thermal drift and ship rotation in real time.",
      "The same signal also reveals the stream to missile guidance, so both attacker and defender use the telemetry computationally."
    ]
  },
  {
    id: "turret",
    label: "TURRET",
    aliases: ["SINGLE TURRET", "TURRET", "TURRETS"],
    short:
      "The ship's only fast-traverse hard-kill mount, making its coverage the defensive bottleneck.",
    detail: [
      "Using one turret saves mass and avoids duplicating ammunition feeds and fire control, but leaves the ship dependent on one line of coverage.",
      "The mount can saturate a solved volume but cannot fire through the hull, tanks or radiator roots, so the ship must manoeuvre to support it.",
      "A second independent attack axis can then demand coverage that one turret cannot schedule or the hull cannot rotate to provide."
    ]
  },
  {
    id: "blind-angle",
    label: "BLIND ANGLE",
    aliases: ["BLIND ANGLE", "BLIND ANGLES", "BLIND CONE", "BLIND CONES"],
    short: "A direction the defensive turret cannot safely cover through the ship's own structure.",
    detail: [
      "Docking stores, radiator roots and the drive spine block different arcs as the ship changes configuration.",
      "Missile-drones continually recompute a terminal path into these shadows, while EVADE rotates and translates the ship to move the blind angle away.",
      "If no ΔV remains for that manoeuvre, the defender may be unable to restore a firing geometry before impact."
    ]
  },
  {
    id: "missile-drone",
    label: "MISSILE-DRONE",
    aliases: ["MISSILE-DRONE", "MISSILE-DRONES", "DRONE MISSILE", "DRONE MISSILES"],
    short: "An autonomous nuclear vehicle designed to defeat the ship's active defenses.",
    detail: [
      "Each missile carries navigation, optical sensing, electronic attack and a compact drive, allowing it to pursue a predicted terminal geometry.",
      "Rather than chase the ship's present position, it watches defensive tracers and spends its manoeuvre reserve on late jinks toward uncovered angles.",
      "A ship carries roughly ten to twelve missiles, so magazine depth constrains how long it can sustain repeated engagements."
    ]
  },
  {
    id: "warhead",
    label: "WARHEAD",
    aliases: ["WARHEAD", "WARHEADS", "WEAPONS PACKAGE", "WEAPONS PACKAGES"],
    short:
      "A nuclear terminal package intended to remain lethal across a small defensive miss distance.",
    detail: [
      "The missile seeks a close terminal geometry rather than direct contact, allowing prompt radiation, flash heating and debris to cross the final miss distance.",
      "Yield is limited near valuable infrastructure, where precise guidance reduces the need for a larger and less discriminating effect.",
      "Ships may carry these packages inside the protected corridor under safeguards, but arming them there is prohibited and actively interdicted."
    ]
  },
  {
    id: "docking-spine",
    label: "DOCKING SPINE",
    aliases: ["DOCKING SPINE", "DOCKING STRUCTURE", "DOCKING"],
    short:
      "The ship's structural centre, combining berths, cargo interfaces and module attachments.",
    detail: [
      "A combat ship is built around a non-rotating spine that carries docking collars, tritium canisters and replaceable mission modules.",
      "Habitation, weapons, reactor and radiator assemblies attach to this structure, which can also berth a stored hull during commissioning.",
      "The standard layout accelerates shipyard work but also gives hostile targeting software a predictable map of blocked and vulnerable arcs."
    ]
  },
  {
    id: "tritium-canister",
    label: "TRITIUM CANISTER",
    aliases: ["TRITIUM CANISTER", "TRITIUM CANISTERS", "CANISTER", "CANISTERS"],
    short: "A shielded, monitored fuel vessel designed for controlled loss and rapid replacement.",
    detail: [
      "Tritium permeates metals and decays continuously, so canisters require precise accounting and remain on isolated racks outside the main pressure hull.",
      "Their contents have little mass but high operational value, which makes quick inspection and replacement more useful than permanent installation.",
      "Faction accounts combine certified canisters with reaction mass and reserve margins in one spendable ΔV total."
    ]
  },
  {
    id: "weapons-module",
    label: "WEAPONS MODULE",
    aliases: ["WEAPONS MODULE", "WEAPON MODULE", "WEAPONS MODULES", "WEAPON MODULES"],
    short:
      "A replaceable combat section containing the turret, missile magazine and firing sensors.",
    detail: [
      "The module carries one rapid-fire point-defense turret and ten to twelve missile-drones ahead of the habitation ring.",
      "That placement directs firing debris and a possible magazine failure away from the crew, while dockside cranes can exchange the whole section quickly.",
      "A ship can still travel without the module, but it lacks the defensive and offensive systems required for combat operations."
    ]
  },
  {
    id: "life-support",
    label: "LIFE SUPPORT",
    aliases: ["LIFE SUPPORT", "HABITATION", "HABITATION MODULE"],
    short:
      "A closed-loop system sized for both the active crew and reserve teams awaiting new hulls.",
    detail: [
      "Water and oxygen circulate through closed loops, while food, filters and medical stocks determine how long the mission can continue.",
      "An opening ship also houses reserve complements for hulls expected to be commissioned, sharing shelter, bunks and exercise space among future crews.",
      "When a reserve team departs, the parent ship gains living space but loses some of the personnel redundancy available during emergencies."
    ]
  },
  {
    id: "commissioning",
    label: "COMMISSIONING",
    aliases: ["COMMISSIONING", "COMMISSIONED", "COMMISSION", "COMMISSIONS"],
    short:
      "The process that turns a stored hull into an independent ship with crew, fuel and authority.",
    detail: [
      "Shipyards hold disassembled hulls rather than trained crews, so completion requires a reserve complement from the incumbent ship.",
      "That team crosses the docking spine, verifies pressure and life support, loads fuel and assumes independent command keys.",
      "Heavy automation permits a minimum watch of twelve; a typical opening ship carries four complements, or 48 people, for itself and three outputs."
    ]
  },
  {
    id: "crew-reserve",
    label: "CREW RESERVE",
    aliases: ["CREW RESERVE", "CREW RESERVES", "RESERVE CREW", "RESERVE COMPLEMENT"],
    short: "Personnel carried aboard an active ship for vessels that have not yet been assembled.",
    detail: [
      "Reserve crew train, maintain stores and stand watches aboard the parent ship rather than travelling as passive passengers.",
      "Each commissioned hull needs a complete twelve-person team covering command, flight, reactor, weapons, systems and medicine.",
      "Casualties before commissioning can therefore leave a serviceable hull without a legal or operational crew, constraining production schedules."
    ]
  },
  {
    id: "orbital-duel",
    label: "ORBITAL DUEL",
    aliases: ["ORBITAL DUEL", "ORBITAL DUELS", "KNIFE-FIGHT", "KNIFE FIGHT"],
    short: "Two ships manoeuvring for each other's blind angles while protecting their own.",
    detail: [
      "At shared-orbit distance, both ships launch probes, spoil firing solutions and destroy exposed missiles while maintaining their own defensive geometry.",
      "Neither can WORK, FIRE outward or relax its defenses, and each side spends 2 ΔV per turn to maintain the lock.",
      "A missile from a supporting ship adds a second vector that one turret may be unable to cover while it remains engaged with the local opponent."
    ]
  },
  {
    id: "support-ship",
    label: "SUPPORT SHIP",
    aliases: ["SUPPORT SHIP", "SUPPORT SHIPS", "SUPPORT"],
    short: "An uncontested ship that attacks a target already occupied by a local opponent.",
    detail: [
      "Ships in a contested lock already spend thrust and defensive attention on each other, leaving little capacity for a new bearing.",
      "A support ship FIRES from outside that geometry and can choose a cone the target cannot cover without exposing itself to the local opponent.",
      "One missile from this second direction may therefore achieve more than several launched along the axis already being defended."
    ]
  },
  {
    id: "private-fleet",
    label: "PRIVATE FLEET",
    aliases: [
      "PRIVATE FLEET",
      "PRIVATE FLEETS",
      "SECURITY FLEET",
      "SECURITY FLEETS",
      "CONTRACTOR",
      "CONTRACTORS"
    ],
    short: "Corporate transport, rescue and security capacity repurposed for sustained combat.",
    detail: [
      "The first armed hulls served as convoy escorts and emergency-response craft rather than declared warships.",
      "Their crews remained employees and contractors, with command keys issued through corporate security offices.",
      "Once these fleets could protect traffic, deny an orbit and survive retaliation, their operational role became naval regardless of the legal label.",
      "States had not stationed equivalent forces in the outer system because contracting corporate capacity had previously been cheaper."
    ]
  },
  {
    id: "deniable-operation",
    label: "DENIABLE OPERATION",
    aliases: [
      "DENIABLE OPERATION",
      "DENIABLE OPERATIONS",
      "DENIABLE",
      "SABOTAGE",
      "ACCIDENT",
      "ACCIDENTS"
    ],
    short: "Coercion designed to remain below the evidentiary threshold for open retaliation.",
    detail: [
      "Before Saturn, extraction heads failed, guidance tables drifted and cargo departed under incompatible manifests, usually to a rival's benefit.",
      "Each incident also had a plausible technical explanation, which kept responsibility below the threshold required for open retaliation.",
      "Autonomous machinery widened this ambiguity because a model could be corrupted without ever receiving a legible instruction to attack.",
      "The first recorded destruction of a ship ended that ambiguity by preserving a complete and attributable firing sequence."
    ]
  },
  {
    id: "information-control",
    label: "INFORMATION CONTROL",
    aliases: [
      "INFORMATION CONTROL",
      "INFORMATION",
      "REPORTING",
      "PUBLIC RECORD",
      "JOURNALIST",
      "JOURNALISTS",
      "PROPAGANDA"
    ],
    short: "The corporate filtration between remote telemetry and terrestrial public knowledge.",
    detail: [
      "Saturn patrols carry no neutral observers, and nearly every useful sensor belongs to one of the parties to the dispute.",
      "Corporations release enough signed telemetry to accuse rivals while withholding the operational context that could expose their own decisions.",
      "Earth therefore receives extensive data and incompatible narratives without access to a physical crime scene that investigators can secure."
    ]
  },
  {
    id: "corporation",
    label: "CORPORATION",
    aliases: ["MEGACORPORATION", "MEGACORPORATIONS", "CORPORATION", "CORPORATIONS", "CORPORATE"],
    short: "A chartered industrial network whose off-world capacity exceeds nearby public forces.",
    detail: [
      "The combines of 2079 integrate yards, reactors, models, traffic control and trained crews rather than functioning only as financial holding companies.",
      "They remain taxable, subject to suit and vulnerable to arrest on Earth, where governments can reach their personnel and assets.",
      "Beyond Mars, however, their equipment can operate for years without terrestrial authorisation, giving them logistical reach that public forces lack."
    ]
  },
  {
    id: "government",
    label: "GOVERNMENT",
    aliases: ["GOVERNMENT", "GOVERNMENTS", "STATE", "STATES", "SUPERSTATE", "SUPERSTATES"],
    short:
      "A sovereign authority with substantial economic power but little force near the decisive orbit.",
    detail: [
      "A government does not need equivalent compute to tax a company, seize terrestrial assets or arrest directors within its jurisdiction.",
      "Stopping violence near Saturn on the day it occurs requires ships, depots and command authority already present in that system.",
      "Public agencies had contracted much of the expansion, leaving the integrated industrial fleet in private hands when immediate control became necessary."
    ]
  },
  {
    id: "jurisdiction",
    label: "JURISDICTION",
    aliases: ["JURISDICTION", "JURISDICTIONS"],
    short:
      "The legal authority to judge an act, distinct from the physical ability to reach its actor.",
    detail: [
      "Registered spacecraft remain under national law, and private activity remains attributable to a supervising state under existing treaties.",
      "Murder near Saturn is prosecutable, although a warrant can cross the distance much sooner than the marshal expected to enforce it.",
      "Competing registries, mixed crews and autonomous weapons complicate venue and responsibility without removing the underlying jurisdiction."
    ]
  },
  {
    id: "space-law",
    label: "SPACE LAW",
    aliases: ["SPACE LAW", "LAW", "LEGAL", "ILLEGAL", "LAWFUL", "UNLAWFUL"],
    short:
      "A terrestrial legal order whose reach exceeds the infrastructure available to enforce it.",
    detail: [
      "Treaties prohibit national sovereignty over celestial bodies and make states responsible for the private operators they supervise.",
      "Domestic law can still recognise ownership of extracted resources, ships, cargo and registered facilities without recognising ownership of Saturn.",
      "The first open kinetic exchange therefore remains a legal event, but its evidence arrives long before any credible physical response."
    ]
  },
  {
    id: "private-property",
    label: "PRIVATE PROPERTY",
    aliases: ["PRIVATE PROPERTY", "PROPERTY", "OWNERSHIP", "CLAIM", "CLAIMS"],
    short:
      "Ownership of equipment and recovered material without sovereignty over the world beneath it.",
    detail: [
      "A combine can own its refinery, drones, fuel and stored hulls even though it cannot own the planet or moon supporting the operation.",
      "An exclusion zone may be only a safety notice in law, yet it functions as a border when one operator controls the only practical approach.",
      "A rival can dispute the contract while occupying the useful orbit, turning access and possession into the immediate facts without creating sovereignty."
    ]
  },
  {
    id: "deterrence",
    label: "DETERRENCE",
    aliases: ["DETERRENCE", "DETER", "DETERS", "RETALIATION"],
    short: "A threatened consequence credible enough to change a decision before violence begins.",
    detail: [
      "Terrestrial authorities can freeze accounts, revoke licences, detain directors and close markets to a corporation.",
      "These measures deter only while off-world command values terrestrial assets more than the objective it expects to gain by acting.",
      "Physical deterrence requires a force already in the theatre, because one launched after an attack cannot influence the decision that produced it.",
      "At Saturn, available threats were either delayed by distance or too costly for any party to execute without accepting comparable damage."
    ]
  },
  {
    id: "sanctions",
    label: "SANCTIONS",
    aliases: ["SANCTIONS", "SANCTION", "EMBARGO", "EMBARGOES", "FINE", "FINES"],
    short:
      "Rapid terrestrial punishment whose effect on autonomous outer-system industry remains slow.",
    detail: [
      "Accounts can be frozen within hours, while launch licences and export access can disappear within days.",
      "A refinery with local power, compute and years of spare parts nevertheless continues operating until those external dependencies become binding.",
      "Sanctions can shape later operations, ownership litigation and any return to Earth, but they cannot alter a missile already in flight."
    ]
  },
  {
    id: "spacecraft-registry",
    label: "SPACECRAFT REGISTRY",
    aliases: ["SPACECRAFT REGISTRY", "REGISTRY", "REGISTRATION", "REGISTERED"],
    short:
      "The legal record connecting a distant hull to one state and one chain of responsibility.",
    detail: [
      "Registration identifies jurisdiction, supervising authority and liability for a spacecraft and its operations.",
      "Corporate groups use flags, subsidiaries and modular transfers to distribute responsibility, but changing operators cannot make a hull ownerless.",
      "The first Saturn case begins with telemetry and registry records, followed by a dispute over which supervising authority failed first."
    ]
  },
  {
    id: "earth-moon-corridor",
    label: "EARTH-MOON CORRIDOR",
    aliases: ["EARTH-MOON CORRIDOR", "EARTH MOON CORRIDOR", "PROTECTED CORRIDOR", "CORRIDOR"],
    short:
      "The only region where law, sensors and enforcement forces still operate on the same clock.",
    detail: [
      "Earth and lunar traffic is continuously registered, inspected and tracked, while nuclear packages remain under active safeguards.",
      "A hostile guidance lock can trigger both public and corporate defenses because enforcement assets are already close to the traffic they protect.",
      "Beyond the corridor, the same legal rules remain in force but the ships assigned to enforce them fall progressively farther behind events."
    ]
  },
  {
    id: "interdiction",
    label: "INTERDICTION",
    aliases: ["INTERDICTED ZONES", "INTERDICTION", "INTERDICTED", "INTERDICTS", "UNSANCTIONED"],
    short: "A prohibition backed by the practical ability to inspect, divert or disable traffic.",
    detail: [
      "Near Earth, sensors detect launches before payloads can hide and defense craft remain only hours from likely violations.",
      "The corridor's ban on armed nuclear operations is therefore enforced physically as well as stated in law.",
      "At Saturn, the same prohibition without a stationed force can support a future prosecution but cannot guarantee immediate compliance."
    ]
  },
  {
    id: "hostile-action",
    label: "HOSTILE ACTION",
    aliases: [
      "HOSTILE ACTION",
      "HOSTILE ACTIONS",
      "ARMED CONFLICT",
      "HOSTILITY",
      "HOSTILITIES",
      "CONFLICT"
    ],
    short: "An openly attributable use of force beyond the protected corridor.",
    detail: [
      "Before the Saturn incident, no registered operator had used a ship weapon against another registered vessel in a confirmed exchange.",
      "The incident begins when one ship deliberately closes a firing solution and a complete telemetry record survives transmission.",
      "Authorities classify the sequence as intentional lethal action while local events continue, establishing the first confirmed armed exchange."
    ]
  },
  {
    id: "saturn-incident",
    label: "SATURN INCIDENT",
    aliases: ["SATURN INCIDENT", "FIRST SATURN EXCHANGE", "FIRST KINETIC EXCHANGE"],
    short:
      "The recorded attack that turned corporate competition into interplanetary armed conflict.",
    detail: [
      "The attack destroyed one registered ship and killed its crew, while the registry and telemetry trail survived the vessel itself.",
      "The attacker described the action as defense of an extraction zone, whereas the target's supervising state classified it as murder.",
      "Both accounts reached Earth roughly eighty minutes later, after local fleets had already begun their next transfers."
    ]
  },
  {
    id: "local-command",
    label: "LOCAL COMMAND",
    aliases: ["LOCAL COMMAND", "LOCAL AUTHORITY", "AUTONOMOUS", "AUTONOMY"],
    short: "Decision authority delegated to crews operating beyond useful real-time communication.",
    detail: [
      "Outer-system crews receive objectives, legal constraints and cryptographic authority before deployment because routine decisions cannot wait for Earth.",
      "They execute burns and defensive actions locally, with AI maintaining the tactical picture and humans authorising lethal release.",
      "This discretion allows ships to respond on operational timescales, but it also allows a crisis to advance before corporate owners can intervene."
    ]
  },
  {
    id: "attribution",
    label: "ATTRIBUTION",
    aliases: ["ATTRIBUTION", "ATTRIBUTED", "ATTRIBUTABLE", "EVIDENCE"],
    short:
      "The process of proving who commanded a weapon from records controlled by interested parties.",
    detail: [
      "Burn signatures, tracer timing, registry keys and optical baselines make the physical sequence of a space engagement difficult to conceal.",
      "Those records do not by themselves identify which director, crew member or model authorised the action.",
      "Corporations release incompatible logs while retaining evidence that constrains outright fabrication by their rivals.",
      "Investigators can therefore reconstruct what happened long before they can establish one prosecutable chain of command."
    ]
  }
] as const satisfies readonly GameGlossaryEntry[];
