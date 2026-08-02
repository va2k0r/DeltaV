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
  },
  {
    id: "terrestrial-society",
    label: "TERRESTRIAL SOCIETY",
    aliases: [
      "TERRESTRIAL SOCIETY",
      "EARTH SOCIETY",
      "CIVILIAN LIFE",
      "DAILY LIFE",
      "LIVING STANDARDS",
      "POST-SCARCITY"
    ],
    short:
      "Earth in 2079 is prosperous, unequal and recognizably capitalist rather than post-scarcity.",
    detail: [
      "Fusion power and artificial intelligence raised output, health and average longevity without abolishing prices, ownership or political conflict.",
      "Most civilians experience the outer-system war through energy bills, insurance costs, tritium futures and occasional interruptions to infrastructure.",
      "There was no singularity and no social collapse. Daily life improved gradually while dependence on a few industrial networks became harder to escape."
    ]
  },
  {
    id: "energy-market",
    label: "ENERGY MARKET",
    aliases: ["ENERGY MARKET", "ENERGY MARKETS", "ENERGY PRICE", "ENERGY PRICES"],
    short:
      "The distant war reaches Earth first as a change in prices, risk and infrastructure reliability.",
    detail: [
      "Tritium contracts price future reactor and transport demand, so a damaged plant or blocked route can move terrestrial markets before facts are public.",
      "Insurers track registered spacecraft, cargo schedules and loss reports because one destroyed vessel can expose an entire logistics chain.",
      "For most civilians the conflict resembles a permanent shipping crisis: understood as a systemic risk, but rarely visible in operational detail."
    ]
  },
  {
    id: "infrastructure-dependence",
    label: "INFRASTRUCTURE DEPENDENCE",
    aliases: [
      "INFRASTRUCTURE DEPENDENCE",
      "CRITICAL INFRASTRUCTURE",
      "INFRASTRUCTURE HOSTAGE",
      "INFRASTRUCTURE HOSTAGES",
      "INDUSTRIAL DEPENDENCE",
      "SUPPLY DEPENDENCE"
    ],
    short:
      "Governments retain legal authority while depending on corporate systems that make enforcement materially possible.",
    detail: [
      "States can tax, arrest and seize terrestrial assets, but the largest combines also supply energy, cloud compute, logistics and defense infrastructure.",
      "Coercion remains possible. It can also disrupt services that governments and civilians cannot replace quickly, making every intervention costly.",
      "This dependence does not grant corporations sovereignty. It narrows the practical choices available to institutions that remain sovereign de jure."
    ]
  },
  {
    id: "de-facto-enforcement",
    label: "DE FACTO ENFORCEMENT",
    aliases: [
      "DE FACTO",
      "DE JURE",
      "DE FACTO ENFORCEMENT",
      "PRACTICAL ENFORCEMENT",
      "PRACTICAL AUTHORITY"
    ],
    short:
      "De jure authority describes the law; de facto enforcement describes whether anyone can act on it in time.",
    detail: [
      "A registered ship remains subject to terrestrial law throughout the Solar System, and crimes committed aboard it remain prosecutable.",
      "Near Saturn or beyond, a government may have no vessel, yard, reactor reserve or logistics chain able to intervene before the situation changes.",
      "The 2079 conflict grows inside that delay. Jurisdiction persists while local command and material access decide what can be enforced immediately."
    ]
  },
  {
    id: "ai-first-combine",
    label: "AI-FIRST COMBINE",
    aliases: [
      "AI-FIRST COMBINE",
      "AI-FIRST COMBINES",
      "INDUSTRIAL COMBINE",
      "INDUSTRIAL COMBINES",
      "CORPORATE NETWORK",
      "CORPORATE NETWORKS"
    ],
    short:
      "An AI-first combine is an Earth-origin industrial network built around compute, energy, logistics and autonomous production.",
    detail: [
      "By 2079 three major combine families dominate outer-system infrastructure, each descended from decades of mergers among terrestrial technology firms.",
      "They are not states or separate civilizations. Their personnel, capital, law and engineering culture remain entangled with Earth.",
      "Shared physics and industrial standards make their fleets closely related; ownership, software, refits and operating doctrine create the differences."
    ]
  },
  {
    id: "distributed-autonomy",
    label: "DISTRIBUTED AUTONOMY",
    aliases: [
      "DISTRIBUTED AUTONOMY",
      "TACTICAL AI",
      "LOCAL AI",
      "LOCAL AUTONOMY",
      "AUTONOMOUS CONTROL"
    ],
    short:
      "Artificial intelligence is distributed through bounded industrial and tactical systems rather than embodied in one ruler.",
    detail: [
      "Local models schedule intercepts, collision avoidance, assembly work, sensor fusion and thousands of small corrections faster than a remote operator could.",
      "Authority remains partitioned among crews, local command and corporate policy because laser communications cannot remove light delay.",
      "There is no singular machine intelligence coordinating the war. Competing systems share methods and training ancestry without sharing control."
    ]
  },
  {
    id: "fleet-scale",
    label: "FLEET SCALE",
    aliases: [
      "FLEET SCALE",
      "DEPLOYED FLEET",
      "DEPLOYED FLEETS",
      "ACTIVE WARSHIPS",
      "COMBAT FLEET"
    ],
    short:
      "Only about fifteen to twenty registered warships are normally deployed across the outer system at once.",
    detail: [
      "A warship concentrates a fusion plant, radiators, certified fuel handling, trained crew and years of scarce yard capacity in one trackable hull.",
      "The fleets are small because infrastructure is thin, not because the ships are prototypes. Every active hull has a supply chain extending toward Earth.",
      "A destroyed ship is a strategic loss and a human death event, even when corporate reporting reduces it to an asset impairment."
    ]
  },
  {
    id: "industrial-standard",
    label: "INDUSTRIAL STANDARD",
    aliases: [
      "INDUSTRIAL STANDARD",
      "INDUSTRIAL STANDARDS",
      "STANDARDIZATION",
      "STANDARDIZED INTERFACE",
      "STANDARDIZED INTERFACES",
      "INTEROPERABILITY"
    ],
    short:
      "Shared interfaces let canisters, hull sections, valves and yard machinery move through one interplanetary logistics system.",
    detail: [
      "The principle is the shipping container applied to spacecraft: fixed dimensions, known loads, certified couplings and machine-readable handling limits.",
      "Roughly eighty to ninety percent of a warship belongs to a common technological family. Yards, revisions, software and refits create most variation.",
      "Standardization makes automated transfer credible while preventing each combine from becoming a visually unrelated science-fiction culture."
    ]
  },
  {
    id: "laser-communications",
    label: "LASER COMMUNICATIONS",
    aliases: [
      "LASER COMMUNICATIONS",
      "LASER COMMUNICATION",
      "LASER LINK",
      "LASER LINKS",
      "OPTICAL LINK",
      "OPTICAL LINKS"
    ],
    short:
      "Narrow optical links move enormous amounts of data but cannot move information faster than light.",
    detail: [
      "A laser terminal trades the broad coverage of radio for bandwidth, directionality and reduced interception outside the beam path.",
      "Pointing requires precise ephemerides and stable tracking, especially when both terminals are moving under continuous acceleration.",
      "High bandwidth supports distributed autonomy. Light delay still leaves crews and local command responsible for events that cannot wait for Earth."
    ]
  },
  {
    id: "navigation-computer",
    label: "NAVIGATION COMPUTER",
    aliases: [
      "NAVIGATION COMPUTER",
      "NAVIGATION COMPUTERS",
      "FLIGHT COMPUTER",
      "FLIGHT COMPUTERS",
      "EPHEMERIS",
      "EPHEMERIDES"
    ],
    short:
      "A navigation computer maintains the measured state and future geometry of every relevant body, ship and transfer.",
    detail: [
      "Its ephemerides combine astronomical models, ranging data and continuous sensor updates rather than treating space as a fixed diagram.",
      "The computer packages a commanded trajectory with correction margins and abort conditions before departure.",
      "Accuracy does not remove uncertainty. It makes the remaining uncertainty explicit enough for local AI and crews to manage."
    ]
  },
  {
    id: "burn-package",
    label: "BURN PACKAGE",
    aliases: [
      "BURN PACKAGE",
      "BURN PACKAGES",
      "TRAJECTORY BUDGET",
      "TRAJECTORY BUDGETS",
      "MANEUVER PACKAGE",
      "MANEUVER PACKAGES"
    ],
    short:
      "A burn package is the certified allocation that turns a planned transfer into an executable trajectory.",
    detail: [
      "It combines tritium, reaction mass, correction margin, thermal limits and a navigation solution rather than describing one instant of thrust.",
      "The allocation is committed before departure because the ship must carry enough margin to complete the ordered transfer safely.",
      "Global delta-v accounting compresses this physical package into one resource; the vessel still executes a sequence of real burns in transit."
    ]
  },
  {
    id: "mass-driver",
    label: "MASS DRIVER",
    aliases: [
      "MASS DRIVER",
      "MASS DRIVERS",
      "ELECTROMAGNETIC LAUNCHER",
      "ELECTROMAGNETIC LAUNCHERS",
      "CARGO LAUNCHER",
      "CARGO LAUNCHERS"
    ],
    short:
      "A mass driver accelerates standardized cargo electrically so the cargo does not need its own launch engine.",
    detail: [
      "Coils along a fixed guideway apply repeated forces to a carrier, spreading acceleration and structural load over the installation's length.",
      "Low-gravity facilities can place canisters and prefabricated assemblies onto predictable capture paths with little expendable reaction mass.",
      "The receiving orbit must still match timing and velocity. A mass driver moves cargo efficiently; it does not make rendezvous automatic."
    ]
  },
  {
    id: "shipyard-spine",
    label: "SHIPYARD SPINE",
    aliases: [
      "SHIPYARD SPINE",
      "SHIPYARD SPINES",
      "ORBITAL TETHER",
      "ORBITAL TETHERS",
      "LAUNCH SPINE",
      "LAUNCH SPINES"
    ],
    short:
      "A shipyard spine connects processing, storage and final assembly across the surface-to-orbit logistics chain.",
    detail: [
      "Its form depends on local gravity: a short tether, elevator segment, mass-driver terminal or a sequence of orbital handling platforms.",
      "The spine moves standardized hull sections, engines, radiators and canisters toward an orbital hub without launching a complete ship.",
      "A yard is a distributed industrial system. The visible orbital structure is only the final interface of a much larger installation."
    ]
  },
  {
    id: "assembly-swarm",
    label: "ASSEMBLY SWARM",
    aliases: [
      "ASSEMBLY SWARM",
      "ASSEMBLY SWARMS",
      "ORBITAL ASSEMBLY",
      "MODULAR ASSEMBLY",
      "PREFABRICATED ASSEMBLY"
    ],
    short:
      "An assembly swarm joins prefabricated spacecraft systems around the working ship that supervises commissioning.",
    detail: [
      "Tugs, manipulators and inspection drones move standardized sections from protected storage to a controlled orbital work envelope.",
      "The yard supplies structure and machinery; the incumbent ship supplies command presence, fuel handling and crew reserve for the new hull.",
      "Commissioning ends after pressure, thermal, software and propulsion tests establish that the assembled vessel can operate independently."
    ]
  },
  {
    id: "forward-service-head",
    label: "FORWARD SERVICE HEAD",
    aliases: ["FORWARD SERVICE HEAD", "SERVICE HEAD"],
    short:
      "The forward service head combines sensing, close defense and cargo capture at the end opposite the fusion torch.",
    detail: [
      "Its capture collar measures an incoming canister, matches relative motion and guides it into machinery without a crewed docking operation.",
      "Sensors and point defense need an unobstructed field, while volatile cargo benefits from distance from the reactor and exhaust path.",
      "The arrangement gives the ship a functional front even though orbital maneuvers may point the hull away from its direction of travel."
    ]
  },
  {
    id: "cold-launch",
    label: "COLD LAUNCH",
    aliases: [
      "COLD LAUNCH",
      "COLD-LAUNCH",
      "MISSILE CELL",
      "MISSILE CELLS",
      "LAUNCH CELL",
      "LAUNCH CELLS"
    ],
    short:
      "A cold launch ejects a missile clear of its cell before the missile starts its own propulsion.",
    detail: [
      "Gas pressure or an electromagnetic impulse separates the weapon from the hull without directing motor exhaust through the storage bay.",
      "The missile stabilizes, confirms a safe vector and ignites only after it has cleared radiators, sensors and neighboring cells.",
      "Canisterized cells simplify handling and replacement while isolating the crew from a damaged or aborted weapon."
    ]
  },
  {
    id: "combat-parking-attitude",
    label: "COMBAT PARKING ATTITUDE",
    aliases: [
      "COMBAT PARKING ATTITUDE",
      "COMBAT PARKING",
      "READY-EGRESS ATTITUDE",
      "DEPARTURE-READY ATTITUDE",
      "PARKING ATTITUDE"
    ],
    short:
      "A ship at a facility may hold an orientation chosen for rapid departure rather than for visual alignment with its orbit.",
    detail: [
      "After cargo capture or docking work, the flight computer can rotate the hull toward a likely egress solution while preserving radiator clearance.",
      "The practice resembles reverse parking: the expensive maneuver is prepared before an emergency makes time scarce.",
      "Attitude is an operating choice, not a claim that the ship is stationary or that its bow always points along its trajectory."
    ]
  },
  {
    id: "life-extension",
    label: "LIFE EXTENSION",
    aliases: ["LIFE EXTENSION", "LONGEVITY", "LONGER LIVES", "AVERAGE LIFESPAN"],
    short:
      "Medical automation and abundant energy continue the long rise in healthy terrestrial lifespan.",
    detail: [
      "The change is incremental rather than immortal: earlier diagnosis, tailored treatment and safer work add years across successive generations.",
      "Access remains unequal, so longevity is another measure of wealth and infrastructure rather than proof of a post-scarcity society."
    ]
  },
  {
    id: "local-blackout",
    label: "LOCAL BLACKOUT",
    aliases: ["LOCAL BLACKOUT", "LOCAL BLACKOUTS", "POWER INTERRUPTION", "POWER INTERRUPTIONS"],
    short:
      "A local blackout is the most immediate civilian symptom of strain in the fusion economy.",
    detail: [
      "Grid operators isolate districts when generation, compute demand or contracted tritium deliveries fall outside reserve margins.",
      "Most interruptions are short and regional, but their timing can reveal an outer-system loss before any corporate statement explains it."
    ]
  },
  {
    id: "tritium-futures",
    label: "TRITIUM FUTURES",
    aliases: ["TRITIUM FUTURES", "TRITIUM FUTURE", "FUTURES CONTRACT", "FUTURES CONTRACTS"],
    short:
      "Tritium futures price delivery obligations months or years before certified fuel reaches a reactor or ship.",
    detail: [
      "Contracts react to damaged plants, delayed cargo and inaccessible facilities because each event changes the probability of future delivery.",
      "The market can move on telescope data or registry notices long before the public learns which fleet caused the disruption."
    ]
  },
  {
    id: "war-risk-insurance",
    label: "WAR-RISK INSURANCE",
    aliases: ["WAR-RISK INSURANCE", "WAR RISK INSURANCE", "INSURANCE MARKET", "HULL INSURANCE"],
    short:
      "War-risk insurance covers losses that ordinary orbital transport policies exclude once a route becomes contested.",
    detail: [
      "Underwriters combine registry history, telemetry gaps, declared cargo and known hostile action to price each voyage.",
      "A single attributable attack can reclassify an entire planetary system and make otherwise profitable transport commercially impossible."
    ]
  },
  {
    id: "orbital-surveillance",
    label: "ORBITAL SURVEILLANCE",
    aliases: [
      "ORBITAL SURVEILLANCE",
      "SPACE SURVEILLANCE",
      "TRACKING NETWORK",
      "TRACKING NETWORKS"
    ],
    short:
      "State and commercial sensors can observe major transfers, engine burns and large explosions across the Solar System.",
    detail: [
      "Surveillance establishes that something moved or detonated, but distant geometry rarely reveals the full command context behind it.",
      "Observation is therefore abundant while timely enforcement and reliable attribution remain scarce."
    ]
  },
  {
    id: "commercial-observatory",
    label: "COMMERCIAL OBSERVATORY",
    aliases: [
      "COMMERCIAL OBSERVATORY",
      "COMMERCIAL OBSERVATORIES",
      "INDEPENDENT OBSERVATORY",
      "AMATEUR TELESCOPE"
    ],
    short:
      "Independent observatories can confirm bright events and unusual traffic without possessing military telemetry.",
    detail: [
      "An amateur instrument may record a distant flash, while professional arrays estimate its position, spectrum and approximate energy.",
      "Neither view automatically identifies the vessel, weapon, order or legal justification involved."
    ]
  },
  {
    id: "corporate-telemetry",
    label: "CORPORATE TELEMETRY",
    aliases: [
      "CORPORATE TELEMETRY",
      "PRIVATE TELEMETRY",
      "OPERATIONAL TELEMETRY",
      "TELEMETRY FEED"
    ],
    short:
      "The most useful operational data is produced by the same corporations whose conduct it might expose.",
    detail: [
      "High-rate sensor records, guidance states and internal timestamps remain inside authenticated fleet networks rather than public observatories.",
      "Released excerpts constrain fabrication but can omit the command context needed to decide responsibility."
    ]
  },
  {
    id: "embedded-reporting",
    label: "EMBEDDED REPORTING",
    aliases: [
      "EMBEDDED REPORTING",
      "EMBEDDED REPORTER",
      "EMBEDDED REPORTERS",
      "WAR CORRESPONDENT",
      "WAR CORRESPONDENTS"
    ],
    short:
      "There are no civilian reporting teams travelling with meaningful outer-system combat forces.",
    detail: [
      "Distance, life support, launch access and corporate control make an independent berth aboard a warship exceptionally unlikely.",
      "The public receives delayed statements, commercial imagery and expert reconstruction rather than continuous reporting from the front."
    ]
  },
  {
    id: "public-narrative",
    label: "PUBLIC NARRATIVE",
    aliases: [
      "PUBLIC NARRATIVE",
      "PUBLIC ACCOUNT",
      "PUBLIC ACCOUNTS",
      "OFFICIAL ACCOUNT",
      "OFFICIAL ACCOUNTS"
    ],
    short:
      "Public language describes strategic violence through legal, industrial and financial consequences.",
    detail: [
      "Governments discuss inquiries and jurisdiction; corporations discuss service continuity, asset loss and protection of personnel.",
      "The event is not secret, but its order of battle and chain of command rarely become common knowledge."
    ]
  },
  {
    id: "industrial-incident",
    label: "INDUSTRIAL INCIDENT",
    aliases: [
      "INDUSTRIAL INCIDENT",
      "INDUSTRIAL INCIDENTS",
      "SERVICE DISRUPTION",
      "SERVICE DISRUPTIONS"
    ],
    short:
      "Industrial incident is a deliberately narrow description for an event whose military character remains disputed.",
    detail: [
      "The phrase can cover sabotage, collision, contaminated cargo or weapon damage without conceding hostile intent.",
      "It preserves insurance and legal options while investigators argue over attribution."
    ]
  },
  {
    id: "private-arbitration",
    label: "PRIVATE ARBITRATION",
    aliases: [
      "PRIVATE ARBITRATION",
      "COMMERCIAL ARBITRATION",
      "ARBITRATION PANEL",
      "ARBITRATION PANELS"
    ],
    short:
      "Private arbitration resolves contracts and compensation when public courts cannot produce a timely operational remedy.",
    detail: [
      "Panels can assign liability, freeze payments and recognize evidence under agreements shared by governments and combines.",
      "They cannot seize a distant ship or stop a local commander before the next transfer window closes."
    ]
  },
  {
    id: "terrestrial-asset",
    label: "TERRESTRIAL ASSET",
    aliases: ["TERRESTRIAL ASSET", "TERRESTRIAL ASSETS", "EARTHSIDE ASSET", "EARTHSIDE ASSETS"],
    short:
      "A terrestrial asset is property a government can physically inspect, regulate or seize without interplanetary deployment.",
    detail: [
      "Offices, accounts, data centers and launch contracts remain exposed to ordinary state power even when a fleet is not.",
      "Their value also makes seizure dangerous when the same systems supply critical public infrastructure."
    ]
  },
  {
    id: "critical-service",
    label: "CRITICAL SERVICE",
    aliases: [
      "CRITICAL SERVICE",
      "CRITICAL SERVICES",
      "SERVICE CONTINUITY",
      "INFRASTRUCTURE SERVICE"
    ],
    short:
      "Critical services are corporate systems whose interruption would immediately damage civilian or governmental operations.",
    detail: [
      "Fusion dispatch, cloud compute, payment clearing, orbital logistics and defense support can all sit inside one combine's contracts.",
      "Dependence on those services turns otherwise ordinary sanctions into infrastructure risk."
    ]
  },
  {
    id: "chain-of-command",
    label: "CHAIN OF COMMAND",
    aliases: ["CHAIN OF COMMAND", "COMMAND CHAIN", "COMMAND CHAINS", "PROSECUTABLE CHAIN"],
    short:
      "A chain of command links a physical action to the people and systems that possessed authority to order it.",
    detail: [
      "Telemetry may prove which weapon fired while leaving open whether a crew, local model or remote director authorized release.",
      "A prosecutable chain requires authenticated delegation records as well as evidence from the engagement."
    ]
  },
  {
    id: "cryptographic-authority",
    label: "CRYPTOGRAPHIC AUTHORITY",
    aliases: [
      "CRYPTOGRAPHIC AUTHORITY",
      "AUTHORITY KEY",
      "AUTHORITY KEYS",
      "DELEGATION KEY",
      "DELEGATION KEYS"
    ],
    short:
      "Cryptographic authority lets a distant organization delegate bounded command powers without a live connection.",
    detail: [
      "Keys define which vessel, weapon and time window a commander may control, and every use leaves an authenticated record.",
      "Compromise can permit an action, but it does not erase the registry trail created by the key."
    ]
  },
  {
    id: "human-release-authority",
    label: "HUMAN RELEASE AUTHORITY",
    aliases: [
      "HUMAN RELEASE AUTHORITY",
      "LETHAL RELEASE",
      "WEAPON RELEASE AUTHORITY",
      "WEAPONS RELEASE AUTHORITY"
    ],
    short:
      "Lethal release remains a human authorization even when artificial intelligence builds the firing solution.",
    detail: [
      "Local models track, predict and recommend because light delay prevents Earth from supervising the final seconds.",
      "The human decision creates legal responsibility without requiring a person to steer the weapon manually."
    ]
  },
  {
    id: "rotating-habitat",
    label: "ROTATING HABITAT",
    aliases: ["ROTATING HABITAT", "HABITAT RING", "CREW RING", "ROTATING RING"],
    short:
      "A rotating habitat gives the crew a small region of sustained apparent gravity during long deployment.",
    detail: [
      "The ring turns around the ship's axis while command, storage and propulsion systems remain on the central spine.",
      "Its diameter and rotation rate balance useful gravity against motion sickness, bearings and structural mass."
    ]
  },
  {
    id: "artificial-gravity",
    label: "ARTIFICIAL GRAVITY",
    aliases: ["ARTIFICIAL GRAVITY", "SPIN GRAVITY", "APPARENT GRAVITY", "CENTRIFUGAL GRAVITY"],
    short:
      "Artificial gravity aboard a ship is produced by rotation, not by an unknown field technology.",
    detail: [
      "Crew moving with the habitat floor experience an outward apparent force that substitutes for weight.",
      "The central axis remains close to weightless, so cargo transfer and machinery can use a different environment from habitation."
    ]
  },
  {
    id: "counter-rotation",
    label: "COUNTER-ROTATION",
    aliases: ["COUNTER-ROTATION", "COUNTER ROTATION", "COUNTER-ROTATING", "COUNTER ROTATING"],
    short:
      "Counter-rotation prevents the habitat ring from slowly turning the rest of the spacecraft in the opposite direction.",
    detail: [
      "A separate rotating mass can absorb angular momentum while the central hull maintains a stable pointing reference.",
      "Its speed depends on moment of inertia rather than simply matching the habitat ring turn for turn."
    ]
  },
  {
    id: "folding-radiator",
    label: "FOLDING RADIATOR",
    aliases: ["FOLDING RADIATOR", "FOLDING RADIATORS", "RETRACTED RADIATOR", "RETRACTED RADIATORS"],
    short:
      "A folding radiator trades exposed cooling area for protection and clearance during demanding maneuvers.",
    detail: [
      "Deep segmented panels provide large emitting area while presenting a narrow profile when drawn toward the central spine.",
      "Retraction reduces vulnerability and plume risk, but stored heat limits how long the ship can remain in that configuration."
    ]
  },
  {
    id: "thermal-configuration",
    label: "THERMAL CONFIGURATION",
    aliases: [
      "THERMAL CONFIGURATION",
      "THERMAL CONFIGURATIONS",
      "RADIATOR ATTITUDE",
      "RADIATOR ATTITUDES"
    ],
    short:
      "Thermal configuration is the orientation of radiators, hull and heat flow for the ship's current operating state.",
    detail: [
      "Cruise, cargo capture and high-thrust operation impose different solar exposure, plume clearance and cooling demands.",
      "Slow or discrete radiator adjustments preserve pointing stability while keeping heat rejection within limits."
    ]
  },
  {
    id: "plume-clearance",
    label: "PLUME CLEARANCE",
    aliases: ["PLUME CLEARANCE", "EXHAUST CLEARANCE", "PLUME PATH", "EXHAUST PATH"],
    short:
      "Plume clearance keeps radiators, cargo and structures outside the fusion torch's exhaust corridor.",
    detail: [
      "Anything placed behind the drive risks heating, erosion or direct acceleration by high-energy exhaust products.",
      "The rule shapes docking attitude, radiator placement and the order in which external hardware is deployed."
    ]
  },
  {
    id: "propulsion-spine",
    label: "PROPULSION SPINE",
    aliases: ["PROPULSION SPINE", "ENGINE SPINE", "THRUST SPINE", "THRUST STRUCTURE"],
    short:
      "The propulsion spine carries thrust from the fusion drive through every module attached ahead of it.",
    detail: [
      "The engine is the primary structural load source rather than a small component added to an otherwise complete ship.",
      "Habitats, weapons, tanks and service hardware are arranged around the path that transmits that load."
    ]
  },
  {
    id: "reactor-shadow",
    label: "REACTOR SHADOW",
    aliases: ["REACTOR SHADOW", "SHADOW SHIELD", "SHADOW SHIELDING", "RADIATION SHADOW"],
    short:
      "A shadow shield protects a narrow inhabited region instead of surrounding the reactor with equal shielding in every direction.",
    detail: [
      "Dense material sits between the reactor and crew, while distance along the propulsion spine further reduces exposure.",
      "The protected cone constrains where habitats and command electronics can be mounted."
    ]
  },
  {
    id: "human-supervision",
    label: "HUMAN SUPERVISION",
    aliases: ["HUMAN SUPERVISION", "HUMAN SUPERVISOR", "HUMAN SUPERVISORS", "CREW SUPERVISION"],
    short:
      "People supervise autonomous industry by approving goals, exceptions and release conditions rather than moving every part.",
    detail: [
      "Robotic systems perform routine handling, alignment and inspection faster than a suited worker could.",
      "Human attention remains valuable when damaged hardware, ambiguous evidence or legal authority falls outside the expected procedure."
    ]
  },
  {
    id: "orbital-tug",
    label: "ORBITAL TUG",
    aliases: ["ORBITAL TUG", "ORBITAL TUGS", "ASSEMBLY TUG", "ASSEMBLY TUGS"],
    short:
      "An orbital tug moves heavy modules through the final kilometers of a yard without giving each module full propulsion.",
    detail: [
      "Tugs use standardized grapples and low-thrust corrections inside a controlled assembly volume.",
      "They remain industrial equipment rather than independent warships, even when their sensors and autonomy are sophisticated."
    ]
  },
  {
    id: "inspection-drone",
    label: "INSPECTION DRONE",
    aliases: ["INSPECTION DRONE", "INSPECTION DRONES", "YARD DRONE", "YARD DRONES"],
    short:
      "Inspection drones verify joints, pressure boundaries and alignment before a new hull is commissioned.",
    detail: [
      "Optical, ultrasonic and thermal sensors compare the assembly with certified tolerances while work continues nearby.",
      "Their records become part of the vessel's commissioning file and later maintenance history."
    ]
  },
  {
    id: "work-envelope",
    label: "WORK ENVELOPE",
    aliases: ["WORK ENVELOPE", "WORK ENVELOPES", "ASSEMBLY VOLUME", "ASSEMBLY VOLUMES"],
    short:
      "A work envelope is the controlled volume around a ship where tugs, drones and loose assemblies may safely operate.",
    detail: [
      "Relative velocity, plume clearance and collision limits are tighter inside it than in ordinary orbital traffic.",
      "The worker ship provides the stable reference used to coordinate the surrounding assembly swarm."
    ]
  },
  {
    id: "certified-coupling",
    label: "CERTIFIED COUPLING",
    aliases: [
      "CERTIFIED COUPLING",
      "CERTIFIED COUPLINGS",
      "STANDARD COUPLING",
      "STANDARD COUPLINGS"
    ],
    short:
      "A certified coupling joins fluid, power, data and structure through an interface with known limits.",
    detail: [
      "Yards and ships can handle unfamiliar cargo because load cases, seals and connector geometry travel with the standard.",
      "Certification matters as much as physical fit: a connection outside its documented history may be rejected automatically."
    ]
  },
  {
    id: "machine-readable-limit",
    label: "MACHINE-READABLE LIMIT",
    aliases: [
      "MACHINE-READABLE LIMIT",
      "MACHINE-READABLE LIMITS",
      "HANDLING LIMIT",
      "HANDLING LIMITS"
    ],
    short:
      "Machine-readable limits tell autonomous equipment how an object may be accelerated, heated, clamped and stored.",
    detail: [
      "The data accompanies the physical cargo and includes mass distribution, pressure state, temperature and approved interfaces.",
      "A handling system can reject an unsafe instruction before a remote human would see the telemetry."
    ]
  },
  {
    id: "refit",
    label: "REFIT",
    aliases: ["REFIT", "REFITS", "REFITTED", "FIELD REFIT", "FIELD REFITS"],
    short:
      "A refit replaces compatible systems without changing the vessel's basic role or shared hull architecture.",
    detail: [
      "Launcher caps, sensors, radiator panels, software and protective plating can vary across a ship's service life.",
      "The result gives individual hulls history without implying a new operational class."
    ]
  },
  {
    id: "yard-revision",
    label: "YARD REVISION",
    aliases: ["YARD REVISION", "YARD REVISIONS", "BUILD REVISION", "BUILD REVISIONS"],
    short: "A yard revision records local changes made while building a shared spacecraft design.",
    detail: [
      "Available tooling, supplier batches and accumulated inspection data produce small differences between facilities.",
      "Revision records preserve interoperability while explaining why two nominally identical hulls are not identical at close range."
    ]
  },
  {
    id: "common-hull-family",
    label: "COMMON HULL FAMILY",
    aliases: ["COMMON HULL FAMILY", "COMMON HULL", "SHARED HULL", "SHARED ARCHITECTURE"],
    short:
      "The combines build one recognizable family of warship rather than unrelated fleets of specialized classes.",
    detail: [
      "A forward service head, internal weapons, crew section, thermal bus and fusion drive remain legible across every hull.",
      "Local optimization changes details while the strategic capabilities remain the same."
    ]
  },
  {
    id: "corporate-marking",
    label: "CORPORATE MARKING",
    aliases: ["CORPORATE MARKING", "CORPORATE MARKINGS", "HULL MARKING", "HULL MARKINGS", "LIVERY"],
    short:
      "Markings identify owner, registry and service history without turning a ship into a separate technological culture.",
    detail: [
      "Beacon patterns, warning bands, serial blocks and restrained faction color remain visible after multiple refits.",
      "At long range the hull family reads first; individual ownership emerges only under closer inspection."
    ]
  },
  {
    id: "micro-canister",
    label: "MICRO-CANISTER",
    aliases: ["MICRO-CANISTER", "MICRO-CANISTERS", "MICRO CANISTER", "MICRO CANISTERS"],
    short:
      "A micro-canister divides a fuel delivery into many standardized physical packets instead of one large transfer vehicle.",
    detail: [
      "Continuous automated manufacture and launch make packet frequency easier to vary than the size of a single cargo.",
      "Failure of one packet loses little material and does not stop the rest of the delivery sequence."
    ]
  },
  {
    id: "cryogenic-cartridge",
    label: "CRYOGENIC CARTRIDGE",
    aliases: ["CRYOGENIC CARTRIDGE", "CRYOGENIC CARTRIDGES", "FUEL CARTRIDGE", "FUEL CARTRIDGES"],
    short:
      "A cryogenic cartridge keeps hydrogen isotopes in a sealed thermal system suitable for automated transport.",
    detail: [
      "The transported material may be liquid feedstock, pellets or smaller reactor-ready containers inside the outer shell.",
      "Crews handle the certified cartridge rather than exposing or manually transferring tritium."
    ]
  },
  {
    id: "pressure-vessel",
    label: "PRESSURE VESSEL",
    aliases: ["PRESSURE VESSEL", "PRESSURE VESSELS", "SPHERICAL TANK", "SPHERICAL TANKS"],
    short:
      "A spherical pressure vessel encloses the actual fuel inside the more readable external cargo frame.",
    detail: [
      "A sphere distributes internal pressure efficiently and minimizes structural material for a given volume.",
      "The surrounding standard container supplies attachment points, shielding and handling geometry that the tank itself lacks."
    ]
  },
  {
    id: "hexagonal-end-cap",
    label: "HEXAGONAL END CAP",
    aliases: ["HEXAGONAL END CAP", "HEXAGONAL END CAPS", "HEX END CAP", "HEX END CAPS"],
    short:
      "Hexagonal end caps give a cylindrical canister repeatable faces for guides, latches, valves and connectors.",
    detail: [
      "The geometry prevents rolling in storage and lets automated machinery determine orientation from silhouette alone.",
      "Common end caps also make fuel cargo visually related to ship modules and yard equipment."
    ]
  },
  {
    id: "equatorial-launch-network",
    label: "EQUATORIAL LAUNCH NETWORK",
    aliases: [
      "EQUATORIAL LAUNCH NETWORK",
      "EQUATORIAL LAUNCHER",
      "EQUATORIAL LAUNCHERS",
      "LAUNCH NETWORK"
    ],
    short:
      "An equatorial launch network places processed canisters into low orbit from many distributed surface sites.",
    detail: [
      "Rotation and predictable geometry make the equatorial belt useful for repeated automated cargo launches.",
      "Distributed sites maintain cadence and coverage when one launcher is unavailable."
    ]
  },
  {
    id: "surface-industrial-grid",
    label: "SURFACE INDUSTRIAL GRID",
    aliases: ["SURFACE INDUSTRIAL GRID", "INDUSTRIAL GRID", "SURFACE GRID", "PROCESSING GRID"],
    short:
      "A surface industrial grid connects extraction, breeding, storage, power and launch equipment across a facility.",
    detail: [
      "Most branches follow efficient transport corridors while isolated plants extend toward local deposits, cooling sites or communications relays.",
      "Only a small fraction of the grid is crewed; autonomous maintenance keeps the distributed system operating."
    ]
  },
  {
    id: "low-equatorial-orbit",
    label: "LOW EQUATORIAL ORBIT",
    aliases: ["LOW EQUATORIAL ORBIT", "LOW EQUATORIAL ORBITS", "CARGO ORBIT", "CARGO ORBITS"],
    short:
      "Canisters coast in a low equatorial orbit until a working ship crosses the planned capture region.",
    detail: [
      "They are physical cargo already moving around the body, not static markers or objects that chase a vessel from the surface.",
      "Slightly varied altitude and spacing prevent congestion while keeping every path predictable."
    ]
  },
  {
    id: "capture-window",
    label: "CAPTURE WINDOW",
    aliases: ["CAPTURE WINDOW", "CAPTURE WINDOWS", "PICKUP WINDOW", "PICKUP WINDOWS"],
    short:
      "A capture window is the interval when ship and cargo can meet with acceptable relative velocity.",
    detail: [
      "Launch timing is calculated backward from the ship's measured path rather than aimed at its present position.",
      "Missing the window sends the canister into a safe coast or disposal path instead of forcing a hazardous interception."
    ]
  },
  {
    id: "capture-path",
    label: "CAPTURE PATH",
    aliases: ["CAPTURE PATH", "CAPTURE PATHS", "PICKUP TRAJECTORY", "PICKUP TRAJECTORIES"],
    short:
      "A capture path brings cargo through the service head without crossing the hull, radiator field or exhaust corridor.",
    detail: [
      "Navigation computers reject launches that would intersect the ship outside the approved pickup geometry.",
      "Only the final meters require active guidance; most of the approach is ballistic and known in advance."
    ]
  },
  {
    id: "launch-cadence",
    label: "LAUNCH CADENCE",
    aliases: ["LAUNCH CADENCE", "LAUNCH CADENCES", "PACKET CADENCE", "PACKET FREQUENCY"],
    short:
      "Launch cadence controls delivery rate by changing how often standard canisters enter the cargo orbit.",
    detail: [
      "Small timing variations prevent traffic from becoming one fragile train while preserving the planned capture window.",
      "A facility can reduce throughput immediately without redesigning the packet or launcher."
    ]
  },
  {
    id: "loss-tolerance",
    label: "LOSS TOLERANCE",
    aliases: ["LOSS TOLERANCE", "PACKET LOSS", "CANISTER LOSS", "DELIVERY REDUNDANCY"],
    short:
      "Packetized delivery tolerates individual launch, guidance or capture failures without losing an entire shipment.",
    detail: [
      "Each canister contains a small enough quantity that disposal is preferable to an unsafe recovery attempt.",
      "Reserve packets and adjustable cadence let the industrial chain meet its target despite routine losses."
    ]
  },
  {
    id: "capture-collar",
    label: "CAPTURE COLLAR",
    aliases: ["CAPTURE COLLAR", "CAPTURE COLLARS", "CONTACTLESS CAPTURE", "CAPTURE PORT"],
    short:
      "A capture collar receives moving cargo without requiring the ship to dock with a tanker or station.",
    detail: [
      "Sensors measure the approaching canister and electromagnetic guides remove the last relative motion inside the collar.",
      "The packet then passes into shielded fuel-handling machinery while the ship continues along its working trajectory."
    ]
  },
  {
    id: "fuel-scoop",
    label: "FUEL SCOOP",
    aliases: ["FUEL SCOOP", "FUEL SCOOPING", "ORBITAL SCOOP", "ORBITAL SCOOPING"],
    short:
      "Fuel scoop describes the coordinated pass that collects prepared canisters from their cargo orbit.",
    detail: [
      "The ship does not gather raw material from space; the tritium plant has already processed, packaged and launched it.",
      "The action increases the faction reserve because the working ship is serving an industrial chain, not filling a private onboard tank."
    ]
  },
  {
    id: "orbital-hub",
    label: "ORBITAL HUB",
    aliases: ["ORBITAL HUB", "ORBITAL HUBS", "CONSTRUCTION HUB", "CONSTRUCTION HUBS"],
    short:
      "An orbital hub receives material from the shipyard spine and organizes it for final assembly in free space.",
    detail: [
      "Storage, traffic control and heavy handling remain near the tether while the worker ship occupies a separate work envelope.",
      "The hub belongs to the surface-orbit industrial system rather than orbiting as an independent factory."
    ]
  },
  {
    id: "worker-ship",
    label: "WORKER SHIP",
    aliases: ["WORKER SHIP", "WORKING SHIP", "YARD WORKER", "ASSEMBLY COORDINATOR"],
    short:
      "A worker ship provides command presence, fuel handling and a stable reference for orbital construction.",
    detail: [
      "The heavy facility supplies stored sections and machinery, while the ship coordinates the assembly swarm around itself.",
      "Its crew reserve also supplies the initial complement needed to commission the completed hull."
    ]
  },
  {
    id: "protected-stock",
    label: "PROTECTED STOCK",
    aliases: ["PROTECTED STOCK", "PROTECTED STOCKS", "YARD STOCK", "YARD STOCKS"],
    short:
      "Protected stock consists of major spacecraft assemblies stored below ground or inside hardened yard infrastructure.",
    detail: [
      "Engines, radiators, pressure sections and structural members can wait there without presenting a complete target in orbit.",
      "They become an active warship only after a worker ship brings them into an assembly and commissioning sequence."
    ]
  },
  {
    id: "prefabricated-section",
    label: "PREFABRICATED SECTION",
    aliases: ["PREFABRICATED SECTION", "PREFABRICATED SECTIONS", "HULL SECTION", "HULL SECTIONS"],
    short:
      "A prefabricated section is a tested major assembly designed to travel through standard yard interfaces.",
    detail: [
      "Pressure modules, thermal buses and drive structures arrive with certified connection points instead of being fabricated entirely in open orbit.",
      "Final assembly joins and verifies those sections rather than constructing a vessel from raw material beside the worker ship."
    ]
  },
  {
    id: "internal-magazine",
    label: "INTERNAL MAGAZINE",
    aliases: ["INTERNAL MAGAZINE", "INTERNAL MAGAZINES", "WEAPONS MAGAZINE", "WEAPONS MAGAZINES"],
    short:
      "An internal magazine keeps missiles behind the hull's shielding and thermal control until launch.",
    detail: [
      "External weapons would remain exposed to debris, radiation, heat and accidental plume interaction throughout deployment.",
      "Canisterized storage isolates individual rounds and presents only a hatch or safety cap to space."
    ]
  },
  {
    id: "safety-cap",
    label: "SAFETY CAP",
    aliases: ["SAFETY CAP", "SAFETY CAPS", "LAUNCHER CAP", "LAUNCHER CAPS", "ORDNANCE CAP"],
    short:
      "A safety cap closes an external launch cell and marks the boundary between stored ordnance and the ship's exterior.",
    detail: [
      "The cap protects seals and mechanisms until a cold launch sequence opens the cell.",
      "Warning color, serial markings and arming state identify the launcher without displaying the missile itself."
    ]
  },
  {
    id: "registered-weapon",
    label: "REGISTERED WEAPON",
    aliases: ["REGISTERED WEAPON", "REGISTERED WEAPONS", "WEAPON REGISTRY", "WEAPONS REGISTRY"],
    short:
      "A registered weapon carries an identity linked to its vessel, owner, maintenance record and release authority.",
    detail: [
      "Civil transport law made authenticated ordnance records routine before those weapons were used against another registered vessel.",
      "The Saturn incident became historically distinct because both the attacker and target remained legible in that system."
    ]
  },
  {
    id: "telemetry-trail",
    label: "TELEMETRY TRAIL",
    aliases: ["TELEMETRY TRAIL", "TELEMETRY TRAILS", "AUTHENTICATED TELEMETRY", "SENSOR TRAIL"],
    short:
      "A telemetry trail is the surviving sequence of measurements and authenticated events around an engagement.",
    detail: [
      "Burn signatures, optical tracks, registry keys and weapon timing can remain available after the physical ship is destroyed.",
      "The trail reconstructs what occurred more readily than why a particular authority ordered it."
    ]
  },
  {
    id: "interplanetary-firing-solution",
    label: "INTERPLANETARY FIRING SOLUTION",
    aliases: ["INTERPLANETARY FIRING SOLUTION", "LONG-RANGE WEAPON SOLUTION"],
    short:
      "A firing solution predicts where target and weapon can meet after light delay, launch and terminal correction.",
    detail: [
      "It combines ephemerides, measured acceleration, sensor uncertainty and the target's remaining maneuver space.",
      "Leaving the expected path can break the solution even after the weapon has launched."
    ]
  },
  {
    id: "terminal-guidance",
    label: "TERMINAL GUIDANCE",
    aliases: ["TERMINAL GUIDANCE", "TERMINAL PHASE", "TERMINAL CORRECTION", "TERMINAL CORRECTIONS"],
    short:
      "Terminal guidance converts a long predicted intercept into the final local corrections before impact.",
    detail: [
      "Onboard sensors update the target track without waiting for a remote command across interplanetary distance.",
      "The remaining correction budget is limited, so a sufficiently large late maneuver can move the ship outside the reachable volume."
    ]
  },
  {
    id: "predictive-track",
    label: "PREDICTIVE TRACK",
    aliases: ["PREDICTIVE TRACK", "PREDICTIVE TRACKS", "TARGET TRACK", "TARGET TRACKS"],
    short:
      "A predictive track extends measured motion into a probability region rather than one perfect future point.",
    detail: [
      "Every new observation narrows or shifts the region while known drive performance bounds the target's possible acceleration.",
      "Point defense and missile guidance both act on that changing estimate."
    ]
  },
  {
    id: "closed-loop-spotting",
    label: "CLOSED-LOOP SPOTTING",
    aliases: [
      "CLOSED-LOOP SPOTTING",
      "CLOSED LOOP SPOTTING",
      "FIRE CORRECTION LOOP",
      "FIRE CORRECTION"
    ],
    short:
      "Closed-loop spotting observes outgoing defensive rounds and corrects later fire toward the tracked intercept.",
    detail: [
      "The turret does not rely on one perfect aim point; it measures both target and tracer error while the burst develops.",
      "Spiral zeroing is the visible consequence of that correction process rather than decorative saturation."
    ]
  },
  {
    id: "intercept-volume",
    label: "INTERCEPT VOLUME",
    aliases: ["INTERCEPT VOLUME", "INTERCEPT VOLUMES", "UNCERTAINTY VOLUME", "UNCERTAINTY CONE"],
    short:
      "An intercept volume contains the positions a threatening weapon may occupy when defensive fire reaches it.",
    detail: [
      "Sensor error, maneuver limits and projectile travel time give the volume width even in a deterministic physical system.",
      "Point defense searches and then tightens fire through that region as the predictive track improves."
    ]
  },
  {
    id: "kill-assessment",
    label: "KILL ASSESSMENT",
    aliases: ["KILL ASSESSMENT", "KILL ASSESSMENTS", "INTERCEPT ASSESSMENT", "DAMAGE ASSESSMENT"],
    short:
      "Kill assessment decides whether an intercepted weapon remains capable of reaching or damaging the ship.",
    detail: [
      "A flash or broken track is insufficient if guidance, warhead or dangerous fragments may continue through the defense volume.",
      "Sensors maintain observation until the system can release the next defensive burst or declare the approach safe."
    ]
  },
  {
    id: "dt-fusion",
    label: "D-T FUSION",
    aliases: ["D-T FUSION", "DEUTERIUM-TRITIUM FUSION"],
    short:
      "Deuterium-tritium fusion combines the easiest practical fusion reaction with a demanding neutron economy.",
    detail: [
      "Deuterium and tritium fuse into helium while releasing a neutron that carries most of the reaction energy.",
      "The reaction's accessibility made it commercially useful before cleaner but more difficult fusion cycles."
    ]
  },
  {
    id: "magnetic-nozzle",
    label: "MAGNETIC NOZZLE",
    aliases: ["MAGNETIC NOZZLE", "MAGNETIC EXHAUST NOZZLE"],
    short:
      "A magnetic nozzle directs hot ionized exhaust without placing a solid chamber in the full flow.",
    detail: [
      "Superconducting fields shape and accelerate plasma that would destroy an ordinary material nozzle.",
      "Field strength, cooling and plume stability limit how much reactor power becomes controlled thrust."
    ]
  },
  {
    id: "hydrogen-propellant",
    label: "HYDROGEN PROPELLANT",
    aliases: ["HYDROGEN PROPELLANT", "BULK HYDROGEN"],
    short:
      "Bulk hydrogen supplies the reaction mass that turns fusion energy into sustained momentum.",
    detail: [
      "Tritium releases energy but contributes little exhaust mass, so the drive heats a much larger hydrogen flow.",
      "Storage volume and boil-off make propellant logistics distinct from the smaller tritium fuel inventory."
    ]
  },
  {
    id: "firm-power",
    label: "FIRM POWER",
    aliases: ["FIRM POWER", "FIRM GENERATION"],
    short:
      "Firm power is electricity a station can guarantee continuously rather than only under favorable conditions.",
    detail: [
      "Fusion plants sell dependable output to grids, server farms and industrial campuses with tightly scheduled demand.",
      "A reactor that cannot maintain cooling or fuel replacement does not count as firm capacity."
    ]
  },
  {
    id: "neutron-damage",
    label: "NEUTRON DAMAGE",
    aliases: ["NEUTRON DAMAGE", "NEUTRON EMBRITTLEMENT"],
    short:
      "Fast neutrons displace atoms, activate components and gradually change the properties of reactor materials.",
    detail: [
      "Damage accumulates even when temperature and mechanical load remain within their design limits.",
      "Replaceable surfaces and monitored joints turn inevitable degradation into scheduled maintenance."
    ]
  },
  {
    id: "neutron-shielding",
    label: "NEUTRON SHIELDING",
    aliases: ["NEUTRON SHIELDING", "NEUTRON SHIELD"],
    short:
      "Neutron shielding reduces radiation exposure to crew, magnets and sensitive electronics near a fusion source.",
    detail: [
      "Hydrogen-rich and dense layers slow and absorb neutrons through different stages of the shield.",
      "Mass encourages narrow shadow shielding and long separation instead of equal protection in every direction."
    ]
  },
  {
    id: "closed-tritium-cycle",
    label: "CLOSED TRITIUM CYCLE",
    aliases: ["CLOSED TRITIUM CYCLE", "TRITIUM CLOSURE"],
    short:
      "A closed tritium cycle breeds enough replacement fuel to sustain the reactors that consume it.",
    detail: [
      "Processing systems recover unburned fuel and separate newly bred tritium from the reactor blanket.",
      "Only production above internal consumption becomes surplus available to ships or new reactors."
    ]
  },
  {
    id: "breeder-blanket",
    label: "BREEDER BLANKET",
    aliases: ["BREEDER BLANKET", "BREEDER BLANKETS"],
    short:
      "A breeder blanket surrounds a fusion chamber with lithium-bearing material that captures escaping neutrons.",
    detail: [
      "Neutron reactions in lithium-6 create tritium that processing equipment removes from the blanket.",
      "The same component absorbs heat and radiation, so breeding performance cannot be separated from cooling and maintenance."
    ]
  },
  {
    id: "tritium-half-life",
    label: "TRITIUM HALF-LIFE",
    aliases: ["TRITIUM HALF-LIFE", "12.3-YEAR HALF-LIFE"],
    short:
      "Tritium has a half-life of about 12.3 years, making long storage an accounting loss rather than permanence.",
    detail: [
      "Decay turns part of every reserve into helium-3 while releasing low-energy beta radiation.",
      "The same decay explains why primordial tritium seams cannot survive for geological time."
    ]
  },
  {
    id: "isotope-enrichment",
    label: "ISOTOPE ENRICHMENT",
    aliases: ["ISOTOPE ENRICHMENT", "LITHIUM-6 ENRICHMENT"],
    short:
      "Isotope enrichment separates lithium-6 from chemically identical lithium isotopes before reactor use.",
    detail: [
      "Chemical refining alone cannot perform the separation because both isotopes form the same compounds.",
      "Enriched stock is valuable because it has already passed an energy-intensive industrial bottleneck."
    ]
  },
  {
    id: "startup-inventory",
    label: "STARTUP INVENTORY",
    aliases: ["STARTUP INVENTORY", "REACTOR STARTUP INVENTORY"],
    short:
      "A new D-T reactor needs an external tritium inventory before it can breed replacement fuel for itself.",
    detail: [
      "The first charge must survive filling, processing and commissioning losses before a closed cycle exists.",
      "Surplus from mature plants therefore constrains how quickly new fusion capacity can enter service."
    ]
  },
  {
    id: "materials-loop",
    label: "MATERIALS LOOP",
    aliases: ["MATERIALS LOOP", "MATERIALS DISCOVERY LOOP"],
    short:
      "A materials loop repeatedly designs, fabricates, irradiates and rejects candidates under one audited process.",
    detail: [
      "Artificial intelligence chooses the next experiment from measured failure rather than waiting for a human shortlist.",
      "The loop's advantage comes from millions of informative iterations rather than one miraculous alloy."
    ]
  },
  {
    id: "irradiation-campaign",
    label: "IRRADIATION CAMPAIGN",
    aliases: ["IRRADIATION CAMPAIGN", "IRRADIATION TESTING"],
    short:
      "An irradiation campaign exposes candidate materials to the particle damage expected inside a fusion plant.",
    detail: [
      "Samples are measured for swelling, embrittlement, activation and thermal change over accelerated lifetimes.",
      "Failure data feeds the materials loop and determines inspection intervals for deployed components."
    ]
  },
  {
    id: "robotic-hot-cell",
    label: "ROBOTIC HOT CELL",
    aliases: ["ROBOTIC HOT CELL", "ROBOTIC HOT CELLS"],
    short:
      "A robotic hot cell services activated reactor components that are unsafe for direct human handling.",
    detail: [
      "Shielded manipulators cut, inspect and replace parts while containing radioactive dust and coolant residues.",
      "Standardized replacement geometry lets maintenance continue after neutron exposure has made the old component hazardous."
    ]
  },
  {
    id: "tungsten-facing",
    label: "TUNGSTEN FACING",
    aliases: ["TUNGSTEN FACING", "TUNGSTEN FACE"],
    short:
      "Tungsten facing protects reactor surfaces that receive intense heat and particle loading.",
    detail: [
      "Its high melting point is useful, while brittleness and neutron damage still require replaceable sections.",
      "The facing is one layer in a maintained material stack rather than a permanent reactor wall."
    ]
  },
  {
    id: "low-activation-steel",
    label: "LOW-ACTIVATION STEEL",
    aliases: ["LOW-ACTIVATION STEEL", "LOW ACTIVATION STEEL"],
    short:
      "Low-activation steel limits the long-lived radioactive isotopes created by neutron exposure.",
    detail: [
      "Controlled alloying reduces elements that would become persistent waste after service.",
      "The steel still accumulates damage, but replacement and recycling become more manageable."
    ]
  },
  {
    id: "structural-ceramic",
    label: "STRUCTURAL CERAMIC",
    aliases: ["STRUCTURAL CERAMIC", "STRUCTURAL CERAMICS"],
    short:
      "Advanced ceramics provide heat tolerance and electrical isolation where metals would conduct or soften.",
    detail: [
      "Their brittleness is managed through small replaceable elements and compression-dominated shapes.",
      "Inspection systems watch for cracks that can grow without the yielding visible in metal."
    ]
  },
  {
    id: "superconducting-magnet",
    label: "SUPERCONDUCTING MAGNET",
    aliases: ["SUPERCONDUCTING MAGNET", "SUPERCONDUCTING MAGNETS"],
    short:
      "Superconducting magnets confine fusion plasma and shape exhaust while carrying current with little resistance.",
    detail: [
      "They require dedicated cooling and protection from neutron heating, mechanical force and sudden loss of superconductivity.",
      "Magnet performance is therefore tied directly to shielding, structure and heat rejection."
    ]
  },
  {
    id: "monitored-joint",
    label: "MONITORED JOINT",
    aliases: ["MONITORED JOINT", "MONITORED JOINTS"],
    short:
      "A monitored joint measures its own strain, temperature and leakage instead of relying only on scheduled inspection.",
    detail: [
      "Embedded sensors reveal gradual degradation before the connection leaves its certified load envelope.",
      "The data lets maintenance replace one joint without discarding the larger assembly around it."
    ]
  },
  {
    id: "automated-foundry",
    label: "AUTOMATED FOUNDRY",
    aliases: ["AUTOMATED FOUNDRY", "AUTOMATED FOUNDRIES"],
    short:
      "An automated foundry reproduces qualified material recipes with consistency across remote industrial branches.",
    detail: [
      "Sensors control composition, atmosphere, temperature and cooling history throughout each batch.",
      "Consistency matters because an approved design is only useful when distant yards can reproduce its properties."
    ]
  },
  {
    id: "cooling-works",
    label: "COOLING WORKS",
    aliases: ["COOLING WORKS", "DEDICATED COOLING WORKS"],
    short:
      "Cooling works move waste heat from dense terrestrial industry into air, water and ground sinks.",
    detail: [
      "Large compute campuses contract cooling capacity together with electrical generation.",
      "Available heat rejection can become the binding limit even when processors and power remain available."
    ]
  },
  {
    id: "fabrication-throughput",
    label: "FABRICATION THROUGHPUT",
    aliases: ["FABRICATION THROUGHPUT", "FABRICATION CAPACITY"],
    short:
      "Fabrication throughput measures how many qualified experiments or components an industrial line can complete in time.",
    detail: [
      "Fast models produce little advantage when furnaces, test rigs and inspection systems cannot keep pace.",
      "Throughput links compute directly to physical manufacturing rather than treating prediction as finished production."
    ]
  },
  {
    id: "verified-data",
    label: "VERIFIED DATA",
    aliases: ["VERIFIED DATA", "VERIFIED DATASET"],
    short:
      "Verified data carries provenance and measured uncertainty suitable for engineering or command decisions.",
    detail: [
      "Volume alone cannot replace records tied to calibrated instruments, known conditions and reproducible outcomes.",
      "Corporate advantage accumulates when years of operations continually add trustworthy examples."
    ]
  },
  {
    id: "model-efficiency",
    label: "MODEL EFFICIENCY",
    aliases: ["MODEL EFFICIENCY", "COMPUTE EFFICIENCY"],
    short:
      "Model efficiency determines how much useful prediction can be extracted from a fixed amount of compute and energy.",
    detail: [
      "Better architectures may reduce the operations needed for one task while making larger searches economical.",
      "Efficiency gains therefore shift demand rather than guaranteeing lower total power consumption."
    ]
  },
  {
    id: "operating-history",
    label: "OPERATING HISTORY",
    aliases: ["OPERATING HISTORY", "FLEET HISTORY"],
    short:
      "Operating history is the accumulated record of how one industrial network behaves under real conditions.",
    detail: [
      "Failures, repairs, trajectories and supply interruptions improve local models in ways purchased hardware cannot immediately reproduce.",
      "The record binds artificial intelligence to the fleet and infrastructure that generated its experience."
    ]
  },
  {
    id: "local-stock",
    label: "LOCAL STOCK",
    aliases: ["LOCAL STOCK", "LOCAL INDUSTRIAL STOCK"],
    short:
      "Local stock is material already available to a remote industrial branch without waiting for terrestrial shipment.",
    detail: [
      "Common structure, wiring and processing equipment can be reproduced locally before specialist components can.",
      "Qualified independence depends on how much core capacity survives when imported stock stops arriving."
    ]
  },
  {
    id: "atmospheric-skimmer",
    label: "ATMOSPHERIC SKIMMER",
    aliases: ["ATMOSPHERIC SKIMMER", "ATMOSPHERIC SKIMMERS"],
    short:
      "An atmospheric skimmer gathers hydrogen-rich gas for processing without landing a large collection plant.",
    detail: [
      "Repeated passes or suspended collection systems feed enormous volumes into isotope separation equipment.",
      "The source is abundant, while power, handling and certification determine usable deuterium output."
    ]
  },
  {
    id: "deuterium-separation",
    label: "DEUTERIUM SEPARATION",
    aliases: ["DEUTERIUM SEPARATION", "ISOTOPE SEPARATION"],
    short:
      "Deuterium separation concentrates heavy hydrogen from a much larger ordinary hydrogen flow.",
    detail: [
      "The small mass difference permits staged industrial separation rather than a distinct chemical reaction.",
      "Scale and energy consumption matter more than scarcity of the source material."
    ]
  },
  {
    id: "signed-decision-log",
    label: "SIGNED DECISION LOG",
    aliases: ["SIGNED DECISION LOG", "SIGNED DECISION LOGS"],
    short:
      "A signed decision log preserves what an autonomous system observed, selected and authorized during remote work.",
    detail: [
      "Cryptographic signatures make later alteration detectable without making the original decision infallible.",
      "The record supports maintenance, arbitration and criminal investigation after equipment or personnel are gone."
    ]
  },
  {
    id: "parts-cannibalization",
    label: "PARTS CANNIBALIZATION",
    aliases: ["PARTS CANNIBALIZATION", "CANNIBALISED PARTS"],
    short:
      "Parts cannibalization recovers useful assemblies from equipment whose repair is not worth the retrieval cost.",
    detail: [
      "Local models compare expected remaining life with transport, labor and inventory needs before dismantling a machine.",
      "Abandoned hardware becomes distributed stock rather than waste when compatible interfaces survive."
    ]
  },
  {
    id: "autonomous-hauler",
    label: "AUTONOMOUS HAULER",
    aliases: ["AUTONOMOUS HAULER", "AUTONOMOUS HAULERS"],
    short:
      "An autonomous hauler moves ore, components and failed machinery through an industrial site without continuous control.",
    detail: [
      "It shares maps, traffic priorities and failure reports with nearby extraction equipment.",
      "Local routing changes when a claim, launch window or disabled machine alters the work plan."
    ]
  },
  {
    id: "imported-specialist-part",
    label: "IMPORTED SPECIALIST PART",
    aliases: ["IMPORTED SPECIALIST PART", "IMPORTED SPECIALIST PARTS"],
    short:
      "A specialist part remains cheaper or more reliable to import than reproduce in a small remote industry.",
    detail: [
      "High-performance sensors, magnet components and precision tools may retain terrestrial supply chains after basic structure becomes local.",
      "Outer-system autonomy is therefore substantial without becoming complete self-sufficiency."
    ]
  },
  {
    id: "thermal-bus",
    label: "THERMAL BUS",
    aliases: ["THERMAL BUS", "THERMAL BUSES"],
    short:
      "A thermal bus carries waste heat from reactors, computers and inhabited modules to radiator loops.",
    detail: [
      "Multiple sources share controlled coolant paths while isolation valves prevent one leak from draining the entire ship.",
      "Its placement explains why radiator roots cluster near the shielded reactor section."
    ]
  },
  {
    id: "heat-exchanger",
    label: "HEAT EXCHANGER",
    aliases: ["HEAT EXCHANGER", "HEAT EXCHANGERS"],
    short: "A heat exchanger transfers energy between coolant loops without mixing their fluids.",
    detail: [
      "Reactor, life-support and radiator circuits can operate at different pressures, temperatures and contamination limits.",
      "Isolation makes one damaged loop serviceable without exposing the rest of the vessel."
    ]
  },
  {
    id: "command-citadel",
    label: "COMMAND CITADEL",
    aliases: ["COMMAND CITADEL", "CREW CITADEL"],
    short:
      "The command citadel concentrates crew, control and emergency shelter inside the reactor's protected shadow.",
    detail: [
      "It is a compact pressure section rather than a bridge with windows or a broad inhabited deck.",
      "Distance from weapons and the fusion drive reduces the consequences of a local failure."
    ]
  },
  {
    id: "sensitive-electronics",
    label: "SENSITIVE ELECTRONICS",
    aliases: ["SENSITIVE ELECTRONICS", "RADIATION-SENSITIVE ELECTRONICS"],
    short:
      "Sensitive electronics require shielding, redundancy and separation from reactors, weapons and high-current machinery.",
    detail: [
      "Radiation can corrupt data or damage components without leaving visible structural harm.",
      "Critical control remains distributed so one upset cannot remove propulsion, navigation and life support together."
    ]
  },
  {
    id: "reaction-control",
    label: "REACTION CONTROL",
    aliases: ["REACTION CONTROL", "REACTION CONTROL THRUSTER"],
    short:
      "Reaction-control thrusters rotate and translate the ship without using the full fusion torch.",
    detail: [
      "Small impulses manage docking, cargo capture, radiator clearance and final attitude changes.",
      "Their propellant and authority are limited compared with the main drive, but their precision is much greater."
    ]
  },
  {
    id: "capture-attitude",
    label: "CAPTURE ATTITUDE",
    aliases: ["CAPTURE ATTITUDE", "RECEIVING ATTITUDE"],
    short:
      "Capture attitude points the forward service head through the planned cargo stream while protecting the rest of the hull.",
    detail: [
      "Reaction control aligns the collar, keeps radiators clear and preserves a safe fusion exhaust direction.",
      "The ship follows a prepared working orientation rather than aiming an arbitrary side toward the facility."
    ]
  },
  {
    id: "guidance-prong",
    label: "GUIDANCE PRONG",
    aliases: ["GUIDANCE PRONG", "GUIDANCE PRONGS"],
    short:
      "Guidance prongs extend sensor and field hardware around a recessed capture port without forming a mechanical jaw.",
    detail: [
      "They measure packet position and shape the final contactless correction inside the service head.",
      "Their open geometry preserves a clear approach path and avoids trapping debris."
    ]
  },
  {
    id: "pressure-boundary",
    label: "PRESSURE BOUNDARY",
    aliases: ["PRESSURE BOUNDARY", "PRESSURE BOUNDARIES"],
    short:
      "A pressure boundary separates inhabited volume from vacuum and from machinery that may release hazardous fluid.",
    detail: [
      "Inspection drones test seams, penetrations and valves before a commissioned section carries people.",
      "Compartment boundaries limit how much atmosphere one puncture can remove."
    ]
  },
  {
    id: "minimum-watch",
    label: "MINIMUM WATCH",
    aliases: ["MINIMUM WATCH", "MINIMUM WATCH CREW"],
    short:
      "A minimum watch is the smallest trained team able to operate a ship safely through every duty period.",
    detail: [
      "Automation reduces routine workload but cannot eliminate simultaneous command, reactor, flight and medical responsibilities.",
      "Twelve people provide continuous coverage only through tightly combined roles and rotating watches."
    ]
  },
  {
    id: "active-complement",
    label: "ACTIVE COMPLEMENT",
    aliases: ["ACTIVE COMPLEMENT", "ACTIVE SHIP COMPLEMENT"],
    short:
      "The active complement is the crew assigned to operate one commissioned vessel rather than waiting for a future hull.",
    detail: [
      "Its members cover command, flight, reactor, weapons, systems and medicine across continuous watches.",
      "Reserve personnel can assist, but they remain organized around the ship they are expected to commission."
    ]
  },
  {
    id: "crew-transfer",
    label: "CREW TRANSFER",
    aliases: ["CREW TRANSFER", "COMPLEMENT TRANSFER"],
    short:
      "Crew transfer moves a trained reserve team from an incumbent ship into a newly assembled hull.",
    detail: [
      "The team crosses only after pressure, life support and docking connections pass commissioning checks.",
      "Departure reduces the parent ship's personnel redundancy while creating an independent command."
    ]
  },
  {
    id: "independent-command-key",
    label: "INDEPENDENT COMMAND KEY",
    aliases: ["INDEPENDENT COMMAND KEY", "INDEPENDENT COMMAND KEYS"],
    short:
      "An independent command key separates a commissioned vessel's authority from the ship that assembled it.",
    detail: [
      "The new commander receives bounded control over propulsion, weapons, registry and corporate communications.",
      "Until that transfer is authenticated, the hull remains equipment under the incumbent ship's supervision."
    ]
  },
  {
    id: "water-recovery",
    label: "WATER RECOVERY",
    aliases: ["WATER RECOVERY", "WATER RECYCLING"],
    short:
      "Water recovery returns humidity, wash water and waste processing output to the ship's usable inventory.",
    detail: [
      "Closed loops reduce resupply mass but require filters, pumps and periodic removal of accumulated contaminants.",
      "A failure consumes reserve water long before it threatens propulsion or structure."
    ]
  },
  {
    id: "oxygen-recovery",
    label: "OXYGEN RECOVERY",
    aliases: ["OXYGEN RECOVERY", "OXYGEN LOOP"],
    short:
      "Oxygen recovery removes carbon dioxide and restores breathable gas inside the closed life-support loop.",
    detail: [
      "Chemical and biological processing reduce stored oxygen demand without making the loop perfectly closed.",
      "Fire, leakage and scrubber failure can consume reserve capacity much faster than normal metabolism."
    ]
  },
  {
    id: "filter-life",
    label: "FILTER LIFE",
    aliases: ["FILTER LIFE", "FILTER LIFETIME"],
    short:
      "Filter life limits how long a closed habitat can remove trace contaminants without replacement media.",
    detail: [
      "Dust, volatile compounds and process by-products accumulate even when oxygen and water are recycled.",
      "Filter inventory can end a deployment before food or reactor fuel becomes critical."
    ]
  },
  {
    id: "medical-stock",
    label: "MEDICAL STOCK",
    aliases: ["MEDICAL STOCK", "MEDICAL STOCKS"],
    short:
      "Medical stock supports trauma care, radiation treatment and routine health during a deployment far from evacuation.",
    detail: [
      "Compact crews cross-train for emergency medicine because a dedicated hospital staff is impossible.",
      "Consumables and sterile capacity matter more than the presence of sophisticated diagnostic software alone."
    ]
  },
  {
    id: "personnel-redundancy",
    label: "PERSONNEL REDUNDANCY",
    aliases: ["PERSONNEL REDUNDANCY", "CREW REDUNDANCY"],
    short:
      "Personnel redundancy keeps essential roles covered after illness, injury or a prolonged watch cycle.",
    detail: [
      "Reserve crews increase redundancy while they remain aboard an opening ship.",
      "Commissioning a new hull spends that margin by dividing trained people between two independent vessels."
    ]
  },
  {
    id: "docking-collar",
    label: "DOCKING COLLAR",
    aliases: ["DOCKING COLLAR", "DOCKING COLLARS"],
    short:
      "A docking collar carries structural load, utilities and crew access between compatible spacecraft sections.",
    detail: [
      "Alignment guides close before pressure seals, power and data connections are permitted to engage.",
      "The collar supports deliberate berthing rather than the high-rate contactless capture used for fuel packets."
    ]
  },
  {
    id: "isolated-fuel-rack",
    label: "ISOLATED FUEL RACK",
    aliases: ["ISOLATED FUEL RACK", "ISOLATED FUEL RACKS"],
    short:
      "An isolated rack stores tritium canisters outside the main pressure hull for inspection and controlled loss.",
    detail: [
      "Spacing, shielding and quick-release hardware prevent one damaged vessel from contaminating inhabited volume.",
      "External placement accepts vulnerability in exchange for safer maintenance and replacement."
    ]
  },
  {
    id: "tritium-permeation",
    label: "TRITIUM PERMEATION",
    aliases: ["TRITIUM PERMEATION", "HYDROGEN PERMEATION"],
    short:
      "Tritium permeation is the slow passage of hydrogen isotopes through seals and structural materials.",
    detail: [
      "The process creates inventory loss and contamination even without a visible leak.",
      "Barrier coatings, temperature control and continuous accounting reduce but do not eliminate it."
    ]
  },
  {
    id: "mission-module",
    label: "MISSION MODULE",
    aliases: ["MISSION MODULE", "MISSION MODULES"],
    short:
      "A mission module groups replaceable equipment around a standard structural and utility interface.",
    detail: [
      "Weapons, sensors and ammunition can be exchanged together without rebuilding the propulsion spine.",
      "A ship may travel without a combat module while lacking the systems required for armed operations."
    ]
  },
  {
    id: "ammunition-feed",
    label: "AMMUNITION FEED",
    aliases: ["AMMUNITION FEED", "AMMUNITION FEEDS"],
    short:
      "An ammunition feed moves kinetic rounds from protected storage into the point-defense turret at combat cadence.",
    detail: [
      "Feed geometry and mass make duplicating a turret more expensive than adding another barrel alone.",
      "A jam or damaged path can disable a healthy mount until the crew isolates the fault."
    ]
  },
  {
    id: "turret-traverse",
    label: "TURRET TRAVERSE",
    aliases: ["TURRET TRAVERSE", "TRAVERSE RATE"],
    short:
      "Turret traverse is the rate and angular range through which a defensive mount can redirect fire.",
    detail: [
      "A target that changes bearing faster than the mount can follow may leave the solved engagement cone.",
      "Hull rotation supplements traverse but also moves radiators, blind angles and cargo hardware."
    ]
  },
  {
    id: "instrumented-tracer",
    label: "INSTRUMENTED TRACER",
    aliases: ["INSTRUMENTED TRACER", "INSTRUMENTED TRACERS"],
    short:
      "An instrumented tracer reports the actual projectile stream against the fire-control prediction.",
    detail: [
      "Emitters and timed breakup make selected rounds observable across the engagement volume.",
      "Their measurements let later bursts correct for barrel flex, thermal drift and ship rotation."
    ]
  },
  {
    id: "timed-breakup",
    label: "TIMED BREAKUP",
    aliases: ["TIMED BREAKUP", "TIMED BREAKUP PATTERN"],
    short:
      "Timed breakup makes a tracer change or disperse at a known point so sensors can identify it among other rounds.",
    detail: [
      "The event provides range and timing information without requiring the projectile to strike the target.",
      "Missile guidance can observe the same signal, making every diagnostic round visible to both sides."
    ]
  },
  {
    id: "barrel-flex",
    label: "BARREL FLEX",
    aliases: ["BARREL FLEX", "BARREL DEFLECTION"],
    short:
      "Barrel flex shifts the outgoing projectile stream as the mount accelerates, heats and changes orientation.",
    detail: [
      "Small angular errors become large misses across a fast closing engagement.",
      "Closed-loop spotting measures the resulting stream instead of assuming a perfectly rigid barrel."
    ]
  },
  {
    id: "thermal-drift",
    label: "THERMAL DRIFT",
    aliases: ["THERMAL DRIFT", "THERMAL SIGHT DRIFT"],
    short:
      "Thermal drift changes alignment as repeated fire heats the barrel, mount and nearby structure.",
    detail: [
      "The error evolves during a burst and cannot be removed by one calibration performed before combat.",
      "Tracer feedback lets fire control update the aim point while temperatures continue to change."
    ]
  },
  {
    id: "optical-seeker",
    label: "OPTICAL SEEKER",
    aliases: ["OPTICAL SEEKER", "OPTICAL SEEKERS"],
    short: "An optical seeker gives a missile local target measurements during the final approach.",
    detail: [
      "It compares stars, body limbs, engine light and hull signatures with the predicted track.",
      "Local sensing avoids dependence on a delayed command link while remaining vulnerable to damage and deception."
    ]
  },
  {
    id: "electronic-attack",
    label: "ELECTRONIC ATTACK",
    aliases: ["ELECTRONIC ATTACK", "ELECTRONIC DECEPTION"],
    short:
      "Electronic attack increases uncertainty in a weapon's sensors and communications before hard-kill fire engages it.",
    detail: [
      "False timing, competing signatures and directional interference can force guidance to spend maneuver reserve.",
      "Deception supports physical defense rather than guaranteeing that a missile loses the target by itself."
    ]
  },
  {
    id: "maneuver-reserve",
    label: "MANEUVER RESERVE",
    aliases: ["MANEUVER RESERVE", "MANOEUVRE RESERVE"],
    short:
      "A missile's maneuver reserve is the remaining propellant and control authority available for terminal correction.",
    detail: [
      "Early corrections reduce what remains for late jinks around the defensive engagement cone.",
      "Guidance preserves reserve until new sensor data makes a correction worth its cost."
    ]
  },
  {
    id: "late-jink",
    label: "LATE JINK",
    aliases: ["LATE JINK", "LATE JINKS"],
    short:
      "A late jink changes the missile's plane after point defense has committed rounds to an earlier crossing point.",
    detail: [
      "Waiting improves surprise but leaves less time and distance to recover the desired intercept geometry.",
      "The maneuver succeeds only if the remaining reserve exceeds the turret's correction and traverse response."
    ]
  },
  {
    id: "prompt-radiation",
    label: "PROMPT RADIATION",
    aliases: ["PROMPT RADIATION", "PROMPT NUCLEAR RADIATION"],
    short:
      "Prompt radiation is the intense particle and photon output released immediately by a nuclear detonation.",
    detail: [
      "It crosses a small miss distance before slower debris can reach the target.",
      "Electronics, sensors and exposed crew protection may fail without direct contact with the warhead."
    ]
  },
  {
    id: "flash-heating",
    label: "FLASH HEATING",
    aliases: ["FLASH HEATING", "THERMAL FLASH"],
    short:
      "Flash heating deposits radiant energy into exposed surfaces over a very short interval.",
    detail: [
      "Coatings, sensors and radiator panels can vaporize or fracture before heat spreads through the hull.",
      "A close nuclear miss can therefore disable a ship without a conventional impact."
    ]
  },
  {
    id: "miss-distance",
    label: "MISS DISTANCE",
    aliases: ["MISS DISTANCE", "DEFENSIVE MISS DISTANCE"],
    short:
      "Miss distance is the closest separation between weapon and target during the terminal encounter.",
    detail: [
      "Nuclear effects permit a useful lethal radius, while point defense tries to increase separation before detonation.",
      "Precise guidance allows a smaller yield to remain effective near valuable infrastructure."
    ]
  },
  {
    id: "yield-control",
    label: "YIELD CONTROL",
    aliases: ["YIELD CONTROL", "LIMITED YIELD"],
    short:
      "Yield control limits destructive effects to the smallest package compatible with the required miss distance.",
    detail: [
      "A larger detonation increases damage but also threatens facilities, friendly vessels and later attribution consequences.",
      "Accurate guidance makes restraint technically possible without making the weapon non-nuclear."
    ]
  },
  {
    id: "arming-safeguard",
    label: "ARMING SAFEGUARD",
    aliases: ["ARMING SAFEGUARD", "ARMING SAFEGUARDS"],
    short:
      "Arming safeguards prevent a stored weapon from reaching a live state without the required authority and separation.",
    detail: [
      "Registry keys, environmental checks and launch sequencing divide authorization across independent conditions.",
      "Protected-corridor enforcement focuses on arming state as well as physical possession of a warhead."
    ]
  },
  {
    id: "fragment-field",
    label: "FRAGMENT FIELD",
    aliases: ["FRAGMENT FIELD", "FRAGMENT FIELDS"],
    short:
      "A fragment field is the expanding debris produced when a weapon or defensive round breaks apart at high velocity.",
    detail: [
      "Destroying guidance is insufficient if surviving fragments still cross the ship's path with dangerous energy.",
      "Point defense seeks an intercept far enough away for the field to disperse or miss."
    ]
  },
  {
    id: "target-plane",
    label: "TARGET PLANE",
    aliases: ["TARGET PLANE", "PREDICTED TARGET PLANE"],
    short:
      "The target plane is the predicted cross-section through which weapon and defensive stream may pass at encounter time.",
    detail: [
      "Tracer telemetry reports where each burst crosses this reference relative to the target track.",
      "The plane changes as new observations alter timing, bearing and closing velocity."
    ]
  },
  {
    id: "crossing-point",
    label: "CROSSING POINT",
    aliases: ["CROSSING POINT", "PREDICTED CROSSING POINT"],
    short:
      "A crossing point is the current best estimate of where a projectile stream can intersect a moving threat.",
    detail: [
      "The turret fires around the estimate and uses observed misses to move later bursts inward.",
      "A missile jink shifts the estimate before the stream can fully converge."
    ]
  },
  {
    id: "engagement-cone",
    label: "ENGAGEMENT CONE",
    aliases: ["ENGAGEMENT CONE", "ENGAGEMENT CONES"],
    short:
      "An engagement cone is the region one defensive turret can cover without firing through its own ship.",
    detail: [
      "Hull structure, radiator roots and stored hardware cut shadows from the mount's theoretical traverse.",
      "EVADE rotates and translates the vessel until the incoming track returns to a solved cone."
    ]
  },
  {
    id: "defended-axis",
    label: "DEFENDED AXIS",
    aliases: ["DEFENDED AXIS", "DEFENDED AXES"],
    short:
      "A defended axis is the attack direction currently receiving the turret's tracking, ammunition and hull orientation.",
    detail: [
      "One mount can saturate a solved approach while leaving an opposed vector difficult to schedule.",
      "A support ship exploits that commitment by creating a second bearing."
    ]
  },
  {
    id: "magazine-depth",
    label: "MAGAZINE DEPTH",
    aliases: ["MAGAZINE DEPTH", "MISSILE INVENTORY"],
    short:
      "Magazine depth is the finite number of missile-drones a ship can carry through one deployment.",
    detail: [
      "A typical combat module holds roughly ten to twelve weapons together with protected launch cells.",
      "Repeated harassment consumes strategic options even when launching does not directly spend delta-v."
    ]
  },
  {
    id: "convoy-escort",
    label: "CONVOY ESCORT",
    aliases: ["CONVOY ESCORT", "CONVOY ESCORTS"],
    short:
      "Convoy escort was the declared protective role from which the first armed corporate hulls developed.",
    detail: [
      "Escorts defended registered traffic, rescue operations and valuable cargo before open fleet combat existed.",
      "The same propulsion, sensors and weapons later supported denial of an orbit and retaliation."
    ]
  },
  {
    id: "emergency-response-craft",
    label: "EMERGENCY-RESPONSE CRAFT",
    aliases: ["EMERGENCY-RESPONSE CRAFT", "EMERGENCY RESPONSE CRAFT"],
    short:
      "Emergency-response craft carried rescue, containment and security equipment into remote industrial accidents.",
    detail: [
      "Their autonomy and high delta-v made them natural platforms for armed corporate protection.",
      "Conversion to combat preserved civilian registry ancestry even after the operational role changed."
    ]
  },
  {
    id: "local-resource-claim",
    label: "LOCAL RESOURCE CLAIM",
    aliases: ["LOCAL RESOURCE CLAIM", "LOCAL RESOURCE CLAIMS"],
    short:
      "A local resource claim records which operator has authority to work a surveyed industrial area.",
    detail: [
      "Autonomous equipment uses signed claim data to schedule extraction and avoid conflicting work.",
      "A claim can remain legally valid while hostile control makes practical access impossible."
    ]
  },
  {
    id: "traffic-authority",
    label: "TRAFFIC AUTHORITY",
    aliases: ["TRAFFIC AUTHORITY", "LOCAL TRAFFIC AUTHORITY"],
    short:
      "Traffic authority schedules launches, cargo paths and approach windows around a remote facility.",
    detail: [
      "It prevents routine industrial movement from becoming an uncontrolled collision hazard.",
      "Control of traffic data can deny access without destroying the underlying plant."
    ]
  },
  {
    id: "embargo-resilience",
    label: "EMBARGO RESILIENCE",
    aliases: ["EMBARGO RESILIENCE", "EMBARGO RESISTANCE"],
    short:
      "Embargo resilience measures how long an industrial branch can operate after terrestrial supply is restricted.",
    detail: [
      "Local stock, cannibalized parts and reproduced machinery slow the effect of sanctions.",
      "Specialist imports and software trust chains keep that independence qualified rather than absolute."
    ]
  },
  {
    id: "operating-software",
    label: "OPERATING SOFTWARE",
    aliases: ["OPERATING SOFTWARE", "INDUSTRIAL SOFTWARE STACK"],
    short:
      "Operating software coordinates the models, safety limits and machine interfaces that make remote hardware productive.",
    detail: [
      "Copying a machine without its qualified control stack does not reproduce the same industrial capacity.",
      "Signed updates and local adaptation create both resilience and dependence on the network that maintains them."
    ]
  },
  {
    id: "supplier-batch",
    label: "SUPPLIER BATCH",
    aliases: ["SUPPLIER BATCH", "SUPPLIER BATCHES"],
    short:
      "A supplier batch groups components manufactured under one traceable material and process history.",
    detail: [
      "Yard revisions record batch differences because a later defect may affect every matching component.",
      "Traceability permits targeted replacement instead of grounding all hulls that share the design."
    ]
  },
  {
    id: "pressure-test",
    label: "PRESSURE TEST",
    aliases: ["PRESSURE TEST", "PRESSURE TESTS"],
    short:
      "A pressure test verifies that a newly joined inhabited section can hold atmosphere within its certified leakage rate.",
    detail: [
      "The test proceeds in stages so a bad seal does not release a full operating atmosphere.",
      "Inspection records tie the result to specific joints, valves and supplier batches."
    ]
  },
  {
    id: "propulsion-test",
    label: "PROPULSION TEST",
    aliases: ["PROPULSION TEST", "PROPULSION TESTS"],
    short:
      "A propulsion test verifies control, cooling and structural response before an assembled hull departs independently.",
    detail: [
      "Low-power sequences check valves, magnets, thrust alignment and thermal-bus behavior before full operation.",
      "A failed result keeps the vessel under yard supervision rather than creating an unreliable commissioned ship."
    ]
  },
  {
    id: "commissioning-file",
    label: "COMMISSIONING FILE",
    aliases: ["COMMISSIONING FILE", "COMMISSIONING FILES"],
    short:
      "A commissioning file collects the inspections, tests, authority transfers and component records of a new vessel.",
    detail: [
      "Registry acceptance depends on evidence that pressure, life support, software and propulsion meet certified limits.",
      "The file becomes the starting point for maintenance history and later attribution."
    ]
  },
  {
    id: "asset-impairment",
    label: "ASSET IMPAIRMENT",
    aliases: ["ASSET IMPAIRMENT", "IMPAIRED ASSET"],
    short:
      "Asset impairment is the accounting recognition that a ship or facility can no longer recover its recorded value.",
    detail: [
      "Corporate reporting can describe a fatal combat loss through this financial category without denying the event.",
      "The term communicates balance-sheet consequence while omitting the human and operational detail."
    ]
  },
  {
    id: "loss-report",
    label: "LOSS REPORT",
    aliases: ["LOSS REPORT", "LOSS REPORTS"],
    short:
      "A loss report records a missing or destroyed asset for registries, insurers and internal investigation.",
    detail: [
      "Time, last telemetry, crew manifest and probable cause may be published at different levels of confidence.",
      "A report can acknowledge destruction while leaving hostile attribution formally unresolved."
    ]
  }
] as const satisfies readonly GameGlossaryEntry[];
