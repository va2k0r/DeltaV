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
    short: "The 4.6-billion-year-old star holding almost all Solar System mass.",
    detail: [
      "G2 V main-sequence star; radius about 696,340 km; mass 1.989 × 10³⁰ kg.",
      "Its hydrogen-fusion core heats a 5,500 °C photosphere and supplies nearly every local energy gradient.",
      "Solar gravity sets every heliocentric transfer. Solar weather can blind sensors and charge exposed systems.",
      "No fleet owns the Sun; every fleet plans around it."
    ]
  },
  {
    id: "mercury",
    label: "MERCURY",
    aliases: ["MERCURY"],
    short: "The smallest planet: metal-rich, airless and exposed to extreme solar heat.",
    detail: [
      "Radius 2,439.7 km; gravity 3.70 m/s²; mean solar distance 0.387 AU.",
      "A Mercury year lasts 87.97 Earth days; one rotation takes 58.65 days.",
      "Sunlit terrain reaches about 430 °C while permanent polar shadow preserves water ice.",
      "High solar flux rewards industry that can reject heat; the deep solar gravity well punishes every departure."
    ]
  },
  {
    id: "venus",
    label: "VENUS",
    aliases: ["VENUS"],
    short: "An Earth-sized planet beneath a crushing carbon-dioxide atmosphere.",
    detail: [
      "Radius 6,051.8 km; gravity 8.87 m/s²; mean solar distance 0.723 AU.",
      "Surface temperature averages about 464 °C under roughly 92 Earth atmospheres of pressure.",
      "Sulfuric-acid clouds hide the surface; the planet rotates slowly and retrograde.",
      "Orbital infrastructure avoids the surface penalty but not the planet's gravity."
    ]
  },
  {
    id: "earth",
    label: "EARTH",
    aliases: ["EARTH"],
    short: "Humanity's origin world and the legal, financial and computational centre of 2079.",
    detail: [
      "Radius 6,371 km; gravity 9.81 m/s²; one natural satellite: the MOON.",
      "Oceans cover about 71% of the surface beneath a nitrogen-oxygen atmosphere and the only confirmed biosphere.",
      "Most people, courts, capital markets and corporate headquarters remain here.",
      "Dense tracking and stationed interceptors make near-Earth prohibitions physically credible."
    ]
  },
  {
    id: "moon",
    label: "MOON",
    aliases: ["MOON", "LUNA", "LUNAR"],
    short:
      "Earth's tidally locked satellite and the outer edge of its continuously policed traffic volume.",
    detail: [
      "Radius 1,737.4 km; gravity 1.62 m/s²; mean distance from Earth 384,400 km.",
      "Orbit and rotation both take 27.3217 days. The same hemisphere always faces Earth.",
      "The airless surface spans roughly 127 to -173 °C; permanently shadowed polar craters hold water ice.",
      "By 2079 its registries, sensors and rescue traffic bind lunar space tightly to terrestrial law.",
      "No lunar property claim grants sovereignty over the ground beneath it."
    ]
  },
  {
    id: "mars",
    label: "MARS",
    aliases: ["MARS", "MARTIAN"],
    short: "A cold desert planet with a thin atmosphere and two small moons.",
    detail: [
      "Radius 3,389.5 km; gravity 3.71 m/s²; mean solar distance 1.524 AU.",
      "A day lasts 24 h 37 min; a year lasts 686.98 Earth days.",
      "The carbon-dioxide atmosphere averages less than one percent of Earth sea-level pressure.",
      "Phobos and Deimos provide low-gravity waypoints without changing Mars's deep departure cost."
    ]
  },
  {
    id: "phobos",
    label: "PHOBOS",
    aliases: ["PHOBOS"],
    short: "Mars's larger inner moon, orbiting faster than the planet rotates.",
    detail: [
      "Mean radius about 11.1 km; surface gravity about 0.0057 m/s².",
      "It circles Mars every 7 h 39 min at roughly 9,376 km from the planet's centre.",
      "Tidal interaction is drawing it inward; on astronomical timescales it will break up or strike Mars.",
      "Its irregular body offers almost no natural shielding beyond excavated regolith."
    ]
  },
  {
    id: "deimos",
    label: "DEIMOS",
    aliases: ["DEIMOS"],
    short: "Mars's small outer moon: dark, irregular and barely bound by gravity.",
    detail: [
      "Mean radius about 6.2 km; surface gravity about 0.003 m/s².",
      "It orbits Mars every 30.3 hours at roughly 23,463 km from the planet's centre.",
      "Loose regolith softens its cratered outline and complicates anchoring.",
      "A careless manoeuvre can exceed local escape speed without feeling violent."
    ]
  },
  {
    id: "jupiter",
    label: "JUPITER",
    aliases: ["JUPITER", "JOVIAN"],
    short: "The largest planet, wrapped in hydrogen, storms and a lethal magnetosphere.",
    detail: [
      "Radius 69,911 km; mass 1.898 × 10²⁷ kg; mean solar distance 5.203 AU.",
      "The planet rotates in about 9 h 56 min and completes one orbit in 11.86 Earth years.",
      "Its hydrogen-helium atmosphere contains deuterium feedstock; tritium plants still require processed lithium-6.",
      "Radiation, gravity and enormous moon-system traffic make every approach an infrastructure problem."
    ]
  },
  {
    id: "io",
    label: "IO",
    aliases: ["IO"],
    short: "The Solar System's most volcanically active world.",
    detail: [
      "Radius 1,821.6 km; gravity 1.80 m/s²; orbital period 1.769 Earth days.",
      "Jupiter's tides flex the interior and drive constant sulfur-rich volcanism.",
      "The moon sits deep inside Jupiter's radiation belts.",
      "Heat is plentiful; keeping electronics alive is the expensive part."
    ]
  },
  {
    id: "europa",
    label: "EUROPA",
    aliases: ["EUROPA"],
    short: "An irradiated ice shell above a probable global saltwater ocean.",
    detail: [
      "Radius 1,560.8 km; gravity 1.315 m/s²; orbital period 3.551 Earth days.",
      "Its young water-ice surface shows few large craters and extensive fractured terrain.",
      "Tidal heating likely preserves an ocean beneath the shell.",
      "Any operation must treat planetary-protection evidence and Jovian radiation as separate hazards."
    ]
  },
  {
    id: "ganymede",
    label: "GANYMEDE",
    aliases: ["GANYMEDE"],
    short: "The largest moon and the only one with a known intrinsic magnetic field.",
    detail: [
      "Radius 2,634.1 km—larger than MERCURY—with surface gravity 1.428 m/s².",
      "It orbits Jupiter every 7.155 days and rotates synchronously.",
      "Rock, metal and ice are differentiated; deep liquid-water layers remain plausible.",
      "Its own field carves a small magnetosphere inside Jupiter's much larger one."
    ]
  },
  {
    id: "callisto",
    label: "CALLISTO",
    aliases: ["CALLISTO"],
    short:
      "A heavily cratered outer Galilean moon with a comparatively mild radiation environment.",
    detail: [
      "Radius 2,410.3 km; gravity 1.236 m/s²; orbital period 16.689 Earth days.",
      "Its ancient surface preserves impacts erased elsewhere in the Jovian system.",
      "A buried salty ocean is possible beneath the mixed ice-rock interior.",
      "Distance from Jupiter reduces radiation exposure, not communications delay or orbital risk."
    ]
  },
  {
    id: "saturn",
    label: "SATURN",
    aliases: ["SATURN", "SATURNIAN"],
    short:
      "A ringed gas giant whose distant industrial traffic became the first theatre of open corporate war.",
    detail: [
      "Radius 58,232 km; mean solar distance 9.54 AU; orbital period 29.45 Earth years.",
      "Its hydrogen-helium atmosphere and wide moon system support skimming, tritium production and distributed depots.",
      "The rings are mostly water ice; their beauty conceals a dense navigation and surveillance environment.",
      "In 2079 a registered ship was deliberately destroyed here. Earth learned roughly eighty minutes later.",
      "By the time a physical response could be organised, the local fleets had already chosen the war's next geometry."
    ]
  },
  {
    id: "titan",
    label: "TITAN",
    aliases: ["TITAN"],
    short: "Saturn's largest moon, beneath a dense nitrogen atmosphere and methane weather.",
    detail: [
      "Radius 2,574.7 km; gravity 1.352 m/s²; orbital period 15.945 Earth days.",
      "Surface pressure is about 1.5 Earth atmospheres at roughly -179 °C.",
      "Methane and ethane form clouds, rain, rivers, lakes and seas over water-ice bedrock.",
      "A subsurface water ocean is strongly suspected."
    ]
  },
  {
    id: "iapetus",
    label: "IAPETUS",
    aliases: ["IAPETUS"],
    short: "A distant Saturnian moon split between bright ice and dark terrain.",
    detail: [
      "Mean radius about 734.5 km; gravity about 0.223 m/s²; orbital period about 79.3 days.",
      "Its leading hemisphere is dark while much of the trailing side is bright.",
      "A vast equatorial ridge gives the moon its angular silhouette.",
      "Its distance from Saturn stretches local transfers across an already broad moon system."
    ]
  },
  {
    id: "uranus",
    label: "URANUS",
    aliases: ["URANUS", "URANIAN"],
    short: "A methane-blue ice giant rotating almost on its side.",
    detail: [
      "Radius 25,362 km; mean solar distance 19.19 AU; orbital period 84 Earth years.",
      "Its axial tilt is about 98°, producing extreme seasonal illumination.",
      "The atmosphere is hydrogen, helium and methane above a volatile-rich interior.",
      "At this distance, autonomous industry is ordinary and live terrestrial supervision is impossible."
    ]
  },
  {
    id: "titania",
    label: "TITANIA",
    aliases: ["TITANIA"],
    short: "The largest Uranian moon, an ice-rock body cut by faults and canyons.",
    detail: [
      "Mean radius about 788.9 km; gravity about 0.379 m/s²; orbital period 8.706 days.",
      "Craters, fault scarps and large chasmata record both impacts and internal change.",
      "A buried liquid layer remains scientifically plausible.",
      "Its synchronous rotation keeps one face turned toward Uranus."
    ]
  },
  {
    id: "oberon",
    label: "OBERON",
    aliases: ["OBERON"],
    short: "The outermost major Uranian moon, old and densely cratered.",
    detail: [
      "Mean radius about 761.4 km; gravity about 0.347 m/s²; orbital period 13.46 days.",
      "Dark terrain is cut by bright ejecta and deep chasmata.",
      "It has no atmosphere of operational significance.",
      "The moon rotates synchronously at the edge of Uranus's major satellite system."
    ]
  },
  {
    id: "neptune",
    label: "NEPTUNE",
    aliases: ["NEPTUNE", "NEPTUNIAN"],
    short: "A remote blue ice giant with the fastest measured planetary winds.",
    detail: [
      "Radius 24,622 km; mean solar distance 30.07 AU; orbital period 164.8 Earth years.",
      "Hydrogen, helium and methane wrap a hot volatile-rich interior.",
      "Atmospheric winds exceed 2,000 km/h despite the weak sunlight.",
      "A message to Earth takes roughly four hours one way; machinery and crews act locally."
    ]
  },
  {
    id: "triton-body",
    label: "TRITON",
    aliases: ["TRITON"],
    short: "Neptune's large retrograde moon, probably captured from the Kuiper Belt.",
    detail: [
      "Radius 1,353.4 km; gravity 0.779 m/s²; orbital period 5.877 Earth days.",
      "Its retrograde orbit reveals a history unlike Neptune's regular moons.",
      "The surface is near -235 °C beneath an extremely thin nitrogen atmosphere.",
      "Observed plumes show that even this distant world remains geologically active."
    ]
  },
  {
    id: "pluto-charon",
    label: "PLUTO/CHARON",
    aliases: ["PLUTO/CHARON", "PLUTO", "CHARON"],
    short: "A mutually locked dwarf-planet pair orbiting a point outside Pluto itself.",
    detail: [
      "Pluto radius 1,188.3 km; Charon radius 606 km; mean separation about 19,600 km.",
      "Both rotate once per 6.387-day mutual orbit and permanently face one another.",
      "The barycentre lies outside Pluto, making the pair dynamically closer to a binary world.",
      "At about 39.5 AU, local decisions can be many hours old before Earth sees them."
    ]
  },
  {
    id: "nix",
    label: "NIX",
    aliases: ["NIX"],
    short: "A small, elongated moon tumbling chaotically around Pluto and Charon.",
    detail: [
      "Approximate dimensions 50 × 35 × 33 km; orbital period about 24.85 Earth days.",
      "Its bright surface is rich in water ice.",
      "The Pluto-Charon binary torques Nix into chaotic rather than synchronous rotation.",
      "There is no stable surface day to schedule against."
    ]
  },
  {
    id: "hydra",
    label: "HYDRA",
    aliases: ["HYDRA"],
    short: "The outer small moon of Pluto, bright with water ice and chaotically rotating.",
    detail: [
      "Approximate dimensions 65 × 45 × 25 km; orbital period about 38.20 Earth days.",
      "It travels roughly 64,700 km from the system barycentre.",
      "Like NIX, it tumbles under the binary world's changing torque.",
      "Its weak gravity makes every surface operation an orbital operation in disguise."
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
