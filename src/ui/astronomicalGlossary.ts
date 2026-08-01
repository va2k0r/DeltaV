import type { GameGlossaryEntry } from "./gameGlossary";

type AstronomicalGlossaryRecord = Readonly<{
  id: string;
  label: string;
  aliases: readonly string[];
  short: string;
  detail: readonly string[];
}>;

const astronomicalRecords = [
  {
    id: "sun",
    label: "SUN",
    aliases: ["SUN", "SOL"],
    short: "The 4.6-billion-year-old star that contains almost all the Solar System's mass.",
    detail: [
      "The Sun is a G2 V main-sequence star with a radius of about 696,340 km and a mass of 1.989 × 10³⁰ kg.",
      "Its hydrogen-fusion core heats a 5,500 °C photosphere and supplies nearly every local energy gradient.",
      "Solar gravity sets every heliocentric transfer. Solar weather can blind sensors and charge exposed systems.",
      "The star cannot be controlled as territory, but every fleet must account for its gravity, radiation and changing observation geometry."
    ]
  },
  {
    id: "mercury",
    label: "MERCURY",
    aliases: ["MERCURY"],
    short: "The smallest planet: metal-rich, airless and exposed to extreme solar heat.",
    detail: [
      "Mercury has a radius of 2,439.7 km, surface gravity of 3.70 m/s² and mean solar distance of 0.387 AU.",
      "A Mercury year lasts 87.97 Earth days; one rotation takes 58.65 days.",
      "Sunlit terrain reaches about 430 °C while permanent polar shadow preserves water ice.",
      "High solar flux benefits industry that can reject the resulting heat, while the deep solar gravity well makes departures expensive."
    ]
  },
  {
    id: "venus",
    label: "VENUS",
    aliases: ["VENUS"],
    short: "An Earth-sized planet beneath a crushing carbon-dioxide atmosphere.",
    detail: [
      "Venus has a radius of 6,051.8 km, surface gravity of 8.87 m/s² and mean solar distance of 0.723 AU.",
      "Surface temperature averages about 464 °C under roughly 92 Earth atmospheres of pressure.",
      "Sulfuric-acid clouds hide the surface, and the planet rotates slowly in the direction opposite most other planets.",
      "Infrastructure in orbit avoids the extreme surface environment but must still pay the transfer costs imposed by Venusian gravity."
    ]
  },
  {
    id: "earth",
    label: "EARTH",
    aliases: ["EARTH"],
    short: "Humanity's origin world and the legal, financial and computational centre of 2079.",
    detail: [
      "Earth has a mean radius of 6,371 km, surface gravity of 9.81 m/s² and one natural satellite, the MOON.",
      "Oceans cover about 71% of the surface beneath a nitrogen-oxygen atmosphere and the only confirmed biosphere.",
      "Most people, courts, capital markets and corporate headquarters remain on Earth in 2079.",
      "Dense tracking networks and stationed defense craft allow near-Earth prohibitions to be enforced rather than merely declared."
    ]
  },
  {
    id: "moon",
    label: "MOON",
    aliases: ["MOON", "LUNA", "LUNAR"],
    short:
      "Earth's tidally locked satellite and the outer edge of its continuously policed traffic volume.",
    detail: [
      "The Moon has a radius of 1,737.4 km, surface gravity of 1.62 m/s² and mean distance from Earth of 384,400 km.",
      "Orbit and rotation both take 27.3217 days. The same hemisphere always faces Earth.",
      "The airless surface spans roughly 127 to -173 °C; permanently shadowed polar craters hold water ice.",
      "By 2079, registries, sensors and rescue traffic bind lunar space closely to terrestrial law and enforcement.",
      "Property rights can cover facilities and extracted material, but no lunar claim grants sovereignty over the terrain beneath them."
    ]
  },
  {
    id: "mars",
    label: "MARS",
    aliases: ["MARS", "MARTIAN"],
    short: "A cold desert planet with a thin atmosphere and two small moons.",
    detail: [
      "Mars has a radius of 3,389.5 km, surface gravity of 3.71 m/s² and mean solar distance of 1.524 AU.",
      "A day lasts 24 h 37 min; a year lasts 686.98 Earth days.",
      "The carbon-dioxide atmosphere averages less than one percent of Earth sea-level pressure.",
      "Phobos and Deimos provide low-gravity waypoints within the system, although transfers from Mars itself still pay the planet's deeper gravity cost."
    ]
  },
  {
    id: "phobos",
    label: "PHOBOS",
    aliases: ["PHOBOS"],
    short: "Mars's larger inner moon, orbiting faster than the planet rotates.",
    detail: [
      "Phobos has a mean radius of about 11.1 km and surface gravity of roughly 0.0057 m/s².",
      "It circles Mars every 7 h 39 min at roughly 9,376 km from the planet's centre.",
      "Tidal interaction is drawing it inward; on astronomical timescales it will break up or strike Mars.",
      "The irregular body offers little natural shielding unless facilities are buried beneath excavated regolith."
    ]
  },
  {
    id: "deimos",
    label: "DEIMOS",
    aliases: ["DEIMOS"],
    short: "Mars's small outer moon: dark, irregular and barely bound by gravity.",
    detail: [
      "Deimos has a mean radius of about 6.2 km and surface gravity of roughly 0.003 m/s².",
      "It orbits Mars every 30.3 hours at roughly 23,463 km from the planet's centre.",
      "Loose regolith softens its cratered outline and complicates anchoring.",
      "Its escape speed is low enough for an apparently gentle manoeuvre to send unsecured equipment away from the moon permanently."
    ]
  },
  {
    id: "jupiter",
    label: "JUPITER",
    aliases: ["JUPITER", "JOVIAN"],
    short: "The largest planet, wrapped in hydrogen, storms and a lethal magnetosphere.",
    detail: [
      "Jupiter has a radius of 69,911 km, mass of 1.898 × 10²⁷ kg and mean solar distance of 5.203 AU.",
      "The planet rotates in about 9 h 56 min and completes one orbit in 11.86 Earth years.",
      "Its hydrogen-helium atmosphere contains deuterium feedstock; tritium plants still require processed lithium-6.",
      "Its radiation belts, gravity and extensive moon-system traffic require approaches to be supported by substantial infrastructure."
    ]
  },
  {
    id: "io",
    label: "IO",
    aliases: ["IO"],
    short: "The Solar System's most volcanically active world.",
    detail: [
      "Io has a radius of 1,821.6 km, surface gravity of 1.80 m/s² and orbital period of 1.769 Earth days.",
      "Jupiter's tides flex the interior and drive constant sulfur-rich volcanism.",
      "The moon sits deep inside Jupiter's radiation belts.",
      "Although heat is abundant, radiation shielding and frequent replacement make reliable electronics expensive to maintain."
    ]
  },
  {
    id: "europa",
    label: "EUROPA",
    aliases: ["EUROPA"],
    short: "An irradiated ice shell above a probable global saltwater ocean.",
    detail: [
      "Europa has a radius of 1,560.8 km, surface gravity of 1.315 m/s² and orbital period of 3.551 Earth days.",
      "Its young water-ice surface shows few large craters and extensive fractured terrain.",
      "Tidal heating likely preserves an ocean beneath the shell.",
      "Operations must protect possible biological evidence while separately managing the immediate engineering hazard of Jovian radiation."
    ]
  },
  {
    id: "ganymede",
    label: "GANYMEDE",
    aliases: ["GANYMEDE"],
    short: "The largest moon and the only one with a known intrinsic magnetic field.",
    detail: [
      "Ganymede has a radius of 2,634.1 km, making it larger than MERCURY, and surface gravity of 1.428 m/s².",
      "It orbits Jupiter every 7.155 days and rotates synchronously.",
      "Rock, metal and ice are differentiated; deep liquid-water layers remain plausible.",
      "Its intrinsic field forms a small magnetosphere embedded within the much larger magnetic environment produced by Jupiter."
    ]
  },
  {
    id: "callisto",
    label: "CALLISTO",
    aliases: ["CALLISTO"],
    short:
      "A heavily cratered outer Galilean moon with a comparatively mild radiation environment.",
    detail: [
      "Callisto has a radius of 2,410.3 km, surface gravity of 1.236 m/s² and orbital period of 16.689 Earth days.",
      "Its ancient surface preserves impacts erased elsewhere in the Jovian system.",
      "A buried salty ocean is possible beneath the mixed ice-rock interior.",
      "Its distance from Jupiter reduces radiation exposure, although communication delay and ordinary orbital hazards remain."
    ]
  },
  {
    id: "saturn",
    label: "SATURN",
    aliases: ["SATURN", "SATURNIAN"],
    short:
      "A ringed gas giant whose distant industrial traffic became the first theatre of open corporate war.",
    detail: [
      "Saturn has a radius of 58,232 km, mean solar distance of 9.54 AU and orbital period of 29.45 Earth years.",
      "Its hydrogen-helium atmosphere and wide moon system support skimming, tritium production and distributed depots.",
      "The rings consist mostly of water ice and create a dense environment for navigation, observation and concealment.",
      "In 2079 a registered ship was deliberately destroyed here. Earth learned roughly eighty minutes later.",
      "By the time a physical response could be organised, local fleets had already committed to their next transfers."
    ]
  },
  {
    id: "titan",
    label: "TITAN",
    aliases: ["TITAN"],
    short: "Saturn's largest moon, beneath a dense nitrogen atmosphere and methane weather.",
    detail: [
      "Titan has a radius of 2,574.7 km, surface gravity of 1.352 m/s² and orbital period of 15.945 Earth days.",
      "Surface pressure is about 1.5 Earth atmospheres at roughly -179 °C.",
      "Methane and ethane form clouds, rain, rivers, lakes and seas over water-ice bedrock.",
      "Gravity and rotational measurements also provide strong evidence for a liquid-water ocean beneath the ice."
    ]
  },
  {
    id: "iapetus",
    label: "IAPETUS",
    aliases: ["IAPETUS"],
    short: "A distant Saturnian moon split between bright ice and dark terrain.",
    detail: [
      "Iapetus has a mean radius of about 734.5 km, surface gravity near 0.223 m/s² and orbital period of roughly 79.3 days.",
      "Its leading hemisphere is dark while much of the trailing side is bright.",
      "A vast equatorial ridge gives the moon its angular silhouette.",
      "Its distant orbit around Saturn lengthens transfers across a moon system that is already unusually broad."
    ]
  },
  {
    id: "uranus",
    label: "URANUS",
    aliases: ["URANUS", "URANIAN"],
    short: "A methane-blue ice giant rotating almost on its side.",
    detail: [
      "Uranus has a radius of 25,362 km, mean solar distance of 19.19 AU and orbital period of 84 Earth years.",
      "Its axial tilt is about 98°, producing extreme seasonal illumination.",
      "The atmosphere is hydrogen, helium and methane above a volatile-rich interior.",
      "At this distance, industry must operate autonomously because live supervision from Earth is impossible."
    ]
  },
  {
    id: "titania",
    label: "TITANIA",
    aliases: ["TITANIA"],
    short: "The largest Uranian moon, an ice-rock body cut by faults and canyons.",
    detail: [
      "Titania has a mean radius of about 788.9 km, surface gravity near 0.379 m/s² and orbital period of 8.706 days.",
      "Craters, fault scarps and large chasmata record both impacts and internal change.",
      "A buried liquid layer remains scientifically plausible.",
      "Synchronous rotation keeps the same hemisphere facing Uranus throughout each orbit."
    ]
  },
  {
    id: "oberon",
    label: "OBERON",
    aliases: ["OBERON"],
    short: "The outermost major Uranian moon, old and densely cratered.",
    detail: [
      "Oberon has a mean radius of about 761.4 km, surface gravity near 0.347 m/s² and orbital period of 13.46 days.",
      "Dark terrain is cut by bright ejecta and deep chasmata.",
      "It has no atmosphere of operational significance.",
      "The moon rotates synchronously while travelling near the outer edge of Uranus's major satellite system."
    ]
  },
  {
    id: "neptune",
    label: "NEPTUNE",
    aliases: ["NEPTUNE", "NEPTUNIAN"],
    short: "A remote blue ice giant with the fastest measured planetary winds.",
    detail: [
      "Neptune has a radius of 24,622 km, mean solar distance of 30.07 AU and orbital period of 164.8 Earth years.",
      "Hydrogen, helium and methane wrap a hot volatile-rich interior.",
      "Atmospheric winds exceed 2,000 km/h despite the weak sunlight.",
      "A message takes roughly four hours to reach Earth, so machinery and crews must make operational decisions locally."
    ]
  },
  {
    id: "triton-body",
    label: "TRITON",
    aliases: ["TRITON"],
    short: "Neptune's large retrograde moon, probably captured from the Kuiper Belt.",
    detail: [
      "Triton has a radius of 1,353.4 km, surface gravity of 0.779 m/s² and orbital period of 5.877 Earth days.",
      "Its retrograde orbit reveals a history unlike Neptune's regular moons.",
      "The surface is near -235 °C beneath an extremely thin nitrogen atmosphere.",
      "Observed nitrogen plumes show that geological activity continues despite the moon's distance and low surface temperature."
    ]
  },
  {
    id: "pluto-charon",
    label: "PLUTO/CHARON",
    aliases: ["PLUTO/CHARON", "PLUTO", "CHARON"],
    short: "A mutually locked dwarf-planet pair orbiting a point outside Pluto itself.",
    detail: [
      "Pluto has a radius of 1,188.3 km, Charon 606 km, and their centres remain about 19,600 km apart on average.",
      "Both rotate once per 6.387-day mutual orbit and permanently face one another.",
      "The barycentre lies outside Pluto, making the pair dynamically closer to a binary world.",
      "At roughly 39.5 AU from the Sun, local decisions can be many hours old before telemetry reaches Earth."
    ]
  },
  {
    id: "nix",
    label: "NIX",
    aliases: ["NIX"],
    short: "A small, elongated moon tumbling chaotically around Pluto and Charon.",
    detail: [
      "Nix measures approximately 50 × 35 × 33 km and completes one orbit in about 24.85 Earth days.",
      "Its bright surface is rich in water ice.",
      "The Pluto-Charon binary torques Nix into chaotic rather than synchronous rotation.",
      "Its irregular tumbling prevents surface operations from relying on a stable local day."
    ]
  },
  {
    id: "hydra",
    label: "HYDRA",
    aliases: ["HYDRA"],
    short: "The outer small moon of Pluto, bright with water ice and chaotically rotating.",
    detail: [
      "Hydra measures approximately 65 × 45 × 25 km and completes one orbit in about 38.20 Earth days.",
      "It travels roughly 64,700 km from the system barycentre.",
      "Like NIX, it tumbles under the binary world's changing torque.",
      "Its weak gravity makes anchoring and relative motion central to any activity described as a surface operation."
    ]
  }
] as const satisfies readonly AstronomicalGlossaryRecord[];

export const astronomicalGlossaryEntries = astronomicalRecords.map(
  (record): GameGlossaryEntry => ({
    id: record.id,
    label: record.label,
    aliases: record.aliases,
    short: record.short,
    detail: record.detail
  })
);
