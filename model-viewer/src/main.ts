import * as THREE from "three";
import "./styles.css";
import {
  createRingHexShipModel,
  setRingHexShipRadiatorClockRotation,
  setRingHexShipRadiatorExtension,
  updateRingHexShipModel
} from "./shipModels";

type SceneMode = "ship" | "tritium" | "shipyard" | "evade";
type RadiatorPoseIndex = 0 | 1 | 2;
type StepDirection = -1 | 1;

type ViewerScene = {
  mode: SceneMode;
  ship: THREE.Group;
  orbitRadius: number;
  planetRadius: number;
  orbitPhase: number;
  startedAt: number;
  planet: THREE.Mesh | null;
  tritium: TritiumEffect | null;
  shipyard: ShipyardEffect | null;
  evade: EvadeEffect | null;
};

type TritiumEffect = {
  group: THREE.Group;
  flashes: TritiumFlash[];
  canisters: TritiumCanister[];
  receiverHalo: THREE.Sprite;
  receiverCore: THREE.Sprite;
  receiverLight: THREE.PointLight;
  nextLaunchTime: number;
  launchIndex: number;
};

type TritiumFlash = {
  group: THREE.Group;
  core: THREE.Sprite;
  halo: THREE.Sprite;
  light: THREE.PointLight;
  startTime: number;
  longitude: number;
  latitude: number;
  active: boolean;
};

type TritiumCanister = {
  group: THREE.Group;
  beacon: THREE.Sprite;
  beaconLight: THREE.PointLight;
  startTime: number;
  ascentDuration: number;
  lifetime: number;
  startLongitude: number;
  startLatitude: number;
  startY: number;
  orbitEntryLongitude: number;
  orbitSpeed: number;
  captureStartTime: number;
  captureDuration: number;
  captureStartPosition: THREE.Vector3;
  captureStartScale: number;
  active: boolean;
  capturing: boolean;
};

type ShipyardEffect = {
  group: THREE.Group;
  launchedRing: ShipyardAssemblyRing;
  surfaceFlash: ShipyardSurfaceFlash;
  assemblyPieces: ShipyardAssemblyPiece[];
  assemblyStruts: ShipyardAssemblyStruts;
  launchIndex: number;
  sequenceStep: number;
  enginePushStartTime: number;
  shipPower: number;
};

type ShipyardAssemblyRing = {
  group: THREE.Group;
  launchQuaternion: THREE.Quaternion;
  startTime: number;
  ascentDuration: number;
  settleDuration: number;
  launchLongitude: number;
  bendSign: -1 | 1;
  active: boolean;
};

type ShipyardSurfaceFlash = {
  group: THREE.Group;
  core: THREE.Sprite;
  halo: THREE.Sprite;
  light: THREE.PointLight;
  startTime: number;
  longitude: number;
  active: boolean;
};

type ShipyardAssemblyKind = "fuel-scoop" | "weapons" | "radiator" | "engine";
type ShipyardAssemblyLaunchKind = ShipyardAssemblyKind | "ring";

type ShipyardAssemblyPiece = {
  kind: ShipyardAssemblyKind;
  group: THREE.Group;
  launchQuaternion: THREE.Quaternion;
  startTime: number;
  ascentDuration: number;
  settleDuration: number;
  launchLongitude: number;
  bendSign: -1 | 1;
  baseAxialOffset: number;
  finalAxialOffset: number;
  targetScale: number;
  active: boolean;
};

type ShipyardAssemblyStruts = {
  group: THREE.Group;
  struts: THREE.Mesh[];
  startTime: number;
  active: boolean;
};

type EvadeEffect = {
  group: THREE.Group;
  tracerGroup: THREE.Group;
  muzzleFlash: THREE.Sprite;
  muzzleLight: THREE.PointLight;
  burst: EvadeTracerBurst | null;
  explosion: EvadeNuclearExplosion | null;
};

type EvadeTracerSegment = {
  line: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  material: THREE.LineBasicMaterial;
  startTime: number;
  lifetime: number;
  baseOpacity: number;
};

type EvadeTracerBurst = {
  segments: EvadeTracerSegment[];
  startTime: number;
  burstDuration: number;
  fadeDuration: number;
};

type EvadeNuclearExplosion = {
  group: THREE.Group;
  glare: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  flashPoint: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  afterimage: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  light: THREE.PointLight;
  startTime: number;
  duration: number;
};

type DetachedWake = {
  group: THREE.Object3D;
  velocity: THREE.Vector3;
  materials: Array<{ material: THREE.Material; baseOpacity: number }>;
  age: number;
  duration: number;
};

type RetroRcsParticle = {
  active: boolean;
  age: number;
  lifetime: number;
  velocity: THREE.Vector3;
  baseAlpha: number;
  baseSize: number;
  drag: number;
};

type RetroPuff = {
  group: THREE.Group;
  points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  positions: Float32Array;
  alphas: Float32Array;
  sizes: Float32Array;
  particles: RetroRcsParticle[];
  light: THREE.PointLight;
  ship: THREE.Object3D;
  sourceLocal: THREE.Vector3;
  angularSign: 1 | -1;
  emitAccumulator: number;
  nextParticleIndex: number;
  age: number;
  emissionDuration: number;
  duration: number;
  braking: boolean;
};

type RetroManeuver = {
  active: boolean;
  elapsed: number;
  duration: number;
  accelDuration: number;
  coastDuration: number;
  brakeDuration: number;
  pivotLocal: THREE.Vector3;
  pivotWorldStart: THREE.Vector3;
  baseQuaternion: THREE.Quaternion;
  rotationAxisWorld: THREE.Vector3;
  driftVelocity: THREE.Vector3;
  firstPuffEmitted: boolean;
  secondPuffEmitted: boolean;
  detachedWakes: DetachedWake[];
  puffs: RetroPuff[];
};

const factionColor = 0x9fe8ff;
const sunPosition = new THREE.Vector3(-22, 7.5, -14);
const tritiumSceneShipScale = 0.36;
const shipyardSceneShipScale = tritiumSceneShipScale;
const evadeSceneShipScale = 1.52;
const orbitalSceneAngularSpeed = 0.34;
const tritiumCanisterLaunchCandidateCount = 14;
const tritiumCanisterLaunchAngularSpacing = 0.28;
const tritiumCanisterOrbitAngularSpacing = 0.36;
const tritiumReceiverLocalPoint = new THREE.Vector3(0.148, 0.012, 0);
const evadeFuelScoopLocalPoint = new THREE.Vector3(0.036, 0.082, -0.018);
const evadeFireAxisLocalDirection = new THREE.Vector3(1.18, 0.3, 0.48).normalize();
const evadeTracerCount = 740;
const evadeTracerBurstDuration = 0.28;
const evadeTracerFadeDuration = 4.25;
const evadeTracerRange = 4.78;
const evadeTracerMaxConeRadius = 0.88;
const evadeImpactFlashDurationSeconds = 0.3;
const evadeImpactAfterglowDurationSeconds = 0.86;
const evadeImpactWhiteoutPeakSeconds = 0.018;
const evadeImpactWhiteoutFadeSeconds = 0.095;
const evadeImpactBodyFlashColor = 0xf5fdff;
const shipyardAssemblyRingBaseScale = shipyardSceneShipScale;
const shipyardAssemblyAscentDuration = 3.72;
const shipyardAssemblyModuleAscentDuration = 3.38;
const shipyardAssemblyEngineAscentDuration = 3.06;
const shipyardAssemblyOrbitSettleDuration = 1.42;
const shipyardAssemblyEngineSettleDuration = 1.2;
const shipyardAssemblyRingLaunchDelay = 0.72;
const shipyardAssemblyModuleLaunchDelay = 0.92;
const shipyardAssemblyEngineLaunchDelay = 1.08;
const shipyardAssemblyLaunchDelayJitter = 0.24;
const shipyardAssemblyPushDuration = 3.65;
const shipyardAssemblyLaunchSurfaceScale = 1.035;
const shipyardAssemblyFollowDistance = 0.82;
const shipyardAssemblyFollowZoomDistance = 0.42;
const shipyardAssemblyLaunchTailLeadAngle = 0.18;
const shipyardAssemblyOrbitSettleLagDistance = 0.48;
const shipyardSceneInitialOrbitPhase = 2.18;
const shipyardAssemblyModuleOffsets = {
  fuelScoop: { base: -0.32, final: 0.36, scale: 0.74 },
  weapons: { base: -0.62, final: 0.24, scale: 0.86 },
  radiator: { base: -0.92, final: 0.12, scale: 0.9 },
  engine: { base: -1.26, final: 0, scale: 0.9 }
} as const;
const shipyardAssemblyPushSpacing = 0.12;
const shipyardSurfaceGridTuning = {
  lightIntensity: 0.82,
  lightSideOpacityFloor: 0.34,
  darkSideOpacityBoost: 1.08,
  terminatorGlowBoost: 0.54,
  lightRhythmBpm: 76,
  lightFlicker: 0.18,
  workerPulseBoost: 0.48
} as const;
const app = document.querySelector<HTMLDivElement>("#app");
const isIconCaptureMode = new URLSearchParams(window.location.search).has("icon-capture");

if (app === null) {
  throw new Error("Missing #app root");
}

app.innerHTML = `
  <main class="viewer-root">
    <canvas class="viewer-canvas" aria-label="DeltaV ship model viewer"></canvas>
    <div class="viewer-drive-whiteout is-hidden" aria-hidden="true"></div>
    <div class="viewer-impact-whiteout is-hidden" aria-hidden="true"></div>
    <section class="debug-panel" aria-label="Viewer controls">
      <div class="debug-title">
        <span>DEBUG</span>
        <span>MODEL VIEWER</span>
      </div>
      <div class="debug-control">
        <label for="scene-mode">Scene</label>
        <select id="scene-mode">
          <option value="ship">ship</option>
          <option value="tritium">tritium</option>
          <option value="shipyard">shipyard</option>
          <option value="evade">evade</option>
        </select>
      </div>
      <button id="radiator-pose" class="debug-button" type="button">Radiators: 90°</button>
      <button id="retro-maneuver" class="debug-button" type="button">Retro</button>
      <button id="shipyard-next" class="debug-button" type="button">Next</button>
      <button id="evade-fire" class="debug-button" type="button">Fire</button>
    </section>
    <div class="hud-readout">right drag orbit<br />left drag pan<br />wheel zoom</div>
  </main>
`;

const canvas = document.querySelector<HTMLCanvasElement>(".viewer-canvas");
const sceneSelect = document.querySelector<HTMLSelectElement>("#scene-mode");
const radiatorPoseButtonElement = document.querySelector<HTMLButtonElement>("#radiator-pose");
const retroButtonElement = document.querySelector<HTMLButtonElement>("#retro-maneuver");
const shipyardNextButtonElement = document.querySelector<HTMLButtonElement>("#shipyard-next");
const evadeFireButtonElement = document.querySelector<HTMLButtonElement>("#evade-fire");
const driveWhiteoutElement = document.querySelector<HTMLDivElement>(".viewer-drive-whiteout");
const impactWhiteoutElement = document.querySelector<HTMLDivElement>(".viewer-impact-whiteout");

if (
  canvas === null ||
  sceneSelect === null ||
  radiatorPoseButtonElement === null ||
  retroButtonElement === null ||
  shipyardNextButtonElement === null ||
  evadeFireButtonElement === null ||
  driveWhiteoutElement === null ||
  impactWhiteoutElement === null
) {
  throw new Error("Model viewer UI did not mount");
}

const radiatorPoseButton = radiatorPoseButtonElement;
const retroButton = retroButtonElement;
const shipyardNextButton = shipyardNextButtonElement;
const evadeFireButton = evadeFireButtonElement;
const driveWhiteout = driveWhiteoutElement;
const impactWhiteout = impactWhiteoutElement;

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance"
});
renderer.setClearColor(0x02050a, 1);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x02050a, 0.011);

const camera = new THREE.PerspectiveCamera(44, 1, 0.01, 800);
const root = new THREE.Group();
root.name = "model-viewer-scene-root";
scene.add(root);

const starfield = createStarfield();
scene.add(starfield);

const ambient = new THREE.AmbientLight(0x8fb6c8, 0.17);
scene.add(ambient);

const sunLight = new THREE.DirectionalLight(0xffe3ba, 2.8);
sunLight.position.copy(sunPosition);
scene.add(sunLight);

const coolFill = new THREE.DirectionalLight(0x7ccfff, 0.42);
coolFill.position.set(9, 7, 10);
scene.add(coolFill);

const sunBillboard = createSunBillboard();
scene.add(sunBillboard);

const cameraState = {
  focus: new THREE.Vector3(0, 0, 0),
  yaw: -0.78,
  pitch: 0.46,
  distance: 7.2
};

const pointerState = {
  active: false,
  button: -1,
  lastX: 0,
  lastY: 0
};

const driveWhiteoutStart = new THREE.Vector3();
const driveWhiteoutEnd = new THREE.Vector3();
const driveWhiteoutAxis = new THREE.Vector3();
const driveWhiteoutCameraDirection = new THREE.Vector3();
const driveWhiteoutSegment = new THREE.Vector3();
const driveWhiteoutCameraOffset = new THREE.Vector3();
const driveWhiteoutClosestPoint = new THREE.Vector3();
const driveWhiteoutScreenSample = new THREE.Vector3();
const driveWhiteoutCameraSpacePoint = new THREE.Vector3();
const driveWhiteoutCameraLocalPoint = new THREE.Vector3();
const driveWhiteoutCandidatePoint = new THREE.Vector3();
const driveWhiteoutCandidateCameraPoint = new THREE.Vector3();
const driveWhiteoutCandidateScreenPoint = new THREE.Vector3();
const driveWhiteoutRayDirection = new THREE.Vector3();
const driveWhiteoutRaycaster = new THREE.Raycaster();
const driveWhiteoutBestScreenPoint = new THREE.Vector2(0.5, 0.5);
const impactWhiteoutScreenPoint = new THREE.Vector3();
const retroNoseWorldDirection = new THREE.Vector3();
const retroCameraArcDirection = new THREE.Vector3();
const retroAwaySunDirection = new THREE.Vector3();
const retroDesiredArcDirection = new THREE.Vector3();
const retroRotationQuaternion = new THREE.Quaternion();
const retroPivotOffset = new THREE.Vector3();
const retroPivotWorld = new THREE.Vector3();
const retroPuffDirectionWorld = new THREE.Vector3();
const retroPuffOriginWorld = new THREE.Vector3();
const retroPuffCenterWorld = new THREE.Vector3();
const retroPuffAngularWorld = new THREE.Vector3();
const retroPuffForceWorld = new THREE.Vector3();
const retroPuffLateralAWorld = new THREE.Vector3();
const retroPuffLateralBWorld = new THREE.Vector3();
const retroRcsCandidateLocal = new THREE.Vector3();
const retroRcsCandidateWorld = new THREE.Vector3();
const retroRcsCandidateCenter = new THREE.Vector3();
const retroRcsCandidateRadialWorld = new THREE.Vector3();
const retroRcsCandidateForceWorld = new THREE.Vector3();
const retroRcsCandidateTorqueWorld = new THREE.Vector3();
const retroParticleSourceVelocity = new THREE.Vector3();
const retroParticleVelocity = new THREE.Vector3();
const retroWakeDirectionWorld = new THREE.Vector3();
const retroWakeQuaternion = new THREE.Quaternion();
const tritiumLaunchPoint = new THREE.Vector3();
const tritiumInsertionPoint = new THREE.Vector3();
const tritiumArcControlPoint = new THREE.Vector3();
const tritiumArcExitControlPoint = new THREE.Vector3();
const tritiumLaunchNormal = new THREE.Vector3();
const tritiumBezierA = new THREE.Vector3();
const tritiumBezierB = new THREE.Vector3();
const tritiumBezierC = new THREE.Vector3();
const tritiumCanisterPosition = new THREE.Vector3();
const tritiumCanisterTangent = new THREE.Vector3();
const tritiumOrbitTangent = new THREE.Vector3();
const shipyardLaunchPoint = new THREE.Vector3();
const shipyardLaunchNormal = new THREE.Vector3();
const shipyardLaunchBendTangent = new THREE.Vector3();
const shipyardLaunchControlA = new THREE.Vector3();
const shipyardLaunchControlB = new THREE.Vector3();
const shipyardRingBezierA = new THREE.Vector3();
const shipyardRingBezierB = new THREE.Vector3();
const shipyardRingBezierC = new THREE.Vector3();
const shipyardRingPosition = new THREE.Vector3();
const shipyardRingFollowPosition = new THREE.Vector3();
const shipyardRingFollowTangent = new THREE.Vector3();
const shipyardRingTargetQuaternion = new THREE.Quaternion();
const shipyardRingLaunchQuaternion = new THREE.Quaternion();
const shipyardModulePosition = new THREE.Vector3();
const shipyardModuleFollowPosition = new THREE.Vector3();
const shipyardModuleFollowTangent = new THREE.Vector3();
const shipyardModuleTargetQuaternion = new THREE.Quaternion();
const shipyardModuleLaunchQuaternion = new THREE.Quaternion();
const shipyardStrutStart = new THREE.Vector3();
const shipyardStrutEnd = new THREE.Vector3();
const shipyardStrutDirection = new THREE.Vector3();
const shipyardStrutMidpoint = new THREE.Vector3();
const shipyardStrutOrientation = new THREE.Quaternion();
const evadeMuzzleWorld = new THREE.Vector3();
const evadeTargetWorld = new THREE.Vector3();
const evadeAxisWorld = new THREE.Vector3();
const evadeConeBasisA = new THREE.Vector3();
const evadeConeBasisB = new THREE.Vector3();
const retroRcsBuckleX = 0.086;
const retroRcsBuckleRadius = 0.058;
const retroRcsBuckleAngleStep = Math.PI / 2;

const radiatorPoseValues = [0, 0.5, 1] as const;
const radiatorPoseLabels = ["compact", "90°", "extended"] as const;
const radiatorMotion = {
  poseIndex: 1 as RadiatorPoseIndex,
  from: 0.5,
  value: 0.5,
  target: 0.5,
  elapsed: 1,
  duration: 0.95
};
const radiatorClockworkMotion = {
  active: false,
  from: 0,
  angle: 0,
  target: 0,
  elapsed: 0,
  duration: 0.86,
  wait: 8.5
};
const radiatorAutoMotion = {
  wait: randomBetween(6.2, 9.4),
  direction: 1 as StepDirection,
  rotationsUntilCoupled: 2 + Math.floor(Math.random() * 3),
  rareWait: randomBetween(30, 48)
};
const retroManeuver: RetroManeuver = {
  active: false,
  elapsed: 0,
  duration: 5.25,
  accelDuration: 2.05,
  coastDuration: 0.4,
  brakeDuration: 2.05,
  pivotLocal: new THREE.Vector3(-0.805, 0, 0),
  pivotWorldStart: new THREE.Vector3(),
  baseQuaternion: new THREE.Quaternion(),
  rotationAxisWorld: new THREE.Vector3(0, 1, 0),
  driftVelocity: new THREE.Vector3(),
  firstPuffEmitted: false,
  secondPuffEmitted: false,
  detachedWakes: [],
  puffs: []
};
let viewerScene = buildViewerScene("ship");
let lastTimestamp = performance.now();

sceneSelect.addEventListener("change", () => {
  const nextMode = sceneSelect.value as SceneMode;
  resetRetroManeuver();
  viewerScene = buildViewerScene(nextMode);
  updateRadiatorPoseButton();
  updateRetroButton();
  updateShipyardNextButton();
  updateEvadeFireButton();
});

radiatorPoseButton.addEventListener("click", () => {
  if (!isRadiatorAnimatedScene(viewerScene.mode)) {
    return;
  }

  startRadiatorPoseMotion(
    ((radiatorMotion.poseIndex + 1) % radiatorPoseValues.length) as RadiatorPoseIndex,
    0.95
  );
  radiatorAutoMotion.wait = randomBetween(7.5, 12.5);
});

retroButton.addEventListener("click", () => {
  startRetroManeuver();
});

shipyardNextButton.addEventListener("click", () => {
  startShipyardNextStep();
});

evadeFireButton.addEventListener("click", () => {
  startEvadeFire();
});

canvas.addEventListener("contextmenu", (event) => event.preventDefault());
canvas.addEventListener("pointerdown", (event) => {
  pointerState.active = true;
  pointerState.button = event.button;
  pointerState.lastX = event.clientX;
  pointerState.lastY = event.clientY;
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener("pointermove", (event) => {
  if (!pointerState.active) {
    return;
  }

  const dx = event.clientX - pointerState.lastX;
  const dy = event.clientY - pointerState.lastY;
  pointerState.lastX = event.clientX;
  pointerState.lastY = event.clientY;

  if (pointerState.button === 2) {
    cameraState.yaw -= dx * 0.006;
    cameraState.pitch = clamp(cameraState.pitch + dy * 0.0048, -1.22, 1.22);
  } else if (pointerState.button === 0) {
    panCamera(dx, dy);
  }
});
canvas.addEventListener("pointerup", (event) => {
  pointerState.active = false;
  pointerState.button = -1;
  canvas.releasePointerCapture(event.pointerId);
});
canvas.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    const zoomFactor = Math.exp(event.deltaY * 0.00115);
    cameraState.distance = clamp(cameraState.distance * zoomFactor, 1.55, 42);
  },
  { passive: false }
);

window.addEventListener("resize", resize);
updateRadiatorPoseButton();
updateRetroButton();
updateShipyardNextButton();
updateEvadeFireButton();
resize();
requestAnimationFrame(animate);

function buildViewerScene(mode: SceneMode): ViewerScene {
  clearGroup(root);

  const ship = createRingHexShipModel({
    factionColor,
    state: mode === "ship" && !isIconCaptureMode ? "burn" : "idle"
  });
  ship.name = "viewer-ring-hex-ship";
  ship.userData["viewerDriveWakePower"] = mode === "ship" ? 1 : 0;
  setRingHexShipRadiatorExtension(ship, getSceneRadiatorExtension(mode));
  root.add(ship);

  let planet: THREE.Mesh | null = null;
  let tritium: TritiumEffect | null = null;
  let shipyard: ShipyardEffect | null = null;
  let evade: EvadeEffect | null = null;
  let orbitRadius = 0;
  let planetRadius = 0;
  const orbitPhase = mode === "shipyard" ? shipyardSceneInitialOrbitPhase : 0;
  const startedAt = mode === "shipyard" ? performance.now() / 1000 : 0;

  if (mode === "ship") {
    ship.scale.setScalar(2.15);
    ship.rotation.set(0.12, 0.72, -0.14);
    cameraState.focus.set(0, 0, 0);
    cameraState.distance = isIconCaptureMode ? 5.2 : 9.2;
    cameraState.yaw = isIconCaptureMode ? 2.16 : -0.98;
    cameraState.pitch = isIconCaptureMode ? 0.4 : 0.34;
  } else if (mode === "evade") {
    ship.scale.setScalar(evadeSceneShipScale);
    ship.position.set(-1.46, -0.16, -0.12);
    ship.rotation.set(0.08, 0.64, -0.08);
    setRingHexShipRadiatorExtension(ship, 0.5);
    evade = createEvadeEffect();
    root.add(evade.group);
    cameraState.focus.set(1.55, 0.38, 0.42);
    cameraState.distance = 8.05;
    cameraState.yaw = -0.94;
    cameraState.pitch = 0.28;
  } else {
    planetRadius = mode === "tritium" ? 2.25 : 2.55;
    orbitRadius = mode === "tritium" ? 4.38 : 4.95;
    planet = createPlanet(mode, planetRadius);
    root.add(planet);
    root.add(createOrbitLine(orbitRadius, mode === "tritium" ? 0x6befff : 0xc982ff, 0.24));
    ship.scale.setScalar(mode === "shipyard" ? shipyardSceneShipScale : tritiumSceneShipScale);
    tritium = mode === "tritium" ? createTritiumEffect() : null;
    shipyard = mode === "shipyard" ? createShipyardEffect() : null;

    if (tritium !== null) {
      root.add(tritium.group);
    }

    if (shipyard !== null) {
      root.add(shipyard.group);
    }

    cameraState.focus.set(0, 0.34, 0);
    cameraState.distance = mode === "tritium" ? 9.4 : 10.2;
    cameraState.yaw = mode === "tritium" ? -0.7 : -0.95;
    cameraState.pitch = 0.48;
  }

  return {
    mode,
    ship,
    orbitRadius,
    planetRadius,
    orbitPhase,
    startedAt,
    planet,
    tritium,
    shipyard,
    evade
  };
}

function animate(timestamp: number): void {
  const elapsed = timestamp / 1000;
  const delta = Math.min(0.05, (timestamp - lastTimestamp) / 1000);
  lastTimestamp = timestamp;

  updateRadiatorMotion(delta);
  updateRadiatorClockworkMotion(delta);
  updateSceneAnimation(viewerScene, elapsed, delta);
  updateShipyardNextButton();
  updateEvadeFireButton();
  updateCamera();
  updateDriveWhiteout(viewerScene, elapsed);
  updateEvadeImpactWhiteout(viewerScene, elapsed);
  starfield.rotation.y = cameraState.yaw * 0.035;
  sunBillboard.position.copy(sunPosition).multiplyScalar(0.72);
  sunBillboard.lookAt(camera.position);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function updateRadiatorPoseButton(): void {
  const lockedOpen = !isRadiatorAnimatedScene(viewerScene.mode);
  const label =
    viewerScene.mode === "evade"
      ? radiatorPoseLabels[1]
      : lockedOpen
        ? "extended"
        : radiatorPoseLabels[radiatorMotion.poseIndex];
  radiatorPoseButton.textContent = `Radiators: ${label}`;
  radiatorPoseButton.disabled = lockedOpen;
}

function updateRetroButton(): void {
  retroButton.disabled = viewerScene.mode !== "ship" || retroManeuver.active;
  retroButton.textContent = retroManeuver.active ? "Retro: firing" : "Retro";
  retroButton.classList.toggle("is-active", retroManeuver.active);
}

function updateShipyardNextButton(): void {
  const isShipyard = viewerScene.mode === "shipyard";
  const assemblyActive =
    viewerScene.shipyard?.launchedRing.active === true ||
    (viewerScene.shipyard?.assemblyPieces.some((piece) => piece.active) ?? false);
  shipyardNextButton.disabled = !isShipyard;
  shipyardNextButton.textContent = "Next";
  shipyardNextButton.classList.toggle("is-active", isShipyard && assemblyActive);
}

function updateEvadeFireButton(): void {
  const isEvade = viewerScene.mode === "evade";
  const burstActive = isEvade && viewerScene.evade?.burst !== null;
  evadeFireButton.disabled = !isEvade;
  evadeFireButton.textContent = burstActive ? "Fire: firing" : "Fire";
  evadeFireButton.classList.toggle("is-active", burstActive);
}

function isRadiatorAnimatedScene(mode: SceneMode): boolean {
  return mode === "ship" || mode === "tritium";
}

function startRadiatorPoseMotion(poseIndex: RadiatorPoseIndex, duration: number): boolean {
  if (!isRadiatorAnimatedScene(viewerScene.mode) || poseIndex === radiatorMotion.poseIndex) {
    return false;
  }

  radiatorMotion.poseIndex = poseIndex;
  radiatorMotion.from = radiatorMotion.value;
  radiatorMotion.target = radiatorPoseValues[poseIndex];
  radiatorMotion.elapsed = 0;
  radiatorMotion.duration = duration;
  updateRadiatorPoseButton();
  return true;
}

function startRadiatorStep(preferredDirection: StepDirection, duration: number): boolean {
  let nextIndex = radiatorMotion.poseIndex + preferredDirection;

  if (nextIndex < 0 || nextIndex >= radiatorPoseValues.length) {
    nextIndex = radiatorMotion.poseIndex - preferredDirection;
  }

  if (nextIndex < 0 || nextIndex >= radiatorPoseValues.length) {
    return false;
  }

  radiatorAutoMotion.direction = nextIndex > radiatorMotion.poseIndex ? 1 : -1;
  return startRadiatorPoseMotion(nextIndex as RadiatorPoseIndex, duration);
}

function startRadiatorFullTravel(duration: number): boolean {
  if (radiatorMotion.poseIndex === 1) {
    return false;
  }

  const nextIndex = radiatorMotion.poseIndex === 0 ? 2 : 0;
  radiatorAutoMotion.direction = nextIndex > radiatorMotion.poseIndex ? 1 : -1;
  return startRadiatorPoseMotion(nextIndex, duration);
}

function isRadiatorMoving(): boolean {
  return radiatorMotion.elapsed < radiatorMotion.duration;
}

function updateRadiatorMotion(delta: number): void {
  if (radiatorMotion.elapsed < radiatorMotion.duration) {
    radiatorMotion.elapsed = Math.min(radiatorMotion.duration, radiatorMotion.elapsed + delta);
    const progress = radiatorMotion.elapsed / radiatorMotion.duration;
    const eased = easeInOutBack(progress);
    radiatorMotion.value = THREE.MathUtils.lerp(radiatorMotion.from, radiatorMotion.target, eased);
  } else {
    radiatorMotion.value = radiatorMotion.target;
  }

  setRingHexShipRadiatorExtension(viewerScene.ship, getSceneRadiatorExtension(viewerScene.mode));
}

function getSceneRadiatorExtension(mode: SceneMode): number {
  if (mode === "evade") {
    return radiatorPoseValues[1];
  }

  return isRadiatorAnimatedScene(mode) ? radiatorMotion.value : 1;
}

function updateRadiatorClockworkMotion(delta: number): void {
  if (!isRadiatorAnimatedScene(viewerScene.mode)) {
    return;
  }

  if (retroManeuver.active) {
    setRingHexShipRadiatorClockRotation(viewerScene.ship, radiatorClockworkMotion.angle);
    return;
  }

  if (radiatorClockworkMotion.active) {
    radiatorClockworkMotion.elapsed = Math.min(
      radiatorClockworkMotion.duration,
      radiatorClockworkMotion.elapsed + delta
    );
    const progress = radiatorClockworkMotion.elapsed / radiatorClockworkMotion.duration;
    const eased = easeOutBack(progress);
    radiatorClockworkMotion.angle = THREE.MathUtils.lerp(
      radiatorClockworkMotion.from,
      radiatorClockworkMotion.target,
      eased
    );

    if (radiatorClockworkMotion.elapsed >= radiatorClockworkMotion.duration) {
      radiatorClockworkMotion.active = false;
      radiatorClockworkMotion.angle = radiatorClockworkMotion.target;
      radiatorClockworkMotion.wait = randomBetween(7, 11);
    }
  } else {
    radiatorClockworkMotion.wait -= delta;
    radiatorAutoMotion.wait -= delta;
    radiatorAutoMotion.rareWait -= delta;

    if (radiatorClockworkMotion.wait <= 0) {
      startRadiatorClockworkTurn();
    } else if (radiatorAutoMotion.wait <= 0) {
      startIndependentRadiatorMotion();
    }
  }

  setRingHexShipRadiatorClockRotation(viewerScene.ship, radiatorClockworkMotion.angle);
}

function startRadiatorClockworkTurn(): void {
  const direction: StepDirection = Math.random() < 0.5 ? -1 : 1;
  const canDoFullTravel =
    radiatorAutoMotion.rareWait <= 0 && radiatorMotion.poseIndex !== 1 && !isRadiatorMoving();
  const quarterTurns = canDoFullTravel ? 2 : 1;
  const duration = canDoFullTravel ? randomBetween(1.55, 1.95) : randomBetween(0.86, 1.14);
  let coupledRadiators = false;

  radiatorClockworkMotion.active = true;
  radiatorClockworkMotion.from = radiatorClockworkMotion.angle;
  radiatorClockworkMotion.target += direction * (Math.PI / 2) * quarterTurns;
  radiatorClockworkMotion.elapsed = 0;
  radiatorClockworkMotion.duration = duration;

  if (canDoFullTravel) {
    coupledRadiators = startRadiatorFullTravel(duration);

    if (coupledRadiators) {
      radiatorAutoMotion.rareWait = randomBetween(34, 56);
      radiatorAutoMotion.rotationsUntilCoupled = 2 + Math.floor(Math.random() * 3);
    }
  } else {
    radiatorAutoMotion.rotationsUntilCoupled -= 1;

    if (radiatorAutoMotion.rotationsUntilCoupled <= 0 && !isRadiatorMoving()) {
      coupledRadiators = startRadiatorStep(direction, duration);

      if (coupledRadiators) {
        radiatorAutoMotion.rotationsUntilCoupled = 2 + Math.floor(Math.random() * 3);
      }
    }
  }

  radiatorAutoMotion.wait = coupledRadiators
    ? randomBetween(8.5, 13.5)
    : Math.max(radiatorAutoMotion.wait, randomBetween(3.8, 6.4));
}

function startIndependentRadiatorMotion(): void {
  if (isRadiatorMoving()) {
    radiatorAutoMotion.wait = randomBetween(2.6, 4.4);
    return;
  }

  if (startRadiatorStep(radiatorAutoMotion.direction, randomBetween(0.92, 1.24))) {
    radiatorAutoMotion.direction = radiatorAutoMotion.direction === 1 ? -1 : 1;
    radiatorClockworkMotion.wait = Math.max(radiatorClockworkMotion.wait, randomBetween(2.8, 5));
  }

  radiatorAutoMotion.wait = randomBetween(7.8, 12.8);
}

function startRetroManeuver(): void {
  if (viewerScene.mode !== "ship" || retroManeuver.active) {
    return;
  }

  const ship = viewerScene.ship;
  const pivotX = getNumericUserData(ship, "shipEnginePivotX") || -0.805;
  retroManeuver.active = true;
  retroManeuver.elapsed = 0;
  retroManeuver.pivotLocal.set(pivotX, 0, 0);
  retroManeuver.pivotWorldStart.copy(retroManeuver.pivotLocal);
  ship.localToWorld(retroManeuver.pivotWorldStart);
  retroManeuver.baseQuaternion.copy(ship.quaternion);
  retroManeuver.firstPuffEmitted = false;
  retroManeuver.secondPuffEmitted = false;

  retroNoseWorldDirection.set(1, 0, 0).applyQuaternion(ship.quaternion).normalize();
  retroCameraArcDirection.copy(camera.position).sub(retroManeuver.pivotWorldStart).normalize();
  retroAwaySunDirection.copy(retroManeuver.pivotWorldStart).sub(sunPosition).normalize();
  retroDesiredArcDirection
    .copy(retroCameraArcDirection)
    .multiplyScalar(0.74)
    .addScaledVector(retroAwaySunDirection, 0.26);
  retroDesiredArcDirection.addScaledVector(
    retroNoseWorldDirection,
    -retroDesiredArcDirection.dot(retroNoseWorldDirection)
  );

  if (retroDesiredArcDirection.lengthSq() < 0.0001) {
    retroDesiredArcDirection.set(0, 1, 0).applyQuaternion(ship.quaternion);
  }

  retroDesiredArcDirection.normalize();
  retroManeuver.rotationAxisWorld
    .crossVectors(retroNoseWorldDirection, retroDesiredArcDirection)
    .normalize();

  if (retroManeuver.rotationAxisWorld.lengthSq() < 0.0001) {
    retroManeuver.rotationAxisWorld.set(0, 0, 1).applyQuaternion(ship.quaternion).normalize();
  }

  retroManeuver.driftVelocity.copy(retroNoseWorldDirection).multiplyScalar(0.16);
  detachDriveWake(ship);
  startRetroRcsEmitter(ship, false);
  retroManeuver.firstPuffEmitted = true;
  ship.userData["viewerDriveWakePower"] = 0;
  updateRetroButton();
}

function startShipyardNextStep(): void {
  if (viewerScene.mode !== "shipyard" || viewerScene.shipyard === null) {
    return;
  }

  const effect = viewerScene.shipyard;
  const elapsed = performance.now() / 1000;
  const shipAngle = getViewerSceneOrbitAngle(viewerScene, elapsed);
  const planetSpin = viewerScene.planet?.rotation.y ?? 0;

  if (effect.sequenceStep === 0) {
    emitShipyardAssemblyRing(
      effect,
      viewerScene.planetRadius,
      viewerScene.orbitRadius,
      elapsed,
      shipAngle,
      planetSpin
    );
  } else if (effect.sequenceStep === 1) {
    emitShipyardAssemblyPiece(
      effect,
      "fuel-scoop",
      viewerScene.planetRadius,
      viewerScene.orbitRadius,
      elapsed,
      shipAngle,
      planetSpin
    );
  } else if (effect.sequenceStep === 2) {
    emitShipyardAssemblyPiece(
      effect,
      "weapons",
      viewerScene.planetRadius,
      viewerScene.orbitRadius,
      elapsed,
      shipAngle,
      planetSpin
    );
  } else if (effect.sequenceStep === 3) {
    emitShipyardAssemblyPiece(
      effect,
      "radiator",
      viewerScene.planetRadius,
      viewerScene.orbitRadius,
      elapsed,
      shipAngle,
      planetSpin
    );
  } else if (effect.sequenceStep === 4) {
    emitShipyardAssemblyPiece(
      effect,
      "engine",
      viewerScene.planetRadius,
      viewerScene.orbitRadius,
      elapsed,
      shipAngle,
      planetSpin
    );
    const enginePiece = effect.assemblyPieces.find((piece) => piece.kind === "engine");
    effect.enginePushStartTime =
      (enginePiece?.startTime ?? elapsed) +
      (enginePiece?.ascentDuration ?? shipyardAssemblyEngineAscentDuration) * 0.84 +
      (enginePiece?.settleDuration ?? shipyardAssemblyEngineSettleDuration) * 0.42;
    effect.assemblyStruts.active = true;
    effect.assemblyStruts.startTime = effect.enginePushStartTime;
  } else {
    return;
  }

  effect.sequenceStep = Math.min(effect.sequenceStep + 1, 5);
  updateShipyardNextButton();
}

function startEvadeFire(): void {
  if (viewerScene.mode !== "evade" || viewerScene.evade === null) {
    return;
  }

  clearGroup(viewerScene.evade.tracerGroup);

  if (viewerScene.evade.explosion !== null) {
    viewerScene.evade.group.remove(viewerScene.evade.explosion.group);
    disposeObject(viewerScene.evade.explosion.group);
    viewerScene.evade.explosion = null;
  }

  const elapsed = performance.now() / 1000;
  getEvadeFireVectors(viewerScene.ship);
  viewerScene.evade.muzzleFlash.position
    .copy(evadeMuzzleWorld)
    .addScaledVector(evadeAxisWorld, 0.04);
  viewerScene.evade.muzzleLight.position.copy(viewerScene.evade.muzzleFlash.position);
  const burst = createEvadeTracerBurst(
    evadeMuzzleWorld,
    evadeTargetWorld,
    evadeAxisWorld,
    evadeConeBasisA,
    evadeConeBasisB,
    elapsed
  );
  const explosion = createEvadeNuclearExplosion(
    evadeTargetWorld,
    evadeAxisWorld,
    elapsed + evadeTracerBurstDuration + 0.035
  );

  for (const segment of burst.segments) {
    viewerScene.evade.tracerGroup.add(segment.line);
  }

  viewerScene.evade.group.add(explosion.group);
  viewerScene.evade.burst = burst;
  viewerScene.evade.explosion = explosion;
  updateEvadeFireButton();
}

function resetRetroManeuver(): void {
  retroManeuver.active = false;
  retroManeuver.elapsed = 0;
  retroManeuver.firstPuffEmitted = false;
  retroManeuver.secondPuffEmitted = false;

  for (const detachedWake of retroManeuver.detachedWakes) {
    root.remove(detachedWake.group);
    disposeObject(detachedWake.group);
  }

  for (const puff of retroManeuver.puffs) {
    root.remove(puff.group);
    disposeObject(puff.group);
  }

  retroManeuver.detachedWakes = [];
  retroManeuver.puffs = [];

  if (viewerScene.mode === "ship") {
    viewerScene.ship.userData["viewerDriveWakePower"] = 1;
  }
}

function updateRetroManeuver(current: ViewerScene, _elapsed: number, delta: number): number {
  if (!retroManeuver.active) {
    updateRetroVisualEffects(delta);
    return 1;
  }

  retroManeuver.elapsed = Math.min(retroManeuver.duration, retroManeuver.elapsed + delta);
  const angle = getRetroRotationAngle(retroManeuver.elapsed);
  applyRetroShipTransform(current.ship, angle);

  const brakeStart = retroManeuver.accelDuration + retroManeuver.coastDuration;

  if (!retroManeuver.secondPuffEmitted && retroManeuver.elapsed >= brakeStart) {
    startRetroRcsEmitter(current.ship, true);
    retroManeuver.secondPuffEmitted = true;
  }

  updateRetroVisualEffects(delta);

  if (retroManeuver.elapsed >= retroManeuver.duration) {
    retroManeuver.active = false;
    current.ship.userData["viewerDriveWakePower"] = 1;
    updateRetroButton();
    return 1;
  }

  const ignitionProgress = smoothStep(
    brakeStart + retroManeuver.brakeDuration * 0.82,
    retroManeuver.duration - 0.18,
    retroManeuver.elapsed
  );
  return ignitionProgress;
}

function getRetroRotationAngle(time: number): number {
  const accel = retroManeuver.accelDuration;
  const coast = retroManeuver.coastDuration;
  const brake = retroManeuver.brakeDuration;
  const maxAngularVelocity = Math.PI / (coast + accel);
  const angularAcceleration = maxAngularVelocity / accel;
  const accelAngle = 0.5 * angularAcceleration * accel * accel;
  const coastEnd = accel + coast;

  if (time <= accel) {
    return 0.5 * angularAcceleration * time * time;
  }

  if (time <= coastEnd) {
    return accelAngle + maxAngularVelocity * (time - accel);
  }

  if (time <= coastEnd + brake) {
    const brakeTime = time - coastEnd;
    return (
      accelAngle +
      maxAngularVelocity * coast +
      maxAngularVelocity * brakeTime -
      0.5 * angularAcceleration * brakeTime * brakeTime
    );
  }

  return Math.PI;
}

function getRetroAngularVelocity(time: number): number {
  const accel = retroManeuver.accelDuration;
  const coast = retroManeuver.coastDuration;
  const brake = retroManeuver.brakeDuration;
  const maxAngularVelocity = Math.PI / (coast + accel);
  const angularAcceleration = maxAngularVelocity / accel;
  const coastEnd = accel + coast;
  const brakeEnd = coastEnd + brake;

  if (time <= accel) {
    return angularAcceleration * time;
  }

  if (time <= coastEnd) {
    return maxAngularVelocity;
  }

  if (time <= brakeEnd) {
    return Math.max(0, maxAngularVelocity - angularAcceleration * (time - coastEnd));
  }

  return 0;
}

function applyRetroShipTransform(ship: THREE.Object3D, angle: number): void {
  retroRotationQuaternion.setFromAxisAngle(retroManeuver.rotationAxisWorld, angle);
  ship.quaternion.copy(retroRotationQuaternion).multiply(retroManeuver.baseQuaternion);
  retroPivotWorld
    .copy(retroManeuver.pivotWorldStart)
    .addScaledVector(retroManeuver.driftVelocity, retroManeuver.elapsed);
  retroPivotOffset
    .copy(retroManeuver.pivotLocal)
    .multiply(ship.scale)
    .applyQuaternion(ship.quaternion);
  ship.position.copy(retroPivotWorld).sub(retroPivotOffset);
}

function detachDriveWake(ship: THREE.Object3D): void {
  const wake = ship.getObjectByName("ship-electromagnetic-drive-wake");

  if (wake === undefined) {
    return;
  }

  const detached = wake.clone(true);
  detached.name = "viewer-retro-detached-drive-wake";
  detached.matrix.copy(wake.matrixWorld);
  detached.matrix.decompose(detached.position, detached.quaternion, detached.scale);
  const materials: Array<{ material: THREE.Material; baseOpacity: number }> = [];

  detached.traverse((object) => {
    if (object instanceof THREE.PointLight) {
      object.visible = false;
      object.intensity = 0;
    }

    if (object instanceof THREE.Mesh) {
      const material = Array.isArray(object.material)
        ? object.material.map((entry) => entry.clone())
        : object.material.clone();
      object.material = material;
      const materialList = Array.isArray(material) ? material : [material];

      for (const entry of materialList) {
        const opacity = "opacity" in entry && typeof entry.opacity === "number" ? entry.opacity : 1;
        materials.push({ material: entry, baseOpacity: opacity });
      }
    }
  });

  wake.getWorldQuaternion(retroWakeQuaternion);
  retroWakeDirectionWorld.set(-1, 0, 0).applyQuaternion(retroWakeQuaternion).normalize();
  root.add(detached);
  retroManeuver.detachedWakes.push({
    group: detached,
    velocity: retroWakeDirectionWorld.clone().multiplyScalar(72),
    materials,
    age: 0,
    duration: 1.08
  });
}

function startRetroRcsEmitter(ship: THREE.Object3D, braking: boolean): void {
  const capacity = braking ? 540 : 250;
  const positions = new Float32Array(capacity * 3);
  const alphas = new Float32Array(capacity);
  const sizes = new Float32Array(capacity);
  const particles: RetroRcsParticle[] = [];

  for (let index = 0; index < capacity; index += 1) {
    particles.push({
      active: false,
      age: 0,
      lifetime: 0,
      velocity: new THREE.Vector3(),
      baseAlpha: 0,
      baseSize: 0,
      drag: 0
    });
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("particleAlpha", new THREE.BufferAttribute(alphas, 1));
  geometry.setAttribute("particleSize", new THREE.BufferAttribute(sizes, 1));

  const points = new THREE.Points(
    geometry,
    createRetroRcsParticleMaterial(braking ? 0xc4f1ff : 0xdcfbff)
  );
  points.name = braking ? "viewer-retro-brake-rcs-particles" : "viewer-retro-start-rcs-particles";
  points.frustumCulled = false;
  points.renderOrder = 46;

  const group = new THREE.Group();
  group.name = braking ? "viewer-retro-brake-rcs-emitter" : "viewer-retro-start-rcs-emitter";
  group.add(points);

  const light = new THREE.PointLight(0xd7ffff, 0, braking ? 0.68 : 0.78, 2.15);
  light.name = "viewer-retro-rcs-light";
  group.add(light);

  root.add(group);

  const angularSign = braking ? -1 : 1;
  const sourceLocal = getRetroRcsSourceLocal(ship, angularSign);
  const emissionDuration = braking ? retroManeuver.brakeDuration : retroManeuver.accelDuration;
  retroManeuver.puffs.push({
    group,
    points,
    positions,
    alphas,
    sizes,
    particles,
    light,
    ship,
    sourceLocal,
    angularSign,
    emitAccumulator: 0,
    nextParticleIndex: 0,
    age: 0,
    emissionDuration,
    duration: emissionDuration + (braking ? 0.72 : 0.86),
    braking
  });
}

function getRetroRcsSourceLocal(ship: THREE.Object3D, angularSign: 1 | -1): THREE.Vector3 {
  retroPivotWorld.copy(retroManeuver.pivotLocal);
  ship.localToWorld(retroPivotWorld);
  retroPuffAngularWorld.copy(retroManeuver.rotationAxisWorld).normalize();

  let bestAngle = 0;
  let bestScore = -Infinity;

  for (let index = 0; index < 4; index += 1) {
    const candidateAngle = index * retroRcsBuckleAngleStep;
    retroRcsCandidateLocal.set(
      retroRcsBuckleX,
      Math.cos(candidateAngle) * retroRcsBuckleRadius,
      Math.sin(candidateAngle) * retroRcsBuckleRadius
    );
    retroRcsCandidateWorld.copy(retroRcsCandidateLocal);
    ship.localToWorld(retroRcsCandidateWorld);
    retroRcsCandidateCenter.copy(retroRcsCandidateWorld).sub(retroPivotWorld);
    retroRcsCandidateForceWorld.crossVectors(retroPuffAngularWorld, retroRcsCandidateCenter);

    if (retroRcsCandidateForceWorld.lengthSq() < 0.0001) {
      continue;
    }

    retroRcsCandidateForceWorld.normalize().multiplyScalar(angularSign);
    retroRcsCandidateTorqueWorld.crossVectors(retroRcsCandidateCenter, retroRcsCandidateForceWorld);
    retroRcsCandidateRadialWorld
      .set(0, Math.cos(candidateAngle), Math.sin(candidateAngle))
      .applyQuaternion(ship.quaternion)
      .normalize();

    const torqueScore = retroRcsCandidateTorqueWorld.dot(retroPuffAngularWorld) * angularSign;
    const exhaustOutwardScore = -retroRcsCandidateForceWorld.dot(retroRcsCandidateRadialWorld);
    const score =
      torqueScore * 2.8 +
      Math.max(0, exhaustOutwardScore) * 1.4 -
      Math.max(0, -exhaustOutwardScore) * 2.2;

    if (score > bestScore) {
      bestScore = score;
      bestAngle = candidateAngle;
    }
  }

  return new THREE.Vector3(
    retroRcsBuckleX,
    Math.cos(bestAngle) * retroRcsBuckleRadius,
    Math.sin(bestAngle) * retroRcsBuckleRadius
  );
}

function createRetroRcsParticleMaterial(color: THREE.ColorRepresentation): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      particleColor: { value: new THREE.Color(color) }
    },
    vertexShader: `
      attribute float particleAlpha;
      attribute float particleSize;
      varying float vParticleAlpha;

      void main() {
        vParticleAlpha = particleAlpha;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = particleSize * (1.8 / max(0.18, -mvPosition.z));
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 particleColor;
      varying float vParticleAlpha;

      void main() {
        float distanceFromCenter = length(gl_PointCoord - vec2(0.5));
        float softDisc = 1.0 - smoothstep(0.16, 0.5, distanceFromCenter);
        float hotCore = 1.0 - smoothstep(0.02, 0.22, distanceFromCenter);
        vec3 color = mix(particleColor, vec3(1.0, 0.98, 0.88), hotCore * 0.32);
        gl_FragColor = vec4(color, vParticleAlpha * softDisc);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending
  });
}

function updateRetroRcsEmitterVectors(puff: RetroPuff): void {
  retroPuffOriginWorld.copy(puff.sourceLocal);
  puff.ship.localToWorld(retroPuffOriginWorld);
  retroPivotWorld.copy(retroManeuver.pivotLocal);
  puff.ship.localToWorld(retroPivotWorld);
  retroPuffCenterWorld.copy(retroPuffOriginWorld).sub(retroPivotWorld);
  retroPuffAngularWorld.copy(retroManeuver.rotationAxisWorld).normalize();
  retroPuffForceWorld.crossVectors(retroPuffAngularWorld, retroPuffCenterWorld);

  if (retroPuffForceWorld.lengthSq() < 0.0001) {
    retroNoseWorldDirection.set(1, 0, 0).applyQuaternion(puff.ship.quaternion).normalize();
    retroPuffForceWorld.crossVectors(retroPuffAngularWorld, retroNoseWorldDirection);
  }

  retroPuffForceWorld.normalize().multiplyScalar(puff.angularSign);
  retroPuffDirectionWorld.copy(retroPuffForceWorld).multiplyScalar(-1).normalize();
  retroPuffLateralAWorld.crossVectors(retroPuffDirectionWorld, retroPuffAngularWorld);

  if (retroPuffLateralAWorld.lengthSq() < 0.0001) {
    retroNoseWorldDirection.set(1, 0, 0).applyQuaternion(puff.ship.quaternion).normalize();
    retroPuffLateralAWorld.crossVectors(retroPuffDirectionWorld, retroNoseWorldDirection);
  }

  retroPuffLateralAWorld.normalize();
  retroPuffLateralBWorld.crossVectors(retroPuffDirectionWorld, retroPuffLateralAWorld).normalize();
}

function emitRetroRcsParticle(puff: RetroPuff): void {
  const particleIndex = puff.nextParticleIndex;
  puff.nextParticleIndex = (puff.nextParticleIndex + 1) % puff.particles.length;

  const particle = puff.particles[particleIndex];
  const baseLifetime = puff.braking ? 0.32 : 0.4;
  const lifetimeVariance = puff.braking ? 0.14 : 0.24;
  const lateralSpread = puff.braking ? 0.034 : 0.024;
  const sourceSpread = puff.braking ? 0.005 : 0.006;
  const offset = particleIndex * 3;
  const sourceJitterA = (Math.random() - 0.5) * sourceSpread;
  const sourceJitterB = (Math.random() - 0.5) * sourceSpread;

  puff.positions[offset] =
    retroPuffOriginWorld.x +
    retroPuffLateralAWorld.x * sourceJitterA +
    retroPuffLateralBWorld.x * sourceJitterB;
  puff.positions[offset + 1] =
    retroPuffOriginWorld.y +
    retroPuffLateralAWorld.y * sourceJitterA +
    retroPuffLateralBWorld.y * sourceJitterB;
  puff.positions[offset + 2] =
    retroPuffOriginWorld.z +
    retroPuffLateralAWorld.z * sourceJitterA +
    retroPuffLateralBWorld.z * sourceJitterB;

  retroParticleSourceVelocity
    .crossVectors(retroManeuver.rotationAxisWorld, retroPuffCenterWorld)
    .multiplyScalar(getRetroAngularVelocity(retroManeuver.elapsed))
    .add(retroManeuver.driftVelocity);

  const jetSpeed = puff.braking ? 2.55 + Math.random() * 0.68 : 0.86 + Math.random() * 0.3;
  const lateralA = (Math.random() - 0.5) * lateralSpread;
  const lateralB = (Math.random() - 0.5) * lateralSpread;
  retroParticleVelocity
    .copy(retroPuffDirectionWorld)
    .multiplyScalar(jetSpeed)
    .addScaledVector(retroPuffLateralAWorld, lateralA)
    .addScaledVector(retroPuffLateralBWorld, lateralB)
    .addScaledVector(retroParticleSourceVelocity, puff.braking ? 0.96 : 0.46);

  particle.active = true;
  particle.age = 0;
  particle.lifetime = baseLifetime + Math.random() * lifetimeVariance;
  particle.velocity.copy(retroParticleVelocity);
  particle.baseAlpha = puff.braking ? 0.58 + Math.random() * 0.2 : 0.28 + Math.random() * 0.16;
  particle.baseSize = puff.braking ? 29 + Math.random() * 12 : 18 + Math.random() * 12;
  particle.drag = puff.braking ? 4.8 + Math.random() * 1.4 : 2.4 + Math.random() * 1.2;
  puff.alphas[particleIndex] = particle.baseAlpha;
  puff.sizes[particleIndex] = particle.baseSize;
}

function updateRetroVisualEffects(delta: number): void {
  for (let index = retroManeuver.detachedWakes.length - 1; index >= 0; index -= 1) {
    const wake = retroManeuver.detachedWakes[index];
    wake.age += delta;
    const progress = wake.age / wake.duration;
    const fade = 1 - smoothStep(0.08, 1, progress);
    wake.group.position.addScaledVector(wake.velocity, delta);
    wake.group.scale.multiplyScalar(1 + delta * 0.7);

    for (const entry of wake.materials) {
      if ("opacity" in entry.material) {
        entry.material.opacity = entry.baseOpacity * fade;
        entry.material.transparent = true;
      }
    }

    if (progress >= 1) {
      root.remove(wake.group);
      disposeObject(wake.group);
      retroManeuver.detachedWakes.splice(index, 1);
    }
  }

  for (let index = retroManeuver.puffs.length - 1; index >= 0; index -= 1) {
    const puff = retroManeuver.puffs[index];
    puff.age += delta;
    const progress = puff.age / puff.duration;

    updateRetroRcsEmitterVectors(puff);

    if (puff.age <= puff.emissionDuration) {
      const emissionRate = puff.braking ? 232 : 104;
      puff.emitAccumulator += delta * emissionRate;
      const emitCount = Math.min(34, Math.floor(puff.emitAccumulator));
      puff.emitAccumulator -= emitCount;

      for (let emitted = 0; emitted < emitCount; emitted += 1) {
        emitRetroRcsParticle(puff);
      }
    }

    let activeParticles = 0;

    for (let particleIndex = 0; particleIndex < puff.particles.length; particleIndex += 1) {
      const particle = puff.particles[particleIndex];
      const offset = particleIndex * 3;

      if (!particle.active) {
        puff.alphas[particleIndex] = 0;
        puff.sizes[particleIndex] = 0;
        continue;
      }

      particle.age += delta;
      const particleProgress = particle.age / particle.lifetime;

      if (particleProgress >= 1) {
        particle.active = false;
        puff.alphas[particleIndex] = 0;
        puff.sizes[particleIndex] = 0;
        continue;
      }

      activeParticles += 1;
      particle.velocity.multiplyScalar(Math.max(0, 1 - particle.drag * delta));
      puff.positions[offset] += particle.velocity.x * delta;
      puff.positions[offset + 1] += particle.velocity.y * delta;
      puff.positions[offset + 2] += particle.velocity.z * delta;

      const particleAttack = smoothStep(0, 0.08, particleProgress);
      const particleFade = 1 - smootherStep(0.16, 1, particleProgress);
      puff.alphas[particleIndex] = particle.baseAlpha * particleAttack * particleFade;
      puff.sizes[particleIndex] =
        particle.baseSize * (1 + particleProgress * (puff.braking ? 1.35 : 1.65));
    }

    (puff.points.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    (puff.points.geometry.getAttribute("particleAlpha") as THREE.BufferAttribute).needsUpdate =
      true;
    (puff.points.geometry.getAttribute("particleSize") as THREE.BufferAttribute).needsUpdate = true;

    const emissionFade = puff.age <= puff.emissionDuration ? smoothStep(0, 0.08, puff.age) : 0;
    const emberFade =
      puff.age > puff.emissionDuration
        ? 1 - smoothStep(puff.emissionDuration, puff.duration, puff.age)
        : 1;
    puff.light.position.copy(retroPuffOriginWorld);
    puff.light.intensity = (puff.braking ? 0.56 : 0.24) * Math.max(emissionFade, emberFade * 0.16);

    if (progress >= 1 && activeParticles === 0) {
      root.remove(puff.group);
      disposeObject(puff.group);
      retroManeuver.puffs.splice(index, 1);
    }
  }
}

function easeInOutBack(value: number): number {
  const c1 = 1.32;
  const c2 = c1 * 1.525;

  if (value < 0.5) {
    return (Math.pow(2 * value, 2) * ((c2 + 1) * 2 * value - c2)) / 2;
  }

  return (Math.pow(2 * value - 2, 2) * ((c2 + 1) * (value * 2 - 2) + c2) + 2) / 2;
}

function easeOutBack(value: number): number {
  const c1 = 0.82;
  const c3 = c1 + 1;
  const shifted = value - 1;

  return 1 + c3 * shifted * shifted * shifted + c1 * shifted * shifted;
}

function updateSceneAnimation(current: ViewerScene, elapsed: number, delta: number): void {
  if (current.mode === "ship") {
    const enginePower = updateRetroManeuver(current, elapsed, delta);
    current.ship.userData["viewerDriveWakePower"] = enginePower;
    updateRingHexShipModel(current.ship, elapsed, sunPosition, enginePower);
    return;
  }

  if (current.mode === "evade") {
    updateRingHexShipModel(current.ship, elapsed, sunPosition, 0);

    if (current.evade !== null) {
      updateEvadeEffect(current.evade, elapsed);
    }

    return;
  }

  const angle = getViewerSceneOrbitAngle(current, elapsed);
  const shipPosition = new THREE.Vector3(
    Math.cos(angle) * current.orbitRadius,
    current.planetRadius * 0.2,
    Math.sin(angle) * current.orbitRadius
  );
  const tangent = getOrbitTangent(angle);
  current.ship.position.copy(shipPosition);
  current.ship.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), tangent);
  current.ship.rotateX(Math.sin(elapsed * 0.7) * 0.025);
  updateRingHexShipModel(
    current.ship,
    elapsed,
    sunPosition,
    current.mode === "shipyard" ? (current.shipyard?.shipPower ?? 0) : 0
  );

  if (current.planet !== null) {
    current.planet.rotation.y += delta * (current.mode === "tritium" ? 0.17 : 0.08);

    if (current.mode === "shipyard") {
      updateShipyardSurfaceGrid(current.planet, elapsed);
    }
  }

  if (current.tritium !== null) {
    const receiverPoint = getTritiumReceiverPoint(current.ship);
    updateTritiumEffect(
      current.tritium,
      shipPosition,
      tangent,
      receiverPoint,
      current.planetRadius,
      elapsed,
      angle,
      current.planet?.rotation.y ?? 0
    );
  }

  if (current.shipyard !== null) {
    updateShipyardEffect(
      current.shipyard,
      current.ship,
      current.planetRadius,
      current.orbitRadius,
      elapsed,
      angle
    );
  }
}

function updateCamera(): void {
  const cosPitch = Math.cos(cameraState.pitch);
  const offset = new THREE.Vector3(
    Math.sin(cameraState.yaw) * cosPitch,
    Math.sin(cameraState.pitch),
    Math.cos(cameraState.yaw) * cosPitch
  ).multiplyScalar(cameraState.distance);
  camera.position.copy(cameraState.focus).add(offset);
  camera.lookAt(cameraState.focus);
}

function updateDriveWhiteout(current: ViewerScene, elapsed: number): void {
  if (current.mode !== "ship") {
    setDriveWhiteoutOpacity(0, 0.5, 0.5);
    return;
  }

  const wake = current.ship.getObjectByName("ship-electromagnetic-drive-wake");

  if (wake === undefined) {
    setDriveWhiteoutOpacity(0, 0.5, 0.5);
    return;
  }

  const drivePower = clamp(getNumericUserData(current.ship, "viewerDriveWakePower"), 0, 1);

  if (drivePower <= 0.08) {
    setDriveWhiteoutOpacity(0, 0.5, 0.5);
    return;
  }

  const frontX = getNumericUserData(wake, "frontX");
  const wakeLength = getNumericUserData(wake, "wakeLength");
  const wakeOnlyGlareStartProgress = 0.04;

  wake.localToWorld(driveWhiteoutStart.set(frontX, 0, 0));
  wake.localToWorld(driveWhiteoutEnd.set(frontX - wakeLength, 0, 0));
  driveWhiteoutSegment.copy(driveWhiteoutEnd).sub(driveWhiteoutStart);
  const segmentLengthSquared = Math.max(0.0001, driveWhiteoutSegment.lengthSq());
  const wakeProgress =
    driveWhiteoutCameraOffset
      .copy(camera.position)
      .sub(driveWhiteoutStart)
      .dot(driveWhiteoutSegment) / segmentLengthSquared;

  const closestProgress = clamp(wakeProgress, wakeOnlyGlareStartProgress, 1);
  driveWhiteoutClosestPoint
    .copy(driveWhiteoutStart)
    .addScaledVector(driveWhiteoutSegment, closestProgress);
  driveWhiteoutAxis.copy(driveWhiteoutSegment).normalize();
  camera.getWorldDirection(driveWhiteoutCameraDirection);

  const distanceToWake = camera.position.distanceTo(driveWhiteoutClosestPoint);
  driveWhiteoutCameraLocalPoint.copy(camera.position);
  wake.worldToLocal(driveWhiteoutCameraLocalPoint);
  const cameraAheadOfNozzle = driveWhiteoutCameraLocalPoint.x > frontX + 0.08;
  const viewingWakeThroughNose =
    cameraAheadOfNozzle && driveWhiteoutCameraDirection.dot(driveWhiteoutAxis) > 0.12;

  if (
    viewingWakeThroughNose ||
    (cameraAheadOfNozzle && isDriveWhiteoutOccludedByShip(current.ship, wake, distanceToWake))
  ) {
    setDriveWhiteoutOpacity(0, 0.5, 0.5);
    return;
  }

  const viewAlignment = Math.abs(driveWhiteoutCameraDirection.dot(driveWhiteoutAxis));
  driveWhiteoutCameraSpacePoint
    .copy(driveWhiteoutClosestPoint)
    .applyMatrix4(camera.matrixWorldInverse);
  const projectedDepth = Math.max(0.08, Math.abs(driveWhiteoutCameraSpacePoint.z));
  driveWhiteoutScreenSample.set(
    (driveWhiteoutCameraSpacePoint.x * camera.projectionMatrix.elements[0]) / projectedDepth,
    (driveWhiteoutCameraSpacePoint.y * camera.projectionMatrix.elements[5]) / projectedDepth,
    0
  );

  if (
    !Number.isFinite(driveWhiteoutScreenSample.x) ||
    !Number.isFinite(driveWhiteoutScreenSample.y)
  ) {
    setDriveWhiteoutOpacity(0, 0.5, 0.5);
    return;
  }

  let bestScreenX = driveWhiteoutScreenSample.x * 0.5 + 0.5;
  let bestScreenY = -driveWhiteoutScreenSample.y * 0.5 + 0.5;
  let bestClampedScreenX = clamp(bestScreenX, 0, 1);
  let bestClampedScreenY = clamp(bestScreenY, 0, 1);
  let bestOutsideScreenDistance = Math.hypot(
    bestScreenX - bestClampedScreenX,
    bestScreenY - bestClampedScreenY
  );
  let bestScreenScore = Number.NEGATIVE_INFINITY;

  for (let sampleIndex = 0; sampleIndex <= 14; sampleIndex += 1) {
    const sampleProgress =
      wakeOnlyGlareStartProgress + (sampleIndex / 14) * (1 - wakeOnlyGlareStartProgress);
    driveWhiteoutCandidatePoint
      .copy(driveWhiteoutStart)
      .addScaledVector(driveWhiteoutSegment, sampleProgress);
    driveWhiteoutCandidateCameraPoint
      .copy(driveWhiteoutCandidatePoint)
      .applyMatrix4(camera.matrixWorldInverse);
    projectDriveWhiteoutCameraPoint(
      driveWhiteoutCandidateCameraPoint,
      driveWhiteoutCandidateScreenPoint
    );

    if (
      !Number.isFinite(driveWhiteoutCandidateScreenPoint.x) ||
      !Number.isFinite(driveWhiteoutCandidateScreenPoint.y)
    ) {
      continue;
    }

    const candidateScreenX = driveWhiteoutCandidateScreenPoint.x * 0.5 + 0.5;
    const candidateScreenY = -driveWhiteoutCandidateScreenPoint.y * 0.5 + 0.5;
    const candidateClampedScreenX = clamp(candidateScreenX, 0, 1);
    const candidateClampedScreenY = clamp(candidateScreenY, 0, 1);
    const candidateOutsideScreenDistance = Math.hypot(
      candidateScreenX - candidateClampedScreenX,
      candidateScreenY - candidateClampedScreenY
    );
    const candidateDistance = camera.position.distanceTo(driveWhiteoutCandidatePoint);
    const candidateInFrontWeight =
      driveWhiteoutCandidateCameraPoint.z < -0.02 || candidateDistance < 1.4 ? 1 : 0.18;
    const candidateScreenGlare =
      (1 - smoothStep(0.02, 0.88, candidateOutsideScreenDistance)) * candidateInFrontWeight;
    const candidateNearWakeGlare = 1 - smoothStep(0.12, 3.1, candidateDistance);
    const candidateScore = candidateScreenGlare + candidateNearWakeGlare * 0.7;

    if (candidateScore > bestScreenScore) {
      bestScreenScore = candidateScore;
      bestScreenX = candidateScreenX;
      bestScreenY = candidateScreenY;
      bestClampedScreenX = candidateClampedScreenX;
      bestClampedScreenY = candidateClampedScreenY;
      bestOutsideScreenDistance = candidateOutsideScreenDistance;
    }
  }

  const distanceGlare = 1 - smoothStep(0.65, 7.2, distanceToWake);
  const viewGlare = smoothStep(0.18, 0.78, viewAlignment);
  const projectedScreenGlare = 1 - smoothStep(0.02, 0.88, bestOutsideScreenDistance);
  const nearWakeScreenGlare = 1 - smoothStep(0.12, 3.1, distanceToWake);
  const screenGlare = Math.max(projectedScreenGlare, nearWakeScreenGlare * 0.92);
  const nearWakeWhiteout = 1 - smoothStep(0.08, 1.28, distanceToWake);
  const ignitionFlicker = 0.9 + Math.pow(0.5 + 0.5 * Math.sin(elapsed * 38), 3.2) * 0.1;
  const opacity = clamp(
    Math.max(
      Math.pow(distanceGlare * viewGlare * screenGlare, 0.56) * 1.48,
      Math.pow(nearWakeWhiteout, 0.48) * 0.985
    ) *
      ignitionFlicker *
      smoothStep(0.1, 0.45, drivePower),
    0,
    0.992
  );
  const radius = 48 + nearWakeWhiteout * 118;

  driveWhiteoutBestScreenPoint.set(bestClampedScreenX, bestClampedScreenY);
  setDriveWhiteoutOpacity(
    opacity,
    driveWhiteoutBestScreenPoint.x,
    driveWhiteoutBestScreenPoint.y,
    radius
  );
}

function projectDriveWhiteoutCameraPoint(
  cameraSpacePoint: THREE.Vector3,
  output: THREE.Vector3
): void {
  const projectedDepth = Math.max(0.08, Math.abs(cameraSpacePoint.z));
  output.set(
    (cameraSpacePoint.x * camera.projectionMatrix.elements[0]) / projectedDepth,
    (cameraSpacePoint.y * camera.projectionMatrix.elements[5]) / projectedDepth,
    0
  );
}

function isDriveWhiteoutOccludedByShip(
  ship: THREE.Object3D,
  wake: THREE.Object3D,
  distanceToWake: number
): boolean {
  if (distanceToWake <= 0.05) {
    return false;
  }

  driveWhiteoutRayDirection.copy(driveWhiteoutClosestPoint).sub(camera.position).normalize();
  driveWhiteoutRaycaster.set(camera.position, driveWhiteoutRayDirection);
  driveWhiteoutRaycaster.near = 0.025;
  driveWhiteoutRaycaster.far = Math.max(0.025, distanceToWake - 0.045);

  return driveWhiteoutRaycaster.intersectObject(ship, true).some((intersection) => {
    let candidate: THREE.Object3D | null = intersection.object;

    while (candidate !== null) {
      if (candidate === wake || candidate.userData["shipDriveWakeDecorative"] === true) {
        return false;
      }

      candidate = candidate.parent;
    }

    return true;
  });
}

function setDriveWhiteoutOpacity(
  opacity: number,
  screenX: number,
  screenY: number,
  radius = 48
): void {
  driveWhiteout.style.setProperty("--drive-whiteout-x", `${screenX * 100}%`);
  driveWhiteout.style.setProperty("--drive-whiteout-y", `${screenY * 100}%`);
  driveWhiteout.style.setProperty("--drive-whiteout-core-radius", `${radius * 0.38}%`);
  driveWhiteout.style.setProperty("--drive-whiteout-radius", `${radius}%`);
  driveWhiteout.style.opacity = opacity.toFixed(3);
  driveWhiteout.classList.toggle("is-hidden", opacity <= 0.01);
}

function updateEvadeImpactWhiteout(current: ViewerScene, elapsed: number): void {
  const explosion = current.mode === "evade" ? current.evade?.explosion : null;

  if (explosion === null || explosion === undefined) {
    setImpactWhiteoutOpacity(0, 0.5, 0.5);
    return;
  }

  const age = elapsed - explosion.startTime;

  if (age < 0 || age > evadeImpactWhiteoutFadeSeconds) {
    setImpactWhiteoutOpacity(0, 0.5, 0.5);
    return;
  }

  const onset = smoothStep(0, 0.012, age);
  const decay = 1 - smoothStep(evadeImpactWhiteoutPeakSeconds, evadeImpactWhiteoutFadeSeconds, age);
  const projected = impactWhiteoutScreenPoint.copy(explosion.group.position).project(camera);
  const screenX = clamp(projected.x * 0.5 + 0.5, 0, 1);
  const screenY = clamp(-projected.y * 0.5 + 0.5, 0, 1);
  setImpactWhiteoutOpacity(clamp(onset * decay * 0.68, 0, 0.72), screenX, screenY);
}

function setImpactWhiteoutOpacity(opacity: number, screenX: number, screenY: number): void {
  impactWhiteout.style.setProperty("--impact-whiteout-x", `${screenX * 100}%`);
  impactWhiteout.style.setProperty("--impact-whiteout-y", `${screenY * 100}%`);
  impactWhiteout.style.opacity = opacity.toFixed(3);
  impactWhiteout.classList.toggle("is-hidden", opacity <= 0.003);
}

function getNumericUserData(object: THREE.Object3D, key: string): number {
  const value = object.userData[key];
  return typeof value === "number" ? value : 0;
}

function panCamera(dx: number, dy: number): void {
  const height = renderer.domElement.clientHeight || 1;
  const panScale = (cameraState.distance / height) * 1.45;
  const forward = cameraState.focus.clone().sub(camera.position).normalize();
  const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
  const up = new THREE.Vector3().crossVectors(right, forward).normalize();
  cameraState.focus.addScaledVector(right, -dx * panScale);
  cameraState.focus.addScaledVector(up, dy * panScale);
}

function resize(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / Math.max(1, height);
  camera.updateProjectionMatrix();
}

function createStarfield(): THREE.Points {
  const starCount = 1200;
  const positions = new Float32Array(starCount * 3);

  for (let index = 0; index < starCount; index += 1) {
    const radius = 140 + Math.random() * 160;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
    positions[index * 3] = Math.sin(phi) * Math.cos(theta) * radius;
    positions[index * 3 + 1] = Math.cos(phi) * radius;
    positions[index * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0xb7dcff,
      size: 0.32,
      transparent: true,
      opacity: 0.42,
      depthWrite: false
    })
  );
}

function createSunBillboard(): THREE.Group {
  const group = new THREE.Group();
  group.name = "viewer-sun-billboard";
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(1.2, 32, 18),
    new THREE.MeshBasicMaterial({ color: 0xfff5c8 })
  );
  const corona = new THREE.Mesh(
    new THREE.SphereGeometry(2.5, 32, 18),
    new THREE.MeshBasicMaterial({
      color: 0xffb35c,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  group.add(corona, core);
  return group;
}

function createRadialGlowSprite(
  name: string,
  color: THREE.ColorRepresentation,
  opacity: number,
  size: number
): THREE.Sprite {
  const texture = createRadialGlowTexture(name, color);
  const material = new THREE.SpriteMaterial({
    map: texture,
    color,
    opacity,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending
  });
  material.toneMapped = false;
  const sprite = new THREE.Sprite(material);
  sprite.name = name;
  sprite.scale.setScalar(size);
  sprite.renderOrder = 39;
  return sprite;
}

function createRadialGlowTexture(
  name: string,
  color: THREE.ColorRepresentation
): THREE.CanvasTexture {
  const size = 128;
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = size;
  textureCanvas.height = size;
  const context = textureCanvas.getContext("2d");

  if (context === null) {
    throw new Error(`Could not create glow texture for ${name}`);
  }

  const glowColor = new THREE.Color(color);
  const center = size / 2;
  const gradient = context.createRadialGradient(center, center, 0, center, center, center);
  const rgb = `${Math.round(glowColor.r * 255)}, ${Math.round(glowColor.g * 255)}, ${Math.round(glowColor.b * 255)}`;
  gradient.addColorStop(0, `rgba(${rgb}, 1)`);
  gradient.addColorStop(0.18, `rgba(${rgb}, 0.64)`);
  gradient.addColorStop(0.48, `rgba(${rgb}, 0.18)`);
  gradient.addColorStop(1, `rgba(${rgb}, 0)`);

  context.clearRect(0, 0, size, size);
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.name = `${name}-texture`;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createPlanet(mode: Exclude<SceneMode, "ship" | "evade">, radius: number): THREE.Mesh {
  const color = mode === "tritium" ? 0x183f50 : 0x5f4a30;
  const emissive = mode === "tritium" ? 0x08222b : 0x1e1308;
  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 48, 24),
    new THREE.MeshStandardMaterial({
      color,
      emissive,
      emissiveIntensity: 0.32,
      roughness: 0.64,
      metalness: 0.04
    })
  );
  planet.name = mode === "tritium" ? "viewer-tritium-body" : "viewer-shipyard-body";

  const bandMaterial = new THREE.LineBasicMaterial({
    color: mode === "tritium" ? 0x77e4ff : 0xf4c079,
    transparent: true,
    opacity: 0.15,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  if (mode !== "tritium") {
    for (let index = 0; index < 5; index += 1) {
      const ring = createOrbitLine(
        radius * (1.02 + index * 0.02),
        bandMaterial.color.getHex(),
        0.12
      );
      ring.name = "viewer-planet-surface-band";
      ring.rotation.x = Math.PI / 2;
      ring.position.y = (index - 2) * radius * 0.16;
      planet.add(ring);
    }
  }

  if (mode === "tritium") {
    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.045, 48, 24),
      new THREE.MeshBasicMaterial({
        color: 0x79edff,
        transparent: true,
        opacity: 0.052,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    atmosphere.name = "viewer-tritium-atmosphere-glow";
    planet.add(atmosphere);
    const subsurfaceMiningGlow = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.026, 56, 28),
      new THREE.MeshBasicMaterial({
        color: 0x45f2ff,
        transparent: true,
        opacity: 0.024,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending
      })
    );
    subsurfaceMiningGlow.name = "viewer-tritium-subsurface-mining-rim-glow";
    planet.add(subsurfaceMiningGlow);
    planet.add(createTritiumSurfaceGrid(radius));
  } else {
    planet.add(createShipyardSurfaceGrid(radius));
  }

  return planet;
}

function createOrbitLine(
  radius: number,
  color: THREE.ColorRepresentation,
  opacity: number
): THREE.LineLoop {
  const points: THREE.Vector3[] = [];
  const segmentCount = 256;

  for (let index = 0; index < segmentCount; index += 1) {
    const angle = (index / segmentCount) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  return new THREE.LineLoop(geometry, material);
}

function createTritiumSurfaceGrid(radius: number): THREE.Group {
  const group = new THREE.Group();
  group.name = "viewer-tritium-industrial-surface-grid";

  const primaryMaterial = new THREE.LineBasicMaterial({
    color: 0x8df4ff,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending
  });
  const branchMaterial = new THREE.LineBasicMaterial({
    color: 0xacebd8,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending
  });
  const glowMaterial = new THREE.LineBasicMaterial({
    color: 0x6cf7ff,
    transparent: true,
    opacity: 0.075,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending
  });

  const addSurfaceLine = (
    unitPoints: readonly THREE.Vector3[],
    material: THREE.LineBasicMaterial,
    opacity: number,
    glowOpacity: number,
    surfaceScale = 1.012
  ): void => {
    const line = createSurfacePolyline(radius * surfaceScale, unitPoints, material);
    setBasicOpacity(line.material, opacity);
    group.add(line);

    if (glowOpacity > 0) {
      const glow = createSurfacePolyline(radius * (surfaceScale + 0.009), unitPoints, glowMaterial);
      glow.name = "viewer-tritium-surface-grid-subsurface-glow";
      setBasicOpacity(glow.material, glowOpacity);
      group.add(glow);
    }
  };

  const addStraightSegment = (
    startLatitude: number,
    startLongitude: number,
    endLatitude: number,
    endLongitude: number,
    material: THREE.LineBasicMaterial,
    opacity: number,
    glowOpacity: number,
    surfaceScale = 1.014
  ): void => {
    addSurfaceLine(
      [
        sphericalPoint(1, startLatitude, startLongitude),
        sphericalPoint(1, endLatitude, endLongitude)
      ],
      material,
      opacity,
      glowOpacity,
      surfaceScale
    );
  };

  const equatorCellCount = 252;
  const equatorCellAngle = (Math.PI * 2) / equatorCellCount;

  for (let cell = 0; cell < equatorCellCount; cell += 1) {
    const start = cell * equatorCellAngle;
    const end = start + equatorCellAngle;
    const sign = cell % 2 === 0 ? 1 : -1;
    const lowerLatitude = -sign * (0.022 + seededUnit(cell, 402) * 0.011);
    const midLatitude = sign * (0.006 + seededUnit(cell, 403) * 0.012);
    const upperLatitude = sign * (0.042 + seededUnit(cell, 404) * 0.02);
    const outerLatitude = sign * (0.074 + seededUnit(cell, 405) * 0.026);
    const phase = seededUnit(cell, 401) * equatorCellAngle * 0.08;
    const points = [
      sphericalPoint(1, lowerLatitude, start + phase),
      sphericalPoint(1, lowerLatitude, start + equatorCellAngle * 0.11),
      sphericalPoint(1, midLatitude, start + equatorCellAngle * 0.11),
      sphericalPoint(1, midLatitude, start + equatorCellAngle * 0.22),
      sphericalPoint(1, outerLatitude, start + equatorCellAngle * 0.22),
      sphericalPoint(1, outerLatitude, start + equatorCellAngle * 0.38),
      sphericalPoint(1, upperLatitude, start + equatorCellAngle * 0.38),
      sphericalPoint(1, upperLatitude, start + equatorCellAngle * 0.53),
      sphericalPoint(1, lowerLatitude, start + equatorCellAngle * 0.53),
      sphericalPoint(1, lowerLatitude, start + equatorCellAngle * 0.69),
      sphericalPoint(1, midLatitude, start + equatorCellAngle * 0.69),
      sphericalPoint(1, midLatitude, end - phase * 0.55)
    ];

    addSurfaceLine(
      points,
      cell % 5 === 0 ? branchMaterial : primaryMaterial,
      0.135 + seededUnit(cell, 406) * 0.105,
      0.028 + seededUnit(cell, 407) * 0.045,
      1.015
    );

    if (cell % 2 === 0) {
      addStraightSegment(
        -outerLatitude * 0.74,
        start + equatorCellAngle * 0.08,
        -outerLatitude * 0.74,
        start + equatorCellAngle * 0.31,
        primaryMaterial,
        0.085 + seededUnit(cell, 408) * 0.055,
        0.014 + seededUnit(cell, 409) * 0.018,
        1.018
      );
    }

    if (cell % 4 === 1) {
      addStraightSegment(
        upperLatitude * 0.55,
        start + equatorCellAngle * 0.44,
        upperLatitude * 0.55,
        start + equatorCellAngle * 0.82,
        branchMaterial,
        0.075 + seededUnit(cell, 410) * 0.06,
        0.012 + seededUnit(cell, 411) * 0.016,
        1.017
      );
    }
  }

  for (let seam = 0; seam < 84; seam += 1) {
    const longitude = (seam / 84) * Math.PI * 2 + (seededUnit(seam, 445) - 0.5) * 0.045;
    const laneLatitude = (seededUnit(seam, 446) - 0.5) * 0.11;
    addStraightSegment(
      laneLatitude,
      longitude,
      laneLatitude + (seededUnit(seam, 447) - 0.5) * 0.034,
      longitude + equatorCellAngle * (0.42 + seededUnit(seam, 448) * 0.9),
      seam % 3 === 0 ? branchMaterial : primaryMaterial,
      0.045 + seededUnit(seam, 449) * 0.045,
      0.006 + seededUnit(seam, 450) * 0.012,
      1.019
    );
  }

  for (let vine = 0; vine < 34; vine += 1) {
    const longitude = (vine / 34) * Math.PI * 2 + (seededUnit(vine, 415) - 0.5) * 0.18;
    const side = seededUnit(vine, 416) > 0.5 ? 1 : -1;
    const reach =
      vine % 7 === 0
        ? 0.92 + seededUnit(vine, 418) * 0.24
        : vine % 3 === 0
          ? 0.68 + seededUnit(vine, 419) * 0.22
          : 0.46 + seededUnit(vine, 417) * 0.22;
    const strandCount = vine % 5 === 0 ? 4 : 3;
    const vineLongitudes: number[] = [];

    for (let strand = 0; strand < strandCount; strand += 1) {
      const strandOffset =
        (strand - (strandCount - 1) / 2) * (0.015 + seededUnit(vine, 420) * 0.01);
      const jog =
        (seededUnit(vine + strand * 13, 421) > 0.5 ? 1 : -1) *
        (0.022 + seededUnit(vine + strand, 422) * 0.052);
      const firstLatitude = side * (0.055 + seededUnit(vine + strand, 423) * 0.035);
      const secondLatitude = side * reach * (0.28 + seededUnit(vine + strand, 424) * 0.05);
      const thirdLatitude = side * reach * (0.52 + seededUnit(vine + strand, 425) * 0.06);
      const fourthLatitude = side * reach * (0.74 + seededUnit(vine + strand, 426) * 0.05);
      const tipLatitude = side * reach;
      const strandLongitude = longitude + strandOffset;
      vineLongitudes.push(strandLongitude);

      addSurfaceLine(
        [
          sphericalPoint(1, firstLatitude, strandLongitude),
          sphericalPoint(1, secondLatitude, strandLongitude + jog * 0.24),
          sphericalPoint(1, secondLatitude, strandLongitude + jog),
          sphericalPoint(1, thirdLatitude, strandLongitude + jog),
          sphericalPoint(1, thirdLatitude, strandLongitude - jog * 0.44),
          sphericalPoint(1, fourthLatitude, strandLongitude - jog * 0.44),
          sphericalPoint(1, fourthLatitude, strandLongitude + jog * 0.32),
          sphericalPoint(1, tipLatitude, strandLongitude + jog * 0.32)
        ],
        strand % 2 === 0 ? branchMaterial : primaryMaterial,
        0.095 + seededUnit(vine + strand, 427) * 0.075,
        0.016 + seededUnit(vine + strand, 428) * 0.024,
        1.019
      );
    }

    for (let rung = 0; rung < 3; rung += 1) {
      const latitude = side * reach * (0.32 + rung * 0.19 + seededUnit(vine + rung, 429) * 0.04);
      addStraightSegment(
        latitude,
        vineLongitudes[0],
        latitude + side * (seededUnit(vine + rung, 440) - 0.5) * 0.018,
        vineLongitudes[vineLongitudes.length - 1] + (seededUnit(vine + rung, 441) - 0.5) * 0.035,
        branchMaterial,
        0.055 + seededUnit(vine + rung, 442) * 0.045,
        0.008 + seededUnit(vine + rung, 443) * 0.012,
        1.02
      );
    }
  }

  for (let patch = 0; patch < 18; patch += 1) {
    const side = patch % 2 === 0 ? 1 : -1;
    const latitude = side * (0.58 + seededUnit(patch, 430) * 0.48);
    const longitude = (patch / 18) * Math.PI * 2 + seededUnit(patch, 431) * 0.3;
    addStraightSegment(
      latitude,
      longitude,
      latitude + side * (0.035 + seededUnit(patch, 432) * 0.08),
      longitude + (seededUnit(patch, 433) - 0.5) * 0.12,
      primaryMaterial,
      0.04 + seededUnit(patch, 434) * 0.045,
      0.008,
      1.018
    );
  }

  return group;
}

function createShipyardSurfaceGrid(radius: number): THREE.Group {
  const group = new THREE.Group();
  group.name = "viewer-shipyard-surface-grid";
  const seed = hashStringToUnitInterval("viewer-shipyard-surface-grid");
  const coverageRadius = 0.995;
  const phaseBucketCount = 7;
  const layers = [
    {
      name: "primary",
      color: 0xf2c866,
      opacity: 0.72,
      spacing: 0.19,
      axisBias: 0
    },
    {
      name: "secondary",
      color: 0xffdf8a,
      opacity: 0.42,
      spacing: 0.26,
      axisBias: 1
    }
  ] as const;

  for (const layer of layers) {
    const points = buildShipyardZenithGrid({
      coverageRadius,
      spacing: layer.spacing,
      seed: seed + layer.axisBias * 0.37,
      surfaceRadius: radius * (1.014 + layer.axisBias * 0.003),
      axisBias: layer.axisBias
    });

    if (points.length < 2) {
      continue;
    }

    const phaseBuckets = splitShipyardGridPhaseBuckets(points, phaseBucketCount);

    for (let phaseIndex = 0; phaseIndex < phaseBuckets.length; phaseIndex += 1) {
      const bucket = phaseBuckets[phaseIndex]!;

      if (bucket.length < 2) {
        continue;
      }

      const geometry = new THREE.BufferGeometry().setFromPoints(bucket);
      const material = createShipyardSurfaceGridMaterial(layer.color);
      const lines = new THREE.LineSegments(geometry, material);
      lines.name = `viewer-shipyard-surface-grid:${layer.name}:phase-${phaseIndex}`;
      lines.renderOrder = 34.5 + phaseIndex * 0.02;
      const industrialChannel = phaseIndex + layer.axisBias * phaseBucketCount;
      lines.userData["baseOpacity"] = layer.opacity;
      lines.userData["shipyardLightFlowPhase"] =
        phaseIndex * ((Math.PI * 2) / phaseBucketCount) + layer.axisBias * 0.73;
      lines.userData["shipyardLightIndustrialChannel"] = industrialChannel;
      lines.userData["shipyardLightSequenceLength"] = getShipyardIndustrialSequenceLength(
        seed,
        industrialChannel
      );
      lines.userData["shipyardLightSequenceOffset"] = Math.floor(
        fract(seed * 31.7 + industrialChannel * 0.83) * 29
      );
      lines.userData["shipyardLightDutyCycle"] =
        0.32 + fract(seed * 11.9 + industrialChannel * 0.41) * 0.22;
      lines.userData["shipyardGridLod"] = "detail";
      group.add(lines);
    }
  }

  return group;
}

function createShipyardSurfaceGridMaterial(color: THREE.ColorRepresentation): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      color: { value: new THREE.Color(color) },
      opacity: { value: shipyardSurfaceGridTuning.lightIntensity },
      sunPosition: { value: new THREE.Vector3(0, 0, 0) },
      lightSideOpacityFloor: { value: shipyardSurfaceGridTuning.lightSideOpacityFloor },
      darkSideOpacityBoost: { value: shipyardSurfaceGridTuning.darkSideOpacityBoost },
      terminatorGlowBoost: { value: shipyardSurfaceGridTuning.terminatorGlowBoost }
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;

      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normalize(position));
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      uniform float opacity;
      uniform vec3 sunPosition;
      uniform float lightSideOpacityFloor;
      uniform float darkSideOpacityBoost;
      uniform float terminatorGlowBoost;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;

      void main() {
        vec3 lightDirection = normalize(sunPosition - vWorldPosition);
        float sunDot = dot(normalize(vWorldNormal), lightDirection);
        float lightSideFade = smoothstep(-0.12, 0.62, sunDot);
        float nightVisibility = mix(darkSideOpacityBoost, lightSideOpacityFloor, lightSideFade);
        float terminatorGlow = (1.0 - smoothstep(0.0, 0.38, abs(sunDot))) * terminatorGlowBoost;
        float alpha = opacity * clamp(nightVisibility + terminatorGlow, 0.0, 1.24);

        if (alpha <= 0.006) {
          discard;
        }

        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
}

function updateShipyardSurfaceGrid(planet: THREE.Object3D, elapsed: number): void {
  planet.traverse((object) => {
    if (
      !(object instanceof THREE.LineSegments) ||
      object.userData["shipyardGridLod"] !== "detail"
    ) {
      return;
    }

    const baseOpacity = getNumericUserData(object, "baseOpacity");
    const signal = getShipyardIndustrialLightSignal(object, elapsed);
    setShipyardSurfaceGridOpacity(object.material, baseOpacity * signal, sunPosition);
  });
}

function setShipyardSurfaceGridOpacity(
  material: THREE.Material | THREE.Material[],
  opacity: number,
  lightPosition: THREE.Vector3
): void {
  const materials = Array.isArray(material) ? material : [material];

  for (const candidate of materials) {
    if (candidate instanceof THREE.ShaderMaterial) {
      candidate.uniforms["opacity"].value = clamp(opacity, 0, 1.35);
      candidate.uniforms["sunPosition"].value.copy(lightPosition);
      continue;
    }

    if (candidate instanceof THREE.LineBasicMaterial) {
      candidate.opacity = clamp(opacity, 0, 1);
      candidate.transparent = true;
    }
  }
}

function getShipyardIndustrialLightSignal(line: THREE.Object3D, elapsed: number): number {
  const channel = getNumericUserData(line, "shipyardLightIndustrialChannel");
  const phase = getNumericUserData(line, "shipyardLightFlowPhase");
  const sequenceLength = Math.max(
    11,
    Math.round(getNumericUserData(line, "shipyardLightSequenceLength"))
  );
  const sequenceOffset = Math.round(getNumericUserData(line, "shipyardLightSequenceOffset"));
  const dutyCycle = clamp(getNumericUserData(line, "shipyardLightDutyCycle"), 0.24, 0.68);
  const stepRate = (shipyardSurfaceGridTuning.lightRhythmBpm / 60) * 1.54;
  const rhythm = elapsed * stepRate + phase * 0.17 + channel * 0.031;
  const step = Math.floor(rhythm) + sequenceOffset;
  const stepPhase = fract(rhythm);
  const currentGate = isShipyardIndustrialLightStepLit(step, sequenceLength, channel, dutyCycle)
    ? 1
    : 0;
  const previousGate = isShipyardIndustrialLightStepLit(
    step - 1,
    sequenceLength,
    channel,
    dutyCycle
  )
    ? 1
    : 0;
  const nextGate = isShipyardIndustrialLightStepLit(step + 1, sequenceLength, channel, dutyCycle)
    ? 1
    : 0;
  const attack = smootherStep(0.04, 0.2, stepPhase);
  const release = 1 - smootherStep(0.68, 0.96, stepPhase);
  const stepEnvelope = currentGate * Math.min(attack, release);
  const handoffTail = previousGate * (1 - smootherStep(0.04, 0.34, stepPhase)) * 0.28;
  const handoffLead = nextGate * smootherStep(0.74, 1, stepPhase) * 0.22;
  const machinePulse = clamp(stepEnvelope + handoffTail + handoffLead, 0, 1);
  const idleDrift =
    0.86 +
    Math.sin(elapsed * 0.34 + phase * 1.7 + channel * 0.23) *
      shipyardSurfaceGridTuning.lightFlicker *
      0.18;
  const workerBoost = 1 + shipyardSurfaceGridTuning.workerPulseBoost * (0.46 + machinePulse * 0.74);

  return clamp((0.38 + machinePulse * 0.9) * workerBoost + idleDrift * 0.12, 0.32, 1.42);
}

function getShipyardIndustrialSequenceLength(seed: number, channel: number): number {
  const sequenceLengths = [11, 13, 17, 19, 23, 29, 31] as const;
  const sequenceIndex = Math.floor(
    fract(seed * 17.13 + channel * 0.61803398875) * sequenceLengths.length
  );
  return sequenceLengths[sequenceIndex] ?? 17;
}

function isShipyardIndustrialLightStepLit(
  step: number,
  sequenceLength: number,
  channel: number,
  dutyCycle: number
): boolean {
  const wrappedStep = positiveModulo(step, sequenceLength);
  const hashedStep = fract(
    Math.sin((wrappedStep + 1) * 12.9898 + (channel + 1) * 78.233 + sequenceLength * 0.3719) *
      43758.5453
  );
  const latchBeat =
    positiveModulo(wrappedStep + Math.floor(channel * 2.3), 7) === 0 ||
    positiveModulo(wrappedStep * 2 + Math.floor(channel * 3.7), 11) === 0;
  return hashedStep > 1 - dutyCycle || latchBeat;
}

function splitShipyardGridPhaseBuckets(
  points: readonly THREE.Vector3[],
  phaseBucketCount: number
): THREE.Vector3[][] {
  const buckets = Array.from({ length: phaseBucketCount }, () => [] as THREE.Vector3[]);

  for (let index = 0; index < points.length; index += 2) {
    const bucket = buckets[Math.floor(index / 2) % phaseBucketCount]!;
    const start = points[index];
    const end = points[index + 1];

    if (start !== undefined && end !== undefined) {
      bucket.push(start, end);
    }
  }

  return buckets;
}

function buildShipyardZenithGrid(context: {
  coverageRadius: number;
  spacing: number;
  seed: number;
  surfaceRadius: number;
  axisBias: number;
}): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const patchCount = 7 + Math.floor(fract(context.seed * 7.19 + context.axisBias) * 3);
  const patchCenters: THREE.Vector3[] = [];
  const zenithAnchor = getShipyardZenithAnchorDirection(context.seed, context.axisBias);
  const zenithBasis = getSurfacePatchBasis(zenithAnchor);

  patchCenters.push(zenithAnchor);
  pushShipyardSurfacePatch(points, {
    center: zenithAnchor,
    tangent: zenithBasis.tangent,
    bitangent: zenithBasis.bitangent,
    patchRadius: context.coverageRadius * 0.24,
    spacing: context.spacing * 0.82,
    seed: context.seed + context.axisBias * 0.37 + 0.91,
    surfaceRadius: context.surfaceRadius,
    axisBias: context.axisBias + 2.7
  });

  for (let index = 0; index < patchCount; index += 1) {
    const center = getShipyardPatchDirection(context.seed, index, context.axisBias);
    const basis = getSurfacePatchBasis(center);
    const patchRadius =
      context.coverageRadius * (0.24 + fract(context.seed * 3.7 + index * 0.41) * 0.22);
    const spacing = context.spacing * (0.72 + fract(context.seed * 5.1 + index * 0.23) * 0.36);
    patchCenters.push(center);
    pushShipyardSurfacePatch(points, {
      center,
      tangent: basis.tangent,
      bitangent: basis.bitangent,
      patchRadius,
      spacing,
      seed: context.seed + index * 0.37,
      surfaceRadius: context.surfaceRadius,
      axisBias: context.axisBias
    });
  }

  for (let index = 1; index < patchCenters.length; index += 1) {
    if (fract(context.seed * 13.7 + index * 0.61 + context.axisBias) < 0.28) {
      continue;
    }

    pushShipyardSurfaceBridge(
      points,
      patchCenters[index - 1]!,
      patchCenters[index]!,
      context.surfaceRadius,
      context.seed + index * 0.19
    );
  }

  return points;
}

function pushShipyardSurfacePatch(
  points: THREE.Vector3[],
  context: {
    center: THREE.Vector3;
    tangent: THREE.Vector3;
    bitangent: THREE.Vector3;
    patchRadius: number;
    spacing: number;
    seed: number;
    surfaceRadius: number;
    axisBias: number;
  }
): void {
  const start = -context.patchRadius;
  const end = context.patchRadius;
  const lineCount = Math.max(2, Math.floor((end - start) / context.spacing));

  for (let lineIndex = 0; lineIndex <= lineCount; lineIndex += 1) {
    const fixed = start + lineIndex * context.spacing;
    const halfLength = Math.sqrt(Math.max(0, context.patchRadius ** 2 - fixed ** 2));

    if (halfLength < context.spacing * 1.05) {
      continue;
    }

    const skip = fract(context.seed * 11.7 + lineIndex * 0.37 + context.axisBias) < 0.2;

    if (!skip) {
      pushBrokenSurfacePatchLine(points, context, fixed, -halfLength, halfLength, true, lineIndex);
    }

    const crossSkip = fract(context.seed * 17.3 + lineIndex * 0.29 + context.axisBias) < 0.3;

    if (!crossSkip) {
      pushBrokenSurfacePatchLine(
        points,
        context,
        fixed + context.spacing * 0.18,
        -halfLength * 0.86,
        halfLength * 0.86,
        false,
        lineIndex + 17
      );
    }
  }
}

function pushBrokenSurfacePatchLine(
  points: THREE.Vector3[],
  context: {
    center: THREE.Vector3;
    tangent: THREE.Vector3;
    bitangent: THREE.Vector3;
    patchRadius: number;
    spacing: number;
    seed: number;
    surfaceRadius: number;
  },
  fixed: number,
  start: number,
  end: number,
  horizontal: boolean,
  lineIndex: number
): void {
  const segmentCount = Math.max(2, Math.floor((end - start) / (context.spacing * 2.15)));

  for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
    const segmentStart = start + (segmentIndex / segmentCount) * (end - start);
    const segmentEnd = start + ((segmentIndex + 0.72) / segmentCount) * (end - start);
    const skip = fract(context.seed * 23.1 + lineIndex * 0.41 + segmentIndex * 0.67) < 0.22;

    if (skip) {
      continue;
    }

    const trimmedStart = segmentStart + context.spacing * 0.18;
    const trimmedEnd = Math.min(end, segmentEnd - context.spacing * 0.12);

    if (trimmedEnd <= trimmedStart) {
      continue;
    }

    if (horizontal) {
      pushSurfacePatchSegment(points, context, trimmedStart, fixed, trimmedEnd, fixed);
      continue;
    }

    pushSurfacePatchSegment(points, context, fixed, trimmedStart, fixed, trimmedEnd);
  }
}

function pushSurfacePatchSegment(
  points: THREE.Vector3[],
  context: {
    center: THREE.Vector3;
    tangent: THREE.Vector3;
    bitangent: THREE.Vector3;
    patchRadius: number;
    surfaceRadius: number;
  },
  startU: number,
  startV: number,
  endU: number,
  endV: number
): void {
  if (
    startU ** 2 + startV ** 2 > context.patchRadius ** 2 ||
    endU ** 2 + endV ** 2 > context.patchRadius ** 2
  ) {
    return;
  }

  points.push(
    projectSurfacePatchPoint(context, startU, startV),
    projectSurfacePatchPoint(context, endU, endV)
  );
}

function projectSurfacePatchPoint(
  context: {
    center: THREE.Vector3;
    tangent: THREE.Vector3;
    bitangent: THREE.Vector3;
    surfaceRadius: number;
  },
  u: number,
  v: number
): THREE.Vector3 {
  return context.center
    .clone()
    .addScaledVector(context.tangent, u)
    .addScaledVector(context.bitangent, v)
    .normalize()
    .multiplyScalar(context.surfaceRadius);
}

function pushShipyardSurfaceBridge(
  points: THREE.Vector3[],
  from: THREE.Vector3,
  to: THREE.Vector3,
  surfaceRadius: number,
  seed: number
): void {
  const segmentCount = 5;

  for (let index = 0; index < segmentCount; index += 1) {
    if (fract(seed * 19.1 + index * 0.43) < 0.22) {
      continue;
    }

    const startProgress = index / segmentCount;
    const endProgress = Math.min(1, (index + 0.68) / segmentCount);
    points.push(
      from.clone().lerp(to, startProgress).normalize().multiplyScalar(surfaceRadius),
      from.clone().lerp(to, endProgress).normalize().multiplyScalar(surfaceRadius)
    );
  }
}

function getShipyardPatchDirection(seed: number, index: number, axisBias: number): THREE.Vector3 {
  const rawY = fract(seed * 2.31 + index * 0.37 + axisBias * 0.11);
  const upperBiasedY = Math.pow(rawY, 0.68);
  const y = -0.62 + upperBiasedY * 1.54;
  const radius = Math.sqrt(Math.max(0, 1 - y * y));
  const angle = seed * Math.PI * 2 + index * 2.399963229728653 + axisBias * 0.71;
  return new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius).normalize();
}

function getShipyardZenithAnchorDirection(seed: number, axisBias: number): THREE.Vector3 {
  const y = 0.78 + fract(seed * 4.93 + axisBias * 0.17) * 0.12;
  const radius = Math.sqrt(Math.max(0, 1 - y * y));
  const angle = seed * Math.PI * 2.7 + axisBias * 0.83;
  return new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius).normalize();
}

function getSurfacePatchBasis(center: THREE.Vector3): Readonly<{
  tangent: THREE.Vector3;
  bitangent: THREE.Vector3;
}> {
  const reference =
    Math.abs(center.y) < 0.82 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const tangent = reference.clone().cross(center).normalize();
  const bitangent = center.clone().cross(tangent).normalize();
  return { tangent, bitangent };
}

function createSurfacePolyline(
  radius: number,
  unitPoints: readonly THREE.Vector3[],
  material: THREE.LineBasicMaterial
): THREE.Line {
  const geometry = new THREE.BufferGeometry().setFromPoints(
    unitPoints.map((point) => point.clone().normalize().multiplyScalar(radius))
  );
  const line = new THREE.Line(geometry, material.clone());
  line.name = "viewer-tritium-surface-grid-line";
  line.renderOrder = 32;
  return line;
}

function sphericalPoint(radius: number, latitude: number, longitude: number): THREE.Vector3 {
  const cosLatitude = Math.cos(latitude);
  return new THREE.Vector3(
    Math.cos(longitude) * cosLatitude * radius,
    Math.sin(latitude) * radius,
    Math.sin(longitude) * cosLatitude * radius
  );
}

function createTritiumFlash(index: number): TritiumFlash {
  const group = new THREE.Group();
  group.name = `viewer-tritium-launch-flash-${index}`;
  group.visible = false;

  const core = createRadialGlowSprite("viewer-tritium-launch-flash-core", 0xeaffff, 0, 0.1);
  core.name = "viewer-tritium-launch-flash-core";
  const halo = createRadialGlowSprite("viewer-tritium-launch-flash-halo", 0x86f5ff, 0, 0.18);
  halo.name = "viewer-tritium-launch-flash-halo";

  const light = new THREE.PointLight(0xa7f7ff, 0, 0.95, 2.4);
  light.name = "viewer-tritium-launch-flash-light";
  group.add(halo, core, light);

  return {
    group,
    core,
    halo,
    light,
    startTime: Number.NEGATIVE_INFINITY,
    longitude: 0,
    latitude: 0,
    active: false
  };
}

function createTritiumCanister(index: number): TritiumCanister {
  const group = new THREE.Group();
  group.name = `viewer-tritium-orbital-canister-${index}`;
  group.visible = false;

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0xa9c0c2,
    emissive: 0x17363a,
    emissiveIntensity: 0.16,
    roughness: 0.31,
    metalness: 0.78,
    transparent: true,
    opacity: 1
  });
  const capMaterial = new THREE.MeshStandardMaterial({
    color: 0xd8e2dc,
    emissive: 0x173133,
    emissiveIntensity: 0.12,
    roughness: 0.24,
    metalness: 0.86,
    flatShading: true,
    transparent: true,
    opacity: 1
  });
  const bandMaterial = new THREE.MeshStandardMaterial({
    color: 0x26343a,
    emissive: 0x071214,
    emissiveIntensity: 0.08,
    roughness: 0.36,
    metalness: 0.88,
    flatShading: true,
    transparent: true,
    opacity: 1
  });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.102, 14), bodyMaterial);
  body.name = "viewer-tritium-canister-body";
  body.rotation.z = Math.PI / 2;
  const foreCap = new THREE.Mesh(new THREE.CylinderGeometry(0.039, 0.034, 0.018, 8), capMaterial);
  foreCap.name = "viewer-tritium-canister-fore-hex-cap";
  foreCap.rotation.z = Math.PI / 2;
  foreCap.position.x = 0.06;
  const aftCap = foreCap.clone();
  aftCap.name = "viewer-tritium-canister-aft-hex-cap";
  aftCap.position.x = -0.06;

  const forwardBand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.037, 0.037, 0.009, 14),
    bandMaterial
  );
  forwardBand.name = "viewer-tritium-canister-forward-retaining-band";
  forwardBand.rotation.z = Math.PI / 2;
  forwardBand.position.x = 0.033;
  const aftBand = forwardBand.clone();
  aftBand.name = "viewer-tritium-canister-aft-retaining-band";
  aftBand.position.x = -0.033;

  const glint = new THREE.Mesh(
    new THREE.BoxGeometry(0.058, 0.005, 0.005),
    new THREE.MeshBasicMaterial({
      color: 0xf7ffff,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  glint.name = "viewer-tritium-canister-metal-glint";
  glint.position.set(0.002, 0.031, 0.009);

  const tritiumStrip = new THREE.Mesh(
    new THREE.BoxGeometry(0.072, 0.0055, 0.009),
    new THREE.MeshBasicMaterial({
      color: 0x9effff,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending
    })
  );
  tritiumStrip.name = "viewer-tritium-canister-cyan-core-strip";
  tritiumStrip.position.set(0, 0.036, -0.001);

  const beacon = createRadialGlowSprite("viewer-tritium-canister-blinker", 0x9effff, 0.58, 0.06);
  beacon.name = "viewer-tritium-canister-blinker";
  beacon.position.set(0.012, 0.041, 0);

  if (beacon.material instanceof THREE.SpriteMaterial) {
    beacon.material.sizeAttenuation = false;
    beacon.material.depthTest = true;
  }

  const beaconLight = new THREE.PointLight(0x9effff, 0.11, 0.48, 2.4);
  beaconLight.name = "viewer-tritium-canister-blinker-light";
  beacon.renderOrder = 41;
  beacon.add(beaconLight);

  group.add(body, foreCap, aftCap, forwardBand, aftBand, glint, tritiumStrip, beacon);

  return {
    group,
    beacon,
    beaconLight,
    startTime: Number.POSITIVE_INFINITY,
    ascentDuration: 2.2,
    lifetime: 18,
    startLongitude: 0,
    startLatitude: 0,
    startY: 0,
    orbitEntryLongitude: 0,
    orbitSpeed: -orbitalSceneAngularSpeed,
    captureStartTime: Number.POSITIVE_INFINITY,
    captureDuration: 0.36,
    captureStartPosition: new THREE.Vector3(),
    captureStartScale: 1,
    active: false,
    capturing: false
  };
}

function emitTritiumCanister(
  effect: TritiumEffect,
  planetRadius: number,
  elapsed: number,
  shipAngle: number,
  planetSpin: number
): void {
  const launchIndex = effect.launchIndex;
  const startDelay = 0.3;
  const ascentDuration = 2.1 + seededUnit(launchIndex, 80) * 0.65;
  const orbitSpeed = -orbitalSceneAngularSpeed;
  const surfaceDrift = planetSpin * 0.18 + (seededUnit(launchIndex, 87) - 0.5) * 0.18;
  const baseStartLongitude = seededUnit(launchIndex, 84) * Math.PI * 2 + surfaceDrift;
  const futureShipAngle = shipAngle + orbitalSceneAngularSpeed * (startDelay + ascentDuration);
  const launchTime = elapsed + startDelay;
  const insertionTime = launchTime + ascentDuration;
  let startLongitude = baseStartLongitude;
  let orbitEntryLongitude =
    startLongitude + Math.sign(orbitSpeed) * (0.42 + seededUnit(launchIndex, 93) * 0.38);
  let bestClearance = Number.NEGATIVE_INFINITY;

  for (let attempt = 0; attempt < tritiumCanisterLaunchCandidateCount; attempt += 1) {
    const candidateStartLongitude =
      baseStartLongitude +
      attempt * 2.399963229728653 +
      (seededUnit(launchIndex + attempt, 88) - 0.5) * 0.3;
    const candidateOrbitEntryLongitude =
      candidateStartLongitude +
      Math.sign(orbitSpeed) * (0.42 + seededUnit(launchIndex + attempt, 93) * 0.38);
    const shipClearance = Math.min(
      angleDistance(candidateStartLongitude, shipAngle) - 0.95,
      angleDistance(candidateStartLongitude, futureShipAngle) - 0.82
    );
    const canisterClearance = getTritiumCanisterSpacingClearance(
      effect,
      candidateStartLongitude,
      candidateOrbitEntryLongitude,
      launchTime,
      insertionTime
    );
    const clearance = Math.min(shipClearance, canisterClearance);

    if (clearance > bestClearance) {
      startLongitude = candidateStartLongitude;
      orbitEntryLongitude = candidateOrbitEntryLongitude;
      bestClearance = clearance;
    }
  }

  const startLatitude = (seededUnit(launchIndex, 91) - 0.5) * 0.18;
  const canister = effect.canisters.find((candidate) => !candidate.active) ?? effect.canisters[0];

  canister.active = true;
  canister.capturing = false;
  canister.startTime = elapsed + startDelay;
  canister.ascentDuration = ascentDuration;
  canister.lifetime = 18 + seededUnit(launchIndex, 81) * 6;
  canister.startLongitude = startLongitude;
  canister.startLatitude = startLatitude;
  canister.startY = Math.sin(startLatitude) * planetRadius;
  canister.orbitEntryLongitude = orbitEntryLongitude;
  canister.orbitSpeed = orbitSpeed;
  canister.captureStartTime = Number.POSITIVE_INFINITY;
  canister.captureStartPosition.set(0, 0, 0);
  canister.captureStartScale = 1;
  canister.group.visible = false;
  canister.group.scale.setScalar(0.052);
  setObjectOpacity(canister.group, 1);

  const flash = effect.flashes.find((candidate) => !candidate.active) ?? effect.flashes[0];
  flash.active = true;
  flash.startTime = elapsed;
  flash.longitude = startLongitude;
  flash.latitude = startLatitude;
  flash.group.visible = true;

  effect.launchIndex += 1;
  effect.nextLaunchTime = elapsed + 0.92 + seededUnit(launchIndex, 103) * 0.72;
}

function updateTritiumFlash(flash: TritiumFlash, planetRadius: number, elapsed: number): void {
  if (!flash.active) {
    return;
  }

  const age = elapsed - flash.startTime;
  const duration = 0.16;

  if (age < 0 || age > duration) {
    flash.active = false;
    flash.group.visible = false;
    flash.light.intensity = 0;
    return;
  }

  const progress = age / duration;
  const burst = Math.sin(progress * Math.PI) * (1 - progress * 0.22);
  const surfacePoint = sphericalPoint(planetRadius * 1.038, flash.latitude, flash.longitude);
  const normal = surfacePoint.clone().normalize();
  flash.group.position.copy(surfacePoint);
  flash.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  flash.core.scale.setScalar(0.055 + progress * 0.065);
  flash.halo.scale.setScalar(0.1 + progress * 0.12);
  setBasicOpacity(flash.core.material, burst * 0.82);
  setBasicOpacity(flash.halo.material, burst * 0.13);
  flash.light.intensity = burst * 0.78;
}

function updateTritiumCanister(
  canister: TritiumCanister,
  shipPosition: THREE.Vector3,
  shipTangent: THREE.Vector3,
  receiverPoint: THREE.Vector3,
  planetRadius: number,
  elapsed: number
): void {
  if (!canister.active) {
    return;
  }

  const age = elapsed - canister.startTime;

  if (age < 0) {
    canister.group.visible = false;
    return;
  }

  if (age > canister.lifetime) {
    canister.active = false;
    canister.group.visible = false;
    canister.beaconLight.intensity = 0;
    setObjectOpacity(canister.group, 0);
    return;
  }

  if (canister.capturing) {
    const captureAge = elapsed - canister.captureStartTime;
    const captureProgress = clamp(captureAge / canister.captureDuration, 0, 1);

    if (captureProgress >= 1) {
      canister.active = false;
      canister.capturing = false;
      canister.group.visible = false;
      canister.beaconLight.intensity = 0;
      setObjectOpacity(canister.group, 0);
      return;
    }

    const dissolve = smootherStep(0, 1, captureProgress);
    const dissolvePoint = receiverPoint;
    canister.group.position.copy(canister.captureStartPosition).lerp(dissolvePoint, dissolve);
    canister.group.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), shipTangent);
    canister.group.scale.setScalar(
      getTritiumCanisterVisualScale(
        canister.group.position,
        canister.captureStartScale * (1 - dissolve * 0.38)
      )
    );
    canister.group.visible = true;
    setObjectOpacity(canister.group, 1 - smoothStep(0.08, 1, captureProgress));
    canister.beaconLight.intensity = 0.08 * (1 - dissolve);
    return;
  }

  const ascentProgress = clamp(age / canister.ascentDuration, 0, 1);
  const ascent = ascentProgress;
  const orbitAge = Math.max(0, age - canister.ascentDuration);
  const shipOrbitRadius = Math.hypot(shipPosition.x, shipPosition.z);
  const orbitalLongitude = canister.orbitEntryLongitude + canister.orbitSpeed * orbitAge;
  tritiumInsertionPoint.copy(sphericalPoint(shipOrbitRadius, 0, canister.orbitEntryLongitude));
  tritiumInsertionPoint.y = shipPosition.y;
  const orbitDirection = Math.sign(canister.orbitSpeed) || 1;
  tritiumOrbitTangent
    .set(-Math.sin(orbitalLongitude), 0, Math.cos(orbitalLongitude))
    .multiplyScalar(orbitDirection)
    .normalize();
  tritiumCanisterTangent.copy(tritiumOrbitTangent);

  if (ascentProgress < 1) {
    const orbitMatchedHandleLength = clamp(
      (shipOrbitRadius * Math.abs(canister.orbitSpeed) * canister.ascentDuration) / 3,
      planetRadius * 0.42,
      planetRadius * 0.68
    );
    tritiumLaunchPoint.copy(
      sphericalPoint(planetRadius * 1.035, canister.startLatitude, canister.startLongitude)
    );
    tritiumLaunchNormal.copy(tritiumLaunchPoint).normalize();

    tritiumArcControlPoint
      .copy(tritiumLaunchPoint)
      .addScaledVector(tritiumLaunchNormal, orbitMatchedHandleLength);
    tritiumArcExitControlPoint
      .copy(tritiumInsertionPoint)
      .addScaledVector(tritiumOrbitTangent, -orbitMatchedHandleLength);

    tritiumBezierA.copy(tritiumLaunchPoint).lerp(tritiumArcControlPoint, ascent);
    tritiumBezierB.copy(tritiumArcControlPoint).lerp(tritiumArcExitControlPoint, ascent);
    tritiumBezierC.copy(tritiumArcExitControlPoint).lerp(tritiumInsertionPoint, ascent);
    tritiumBezierA.lerp(tritiumBezierB, ascent);
    tritiumBezierB.lerp(tritiumBezierC, ascent);
    tritiumCanisterPosition.copy(tritiumBezierA).lerp(tritiumBezierB, ascent);
    tritiumCanisterTangent.copy(tritiumBezierB).sub(tritiumBezierA).normalize();
  } else {
    tritiumCanisterPosition.copy(sphericalPoint(shipOrbitRadius, 0, orbitalLongitude));
    tritiumCanisterPosition.y = shipPosition.y;
    tritiumCanisterTangent.copy(tritiumOrbitTangent);
  }

  if (ascentProgress < 1) {
    tritiumCanisterTangent.lerp(tritiumOrbitTangent, smoothStep(0.76, 1, ascentProgress));
  }
  canister.group.position.copy(tritiumCanisterPosition);
  canister.group.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), tritiumCanisterTangent);
  const scale = getTritiumCanisterVisualScale(
    tritiumCanisterPosition,
    THREE.MathUtils.lerp(0.052, 0.24, smootherStep(0, 1, ascentProgress))
  );
  canister.group.scale.setScalar(scale);
  canister.group.visible = true;
  setObjectOpacity(canister.group, 1);

  const receiverDistance = tritiumCanisterPosition.distanceTo(receiverPoint);

  if (ascentProgress >= 1 && receiverDistance < 0.2) {
    canister.capturing = true;
    canister.captureStartTime = elapsed;
    canister.captureStartPosition.copy(tritiumCanisterPosition);
    canister.captureStartScale = scale;
  }

  const blinkWave = 0.5 + 0.5 * Math.sin(elapsed * 16 + canister.startLongitude * 1.7);
  const blink = 0.24 + Math.pow(blinkWave, 5) * 0.76;
  const distanceBoost = smoothStep(5.5, 14.5, camera.position.distanceTo(tritiumCanisterPosition));
  canister.beacon.scale.setScalar(0.044 + distanceBoost * 0.03 + blink * 0.038);
  setBasicOpacity(canister.beacon.material, 0.32 + distanceBoost * 0.18 + blink * 0.5);
  canister.beaconLight.intensity = 0.065 + distanceBoost * 0.06 + blink * 0.17;
}

function getTritiumReceiverPoint(ship: THREE.Object3D): THREE.Vector3 {
  return ship.localToWorld(tritiumReceiverLocalPoint.clone());
}

function getTritiumCanisterVisualScale(position: THREE.Vector3, baseScale: number): number {
  const distanceToCamera = camera.position.distanceTo(position);
  const minimumScale = THREE.MathUtils.lerp(0.07, 0.24, smoothStep(4.6, 15.5, distanceToCamera));

  return Math.max(baseScale, minimumScale);
}

function smoothStep(edge0: number, edge1: number, value: number): number {
  const scaled = clamp((value - edge0) / Math.max(0.0001, edge1 - edge0), 0, 1);
  return scaled * scaled * (3 - 2 * scaled);
}

function smootherStep(edge0: number, edge1: number, value: number): number {
  const scaled = clamp((value - edge0) / Math.max(0.0001, edge1 - edge0), 0, 1);
  return scaled * scaled * scaled * (scaled * (scaled * 6 - 15) + 10);
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function seededUnit(index: number, salt: number): number {
  return positiveModulo(Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453, 1);
}

function hashStringToUnitInterval(id: string): number {
  let hash = 2166136261;

  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }

  return hash / 0x100000000;
}

function fract(value: number): number {
  return value - Math.floor(value);
}

function angleDistance(a: number, b: number): number {
  return Math.abs(positiveModulo(a - b + Math.PI, Math.PI * 2) - Math.PI);
}

function signedAngleDelta(from: number, to: number): number {
  return positiveModulo(to - from + Math.PI, Math.PI * 2) - Math.PI;
}

function getTritiumCanisterLongitudinalPhase(
  canister: TritiumCanister,
  sampleTime: number
): number {
  const age = sampleTime - canister.startTime;

  if (age <= 0) {
    return canister.startLongitude;
  }

  if (age < canister.ascentDuration) {
    return (
      canister.startLongitude +
      signedAngleDelta(canister.startLongitude, canister.orbitEntryLongitude) *
        clamp(age / canister.ascentDuration, 0, 1)
    );
  }

  return (
    canister.orbitEntryLongitude + canister.orbitSpeed * Math.max(0, age - canister.ascentDuration)
  );
}

function getTritiumCanisterSpacingClearance(
  effect: TritiumEffect,
  launchLongitude: number,
  orbitEntryLongitude: number,
  launchTime: number,
  insertionTime: number
): number {
  let clearance = Number.POSITIVE_INFINITY;

  for (const canister of effect.canisters) {
    if (
      !canister.active ||
      canister.capturing ||
      launchTime > canister.startTime + canister.lifetime
    ) {
      continue;
    }

    const otherLaunchPhase = getTritiumCanisterLongitudinalPhase(canister, launchTime);
    const otherInsertionPhase = getTritiumCanisterLongitudinalPhase(canister, insertionTime);

    clearance = Math.min(
      clearance,
      angleDistance(launchLongitude, otherLaunchPhase) - tritiumCanisterLaunchAngularSpacing,
      angleDistance(orbitEntryLongitude, otherInsertionPhase) - tritiumCanisterOrbitAngularSpacing
    );
  }

  return clearance;
}

function createTritiumEffect(): TritiumEffect {
  const group = new THREE.Group();
  group.name = "viewer-tritium-work-effect";

  const flashes = Array.from({ length: 5 }, (_, index) => createTritiumFlash(index));
  const canisters = Array.from({ length: 18 }, (_, index) => createTritiumCanister(index));

  for (const flash of flashes) {
    group.add(flash.group);
  }

  for (const canister of canisters) {
    group.add(canister.group);
  }

  const receiverHalo = createRadialGlowSprite("viewer-tritium-receiver-halo", 0x8eefff, 0.16, 0.72);
  receiverHalo.name = "viewer-tritium-receiver-halo";
  group.add(receiverHalo);

  const receiverCore = createRadialGlowSprite("viewer-tritium-receiver-core", 0xdffcff, 0.14, 0.28);
  receiverCore.name = "viewer-tritium-receiver-core";
  receiverCore.renderOrder = 39.1;
  group.add(receiverCore);

  const receiverLight = new THREE.PointLight(0x9effff, 0.18, 0.95, 2.1);
  receiverLight.name = "viewer-tritium-receiver-light";
  group.add(receiverLight);

  return {
    group,
    flashes,
    canisters,
    receiverHalo,
    receiverCore,
    receiverLight,
    nextLaunchTime: 0,
    launchIndex: 0
  };
}

function updateTritiumEffect(
  effect: TritiumEffect,
  shipPosition: THREE.Vector3,
  shipTangent: THREE.Vector3,
  receiverPoint: THREE.Vector3,
  planetRadius: number,
  elapsed: number,
  shipAngle: number,
  planetSpin: number
): void {
  const beat = 0.5 + 0.5 * Math.sin(elapsed * Math.PI * 2.4);

  if (elapsed >= effect.nextLaunchTime) {
    emitTritiumCanister(effect, planetRadius, elapsed, shipAngle, planetSpin);
  }

  for (const flash of effect.flashes) {
    updateTritiumFlash(flash, planetRadius, elapsed);
  }

  for (const canister of effect.canisters) {
    updateTritiumCanister(
      canister,
      shipPosition,
      shipTangent,
      receiverPoint,
      planetRadius,
      elapsed
    );
  }

  effect.receiverHalo.position.copy(receiverPoint);
  effect.receiverCore.position.copy(receiverPoint).addScaledVector(shipTangent, 0.006);
  effect.receiverLight.position.copy(receiverPoint);
  effect.receiverHalo.scale.set(0.9 + beat * 0.12, 0.28 + beat * 0.04, 1);
  effect.receiverCore.scale.set(0.34 + beat * 0.04, 0.1 + beat * 0.02, 1);
  setBasicOpacity(effect.receiverHalo.material, 0.12 + beat * 0.05);
  setBasicOpacity(effect.receiverCore.material, 0.09 + beat * 0.04);
  effect.receiverLight.intensity = 0.07 + beat * 0.1;
}

function createEvadeEffect(): EvadeEffect {
  const group = new THREE.Group();
  group.name = "viewer-evade-effect";
  const tracerGroup = new THREE.Group();
  tracerGroup.name = "viewer-evade-tracer-burst";
  const muzzleFlash = createRadialGlowSprite("viewer-evade-pds-muzzle-flash", 0xdffcff, 0, 0.24);
  muzzleFlash.name = "viewer-evade-pds-muzzle-flash";
  muzzleFlash.renderOrder = 48;
  if (muzzleFlash.material instanceof THREE.SpriteMaterial) {
    muzzleFlash.material.depthTest = false;
  }
  const muzzleLight = new THREE.PointLight(0xdffcff, 0, 0.62, 2.4);
  muzzleLight.name = "viewer-evade-pds-muzzle-light";
  group.add(tracerGroup, muzzleFlash, muzzleLight);

  return {
    group,
    tracerGroup,
    muzzleFlash,
    muzzleLight,
    burst: null,
    explosion: null
  };
}

function getEvadeFireVectors(ship: THREE.Object3D): void {
  ship.updateWorldMatrix(true, false);
  evadeMuzzleWorld.copy(evadeFuelScoopLocalPoint);
  ship.localToWorld(evadeMuzzleWorld);
  evadeAxisWorld.copy(evadeFireAxisLocalDirection).transformDirection(ship.matrixWorld).normalize();
  evadeTargetWorld.copy(evadeMuzzleWorld).addScaledVector(evadeAxisWorld, evadeTracerRange);
  evadeConeBasisA.crossVectors(evadeAxisWorld, camera.up);

  if (evadeConeBasisA.lengthSq() < 0.0001) {
    evadeConeBasisA.set(0, 1, 0).cross(evadeAxisWorld);
  }

  evadeConeBasisA.normalize();
  evadeConeBasisB.crossVectors(evadeAxisWorld, evadeConeBasisA).normalize();
}

function createEvadeTracerBurst(
  muzzleWorld: THREE.Vector3,
  targetWorld: THREE.Vector3,
  axisWorld: THREE.Vector3,
  coneBasisA: THREE.Vector3,
  coneBasisB: THREE.Vector3,
  elapsed: number
): EvadeTracerBurst {
  const segments: EvadeTracerSegment[] = [];
  const range = Math.max(0.1, muzzleWorld.distanceTo(targetWorld));

  for (let index = 0; index < evadeTracerCount; index += 1) {
    const rawProgress = index / Math.max(1, evadeTracerCount - 1);
    const progress = getEvadeTracerEmissionProgress(rawProgress);
    const terminalDensity = smootherStep(0.58, 1, progress);
    const spinAngle = getEvadeTracerSpinAngle(progress, 11.8);
    const coneRadius = getEvadeTracerConeRadius(progress) * (0.985 + seededUnit(index, 703) * 0.03);
    const radialDirection = getEvadeTracerRadialDirection(coneBasisA, coneBasisB, spinAngle);
    const shotDirection = axisWorld
      .clone()
      .multiplyScalar(range)
      .addScaledVector(radialDirection, coneRadius)
      .normalize();
    const travelProgress = THREE.MathUtils.lerp(0.38, 1.02, smootherStep(0, 1, progress));
    const travelJitter =
      (seededUnit(index, 709) - 0.5) * THREE.MathUtils.lerp(0.12, 0.025, terminalDensity);
    const tracerEndDistance = range * clamp(travelProgress + travelJitter, 0.28, 1.04);
    const tracerLength =
      THREE.MathUtils.lerp(0.2, 0.56, terminalDensity) * (0.82 + seededUnit(index, 708) * 0.28);
    const tracerStartDistance = Math.max(0.045, tracerEndDistance - tracerLength);
    const start = muzzleWorld.clone().addScaledVector(shotDirection, tracerStartDistance);
    const end = muzzleWorld.clone().addScaledVector(shotDirection, tracerEndDistance);
    const isMainTracer = index % 9 === 0 || progress > 0.84;
    const hotColor =
      isMainTracer && progress > 0.82
        ? 0xffffff
        : isMainTracer || progress > 0.64
          ? 0xd9fdff
          : 0x67c8dd;
    const material = new THREE.LineBasicMaterial({
      color: hotColor,
      transparent: true,
      opacity: 0,
      depthTest: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    material.toneMapped = false;
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([start, end]), material);
    line.name = `viewer-evade-tracer-${index}`;
    line.renderOrder = 44 + index * 0.002;
    line.frustumCulled = false;
    segments.push({
      line,
      material,
      startTime: elapsed + progress * evadeTracerBurstDuration + seededUnit(index, 705) * 0.002,
      lifetime:
        evadeTracerFadeDuration +
        seededUnit(index, 706) * 0.86 -
        smoothStep(0.7, 1, progress) * 0.34,
      baseOpacity:
        (isMainTracer ? 0.22 : 0.055) +
        seededUnit(index, 707) * (isMainTracer ? 0.2 : 0.055) +
        terminalDensity * (isMainTracer ? 0.64 : 0.34)
    });
  }

  const originGuideCount = 28;

  for (let guideIndex = 0; guideIndex < originGuideCount; guideIndex += 1) {
    const guideProgress = (guideIndex / Math.max(1, originGuideCount - 1)) * 0.5;
    const spinAngle = getEvadeTracerSpinAngle(guideProgress, 5.8);
    const coneRadius = getEvadeTracerConeRadius(guideProgress) * 0.74;
    const radialDirection = getEvadeTracerRadialDirection(coneBasisA, coneBasisB, spinAngle);
    const shotDirection = axisWorld
      .clone()
      .multiplyScalar(range)
      .addScaledVector(radialDirection, coneRadius)
      .normalize();
    const guideStart = muzzleWorld.clone().addScaledVector(shotDirection, 0.035);
    const guideEnd = muzzleWorld
      .clone()
      .addScaledVector(
        shotDirection,
        THREE.MathUtils.lerp(0.42, 1.28, guideIndex / Math.max(1, originGuideCount - 1))
      );
    const material = new THREE.LineBasicMaterial({
      color: guideIndex % 4 === 0 ? 0xffffff : 0xd9fdff,
      transparent: true,
      opacity: 0,
      depthTest: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    material.toneMapped = false;
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([guideStart, guideEnd]),
      material
    );
    line.name = `viewer-evade-origin-tracer-${guideIndex}`;
    line.renderOrder = 45.2 + guideIndex * 0.001;
    line.frustumCulled = false;
    segments.push({
      line,
      material,
      startTime: elapsed + guideIndex * 0.003,
      lifetime: 2.35 + seededUnit(guideIndex, 744) * 0.54,
      baseOpacity: 0.2 + seededUnit(guideIndex, 745) * 0.2
    });
  }

  return {
    segments,
    startTime: elapsed,
    burstDuration: evadeTracerBurstDuration,
    fadeDuration: evadeTracerFadeDuration
  };
}

function getEvadeTracerEmissionProgress(rawProgress: number): number {
  if (rawProgress < 0.24) {
    return (rawProgress / 0.24) * 0.48;
  }

  const terminalProgress = (rawProgress - 0.24) / 0.76;
  return 0.48 + (1 - Math.pow(1 - terminalProgress, 3.65)) * 0.52;
}

function getEvadeTracerSpinAngle(progress: number, turns: number): number {
  const easing = smootherStep(0, 1, progress);

  return progress * Math.PI * 2 * turns + easing * Math.PI * 2.4;
}

function getEvadeTracerConeRadius(progress: number): number {
  const initialSweep = 1 - smootherStep(0.04, 1, progress);
  const terminalNeedle = 1 - smoothStep(0.82, 1, progress) * 0.995;

  return evadeTracerMaxConeRadius * initialSweep * terminalNeedle;
}

function getEvadeTracerRadialDirection(
  coneBasisA: THREE.Vector3,
  coneBasisB: THREE.Vector3,
  angle: number
): THREE.Vector3 {
  return coneBasisA
    .clone()
    .multiplyScalar(Math.cos(angle))
    .addScaledVector(coneBasisB, Math.sin(angle))
    .normalize();
}

function createEvadeNuclearExplosion(
  position: THREE.Vector3,
  axis: THREE.Vector3,
  startTime: number
): EvadeNuclearExplosion {
  const group = new THREE.Group();
  group.name = "viewer-evade-nuclear-flash";
  group.visible = false;
  group.position.copy(position);
  group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), axis.clone().normalize());

  const glare = createEvadeImpactRetinalPoint(
    "viewer-evade-missile-impact-nuclear-glare",
    0xffffff,
    96,
    0,
    50
  );
  const flashPoint = createEvadeImpactRetinalPoint(
    "viewer-evade-missile-impact-flash-point",
    0xfffdf4,
    18,
    0,
    52
  );
  const afterimage = createEvadeImpactRetinalPoint(
    "viewer-evade-missile-impact-retinal-afterimage",
    evadeImpactBodyFlashColor,
    72,
    0,
    47
  );
  const light = new THREE.PointLight(evadeImpactBodyFlashColor, 0, 18, 2.1);
  light.name = "viewer-evade-nuclear-light";
  group.add(afterimage, glare, flashPoint, light);

  return {
    group,
    glare,
    flashPoint,
    afterimage,
    light,
    startTime,
    duration: evadeImpactAfterglowDurationSeconds
  };
}

function createEvadeImpactRetinalPoint(
  name: string,
  color: THREE.ColorRepresentation,
  pixelSize: number,
  opacity: number,
  renderOrder: number
): THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));
  const material = new THREE.PointsMaterial({
    color,
    map: createRadialGlowTexture(name, color),
    size: pixelSize,
    sizeAttenuation: false,
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending
  });
  material.toneMapped = false;
  const point = new THREE.Points(geometry, material);
  point.name = name;
  point.renderOrder = renderOrder;
  point.frustumCulled = false;
  return point;
}

function updateEvadeEffect(effect: EvadeEffect, elapsed: number): void {
  updateEvadeExplosion(effect, elapsed);

  if (effect.burst !== null) {
    let hasVisibleOrPendingSegments = false;
    updateEvadeMuzzleFlash(effect, elapsed);

    for (const segment of effect.burst.segments) {
      const age = elapsed - segment.startTime;

      if (age < 0) {
        segment.material.opacity = 0;
        hasVisibleOrPendingSegments = true;
        continue;
      }

      if (age <= segment.lifetime) {
        hasVisibleOrPendingSegments = true;
      }

      const progress = clamp(age / segment.lifetime, 0, 1);
      const attack = smoothStep(0, 0.028, age);
      const fade = 1 - smootherStep(0.18, 1, progress);
      segment.material.opacity = segment.baseOpacity * attack * fade;
    }

    if (!hasVisibleOrPendingSegments) {
      clearGroup(effect.tracerGroup);
      effect.burst = null;
      updateEvadeMuzzleFlash(effect, elapsed);
    }
  } else {
    setBasicOpacity(effect.muzzleFlash.material, 0);
    effect.muzzleLight.intensity = 0;
  }
}

function updateEvadeMuzzleFlash(effect: EvadeEffect, elapsed: number): void {
  if (effect.burst === null) {
    setBasicOpacity(effect.muzzleFlash.material, 0);
    effect.muzzleLight.intensity = 0;
    return;
  }

  const age = elapsed - effect.burst.startTime;
  const flash = smoothStep(0, 0.018, age) * (1 - smoothStep(0.08, 0.44, age));
  const ember =
    smoothStep(0.12, effect.burst.burstDuration, age) * (1 - smoothStep(0.36, 1.2, age));
  const opacity = clamp(flash * 1.08 + ember * 0.32, 0, 0.96);
  effect.muzzleFlash.scale.setScalar(0.2 + flash * 0.32 + ember * 0.12);
  setBasicOpacity(effect.muzzleFlash.material, opacity);
  effect.muzzleLight.intensity = flash * 0.86 + ember * 0.24;
}

function updateEvadeExplosion(effect: EvadeEffect, elapsed: number): void {
  if (effect.explosion === null) {
    return;
  }

  const explosion = effect.explosion;
  const age = elapsed - explosion.startTime;

  if (age < 0) {
    explosion.group.visible = false;
    explosion.light.intensity = 0;
    return;
  }

  const flashProgress = clamp(age / evadeImpactFlashDurationSeconds, 0, 1);
  const afterglowProgress = clamp(
    (age - evadeImpactFlashDurationSeconds * 0.2) / evadeImpactAfterglowDurationSeconds,
    0,
    1
  );
  const flashOpacity = Math.max(0, 1 - smoothStep(0.01, 0.82, flashProgress));
  const afterimageOpacity = Math.max(0, 1 - smoothStep(0.02, 0.82, afterglowProgress));
  const coreExpansion = smoothStep(0, 0.34, flashProgress);
  const afterimageExpansion = smoothStep(0, 0.18, afterglowProgress);
  const ignitionFlicker = 0.94 + Math.sin(age * 68 + 4.7) * 0.06;
  explosion.group.visible = true;
  setRetinalPoint(
    explosion.glare,
    THREE.MathUtils.lerp(96, 420, coreExpansion),
    flashOpacity * 0.92
  );
  setRetinalPoint(
    explosion.flashPoint,
    THREE.MathUtils.lerp(18, 160, coreExpansion),
    Math.min(1, flashOpacity * 1.55)
  );
  setRetinalPoint(
    explosion.afterimage,
    THREE.MathUtils.lerp(72, 240, afterimageExpansion) +
      THREE.MathUtils.lerp(0, 48, afterglowProgress),
    afterimageOpacity * THREE.MathUtils.lerp(0.74, 0.045, afterglowProgress)
  );
  explosion.light.intensity = 11.8 * flashOpacity * ignitionFlicker;

  if (age >= explosion.duration) {
    effect.group.remove(explosion.group);
    disposeObject(explosion.group);
    effect.explosion = null;
  }
}

function setRetinalPoint(
  point: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>,
  pixelSize: number,
  opacity: number
): void {
  point.material.size = pixelSize;
  point.material.opacity = clamp(opacity, 0, 1);
  point.visible = opacity > 0.004;
}

function createShipyardEffect(): ShipyardEffect {
  const group = new THREE.Group();
  group.name = "viewer-shipyard-work-effect";
  const launchedRing = createShipyardAssemblyRing();
  const surfaceFlash = createShipyardSurfaceFlash();
  const assemblyPieces = createShipyardAssemblyPieces();
  const assemblyStruts = createShipyardAssemblyStruts();

  group.add(
    launchedRing.group,
    ...assemblyPieces.map((piece) => piece.group),
    assemblyStruts.group,
    surfaceFlash.group
  );

  return {
    group,
    launchedRing,
    surfaceFlash,
    assemblyPieces,
    assemblyStruts,
    launchIndex: 0,
    sequenceStep: 0,
    enginePushStartTime: Number.POSITIVE_INFINITY,
    shipPower: 0
  };
}

function createShipyardSurfaceFlash(): ShipyardSurfaceFlash {
  const group = new THREE.Group();
  group.name = "viewer-shipyard-surface-assembly-flash";
  group.visible = false;

  const core = createRadialGlowSprite("viewer-shipyard-surface-flash-core", 0xfff4dc, 0, 0.12);
  const halo = createRadialGlowSprite("viewer-shipyard-surface-flash-halo", 0xffb65f, 0, 0.22);
  const light = new THREE.PointLight(0xffc27a, 0, 1.16, 2.4);
  light.name = "viewer-shipyard-surface-flash-light";
  group.add(halo, core, light);

  return {
    group,
    core,
    halo,
    light,
    startTime: Number.NEGATIVE_INFINITY,
    longitude: 0,
    active: false
  };
}

function createShipyardAssemblyPieces(): ShipyardAssemblyPiece[] {
  return [
    createShipyardAssemblyPiece("fuel-scoop"),
    createShipyardAssemblyPiece("weapons"),
    createShipyardAssemblyPiece("radiator"),
    createShipyardAssemblyPiece("engine")
  ];
}

function createShipyardAssemblyPiece(kind: ShipyardAssemblyKind): ShipyardAssemblyPiece {
  const group = createShipyardAssemblyModule(kind);
  const distances = getShipyardAssemblyPieceDistances(kind);
  group.name = `viewer-shipyard-launched-${kind}`;
  group.visible = false;
  group.scale.setScalar(0.001);

  return {
    kind,
    group,
    launchQuaternion: new THREE.Quaternion(),
    startTime: Number.POSITIVE_INFINITY,
    ascentDuration:
      kind === "engine"
        ? shipyardAssemblyEngineAscentDuration
        : shipyardAssemblyModuleAscentDuration,
    settleDuration:
      kind === "engine"
        ? shipyardAssemblyEngineSettleDuration
        : shipyardAssemblyOrbitSettleDuration,
    launchLongitude: 0,
    bendSign: -1,
    baseAxialOffset: distances.base,
    finalAxialOffset: distances.final,
    targetScale: shipyardSceneShipScale * distances.scale,
    active: false
  };
}

function getShipyardAssemblyPieceDistances(
  kind: ShipyardAssemblyKind
): Readonly<{ base: number; final: number; scale: number }> {
  if (kind === "fuel-scoop") {
    return shipyardAssemblyModuleOffsets.fuelScoop;
  }

  if (kind === "weapons") {
    return shipyardAssemblyModuleOffsets.weapons;
  }

  if (kind === "radiator") {
    return shipyardAssemblyModuleOffsets.radiator;
  }

  return shipyardAssemblyModuleOffsets.engine;
}

function createShipyardAssemblyModule(kind: ShipyardAssemblyKind): THREE.Group {
  if (kind === "fuel-scoop") {
    return createShipyardFuelScoopModule();
  }

  if (kind === "weapons") {
    return createShipyardWeaponsModule();
  }

  if (kind === "radiator") {
    return createShipyardRadiatorModule();
  }

  return createShipyardEngineModule();
}

function createShipyardAssemblyStruts(): ShipyardAssemblyStruts {
  const group = new THREE.Group();
  group.name = "viewer-shipyard-assembly-struts";
  group.visible = false;
  const strutMaterial = new THREE.MeshBasicMaterial({
    color: factionColor,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: true
  });
  const struts = Array.from({ length: 4 }, (_, index) => {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 6), strutMaterial);
    strut.name = `viewer-shipyard-assembly-strut-${index}`;
    strut.visible = false;
    strut.renderOrder = 37.6;
    group.add(strut);
    return strut;
  });

  return {
    group,
    struts,
    startTime: Number.POSITIVE_INFINITY,
    active: false
  };
}

function createShipyardAssemblyRing(): ShipyardAssemblyRing {
  const group = createDormantShipEngineRing();
  group.name = "viewer-shipyard-launched-engine-ring";
  group.visible = false;
  group.scale.setScalar(0.001);
  addShipyardIndustrialBlinkers(group, "ring");

  return {
    group,
    launchQuaternion: new THREE.Quaternion(),
    startTime: Number.POSITIVE_INFINITY,
    ascentDuration: shipyardAssemblyAscentDuration,
    settleDuration: shipyardAssemblyOrbitSettleDuration,
    launchLongitude: 0,
    bendSign: -1,
    active: false
  };
}

function createDormantShipEngineRing(): THREE.Group {
  const sourceShip = createRingHexShipModel({
    factionColor,
    state: "idle"
  });
  const sourceRotor = sourceShip.getObjectByName("ship-ring-hex-engine-rotor");

  if (!(sourceRotor instanceof THREE.Group)) {
    disposeObject(sourceShip);
    throw new Error("Could not clone ring-hex ship engine ring");
  }

  const ring = sourceRotor.clone(true);
  ring.position.set(0, 0, 0);
  ring.rotation.set(0, 0, 0);
  ring.userData["ringHexEngineRotor"] = false;
  const strutsToRemove: THREE.Object3D[] = [];

  ring.traverse((child) => {
    child.userData["ringHexEngineRotor"] = false;

    if (child.name.includes("ship-ring-hex-ring-strut")) {
      strutsToRemove.push(child);
    }

    if (child instanceof THREE.PointLight) {
      child.visible = false;
      child.intensity = 0;
      return;
    }

    if (child instanceof THREE.Mesh) {
      child.geometry = child.geometry.clone();
      child.material = cloneMaterial(child.material);

      if (child.name.includes("engine-ring-interior-glow")) {
        child.visible = false;
        setBasicOpacity(child.material, 0);
      }
    }
  });

  for (const strut of strutsToRemove) {
    strut.parent?.remove(strut);
    disposeObject(strut);
  }

  disposeObject(sourceShip);
  return ring;
}

function createShipyardModuleMaterials(): {
  hull: THREE.MeshStandardMaterial;
  dark: THREE.MeshStandardMaterial;
  faction: THREE.MeshStandardMaterial;
  radiator: THREE.MeshStandardMaterial;
  glow: THREE.MeshBasicMaterial;
} {
  const hull = new THREE.MeshStandardMaterial({
    color: 0x9aa8ad,
    roughness: 0.4,
    metalness: 0.78,
    flatShading: true
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x3a474d,
    emissive: 0x071012,
    emissiveIntensity: 0.06,
    roughness: 0.44,
    metalness: 0.82,
    flatShading: true
  });
  const faction = hull.clone();
  faction.color = new THREE.Color(factionColor);
  faction.emissive = new THREE.Color(factionColor);
  faction.emissiveIntensity = 0.13;
  const radiator = new THREE.MeshStandardMaterial({
    color: 0x30383d,
    emissive: 0x040607,
    emissiveIntensity: 0.06,
    roughness: 0.5,
    metalness: 0.68
  });
  const glow = new THREE.MeshBasicMaterial({
    color: 0x9ff8ff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending
  });
  glow.toneMapped = false;

  return { hull, dark, faction, radiator, glow };
}

function createShipyardAxialMesh(
  name: string,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  x: number
): THREE.Mesh {
  geometry.rotateZ(Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, material.clone());
  mesh.name = name;
  mesh.position.x = x;
  mesh.renderOrder = 36.6;
  return mesh;
}

function createShipyardTorusMesh(
  name: string,
  radius: number,
  tubeRadius: number,
  material: THREE.Material,
  x: number
): THREE.Mesh {
  const geometry = new THREE.TorusGeometry(radius, tubeRadius, 6, 18);
  geometry.rotateY(Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, material.clone());
  mesh.name = name;
  mesh.position.x = x;
  mesh.renderOrder = 36.8;
  return mesh;
}

function addShipyardIndustrialBlinkers(group: THREE.Group, kind: ShipyardAssemblyLaunchKind): void {
  const localPoints = getShipyardIndustrialBlinkerPoints(kind);
  const positions = new Float32Array(localPoints.length * 3);

  for (let index = 0; index < localPoints.length; index += 1) {
    const point = localPoints[index];
    positions[index * 3] = point.x;
    positions[index * 3 + 1] = point.y;
    positions[index * 3 + 2] = point.z;
  }

  const color = getShipyardIndustrialBlinkerColor(kind);
  const material = new THREE.PointsMaterial({
    color,
    map: createRadialGlowTexture(`viewer-shipyard-industrial-blinker-${kind}`, color),
    size: kind === "ring" ? 7.4 : 8.6,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending
  });
  material.toneMapped = false;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const blinkers = new THREE.Points(geometry, material);
  blinkers.name = `viewer-shipyard-${kind}-industrial-blinkers`;
  blinkers.renderOrder = 43.5;
  blinkers.frustumCulled = false;
  blinkers.userData["shipyardIndustrialBlinker"] = true;
  blinkers.userData["shipyardIndustrialBlinkerBaseSize"] = material.size;
  blinkers.userData["shipyardIndustrialBlinkerPhase"] = hashStringToUnitInterval(
    `shipyard-blinker:${kind}`
  );
  group.add(blinkers);

  for (let index = 0; index < Math.min(3, localPoints.length); index += 1) {
    const light = new THREE.PointLight(color, 0, kind === "ring" ? 0.34 : 0.28, 2.2);
    light.name = `viewer-shipyard-${kind}-industrial-blinker-light-${index}`;
    light.position.copy(localPoints[index]);
    light.userData["shipyardIndustrialBlinkerLight"] = true;
    light.userData["shipyardIndustrialBlinkerPhase"] =
      hashStringToUnitInterval(`shipyard-blinker-light:${kind}:${index}`) + index * 0.17;
    light.userData["shipyardIndustrialBlinkerBaseIntensity"] = kind === "engine" ? 0.17 : 0.12;
    group.add(light);
  }
}

function getShipyardIndustrialBlinkerColor(
  kind: ShipyardAssemblyLaunchKind
): THREE.ColorRepresentation {
  if (kind === "engine" || kind === "ring") {
    return 0xa8f7ff;
  }

  if (kind === "radiator") {
    return 0xffc768;
  }

  return 0xffa85f;
}

function getShipyardIndustrialBlinkerPoints(kind: ShipyardAssemblyLaunchKind): THREE.Vector3[] {
  if (kind === "ring") {
    return [
      new THREE.Vector3(0, 0.5, 0),
      new THREE.Vector3(0, -0.5, 0),
      new THREE.Vector3(0, 0, 0.5),
      new THREE.Vector3(0, 0, -0.5)
    ];
  }

  if (kind === "fuel-scoop") {
    return [
      new THREE.Vector3(0.102, 0.128, 0),
      new THREE.Vector3(0.102, -0.128, 0),
      new THREE.Vector3(-0.12, 0, 0.074),
      new THREE.Vector3(-0.12, 0, -0.074)
    ];
  }

  if (kind === "weapons") {
    return Array.from({ length: 6 }, (_, index) => {
      const angle = Math.PI / 6 + (index / 6) * Math.PI * 2;
      return new THREE.Vector3(0.03, Math.cos(angle) * 0.104, Math.sin(angle) * 0.104);
    });
  }

  if (kind === "radiator") {
    return [
      new THREE.Vector3(-0.02, 0.148, 0.026),
      new THREE.Vector3(-0.02, -0.148, 0.026),
      new THREE.Vector3(-0.02, 0.026, 0.148),
      new THREE.Vector3(-0.02, 0.026, -0.148),
      new THREE.Vector3(-0.18, 0, 0.088)
    ];
  }

  return [
    new THREE.Vector3(0.044, 0.138, 0),
    new THREE.Vector3(0.044, -0.138, 0),
    new THREE.Vector3(-0.086, 0, 0.154),
    new THREE.Vector3(-0.086, 0, -0.154),
    new THREE.Vector3(-0.232, 0.078, 0),
    new THREE.Vector3(-0.232, -0.078, 0)
  ];
}

function updateShipyardIndustrialBlinkers(
  rootObject: THREE.Object3D,
  elapsed: number,
  power: number
): void {
  const visibility = clamp(power, 0, 1);
  const zoomBoost = smoothStep(8, 32, cameraState.distance);

  rootObject.traverse((child) => {
    if (
      child instanceof THREE.Points &&
      child.material instanceof THREE.PointsMaterial &&
      child.userData["shipyardIndustrialBlinker"] === true
    ) {
      const phase = getNumericUserData(child, "shipyardIndustrialBlinkerPhase");
      const baseSize = getNumericUserData(child, "shipyardIndustrialBlinkerBaseSize") || 8;
      const wave = 0.5 + 0.5 * Math.sin(elapsed * 11.8 + phase * Math.PI * 2);
      const step = Math.pow(wave, 8.5);
      child.material.size = baseSize + zoomBoost * 6.2 + step * 2.8;
      child.material.opacity = visibility * (0.22 + zoomBoost * 0.18 + step * 0.78);
      child.visible = child.material.opacity > 0.004;
      return;
    }

    if (
      child instanceof THREE.PointLight &&
      child.userData["shipyardIndustrialBlinkerLight"] === true
    ) {
      const phase = getNumericUserData(child, "shipyardIndustrialBlinkerPhase");
      const baseIntensity = getNumericUserData(child, "shipyardIndustrialBlinkerBaseIntensity");
      const wave = 0.5 + 0.5 * Math.sin(elapsed * 9.6 + phase * Math.PI * 2);
      child.visible = visibility > 0.01;
      child.intensity = visibility * baseIntensity * (0.28 + Math.pow(wave, 7) * 1.2);
    }
  });
}

function createShipyardFuelScoopModule(): THREE.Group {
  const group = new THREE.Group();
  const materials = createShipyardModuleMaterials();
  const scoopMaterial = materials.dark.clone();
  scoopMaterial.side = THREE.DoubleSide;
  const scoop = createShipyardAxialMesh(
    "viewer-shipyard-fuel-scoop-open-intake",
    new THREE.CylinderGeometry(0.052, 0.142, 0.17, 18, 1, true),
    scoopMaterial,
    0.012
  );
  const rim = createShipyardTorusMesh(
    "viewer-shipyard-fuel-scoop-field-rim",
    0.143,
    0.007,
    materials.faction,
    0.094
  );
  const throat = createShipyardAxialMesh(
    "viewer-shipyard-fuel-scoop-throat-cylinder",
    new THREE.CylinderGeometry(0.05, 0.062, 0.112, 14, 1),
    materials.hull,
    -0.08
  );
  const glowMaterial = materials.glow.clone();
  glowMaterial.opacity = 0.34;
  const field = new THREE.Mesh(new THREE.CircleGeometry(0.126, 24), glowMaterial);
  field.name = "viewer-shipyard-fuel-scoop-dormant-field";
  field.position.x = 0.105;
  field.rotation.y = Math.PI / 2;
  field.renderOrder = 37.1;
  const spine = createShipyardAxialMesh(
    "viewer-shipyard-fuel-scoop-aft-spine",
    new THREE.CylinderGeometry(0.032, 0.038, 0.12, 12, 1),
    materials.dark,
    -0.165
  );
  group.add(scoop, rim, throat, field, spine);
  addShipyardIndustrialBlinkers(group, "fuel-scoop");
  return group;
}

function createShipyardWeaponsModule(): THREE.Group {
  const group = new THREE.Group();
  const materials = createShipyardModuleMaterials();
  const hex = createShipyardAxialMesh(
    "viewer-shipyard-weapons-hex-module",
    new THREE.CylinderGeometry(0.088, 0.088, 0.13, 6, 1),
    materials.faction,
    -0.02
  );
  hex.rotation.x = Math.PI / 6;
  const cylinder = createShipyardAxialMesh(
    "viewer-shipyard-weapons-forward-cylinder",
    new THREE.CylinderGeometry(0.058, 0.058, 0.14, 14, 1),
    materials.hull,
    -0.15
  );

  for (let index = 0; index < 6; index += 1) {
    const angle = Math.PI / 6 + (index / 6) * Math.PI * 2;
    const launcher = createShipyardAxialMesh(
      `viewer-shipyard-weapons-launcher-${index}`,
      new THREE.CylinderGeometry(0.011, 0.011, 0.102, 8, 1),
      index % 2 === 0 ? materials.dark : materials.hull,
      0.018
    );
    launcher.position.y = Math.cos(angle) * 0.086;
    launcher.position.z = Math.sin(angle) * 0.086;
    group.add(launcher);
  }

  group.add(hex, cylinder);
  addShipyardIndustrialBlinkers(group, "weapons");
  return group;
}

function createShipyardRadiatorModule(): THREE.Group {
  const group = new THREE.Group();
  const materials = createShipyardModuleMaterials();
  const habitat = createShipyardAxialMesh(
    "viewer-shipyard-folded-radiator-habitat-module",
    new THREE.CylinderGeometry(0.116, 0.116, 0.132, 6, 1),
    materials.faction,
    -0.03
  );
  habitat.rotation.x = Math.PI / 6;
  const cylinder = createShipyardAxialMesh(
    "viewer-shipyard-folded-radiator-aft-cylinder",
    new THREE.CylinderGeometry(0.066, 0.066, 0.152, 14, 1),
    materials.hull,
    -0.188
  );

  for (let index = 0; index < 4; index += 1) {
    const angle = (index / 4) * Math.PI * 2;
    const radialY = Math.cos(angle);
    const radialZ = Math.sin(angle);

    for (let fold = 0; fold < 4; fold += 1) {
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(0.128, 0.009, 0.038),
        materials.radiator.clone()
      );
      panel.name = `viewer-shipyard-radiator-folded-panel-${index}-${fold}`;
      panel.position.set(
        -0.032 + fold * 0.012,
        radialY * (0.128 + fold * 0.006),
        radialZ * (0.128 + fold * 0.006)
      );
      panel.rotation.x = angle;
      panel.renderOrder = 36.72;
      group.add(panel);
    }
  }

  group.add(habitat, cylinder);
  addShipyardIndustrialBlinkers(group, "radiator");
  return group;
}

function createShipyardEngineModule(): THREE.Group {
  const group = new THREE.Group();
  const materials = createShipyardModuleMaterials();
  const engine = createShipyardAxialMesh(
    "viewer-shipyard-engine-core-cylinder",
    new THREE.CylinderGeometry(0.152, 0.138, 0.154, 18, 1),
    materials.dark,
    -0.02
  );
  engine.scale.x = 0.94;
  const interstage = createShipyardAxialMesh(
    "viewer-shipyard-engine-interstage-frustum",
    new THREE.CylinderGeometry(0.118, 0.154, 0.078, 18, 1),
    materials.dark,
    -0.13
  );
  const nozzle = createShipyardAxialMesh(
    "viewer-shipyard-engine-exhaust-nozzle",
    new THREE.CylinderGeometry(0.082, 0.126, 0.112, 18, 1, true),
    materials.dark,
    -0.232
  );
  const frontCollar = createShipyardTorusMesh(
    "viewer-shipyard-engine-front-field-collar",
    0.14,
    0.0052,
    materials.hull,
    0.045
  );
  const rearCollar = createShipyardTorusMesh(
    "viewer-shipyard-engine-rear-field-collar",
    0.155,
    0.006,
    materials.hull,
    -0.086
  );
  const throatMaterial = materials.glow.clone();
  const throat = createShipyardTorusMesh(
    "viewer-shipyard-engine-plasma-throat",
    0.054,
    0.006,
    throatMaterial,
    -0.272
  );
  const glowMaterial = materials.glow.clone();
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), glowMaterial);
  glow.name = "viewer-shipyard-engine-plasma-glow";
  glow.position.x = -0.292;
  glow.scale.set(0.9, 0.25, 0.25);
  glow.renderOrder = 37.4;
  const light = new THREE.PointLight(0xa8f7ff, 0, 0.72, 2);
  light.name = "viewer-shipyard-engine-plasma-light";
  glow.add(light);
  group.add(engine, interstage, nozzle, frontCollar, rearCollar, throat, glow);
  addShipyardIndustrialBlinkers(group, "engine");
  return group;
}

function cloneMaterial<T extends THREE.Material | THREE.Material[]>(material: T): T {
  if (Array.isArray(material)) {
    return material.map((entry) => entry.clone()) as T;
  }

  return material.clone() as T;
}

function emitShipyardAssemblyRing(
  effect: ShipyardEffect,
  planetRadius: number,
  orbitRadius: number,
  elapsed: number,
  shipAngle: number,
  planetSpin: number
): void {
  const launchIndex = effect.launchIndex;
  const launchDelay = getShipyardAssemblyLaunchDelay("ring", launchIndex);
  const launchTime = elapsed + launchDelay;
  const launchShipAngle = shipAngle + orbitalSceneAngularSpeed * launchDelay;
  const launchPlanetSpin = planetSpin + launchDelay * 0.08;
  const orbitDirection = getOrbitDirection();
  const bendSign = (orbitDirection === 1 ? -1 : 1) as -1 | 1;
  const tailAngleOffset = shipyardAssemblyFollowDistance / Math.max(0.001, orbitRadius);
  const launchOffset =
    orbitDirection *
    (tailAngleOffset + shipyardAssemblyLaunchTailLeadAngle + seededUnit(launchIndex, 520) * 0.035);
  const surfaceDrift = launchPlanetSpin * 0.055 + (seededUnit(launchIndex, 521) - 0.5) * 0.035;
  const launchLongitude = launchShipAngle - launchOffset + surfaceDrift;
  const launchNormal = sphericalPoint(1, 0, launchLongitude).normalize();

  effect.launchedRing.active = true;
  effect.launchedRing.startTime = launchTime;
  effect.launchedRing.ascentDuration =
    shipyardAssemblyAscentDuration + seededUnit(launchIndex, 522) * 0.12;
  effect.launchedRing.launchLongitude = launchLongitude;
  effect.launchedRing.bendSign = bendSign;
  effect.launchedRing.launchQuaternion.setFromUnitVectors(
    new THREE.Vector3(1, 0, 0),
    launchNormal.clone().multiplyScalar(-1)
  );
  effect.launchedRing.group.visible = true;
  effect.launchedRing.group.position.copy(
    sphericalPoint(planetRadius * shipyardAssemblyLaunchSurfaceScale, 0, launchLongitude)
  );
  effect.launchedRing.group.quaternion.copy(effect.launchedRing.launchQuaternion);
  effect.launchedRing.group.scale.setScalar(0.001);
  setShipyardRingPower(effect.launchedRing.group, 0);
  updateShipyardIndustrialBlinkers(effect.launchedRing.group, elapsed, 0);
  emitShipyardSurfaceFlash(effect.surfaceFlash, launchTime, launchLongitude);
  effect.launchIndex += 1;
}

function emitShipyardAssemblyPiece(
  effect: ShipyardEffect,
  kind: ShipyardAssemblyKind,
  planetRadius: number,
  orbitRadius: number,
  elapsed: number,
  shipAngle: number,
  planetSpin: number
): void {
  const piece = effect.assemblyPieces.find((candidate) => candidate.kind === kind);

  if (piece === undefined) {
    return;
  }

  const launchIndex = effect.launchIndex;
  const launchDelay = getShipyardAssemblyLaunchDelay(kind, launchIndex);
  const launchTime = elapsed + launchDelay;
  const launchShipAngle = shipAngle + orbitalSceneAngularSpeed * launchDelay;
  const launchPlanetSpin = planetSpin + launchDelay * 0.08;
  const orbitDirection = getOrbitDirection();
  const bendSign = (orbitDirection === 1 ? -1 : 1) as -1 | 1;
  const launchFollowDistance = shipyardAssemblyFollowDistance - piece.baseAxialOffset;
  const launchOffset =
    orbitDirection *
    (launchFollowDistance / Math.max(0.001, orbitRadius) +
      0.09 +
      seededUnit(launchIndex, 620) * 0.035);
  const surfaceDrift = launchPlanetSpin * 0.05 + (seededUnit(launchIndex, 621) - 0.5) * 0.03;
  const launchLongitude = launchShipAngle - launchOffset + surfaceDrift;
  const launchNormal = sphericalPoint(1, 0, launchLongitude).normalize();

  piece.active = true;
  piece.startTime = launchTime;
  piece.ascentDuration =
    kind === "engine"
      ? shipyardAssemblyEngineAscentDuration + seededUnit(launchIndex, 622) * 0.16
      : shipyardAssemblyModuleAscentDuration + seededUnit(launchIndex, 622) * 0.18;
  piece.launchLongitude = launchLongitude;
  piece.bendSign = bendSign;
  piece.launchQuaternion.setFromUnitVectors(
    new THREE.Vector3(1, 0, 0),
    launchNormal.clone().multiplyScalar(-1)
  );
  piece.group.visible = true;
  piece.group.position.copy(
    sphericalPoint(planetRadius * shipyardAssemblyLaunchSurfaceScale, 0, launchLongitude)
  );
  piece.group.quaternion.copy(piece.launchQuaternion);
  piece.group.scale.setScalar(0.001);
  setObjectOpacity(piece.group, 1);
  setShipyardEngineModulePower(piece.group, 0);
  updateShipyardIndustrialBlinkers(piece.group, elapsed, 0);
  emitShipyardSurfaceFlash(effect.surfaceFlash, launchTime, launchLongitude);
  effect.launchIndex += 1;
}

function getShipyardAssemblyLaunchDelay(
  kind: ShipyardAssemblyLaunchKind,
  launchIndex: number
): number {
  const baseDelay =
    kind === "ring"
      ? shipyardAssemblyRingLaunchDelay
      : kind === "engine"
        ? shipyardAssemblyEngineLaunchDelay
        : shipyardAssemblyModuleLaunchDelay;
  return baseDelay + seededUnit(launchIndex, 618) * shipyardAssemblyLaunchDelayJitter;
}

function emitShipyardSurfaceFlash(
  flash: ShipyardSurfaceFlash,
  elapsed: number,
  longitude: number
): void {
  flash.active = true;
  flash.startTime = elapsed;
  flash.longitude = longitude;
  flash.group.visible = true;
}

function updateShipyardEffect(
  effect: ShipyardEffect,
  ship: THREE.Object3D,
  planetRadius: number,
  orbitRadius: number,
  elapsed: number,
  shipAngle: number
): void {
  const pushProgress = Number.isFinite(effect.enginePushStartTime)
    ? smootherStep(0, 1, (elapsed - effect.enginePushStartTime) / shipyardAssemblyPushDuration)
    : 0;
  const ignitionPower = smootherStep(0.72, 1, pushProgress);

  effect.shipPower = ignitionPower;
  updateShipyardSurfaceFlash(effect.surfaceFlash, planetRadius, elapsed);
  updateShipyardAssemblyRing(
    effect.launchedRing,
    ship,
    planetRadius,
    orbitRadius,
    elapsed,
    shipAngle
  );
  setShipyardRingPower(effect.launchedRing.group, ignitionPower);

  for (const piece of effect.assemblyPieces) {
    updateShipyardAssemblyPiece(
      piece,
      ship,
      planetRadius,
      orbitRadius,
      elapsed,
      shipAngle,
      pushProgress
    );
  }

  updateShipyardAssemblyStruts(effect, pushProgress);
}

function updateShipyardSurfaceFlash(
  flash: ShipyardSurfaceFlash,
  planetRadius: number,
  elapsed: number
): void {
  if (!flash.active) {
    return;
  }

  const age = elapsed - flash.startTime;
  const duration = 0.19;

  if (age < 0) {
    flash.group.visible = false;
    flash.light.intensity = 0;
    return;
  }

  if (age > duration) {
    flash.active = false;
    flash.group.visible = false;
    flash.light.intensity = 0;
    return;
  }

  const progress = age / duration;
  const burst = Math.sin(progress * Math.PI) * (1 - progress * 0.2);
  const surfacePoint = sphericalPoint(
    planetRadius * shipyardAssemblyLaunchSurfaceScale,
    0,
    flash.longitude
  );
  const normal = surfacePoint.clone().normalize();
  flash.group.position.copy(surfacePoint);
  flash.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  flash.core.scale.setScalar(0.062 + progress * 0.074);
  flash.halo.scale.setScalar(0.12 + progress * 0.16);
  setBasicOpacity(flash.core.material, burst * 0.88);
  setBasicOpacity(flash.halo.material, burst * 0.18);
  flash.light.intensity = burst * 0.95;
}

function updateShipyardAssemblyRing(
  ring: ShipyardAssemblyRing,
  ship: THREE.Object3D,
  planetRadius: number,
  orbitRadius: number,
  elapsed: number,
  shipAngle: number
): void {
  if (!ring.active) {
    ring.group.visible = false;
    return;
  }

  const age = elapsed - ring.startTime;

  if (age < 0) {
    ring.group.visible = false;
    updateShipyardIndustrialBlinkers(ring.group, elapsed, 0);
    return;
  }

  const ascentProgress = clamp(age / ring.ascentDuration, 0, 1);
  const settleProgress = clamp((age - ring.ascentDuration) / ring.settleDuration, 0, 1);
  const settle = smootherStep(0, 1, settleProgress);
  const ascent = smootherStep(0, 1, ascentProgress);
  writeShipyardAssemblyFollowFrame(
    shipyardRingFollowPosition,
    shipyardRingFollowTangent,
    planetRadius,
    orbitRadius,
    shipAngle,
    shipyardAssemblyFollowDistance + shipyardAssemblyOrbitSettleLagDistance * (1 - settle)
  );

  if (ascentProgress < 1) {
    shipyardLaunchPoint.copy(
      sphericalPoint(planetRadius * shipyardAssemblyLaunchSurfaceScale, 0, ring.launchLongitude)
    );
    shipyardLaunchNormal.copy(shipyardLaunchPoint).normalize();
    shipyardLaunchBendTangent
      .copy(getOrbitTangent(ring.launchLongitude))
      .multiplyScalar(ring.bendSign);
    shipyardLaunchControlA
      .copy(shipyardLaunchPoint)
      .addScaledVector(shipyardLaunchNormal, planetRadius * 0.58)
      .addScaledVector(shipyardLaunchBendTangent, planetRadius * 0.14);
    shipyardLaunchControlB
      .copy(shipyardRingFollowPosition)
      .addScaledVector(shipyardLaunchNormal, planetRadius * 0.16)
      .addScaledVector(shipyardRingFollowTangent, -planetRadius * 0.24);

    shipyardRingBezierA.copy(shipyardLaunchPoint).lerp(shipyardLaunchControlA, ascent);
    shipyardRingBezierB.copy(shipyardLaunchControlA).lerp(shipyardLaunchControlB, ascent);
    shipyardRingBezierC.copy(shipyardLaunchControlB).lerp(shipyardRingFollowPosition, ascent);
    shipyardRingBezierA.lerp(shipyardRingBezierB, ascent);
    shipyardRingBezierB.lerp(shipyardRingBezierC, ascent);
    shipyardRingPosition.copy(shipyardRingBezierA).lerp(shipyardRingBezierB, ascent);
  } else {
    shipyardRingPosition.copy(shipyardRingFollowPosition);
  }

  shipyardRingTargetQuaternion.copy(ship.quaternion);
  shipyardRingLaunchQuaternion
    .copy(ring.launchQuaternion)
    .slerp(
      shipyardRingTargetQuaternion,
      smootherStep(0.2, 1, clamp(age / (ring.ascentDuration + ring.settleDuration * 0.35), 0, 1))
    );

  const baseScale = THREE.MathUtils.lerp(
    0.001,
    shipyardAssemblyRingBaseScale,
    smootherStep(0.04, 0.86, ascentProgress)
  );
  const visualScale = getShipyardAssemblyRingVisualScale(
    shipyardRingPosition,
    baseScale,
    ascentProgress
  );

  ring.group.visible = true;
  ring.group.position.copy(shipyardRingPosition);
  ring.group.quaternion.copy(shipyardRingLaunchQuaternion);
  ring.group.scale.setScalar(visualScale);
  updateShipyardIndustrialBlinkers(ring.group, elapsed, smoothStep(0, 0.22, age));
}

function updateShipyardAssemblyPiece(
  piece: ShipyardAssemblyPiece,
  ship: THREE.Object3D,
  planetRadius: number,
  orbitRadius: number,
  elapsed: number,
  shipAngle: number,
  pushProgress: number
): void {
  if (!piece.active) {
    piece.group.visible = false;
    return;
  }

  const age = elapsed - piece.startTime;

  if (age < 0) {
    piece.group.visible = false;
    updateShipyardIndustrialBlinkers(piece.group, elapsed, 0);
    return;
  }

  const ascentProgress = clamp(age / piece.ascentDuration, 0, 1);
  const settleProgress = clamp((age - piece.ascentDuration) / piece.settleDuration, 0, 1);
  const settle = smootherStep(0, 1, settleProgress);
  const ascent = smootherStep(0, 1, ascentProgress);
  const axialOffset = getShipyardAssemblyPieceOffset(piece.kind, pushProgress);
  writeShipyardAssemblyFollowFrame(
    shipyardModuleFollowPosition,
    shipyardModuleFollowTangent,
    planetRadius,
    orbitRadius,
    shipAngle,
    shipyardAssemblyFollowDistance + shipyardAssemblyOrbitSettleLagDistance * (1 - settle)
  );
  shipyardModuleFollowPosition.addScaledVector(shipyardModuleFollowTangent, axialOffset);

  if (ascentProgress < 1) {
    shipyardLaunchPoint.copy(
      sphericalPoint(planetRadius * shipyardAssemblyLaunchSurfaceScale, 0, piece.launchLongitude)
    );
    shipyardLaunchNormal.copy(shipyardLaunchPoint).normalize();
    shipyardLaunchBendTangent
      .copy(getOrbitTangent(piece.launchLongitude))
      .multiplyScalar(piece.bendSign);
    shipyardLaunchControlA
      .copy(shipyardLaunchPoint)
      .addScaledVector(shipyardLaunchNormal, planetRadius * 0.62)
      .addScaledVector(shipyardLaunchBendTangent, planetRadius * 0.16);
    shipyardLaunchControlB
      .copy(shipyardModuleFollowPosition)
      .addScaledVector(shipyardLaunchNormal, planetRadius * 0.18)
      .addScaledVector(shipyardModuleFollowTangent, -planetRadius * 0.26);

    shipyardRingBezierA.copy(shipyardLaunchPoint).lerp(shipyardLaunchControlA, ascent);
    shipyardRingBezierB.copy(shipyardLaunchControlA).lerp(shipyardLaunchControlB, ascent);
    shipyardRingBezierC.copy(shipyardLaunchControlB).lerp(shipyardModuleFollowPosition, ascent);
    shipyardRingBezierA.lerp(shipyardRingBezierB, ascent);
    shipyardRingBezierB.lerp(shipyardRingBezierC, ascent);
    shipyardModulePosition.copy(shipyardRingBezierA).lerp(shipyardRingBezierB, ascent);
  } else {
    shipyardModulePosition.copy(shipyardModuleFollowPosition);
  }

  shipyardModuleTargetQuaternion.copy(ship.quaternion);
  shipyardModuleLaunchQuaternion
    .copy(piece.launchQuaternion)
    .slerp(
      shipyardModuleTargetQuaternion,
      smootherStep(0.16, 1, clamp(age / (piece.ascentDuration + piece.settleDuration * 0.36), 0, 1))
    );
  const targetScale = piece.targetScale * (piece.kind === "engine" ? 1 + pushProgress * 0.05 : 1);
  const baseScale = THREE.MathUtils.lerp(
    0.001,
    targetScale,
    smootherStep(0.04, 0.86, ascentProgress)
  );
  const visualScale = getShipyardAssemblyPieceVisualScale(
    shipyardModulePosition,
    baseScale,
    targetScale,
    ascentProgress
  );

  piece.group.visible = true;
  piece.group.position.copy(shipyardModulePosition);
  piece.group.quaternion.copy(shipyardModuleLaunchQuaternion);
  piece.group.scale.setScalar(visualScale);

  if (piece.kind === "engine") {
    setShipyardEngineModulePower(piece.group, smootherStep(0.34, 1, pushProgress));
  }

  updateShipyardIndustrialBlinkers(piece.group, elapsed, smoothStep(0, 0.24, age));
}

function getShipyardAssemblyPieceOffset(kind: ShipyardAssemblyKind, pushProgress: number): number {
  const engineOffset = THREE.MathUtils.lerp(
    shipyardAssemblyModuleOffsets.engine.base,
    shipyardAssemblyModuleOffsets.engine.final,
    pushProgress
  );
  const radiatorOffset = Math.min(
    shipyardAssemblyModuleOffsets.radiator.final,
    Math.max(
      shipyardAssemblyModuleOffsets.radiator.base,
      engineOffset + shipyardAssemblyPushSpacing
    )
  );
  const weaponsOffset = Math.min(
    shipyardAssemblyModuleOffsets.weapons.final,
    Math.max(
      shipyardAssemblyModuleOffsets.weapons.base,
      radiatorOffset + shipyardAssemblyPushSpacing
    )
  );
  const fuelScoopOffset = Math.min(
    shipyardAssemblyModuleOffsets.fuelScoop.final,
    Math.max(
      shipyardAssemblyModuleOffsets.fuelScoop.base,
      weaponsOffset + shipyardAssemblyPushSpacing
    )
  );

  if (kind === "engine") {
    return engineOffset;
  }

  if (kind === "radiator") {
    return radiatorOffset;
  }

  if (kind === "weapons") {
    return weaponsOffset;
  }

  return fuelScoopOffset;
}

function updateShipyardAssemblyStruts(effect: ShipyardEffect, pushProgress: number): void {
  const engine = effect.assemblyPieces.find((piece) => piece.kind === "engine");
  const strutProgress = smootherStep(0.68, 1, pushProgress);

  if (
    engine === undefined ||
    !engine.active ||
    !effect.launchedRing.active ||
    strutProgress <= 0.001
  ) {
    effect.assemblyStruts.group.visible = false;
    for (const strut of effect.assemblyStruts.struts) {
      strut.visible = false;
      setBasicOpacity(strut.material, 0);
    }
    return;
  }

  effect.assemblyStruts.group.visible = true;
  shipyardStrutStart.copy(engine.group.position);

  for (let index = 0; index < effect.assemblyStruts.struts.length; index += 1) {
    const angle = (index / effect.assemblyStruts.struts.length) * Math.PI * 2;
    const radial = new THREE.Vector3(0, Math.cos(angle) * 0.58, Math.sin(angle) * 0.58);
    radial.multiplyScalar(effect.launchedRing.group.scale.x);
    radial.applyQuaternion(effect.launchedRing.group.quaternion);
    shipyardStrutEnd.copy(effect.launchedRing.group.position).add(radial);
    shipyardStrutEnd.lerpVectors(shipyardStrutStart, shipyardStrutEnd, strutProgress);
    shipyardStrutDirection.copy(shipyardStrutEnd).sub(shipyardStrutStart);
    const length = shipyardStrutDirection.length();
    const strut = effect.assemblyStruts.struts[index];

    if (length <= 0.0001) {
      strut.visible = false;
      continue;
    }

    shipyardStrutDirection.normalize();
    shipyardStrutMidpoint.copy(shipyardStrutStart).add(shipyardStrutEnd).multiplyScalar(0.5);
    shipyardStrutOrientation.setFromUnitVectors(new THREE.Vector3(0, 1, 0), shipyardStrutDirection);
    strut.visible = true;
    strut.position.copy(shipyardStrutMidpoint);
    strut.quaternion.copy(shipyardStrutOrientation);
    strut.scale.set(1, length, 1);
    setBasicOpacity(strut.material, strutProgress * 0.95);
  }
}

function setShipyardRingPower(ring: THREE.Object3D, power: number): void {
  ring.traverse((child) => {
    if (child instanceof THREE.PointLight && child.name.includes("engine-ring-cast-light")) {
      child.visible = power > 0.002;
      child.intensity = power * 1.85;
      return;
    }

    if (child instanceof THREE.Mesh && child.name.includes("engine-ring-interior-glow")) {
      child.visible = power > 0.002;
      setBasicOpacity(child.material, power * 0.82);
    }
  });
}

function setShipyardEngineModulePower(engine: THREE.Object3D, power: number): void {
  engine.traverse((child) => {
    if (child instanceof THREE.PointLight && child.name.includes("plasma-light")) {
      child.intensity = power * 0.95;
      return;
    }

    if (child instanceof THREE.Mesh && child.name.includes("plasma")) {
      setBasicOpacity(child.material, power * 0.72);
      child.visible = power > 0.002;
    }
  });
}

function writeShipyardAssemblyFollowFrame(
  position: THREE.Vector3,
  tangent: THREE.Vector3,
  planetRadius: number,
  orbitRadius: number,
  shipAngle: number,
  followDistance: number
): void {
  const orbitDirection = getOrbitDirection();
  const zoomDistance = smoothStep(9, 30, cameraState.distance) * shipyardAssemblyFollowZoomDistance;
  const followAngle =
    shipAngle - orbitDirection * ((followDistance + zoomDistance) / Math.max(0.001, orbitRadius));
  position.copy(sphericalPoint(orbitRadius, 0, followAngle));
  position.y = planetRadius * 0.2;
  tangent.copy(getOrbitTangent(followAngle));
}

function getShipyardAssemblyRingVisualScale(
  position: THREE.Vector3,
  baseScale: number,
  ascentProgress: number
): number {
  const distanceToCamera = camera.position.distanceTo(position);
  const readableScale = THREE.MathUtils.lerp(
    shipyardAssemblyRingBaseScale,
    shipyardAssemblyRingBaseScale * 1.46,
    smoothStep(10, 34, distanceToCamera)
  );
  const minimumScale = THREE.MathUtils.lerp(
    0.001,
    readableScale,
    smoothStep(0.76, 1, ascentProgress)
  );

  return Math.max(baseScale, minimumScale);
}

function getShipyardAssemblyPieceVisualScale(
  position: THREE.Vector3,
  baseScale: number,
  targetScale: number,
  ascentProgress: number
): number {
  const distanceToCamera = camera.position.distanceTo(position);
  const readableScale = THREE.MathUtils.lerp(
    targetScale * 1.05,
    targetScale * 1.54,
    smoothStep(10, 34, distanceToCamera)
  );
  const minimumScale = THREE.MathUtils.lerp(
    0.001,
    readableScale,
    smoothStep(0.68, 1, ascentProgress)
  );

  return Math.max(baseScale, minimumScale);
}

function getOrbitTangent(angle: number): THREE.Vector3 {
  return new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle))
    .multiplyScalar(getOrbitDirection())
    .normalize();
}

function getViewerSceneOrbitAngle(current: ViewerScene, elapsed: number): number {
  return current.orbitPhase + (elapsed - current.startedAt) * orbitalSceneAngularSpeed;
}

function getOrbitDirection(): 1 | -1 {
  return orbitalSceneAngularSpeed >= 0 ? 1 : -1;
}

function clearGroup(group: THREE.Group): void {
  for (const child of [...group.children]) {
    group.remove(child);
    disposeObject(child);
  }
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (
      child instanceof THREE.Mesh ||
      child instanceof THREE.Line ||
      child instanceof THREE.Points ||
      child instanceof THREE.Sprite
    ) {
      if ("geometry" in child) {
        child.geometry.dispose();
      }
      const materials = Array.isArray(child.material) ? child.material : [child.material];

      for (const material of materials) {
        if ("map" in material && material.map instanceof THREE.Texture) {
          material.map.dispose();
        }
        material.dispose();
      }
    }
  });
}

function positiveModulo(value: number, period: number): number {
  return ((value % period) + period) % period;
}

function setBasicOpacity(material: THREE.Material | THREE.Material[], opacity: number): void {
  const materials = Array.isArray(material) ? material : [material];

  for (const candidate of materials) {
    if (
      candidate instanceof THREE.MeshBasicMaterial ||
      candidate instanceof THREE.LineBasicMaterial ||
      candidate instanceof THREE.PointsMaterial ||
      candidate instanceof THREE.SpriteMaterial
    ) {
      candidate.opacity = opacity;
      candidate.transparent = true;
    }
  }
}

function setObjectOpacity(object: THREE.Object3D, opacity: number): void {
  object.traverse((child) => {
    if (
      !(
        child instanceof THREE.Mesh ||
        child instanceof THREE.Line ||
        child instanceof THREE.Points ||
        child instanceof THREE.Sprite
      )
    ) {
      return;
    }

    if (child.userData["shipyardIndustrialBlinker"] === true) {
      return;
    }

    const materials = Array.isArray(child.material) ? child.material : [child.material];

    for (const material of materials) {
      if ("opacity" in material) {
        material.opacity = opacity;
        material.transparent = true;
      }
    }
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
