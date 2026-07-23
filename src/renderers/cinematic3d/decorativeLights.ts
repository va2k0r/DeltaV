import type * as THREE from "three";

export const cinematicDecorativePointLightSourceLayer = 31;
export const cinematicDecorativePointLightSourceUserDataKey = "cinematicDecorativePointLightSource";
export const cinematicDecorativePointLightTargetLayerUserDataKey =
  "cinematicDecorativePointLightTargetLayer";

export function markCinematicDecorativePointLightSource(
  light: THREE.PointLight,
  targetLayer = 0
): THREE.PointLight {
  light.userData[cinematicDecorativePointLightSourceUserDataKey] = true;
  light.userData[cinematicDecorativePointLightTargetLayerUserDataKey] = targetLayer;
  light.layers.set(cinematicDecorativePointLightSourceLayer);
  return light;
}
