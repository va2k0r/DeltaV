import * as THREE from "three";

export type RingHexShipState = "idle" | "burn" | "work";

export type RingHexShipOptions = Readonly<{
  factionColor: THREE.ColorRepresentation;
  state?: RingHexShipState;
}>;

const tuning = {
  shipLightBlinkFloor: 0.16,
  shipLightBlinkBeatBoost: 0.84,
  shipOrbitEngineGlowFloor: 0.36,
  shipOrbitEngineGlowBeatBoost: 0.28,
  shipOrbitEngineGlowScaleBoost: 0.12,
  shipDriveWakeLength: 42,
  shipDriveWakeRadius: 0.13
} as const;

const shipMetalSunGlintBaseOpacity = 0.085;
const shipMetalSunGlintSpecularPower = 26;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function smootherStep(edge0: number, edge1: number, value: number): number {
  const scaled = clamp((value - edge0) / Math.max(0.0001, edge1 - edge0), 0, 1);
  return scaled * scaled * scaled * (scaled * (scaled * 6 - 15) + 10);
}

function hashStringToUnitInterval(id: string): number {
  let hash = 2166136261;

  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }

  return hash / 0x100000000;
}

function getNumericUserData(object: THREE.Object3D, key: string): number {
  const value = object.userData[key];
  return typeof value === "number" ? value : 0;
}

function setBasicOpacity(material: THREE.Material | THREE.Material[], opacity: number): void {
  const materials = Array.isArray(material) ? material : [material];

  for (const candidate of materials) {
    if (
      candidate instanceof THREE.MeshBasicMaterial ||
      candidate instanceof THREE.LineBasicMaterial ||
      candidate instanceof THREE.PointsMaterial
    ) {
      candidate.opacity = opacity;
      candidate.transparent = true;
    }
  }
}

function createShipBeaconLight(
  name: string,
  color: THREE.ColorRepresentation,
  options: Readonly<{
    coreRadius: number;
    intensity: number;
    distance: number;
    pulseOffset?: number;
    pulseSharpness?: number;
    visual?: "glow" | "point";
    pointSize?: number;
  }>
): THREE.Group {
  const beaconColor = new THREE.Color(color);
  const beacon = new THREE.Group();
  beacon.name = name;
  beacon.userData["shipBeaconLight"] = true;
  beacon.userData["shipBeaconBaseIntensity"] = options.intensity;
  beacon.userData["shipBeaconPulseOffset"] = options.pulseOffset ?? hashStringToUnitInterval(name);
  beacon.userData["shipBeaconPulseSharpness"] = options.pulseSharpness ?? 2.4;

  if (options.visual === "point") {
    const pointGeometry = new THREE.BufferGeometry();
    pointGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3)
    );
    const pointMaterial = new THREE.PointsMaterial({
      color: beaconColor,
      size: options.pointSize ?? options.coreRadius,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending
    });
    pointMaterial.toneMapped = false;
    const point = new THREE.Points(pointGeometry, pointMaterial);
    point.name = `${name}-point`;
    point.renderOrder = 38;
    point.userData["shipBeaconBaseOpacity"] = 0.72;
    beacon.add(point);
  } else {
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: beaconColor,
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending
    });
    coreMaterial.toneMapped = false;
    const core = new THREE.Mesh(new THREE.SphereGeometry(options.coreRadius, 8, 6), coreMaterial);
    core.name = `${name}-core`;
    core.renderOrder = 38;
    core.userData["shipBeaconBaseOpacity"] = 0.58;
    beacon.add(core);

    const haloMaterial = new THREE.MeshBasicMaterial({
      color: beaconColor,
      transparent: true,
      opacity: 0.05,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending
    });
    haloMaterial.toneMapped = false;
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(options.coreRadius * 2.2, 8, 5),
      haloMaterial
    );
    halo.name = `${name}-halo`;
    halo.renderOrder = 37.95;
    halo.userData["shipBeaconBaseOpacity"] = 0.05;
    beacon.add(halo);
  }

  const light = new THREE.PointLight(beaconColor, options.intensity, options.distance, 2.15);
  light.name = `${name}-point-light`;
  light.castShadow = false;
  beacon.add(light);

  return beacon;
}

function getShipBeaconPulse(beacon: THREE.Object3D, elapsed: number): number {
  const offset = getNumericUserData(beacon, "shipBeaconPulseOffset");
  const sharpness = Math.max(0.8, getNumericUserData(beacon, "shipBeaconPulseSharpness"));
  const wave = 0.5 + 0.5 * Math.sin(elapsed * 5.1 + offset * Math.PI * 2);
  return 0.28 + Math.pow(wave, sharpness) * 0.72;
}

export function createRingHexShipModel(options: RingHexShipOptions): THREE.Group {
  const state = options.state ?? "burn";
  const model = new THREE.Group();
  model.name = "ship-model-ring-hex";
  model.userData["shipModelVariant"] = "ring-hex";

  const hullMaterial = new THREE.MeshStandardMaterial({
    color: 0x87959c,
    roughness: 0.42,
    metalness: 0.74,
    flatShading: true
  });
  const darkHullMaterial = new THREE.MeshStandardMaterial({
    color: 0x9ca8ad,
    emissive: 0x121c21,
    emissiveIntensity: 0.05,
    roughness: 0.36,
    metalness: 0.78,
    flatShading: true
  });
  const radiatorMaterial = new THREE.MeshStandardMaterial({
    color: 0x3f474d,
    emissive: 0x050607,
    emissiveIntensity: 0.04,
    roughness: 0.48,
    metalness: 0.66
  });
  const driveGlowMaterial = new THREE.MeshBasicMaterial({
    color: 0x7adfff,
    transparent: true,
    opacity: state === "idle" ? 0.42 : 0.78,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending
  });
  driveGlowMaterial.toneMapped = false;

  buildRingHexShipModel(model, {
    factionColor: options.factionColor,
    hullMaterial,
    darkHullMaterial,
    radiatorMaterial,
    driveGlowMaterial,
    state
  });

  model.scale.setScalar(1.0);
  return model;
}

function buildRingHexShipModel(
  model: THREE.Group,
  context: Readonly<{
    factionColor: THREE.ColorRepresentation;
    hullMaterial: THREE.MeshStandardMaterial;
    darkHullMaterial: THREE.MeshStandardMaterial;
    radiatorMaterial: THREE.MeshStandardMaterial;
    driveGlowMaterial: THREE.MeshBasicMaterial;
    state: RingHexShipState;
  }>
): void {
  const factionMaterial = context.hullMaterial.clone();
  factionMaterial.color = new THREE.Color(context.factionColor);
  factionMaterial.emissive = new THREE.Color(context.factionColor);
  factionMaterial.emissiveIntensity = 0.16;
  factionMaterial.flatShading = true;
  factionMaterial.needsUpdate = true;

  const amberLightColor = 0xffb84d;
  const redLightColor = 0xff3a3a;
  const amberLightMaterial = new THREE.MeshBasicMaterial({
    color: amberLightColor,
    transparent: true,
    opacity: 0.78,
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
  const retroRcsBuckleX = 0.086;
  const retroRcsBuckleRadius = 0.058;
  const retroRcsBuckleCount = 4;
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
  const hullPanelMaterial = context.darkHullMaterial.clone();
  hullPanelMaterial.color = new THREE.Color(0x526169);
  hullPanelMaterial.emissive = new THREE.Color(0x05090b);
  hullPanelMaterial.emissiveIntensity = 0.025;

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

  const spine = addAxialMesh(
    "ship-ring-hex-central-gunmetal-spine",
    new THREE.CylinderGeometry(
      noseConeTipRadius,
      noseConeTipRadius,
      0.98 + aftStemExtension,
      12,
      1
    ),
    context.darkHullMaterial.clone(),
    -0.34 - aftStemExtension / 2,
    0.55
  );
  spine.renderOrder = 34.5;

  addAxialMesh(
    "ship-ring-hex-nose-cone",
    new THREE.CylinderGeometry(noseConeTipRadius, 0.071, 0.132, 12, 1),
    context.hullMaterial.clone(),
    0.045 + frontAssemblyShiftX,
    1.1
  );

  const buckleNormalBase = new THREE.Vector3(0, 1, 0);
  const addRetroRcsBuckle = (index: number, angle: number): void => {
    const radial = new THREE.Vector3(0, Math.cos(angle), Math.sin(angle));
    const orientation = new THREE.Quaternion().setFromUnitVectors(buckleNormalBase, radial);
    const bucklePosition = new THREE.Vector3(
      retroRcsBuckleX,
      radial.y * retroRcsBuckleRadius,
      radial.z * retroRcsBuckleRadius
    );
    const outerMaterial = context.darkHullMaterial.clone();
    outerMaterial.color = new THREE.Color(0x334247);
    const outer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0088, 0.0088, 0.0038, 8, 1),
      outerMaterial
    );
    outer.name = `ship-ring-hex-retro-rcs-octagonal-buckle-${index}`;
    outer.position.copy(bucklePosition);
    outer.quaternion.copy(orientation);
    outer.renderOrder = 36.35;
    addShipMetalMeshWithSunGlint(model, outer, 0.55);

    const port = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0038, 0.0038, 0.0044, 8, 1),
      context.darkHullMaterial.clone()
    );
    port.name = `ship-ring-hex-retro-rcs-dark-port-${index}`;
    port.position.copy(bucklePosition).addScaledVector(radial, 0.0028);
    port.quaternion.copy(orientation);
    port.renderOrder = 36.4;
    addShipMetalMeshWithSunGlint(model, port, 0.28);
  };

  for (let index = 0; index < retroRcsBuckleCount; index += 1) {
    addRetroRcsBuckle(index, (index / retroRcsBuckleCount) * Math.PI * 2);
  }

  const frontHex = addAxialMesh(
    "ship-ring-hex-front-module",
    new THREE.CylinderGeometry(frontHexRadius, frontHexRadius, moduleLength, 6, 1),
    factionMaterial.clone(),
    -0.082 + frontAssemblyShiftX,
    1.05
  );
  frontHex.rotation.x = Math.PI / 6;
  addHexSurfacePanelMarks(
    model,
    "ship-ring-hex-front-module-panel",
    frontHex.position.x,
    frontHexRadius,
    moduleLength,
    Math.PI / 6,
    hullPanelMaterial
  );

  for (let faceIndex = 0; faceIndex < 6; faceIndex += 1) {
    const angle = Math.PI / 6 + (faceIndex / 6) * Math.PI * 2;
    const faceDistance = frontHexRadius * Math.cos(Math.PI / 6) + frontFaceCylinderRadius * 0.88;
    const tangentY = -Math.sin(angle);
    const tangentZ = Math.cos(angle);
    const launcherLength = 0.086;
    const launcherSegmentLength = launcherLength * 0.5 + 0.0015;
    const launcherCenterX = frontHex.position.x;

    for (let laneIndex = 0; laneIndex < 2; laneIndex += 1) {
      const laneOffset = (laneIndex - 0.5) * frontFaceCylinderRadius * 2.35;
      const radialY = Math.cos(angle) * faceDistance + tangentY * laneOffset;
      const radialZ = Math.sin(angle) * faceDistance + tangentZ * laneOffset;
      const firstMaterial =
        (faceIndex + laneIndex) % 2 === 0 ? context.hullMaterial.clone() : factionMaterial.clone();
      const secondMaterial =
        (faceIndex + laneIndex) % 2 === 0 ? factionMaterial.clone() : context.hullMaterial.clone();

      for (const segment of [
        {
          suffix: "aft",
          x: launcherCenterX - launcherLength * 0.25,
          material: firstMaterial
        },
        {
          suffix: "front",
          x: launcherCenterX + launcherLength * 0.25,
          material: secondMaterial
        }
      ]) {
        const cylinder = addAxialMesh(
          `ship-ring-hex-front-face-launcher-${faceIndex}-${laneIndex}-${segment.suffix}`,
          new THREE.CylinderGeometry(
            frontFaceCylinderRadius,
            frontFaceCylinderRadius,
            launcherSegmentLength,
            8,
            1
          ),
          segment.material,
          segment.x,
          0.5
        );
        cylinder.position.y = radialY;
        cylinder.position.z = radialZ;
      }
    }
  }

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
  addHexSurfacePanelMarks(
    radiatorClockworkRotor,
    "ship-ring-hex-habitat-module-panel",
    rearHex.position.x,
    habitatHexRadius,
    moduleLength,
    Math.PI / 6,
    hullPanelMaterial
  );

  addAxialMesh(
    "ship-ring-hex-aft-cylinder",
    new THREE.CylinderGeometry(connectorRadius, connectorRadius, aftConnectorLength, 14, 1),
    context.hullMaterial.clone(),
    -0.424 - connectorLengthExtension / 2 - aftStemExtension / 2,
    0.8
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
    0.55
  );
  centralEngine.scale.x = engineHubScaleX;
  centralEngine.userData["ringHexEngineRotor"] = true;
  model.userData["shipEnginePivotX"] = engineGlowX;

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

  const addEngineCollar = (
    name: string,
    x: number,
    radius: number,
    tubeRadius: number,
    opacityMultiplier: number
  ): void => {
    const collarGeometry = new THREE.TorusGeometry(radius, tubeRadius, 6, 18);
    collarGeometry.rotateY(Math.PI / 2);
    const collar = new THREE.Mesh(collarGeometry, context.darkHullMaterial.clone());
    collar.name = name;
    collar.position.x = x;
    collar.renderOrder = 36.2;
    addShipMetalMeshWithSunGlint(model, collar, opacityMultiplier);
  };

  addEngineCollar("ship-ring-hex-engine-front-field-collar", ringX + 0.068, 0.143, 0.0052, 0.52);
  addEngineCollar("ship-ring-hex-engine-reactor-collar", ringX, 0.126, 0.0045, 0.4);
  addEngineCollar("ship-ring-hex-engine-rear-field-collar", ringX - 0.068, 0.157, 0.006, 0.58);

  const interstageLight = new THREE.PointLight(0xaaf7ff, 0.86, interstageGapLength * 3.6, 1.55);
  interstageLight.name = "ship-ring-hex-engine-interstage-light";
  interstageLight.position.x = interstageBaffleX;
  model.add(interstageLight);

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
  addShipMetalMeshWithSunGlint(engineRotor, ring, 0.72);

  const ringInnerRadius = ringRadius - ringTubeRadius;
  const strutInnerRadius = Math.max(engineHubFrontRadius, engineHubRearRadius) - 0.008;
  const strutLength = ringInnerRadius - strutInnerRadius + 0.018;
  const strutCenterRadius = strutInnerRadius + strutLength / 2;
  const ringGlowClearance = Math.PI / 36;
  const ringGlowArc = Math.PI / 2 - ringGlowClearance * 2;
  const ringGlowRadius = ringRadius - ringTubeRadius * 1.12;

  for (let index = 0; index < 4; index += 1) {
    const angle = (index / 4) * Math.PI * 2;
    const strut = new THREE.Mesh(
      new THREE.BoxGeometry(0.024, strutLength, 0.026),
      factionMaterial.clone()
    );
    strut.name = `ship-ring-hex-ring-strut-${index}`;
    strut.position.set(0, Math.cos(angle) * strutCenterRadius, Math.sin(angle) * strutCenterRadius);
    strut.rotation.x = angle;
    strut.renderOrder = 36;
    addShipMetalMeshWithSunGlint(engineRotor, strut, 0.5);

    const glowGeometry = new THREE.TorusGeometry(ringGlowRadius, 0.014, 6, 18, ringGlowArc);
    glowGeometry.rotateZ(angle + ringGlowClearance);
    glowGeometry.rotateY(Math.PI / 2);
    const interiorGlow = new THREE.Mesh(glowGeometry, context.driveGlowMaterial.clone());
    interiorGlow.name = `ship-ring-hex-engine-ring-interior-glow-${index}`;
    interiorGlow.renderOrder = 37;
    engineRotor.add(interiorGlow);

    const castLightAngle = angle + Math.PI / 4;
    const castLightRadius = ringRadius * 0.46;
    const castLight = new THREE.PointLight(0xb8f6ff, 1.42, ringRadius * 2.06, 1.18);
    castLight.name = `ship-ring-hex-engine-ring-cast-light-${index}`;
    castLight.position.set(
      -0.018,
      Math.cos(castLightAngle) * castLightRadius,
      Math.sin(castLightAngle) * castLightRadius
    );
    castLight.userData["ringHexEngineRingCastLight"] = true;
    castLight.userData["ringHexEngineRingCastLightBaseIntensity"] = 1.28;
    castLight.userData["ringHexEngineRingCastLightBoostIntensity"] = 2.15;
    castLight.userData["ringHexEngineRingCastLightBaseDistance"] = ringRadius * 2.04;
    engineRotor.add(castLight);
  }

  for (let index = 0; index < 4; index += 1) {
    radiatorClockworkRotor.add(
      createHabitatRadiatorAssembly(
        index,
        rearHex.position.x,
        habitatHexRadius,
        radiatorPanelLength,
        radiatorFoldCount,
        context.radiatorMaterial.clone(),
        amberLightMaterial.clone()
      )
    );
  }

  addAxialMesh(
    "ship-ring-hex-exhaust-nozzle",
    new THREE.CylinderGeometry(
      exhaustNozzleAftRadius,
      exhaustNozzleForwardRadius,
      exhaustNozzleLength,
      engineFrustumRadialSegments,
      1,
      true
    ),
    context.darkHullMaterial.clone(),
    exhaustNozzleX,
    0.45
  );

  addEngineCollar(
    "ship-ring-hex-exhaust-magnetic-collar",
    -0.786 + engineAssemblyShiftX,
    0.091,
    0.0052,
    0.62
  );

  const nozzleThroatGeometry = new THREE.CylinderGeometry(0.031, 0.047, 0.026, 18, 1, true);
  nozzleThroatGeometry.rotateZ(Math.PI / 2);
  const nozzleThroat = new THREE.Mesh(nozzleThroatGeometry, context.driveGlowMaterial.clone());
  nozzleThroat.name = "ship-ring-hex-exhaust-plasma-throat";
  nozzleThroat.position.x = engineGlowX - 0.002;
  nozzleThroat.renderOrder = 37.2;
  nozzleThroat.userData["shipDriveGlowBaseOpacity"] = context.driveGlowMaterial.opacity;
  model.add(nozzleThroat);

  const nozzleInnerGlowRingMaterial = context.driveGlowMaterial.clone();
  nozzleInnerGlowRingMaterial.opacity = Math.min(1, context.driveGlowMaterial.opacity * 1.08);
  nozzleInnerGlowRingMaterial.color.set(0xcfffff).multiplyScalar(1.45);
  const nozzleInnerGlowRingGeometry = new THREE.TorusGeometry(0.052, 0.0058, 6, 18);
  nozzleInnerGlowRingGeometry.rotateY(Math.PI / 2);
  const nozzleInnerGlowRing = new THREE.Mesh(
    nozzleInnerGlowRingGeometry,
    nozzleInnerGlowRingMaterial
  );
  nozzleInnerGlowRing.name = "ship-ring-hex-exhaust-inner-glow-ring";
  nozzleInnerGlowRing.position.x = exhaustNozzleX - exhaustNozzleLength * 0.3;
  nozzleInnerGlowRing.renderOrder = 37.25;
  nozzleInnerGlowRing.userData["shipAlwaysOnGlowBaseOpacity"] = nozzleInnerGlowRingMaterial.opacity;
  model.add(nozzleInnerGlowRing);

  const engineGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.072, 12, 8),
    context.driveGlowMaterial.clone()
  );
  engineGlow.name = "ship-engine-glow";
  engineGlow.position.x = engineGlowX;
  engineGlow.userData["baseX"] = engineGlowX;
  engineGlow.userData["baseScaleX"] = 1.0;
  engineGlow.userData["baseScaleY"] = 0.26;
  engineGlow.userData["baseScaleZ"] = 0.26;
  engineGlow.scale.set(0.92, 0.26, 0.26);
  engineGlow.renderOrder = 37;
  model.add(engineGlow);

  for (const [index, source] of [[0, frontHex]] as const) {
    for (let corner = 0; corner < 6; corner += 1) {
      const angle = (corner / 6) * Math.PI * 2 + Math.PI / 6;
      const light = createShipBeaconLight(
        `ship-ring-hex-red-corner-light-${index}-${corner}`,
        redLightColor,
        {
          coreRadius: 0.0031,
          intensity: 0.0075,
          distance: 0.05,
          pulseOffset: index * 0.17 + corner * 0.071,
          pulseSharpness: 7.5
        }
      );
      light.position.set(
        source.position.x,
        Math.cos(angle) * frontHexRadius * 1.035,
        Math.sin(angle) * frontHexRadius * 1.035
      );
      model.add(light);
    }
  }

  if (context.state !== "idle") {
    model.add(createShipElectromagneticDriveWake(engineGlowX));
  }
}

function addHexSurfacePanelMarks(
  parent: THREE.Object3D,
  namePrefix: string,
  moduleX: number,
  moduleRadius: number,
  moduleLength: number,
  faceRotation: number,
  material: THREE.Material
): void {
  for (let faceIndex = 0; faceIndex < 6; faceIndex += 1) {
    const faceAngle = faceRotation + (faceIndex / 6) * Math.PI * 2;
    const normalY = Math.cos(faceAngle);
    const normalZ = Math.sin(faceAngle);

    for (let panelIndex = 0; panelIndex < 3; panelIndex += 1) {
      const offsetX = (panelIndex - 1) * moduleLength * 0.24;
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(
          moduleLength * (panelIndex === 1 ? 0.18 : 0.13),
          0.0032,
          moduleRadius * (panelIndex === 1 ? 0.22 : 0.14)
        ),
        material.clone()
      );
      panel.name = `${namePrefix}-${faceIndex}-${panelIndex}`;
      panel.position.set(
        moduleX + offsetX,
        normalY * moduleRadius * 0.938,
        normalZ * moduleRadius * 0.938
      );
      panel.rotation.x = faceAngle;
      panel.renderOrder = 36.1;
      addShipMetalMeshWithSunGlint(parent, panel, panelIndex === 1 ? 0.34 : 0.24);
    }

    const seam = new THREE.Mesh(
      new THREE.BoxGeometry(moduleLength * 0.9, 0.0023, moduleRadius * 0.025),
      material.clone()
    );
    seam.name = `${namePrefix}-edge-seam-${faceIndex}`;
    seam.position.set(moduleX, normalY * moduleRadius * 0.965, normalZ * moduleRadius * 0.965);
    seam.rotation.x = faceAngle;
    seam.renderOrder = 36.12;
    addShipMetalMeshWithSunGlint(parent, seam, 0.18);
  }
}

function createHabitatRadiatorAssembly(
  index: number,
  moduleX: number,
  moduleRadius: number,
  panelLength: number,
  foldCount: number,
  radiatorMaterial: THREE.Material,
  amberLightMaterial: THREE.Material
): THREE.Group {
  const flatFaceAngles = [Math.PI / 6, (Math.PI * 5) / 6, (Math.PI * 7) / 6, (Math.PI * 11) / 6];
  const angle = flatFaceAngles[index % flatFaceAngles.length];
  const radial = new THREE.Vector3(0, Math.cos(angle), Math.sin(angle));
  const assembly = new THREE.Group();
  assembly.name = `ship-ring-hex-habitat-radiator-assembly-${index}`;
  assembly.position.set(
    moduleX,
    radial.y * moduleRadius * Math.cos(Math.PI / 6),
    radial.z * moduleRadius * Math.cos(Math.PI / 6)
  );
  assembly.rotation.x = angle;

  const bandCount = 5;
  const maxSegmentLength = panelLength / foldCount;
  const panelAxialWidth = 0.102;
  const bandPitch = panelAxialWidth / bandCount;
  const bandWidth = bandPitch * 0.46;
  const lamellaThickness = 0.0048;
  const baseOffset = moduleRadius * 0.1;
  const filamentMaterial = amberLightMaterial.clone();

  if (filamentMaterial instanceof THREE.MeshBasicMaterial) {
    filamentMaterial.side = THREE.DoubleSide;
    filamentMaterial.opacity = 0.44;
    filamentMaterial.toneMapped = false;
  }
  assembly.userData["shipAccordionRadiator"] = true;
  assembly.userData["shipAccordionRadiatorFoldCount"] = foldCount;
  assembly.userData["shipAccordionRadiatorBandCount"] = bandCount;

  const rootHinge = new THREE.Mesh(
    new THREE.BoxGeometry(panelAxialWidth * 1.08, 0.014, 0.018),
    radiatorMaterial.clone()
  );
  rootHinge.name = `ship-ring-hex-habitat-radiator-root-hinge-${index}`;
  rootHinge.position.y = baseOffset;
  rootHinge.renderOrder = 36;
  assembly.add(rootHinge);

  for (let foldIndex = 0; foldIndex < foldCount; foldIndex += 1) {
    const segmentGroup = new THREE.Group();
    segmentGroup.name = `ship-ring-hex-habitat-radiator-fold-segment-${index}-${foldIndex}`;
    segmentGroup.userData["shipAccordionRadiatorSegment"] = true;
    segmentGroup.userData["shipAccordionRadiatorAssemblyIndex"] = index;
    segmentGroup.userData["shipAccordionRadiatorFoldIndex"] = foldIndex;
    segmentGroup.userData["shipAccordionRadiatorBaseOffset"] = baseOffset;
    segmentGroup.userData["shipAccordionRadiatorFoldCount"] = foldCount;
    segmentGroup.userData["shipAccordionRadiatorMaxSegmentLength"] = maxSegmentLength;
    segmentGroup.userData["shipAccordionRadiatorCompactExtent"] = panelLength * 0.18;
    segmentGroup.userData["shipAccordionRadiatorRightAngleExtent"] = panelLength * 0.52;
    segmentGroup.userData["shipAccordionRadiatorExtendedExtent"] = panelLength;
    assembly.add(segmentGroup);

    if (foldIndex > 0) {
      const hinge = new THREE.Mesh(
        new THREE.BoxGeometry(panelAxialWidth * 1.04, 0.006, 0.007),
        radiatorMaterial.clone()
      );
      hinge.name = `ship-ring-hex-habitat-radiator-metal-hinge-${index}-${foldIndex}`;
      hinge.renderOrder = 36;
      hinge.userData["shipRadiatorBreathTarget"] = true;
      segmentGroup.add(hinge);
    }

    for (let bandIndex = 0; bandIndex < bandCount; bandIndex += 1) {
      const axialOffset = (bandIndex - (bandCount - 1) / 2) * bandPitch;
      const lamella = new THREE.Mesh(
        new THREE.BoxGeometry(bandWidth, maxSegmentLength * 0.9, lamellaThickness),
        radiatorMaterial.clone()
      );
      lamella.name = `ship-ring-hex-habitat-radiator-accordion-lamella-${index}-${foldIndex}-${bandIndex}`;
      lamella.position.set(axialOffset, maxSegmentLength * 0.48, 0);
      lamella.renderOrder = 36;
      lamella.userData["shipRadiatorBreathTarget"] = true;
      segmentGroup.add(lamella);

      for (const side of [-1, 1]) {
        const filament = new THREE.Mesh(
          new THREE.BoxGeometry(
            Math.max(0.0022, bandWidth * 0.16),
            maxSegmentLength * 0.68,
            0.0018
          ),
          filamentMaterial.clone()
        );
        filament.name = `ship-ring-hex-habitat-radiator-filament-${index}-${foldIndex}-${bandIndex}-${side > 0 ? "front" : "back"}`;
        filament.position.set(axialOffset, maxSegmentLength * 0.48, side * lamellaThickness * 0.76);
        filament.renderOrder = 37;
        filament.userData["shipRadiatorFilament"] = true;
        filament.userData["shipRadiatorFilamentBaseOpacity"] = 0.4;
        filament.userData["shipRadiatorFilamentPhase"] =
          index * 0.37 + foldIndex * 0.13 + bandIndex * 0.071;
        segmentGroup.add(filament);
      }
    }
  }

  setRingHexShipRadiatorExtension(assembly, 0.5);
  return assembly;
}

export function setRingHexShipRadiatorExtension(ship: THREE.Object3D, extension: number): void {
  const amount = clamp(extension, -0.08, 1.08);

  ship.traverse((object) => {
    if (object.userData["shipAccordionRadiatorSegment"] !== true) {
      return;
    }

    const progress = clamp(amount, 0, 1);
    const foldIndex = getNumericUserData(object, "shipAccordionRadiatorFoldIndex");
    const foldCount = Math.max(1, getNumericUserData(object, "shipAccordionRadiatorFoldCount"));
    const baseOffset = getNumericUserData(object, "shipAccordionRadiatorBaseOffset");
    const compactExtent = getNumericUserData(object, "shipAccordionRadiatorCompactExtent");
    const rightAngleExtent = getNumericUserData(object, "shipAccordionRadiatorRightAngleExtent");
    const extendedExtent = getNumericUserData(object, "shipAccordionRadiatorExtendedExtent");
    const maxSegmentLength = Math.max(
      0.001,
      getNumericUserData(object, "shipAccordionRadiatorMaxSegmentLength")
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

    const start = getRadiatorFoldVertex(
      baseOffset,
      extentWithServoBounce,
      foldCount,
      maxSegmentLength,
      foldIndex
    );
    const end = getRadiatorFoldVertex(
      baseOffset,
      extentWithServoBounce,
      foldCount,
      maxSegmentLength,
      foldIndex + 1
    );
    const segmentY = end.y - start.y;
    const segmentZ = end.z - start.z;
    const segmentLength = Math.max(0.001, Math.hypot(segmentY, segmentZ));

    object.position.set(start.x, start.y, start.z);
    object.rotation.x = Math.atan2(segmentZ, segmentY);
    object.scale.set(1, segmentLength / maxSegmentLength, 1);
  });
}

export function setRingHexShipRadiatorClockRotation(ship: THREE.Object3D, rotation: number): void {
  const rotor = ship.getObjectByName("ship-ring-hex-radiator-clockwork-rotor");

  if (rotor === undefined) {
    return;
  }

  rotor.rotation.x = rotation;
}

function getRadiatorFoldVertex(
  baseOffset: number,
  extent: number,
  foldCount: number,
  segmentLength: number,
  vertexIndex: number
): THREE.Vector3 {
  const safeFoldCount = Math.max(1, foldCount);
  const clampedIndex = clamp(vertexIndex, 0, safeFoldCount);
  const radialStep = clamp(extent / safeFoldCount, segmentLength * 0.08, segmentLength);
  const lateralStep = Math.sqrt(
    Math.max(0, segmentLength * segmentLength - radialStep * radialStep)
  );
  const radialDistance = baseOffset + radialStep * clampedIndex;
  const lateralDistance = clampedIndex % 2 === 0 ? 0 : lateralStep;

  return new THREE.Vector3(0, radialDistance, lateralDistance);
}

function addShipMetalMeshWithSunGlint(
  parent: THREE.Object3D,
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>,
  opacityMultiplier: number
): void {
  parent.add(mesh);
  const glint = new THREE.Mesh(
    mesh.geometry,
    createShipMetalSunGlintMaterial(hashStringToUnitInterval(mesh.name))
  );
  glint.name = `${mesh.name}-sun-glint`;
  glint.renderOrder = (mesh.renderOrder ?? 36) + 0.05;
  glint.visible = true;
  glint.userData["usesSharedGeometry"] = true;
  glint.userData["shipMetalSunGlint"] = true;
  glint.userData["shipMetalSunGlintBaseOpacity"] = shipMetalSunGlintBaseOpacity * opacityMultiplier;
  mesh.add(glint);
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

function createShipElectromagneticDriveWake(sourceX = -0.92): THREE.Group {
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
    writeShipDriveWakeTubeGeometry(halo, {
      frontX,
      wakeLength,
      wakeRadius,
      elapsed: 0,
      pulseBeatTime: 0
    });
    wake.add(halo);
  }

  const nozzleLight = new THREE.PointLight(0xeaffff, 7.2, 7.2, 1.35);
  nozzleLight.name = "ship-drive-wake-nozzle-light";
  nozzleLight.position.set(frontX + 0.02, 0, 0);
  nozzleLight.userData["shipDriveWakeLight"] = true;
  nozzleLight.userData["baseIntensity"] = 6.2;
  nozzleLight.userData["boostIntensity"] = 5.1;
  nozzleLight.userData["baseDistance"] = 7.2;
  wake.add(nozzleLight);

  const lanceLight = new THREE.PointLight(0x8fefff, 3.6, 20, 1.7);
  lanceLight.name = "ship-drive-wake-lance-light";
  lanceLight.position.set(frontX - wakeLength * 0.12, 0, 0);
  lanceLight.userData["shipDriveWakeLight"] = true;
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
    blending: THREE.AdditiveBlending
  });
  material.toneMapped = false;
  material.onBeforeCompile = function (shader): void {
    const fadeStart = getMaterialNumericUserData(this, "wakeTailFadeStart", 0.62);
    const fadeEnd = getMaterialNumericUserData(this, "wakeTailFadeEnd", 1);
    const fadeMinAlpha = getMaterialNumericUserData(this, "wakeTailFadeMinAlpha", 0);
    const frontX = getMaterialNumericUserData(this, "wakeTailFadeFrontX", 0);
    const wakeLength = getMaterialNumericUserData(this, "wakeTailFadeLength", 1);
    shader.uniforms["wakeTailFadeStart"] = { value: fadeStart };
    shader.uniforms["wakeTailFadeEnd"] = { value: fadeEnd };
    shader.uniforms["wakeTailFadeMinAlpha"] = { value: fadeMinAlpha };
    shader.uniforms["wakeTailFadeFrontX"] = { value: frontX };
    shader.uniforms["wakeTailFadeLength"] = { value: wakeLength };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
varying float vWakeTailFade;
uniform float wakeTailFadeStart;
uniform float wakeTailFadeEnd;
uniform float wakeTailFadeMinAlpha;
uniform float wakeTailFadeFrontX;
uniform float wakeTailFadeLength;`
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
float wakeTailProgress = clamp((wakeTailFadeFrontX - position.x) / max(wakeTailFadeLength, 0.0001), 0.0, 1.0);
float wakeTailFade = 1.0 - smoothstep(wakeTailFadeStart, wakeTailFadeEnd, wakeTailProgress);
vWakeTailFade = mix(wakeTailFadeMinAlpha, 1.0, wakeTailFade);`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying float vWakeTailFade;`
      )
      .replace(
        "#include <opaque_fragment>",
        `diffuseColor.a *= vWakeTailFade;
#include <opaque_fragment>`
      );
  };
  material.customProgramCacheKey = (): string => "ship-drive-wake-tail-fade-v1";
  return material;
}

function configureShipDriveWakeTailFade(
  material: THREE.MeshBasicMaterial,
  frontX: number,
  wakeLength: number
): void {
  material.userData["wakeTailFadeFrontX"] = frontX;
  material.userData["wakeTailFadeLength"] = wakeLength;
  material.userData["wakeTailFadeStart"] = 0.46;
  material.userData["wakeTailFadeEnd"] = 1;
  material.userData["wakeTailFadeMinAlpha"] = 0;
  material.needsUpdate = true;
}

function getMaterialNumericUserData(
  material: THREE.Material,
  key: string,
  fallback: number
): number {
  const value = material.userData[key];
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

function writeShipDriveWakeTubeGeometry(
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

export function updateRingHexShipModel(
  ship: THREE.Object3D,
  elapsed: number,
  sunPosition: THREE.Vector3,
  enginePower = 1
): void {
  const drivePower = clamp(enginePower, 0, 1);
  const fastBeat = 0.5 + 0.5 * Math.sin(elapsed * Math.PI * 6.2);
  const slowBeat = 0.5 + 0.5 * Math.sin(elapsed * Math.PI * 1.42);
  const ringBreath = 0.5 + 0.5 * Math.sin(elapsed * Math.PI * 0.34);
  const radiatorBreath = 0.5 + 0.5 * Math.sin(elapsed * Math.PI * 0.48);
  const ignitionPulse = Math.pow(fastBeat, 2.2);
  const engineOpacity =
    (tuning.shipOrbitEngineGlowFloor + tuning.shipOrbitEngineGlowBeatBoost * ignitionPulse) *
    (0.06 + drivePower * 0.94);

  ship.traverse((object) => {
    if (object.userData["ringHexEngineRotor"] === true) {
      object.rotation.x = -elapsed * 0.24;
    }

    if (object.parent?.userData["shipBeaconLight"] === true) {
      const pulse = getShipBeaconPulse(object.parent, elapsed);

      if (object instanceof THREE.PointLight) {
        object.intensity =
          getNumericUserData(object.parent, "shipBeaconBaseIntensity") * (0.26 + pulse * 1.08);
      } else if (object instanceof THREE.Points) {
        const baseOpacity = getNumericUserData(object, "shipBeaconBaseOpacity");
        setBasicOpacity(object.material, baseOpacity * (0.42 + pulse * 0.58));
      } else if (object instanceof THREE.Mesh) {
        const baseOpacity = getNumericUserData(object, "shipBeaconBaseOpacity");
        const haloMultiplier = object.name.endsWith("-halo")
          ? 0.24 + pulse * 0.82
          : 0.5 + pulse * 0.5;
        setBasicOpacity(object.material, baseOpacity * haloMultiplier);
      }
    }

    if (
      object instanceof THREE.PointLight &&
      object.userData["ringHexEngineRingCastLight"] === true
    ) {
      const baseIntensity = getNumericUserData(object, "ringHexEngineRingCastLightBaseIntensity");
      const boostIntensity = getNumericUserData(object, "ringHexEngineRingCastLightBoostIntensity");
      const baseDistance = getNumericUserData(object, "ringHexEngineRingCastLightBaseDistance");
      object.intensity = baseIntensity * 0.78 + boostIntensity * Math.pow(ringBreath, 1.32) * 0.62;
      object.distance = baseDistance * (0.98 + ringBreath * 0.24);
    }

    if (object instanceof THREE.Mesh) {
      const belongsToBeacon = object.parent?.userData["shipBeaconLight"] === true;
      const isRadiatorFilament = object.userData["shipRadiatorFilament"] === true;

      if (object.name === "ship-engine-glow") {
        setBasicOpacity(object.material, Math.min(0.95, engineOpacity));
        const scaleBoost = tuning.shipOrbitEngineGlowScaleBoost * ignitionPulse * drivePower;
        object.scale.set(
          getNumericUserData(object, "baseScaleX") + scaleBoost * 1.45,
          getNumericUserData(object, "baseScaleY") + scaleBoost,
          getNumericUserData(object, "baseScaleZ") + scaleBoost
        );
      } else if (object.name.includes("engine-ring-interior-glow")) {
        setBasicOpacity(object.material, Math.min(1, 0.68 + ringBreath * 0.22));

        if (object.material instanceof THREE.MeshBasicMaterial) {
          const ringColorIntensity = 1.55 + Math.pow(ringBreath, 1.42) * 1.35;
          object.material.color.set(0x9ff6ff).multiplyScalar(ringColorIntensity);
          object.material.needsUpdate = true;
        }
      } else if (object.name === "ship-ring-hex-exhaust-inner-glow-ring") {
        const baseOpacity = getNumericUserData(object, "shipAlwaysOnGlowBaseOpacity");
        setBasicOpacity(object.material, Math.min(1, baseOpacity * (1 + ringBreath * 0.28)));
      } else if (object.name === "ship-ring-hex-exhaust-plasma-throat") {
        const baseOpacity = getNumericUserData(object, "shipDriveGlowBaseOpacity");
        setBasicOpacity(object.material, baseOpacity * (0.38 + drivePower * 0.62));
      } else if (!belongsToBeacon && object.name.includes("red-corner-light")) {
        const blink =
          tuning.shipLightBlinkFloor +
          tuning.shipLightBlinkBeatBoost * Math.pow(0.5 + 0.5 * Math.sin(elapsed * 4.8), 10);
        setBasicOpacity(object.material, blink * 0.86);
      } else if (isRadiatorFilament) {
        const filamentBreath =
          0.5 +
          0.5 *
            Math.sin(
              elapsed * Math.PI * 0.42 + getNumericUserData(object, "shipRadiatorFilamentPhase")
            );
        setBasicOpacity(
          object.material,
          getNumericUserData(object, "shipRadiatorFilamentBaseOpacity") *
            (0.58 + filamentBreath * 0.42)
        );
      } else if (
        !belongsToBeacon &&
        (object.name.includes("amber-engine-light") ||
          object.name.includes("radiator-base-amber-light") ||
          object.name.includes("radiator-glow-rib"))
      ) {
        setBasicOpacity(object.material, 0.28 + radiatorBreath * 0.42);
      }

      if (
        object.userData["shipMetalSunGlint"] === true &&
        object.material instanceof THREE.ShaderMaterial
      ) {
        object.material.uniforms["opacity"].value =
          getNumericUserData(object, "shipMetalSunGlintBaseOpacity") * (0.55 + slowBeat * 0.5);
        object.material.uniforms["time"].value = elapsed;
        object.material.uniforms["sunPosition"].value.copy(sunPosition);
      }
    }

    if (
      object instanceof THREE.Mesh &&
      object.parent?.name === "ship-electromagnetic-drive-wake" &&
      (object.userData["wakeComponent"] === "plasma-tube-core" ||
        object.userData["wakeComponent"] === "plasma-tube-halo" ||
        object.userData["wakeComponent"] === "plasma-tube-blue-outline")
    ) {
      const wakeComponent = String(object.userData["wakeComponent"]);
      const parent = object.parent;
      writeShipDriveWakeTubeGeometry(object, {
        frontX: getNumericUserData(parent, "frontX"),
        wakeLength: getNumericUserData(parent, "wakeLength"),
        wakeRadius: getNumericUserData(parent, "wakeRadius"),
        elapsed,
        pulseBeatTime: ignitionPulse
      });
      const isCoreTube = wakeComponent === "plasma-tube-core";
      const isBlueOutlineTube = wakeComponent === "plasma-tube-blue-outline";
      setBasicOpacity(
        object.material,
        Math.min(
          1,
          getNumericUserData(object, "baseOpacity") *
            (isCoreTube
              ? 0.9 + ignitionPulse * 0.34
              : isBlueOutlineTube
                ? 0.88 + ignitionPulse * 0.2
                : 0.78 + ignitionPulse * 0.42) *
            drivePower
        )
      );
    }

    if (
      object instanceof THREE.PointLight &&
      object.parent?.name === "ship-electromagnetic-drive-wake" &&
      object.userData["shipDriveWakeLight"] === true
    ) {
      const baseIntensity = getNumericUserData(object, "baseIntensity");
      const boostIntensity = getNumericUserData(object, "boostIntensity");
      const baseDistance = getNumericUserData(object, "baseDistance");
      object.intensity = (baseIntensity + boostIntensity * ignitionPulse) * drivePower;
      object.distance = baseDistance * (0.92 + ignitionPulse * 0.2);
    }
  });
}
