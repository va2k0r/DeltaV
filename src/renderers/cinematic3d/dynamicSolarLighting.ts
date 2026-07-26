import * as THREE from "three";

export const dynamicSolarLightingEnabled = true;
export const maxDynamicSolarOccluders = 4;

export type DynamicSolarBody = Readonly<{
  id: string;
  position: Readonly<{ x: number; y: number; z: number }>;
  radius: number;
}>;

export type DynamicSolarOccluder = Readonly<{
  id: string;
  position: THREE.Vector3;
  radius: number;
}>;

export type DynamicSolarLightingUniforms = Readonly<{
  dynamicSolarLightingStrength: { value: number };
  dynamicSolarSunRadius: { value: number };
  dynamicSolarOccluderCount: { value: number };
  dynamicSolarOccluders: { value: THREE.Vector4[] };
}>;

const minimumDistance = 0.0001;
const angularLimit = Math.PI * 0.499;

export function createDynamicSolarLightingUniforms(): DynamicSolarLightingUniforms {
  return {
    dynamicSolarLightingStrength: { value: 0 },
    dynamicSolarSunRadius: { value: 0 },
    dynamicSolarOccluderCount: { value: 0 },
    dynamicSolarOccluders: {
      value: Array.from({ length: maxDynamicSolarOccluders }, () => new THREE.Vector4(0, 0, 0, 0))
    }
  };
}

export function selectDynamicSolarOccluders(options: {
  receiverId: string;
  receiverPosition: Readonly<{ x: number; y: number; z: number }>;
  receiverRadius: number;
  sunPosition: Readonly<{ x: number; y: number; z: number }>;
  sunRadius: number;
  bodies: readonly DynamicSolarBody[];
}): DynamicSolarOccluder[] {
  const sunOffsetX = options.sunPosition.x - options.receiverPosition.x;
  const sunOffsetY = options.sunPosition.y - options.receiverPosition.y;
  const sunOffsetZ = options.sunPosition.z - options.receiverPosition.z;
  const sunDistance = Math.hypot(sunOffsetX, sunOffsetY, sunOffsetZ);

  if (sunDistance <= minimumDistance) {
    return [];
  }

  const inverseSunDistance = 1 / sunDistance;
  const sunDirectionX = sunOffsetX * inverseSunDistance;
  const sunDirectionY = sunOffsetY * inverseSunDistance;
  const sunDirectionZ = sunOffsetZ * inverseSunDistance;
  const sunAngularRadius = getAngularRadius(options.sunRadius, sunDistance);
  const candidates: Array<DynamicSolarOccluder & { score: number }> = [];

  for (const body of options.bodies) {
    if (body.id === options.receiverId || body.radius <= 0) {
      continue;
    }

    const offsetX = body.position.x - options.receiverPosition.x;
    const offsetY = body.position.y - options.receiverPosition.y;
    const offsetZ = body.position.z - options.receiverPosition.z;
    const alongSunRay = offsetX * sunDirectionX + offsetY * sunDirectionY + offsetZ * sunDirectionZ;

    if (alongSunRay <= minimumDistance || alongSunRay >= sunDistance) {
      continue;
    }

    const occluderDistanceSquared = offsetX * offsetX + offsetY * offsetY + offsetZ * offsetZ;
    const perpendicularDistance = Math.sqrt(
      Math.max(0, occluderDistanceSquared - alongSunRay * alongSunRay)
    );
    const sunPenumbraRadius = Math.tan(sunAngularRadius) * alongSunRay;
    const possibleShadowRadius =
      body.radius + Math.max(0, options.receiverRadius) + sunPenumbraRadius;

    if (perpendicularDistance > possibleShadowRadius) {
      continue;
    }

    const occluderDistance = Math.sqrt(occluderDistanceSquared);
    const occluderAngularRadius = getAngularRadius(body.radius, occluderDistance);
    const alignment = 1 - perpendicularDistance / Math.max(possibleShadowRadius, minimumDistance);
    const angularInfluence = occluderAngularRadius / Math.max(sunAngularRadius, minimumDistance);
    const score = alignment * 4 + Math.min(4, angularInfluence) - alongSunRay / sunDistance;

    candidates.push({
      id: body.id,
      position: new THREE.Vector3(body.position.x, body.position.y, body.position.z),
      radius: body.radius,
      score
    });
  }

  return candidates
    .sort((first, second) => second.score - first.score)
    .slice(0, maxDynamicSolarOccluders)
    .map(({ id, position, radius }) => ({ id, position, radius }));
}

export function computeDynamicSolarVisibilityAtPoint(options: {
  point: Readonly<{ x: number; y: number; z: number }>;
  sunPosition: Readonly<{ x: number; y: number; z: number }>;
  sunRadius: number;
  occluders: readonly Pick<DynamicSolarOccluder, "position" | "radius">[];
  strength?: number;
}): number {
  const point = toVector3(options.point);
  const toSun = toVector3(options.sunPosition).sub(point);
  const sunDistance = toSun.length();

  if (sunDistance <= minimumDistance || options.sunRadius <= 0) {
    return 1;
  }

  const sunDirection = toSun.multiplyScalar(1 / sunDistance);
  const sunAngularRadius = getAngularRadius(options.sunRadius, sunDistance);
  let visibility = 1;

  for (const occluder of options.occluders.slice(0, maxDynamicSolarOccluders)) {
    const toOccluder = occluder.position.clone().sub(point);
    const occluderDistance = toOccluder.length();

    if (
      occluder.radius <= 0 ||
      occluderDistance <= minimumDistance ||
      occluderDistance >= sunDistance
    ) {
      continue;
    }

    const occluderDirection = toOccluder.multiplyScalar(1 / occluderDistance);
    const separation = Math.acos(THREE.MathUtils.clamp(sunDirection.dot(occluderDirection), -1, 1));
    const occluderAngularRadius = getAngularRadius(occluder.radius, occluderDistance);
    const coverage = computeDiscCoverage(sunAngularRadius, occluderAngularRadius, separation);
    visibility *= 1 - coverage;
  }

  return THREE.MathUtils.lerp(
    1,
    THREE.MathUtils.clamp(visibility, 0, 1),
    THREE.MathUtils.clamp(options.strength ?? 1, 0, 1)
  );
}

export const dynamicSolarLightingShaderFunctions = `
  uniform float dynamicSolarLightingStrength;
  uniform float dynamicSolarSunRadius;
  uniform float dynamicSolarOccluderCount;
  uniform vec4 dynamicSolarOccluders[${maxDynamicSolarOccluders}];

  float dynamicSolarAngularRadius(float radius, float distanceToCenter) {
    return asin(clamp(radius / max(0.0001, distanceToCenter), 0.0, 0.9999));
  }

  float dynamicSolarDiscCoverage(
    float sourceRadius,
    float blockerRadius,
    float centerSeparation
  ) {
    float combinedRadius = sourceRadius + blockerRadius;

    if (centerSeparation >= combinedRadius) {
      return 0.0;
    }

    float containedRadius = abs(sourceRadius - blockerRadius);
    if (centerSeparation <= containedRadius) {
      return blockerRadius >= sourceRadius
        ? 1.0
        : clamp(
            blockerRadius * blockerRadius / max(0.000001, sourceRadius * sourceRadius),
            0.0,
            1.0
          );
    }

    float safeSeparation = max(0.0001, centerSeparation);
    float sourceSquare = sourceRadius * sourceRadius;
    float blockerSquare = blockerRadius * blockerRadius;
    float sourceAngle = acos(clamp(
      (safeSeparation * safeSeparation + sourceSquare - blockerSquare) /
        max(0.000001, 2.0 * safeSeparation * sourceRadius),
      -1.0,
      1.0
    ));
    float blockerAngle = acos(clamp(
      (safeSeparation * safeSeparation + blockerSquare - sourceSquare) /
        max(0.000001, 2.0 * safeSeparation * blockerRadius),
      -1.0,
      1.0
    ));
    float lensTerm = max(
      0.0,
      (-safeSeparation + sourceRadius + blockerRadius) *
      (safeSeparation + sourceRadius - blockerRadius) *
      (safeSeparation - sourceRadius + blockerRadius) *
      (safeSeparation + sourceRadius + blockerRadius)
    );
    float overlapArea =
      sourceSquare * sourceAngle +
      blockerSquare * blockerAngle -
      0.5 * sqrt(lensTerm);
    return clamp(overlapArea / max(0.000001, 3.14159265359 * sourceSquare), 0.0, 1.0);
  }

  float getDynamicSolarVisibility(vec3 worldPosition, vec3 solarPosition) {
    vec3 toSun = solarPosition - worldPosition;
    float sunDistance = length(toSun);

    if (
      dynamicSolarLightingStrength <= 0.001 ||
      dynamicSolarSunRadius <= 0.0 ||
      sunDistance <= 0.0001
    ) {
      return 1.0;
    }

    vec3 sunDirection = toSun / sunDistance;
    float sunAngularRadius = dynamicSolarAngularRadius(dynamicSolarSunRadius, sunDistance);
    float visibility = 1.0;

    for (int occluderIndex = 0; occluderIndex < ${maxDynamicSolarOccluders}; occluderIndex++) {
      float activeOccluder = step(float(occluderIndex) + 0.5, dynamicSolarOccluderCount);
      vec4 occluder = dynamicSolarOccluders[occluderIndex];
      vec3 toOccluder = occluder.xyz - worldPosition;
      float occluderDistance = length(toOccluder);
      float liesBetweenPointAndSun =
        step(0.0001, occluderDistance) *
        (1.0 - step(sunDistance, occluderDistance));
      float occluderAngularRadius = dynamicSolarAngularRadius(
        occluder.w,
        occluderDistance
      );
      float centerSeparation = acos(clamp(
        dot(sunDirection, toOccluder / max(0.0001, occluderDistance)),
        -1.0,
        1.0
      ));
      float coverage = dynamicSolarDiscCoverage(
        sunAngularRadius,
        occluderAngularRadius,
        centerSeparation
      );
      visibility *= 1.0 - coverage * activeOccluder * liesBetweenPointAndSun;
    }

    return mix(1.0, clamp(visibility, 0.0, 1.0), dynamicSolarLightingStrength);
  }
`;

function getAngularRadius(radius: number, distanceToCenter: number): number {
  return Math.min(
    angularLimit,
    Math.asin(
      THREE.MathUtils.clamp(radius / Math.max(minimumDistance, distanceToCenter), 0, 0.9999)
    )
  );
}

function computeDiscCoverage(
  sourceRadius: number,
  blockerRadius: number,
  centerSeparation: number
): number {
  if (centerSeparation >= sourceRadius + blockerRadius) {
    return 0;
  }

  if (centerSeparation <= Math.abs(sourceRadius - blockerRadius)) {
    return blockerRadius >= sourceRadius
      ? 1
      : THREE.MathUtils.clamp(
          (blockerRadius * blockerRadius) / Math.max(0.000001, sourceRadius * sourceRadius),
          0,
          1
        );
  }

  const separation = Math.max(minimumDistance, centerSeparation);
  const sourceSquare = sourceRadius * sourceRadius;
  const blockerSquare = blockerRadius * blockerRadius;
  const sourceAngle = Math.acos(
    THREE.MathUtils.clamp(
      (separation * separation + sourceSquare - blockerSquare) /
        Math.max(0.000001, 2 * separation * sourceRadius),
      -1,
      1
    )
  );
  const blockerAngle = Math.acos(
    THREE.MathUtils.clamp(
      (separation * separation + blockerSquare - sourceSquare) /
        Math.max(0.000001, 2 * separation * blockerRadius),
      -1,
      1
    )
  );
  const lensTerm = Math.max(
    0,
    (-separation + sourceRadius + blockerRadius) *
      (separation + sourceRadius - blockerRadius) *
      (separation - sourceRadius + blockerRadius) *
      (separation + sourceRadius + blockerRadius)
  );
  const overlapArea =
    sourceSquare * sourceAngle + blockerSquare * blockerAngle - 0.5 * Math.sqrt(lensTerm);

  return THREE.MathUtils.clamp(overlapArea / Math.max(0.000001, Math.PI * sourceSquare), 0, 1);
}

function toVector3(position: Readonly<{ x: number; y: number; z: number }>): THREE.Vector3 {
  return new THREE.Vector3(position.x, position.y, position.z);
}
