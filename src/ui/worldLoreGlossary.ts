import type { GameGlossaryEntry } from "./gameGlossary";

export const worldLoreGlossaryEntries = [
  {
    id: "fusion-torch",
    label: "FUSION TORCH",
    aliases: ["FUSION TORCH", "FUSION TORCHES", "TORCH DRIVE", "TORCH DRIVES", "TORCH"],
    short: "A fusion engine trading extraordinary fuel throughput for sustained acceleration.",
    detail: [
      "A torch is a reactor, power plant and magnetic exhaust nozzle built as one machine.",
      "Its fusion fuel releases the energy; bulk hydrogen is expelled as reaction mass.",
      "The drive can thrust for days instead of minutes. That makes interplanetary transfers operational rather than generational.",
      "The limiting structures are neutron shielding, magnets and radiators—not combustion chambers."
    ]
  },
  {
    id: "fusion",
    label: "FUSION",
    aliases: ["FUSION", "FUSION ENERGY", "FUSION POWER", "FUSION FUEL"],
    short: "2079's abundant firm power: mature, industrial and still brutally thermal.",
    detail: [
      "In 2058, a commercial D-T station first replaced all the tritium it consumed while exporting firm power.",
      "Neutrons damage walls, activate components and breed replacement tritium from lithium-6.",
      "AI made the materials cycle fast enough to industrialise. Robotic maintenance made the plants economical.",
      "Power is abundant. Magnets, enriched lithium, turbines and heat rejection remain finite."
    ]
  },
  {
    id: "nuclear",
    label: "NUCLEAR",
    aliases: ["NUCLEAR WARFARE", "NUCLEAR", "THERMONUCLEAR"],
    short:
      "A mature energy regime whose civilian abundance did not make military use simple or lawful.",
    detail: [
      "Fusion stations power cities, server farms and torch drives. Compact propulsion arrived later than stationary generation.",
      "Fission survives in triggers, remote backup plants and weapons packages; fusion did not erase the older nuclear stack.",
      "Warships exploit nuclear power mainly for propulsion, sensors, fabrication and high-duty defensive fire.",
      "Earth-Moon treaties interdict nuclear combat. Beyond the corridor, the law remained clear while enforcement became remote."
    ]
  },
  {
    id: "artificial-intelligence",
    label: "ARTIFICIAL INTELLIGENCE",
    aliases: ["ARTIFICIAL INTELLIGENCE", "ARTIFICIAL INTELLIGENCES", "AI"],
    short:
      "The accelerator of 2079 industry, powerful enough to move bottlenecks back into physics.",
    detail: [
      "In 2043, the first certified materials loop let models choose, fabricate, irradiate and discard candidates without a human shortlist.",
      "Materials once tested by the dozen were fabricated and destroyed by the million.",
      "The best systems improve with more compute, so electricity and discarded heat became strategic inputs.",
      "A deployed fleet runs local models. An eighty-minute instruction delay from Earth is not command."
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
    short: "A power-to-compute refinery whose useful output is prediction, design and control.",
    detail: [
      "By 2069 the largest campuses were paired directly with fusion stations and dedicated cooling works.",
      "Additional power buys additional training, search and industrial scheduling until memory or fabrication becomes the next limit.",
      "Outer-system farms trade terrestrial latency for local authority over mines, yards and traffic.",
      "Their scale matters less than ownership of the machines they command."
    ]
  },
  {
    id: "compute",
    label: "COMPUTE",
    aliases: ["COMPUTE", "COMPUTATION", "COMPUTING", "COMPUTATIONAL", "PROCESSING POWER"],
    short:
      "A strategic industrial input, measured as usable decisions rather than processor count.",
    detail: [
      "Raw operations are only the first constraint. Memory, interconnect, model efficiency and verified data decide how much becomes useful work.",
      "States can purchase processors. They cannot quickly reproduce a proprietary fleet, its training record and its robotic supply chain.",
      "That asymmetry—not a magical intelligence score—is the corporations' advantage."
    ]
  },
  {
    id: "heat-rejection",
    label: "HEAT REJECTION",
    aliases: ["HEAT REJECTION", "WASTE HEAT", "COOLING", "HEAT"],
    short: "The hard ceiling shared by fusion plants, computers and inhabited ships.",
    detail: [
      "Almost every joule used for computation ends as heat.",
      "On Earth it can be carried into air, water and ground. In vacuum it must leave through radiators.",
      "A cold planet does not cool a spacecraft by proximity; without matter to carry heat away, only radiation remains.",
      "Radiator area is therefore capacity, silhouette and vulnerability at once."
    ]
  },
  {
    id: "radiator",
    label: "RADIATOR",
    aliases: ["RADIATOR", "RADIATORS", "RADIATOR WING", "RADIATOR WINGS"],
    short: "A large, fragile surface that turns waste heat into infrared light.",
    detail: [
      "Torch power, life support and compute are throttled by how much heat their radiator wings can emit.",
      "The panels fold for docking and spread far beyond the armoured spine in flight.",
      "Their roots create the point-defense blind cone every missile guidance model tries to enter.",
      "A puncture is survivable. Losing a whole loop forces shutdown long before the crew freezes."
    ]
  },
  {
    id: "materials",
    label: "MATERIALS",
    aliases: ["MATERIAL SCIENCE", "MATERIALS", "COMPONENTS", "COMPONENT"],
    short:
      "The quiet breakthrough behind practical fusion: matter that fails slowly and predictably.",
    detail: [
      "No single miracle alloy unlocked 2079.",
      "The stack is replaceable tungsten faces, low-activation steels, ceramic composites, superconductors and self-reporting joints.",
      "AI shortened discovery; automated foundries preserved consistency; robotic hot cells accepted that neutron damage never vanished.",
      "Reliability came from designing replacement into every component."
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
      "A closed robotic industry that surveys, digs, refines and repairs without a resident workforce.",
    detail: [
      "No operator on Earth steers a shovel near Saturn. Local models assign claims, reroute haulers and cannibalise failed machines.",
      "A 2076 pilot first added an extractor, power loop and working copy of itself from local stock.",
      "Rocky drones recover lithium-bearing feedstock; atmospheric skimmers harvest deuterium-rich hydrogen.",
      "The valuable product is certified fusion fuel already processed in orbit. Ownership means power, spares, compute and traffic control."
    ]
  },
  {
    id: "mining-drone",
    label: "MINING DRONE",
    aliases: ["MINING DRONE", "MINING DRONES", "DRONE MINE", "DRONE MINES", "DRONE", "DRONES"],
    short:
      "A replaceable machine expected to improvise farther from help than its designers can see.",
    detail: [
      "Mining drones share tools, maps and failure models; most have no permanent human operator.",
      "A damaged unit becomes parts stock unless its predicted recovery value exceeds the trip.",
      "Their autonomy made the outer-system buildout affordable—and made an embargo from Earth slow to matter.",
      "The fleets are property. Their decision logs are evidence."
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
      "Tritium is never mined as a primordial seam: its 12.3-year half-life erased those long ago.",
      "Inside the plant, a breeder blanket captures reactor neutrons in lithium-6 and returns the resulting tritium to the fuel loop.",
      "The plant must make slightly more tritium than its reactors burn; that surplus starts new reactors and fuels ships.",
      "Tritium sites are production plants and refineries, not holes full of radioactive hydrogen."
    ]
  },
  {
    id: "deuterium",
    label: "DEUTERIUM",
    aliases: ["DEUTERIUM"],
    short:
      "Stable heavy hydrogen: plentiful feedstock for fusion and easy to store compared with tritium.",
    detail: [
      "Gas-giant skimmers separate deuterium from immense hydrogen flows.",
      "The separation plant is large, but the source is effectively inexhaustible on the scale of the conflict.",
      "Deuterium supplies one half of D-T fuel. Tritium plants manufacture the scarce half from lithium-6.",
      "Operational ledgers report both industries as usable TRITIUM output."
    ]
  },
  {
    id: "lithium-six",
    label: "LITHIUM-6",
    aliases: ["LITHIUM-6", "LITHIUM 6", "LI-6", "LITHIUM"],
    short: "The stable feedstock from which fusion plants manufacture tritium.",
    detail: [
      "Lithium-6 is stable, transportable and far easier to stockpile than the tritium it will become.",
      "Moon and asteroid refineries enrich it before shipment to the neutron blankets inside tritium plants.",
      "The strategic shortage is rarely raw lithium. It is enriched stock inside a functioning, neutron-tight fuel cycle.",
      "Destroying that cycle turns abundant rock into unusable potential."
    ]
  },
  {
    id: "continuous-acceleration",
    label: "CONTINUOUS ACCELERATION",
    aliases: ["CONTINUOUS ACCELERATION", "ACCELERATION"],
    short: "Low thrust sustained long enough to rewrite transfer time and firing geometry.",
    detail: [
      "Chemical engines deliver a brief impulse. Torch ships keep changing velocity while their reactors and radiators can endure it.",
      "Crew acceleration stays modest; accumulated velocity does not.",
      "A BURN therefore represents an entire guided thrust programme, not one flash from a nozzle.",
      "Its ΔV cost includes the freedom later needed to survive."
    ]
  },
  {
    id: "reaction-mass",
    label: "REACTION MASS",
    aliases: ["REACTION MASS", "PROPELLANT"],
    short: "Matter thrown astern so fusion energy can become momentum.",
    detail: [
      "Tritium is the energy-dense fuel, not most of the exhaust mass.",
      "Torch drives heat abundant hydrogen and expel it through a magnetic nozzle.",
      "High exhaust velocity saves propellant; high thrust spends it quickly.",
      "Fleet planning folds fuel, reaction mass and reserve margins into global ΔV."
    ]
  },
  {
    id: "year-2043",
    label: "2043",
    aliases: ["2043"],
    short: "The year materials discovery became a closed machine-speed loop.",
    detail: [
      "Candidate selection, fabrication, irradiation and failure analysis ran continuously under one audited model stack.",
      "The breakthrough was throughput: millions of useful failures instead of a handful of elegant guesses.",
      "2043 begins the acceleration that makes the fusion economy of 2079 possible."
    ]
  },
  {
    id: "year-2058",
    label: "2058",
    aliases: ["2058"],
    short: "The year commercial fusion closed its tritium and maintenance cycle.",
    detail: [
      "One D-T station exported firm power while producing all its replacement tritium across a full accounting year.",
      "Robotic hot-cell replacement made neutron damage an operating cost instead of a terminal experiment.",
      "Twenty-one years later, in 2079, fusion is infrastructure rather than a demonstration."
    ]
  },
  {
    id: "year-2069",
    label: "2069",
    aliases: ["2069"],
    short: "The year compute demand consumed the fusion surplus built to satisfy it.",
    detail: [
      "The largest AI campuses began contracting entire reactors and their heat-rejection works.",
      "Every efficiency gain released power that was immediately spent on larger searches, models and industrial schedules.",
      "By 2079 the useful ceiling on strategic compute is measured in power delivered and heat removed."
    ]
  },
  {
    id: "year-2076",
    label: "2076",
    aliases: ["2076"],
    short: "The year an outer-system industrial branch reproduced itself from local stock.",
    detail: [
      "A pilot mine built a second extractor, power loop and processing line without waiting for an Earth work order.",
      "It did not copy every component; it cannibalised imports where local manufacture remained inefficient.",
      "Three years later, in 2079, that qualified autonomy underwrites the fleets fighting over its output."
    ]
  },
  {
    id: "point-defense",
    label: "POINT DEFENSE",
    aliases: ["POINT DEFENSE", "POINT-DEFENSE", "DEFENSE"],
    short: "One rapid-fire turret defending one ship inside one unforgiving engagement cone.",
    detail: [
      "The turret walks tracer bursts around the predicted intercept in a tightening spiral-zeroing pattern.",
      "A missile-drone sees the stream, jinks between corrections and chooses the radiator-root blind angle.",
      "EVADE spends 1 ΔV to rotate and translate the ship until the attacker re-enters the gun's solved cone.",
      "Inside that cone the software almost never misses. Without the geometry, marksmanship is irrelevant.",
      "Two coordinated missiles from opposed vectors exceed what one turret and one hull translation can cover."
    ]
  },
  {
    id: "hard-kill",
    label: "HARD-KILL",
    aliases: ["HARD-KILL", "HARD KILL"],
    short:
      "Defense by physically destroying the incoming weapon before its terminal solution closes.",
    detail: [
      "Electronic deception buys uncertainty; hard-kill converts that uncertainty into a fragment cloud.",
      "The ship's turret attacks sensors, control surfaces and propulsion, not the warhead casing.",
      "Interception must happen far enough away that debris and nuclear effects miss the ship.",
      "A successful EVADE is recorded as survival, not as a harmless shot."
    ]
  },
  {
    id: "kinetic",
    label: "KINETIC",
    aliases: ["KINETIC", "KINETICS"],
    short: "Using mass and relative velocity as the destructive mechanism.",
    detail: [
      "Point defense fires inert, dense projectiles at extreme cadence.",
      "Nothing needs to explode: at closing velocity, a small penetrator can tear guidance or coolant hardware apart.",
      "Kinetic fire is cheap enough to practise and heavy enough to store in bulk.",
      "Its weakness is geometry. Projectiles cannot bend after the missile has watched them pass."
    ]
  },
  {
    id: "spiral-zeroing",
    label: "SPIRAL ZEROING",
    aliases: ["SPIRAL ZEROING", "ZEROING"],
    short: "A converging fire-control search that turns observed misses into a solved intercept.",
    detail: [
      "Tracer telemetry reports where each burst crossed the target plane.",
      "The turret lays the next burst closer, rotating the error vector so a jink cannot hide on one side.",
      "The spiral shrinks faster than a conventional human correction loop could follow.",
      "Missile guidance survives by changing the plane—or by attacking from outside the turret's travel."
    ]
  },
  {
    id: "tracer",
    label: "TRACER",
    aliases: ["TRACER FIRE", "TRACER", "TRACERS"],
    short: "Instrumented rounds that make the miss visible to the gun which fired it.",
    detail: [
      "A 2079 tracer is not merely a glowing bullet.",
      "Its emitter and timed breakup report the actual stream against the predicted target plane.",
      "Mixed into every burst, tracers let fire control correct barrel flex, thermal drift and ship rotation in real time.",
      "They also reveal the stream to the missile. The contest is computational, not visual."
    ]
  },
  {
    id: "turret",
    label: "TURRET",
    aliases: ["SINGLE TURRET", "TURRET", "TURRETS"],
    short: "The ship's only fast-traverse hard-kill mount—and therefore its defensive bottleneck.",
    detail: [
      "One turret saves mass, ammunition paths and fire-control duplication.",
      "It can saturate one solved volume but cannot look through the hull, tanks or radiator roots.",
      "The ship manoeuvres to serve the gun; the gun does not make the ship spherical.",
      "A second independent attack axis converts a powerful weapon into a scheduling problem with no solution."
    ]
  },
  {
    id: "blind-angle",
    label: "BLIND ANGLE",
    aliases: ["BLIND ANGLE", "BLIND ANGLES", "BLIND CONE", "BLIND CONES"],
    short: "A direction the defensive turret cannot safely reach through its own ship.",
    detail: [
      "Docking stores, radiator roots and the drive spine block different arcs as the ship changes configuration.",
      "Missile-drones continuously recompute the cheapest terminal path into those shadows.",
      "EVADE is the burn that moves the shadow away from the missile.",
      "No available ΔV means the attacker owns the approach."
    ]
  },
  {
    id: "missile-drone",
    label: "MISSILE-DRONE",
    aliases: ["MISSILE-DRONE", "MISSILE-DRONES", "DRONE MISSILE", "DRONE MISSILES"],
    short: "A nuclear terminal vehicle smart enough to fight the ship defending itself.",
    detail: [
      "Each round carries navigation, optical sensing, electronic attack and a compact independent drive.",
      "It does not chase the ship's present position. It searches for a terminal geometry the turret cannot cover.",
      "The drone watches defensive tracers and spends its own reserve on late jinks.",
      "A ship carries roughly ten to twelve. Magazine depth is campaign time."
    ]
  },
  {
    id: "warhead",
    label: "WARHEAD",
    aliases: ["WARHEAD", "WARHEADS", "WEAPONS PACKAGE", "WEAPONS PACKAGES"],
    short:
      "The terminal package; nuclear because a miss in open space otherwise leaves too much survivable volume.",
    detail: [
      "The missile seeks a close geometry, not a cinematic hull impact.",
      "Prompt radiation, flash heating and debris couple across the last defensive miss distance.",
      "Yield is deliberately limited near valuable infrastructure; precision substitutes for indiscriminate scale.",
      "Inside the protected corridor, carrying the package is tolerated. Arming it is not."
    ]
  },
  {
    id: "docking-spine",
    label: "DOCKING SPINE",
    aliases: ["DOCKING SPINE", "DOCKING STRUCTURE", "DOCKING"],
    short:
      "The ship's structural centre: berth, cargo interface and attachment rail for unfinished hulls.",
    detail: [
      "A combat ship is assembled around a non-rotating spine carrying docking collars and tritium canister racks.",
      "Habitation, weapons, reactor and radiators attach as replaceable modules.",
      "The spine can berth a stored hull while reserve crew bring its systems online.",
      "This modularity makes SHIPYARD production fast—and gives targeting software a stable map of weak arcs."
    ]
  },
  {
    id: "tritium-canister",
    label: "TRITIUM CANISTER",
    aliases: ["TRITIUM CANISTER", "TRITIUM CANISTERS", "CANISTER", "CANISTERS"],
    short: "A shielded, monitored fuel vessel designed to leak slowly and be replaced quickly.",
    detail: [
      "Tritium permeates metals, decays continuously and must be accounted for atom by atom.",
      "Canisters remain outside the main pressure hull on isolated docking racks.",
      "Their contents are small in mass and enormous in operational value.",
      "Faction accounts aggregate certified canisters and reaction mass into one spendable ΔV reserve."
    ]
  },
  {
    id: "weapons-module",
    label: "WEAPONS MODULE",
    aliases: ["WEAPONS MODULE", "WEAPON MODULE", "WEAPONS MODULES", "WEAPON MODULES"],
    short: "A replaceable combat section containing the turret, magazine and firing sensors.",
    detail: [
      "The module carries one rapid-fire point-defense turret and ten to twelve missile-drones.",
      "It sits forward of the habitation ring so firing debris and a magazine failure vent away from crew.",
      "Dockside cranes can exchange the entire section faster than technicians can service it in place.",
      "A hull without one can travel. It cannot survive the war."
    ]
  },
  {
    id: "life-support",
    label: "LIFE SUPPORT",
    aliases: ["LIFE SUPPORT", "HABITATION", "HABITATION MODULE"],
    short: "A closed-loop system sized for the active crew and the reserve crews not yet launched.",
    detail: [
      "Water and oxygen recycle; food, filters and medical stock determine mission endurance.",
      "The first ship carries reserve complements for hulls expected to be commissioned during the operation.",
      "Storm shelter, bunks and exercise volume are shared by people who may later become separate crews.",
      "When the reserve departs, living space increases. Redundancy decreases."
    ]
  },
  {
    id: "commissioning",
    label: "COMMISSIONING",
    aliases: ["COMMISSIONING", "COMMISSIONED", "COMMISSION", "COMMISSIONS"],
    short:
      "Turning a stored hull into an independent ship by moving people, fuel and authority aboard.",
    detail: [
      "SHIPYARDS hold disassembled hulls, not trained crews.",
      "At completion a reserve complement crosses the docking spine, verifies pressure and assumes its own command keys.",
      "A minimum combat watch is twelve people under heavy automation.",
      "A typical opening ship carries four complements—48 people—to crew itself and three expected outputs."
    ]
  },
  {
    id: "crew-reserve",
    label: "CREW RESERVE",
    aliases: ["CREW RESERVE", "CREW RESERVES", "RESERVE CREW", "RESERVE COMPLEMENT"],
    short: "People carried aboard an active ship for vessels the faction has not assembled yet.",
    detail: [
      "Reserve crew are not passengers. They train, maintain stores and stand watches in the parent ship.",
      "A commissioned hull takes one complete twelve-person team: command, flight, reactor, weapons, systems and medicine.",
      "Casualties before launch can strand a perfectly serviceable hull.",
      "Fleet planners absorb this manpower limit into every production schedule."
    ]
  },
  {
    id: "orbital-duel",
    label: "ORBITAL DUEL",
    aliases: ["ORBITAL DUEL", "ORBITAL DUELS", "KNIFE-FIGHT", "KNIFE FIGHT"],
    short:
      "Two ships circling for the other's blind cone while denying the same approach to their own.",
    detail: [
      "At shared-orbit distance, both ships launch probes, spoil firing solutions and kill exposed missiles.",
      "Neither can WORK, FIRE outward or relax its defense: the entire arsenal is holding equilibrium.",
      "That positional fencing costs 2 ΔV per side—more than one ordinary EVADE.",
      "A missile from a supporting ship adds a second vector. The single-turret equilibrium collapses."
    ]
  },
  {
    id: "support-ship",
    label: "SUPPORT SHIP",
    aliases: ["SUPPORT SHIP", "SUPPORT SHIPS", "SUPPORT"],
    short: "The uncontested third vector that turns an orbital lock into a kill.",
    detail: [
      "The two locked ships are already spending thrust and attention against each other.",
      "A support ship fires from outside that geometry, selecting the defensive cone neither duellist can rotate toward.",
      "One missile from the second bearing is more decisive than several from the first.",
      "This is why CONTESTED looks symmetric and resolves asymmetrically."
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
    short:
      "Corporate transport, rescue and security capacity that became a navy by changing its mission.",
    detail: [
      "The first armed hulls were convoy escorts and emergency-response craft, not declared warships.",
      "Their crews remained employees and contractors; their command keys belonged to corporate security offices.",
      "Once the same fleet could protect traffic, deny an orbit and survive retaliation, the label stopped mattering.",
      "No state built an equivalent outer-system force because contracting one had been cheaper."
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
    short: "Coercion engineered to remain below the evidentiary threshold for open retaliation.",
    detail: [
      "Before Saturn, extraction heads failed, guidance tables drifted and cargo departed with incompatible manifests.",
      "Every incident had a technical explanation and a rival that benefited from it.",
      "Autonomous machinery enlarged the grey zone: a model can be corrupted without receiving a readable order to attack.",
      "The first recorded ship kill matters because it ends the useful fiction."
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
    short:
      "The corporate filtration layer between remote telemetry and terrestrial public knowledge.",
    detail: [
      "There are no neutral observers riding a Saturn patrol. Nearly every sensor belongs to one litigant.",
      "Corporations publish enough signed telemetry to accuse rivals and withhold enough context to protect themselves.",
      "Earth receives abundant data, mutually incompatible narratives and no physical crime scene it can secure.",
      "The war is visible in detail and still difficult to narrate honestly."
    ]
  },
  {
    id: "corporation",
    label: "CORPORATION",
    aliases: ["MEGACORPORATION", "MEGACORPORATIONS", "CORPORATION", "CORPORATIONS", "CORPORATE"],
    short:
      "A chartered industrial network whose off-world capacity exceeds any public fleet sent to restrain it.",
    detail: [
      "The 2079 combines are not merely large balance sheets. They own yards, reactors, models, traffic control and trained crews as one stack.",
      "On Earth they remain taxable, suable and vulnerable to arrest.",
      "Beyond Mars their equipment can operate for years without a terrestrial permission server.",
      "Their power is logistical reach, not immunity from law."
    ]
  },
  {
    id: "government",
    label: "GOVERNMENT",
    aliases: ["GOVERNMENT", "GOVERNMENTS", "STATE", "STATES", "SUPERSTATE", "SUPERSTATES"],
    short:
      "Legally sovereign, economically formidable and physically absent from the decisive orbit.",
    detail: [
      "A government does not need equal compute to tax a company, seize terrestrial assets or arrest its directors.",
      "It does need ships, depots and command keys to stop violence near Saturn today.",
      "Public agencies contracted the expansion and allowed the industrial stack to become private.",
      "DeltaV begins when authority discovers that procurement is not possession."
    ]
  },
  {
    id: "jurisdiction",
    label: "JURISDICTION",
    aliases: ["JURISDICTION", "JURISDICTIONS"],
    short: "The authority to judge an act—distinct from the ability to reach the actor.",
    detail: [
      "Registered spacecraft remain under a state's law, and private activity remains attributable to a supervising state.",
      "Murder near Saturn is prosecutable; a warrant can cross space more easily than a marshal.",
      "Competing registries, mixed crews and autonomous weapons complicate venue, not the existence of law.",
      "The crisis is jurisdiction without timely control."
    ]
  },
  {
    id: "space-law",
    label: "SPACE LAW",
    aliases: ["SPACE LAW", "LAW", "LEGAL", "ILLEGAL", "LAWFUL", "UNLAWFUL"],
    short: "A terrestrial legal order extended farther than its enforcement infrastructure.",
    detail: [
      "Treaties prohibit sovereignty claims over celestial bodies and make states responsible for private operators.",
      "Domestic law can recognise ownership of extracted resources without recognising ownership of Saturn.",
      "Ships, cargo, contracts and registered facilities remain property.",
      "The first open kinetic exchange is not lawless. It is evidence arriving before a credible response."
    ]
  },
  {
    id: "private-property",
    label: "PRIVATE PROPERTY",
    aliases: ["PRIVATE PROPERTY", "PROPERTY", "OWNERSHIP", "CLAIM", "CLAIMS"],
    short:
      "Ownership of equipment and recovered material, not sovereignty over the world beneath it.",
    detail: [
      "A combine owns its refinery, drones, fuel and stored hulls.",
      "Its exclusion zone is a safety notification in law and a border in practice.",
      "A rival can dispute the contract while physically occupying the only useful orbit.",
      "DeltaV's territory is therefore access: possession without recognised planetary sovereignty."
    ]
  },
  {
    id: "deterrence",
    label: "DETERRENCE",
    aliases: ["DETERRENCE", "DETER", "DETERS", "RETALIATION"],
    short: "A threatened consequence credible enough to change a decision before violence begins.",
    detail: [
      "Earth can freeze accounts, revoke licences, seize directors and close markets.",
      "Those punishments matter only if the off-world command still values terrestrial assets more than victory.",
      "Physical deterrence requires a force already inside the theatre; one launched after the attack arrives too late.",
      "The Saturn incident reveals that every existing threat was either delayed or mutually unaffordable."
    ]
  },
  {
    id: "sanctions",
    label: "SANCTIONS",
    aliases: ["SANCTIONS", "SANCTION", "EMBARGO", "EMBARGOES", "FINE", "FINES"],
    short: "Fast terrestrial punishment with slow leverage over an autonomous outer-system stack.",
    detail: [
      "Accounts can freeze in hours. Launch licences and export access can disappear in days.",
      "A refinery holding years of spares, local power and local compute does not stop in sympathy.",
      "Sanctions shape the next campaign, ownership trial and return to Earth.",
      "They cannot intercept the missile already coasting."
    ]
  },
  {
    id: "spacecraft-registry",
    label: "SPACECRAFT REGISTRY",
    aliases: ["SPACECRAFT REGISTRY", "REGISTRY", "REGISTRATION", "REGISTERED"],
    short:
      "The legal thread connecting a distant hull to one state and one chain of responsibility.",
    detail: [
      "Registration identifies jurisdiction, supervising authority and liability for the space object.",
      "Corporate groups exploit flags, subsidiaries and modular transfers, but a warship cannot become legally ownerless by changing paint.",
      "The first Saturn case begins with telemetry and registry records.",
      "The argument is over whose failure of supervision came first."
    ]
  },
  {
    id: "earth-moon-corridor",
    label: "EARTH-MOON CORRIDOR",
    aliases: ["EARTH-MOON CORRIDOR", "EARTH MOON CORRIDOR", "PROTECTED CORRIDOR", "CORRIDOR"],
    short: "The only volume where law, sensors and interceptors still arrive on the same clock.",
    detail: [
      "Earth and lunar traffic is continuously registered, inspected and tracked.",
      "Nuclear packages remain safed; hostile guidance locks trigger public and corporate interceptors alike.",
      "Protection is credible because force is already present, not because every actor is peaceful.",
      "Beyond the corridor, the same rules outrun the ships assigned to enforce them."
    ]
  },
  {
    id: "interdiction",
    label: "INTERDICTION",
    aliases: ["INTERDICTED ZONES", "INTERDICTION", "INTERDICTED", "INTERDICTS", "UNSANCTIONED"],
    short: "A prohibition backed by the ability to inspect, divert or disable traffic.",
    detail: [
      "Near Earth, sensors see launches before payloads can hide and interceptors are measured in hours away.",
      "The corridor's ban on armed nuclear operation is therefore physical as well as legal.",
      "At Saturn a prohibition without a stationed force becomes a future prosecution.",
      "DeltaV begins outside the radius of immediate interdiction."
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
    short: "The first openly attributable destruction beyond the protected corridor.",
    detail: [
      "No registered operator has previously used a ship weapon against another registered vessel.",
      "The incident begins when one ship deliberately closes a firing solution and the complete telemetry survives.",
      "Authorities classify the record as intentional lethal action while the event is still in progress.",
      "That timestamp is the first confirmed armed exchange in the incident record."
    ]
  },
  {
    id: "saturn-incident",
    label: "SATURN INCIDENT",
    aliases: ["SATURN INCIDENT", "FIRST SATURN EXCHANGE", "FIRST KINETIC EXCHANGE"],
    short:
      "The recorded shot that converted corporate competition into interplanetary armed conflict.",
    detail: [
      "One ship died; dozens of people and a registry trail died with it.",
      "The attacker called it protection of an extraction zone. The target's state called it murder.",
      "Both statements reached Earth roughly eighty minutes later.",
      "The fleets were already executing the next transfer."
    ]
  },
  {
    id: "local-command",
    label: "LOCAL COMMAND",
    aliases: ["LOCAL COMMAND", "LOCAL AUTHORITY", "AUTONOMOUS", "AUTONOMY"],
    short: "Decision authority placed where light-time cannot turn every emergency into a request.",
    detail: [
      "Outer-system crews receive objectives, legal constraints and cryptographic authorities before deployment.",
      "They do not ask Earth to approve every burn, intercept or defensive shot.",
      "AI maintains the tactical picture; humans remain responsible for lethal release.",
      "Local discretion keeps ships alive and lets a crisis outrun its owners."
    ]
  },
  {
    id: "attribution",
    label: "ATTRIBUTION",
    aliases: ["ATTRIBUTION", "ATTRIBUTED", "ATTRIBUTABLE", "EVIDENCE"],
    short:
      "The work of proving who commanded a weapon after every interested system has edited the story.",
    detail: [
      "Burn signatures, tracer timing, registry keys and optical baselines make a space engagement difficult to hide.",
      "They do not prove which director, crew member or model authorised it.",
      "The corporations release incompatible logs while retaining enough truth to deter fabrication by the others.",
      "Earth can know what happened long before it can assign one prosecutable chain of command."
    ]
  }
] as const satisfies readonly GameGlossaryEntry[];
