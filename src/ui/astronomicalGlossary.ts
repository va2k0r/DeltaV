import type { GameGlossaryEntry } from "./gameGlossary";

type AstronomicalGlossaryRecord = Readonly<{
  id: string;
  label: string;
  aliases: readonly string[];
  short: string;
  detail: readonly string[];
}>;

const moonDetail = [
  "Rocky satellite ~4.5 Gyr. R 1,737.4 km; M 7.342 × 10²² kg; g 1.62 m/s²; escape 2.38 km/s.",
  "Distance 384,400 km; e .0549; orbit/rotation 27.3217 d; phase 29.5306 d; synchronous.",
  "Surface 127/-173 °C; polar <-246 °C. He-Ne-Ar exosphere; negligible radiation, impact and thermal shielding.",
  "Iron core; crust 40-60 km; regolith, highlands, maria. Polar ice confirmed; no liquid water/biosphere.",
  "Apollo: 12 surface crew; 382 kg samples. Law: 1967 non-appropriation; 2020 rescue/deconfliction.",
  "2079: PROTECTED; no control/contest/weapons. Population, government, currency, GDP and treaty continuity unspecified.",
  "Economy: 0 TRITIUM/ΔV; no WORK/SHIPYARD. Model: g 0; radius 8; orbit 14 turns; Earth-Moon TURN ~3 d."
] as const;

const astronomicalRecords = [
  {
    id: "sun",
    label: "SUN",
    aliases: ["SUN", "SOL"],
    short: "The 4.6-billion-year-old G-type star containing almost all Solar System mass.",
    detail: [
      "Body class: G2 V main-sequence star.",
      "Age: about 4.6 billion years.",
      "Mean radius: about 696,340 km.",
      "Mass: about 1.989 × 10³⁰ kg.",
      "Share of Solar System mass: about 99.86%.",
      "Photosphere temperature: about 5,500 °C.",
      "Core temperature: about 15 million °C.",
      "Equatorial rotation: about 25 Earth days.",
      "Principal composition: hydrogen and helium plasma.",
      "Energy source: nuclear fusion of hydrogen into helium.",
      "Strategic function: gravity and energy anchor for every heliocentric ORBIT.",
      "Playable node: none."
    ]
  },
  {
    id: "mercury",
    label: "MERCURY",
    aliases: ["MERCURY"],
    short: "The smallest planet and the canonical inner-system SHIPYARD.",
    detail: [
      "Body class: rocky planet.",
      "Mean radius: 2,439.7 km.",
      "Mass: 3.301 × 10²³ kg.",
      "Surface gravity: 3.70 m/s².",
      "Mean solar distance: 0.387 AU.",
      "Orbital period: 87.97 Earth days.",
      "Rotation period: 58.65 Earth days.",
      "Temperature range: about -180 to 430 °C.",
      "Atmosphere: extremely thin exosphere.",
      "Moons: 0. Rings: 0.",
      "Canonical node: SHIPYARD.",
      "Canonical gravity modifier: 1 ΔV.",
      "Canonical construction: one SHIP after five eligible WORK turns."
    ]
  },
  {
    id: "venus",
    label: "VENUS",
    aliases: ["VENUS"],
    short: "A hot, high-pressure rocky planet used as BARREN inner-system staging.",
    detail: [
      "Body class: rocky planet.",
      "Mean radius: 6,051.8 km.",
      "Mass: 4.867 × 10²⁴ kg.",
      "Surface gravity: 8.87 m/s².",
      "Mean solar distance: 0.723 AU.",
      "Orbital period: 224.70 Earth days.",
      "Rotation period: 243 Earth days, retrograde.",
      "Mean surface temperature: about 464 °C.",
      "Surface pressure: about 92 times Earth sea-level pressure.",
      "Atmosphere: mostly carbon dioxide with sulfuric-acid clouds.",
      "Moons: 0. Rings: 0.",
      "Canonical node: BARREN staging.",
      "Canonical gravity modifier: 1 ΔV.",
      "WORK output: none."
    ]
  },
  {
    id: "earth",
    label: "EARTH",
    aliases: ["EARTH"],
    short: "Humanity's origin world and one endpoint of the PROTECTED Earth-Moon corridor.",
    detail: [
      "Body class: rocky planet.",
      "Mean radius: 6,371 km.",
      "Mass: 5.972 × 10²⁴ kg.",
      "Surface gravity: 9.81 m/s².",
      "Mean solar distance: 1 AU.",
      "Sidereal rotation: 23 h 56 min.",
      "Orbital period: 365.256 days.",
      "Surface liquid water coverage: about 71%.",
      "Atmosphere: principally nitrogen and oxygen.",
      "Natural satellites: 1, the MOON.",
      "Known biosphere: extensive.",
      "2079 political status: PROTECTED Earth-Moon corridor.",
      "Playable FACTION control: unavailable.",
      "Weapons: offline.",
      "TRITIUM and SHIPYARD output: none."
    ]
  },
  {
    id: "moon",
    label: "MOON",
    aliases: ["MOON", "LUNA", "LUNAR"],
    short:
      "Earth's tidally locked satellite and the protected corridor's data-dense outer endpoint.",
    detail: moonDetail
  },
  {
    id: "mars",
    label: "MARS",
    aliases: ["MARS", "MARTIAN"],
    short: "A cold rocky planet with two moons and a canonical SHIPYARD.",
    detail: [
      "Body class: rocky planet.",
      "Mean radius: 3,389.5 km.",
      "Mass: 6.417 × 10²³ kg.",
      "Surface gravity: 3.71 m/s².",
      "Mean solar distance: 1.524 AU.",
      "Orbital period: 686.98 Earth days.",
      "Rotation period: 24 h 37 min.",
      "Mean surface temperature: about -63 °C.",
      "Atmosphere: thin, mostly carbon dioxide.",
      "Moons: Phobos and Deimos.",
      "Canonical node: SHIPYARD.",
      "Canonical gravity modifier: 1 ΔV.",
      "SHIPYARD progress is stealable and completes at 5/5."
    ]
  },
  {
    id: "phobos",
    label: "PHOBOS",
    aliases: ["PHOBOS"],
    short: "Mars's larger inner moon, rapidly orbiting and slowly falling inward.",
    detail: [
      "Body class: irregular moon of Mars.",
      "Mean radius: about 11.1 km.",
      "Mean orbital distance from Mars: about 9,376 km from the planet's centre.",
      "Orbital period: about 7 h 39 min.",
      "Rotation: synchronous.",
      "Surface gravity: about 0.0057 m/s².",
      "Atmosphere: none of operational significance.",
      "Long-term motion: spiralling inward toward Mars.",
      "Canonical procedural role: possible tactical moon.",
      "Fixed v10 active node: none."
    ]
  },
  {
    id: "deimos",
    label: "DEIMOS",
    aliases: ["DEIMOS"],
    short: "Mars's small outer moon and a zero-gravity-modifier BARREN staging node.",
    detail: [
      "Body class: irregular moon of Mars.",
      "Mean radius: about 6.2 km.",
      "Mean orbital distance from Mars: about 23,463 km from the planet's centre.",
      "Orbital period: about 30.3 h.",
      "Rotation: synchronous.",
      "Surface gravity: about 0.003 m/s².",
      "Surface: dark, cratered and regolith-covered.",
      "Atmosphere: none of operational significance.",
      "Canonical node: BARREN staging.",
      "Canonical gravity modifier: 0 ΔV.",
      "WORK output: none."
    ]
  },
  {
    id: "jupiter",
    label: "JUPITER",
    aliases: ["JUPITER", "JOVIAN"],
    short: "The largest planet, a hydrogen-helium gas giant and rich TRITIUM anchor.",
    detail: [
      "Body class: gas giant.",
      "Mean radius: 69,911 km.",
      "Mass: 1.898 × 10²⁷ kg.",
      "Equatorial gravity near the one-bar level: about 24.8 m/s².",
      "Mean solar distance: 5.203 AU.",
      "Orbital period: 11.86 Earth years.",
      "Rotation period: about 9 h 56 min.",
      "Atmosphere: principally hydrogen and helium.",
      "Great Red Spot: persistent giant storm system.",
      "Magnetosphere: largest planetary magnetosphere in the Solar System.",
      "Canonical node: TRITIUM.",
      "Canonical gravity modifier: 3 ΔV.",
      "Eligible WORK output: +2 ΔV per TURN.",
      "Local canonical SHIPYARD: none."
    ]
  },
  {
    id: "io",
    label: "IO",
    aliases: ["IO"],
    short:
      "Jupiter's innermost Galilean moon and the Solar System's most volcanically active body.",
    detail: [
      "Body class: rocky moon of Jupiter.",
      "Mean radius: 1,821.6 km.",
      "Orbital period: 1.769 Earth days.",
      "Rotation: synchronous.",
      "Surface gravity: 1.80 m/s².",
      "Surface: sulfur-rich volcanic plains.",
      "Energy source: intense tidal heating.",
      "Radiation environment: severe inside Jupiter's magnetosphere.",
      "Canonical procedural role: possible tactical moon.",
      "Fixed v10 active node: none."
    ]
  },
  {
    id: "europa",
    label: "EUROPA",
    aliases: ["EUROPA"],
    short: "An ice-covered Jovian moon with strong evidence for a global subsurface ocean.",
    detail: [
      "Body class: icy moon of Jupiter.",
      "Mean radius: 1,560.8 km.",
      "Orbital period: 3.551 Earth days.",
      "Rotation: synchronous.",
      "Surface gravity: 1.315 m/s².",
      "Surface: young water-ice shell with few large craters.",
      "Interior: strong evidence for a saltwater ocean beneath the ice.",
      "Radiation environment: severe.",
      "Canonical procedural role: possible productive or tactical moon.",
      "Fixed v10 active node: none."
    ]
  },
  {
    id: "ganymede",
    label: "GANYMEDE",
    aliases: ["GANYMEDE"],
    short:
      "The Solar System's largest moon and the only moon known to generate an intrinsic magnetic field.",
    detail: [
      "Body class: icy-rocky moon of Jupiter.",
      "Mean radius: 2,634.1 km.",
      "Larger in diameter than MERCURY.",
      "Orbital period: 7.155 Earth days.",
      "Rotation: synchronous.",
      "Surface gravity: 1.428 m/s².",
      "Interior: differentiated rock, metal and ice layers.",
      "Magnetic field: intrinsic.",
      "Subsurface water layers are scientifically plausible.",
      "Canonical procedural role: possible tactical moon.",
      "Fixed v10 active node: none."
    ]
  },
  {
    id: "callisto",
    label: "CALLISTO",
    aliases: ["CALLISTO"],
    short: "A heavily cratered outer Galilean moon used as BARREN support near JUPITER.",
    detail: [
      "Body class: icy-rocky moon of Jupiter.",
      "Mean radius: 2,410.3 km.",
      "Orbital period: 16.689 Earth days.",
      "Rotation: synchronous.",
      "Surface gravity: 1.236 m/s².",
      "Surface: ancient and densely cratered.",
      "Radiation exposure: lower than the inner Galilean moons.",
      "Possible interior: subsurface salty ocean.",
      "Canonical node: BARREN staging.",
      "Canonical gravity modifier: 0 ΔV.",
      "Strategic function: support and timing around JUPITER TRITIUM.",
      "WORK output: none."
    ]
  },
  {
    id: "saturn",
    label: "SATURN",
    aliases: ["SATURN", "SATURNIAN"],
    short: "A low-density ringed gas giant and canonical outer-system TRITIUM anchor.",
    detail: [
      "Body class: gas giant.",
      "Mean radius: 58,232 km.",
      "Mass: 5.683 × 10²⁶ kg.",
      "Gravity near the one-bar level: about 10.4 m/s².",
      "Mean solar distance: 9.54 AU.",
      "Orbital period: 29.45 Earth years.",
      "Rotation period: about 10.7 h.",
      "Atmosphere: principally hydrogen and helium.",
      "Rings: extensive water-ice particle system.",
      "Mean density: lower than liquid water.",
      "Canonical node: TRITIUM.",
      "Canonical gravity modifier: 3 ΔV.",
      "Eligible WORK output: +2 ΔV per TURN."
    ]
  },
  {
    id: "titan",
    label: "TITAN",
    aliases: ["TITAN"],
    short: "Saturn's largest moon, with a dense nitrogen atmosphere and canonical SHIPYARD.",
    detail: [
      "Body class: icy-rocky moon of Saturn.",
      "Mean radius: 2,574.7 km.",
      "Orbital period: 15.945 Earth days.",
      "Rotation: synchronous.",
      "Surface gravity: 1.352 m/s².",
      "Atmosphere: dense, mostly nitrogen with methane.",
      "Surface pressure: about 1.5 Earth atmospheres.",
      "Surface temperature: about -179 °C.",
      "Surface liquids: methane and ethane lakes and seas.",
      "Interior: strong evidence for a subsurface water ocean.",
      "Canonical node: SHIPYARD.",
      "Canonical gravity modifier: 1 ΔV.",
      "Canonical construction: one SHIP after five eligible WORK turns."
    ]
  },
  {
    id: "iapetus",
    label: "IAPETUS",
    aliases: ["IAPETUS"],
    short: "A distant two-toned Saturnian moon used as BARREN staging.",
    detail: [
      "Body class: icy moon of Saturn.",
      "Mean radius: about 734.5 km.",
      "Orbital period: about 79.3 Earth days.",
      "Rotation: synchronous.",
      "Surface gravity: about 0.223 m/s².",
      "Surface contrast: dark leading hemisphere and bright trailing terrain.",
      "Equatorial feature: a ridge extending across much of the moon.",
      "Atmosphere: none of operational significance.",
      "Canonical node: BARREN staging.",
      "Canonical gravity modifier: 0 ΔV.",
      "WORK output: none."
    ]
  },
  {
    id: "uranus",
    label: "URANUS",
    aliases: ["URANUS", "URANIAN"],
    short: "A methane-blue ice giant rotating on its side and producing canonical TRITIUM.",
    detail: [
      "Body class: ice giant.",
      "Mean radius: 25,362 km.",
      "Mass: 8.681 × 10²⁵ kg.",
      "Gravity near the one-bar level: about 8.69 m/s².",
      "Mean solar distance: 19.19 AU.",
      "Orbital period: 84.0 Earth years.",
      "Rotation period: about 17 h 14 min, retrograde.",
      "Axial tilt: about 98°.",
      "Atmosphere: hydrogen, helium and methane.",
      "Rings: faint, narrow system.",
      "Canonical node: TRITIUM.",
      "Canonical gravity modifier: 2 ΔV.",
      "Eligible WORK output: +2 ΔV per TURN."
    ]
  },
  {
    id: "titania",
    label: "TITANIA",
    aliases: ["TITANIA"],
    short: "The largest Uranian moon, composed primarily of ice and rock.",
    detail: [
      "Body class: icy-rocky moon of Uranus.",
      "Mean radius: about 788.9 km.",
      "Orbital period: about 8.706 Earth days.",
      "Rotation: synchronous.",
      "Surface gravity: about 0.379 m/s².",
      "Surface: impact craters, faults and large canyons.",
      "Possible interior: subsurface liquid layer is scientifically plausible.",
      "Atmosphere: none of operational significance.",
      "Canonical procedural role: possible productive or tactical moon.",
      "Fixed v10 active node: none."
    ]
  },
  {
    id: "oberon",
    label: "OBERON",
    aliases: ["OBERON"],
    short: "The outermost major Uranian moon and a canonical BARREN staging node.",
    detail: [
      "Body class: icy-rocky moon of Uranus.",
      "Mean radius: about 761.4 km.",
      "Orbital period: about 13.46 Earth days.",
      "Rotation: synchronous.",
      "Surface gravity: about 0.347 m/s².",
      "Surface: old, cratered terrain cut by chasmata.",
      "Atmosphere: none of operational significance.",
      "Canonical node: BARREN staging.",
      "Canonical gravity modifier: 0 ΔV.",
      "Strategic function: support near URANUS TRITIUM.",
      "WORK output: none."
    ]
  },
  {
    id: "neptune",
    label: "NEPTUNE",
    aliases: ["NEPTUNE", "NEPTUNIAN"],
    short: "A cold, fast-wind ice giant and the outer canonical TRITIUM anchor.",
    detail: [
      "Body class: ice giant.",
      "Mean radius: 24,622 km.",
      "Mass: 1.024 × 10²⁶ kg.",
      "Gravity near the one-bar level: about 11.15 m/s².",
      "Mean solar distance: 30.07 AU.",
      "Orbital period: 164.8 Earth years.",
      "Rotation period: about 16 h.",
      "Atmosphere: hydrogen, helium and methane.",
      "Weather: the fastest measured planetary winds exceed 2,000 km/h.",
      "Rings: faint and dusty.",
      "Canonical node: TRITIUM.",
      "Canonical gravity modifier: 2 ΔV.",
      "Eligible WORK output: +2 ΔV per TURN."
    ]
  },
  {
    id: "triton-body",
    label: "TRITON",
    aliases: ["TRITON"],
    short: "Neptune's large retrograde moon and a canonical BARREN staging node.",
    detail: [
      "Body class: icy moon of Neptune.",
      "Mean radius: 1,353.4 km.",
      "Orbital period: about 5.877 Earth days.",
      "Orbit direction: retrograde.",
      "Rotation: synchronous.",
      "Surface gravity: about 0.779 m/s².",
      "Surface temperature: about -235 °C.",
      "Atmosphere: extremely thin nitrogen.",
      "Active geology: nitrogen geyser-like plumes have been observed.",
      "Probable origin: captured Kuiper Belt object.",
      "Canonical node: BARREN staging.",
      "Canonical gravity modifier: 1 ΔV.",
      "WORK output: none."
    ]
  },
  {
    id: "pluto-charon",
    label: "PLUTO/CHARON",
    aliases: ["PLUTO/CHARON", "PLUTO", "CHARON"],
    short: "A tidally locked dwarf-planet binary hosting the canonical outer SHIPYARD.",
    detail: [
      "System class: dwarf planet and dominant moon, often treated as a binary pair.",
      "Pluto mean radius: 1,188.3 km.",
      "Charon mean radius: 606 km.",
      "Pluto mass: 1.303 × 10²² kg.",
      "Charon mass: 1.586 × 10²¹ kg.",
      "Mean separation: about 19,600 km between centres.",
      "Mutual orbital period: 6.387 Earth days.",
      "Rotation state: mutually synchronous.",
      "System barycentre: outside Pluto's surface.",
      "Pluto mean solar distance: about 39.5 AU.",
      "Pluto orbital period: about 248 Earth years.",
      "Pluto atmosphere: thin nitrogen, methane and carbon monoxide.",
      "Canonical node: SHIPYARD.",
      "Canonical gravity modifier: 2 ΔV.",
      "Canonical construction: one SHIP after five eligible WORK turns."
    ]
  },
  {
    id: "nix",
    label: "NIX",
    aliases: ["NIX"],
    short: "A small, elongated and chaotically rotating moon of the Pluto-Charon system.",
    detail: [
      "Body class: small irregular moon of Pluto.",
      "Approximate dimensions: 50 × 35 × 33 km.",
      "Mean orbital distance from the system barycentre: about 48,700 km.",
      "Orbital period: about 24.85 Earth days.",
      "Rotation: chaotic, not synchronously locked.",
      "Surface: bright water-ice-rich material.",
      "Atmosphere: none.",
      "Canonical node: BARREN staging.",
      "Canonical gravity modifier: 0 ΔV.",
      "WORK output: none."
    ]
  },
  {
    id: "hydra",
    label: "HYDRA",
    aliases: ["HYDRA"],
    short: "The outer small moon of the Pluto-Charon system and a zero-output BARREN node.",
    detail: [
      "Body class: small irregular moon of Pluto.",
      "Approximate dimensions: 65 × 45 × 25 km.",
      "Mean orbital distance from the system barycentre: about 64,700 km.",
      "Orbital period: about 38.20 Earth days.",
      "Rotation: chaotic, not synchronously locked.",
      "Surface: bright and water-ice-rich.",
      "Atmosphere: none.",
      "Canonical node: BARREN staging.",
      "Canonical gravity modifier: 0 ΔV.",
      "WORK output: none."
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
