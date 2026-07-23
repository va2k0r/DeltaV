import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { FactionId } from "../../core";
import { markCinematicDecorativePointLightSource } from "./decorativeLights";
import type { Cinematic3dVisualTuning } from "./visualTuning";

export type ShipModelVariant = "double-cylinder" | "hex-modular" | "ring-hex" | "legacy";

export const defaultShipModelVariant: ShipModelVariant = "ring-hex";

const shipMetalSunGlintBaseOpacity = 0.085;
const shipMetalSunGlintSpecularPower = 26;
const shipEngineBloomPointHdrIntensity = 12;
const shipEngineBloomPointSize = 4.5;

function getNumericUserData(object: THREE.Object3D, key: string): number {
  const userData = object.userData as Record<string, unknown>;
  const value = userData[key];
  return typeof value === "number" ? value : 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function smootherStep(edge0: number, edge1: number, value: number): number {
  const scaled = clamp((value - edge0) / Math.max(0.0001, edge1 - edge0), 0, 1);
  return scaled * scaled * scaled * (scaled * (scaled * 6 - 15) + 10);
}

function positiveModulo(value: number, period: number): number {
  return ((value % period) + period) % period;
}

function markShipComplexModelDetail(object: THREE.Object3D): void {
  object.traverse((child) => {
    child.userData["shipComplexModelDetail"] = true;
  });
}

function hashStringToUnitInterval(id: string): number {
  let hash = 2166136261;

  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }

  return hash / 0x100000000;
}

function createShipServiceBlinkLight(
  name: string,
  color: THREE.ColorRepresentation,
  position: THREE.Vector3,
  options: Readonly<{
    baseIntensity: number;
    boostIntensity: number;
    baseDistance: number;
    pointSize: number;
    baseOpacity: number;
  }>
): THREE.Group {
  const beacon = new THREE.Group();
  beacon.name = name;
  beacon.position.copy(position);
  beacon.renderOrder = 38;
  beacon.userData["shipServiceBlinkLight"] = true;

  const light = markCinematicDecorativePointLightSource(
    new THREE.PointLight(color, 0, options.baseDistance, 2.2)
  );
  light.name = `${name}-point-light`;
  light.userData["shipServiceBlinkPointLight"] = true;
  light.userData["baseIntensity"] = options.baseIntensity;
  light.userData["boostIntensity"] = options.boostIntensity;
  light.userData["baseDistance"] = options.baseDistance;
  beacon.add(light);

  const lensGeometry = new THREE.BufferGeometry();
  lensGeometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0], 3));
  const lensMaterial = new THREE.PointsMaterial({
    color,
    transparent: true,
    opacity: options.baseOpacity,
    size: options.pointSize,
    sizeAttenuation: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending
  });
  lensMaterial.toneMapped = false;
  const lens = new THREE.Points(lensGeometry, lensMaterial);
  lens.name = `${name}-pinpoint`;
  lens.renderOrder = 38.2;
  lens.userData["shipServiceBlinkLens"] = true;
  lens.userData["baseOpacity"] = options.baseOpacity;
  lens.userData["baseSize"] = options.pointSize;
  beacon.add(lens);

  return beacon;
}

function createShipEngineBloomPoint(positionX: number): THREE.Points {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0], 3));

  const material = new THREE.PointsMaterial({
    color: new THREE.Color(0xcfffff).multiplyScalar(shipEngineBloomPointHdrIntensity),
    transparent: true,
    opacity: 1,
    size: shipEngineBloomPointSize,
    sizeAttenuation: false,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending
  });
  // Keep the engine's HDR energy intact for the separate bloom extraction pass. The direct
  // renderer still clips this to a compact luminous point rather than a visible mesh effect.
  material.toneMapped = false;

  const point = new THREE.Points(geometry, material);
  point.name = "ship-engine-bloom-point";
  point.position.x = positionX;
  point.renderOrder = 37;
  point.userData["shipEngineHdrBloomPoint"] = true;
  point.userData["baseX"] = positionX;
  return point;
}

type ShipModelVisualState = "idle" | "burn";

type ShipModelFactoryOptions = Readonly<{
  tuning: Cinematic3dVisualTuning;
  factionColor: THREE.ColorRepresentation;
  state: ShipModelVisualState;
  radiatorExtension: number;
  engineIntensity: number;
  variant: ShipModelVariant;
}>;

export function createShipMarkerObject(
  tuning: Cinematic3dVisualTuning,
  factionColor: THREE.ColorRepresentation = tuning.playerFactionColor,
  factionId: FactionId = "player",
  isTransitMarker = false,
  variant: ShipModelVariant = defaultShipModelVariant
): THREE.Group {
  const root = new THREE.Group();
  root.name = "ship-marker";
  root.userData["factionId"] = factionId;

  const model = createHardSciFiShipModel({
    tuning,
    factionColor,
    state: isTransitMarker ? "burn" : "idle",
    radiatorExtension: 1,
    engineIntensity: isTransitMarker ? 1 : 0.36,
    variant
  });

  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 18, 12),
    new THREE.MeshBasicMaterial({
      color: factionColor,
      transparent: true,
      opacity: tuning.shipMarkerOpacity,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending
    })
  );
  dot.name = "ship-collapsed-dot";
  dot.visible = false;
  dot.renderOrder = 38;

  const dotGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 16, 10),
    new THREE.MeshBasicMaterial({
      color: factionColor,
      transparent: true,
      opacity: tuning.shipMarkerOpacity * tuning.shipDotGlowStrength,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending
    })
  );
  dotGlow.name = "ship-collapsed-dot-glow";
  dotGlow.visible = false;
  dotGlow.renderOrder = 37.8;

  const silhouette = createCollapsedShipSilhouette(factionColor, tuning.shipMarkerOpacity);

  root.add(model, silhouette, dotGlow, dot);
  cacheShipMarkerPresentationObjects(root, model, silhouette, dotGlow, dot);
  return root;
}

function cacheShipMarkerPresentationObjects(
  root: THREE.Group,
  model: THREE.Group,
  silhouette: THREE.Group,
  dotGlow: THREE.Mesh,
  dot: THREE.Mesh
): void {
  root.userData["shipModelObject"] = model;
  root.userData["shipCollapsedSilhouetteObject"] = silhouette;
  root.userData["shipCollapsedDotGlowObject"] = dotGlow;
  root.userData["shipCollapsedDotObject"] = dot;
  root.userData["shipEngineBloomPointObject"] = model.getObjectByName("ship-engine-bloom-point");
  root.userData["shipEngineRotorObject"] = model.getObjectByName("ship-ring-hex-engine-rotor");
  root.userData["shipDriveWakeObject"] = model.getObjectByName("ship-electromagnetic-drive-wake");
  root.userData["shipNoseBlinkLightObject"] = model.getObjectByName("ship-nose-blink-light");
  root.userData["shipSensorLightObject"] = model.getObjectByName("ship-sensor-light");
}

function createCollapsedShipSilhouette(
  factionColor: THREE.ColorRepresentation,
  opacity: number
): THREE.Group {
  const silhouette = new THREE.Group();
  silhouette.name = "ship-collapsed-ring-silhouette";
  silhouette.visible = false;
  silhouette.renderOrder = 37.9;

  const ringMaterial = new THREE.MeshBasicMaterial({
    color: factionColor,
    transparent: true,
    opacity: opacity * 0.68,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending
  });
  ringMaterial.toneMapped = false;
  const ringGeometry = new THREE.TorusGeometry(0.46, 0.033, 6, 36);
  ringGeometry.rotateX(Math.PI / 2);
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.name = "ship-collapsed-silhouette-ring";
  ring.renderOrder = 37.92;
  silhouette.add(ring);

  const coreMaterial = new THREE.MeshBasicMaterial({
    color: 0xe8fbff,
    transparent: true,
    opacity: opacity * 0.26,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending
  });
  coreMaterial.toneMapped = false;

  for (let index = 0; index < 4; index += 1) {
    const angle = (index / 4) * Math.PI * 2;
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.29), coreMaterial.clone());
    strut.name = `ship-collapsed-silhouette-strut-${index}`;
    strut.position.set(Math.cos(angle) * 0.072, 0, Math.sin(angle) * 0.072);
    strut.rotation.y = -angle;
    strut.renderOrder = 37.94;
    silhouette.add(strut);
  }

  const core = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 5), coreMaterial.clone());
  core.name = "ship-collapsed-silhouette-core";
  core.renderOrder = 37.96;
  silhouette.add(core);

  return silhouette;
}

function createHardSciFiShipModel(options: ShipModelFactoryOptions): THREE.Group {
  const { engineIntensity, factionColor, tuning } = options;
  const isDoubleCylinderVariant = options.variant === "double-cylinder";
  const isHexModularVariant = options.variant === "hex-modular";
  const isRingHexVariant = options.variant === "ring-hex";
  const isSegmentedVariant = isDoubleCylinderVariant || isHexModularVariant || isRingHexVariant;
  const model = new THREE.Group();
  model.name = "ship-model";
  model.userData["shipModelState"] = options.state;
  model.userData["shipModelVariant"] = options.variant;

  const hullMaterial = new THREE.MeshStandardMaterial({
    color: 0x8d9aa5,
    emissive: factionColor,
    emissiveIntensity: 0.13,
    roughness: 0.82,
    metalness: 0.48,
    transparent: true,
    opacity: tuning.shipMarkerOpacity
  });
  const darkHullMaterial = new THREE.MeshStandardMaterial({
    color: 0x34404a,
    emissive: 0x05070a,
    emissiveIntensity: 0.06,
    roughness: 0.88,
    metalness: 0.55,
    transparent: true,
    opacity: tuning.shipMarkerOpacity
  });
  const radiatorMaterial = new THREE.MeshStandardMaterial({
    color: 0x25323a,
    emissive: factionColor,
    emissiveIntensity: 0.07,
    roughness: 0.94,
    metalness: 0.38,
    transparent: true,
    opacity: tuning.shipMarkerOpacity * 0.88
  });
  const accentMaterial = new THREE.MeshBasicMaterial({
    color: 0xa8bac2,
    transparent: true,
    opacity: 0.3,
    depthWrite: false
  });
  const driveGlowMaterial = new THREE.MeshBasicMaterial({
    color: 0x7adfff,
    transparent: true,
    opacity: 0.32 + engineIntensity * 0.2,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending
  });

  if (isRingHexVariant) {
    buildRingHexShipModel(model, {
      tuning,
      factionColor,
      hullMaterial,
      darkHullMaterial,
      radiatorMaterial,
      driveGlowMaterial,
      state: options.state,
      radiatorExtension: options.radiatorExtension
    });
    return model;
  }

  if (isDoubleCylinderVariant) {
    const forwardCylinderGeometry = new THREE.CylinderGeometry(0.235, 0.235, 0.3, 18, 1);
    forwardCylinderGeometry.rotateZ(Math.PI / 2);
    const forwardCylinder = new THREE.Mesh(forwardCylinderGeometry, hullMaterial.clone());
    forwardCylinder.name = "ship-forward-cylinder";
    forwardCylinder.position.x = 0.42;
    forwardCylinder.renderOrder = 36;
    addShipMetalMeshWithSunGlint(model, forwardCylinder, 1.08);

    const midCylinderGeometry = new THREE.CylinderGeometry(0.235, 0.235, 0.36, 18, 1);
    midCylinderGeometry.rotateZ(Math.PI / 2);
    const midCylinder = new THREE.Mesh(midCylinderGeometry, hullMaterial.clone());
    midCylinder.name = "ship-mid-cylinder";
    midCylinder.position.x = -0.1;
    midCylinder.renderOrder = 36;
    addShipMetalMeshWithSunGlint(model, midCylinder, 0.92);

    const aftCylinderGeometry = new THREE.CylinderGeometry(0.235, 0.235, 0.34, 18, 1);
    aftCylinderGeometry.rotateZ(Math.PI / 2);
    const aftCylinder = new THREE.Mesh(aftCylinderGeometry, darkHullMaterial.clone());
    aftCylinder.name = "ship-aft-cylinder";
    aftCylinder.position.x = -0.65;
    aftCylinder.renderOrder = 36;
    addShipMetalMeshWithSunGlint(model, aftCylinder, 0.76);

    const forwardBridge = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.27, 0.25),
      hullMaterial.clone()
    );
    forwardBridge.name = "ship-forward-cylinder-bridge";
    forwardBridge.position.x = 0.14;
    forwardBridge.renderOrder = 36;
    addShipMetalMeshWithSunGlint(model, forwardBridge, 0.82);

    const aftBridge = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.27, 0.25), hullMaterial.clone());
    aftBridge.name = "ship-aft-cylinder-bridge";
    aftBridge.position.x = -0.38;
    aftBridge.renderOrder = 36;
    addShipMetalMeshWithSunGlint(model, aftBridge, 0.74);
  } else if (isHexModularVariant) {
    const moduleLength = 0.26;

    const forwardHexGeometry = new THREE.CylinderGeometry(0.255, 0.255, moduleLength, 6, 1);
    forwardHexGeometry.rotateZ(Math.PI / 2);
    const forwardHex = new THREE.Mesh(forwardHexGeometry, hullMaterial.clone());
    forwardHex.name = "ship-hex-forward-module";
    forwardHex.position.x = 0.44;
    forwardHex.rotation.x = Math.PI / 6;
    forwardHex.renderOrder = 36;
    addShipMetalMeshWithSunGlint(model, forwardHex, 1.08);

    const forwardCylinderGeometry = new THREE.CylinderGeometry(0.225, 0.225, moduleLength, 18, 1);
    forwardCylinderGeometry.rotateZ(Math.PI / 2);
    const forwardCylinder = new THREE.Mesh(forwardCylinderGeometry, hullMaterial.clone());
    forwardCylinder.name = "ship-hex-forward-cylinder";
    forwardCylinder.position.x = 0.16;
    forwardCylinder.renderOrder = 36;
    addShipMetalMeshWithSunGlint(model, forwardCylinder, 0.92);

    const centralHexGeometry = new THREE.CylinderGeometry(0.305, 0.305, moduleLength, 6, 1);
    centralHexGeometry.rotateZ(Math.PI / 2);
    const centralHex = new THREE.Mesh(centralHexGeometry, darkHullMaterial.clone());
    centralHex.name = "ship-hex-central-module";
    centralHex.position.x = -0.12;
    centralHex.rotation.x = Math.PI / 6;
    centralHex.renderOrder = 36;
    addShipMetalMeshWithSunGlint(model, centralHex, 0.86);

    const aftCylinderGeometry = new THREE.CylinderGeometry(0.18, 0.18, moduleLength, 18, 1);
    aftCylinderGeometry.rotateZ(Math.PI / 2);
    const aftCylinder = new THREE.Mesh(aftCylinderGeometry, darkHullMaterial.clone());
    aftCylinder.name = "ship-hex-aft-cylinder";
    aftCylinder.position.x = -0.4;
    aftCylinder.renderOrder = 36;
    addShipMetalMeshWithSunGlint(model, aftCylinder, 0.72);
  } else {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.32, 0.34), hullMaterial.clone());
    hull.name = "ship-central-hull";
    hull.renderOrder = 36;
    addShipMetalMeshWithSunGlint(model, hull, 1);
  }

  const spineGeometry = isSegmentedVariant
    ? new THREE.CylinderGeometry(0.04, 0.04, isHexModularVariant ? 1.18 : 1.2, 8, 1)
    : new THREE.CylinderGeometry(0.04, 0.04, 0.72, 8, 1);
  spineGeometry.rotateZ(Math.PI / 2);
  const spine = new THREE.Mesh(spineGeometry, darkHullMaterial.clone());
  spine.name = "ship-structural-spine";
  spine.position.z = isSegmentedVariant ? 0.21 : 0.18;
  spine.renderOrder = 36;
  model.add(spine);

  if (!isSegmentedVariant) {
    const missionModule = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.24, 0.26),
      darkHullMaterial.clone()
    );
    missionModule.name = "ship-mission-module";
    missionModule.position.set(0.08, 0, -0.28);
    missionModule.renderOrder = 36;
    addShipMetalMeshWithSunGlint(model, missionModule, 0.64);
  }

  const noseGeometry = isSegmentedVariant
    ? new THREE.CylinderGeometry(
        isHexModularVariant ? 0.045 : 0.058,
        isHexModularVariant ? 0.19 : 0.235,
        isHexModularVariant ? 0.44 : 0.54,
        14,
        1
      )
    : new THREE.CylinderGeometry(0.035, 0.17, 0.48, 8, 1);
  noseGeometry.rotateZ(-Math.PI / 2);
  const nose = new THREE.Mesh(noseGeometry, hullMaterial.clone());
  nose.name = "ship-forward-nose-cone";
  nose.position.x = isHexModularVariant ? 0.78 : isDoubleCylinderVariant ? 0.82 : 0.67;
  nose.renderOrder = 36;
  addShipMetalMeshWithSunGlint(model, nose, 1.18);

  model.add(
    createShipServiceBlinkLight(
      "ship-nose-blink-light",
      0xe8fbff,
      new THREE.Vector3(isHexModularVariant ? 1.02 : isDoubleCylinderVariant ? 1.115 : 0.925, 0, 0),
      {
        baseIntensity: 0.08,
        boostIntensity: 0.54,
        baseDistance: 0.68,
        pointSize: 0.018,
        baseOpacity: 0.88
      }
    )
  );

  const driveGeometry = isSegmentedVariant
    ? new THREE.CylinderGeometry(0.26, 0.22, 0.3, 16, 1)
    : new THREE.CylinderGeometry(0.18, 0.14, 0.24, 14, 1);
  driveGeometry.rotateZ(Math.PI / 2);
  const drive = new THREE.Mesh(driveGeometry, darkHullMaterial.clone());
  drive.name = "ship-drive-section";
  drive.position.x = isSegmentedVariant ? -0.93 : -0.61;
  drive.renderOrder = 36;
  addShipMetalMeshWithSunGlint(model, drive, 0.72);

  const engineBellGeometry = isSegmentedVariant
    ? new THREE.CylinderGeometry(0.15, 0.27, 0.18, 16, 1, true)
    : new THREE.CylinderGeometry(0.11, 0.19, 0.16, 14, 1, true);
  engineBellGeometry.rotateZ(Math.PI / 2);
  const engineBell = new THREE.Mesh(engineBellGeometry, darkHullMaterial.clone());
  engineBell.name = "ship-engine-bell";
  engineBell.position.x = isSegmentedVariant ? -1.16 : -0.82;
  engineBell.renderOrder = 36;
  addShipMetalMeshWithSunGlint(model, engineBell, 0.46);

  const engineGlowX = isSegmentedVariant ? -1.27 : -0.92;

  for (const side of [-1, 1]) {
    model.add(
      isHexModularVariant
        ? createShipZigzagRadiatorAssembly(
            side,
            radiatorMaterial.clone(),
            accentMaterial.clone(),
            -0.12
          )
        : createShipRadiatorAssembly(
            side,
            radiatorMaterial.clone(),
            accentMaterial.clone(),
            isDoubleCylinderVariant ? -0.1 : -0.02
          )
    );
  }

  model.add(createShipEngineBloomPoint(engineGlowX));

  if (options.state === "burn") {
    model.add(createShipElectromagneticDriveWake(tuning, driveGlowMaterial));
  }

  model.add(
    createShipServiceBlinkLight(
      "ship-sensor-light",
      0xd9f5ff,
      new THREE.Vector3(
        isHexModularVariant ? -0.12 : isDoubleCylinderVariant ? 0.3 : 0.24,
        0,
        0.55
      ),
      {
        baseIntensity: 0.06,
        boostIntensity: 0.42,
        baseDistance: 0.62,
        pointSize: 0.018,
        baseOpacity: 0.72
      }
    )
  );

  const sensorMastGeometry = new THREE.CylinderGeometry(0.012, 0.012, 0.36, 6, 1);
  sensorMastGeometry.rotateX(Math.PI / 2);
  const sensorMast = new THREE.Mesh(sensorMastGeometry, darkHullMaterial.clone());
  sensorMast.name = "ship-sensor-mast";
  sensorMast.position.set(0.24, 0, 0.34);
  sensorMast.renderOrder = 36;
  model.add(sensorMast);

  const antennaGeometry = new THREE.CylinderGeometry(0.008, 0.008, 0.42, 5, 1);
  antennaGeometry.rotateZ(Math.PI / 2);
  const antenna = new THREE.Mesh(antennaGeometry, darkHullMaterial.clone());
  antenna.name = "ship-antenna";
  antenna.position.set(0.38, 0, 0.24);
  antenna.rotation.y = 0.32;
  antenna.renderOrder = 36;
  model.add(antenna);

  return model;
}

function buildRingHexShipModel(
  model: THREE.Group,
  context: Readonly<{
    tuning: Cinematic3dVisualTuning;
    factionColor: THREE.ColorRepresentation;
    hullMaterial: THREE.MeshStandardMaterial;
    darkHullMaterial: THREE.MeshStandardMaterial;
    radiatorMaterial: THREE.MeshStandardMaterial;
    driveGlowMaterial: THREE.MeshBasicMaterial;
    state: ShipModelVisualState;
    radiatorExtension: number;
  }>
): void {
  const factionMaterial = context.hullMaterial.clone();
  factionMaterial.color = new THREE.Color(context.factionColor);
  factionMaterial.emissive = new THREE.Color(context.factionColor);
  factionMaterial.emissiveIntensity = 0.2;

  const amberLightMaterial = new THREE.MeshBasicMaterial({
    color: 0xffb84d,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending
  });
  const redLightMaterial = new THREE.MeshBasicMaterial({
    color: 0xff3a3a,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending
  });
  const moduleLength = 0.118;
  const frontHexRadius = 0.086;
  const habitatHexRadius = 0.118;
  const connectorRadius = 0.067;
  const forwardConnectorRadius = connectorRadius * 0.86;
  const connectorLengthExtension = 0.012;
  const aftStemExtension = 0.036;
  const frontAssemblyShiftX = connectorLengthExtension;
  const engineAssemblyShiftX = -connectorLengthExtension - aftStemExtension;
  const forwardConnectorLength = 0.104 + connectorLengthExtension;
  const aftConnectorLength = 0.112 + connectorLengthExtension + aftStemExtension;
  const frontFaceCylinderRadius = 0.0122;
  const engineRingReferenceRadius = 0.65;
  const ringX = -0.54 + engineAssemblyShiftX;
  const ringRadius = 0.58;
  const ringTubeRadius = ringRadius * (0.045 / engineRingReferenceRadius);
  const radiatorFoldCount = 10;
  const radiatorPanelLength = (engineRingReferenceRadius * 0.54 * radiatorFoldCount) / 8;
  const engineHubFrontRadius = 0.156;
  const engineHubRearRadius = 0.142;
  const engineHubLength = 0.15;
  const engineHubScaleX = 0.92;
  const exhaustNozzleX = -0.744 + engineAssemblyShiftX;
  const exhaustNozzleLength = 0.112;
  const exhaustNozzleAftRadius = 0.086;
  const exhaustNozzleForwardRadius = 0.132;
  const engineFrustumRadialSegments = 18;
  const engineGlowX = -0.805 + engineAssemblyShiftX;
  const noseConeTipRadius = 0.023;

  const addAxialMesh = (
    name: string,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    x: number,
    glint = 0.8,
    parent: THREE.Object3D = model
  ): THREE.Mesh => {
    geometry.rotateZ(Math.PI / 2);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.x = x;
    mesh.renderOrder = 36;
    addShipMetalMeshWithSunGlint(parent, mesh, glint);
    return mesh;
  };
  const staticHullBatchMeshes: THREE.Mesh[] = [];
  const staticDarkBatchMeshes: THREE.Mesh[] = [];

  staticHullBatchMeshes.push(
    addAxialMesh(
      "ship-ring-hex-nose-cone",
      new THREE.CylinderGeometry(noseConeTipRadius, 0.071, 0.132, 12, 1),
      context.hullMaterial.clone(),
      0.045 + frontAssemblyShiftX,
      1.1
    )
  );

  const frontHex = addAxialMesh(
    "ship-ring-hex-front-module",
    new THREE.CylinderGeometry(frontHexRadius, frontHexRadius, moduleLength, 6, 1),
    factionMaterial.clone(),
    -0.082 + frontAssemblyShiftX,
    1.05
  );
  frontHex.rotation.x = Math.PI / 6;

  const frontFaceCylinderGeometry = new THREE.CylinderGeometry(
    frontFaceCylinderRadius,
    frontFaceCylinderRadius,
    0.055,
    8,
    1
  );
  frontFaceCylinderGeometry.rotateZ(Math.PI / 2);
  const frontFaceCylinderMaterials = [
    context.hullMaterial.clone(),
    factionMaterial.clone()
  ] as const;
  const frontFaceCylinderBatches = frontFaceCylinderMaterials.map((material, materialIndex) => {
    const batch = new THREE.InstancedMesh(frontFaceCylinderGeometry, material, 6);
    batch.name = `ship-ring-hex-front-face-cylinders-${materialIndex === 0 ? "hull" : "faction"}`;
    batch.renderOrder = 36;
    return batch;
  });
  const frontFaceCylinderBatchCounts = [0, 0];
  const frontFaceCylinderMatrix = new THREE.Matrix4();

  for (let faceIndex = 0; faceIndex < 6; faceIndex += 1) {
    const angle = Math.PI / 6 + (faceIndex / 6) * Math.PI * 2;
    const radialY = Math.cos(angle) * (frontHexRadius * 1.22);
    const radialZ = Math.sin(angle) * (frontHexRadius * 1.22);

    for (const offsetX of [-0.026, 0.026]) {
      const materialIndex = (faceIndex + (offsetX > 0 ? 0 : 1)) % 2;
      const batch = frontFaceCylinderBatches[materialIndex]!;
      const instanceIndex = frontFaceCylinderBatchCounts[materialIndex] ?? 0;
      const name = `ship-ring-hex-front-face-cylinder-${faceIndex}-${offsetX > 0 ? "front" : "aft"}`;
      const position = new THREE.Vector3(frontHex.position.x + offsetX, radialY, radialZ);
      frontFaceCylinderMatrix.makeTranslation(position.x, position.y, position.z);
      batch.setMatrixAt(instanceIndex, frontFaceCylinderMatrix);
      frontFaceCylinderBatchCounts[materialIndex] = instanceIndex + 1;
      const glintSource = new THREE.Mesh(
        frontFaceCylinderGeometry,
        frontFaceCylinderMaterials[materialIndex]
      );
      glintSource.name = name;
      glintSource.position.copy(position);
      glintSource.renderOrder = 36;
      addShipMetalSunGlint(model, glintSource, 0.5);
    }
  }

  for (const batch of frontFaceCylinderBatches) {
    batch.instanceMatrix.needsUpdate = true;
    batch.computeBoundingSphere();
    model.add(batch);
  }

  staticHullBatchMeshes.push(
    addAxialMesh(
      "ship-ring-hex-forward-cylinder",
      new THREE.CylinderGeometry(
        forwardConnectorRadius,
        forwardConnectorRadius,
        forwardConnectorLength,
        14,
        1
      ),
      context.hullMaterial.clone(),
      -0.202 + connectorLengthExtension / 2,
      0.8
    )
  );

  const radiatorClockworkRotor = new THREE.Group();
  radiatorClockworkRotor.name = "ship-ring-hex-radiator-clockwork-rotor";
  model.add(radiatorClockworkRotor);

  const rearHex = addAxialMesh(
    "ship-ring-hex-habitat-module",
    new THREE.CylinderGeometry(habitatHexRadius, habitatHexRadius, moduleLength, 6, 1),
    factionMaterial.clone(),
    -0.318,
    0.9,
    radiatorClockworkRotor
  );
  rearHex.rotation.x = Math.PI / 6;

  staticDarkBatchMeshes.push(
    addAxialMesh(
      "ship-ring-hex-engine-truss",
      new THREE.CylinderGeometry(connectorRadius, connectorRadius, aftConnectorLength, 14, 1),
      context.darkHullMaterial.clone(),
      -0.424 - connectorLengthExtension / 2 - aftStemExtension / 2,
      0.45
    )
  );

  const centralEngine = addAxialMesh(
    "ship-ring-hex-central-engine-cylinder",
    new THREE.CylinderGeometry(
      engineHubFrontRadius,
      engineHubRearRadius,
      engineHubLength,
      engineFrustumRadialSegments,
      1
    ),
    context.darkHullMaterial.clone(),
    ringX,
    0.62
  );
  centralEngine.scale.x = engineHubScaleX;
  staticDarkBatchMeshes.push(centralEngine);

  const forwardConeAftX = ringX - (engineHubLength * engineHubScaleX) / 2;
  const aftConeForwardX = exhaustNozzleX + exhaustNozzleLength / 2;
  const interstageGapLength = Math.max(0.001, forwardConeAftX - aftConeForwardX);
  const interstageBaffleLength = interstageGapLength * 0.56;
  const interstageBaffleX = aftConeForwardX + interstageGapLength / 2;
  const interstageBaffle = addAxialMesh(
    "ship-ring-hex-engine-interstage-frustum",
    new THREE.CylinderGeometry(
      exhaustNozzleForwardRadius,
      engineHubFrontRadius,
      interstageBaffleLength,
      engineFrustumRadialSegments,
      1
    ),
    context.darkHullMaterial.clone(),
    interstageBaffleX,
    0.48
  );
  interstageBaffle.renderOrder = 36.15;
  staticDarkBatchMeshes.push(interstageBaffle);

  const addEngineCollar = (
    name: string,
    x: number,
    radius: number,
    tubeRadius: number,
    glint: number
  ): THREE.Mesh => {
    const collarGeometry = new THREE.TorusGeometry(radius, tubeRadius, 6, 18);
    collarGeometry.rotateY(Math.PI / 2);
    const collar = new THREE.Mesh(collarGeometry, context.darkHullMaterial.clone());
    collar.name = name;
    collar.position.x = x;
    collar.renderOrder = 36.2;
    addShipMetalMeshWithSunGlint(model, collar, glint);
    return collar;
  };

  staticDarkBatchMeshes.push(
    addEngineCollar("ship-ring-hex-engine-front-field-collar", ringX + 0.068, 0.143, 0.0052, 0.52),
    addEngineCollar("ship-ring-hex-engine-reactor-collar", ringX, 0.126, 0.0045, 0.4),
    addEngineCollar("ship-ring-hex-engine-rear-field-collar", ringX - 0.068, 0.157, 0.006, 0.58)
  );

  const engineRotor = new THREE.Group();
  engineRotor.name = "ship-ring-hex-engine-rotor";
  engineRotor.position.x = ringX;
  engineRotor.userData["ringHexEngineRotor"] = true;
  model.add(engineRotor);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(ringRadius, ringTubeRadius, 6, 20),
    context.darkHullMaterial.clone()
  );
  ring.name = "ship-ring-hex-engine-ring";
  ring.geometry.rotateY(Math.PI / 2);
  ring.renderOrder = 36;
  addShipMetalMeshWithSunGlint(engineRotor, ring, 0.62);

  const ringStrutGeometry = new THREE.BoxGeometry(0.024, 1, 0.026);
  const ringStrutMaterial = factionMaterial.clone();
  const ringStruts = new THREE.InstancedMesh(ringStrutGeometry, ringStrutMaterial, 4);
  ringStruts.name = "ship-ring-hex-ring-struts";
  ringStruts.renderOrder = 36;
  const ringStrutMatrix = new THREE.Matrix4();
  const ringStrutPosition = new THREE.Vector3();
  const ringStrutQuaternion = new THREE.Quaternion();
  const ringStrutScale = new THREE.Vector3();
  const xAxis = new THREE.Vector3(1, 0, 0);
  const ringGlowClearance = Math.PI / 36;
  const ringGlowArc = Math.PI / 2 - ringGlowClearance * 2;
  const ringGlowGeometry = new THREE.TorusGeometry(
    ringRadius - ringTubeRadius * 1.12,
    0.014,
    6,
    18,
    ringGlowArc
  );
  ringGlowGeometry.rotateZ(ringGlowClearance);
  ringGlowGeometry.rotateY(Math.PI / 2);
  const interiorGlows = new THREE.InstancedMesh(
    ringGlowGeometry,
    context.driveGlowMaterial.clone(),
    4
  );
  interiorGlows.name = "ship-ring-hex-engine-ring-interior-glows";
  interiorGlows.renderOrder = 37;

  for (let index = 0; index < 4; index += 1) {
    const angle = (index / 4) * Math.PI * 2;
    const strutInnerRadius = Math.max(engineHubFrontRadius, engineHubRearRadius) - 0.008;
    const strutLength = ringRadius - ringTubeRadius - strutInnerRadius + 0.018;
    const strutCenterRadius = strutInnerRadius + strutLength / 2;
    ringStrutPosition.set(
      0,
      Math.cos(angle) * strutCenterRadius,
      Math.sin(angle) * strutCenterRadius
    );
    ringStrutQuaternion.setFromAxisAngle(xAxis, angle);
    ringStrutScale.set(1, strutLength, 1);
    ringStrutMatrix.compose(ringStrutPosition, ringStrutQuaternion, ringStrutScale);
    ringStruts.setMatrixAt(index, ringStrutMatrix);
    const glintSource = new THREE.Mesh(ringStrutGeometry, ringStrutMaterial);
    glintSource.name = `ship-ring-hex-ring-strut-${index}`;
    glintSource.position.copy(ringStrutPosition);
    glintSource.quaternion.copy(ringStrutQuaternion);
    glintSource.scale.copy(ringStrutScale);
    glintSource.renderOrder = 36;
    addShipMetalSunGlint(engineRotor, glintSource, 0.55);

    ringStrutMatrix.makeRotationX(angle);
    interiorGlows.setMatrixAt(index, ringStrutMatrix);
  }
  ringStruts.instanceMatrix.needsUpdate = true;
  ringStruts.computeBoundingSphere();
  interiorGlows.instanceMatrix.needsUpdate = true;
  interiorGlows.computeBoundingSphere();
  engineRotor.add(ringStruts, interiorGlows);

  const createLightBatch = (
    name: string,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    positions: readonly THREE.Vector3[],
    parent: THREE.Object3D
  ): THREE.InstancedMesh => {
    const batch = new THREE.InstancedMesh(geometry, material, positions.length);
    const matrix = new THREE.Matrix4();
    batch.name = name;
    batch.renderOrder = 38;
    batch.userData["shipRadiatorBreathTarget"] = true;
    batch.userData["shipComplexModelDetail"] = true;

    positions.forEach((position, instanceIndex) => {
      matrix.makeTranslation(position.x, position.y, position.z);
      batch.setMatrixAt(instanceIndex, matrix);
    });
    batch.instanceMatrix.needsUpdate = true;
    batch.computeBoundingSphere();
    parent.add(batch);
    return batch;
  };

  radiatorClockworkRotor.add(
    createRingHexRadiatorAssembly(
      rearHex.position.x,
      habitatHexRadius,
      radiatorPanelLength,
      radiatorFoldCount,
      context.radiatorMaterial.clone(),
      amberLightMaterial.clone(),
      context.radiatorExtension
    )
  );

  staticDarkBatchMeshes.push(
    addAxialMesh(
      "ship-ring-hex-exhaust-nozzle",
      new THREE.CylinderGeometry(
        exhaustNozzleAftRadius,
        exhaustNozzleForwardRadius,
        exhaustNozzleLength,
        18,
        1,
        true
      ),
      context.darkHullMaterial.clone(),
      exhaustNozzleX,
      0.45
    )
  );
  consolidateStaticShipMetalMeshes(model, "ship-ring-hex-hull-metal-batch", staticHullBatchMeshes);
  consolidateStaticShipMetalMeshes(model, "ship-ring-hex-dark-metal-batch", staticDarkBatchMeshes);

  model.add(createShipEngineBloomPoint(engineGlowX));

  model.add(
    createShipServiceBlinkLight("ship-nose-blink-light", 0xe8fbff, new THREE.Vector3(0.12, 0, 0), {
      baseIntensity: 0.09,
      boostIntensity: 0.62,
      baseDistance: 0.58,
      pointSize: 0.014,
      baseOpacity: 0.86
    })
  );

  radiatorClockworkRotor.add(
    createShipServiceBlinkLight(
      "ship-sensor-light",
      0xd9f5ff,
      new THREE.Vector3(rearHex.position.x, 0, habitatHexRadius * 1.62),
      {
        baseIntensity: 0.07,
        boostIntensity: 0.48,
        baseDistance: 0.62,
        pointSize: 0.014,
        baseOpacity: 0.76
      }
    )
  );

  const redCornerLightGeometry = new THREE.SphereGeometry(0.012, 6, 4);

  for (const [index, source, parent] of [
    [0, frontHex, model],
    [1, rearHex, radiatorClockworkRotor]
  ] as const) {
    const positions: THREE.Vector3[] = [];

    for (let corner = 0; corner < 6; corner += 1) {
      const angle = (corner / 6) * Math.PI * 2 + Math.PI / 6;
      positions.push(
        new THREE.Vector3(
          source.position.x,
          Math.cos(angle) * (index === 0 ? frontHexRadius * 1.1 : habitatHexRadius * 1.1),
          Math.sin(angle) * (index === 0 ? frontHexRadius * 1.1 : habitatHexRadius * 1.1)
        )
      );
    }

    createLightBatch(
      `ship-ring-hex-red-corner-lights-${index}`,
      redCornerLightGeometry,
      redLightMaterial.clone(),
      positions,
      parent
    );
  }

  const amberEngineLightPositions: THREE.Vector3[] = [];

  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2;
    amberEngineLightPositions.push(
      new THREE.Vector3(0, Math.cos(angle) * 0.2, Math.sin(angle) * 0.2)
    );
  }
  createLightBatch(
    "ship-ring-hex-amber-engine-lights",
    new THREE.SphereGeometry(0.011, 6, 4),
    amberLightMaterial.clone(),
    amberEngineLightPositions,
    engineRotor
  );

  if (context.state === "burn") {
    model.add(
      createShipElectromagneticDriveWake(context.tuning, context.driveGlowMaterial, engineGlowX)
    );
  }
}

function createRingHexRadiatorAssembly(
  moduleX: number,
  moduleRadius: number,
  panelLength: number,
  foldCount: number,
  radiatorMaterial: THREE.Material,
  amberLightMaterial: THREE.Material,
  initialExtension: number
): THREE.Group {
  const assembly = new THREE.Group();
  assembly.name = "ship-ring-hex-zigzag-radiator-assembly-array";
  const assemblyCount = 4;
  const bandCount = 5;
  const maxSegmentLength = panelLength / Math.max(1, foldCount);
  const panelAxialWidth = 0.102;
  const bandPitch = panelAxialWidth / bandCount;
  const bandWidth = bandPitch * 0.46;
  const lamellaThickness = 0.0048;
  const baseOffset = moduleRadius * 0.1;
  const panelGeometry = new THREE.BoxGeometry(bandWidth, maxSegmentLength * 0.9, lamellaThickness);
  const ribGeometry = new THREE.BoxGeometry(
    Math.max(0.0022, bandWidth * 0.16),
    maxSegmentLength * 0.68,
    0.002
  );
  const filamentGeometry = new THREE.BoxGeometry(
    Math.max(0.0022, bandWidth * 0.16),
    maxSegmentLength * 0.68,
    0.0018
  );
  const filamentMaterial = amberLightMaterial.clone();

  if (filamentMaterial instanceof THREE.MeshBasicMaterial) {
    filamentMaterial.side = THREE.DoubleSide;
    filamentMaterial.opacity = 0.44;
    filamentMaterial.toneMapped = false;
  }

  assembly.userData["shipAccordionRadiator"] = true;
  assembly.userData["shipAccordionRadiatorAssemblyCount"] = assemblyCount;
  assembly.userData["shipAccordionRadiatorModuleX"] = moduleX;
  assembly.userData["shipAccordionRadiatorModuleRadius"] = moduleRadius;
  assembly.userData["shipAccordionRadiatorFoldCount"] = foldCount;
  assembly.userData["shipAccordionRadiatorBandCount"] = bandCount;
  assembly.userData["shipAccordionRadiatorBaseOffset"] = baseOffset;
  assembly.userData["shipAccordionRadiatorMaxSegmentLength"] = maxSegmentLength;
  assembly.userData["shipAccordionRadiatorCompactExtent"] = panelLength * 0.18;
  assembly.userData["shipAccordionRadiatorRightAngleExtent"] = panelLength * 0.52;
  assembly.userData["shipAccordionRadiatorExtendedExtent"] = panelLength;
  assembly.userData["shipAccordionRadiatorBandPitch"] = bandPitch;
  assembly.userData["shipAccordionRadiatorLamellaThickness"] = lamellaThickness;

  const rootHinges = new THREE.InstancedMesh(
    new THREE.BoxGeometry(panelAxialWidth * 1.08, 0.014, 0.018),
    radiatorMaterial,
    assemblyCount
  );
  const panels = new THREE.InstancedMesh(
    panelGeometry,
    radiatorMaterial.clone(),
    assemblyCount * foldCount * bandCount
  );
  const ribs = new THREE.InstancedMesh(
    ribGeometry,
    amberLightMaterial.clone(),
    assemblyCount * foldCount * bandCount
  );
  const filaments = new THREE.InstancedMesh(
    filamentGeometry,
    filamentMaterial,
    assemblyCount * foldCount * bandCount * 2
  );
  const hinges = new THREE.InstancedMesh(
    new THREE.BoxGeometry(panelAxialWidth * 1.04, 0.006, 0.007),
    radiatorMaterial.clone(),
    assemblyCount * Math.max(0, foldCount - 1)
  );
  const baseLights = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.012, 6, 4),
    amberLightMaterial,
    assemblyCount
  );

  rootHinges.name = "ship-ring-hex-radiator-root-hinges";
  rootHinges.renderOrder = 36;
  rootHinges.userData["shipAccordionRadiatorBatch"] = "rootHinges";
  rootHinges.userData["shipRadiatorBreathTarget"] = true;
  panels.name = "ship-ring-hex-zigzag-radiator-panels";
  panels.renderOrder = 36;
  panels.userData["shipAccordionRadiatorBatch"] = "panels";
  panels.userData["shipRadiatorBreathTarget"] = true;
  ribs.name = "ship-ring-hex-zigzag-radiator-glow-ribs";
  ribs.renderOrder = 37;
  ribs.userData["shipAccordionRadiatorBatch"] = "ribs";
  ribs.userData["shipRadiatorBreathTarget"] = true;
  filaments.name = "ship-ring-hex-zigzag-radiator-filaments";
  filaments.renderOrder = 37;
  filaments.userData["shipAccordionRadiatorBatch"] = "filaments";
  filaments.userData["shipRadiatorBreathTarget"] = true;
  hinges.name = "ship-ring-hex-radiator-metal-hinges";
  hinges.renderOrder = 36;
  hinges.userData["shipAccordionRadiatorBatch"] = "hinges";
  hinges.userData["shipRadiatorBreathTarget"] = true;
  baseLights.name = "ship-ring-hex-radiator-base-amber-lights";
  baseLights.renderOrder = 38;
  baseLights.userData["shipAccordionRadiatorBatch"] = "baseLights";
  baseLights.userData["shipRadiatorBreathTarget"] = true;

  for (const batch of [rootHinges, panels, ribs, filaments, hinges, baseLights]) {
    batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }
  assembly.add(rootHinges, panels, ribs, filaments, hinges, baseLights);

  setRingHexShipRadiatorExtension(assembly, initialExtension);
  return assembly;
}

export function setRingHexShipRadiatorExtension(ship: THREE.Object3D, extension: number): void {
  const amount = clamp(extension, -0.08, 1.08);

  ship.traverse((object) => {
    if (object.userData["shipAccordionRadiator"] !== true) {
      return;
    }

    if (object.userData["shipAccordionRadiatorExtension"] === amount) {
      return;
    }

    syncRingHexRadiatorAssemblyInstances(object, amount);
    object.userData["shipAccordionRadiatorExtension"] = amount;
  });
}

function syncRingHexRadiatorAssemblyInstances(assembly: THREE.Object3D, amount: number): void {
  const batches = new Map<string, THREE.InstancedMesh>();

  for (const child of assembly.children) {
    const batchName: unknown = child.userData["shipAccordionRadiatorBatch"];

    if (isInstancedMeshObject(child) && typeof batchName === "string") {
      batches.set(batchName, child);
    }
  }

  const panels = batches.get("panels");
  const ribs = batches.get("ribs");
  const filaments = batches.get("filaments");
  const hinges = batches.get("hinges");
  const rootHinges = batches.get("rootHinges");
  const baseLights = batches.get("baseLights");

  if (
    panels === undefined ||
    ribs === undefined ||
    filaments === undefined ||
    hinges === undefined ||
    rootHinges === undefined ||
    baseLights === undefined
  ) {
    return;
  }

  const progress = clamp(amount, 0, 1);
  const assemblyCount = Math.max(
    1,
    getNumericUserData(assembly, "shipAccordionRadiatorAssemblyCount")
  );
  const moduleX = getNumericUserData(assembly, "shipAccordionRadiatorModuleX");
  const moduleRadius = getNumericUserData(assembly, "shipAccordionRadiatorModuleRadius");
  const foldCount = Math.max(1, getNumericUserData(assembly, "shipAccordionRadiatorFoldCount"));
  const bandCount = Math.max(1, getNumericUserData(assembly, "shipAccordionRadiatorBandCount"));
  const baseOffset = getNumericUserData(assembly, "shipAccordionRadiatorBaseOffset");
  const compactExtent = getNumericUserData(assembly, "shipAccordionRadiatorCompactExtent");
  const rightAngleExtent = getNumericUserData(assembly, "shipAccordionRadiatorRightAngleExtent");
  const extendedExtent = getNumericUserData(assembly, "shipAccordionRadiatorExtendedExtent");
  const bandPitch = getNumericUserData(assembly, "shipAccordionRadiatorBandPitch");
  const lamellaThickness = getNumericUserData(assembly, "shipAccordionRadiatorLamellaThickness");
  const maxSegmentLength = Math.max(
    0.001,
    getNumericUserData(assembly, "shipAccordionRadiatorMaxSegmentLength")
  );
  const stateProgress = progress <= 0.5 ? progress / 0.5 : (progress - 0.5) / 0.5;
  const extent =
    progress <= 0.5
      ? THREE.MathUtils.lerp(compactExtent, rightAngleExtent, stateProgress)
      : THREE.MathUtils.lerp(rightAngleExtent, extendedExtent, stateProgress);
  const overshoot = amount < 0 ? amount : amount > 1 ? amount - 1 : 0;
  const extentWithServoBounce = clamp(
    extent + overshoot * extendedExtent * 0.08,
    maxSegmentLength * 0.2,
    extendedExtent
  );
  const start = new THREE.Vector3();
  const end = new THREE.Vector3();
  const segmentPosition = new THREE.Vector3();
  const segmentQuaternion = new THREE.Quaternion();
  const segmentScale = new THREE.Vector3();
  const segmentMatrix = new THREE.Matrix4();
  const assemblyMatrix = new THREE.Matrix4();
  const assemblySegmentMatrix = new THREE.Matrix4();
  const localMatrix = new THREE.Matrix4();
  const instanceMatrix = new THREE.Matrix4();
  const xAxis = new THREE.Vector3(1, 0, 0);
  const assemblyPosition = new THREE.Vector3();
  const assemblyQuaternion = new THREE.Quaternion();
  const unitScale = new THREE.Vector3(1, 1, 1);
  const flatFaceAngles = [Math.PI / 6, (Math.PI * 5) / 6, (Math.PI * 7) / 6, (Math.PI * 11) / 6];

  for (let assemblyIndex = 0; assemblyIndex < assemblyCount; assemblyIndex += 1) {
    const angle = flatFaceAngles[assemblyIndex % flatFaceAngles.length] ?? Math.PI / 6;
    assemblyPosition.set(
      moduleX,
      Math.cos(angle) * moduleRadius * Math.cos(Math.PI / 6),
      Math.sin(angle) * moduleRadius * Math.cos(Math.PI / 6)
    );
    assemblyQuaternion.setFromAxisAngle(xAxis, angle);
    assemblyMatrix.compose(assemblyPosition, assemblyQuaternion, unitScale);
    localMatrix.makeTranslation(0, baseOffset, 0);
    instanceMatrix.multiplyMatrices(assemblyMatrix, localMatrix);
    rootHinges.setMatrixAt(assemblyIndex, instanceMatrix);
    baseLights.setMatrixAt(assemblyIndex, instanceMatrix);

    for (let segmentIndex = 0; segmentIndex < foldCount; segmentIndex += 1) {
      getRingHexRadiatorFoldVertex(
        baseOffset,
        extentWithServoBounce,
        foldCount,
        maxSegmentLength,
        segmentIndex,
        start
      );
      getRingHexRadiatorFoldVertex(
        baseOffset,
        extentWithServoBounce,
        foldCount,
        maxSegmentLength,
        segmentIndex + 1,
        end
      );
      const segmentY = end.y - start.y;
      const segmentZ = end.z - start.z;
      const segmentLength = Math.max(0.001, Math.hypot(segmentY, segmentZ));
      segmentPosition.copy(start);
      segmentQuaternion.setFromAxisAngle(xAxis, Math.atan2(segmentZ, segmentY));
      segmentScale.set(1, segmentLength / maxSegmentLength, 1);
      segmentMatrix.compose(segmentPosition, segmentQuaternion, segmentScale);
      assemblySegmentMatrix.multiplyMatrices(assemblyMatrix, segmentMatrix);

      if (segmentIndex > 0) {
        const hingeIndex = assemblyIndex * Math.max(0, foldCount - 1) + segmentIndex - 1;
        hinges.setMatrixAt(hingeIndex, assemblySegmentMatrix);
      }

      for (let bandIndex = 0; bandIndex < bandCount; bandIndex += 1) {
        const axialOffset = (bandIndex - (bandCount - 1) / 2) * bandPitch;
        const panelIndex = (assemblyIndex * foldCount + segmentIndex) * bandCount + bandIndex;
        const filamentIndex = panelIndex * 2;
        localMatrix.makeTranslation(axialOffset, maxSegmentLength * 0.48, 0);
        instanceMatrix.multiplyMatrices(assemblySegmentMatrix, localMatrix);
        panels.setMatrixAt(panelIndex, instanceMatrix);
        localMatrix.makeTranslation(axialOffset, maxSegmentLength * 0.48, lamellaThickness * 0.72);
        instanceMatrix.multiplyMatrices(assemblySegmentMatrix, localMatrix);
        ribs.setMatrixAt(panelIndex, instanceMatrix);
        localMatrix.makeTranslation(axialOffset, maxSegmentLength * 0.48, -lamellaThickness * 0.76);
        instanceMatrix.multiplyMatrices(assemblySegmentMatrix, localMatrix);
        filaments.setMatrixAt(filamentIndex, instanceMatrix);
        localMatrix.makeTranslation(axialOffset, maxSegmentLength * 0.48, lamellaThickness * 0.76);
        instanceMatrix.multiplyMatrices(assemblySegmentMatrix, localMatrix);
        filaments.setMatrixAt(filamentIndex + 1, instanceMatrix);
      }
    }
  }

  for (const batch of batches.values()) {
    batch.instanceMatrix.needsUpdate = true;
    batch.computeBoundingSphere();
  }
}

function isInstancedMeshObject(object: THREE.Object3D): object is THREE.InstancedMesh {
  return object instanceof THREE.InstancedMesh;
}

export function setRingHexShipRadiatorClockRotation(ship: THREE.Object3D, rotation: number): void {
  const rotor = ship.getObjectByName("ship-ring-hex-radiator-clockwork-rotor");

  if (rotor === undefined) {
    return;
  }

  rotor.rotation.x = rotation;
}

export function setRingHexShipEngineRotorRotation(ship: THREE.Object3D, rotation: number): void {
  const rotor = ship.getObjectByName("ship-ring-hex-engine-rotor");

  if (rotor === undefined) {
    return;
  }

  rotor.rotation.x = rotation;
}

function getRingHexRadiatorFoldVertex(
  baseOffset: number,
  extent: number,
  foldCount: number,
  segmentLength: number,
  vertexIndex: number,
  target = new THREE.Vector3()
): THREE.Vector3 {
  const safeFoldCount = Math.max(1, foldCount);
  const clampedIndex = clamp(vertexIndex, 0, safeFoldCount);
  const radialStep = clamp(extent / safeFoldCount, segmentLength * 0.08, segmentLength);
  const lateralStep = Math.sqrt(
    Math.max(0, segmentLength * segmentLength - radialStep * radialStep)
  );
  const radialDistance = baseOffset + radialStep * clampedIndex;
  const lateralDistance = clampedIndex % 2 === 0 ? 0 : lateralStep;

  return target.set(0, radialDistance, lateralDistance);
}

function consolidateStaticShipMetalMeshes(
  parent: THREE.Object3D,
  name: string,
  meshes: readonly THREE.Mesh[]
): void {
  if (meshes.length < 2) {
    return;
  }

  const transformedGeometries = meshes.map((mesh) => {
    mesh.updateMatrix();
    return mesh.geometry.clone().applyMatrix4(mesh.matrix);
  });
  const mergedGeometry = mergeGeometries(transformedGeometries, false);

  for (const geometry of transformedGeometries) {
    geometry.dispose();
  }

  if (mergedGeometry === null) {
    return;
  }

  const firstMaterial = meshes[0]?.material;

  if (firstMaterial === undefined || Array.isArray(firstMaterial)) {
    mergedGeometry.dispose();
    return;
  }

  const mergedMesh = new THREE.Mesh(mergedGeometry, firstMaterial.clone());
  mergedMesh.name = name;
  mergedMesh.renderOrder = 36;

  for (const mesh of meshes) {
    mesh.removeFromParent();
    const glint = parent.getObjectByName(`${mesh.name}-sun-glint`);

    if (glint !== undefined) {
      glint.userData["usesSharedGeometry"] = false;
    }

    if (Array.isArray(mesh.material)) {
      for (const material of mesh.material) {
        material.dispose();
      }
    } else {
      mesh.material.dispose();
    }
  }

  parent.add(mergedMesh);
}

function addShipMetalMeshWithSunGlint(
  model: THREE.Object3D,
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>,
  opacityMultiplier: number
): void {
  model.add(mesh);
  addShipMetalSunGlint(model, mesh, opacityMultiplier);
}

function addShipMetalSunGlint(
  model: THREE.Object3D,
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>,
  opacityMultiplier: number
): void {
  const glint = new THREE.Mesh(
    mesh.geometry,
    createShipMetalSunGlintMaterial(hashStringToUnitInterval(mesh.name))
  );
  glint.name = `${mesh.name}-sun-glint`;
  glint.position.copy(mesh.position);
  glint.quaternion.copy(mesh.quaternion);
  glint.scale.copy(mesh.scale);
  glint.renderOrder = (mesh.renderOrder ?? 36) + 0.05;
  glint.visible = false;
  glint.userData["usesSharedGeometry"] = true;
  glint.userData["shipMetalSunGlint"] = true;
  glint.userData["shipComplexModelDetail"] = true;
  glint.userData["shipMetalSunGlintBaseOpacity"] = shipMetalSunGlintBaseOpacity * opacityMultiplier;
  model.add(glint);
}

function createShipMetalSunGlintMaterial(seed: number): THREE.ShaderMaterial {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthTest: true,
    depthWrite: false,
    side: THREE.FrontSide,
    blending: THREE.AdditiveBlending,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    uniforms: {
      glintColor: { value: new THREE.Color(0xffdfad) },
      opacity: { value: 0 },
      sunPosition: { value: new THREE.Vector3() },
      time: { value: 0 },
      seed: { value: seed },
      specularPower: { value: shipMetalSunGlintSpecularPower }
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;

      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 glintColor;
      uniform float opacity;
      uniform vec3 sunPosition;
      uniform float time;
      uniform float seed;
      uniform float specularPower;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;

      void main() {
        vec3 normal = normalize(vWorldNormal);
        vec3 lightDirection = normalize(sunPosition - vWorldPosition);
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        float sunFacing = smoothstep(-0.08, 0.72, dot(normal, lightDirection));
        vec3 reflectedLight = reflect(-lightDirection, normal);
        float specular = pow(max(dot(reflectedLight, viewDirection), 0.0), specularPower);
        float grazing = pow(1.0 - max(dot(normal, viewDirection), 0.0), 2.35) * sunFacing;
        float coldMetalNoise =
          0.84 +
          sin(dot(vWorldPosition, vec3(11.3, 6.7, 13.1)) + seed * 17.0 + time * 0.11) * 0.08 +
          sin(dot(vWorldPosition, vec3(4.1, 17.9, 7.3)) - seed * 9.0) * 0.08;
        float glint = (specular * 0.92 + grazing * 0.055) * sunFacing * coldMetalNoise;
        float alpha = opacity * glint;

        if (alpha <= 0.001) {
          discard;
        }

        vec3 whiteHotEdge = vec3(1.0, 0.94, 0.82);
        vec3 color = mix(glintColor, whiteHotEdge, clamp(specular * 1.8, 0.0, 1.0));
        gl_FragColor = vec4(color, alpha);
      }
    `
  });
  material.toneMapped = false;
  return material;
}

function createShipElectromagneticDriveWake(
  tuning: Cinematic3dVisualTuning,
  _sourceMaterial: THREE.MeshBasicMaterial,
  sourceX = -0.92
): THREE.Group {
  const wake = new THREE.Group();
  wake.name = "ship-electromagnetic-drive-wake";
  wake.userData["shipDriveWakeDecorative"] = true;
  const sourceGap = 0.003;
  const wakeLength = tuning.shipDriveWakeLength;
  const wakeRadius = tuning.shipDriveWakeRadius;
  const frontX = sourceX - sourceGap;
  wake.userData["frontX"] = frontX;
  wake.userData["wakeLength"] = wakeLength;
  wake.userData["wakeRadius"] = wakeRadius;

  const plasmaCoreMaterial = createShipDriveWakeTubeMaterial(0xf6ffff, 0.98);
  const plasmaHaloMaterial = createShipDriveWakeTubeMaterial(0x9df5ff, 0.9);
  const plasmaBlueMaterial = createShipDriveWakeTubeMaterial(0x28d7ff, 0.78);
  const plasmaBlueOutlineMaterial = createShipDriveWakeTubeMaterial(0x05e5ff, 0.76);
  plasmaBlueOutlineMaterial.blending = THREE.NormalBlending;

  for (const material of [
    plasmaCoreMaterial,
    plasmaHaloMaterial,
    plasmaBlueMaterial,
    plasmaBlueOutlineMaterial
  ]) {
    configureShipDriveWakeTailFade(material, frontX, wakeLength);
  }

  const plasmaBlueOutline = createShipDriveWakeTube(
    "ship-drive-wake-plasma-blue-outline",
    44,
    plasmaBlueOutlineMaterial,
    0.78,
    "plasma-tube-blue-outline",
    0,
    wakeRadius * 0.52
  );
  plasmaBlueOutline.userData["progressStart"] = 0;
  plasmaBlueOutline.userData["progressEnd"] = 1;
  plasmaBlueOutline.userData["strandAngle"] = 0;
  plasmaBlueOutline.userData["strandWeave"] = 0.14;
  plasmaBlueOutline.userData["strandOffsetRadius"] = 0;
  plasmaBlueOutline.userData["shipDriveWakeDecorative"] = true;
  writeShipDriveWakeTubeGeometry(plasmaBlueOutline, {
    frontX,
    wakeLength,
    wakeRadius,
    elapsed: 0,
    pulseBeatTime: 0
  });
  wake.add(plasmaBlueOutline);

  const plasmaCore = createShipDriveWakeTube(
    "ship-drive-wake-plasma-core",
    44,
    plasmaCoreMaterial,
    0.94,
    "plasma-tube-core",
    0,
    wakeRadius * 0.32
  );
  plasmaCore.userData["progressStart"] = 0;
  plasmaCore.userData["progressEnd"] = 1;
  plasmaCore.userData["strandAngle"] = 0;
  plasmaCore.userData["strandWeave"] = 0.18;
  plasmaCore.userData["strandOffsetRadius"] = 0;
  plasmaCore.userData["shipDriveWakeDecorative"] = true;
  writeShipDriveWakeTubeGeometry(plasmaCore, {
    frontX,
    wakeLength,
    wakeRadius,
    elapsed: 0,
    pulseBeatTime: 0
  });
  wake.add(plasmaCore);

  for (let index = 0; index < 11; index += 1) {
    const halo = createShipDriveWakeTube(
      `ship-drive-wake-plasma-halo-${index}`,
      42,
      (index % 2 === 0 ? plasmaHaloMaterial : plasmaBlueMaterial).clone(),
      index % 2 === 0 ? 0.98 : 0.86,
      "plasma-tube-halo",
      index,
      wakeRadius * (index % 2 === 0 ? 0.088 : 0.074)
    );
    halo.userData["progressStart"] = 0;
    halo.userData["progressEnd"] = 1;
    halo.userData["strandAngle"] = (index / 11) * Math.PI * 2;
    halo.userData["strandWeave"] = 0.46 + (index % 3) * 0.11;
    halo.userData["strandOffsetRadius"] = wakeRadius * (0.085 + (index % 3) * 0.012);
    halo.userData["shipDriveWakeDecorative"] = true;
    writeShipDriveWakeTubeGeometry(halo, {
      frontX,
      wakeLength,
      wakeRadius,
      elapsed: 0,
      pulseBeatTime: 0
    });
    wake.add(halo);
  }

  const nozzleLight = markCinematicDecorativePointLightSource(
    new THREE.PointLight(0xeaffff, 7.2, 7.2, 1.35)
  );
  nozzleLight.name = "ship-drive-wake-nozzle-light";
  nozzleLight.position.set(frontX + 0.02, 0, 0);
  nozzleLight.userData["shipDriveWakeLight"] = true;
  nozzleLight.userData["shipDriveWakeDecorative"] = true;
  nozzleLight.userData["baseIntensity"] = 6.2;
  nozzleLight.userData["boostIntensity"] = 5.1;
  nozzleLight.userData["baseDistance"] = 7.2;
  wake.add(nozzleLight);

  const lanceLight = markCinematicDecorativePointLightSource(
    new THREE.PointLight(0x8fefff, 3.6, 20, 1.7)
  );
  lanceLight.name = "ship-drive-wake-lance-light";
  lanceLight.position.set(frontX - wakeLength * 0.12, 0, 0);
  lanceLight.userData["shipDriveWakeLight"] = true;
  lanceLight.userData["shipDriveWakeDecorative"] = true;
  lanceLight.userData["baseIntensity"] = 2.8;
  lanceLight.userData["boostIntensity"] = 2.7;
  lanceLight.userData["baseDistance"] = 20;
  wake.add(lanceLight);

  return wake;
}

function createShipDriveWakeTubeMaterial(
  color: THREE.ColorRepresentation,
  opacity: number
): THREE.MeshBasicMaterial {
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending
  });
  material.toneMapped = false;
  material.onBeforeCompile = function (shader): void {
    const fadeStart = getMaterialNumericUserData(this, "wakeTailFadeStart", 0.22);
    const fadeEnd = getMaterialNumericUserData(this, "wakeTailFadeEnd", 0.88);
    const fadeMinAlpha = getMaterialNumericUserData(this, "wakeTailFadeMinAlpha", 0);
    const frontX = getMaterialNumericUserData(this, "wakeTailFadeFrontX", 0);
    const wakeLength = getMaterialNumericUserData(this, "wakeTailFadeLength", 1);
    const flowTime = getMaterialNumericUserData(this, "wakeFlowTime", 0);
    const flowStrength = getMaterialNumericUserData(this, "wakeFlowStrength", 0.2);
    const flowSpeed = getMaterialNumericUserData(this, "wakeFlowSpeed", 2.4);
    const flowPhase = getMaterialNumericUserData(this, "wakeFlowPhase", 0);
    shader.uniforms["wakeTailFadeStart"] = { value: fadeStart };
    shader.uniforms["wakeTailFadeEnd"] = { value: fadeEnd };
    shader.uniforms["wakeTailFadeMinAlpha"] = { value: fadeMinAlpha };
    shader.uniforms["wakeTailFadeFrontX"] = { value: frontX };
    shader.uniforms["wakeTailFadeLength"] = { value: wakeLength };
    shader.uniforms["wakeFlowTime"] = { value: flowTime };
    shader.uniforms["wakeFlowStrength"] = { value: flowStrength };
    shader.uniforms["wakeFlowSpeed"] = { value: flowSpeed };
    shader.uniforms["wakeFlowPhase"] = { value: flowPhase };
    this.userData["shipDriveWakeShaderUniforms"] = shader.uniforms;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
varying float vWakeTailFade;
varying float vWakeFlow;
uniform float wakeTailFadeStart;
uniform float wakeTailFadeEnd;
uniform float wakeTailFadeMinAlpha;
uniform float wakeTailFadeFrontX;
uniform float wakeTailFadeLength;
uniform float wakeFlowTime;
uniform float wakeFlowStrength;
uniform float wakeFlowSpeed;
uniform float wakeFlowPhase;`
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
float wakeTailProgress = clamp((wakeTailFadeFrontX - position.x) / max(wakeTailFadeLength, 0.0001), 0.0, 1.0);
float wakeTailFade = 1.0 - smoothstep(wakeTailFadeStart, wakeTailFadeEnd, wakeTailProgress);
float wakeFlowWave = sin(wakeTailProgress * 37.69911184 - wakeFlowTime * wakeFlowSpeed + wakeFlowPhase);
vWakeFlow = clamp(0.82 + wakeFlowWave * wakeFlowStrength, 0.45, 1.12);
vWakeTailFade = mix(wakeTailFadeMinAlpha, 1.0, wakeTailFade);`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying float vWakeTailFade;
varying float vWakeFlow;`
      )
      .replace(
        "#include <opaque_fragment>",
        `diffuseColor.a *= vWakeTailFade * vWakeFlow;
if (diffuseColor.a <= 0.002) {
  discard;
}
#include <opaque_fragment>`
      );
  };
  material.customProgramCacheKey = (): string => "ship-drive-wake-tail-fade-v2";
  return material;
}

function configureShipDriveWakeTailFade(
  material: THREE.MeshBasicMaterial,
  frontX: number,
  wakeLength: number
): void {
  material.userData["wakeTailFadeFrontX"] = frontX;
  material.userData["wakeTailFadeLength"] = wakeLength;
  material.userData["wakeTailFadeStart"] = 0.22;
  material.userData["wakeTailFadeEnd"] = 0.88;
  material.userData["wakeTailFadeMinAlpha"] = 0;
  material.userData["wakeFlowTime"] = 0;
  material.userData["wakeFlowStrength"] = 0.2;
  material.userData["wakeFlowSpeed"] = 2.4;
  material.userData["wakeFlowPhase"] = 0;
  material.needsUpdate = true;
}

type ShipDriveWakeTubePresentation = Readonly<{
  flowPhase: number;
  flowSpeed: number;
  flowStrength: number;
  flowTime: number;
  tailFadeEnd: number;
  tailFadeStart: number;
}>;

type ShipDriveWakeShaderUniform = {
  value: number;
};

type ShipDriveWakeShaderUniforms = Record<string, ShipDriveWakeShaderUniform | undefined>;

export function setShipDriveWakeTubePresentation(
  material: THREE.MeshBasicMaterial,
  presentation: ShipDriveWakeTubePresentation
): void {
  material.userData["wakeTailFadeStart"] = presentation.tailFadeStart;
  material.userData["wakeTailFadeEnd"] = presentation.tailFadeEnd;
  material.userData["wakeFlowTime"] = presentation.flowTime;
  material.userData["wakeFlowStrength"] = presentation.flowStrength;
  material.userData["wakeFlowSpeed"] = presentation.flowSpeed;
  material.userData["wakeFlowPhase"] = presentation.flowPhase;

  const uniforms = getShipDriveWakeShaderUniforms(material);

  if (uniforms === undefined) {
    return;
  }

  setShipDriveWakeShaderUniform(uniforms, "wakeTailFadeStart", presentation.tailFadeStart);
  setShipDriveWakeShaderUniform(uniforms, "wakeTailFadeEnd", presentation.tailFadeEnd);
  setShipDriveWakeShaderUniform(uniforms, "wakeFlowTime", presentation.flowTime);
  setShipDriveWakeShaderUniform(uniforms, "wakeFlowStrength", presentation.flowStrength);
  setShipDriveWakeShaderUniform(uniforms, "wakeFlowSpeed", presentation.flowSpeed);
  setShipDriveWakeShaderUniform(uniforms, "wakeFlowPhase", presentation.flowPhase);
}

function getShipDriveWakeShaderUniforms(
  material: THREE.MeshBasicMaterial
): ShipDriveWakeShaderUniforms | undefined {
  const userData = material.userData as Record<string, unknown>;
  const uniforms = userData["shipDriveWakeShaderUniforms"];

  if (typeof uniforms !== "object" || uniforms === null) {
    return undefined;
  }

  return uniforms as ShipDriveWakeShaderUniforms;
}

function setShipDriveWakeShaderUniform(
  uniforms: ShipDriveWakeShaderUniforms,
  key: string,
  value: number
): void {
  const uniform = uniforms[key];

  if (uniform !== undefined) {
    uniform.value = value;
  }
}

function getMaterialNumericUserData(
  material: THREE.Material,
  key: string,
  fallback: number
): number {
  const userData = material.userData as Record<string, unknown>;
  const value = userData[key];
  return typeof value === "number" ? value : fallback;
}

function createShipDriveWakeTube(
  name: string,
  pointCount: number,
  material: THREE.MeshBasicMaterial,
  baseOpacity: number,
  component: string,
  index: number,
  tubeRadius: number
): THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> {
  const tube = new THREE.Mesh(new THREE.BufferGeometry(), material);
  tube.name = name;
  tube.frustumCulled = false;
  tube.renderOrder =
    component === "plasma-tube-blue-outline"
      ? 37.18
      : component === "plasma-tube-core"
        ? 37.32
        : 37.12 + index * 0.01;
  tube.userData["baseOpacity"] = baseOpacity;
  tube.userData["pointCount"] = Math.max(8, pointCount);
  tube.userData["tubeRadius"] = tubeRadius;
  tube.userData["wakeComponent"] = component;
  tube.userData["strandIndex"] = index;
  return tube;
}

export function writeShipDriveWakeTubeGeometry(
  tube: THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>,
  context: Readonly<{
    frontX: number;
    wakeLength: number;
    wakeRadius: number;
    elapsed: number;
    pulseBeatTime: number;
  }>
): void {
  const points: THREE.Vector3[] = [];
  const count = getNumericUserData(tube, "pointCount");
  const strandIndex = getNumericUserData(tube, "strandIndex");
  const strandAngle = getNumericUserData(tube, "strandAngle");
  const strandWeave = getNumericUserData(tube, "strandWeave");
  const strandOffsetRadius = getNumericUserData(tube, "strandOffsetRadius");
  const progressStart = getNumericUserData(tube, "progressStart");
  const progressEnd = Math.max(progressStart, getNumericUserData(tube, "progressEnd"));
  const wakeComponent = String(tube.userData["wakeComponent"]);
  const isCore = wakeComponent === "plasma-tube-core";
  const isBlueOutline = wakeComponent === "plasma-tube-blue-outline";
  const flow = context.elapsed * 2.55 + context.pulseBeatTime * 0.62 + strandIndex * 0.34;
  const baseY = Math.cos(strandAngle) * strandOffsetRadius;
  const baseZ = Math.sin(strandAngle) * strandOffsetRadius;
  const tangentY = -Math.sin(strandAngle);
  const tangentZ = Math.cos(strandAngle);
  const radialWaveAmount = context.wakeRadius * (isCore ? 0.022 : isBlueOutline ? 0.026 : 0.052);
  const tangentWaveAmount = context.wakeRadius * (isCore ? 0.036 : isBlueOutline ? 0.04 : 0.078);

  for (let index = 0; index < count; index += 1) {
    const localProgress = index / Math.max(1, count - 1);
    const progress = THREE.MathUtils.lerp(progressStart, progressEnd, localProgress);
    const tail = Math.pow(progress, 0.68);
    const tailCoherence = 1 - smootherStep(0.86, 1, progress) * 0.34;
    const x = context.frontX - context.wakeLength * progress;
    const radialWave =
      Math.sin(progress * 46 - flow * 4.8 + strandIndex * 1.31) * radialWaveAmount * tailCoherence;
    const tangentWave =
      Math.sin(progress * 34 + flow * 3.6 + strandWeave) *
      tangentWaveAmount *
      (0.76 + tail * 0.24) *
      tailCoherence;
    const fineWave =
      Math.sin(progress * 122 - flow * 10.8 + strandIndex) *
      context.wakeRadius *
      (isCore ? 0.008 : 0.016) *
      tailCoherence;

    points.push(
      new THREE.Vector3(
        x,
        baseY + Math.cos(strandAngle) * radialWave + tangentY * tangentWave + fineWave,
        baseZ + Math.sin(strandAngle) * radialWave + tangentZ * tangentWave - fineWave * 0.66
      )
    );
  }

  const curve = new THREE.CatmullRomCurve3(points, false, "centripetal", 0.42);
  const nextGeometry = new THREE.TubeGeometry(
    curve,
    Math.max(12, count * 2),
    getNumericUserData(tube, "tubeRadius"),
    isCore ? 8 : 7,
    false
  );
  const previousGeometry = tube.geometry;
  tube.geometry = nextGeometry;
  previousGeometry.dispose();
}

export function writeShipDriveWakeStrandPositions(
  line: THREE.Line<THREE.BufferGeometry, THREE.Material | THREE.Material[]>,
  context: Readonly<{
    frontX: number;
    wakeLength: number;
    wakeRadius: number;
    curveY: number;
    curveZ: number;
    elapsed: number;
    pulsePhase: number;
    pulseBeatTime: number;
    detailProgress: number;
  }>
): void {
  const position = line.geometry.getAttribute("position");

  if (!(position instanceof THREE.BufferAttribute)) {
    return;
  }

  const count = position.count;
  const strandIndex = getNumericUserData(line, "strandIndex");
  const strandAngle = getNumericUserData(line, "strandAngle");
  const strandTwist = getNumericUserData(line, "strandTwist");
  const strandWeave = getNumericUserData(line, "strandWeave");
  const progressStart = getNumericUserData(line, "progressStart");
  const progressEnd = Math.max(progressStart, getNumericUserData(line, "progressEnd"));
  const flow = context.elapsed * 0.16 + context.pulseBeatTime * 0.22 + strandIndex * 0.09;

  for (let index = 0; index < count; index += 1) {
    const localProgress = index / Math.max(1, count - 1);
    const progress = THREE.MathUtils.lerp(progressStart, progressEnd, localProgress);
    const center = getShipDriveWakeCenterPoint({
      frontX: context.frontX,
      wakeLength: context.wakeLength,
      curveY: context.curveY,
      curveZ: context.curveZ,
      progress
    });
    const webPhase =
      strandAngle +
      strandTwist * progress +
      Math.sin(progress * Math.PI * 3.2 - flow * Math.PI * 2) *
        strandWeave *
        context.detailProgress;
    const radius =
      context.wakeRadius *
      (0.86 +
        Math.sin(progress * Math.PI * 2.1 + strandIndex * 0.73 + flow * Math.PI) *
          0.018 *
          context.detailProgress);
    position.setXYZ(
      index,
      center.x,
      center.y + Math.cos(webPhase) * radius,
      center.z + Math.sin(webPhase) * radius
    );
  }

  position.needsUpdate = true;
}

export function writeShipDriveWakeBridgePositions(
  line: THREE.Line<THREE.BufferGeometry, THREE.Material | THREE.Material[]>,
  context: Readonly<{
    frontX: number;
    wakeLength: number;
    wakeRadius: number;
    curveY: number;
    curveZ: number;
    elapsed: number;
    pulsePhase: number;
  }>
): void {
  const position = line.geometry.getAttribute("position");

  if (!(position instanceof THREE.BufferAttribute)) {
    return;
  }

  const baseProgress = getNumericUserData(line, "bridgeProgress");
  const bridgeAngle = getNumericUserData(line, "bridgeAngle");
  const progress = positiveModulo(baseProgress + context.elapsed * 0.018, 1);
  const center = getShipDriveWakeCenterPoint({
    frontX: context.frontX,
    wakeLength: context.wakeLength,
    curveY: context.curveY,
    curveZ: context.curveZ,
    progress
  });
  const sweep = 0.78 + Math.sin(context.elapsed * 0.42 + context.pulsePhase * Math.PI * 2) * 0.16;
  const firstAngle = bridgeAngle + progress * Math.PI * 1.4;
  const secondAngle = firstAngle + sweep;

  position.setXYZ(
    0,
    center.x,
    center.y + Math.cos(firstAngle) * context.wakeRadius * 0.9,
    center.z + Math.sin(firstAngle) * context.wakeRadius * 0.9
  );
  position.setXYZ(
    1,
    center.x,
    center.y + Math.cos(secondAngle) * context.wakeRadius * 0.9,
    center.z + Math.sin(secondAngle) * context.wakeRadius * 0.9
  );
  position.needsUpdate = true;
}

export function getShipDriveWakeCenterPoint(context: {
  frontX: number;
  wakeLength: number;
  curveY: number;
  curveZ: number;
  progress: number;
}): THREE.Vector3 {
  const progress = clamp(context.progress, 0, 1);
  const curveProgress = progress * progress * (3 - 2 * progress);
  const tailDrift = progress * progress;
  return new THREE.Vector3(
    context.frontX - context.wakeLength * progress,
    context.curveY * curveProgress * 0.58,
    context.curveZ * tailDrift
  );
}

function createShipRadiatorAssembly(
  side: number,
  radiatorMaterial: THREE.Material,
  accentMaterial: THREE.Material,
  anchorX = -0.02
): THREE.Group {
  const sideName = side > 0 ? "top" : "bottom";
  const assembly = new THREE.Group();
  assembly.name = `ship-radiator-assembly-${sideName}`;
  assembly.userData["radiatorSide"] = side;

  const boom = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.38, 0.035), radiatorMaterial.clone());
  boom.name = `ship-radiator-boom-${sideName}`;
  boom.position.set(anchorX, side * 0.32, 0);
  boom.renderOrder = 36;
  assembly.add(boom);

  const radiator = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.78, 0.3), radiatorMaterial.clone());
  radiator.name = `ship-radiator-${sideName}`;
  radiator.position.set(anchorX, side * 0.72, 0);
  radiator.renderOrder = 36;
  assembly.add(radiator);

  for (let index = 0; index < 4; index += 1) {
    const segment = new THREE.Mesh(
      new THREE.BoxGeometry(0.046, 0.018, 0.34),
      accentMaterial.clone()
    );
    segment.name = `ship-radiator-segment-${sideName}-${index}`;
    segment.position.set(anchorX, side * (0.42 + index * 0.16), 0);
    segment.renderOrder = 37;
    segment.userData["shipRadiatorBreathTarget"] = true;
    assembly.add(segment);
  }

  markShipComplexModelDetail(assembly);
  return assembly;
}

function createShipZigzagRadiatorAssembly(
  side: number,
  radiatorMaterial: THREE.Material,
  accentMaterial: THREE.Material,
  anchorX = -0.12
): THREE.Group {
  const sideName = side > 0 ? "top" : "bottom";
  const assembly = new THREE.Group();
  assembly.name = `ship-zigzag-radiator-assembly-${sideName}`;
  assembly.userData["radiatorSide"] = side;

  const boom = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.035), radiatorMaterial.clone());
  boom.name = `ship-zigzag-radiator-boom-${sideName}`;
  boom.position.set(anchorX, side * 0.34, 0);
  boom.renderOrder = 36;
  assembly.add(boom);

  const panelRows = 4;
  const panelColumns = 5;
  const rowSpacing = 0.092;
  const columnSpacing = 0.086;
  const panelGeometry = new THREE.BoxGeometry(0.074, 0.076, 0.026);
  const ribGeometry = new THREE.BoxGeometry(0.104, 0.012, 0.032);

  for (let row = 0; row < panelRows; row += 1) {
    const rowOffset = row % 2 === 0 ? -0.022 : 0.022;
    const rowY = side * (0.5 + row * rowSpacing);

    for (let column = 0; column < panelColumns; column += 1) {
      const centeredColumn = column - (panelColumns - 1) / 2;
      const panel = new THREE.Mesh(panelGeometry, radiatorMaterial.clone());
      panel.name = `ship-zigzag-radiator-panel-${sideName}-${row}-${column}`;
      panel.position.set(anchorX + centeredColumn * columnSpacing + rowOffset, rowY, 0);
      panel.renderOrder = 36;
      panel.userData["shipRadiatorBreathTarget"] = true;
      assembly.add(panel);

      const rib = new THREE.Mesh(ribGeometry, accentMaterial.clone());
      rib.name = `ship-zigzag-radiator-rib-${sideName}-${row}-${column}`;
      rib.position.copy(panel.position);
      rib.rotation.z = side * (row % 2 === 0 ? 0.54 : -0.54);
      rib.renderOrder = 37;
      rib.userData["shipRadiatorBreathTarget"] = true;
      assembly.add(rib);
    }
  }

  markShipComplexModelDetail(assembly);
  return assembly;
}
