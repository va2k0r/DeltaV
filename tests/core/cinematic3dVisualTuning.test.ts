import { describe, expect, it } from "vitest";
import {
  computeCinematicOverviewDistance,
  computeReceiverEclipseDiskRadius,
  defaultCinematic3dVisualTuning,
  getExtremeZoomMissileMarkerScreenPixels,
  legacyPhysicalShadowConeVisualTuning,
  mergeCinematic3dTuning
} from "../../src/renderers/cinematic3d";

describe("Cinematic 3D visual tuning", () => {
  it("keeps presentation effects explicit and tunable", () => {
    expect(defaultCinematic3dVisualTuning.sunLightIntensity).toBeGreaterThan(0);
    expect(defaultCinematic3dVisualTuning.ambientLightIntensity).toBeLessThan(0.05);
    expect(defaultCinematic3dVisualTuning.sunBloomIntensity).toBeGreaterThan(0);
    expect(defaultCinematic3dVisualTuning.sunLocalizedBloomStrength).toBe(0);
    expect(defaultCinematic3dVisualTuning.sunSurfaceAnimationSpeed).toBeGreaterThan(0);
    expect(defaultCinematic3dVisualTuning.sunPlasmaContrast).toBeGreaterThan(1.5);
    expect(defaultCinematic3dVisualTuning.sunCoronaOpacity).toBeGreaterThan(0);
    expect(defaultCinematic3dVisualTuning.sunCoronaZoomOutOpacity).toBe(
      defaultCinematic3dVisualTuning.sunCoronaOpacity
    );
    expect(defaultCinematic3dVisualTuning.sunCoronaExtremeZoomOpacity).toBe(
      defaultCinematic3dVisualTuning.sunCoronaOpacity
    );
    expect(defaultCinematic3dVisualTuning.sunCoronaExtremeZoomScaleBoost).toBe(0);
    expect(defaultCinematic3dVisualTuning.sunAnimatedCoronaOpacity).toBeGreaterThan(0.5);
    expect(defaultCinematic3dVisualTuning.sunAnimatedCoronaOpacity).toBeLessThan(0.75);
    expect(defaultCinematic3dVisualTuning.sunFocusMinimumCameraDistanceMultiplier).toBeLessThan(6);
    expect(defaultCinematic3dVisualTuning.sunExtremeZoomBloomBoost).toBe(0);
    expect(defaultCinematic3dVisualTuning.sunFarCameraIntensityMultiplier).toBe(1);
    expect(defaultCinematic3dVisualTuning.sunFarCameraCoronaOpacityMultiplier).toBe(1);
    expect(defaultCinematic3dVisualTuning.sunPlanetDazzleIntensity).toBeGreaterThan(0.5);
    expect(defaultCinematic3dVisualTuning.sunPlanetDazzleIntensity).toBeLessThan(1);
    expect(defaultCinematic3dVisualTuning.sunGlobalBloomIntensity).toBeGreaterThan(0.25);
    expect(defaultCinematic3dVisualTuning.sunGlobalBloomIntensity).toBeLessThan(0.3);
    expect(defaultCinematic3dVisualTuning.sunGlobalBloomRadius).toBeGreaterThan(0);
    expect(defaultCinematic3dVisualTuning.sunGlobalBloomRadius).toBeLessThan(0.1);
    expect(defaultCinematic3dVisualTuning.sunGlobalBloomThreshold).toBeGreaterThan(0.2);
    expect(defaultCinematic3dVisualTuning.sunGlobalBloomThreshold).toBeLessThan(0.35);
    expect(defaultCinematic3dVisualTuning.uiBloomIntensity).toBeLessThan(
      defaultCinematic3dVisualTuning.sunGlobalBloomIntensity
    );
    expect(defaultCinematic3dVisualTuning.uiBloomRadius).toBeLessThan(0.1);
    expect(defaultCinematic3dVisualTuning.uiBloomThreshold).toBeGreaterThan(0.2);
    expect(defaultCinematic3dVisualTuning.uiBloomThreshold).toBeLessThan(0.3);
    expect(defaultCinematic3dVisualTuning.planetBloomSourceGain).toBeGreaterThan(6.5);
    expect(defaultCinematic3dVisualTuning.nodeBloomSourceGain).toBeGreaterThan(1.8);
    expect(defaultCinematic3dVisualTuning.nodeBloomSourceGain).toBeLessThan(2);
    expect(defaultCinematic3dVisualTuning.shipBloomSourceGain).toBeGreaterThan(0.25);
    expect(defaultCinematic3dVisualTuning.shipBloomSourceGain).toBeLessThan(0.4);
    expect(defaultCinematic3dVisualTuning.sunPlanetInnerReflectionMultiplier).toBeGreaterThan(
      defaultCinematic3dVisualTuning.sunPlanetEarthReflectionMultiplier
    );
    expect(defaultCinematic3dVisualTuning.sunPlanetEarthReflectionMultiplier).toBeGreaterThan(
      defaultCinematic3dVisualTuning.sunPlanetOuterGlintMultiplier
    );
    expect(defaultCinematic3dVisualTuning.sunPlanetOuterGlintMultiplier).toBeLessThan(0.25);
    expect(defaultCinematic3dVisualTuning.terminatorContrast).toBeGreaterThan(1);
    expect(defaultCinematic3dVisualTuning.bodyNightSideDarkness).toBeGreaterThan(0.015);
    expect(defaultCinematic3dVisualTuning.bodyNightSideDarkness).toBeLessThan(0.04);
    expect(defaultCinematic3dVisualTuning.bodyDarkSilhouetteRimIntensity).toBeGreaterThan(0.1);
    expect(defaultCinematic3dVisualTuning.bodyDarkSilhouetteRimIntensity).toBeLessThan(0.22);
    expect(defaultCinematic3dVisualTuning.earthNightGridIntensity).toBeGreaterThan(0.5);
    expect(defaultCinematic3dVisualTuning.earthNightGridIntensity).toBeLessThan(
      defaultCinematic3dVisualTuning.shipyardLightIntensity
    );
    expect(defaultCinematic3dVisualTuning.earthNightGridDensity).toBeGreaterThan(0.58);
    expect(defaultCinematic3dVisualTuning.earthNightGridDensity).toBeLessThan(0.8);
    expect(defaultCinematic3dVisualTuning.earthCloudOpacity).toBeGreaterThan(0.75);
    expect(defaultCinematic3dVisualTuning.earthCloudOpacity).toBeLessThan(0.9);
    expect(defaultCinematic3dVisualTuning.earthCloudAltitudeScale).toBeGreaterThan(1);
    expect(defaultCinematic3dVisualTuning.earthCloudAltitudeScale).toBeLessThan(1.04);
    expect(defaultCinematic3dVisualTuning.earthRotationSpeed).toBeGreaterThan(0.04);
    expect(defaultCinematic3dVisualTuning.earthRotationSpeed).toBeLessThan(0.06);
    expect(defaultCinematic3dVisualTuning.earthCloudRotationSpeed).toBeGreaterThan(
      defaultCinematic3dVisualTuning.earthRotationSpeed
    );
    expect(
      defaultCinematic3dVisualTuning.earthCloudRotationSpeed -
        defaultCinematic3dVisualTuning.earthRotationSpeed
    ).toBeGreaterThan(0.008);
    expect(defaultCinematic3dVisualTuning.planetRotationSpeed).toBeGreaterThan(0);
    expect(defaultCinematic3dVisualTuning.planetRotationSpeed).toBeLessThan(
      defaultCinematic3dVisualTuning.earthRotationSpeed
    );
    expect(defaultCinematic3dVisualTuning.moonRotationSpeed).toBeGreaterThan(0.016);
    expect(defaultCinematic3dVisualTuning.moonRotationSpeed).toBeLessThan(
      defaultCinematic3dVisualTuning.planetRotationSpeed
    );
    expect(defaultCinematic3dVisualTuning.orbitRailOpacity).toBeLessThan(0.5);
    expect(defaultCinematic3dVisualTuning.emptyNodeOpacity).toBeGreaterThan(0.3);
    expect(defaultCinematic3dVisualTuning.emptyNodeOpacity).toBeLessThan(
      defaultCinematic3dVisualTuning.playerOccupiedNodeRingOpacity
    );
    expect(defaultCinematic3dVisualTuning.nodeRingMinScreenSize).toBeGreaterThan(0);
    expect(defaultCinematic3dVisualTuning.starCount).toBeGreaterThan(700);
    expect(defaultCinematic3dVisualTuning.starCount).toBeLessThan(830);
    expect(defaultCinematic3dVisualTuning.starBrightness).toBeGreaterThan(0.98);
    expect(defaultCinematic3dVisualTuning.starBrightness).toBeLessThanOrEqual(1);
    expect(defaultCinematic3dVisualTuning.starSizeMin).toBeGreaterThan(5);
    expect(defaultCinematic3dVisualTuning.starSizeMin).toBeLessThan(7);
    expect(defaultCinematic3dVisualTuning.starSizeMax).toBeGreaterThan(
      defaultCinematic3dVisualTuning.starSizeMin
    );
    expect(defaultCinematic3dVisualTuning.starSizeMax).toBeLessThan(9);
    expect(defaultCinematic3dVisualTuning.starFlickerAmount).toBeGreaterThan(0.15);
    expect(defaultCinematic3dVisualTuning.starFlickerAmount).toBeLessThan(0.25);
    expect(defaultCinematic3dVisualTuning.starFlickerSpeed).toBeGreaterThan(1);
    expect(defaultCinematic3dVisualTuning.starFlickerSpeed).toBeLessThan(1.2);
    expect(defaultCinematic3dVisualTuning.starParallaxStrength).toBeGreaterThan(0);
    expect(defaultCinematic3dVisualTuning.starParallaxStrength).toBeLessThan(0.002);
    expect(defaultCinematic3dVisualTuning.starLayerCount).toBe(3);
    expect(defaultCinematic3dVisualTuning.receiverEclipseDarkness).toBeGreaterThan(0.5);
    expect(defaultCinematic3dVisualTuning.receiverEclipseDarkness).toBeLessThan(0.6);
    expect(defaultCinematic3dVisualTuning.receiverEclipseStrength).toBe(1);
    expect(defaultCinematic3dVisualTuning.receiverEclipseFeather).toBeGreaterThan(0.002);
    expect(defaultCinematic3dVisualTuning.receiverEclipseFeather).toBeLessThanOrEqual(0.006);
    expect(defaultCinematic3dVisualTuning.receiverEclipseMinDiskRadius).toBeGreaterThanOrEqual(
      0.06
    );
    expect(defaultCinematic3dVisualTuning.receiverEclipseMinDiskRadius).toBeLessThan(0.1);
    expect(defaultCinematic3dVisualTuning.physicalShadowConeOpacity).toBeGreaterThan(0.3);
    expect(defaultCinematic3dVisualTuning.physicalShadowConeOpacity).toBeLessThan(0.5);
    expect(defaultCinematic3dVisualTuning.physicalShadowConeContrastOpacity).toBeGreaterThan(0.1);
    expect(defaultCinematic3dVisualTuning.physicalShadowConeContrastOpacity).toBeLessThan(
      defaultCinematic3dVisualTuning.physicalShadowConeOpacity
    );
    expect(defaultCinematic3dVisualTuning.physicalShadowConeContrastColor).not.toBe(0x02050b);
    expect(defaultCinematic3dVisualTuning.physicalShadowConeNearRadius).toBeGreaterThan(
      defaultCinematic3dVisualTuning.physicalShadowConeFarRadius
    );
    expect(defaultCinematic3dVisualTuning.physicalShadowConeNearRadius).toBe(
      legacyPhysicalShadowConeVisualTuning.nearRadius
    );
    expect(defaultCinematic3dVisualTuning.physicalShadowConeFarRadius).toBe(
      legacyPhysicalShadowConeVisualTuning.farRadius
    );
    expect(defaultCinematic3dVisualTuning.physicalShadowConeZoomInFarRadius).toBe(
      defaultCinematic3dVisualTuning.physicalShadowConeNearRadius
    );
    expect(defaultCinematic3dVisualTuning.physicalShadowConeZoomInOpacityMultiplier).toBeLessThan(
      1
    );
    expect(
      defaultCinematic3dVisualTuning.physicalShadowConeZoomInContrastOpacityMultiplier
    ).toBeLessThan(1);
    expect(defaultCinematic3dVisualTuning.physicalShadowConeZoomInCoreTailFadeStart).toBeLessThan(
      legacyPhysicalShadowConeVisualTuning.coreTailFadeStart
    );
    expect(defaultCinematic3dVisualTuning.physicalShadowConeZoomInTailFadeEnd).toBeLessThan(
      legacyPhysicalShadowConeVisualTuning.tailFadeEnd
    );
    expect(defaultCinematic3dVisualTuning.nodeRingHoverIntensity).toBeGreaterThan(0);
    expect(defaultCinematic3dVisualTuning.nodeRingOccludedOpacity).toBeLessThan(0.5);
    expect(defaultCinematic3dVisualTuning.tacticalUiScale).toBeGreaterThan(0);
    expect(defaultCinematic3dVisualTuning.zoomOutUiBoost).toBeGreaterThan(1);
    expect(defaultCinematic3dVisualTuning.zoomInUiBoost).toBeLessThan(
      defaultCinematic3dVisualTuning.zoomOutUiBoost
    );
    expect(defaultCinematic3dVisualTuning.nodeRingMinPx).toBeGreaterThan(0);
    expect(defaultCinematic3dVisualTuning.nodeRingMaxPx).toBeGreaterThan(
      defaultCinematic3dVisualTuning.nodeRingMinPx
    );
    expect(defaultCinematic3dVisualTuning.occupiedNodeRingMinPx).toBeGreaterThan(
      defaultCinematic3dVisualTuning.nodeRingMinPx
    );
    expect(defaultCinematic3dVisualTuning.occupiedNodeRingMaxPx).toBeGreaterThan(
      defaultCinematic3dVisualTuning.occupiedNodeRingMinPx
    );
    expect(defaultCinematic3dVisualTuning.shipDotMinPx).toBeGreaterThan(5);
    expect(defaultCinematic3dVisualTuning.shipDotGlowMinPx).toBeGreaterThan(
      defaultCinematic3dVisualTuning.shipDotMinPx
    );
    expect(defaultCinematic3dVisualTuning.shipDotGlowStrength).toBeGreaterThan(0);
    expect(defaultCinematic3dVisualTuning.shipDotGlowStrength).toBeLessThan(0.3);
    expect(defaultCinematic3dVisualTuning.productiveMarkerMinPx).toBeGreaterThan(3);
    expect(defaultCinematic3dVisualTuning.productiveMarkerMinPx).toBeLessThan(
      defaultCinematic3dVisualTuning.shipDotMinPx
    );
    expect(defaultCinematic3dVisualTuning.tritiumPipScale).toBeGreaterThan(1.2);
    expect(defaultCinematic3dVisualTuning.tritiumPipScale).toBeLessThan(1.35);
    expect(defaultCinematic3dVisualTuning.tritiumPipZoomOutScale).toBeGreaterThan(
      defaultCinematic3dVisualTuning.tritiumPipZoomInScale
    );
    expect(defaultCinematic3dVisualTuning.tritiumPipZoomOutScale).toBeGreaterThan(2.4);
    expect(defaultCinematic3dVisualTuning.tritiumPipZoomInScale).toBeLessThan(1.2);
    const tritiumPipZoomOutPixels =
      defaultCinematic3dVisualTuning.productiveMarkerMinPx *
      defaultCinematic3dVisualTuning.tritiumPipScale *
      defaultCinematic3dVisualTuning.tritiumPipZoomOutScale;
    const tritiumPipZoomInPixels =
      defaultCinematic3dVisualTuning.productiveMarkerMinPx *
      defaultCinematic3dVisualTuning.tritiumPipScale *
      defaultCinematic3dVisualTuning.tritiumPipZoomInScale;
    expect(defaultCinematic3dVisualTuning.shipyardCollapsedGridMaxPx).toBeGreaterThan(
      tritiumPipZoomOutPixels
    );
    expect(defaultCinematic3dVisualTuning.shipyardCollapsedGridMaxPx).toBeLessThan(
      tritiumPipZoomOutPixels * 1.25
    );
    expect(tritiumPipZoomOutPixels).toBeLessThan(
      defaultCinematic3dVisualTuning.shipDotGlowMinPx * 1.35
    );
    expect(tritiumPipZoomInPixels).toBeLessThan(tritiumPipZoomOutPixels * 0.55);
    expect(defaultCinematic3dVisualTuning.tritiumExtractionSurfaceGlowIntensity).toBe(0);
    expect(
      defaultCinematic3dVisualTuning.tritiumExtractionSurfaceGlowRadiusMultiplier
    ).toBeGreaterThan(1);
    expect(
      defaultCinematic3dVisualTuning.tritiumExtractionSurfaceGlowRadiusMultiplier
    ).toBeLessThan(1.6);
    expect(defaultCinematic3dVisualTuning.productiveMarkerZoomOutFlashFadeInMs).toBeGreaterThan(
      240
    );
    expect(defaultCinematic3dVisualTuning.productiveMarkerZoomOutFlashFadeInMs).toBeLessThan(420);
    expect(defaultCinematic3dVisualTuning.productiveMarkerZoomOutFlashHoldMs).toBeGreaterThan(4200);
    expect(defaultCinematic3dVisualTuning.productiveMarkerZoomOutFlashFadeOutMs).toBeGreaterThan(
      1200
    );
    expect(defaultCinematic3dVisualTuning.productiveMarkerZoomOutFlashOpacityBoost).toBeGreaterThan(
      2.6
    );
    expect(defaultCinematic3dVisualTuning.productiveMarkerZoomOutFlashScaleBoost).toBeGreaterThan(
      0.6
    );
    expect(defaultCinematic3dVisualTuning.productiveMarkerZoomOutFlashScaleBoost).toBeLessThan(
      0.75
    );
    expect(defaultCinematic3dVisualTuning.nodeUnoccupiedColor).not.toBe(
      defaultCinematic3dVisualTuning.playerFactionColor
    );
    expect(defaultCinematic3dVisualTuning.enemyFactionColor).not.toBe(
      defaultCinematic3dVisualTuning.playerFactionColor
    );
    expect(defaultCinematic3dVisualTuning.enemyFactionColor).not.toBe(
      defaultCinematic3dVisualTuning.fireMarkerColor
    );
    expect(defaultCinematic3dVisualTuning.playerOccupiedNodeRingOpacity).toBeGreaterThan(
      defaultCinematic3dVisualTuning.nodeRingOpacity
    );
    expect(defaultCinematic3dVisualTuning.nodeUnoccupiedBandOpacity).toBeGreaterThan(0);
    expect(defaultCinematic3dVisualTuning.nodeUnoccupiedBandOpacity).toBeLessThan(
      defaultCinematic3dVisualTuning.playerOccupiedNodeBandOpacity
    );
    expect(defaultCinematic3dVisualTuning.playerOccupiedNodeBandWidthRatio).toBeGreaterThan(0);
    expect(defaultCinematic3dVisualTuning.selectedNodeFinOpacity).toBeGreaterThan(0.75);
    expect(defaultCinematic3dVisualTuning.shipOrbitAngularSpeed).toBeLessThan(0.3);
    expect(defaultCinematic3dVisualTuning.shipModelScreenPixels).toBeGreaterThan(10);
    expect(defaultCinematic3dVisualTuning.shipModelScreenPixels).toBeLessThan(15);
    expect(defaultCinematic3dVisualTuning.shipModelCollapseDistance).toBeGreaterThan(850);
    expect(defaultCinematic3dVisualTuning.shipModelCollapseDistance).toBeLessThan(950);
    expect(defaultCinematic3dVisualTuning.orbitObjectZoomOutReadabilityBoost).toBeGreaterThan(
      defaultCinematic3dVisualTuning.orbitObjectZoomInReadabilityBoost
    );
    expect(defaultCinematic3dVisualTuning.orbitObjectZoomOutReadabilityBoost).toBeLessThan(1.4);
    expect(defaultCinematic3dVisualTuning.orbitObjectZoomInReadabilityBoost).toBeGreaterThan(1);
    expect(defaultCinematic3dVisualTuning.orbitObjectFormationSpacingScreenPixels).toBeGreaterThan(
      defaultCinematic3dVisualTuning.shipModelScreenPixels * 3
    );
    expect(defaultCinematic3dVisualTuning.orbitObjectFormationSpacingScreenPixels).toBeLessThan(52);
    expect(defaultCinematic3dVisualTuning.orbitObjectLargeBodyScreenRadiusStartPx).toBeLessThan(
      defaultCinematic3dVisualTuning.orbitObjectLargeBodyScreenRadiusEndPx
    );
    expect(defaultCinematic3dVisualTuning.orbitObjectLargeBodyScreenRadiusStartPx).toBeGreaterThan(
      100
    );
    expect(defaultCinematic3dVisualTuning.orbitObjectLargeBodyScreenRadiusEndPx).toBeLessThan(500);
    expect(defaultCinematic3dVisualTuning.orbitObjectLargeBodyReadabilityBoost).toBeGreaterThan(2);
    expect(defaultCinematic3dVisualTuning.orbitObjectLargeBodyReadabilityBoost).toBeLessThan(2.6);
    expect(defaultCinematic3dVisualTuning.shipDotScreenPixels).toBeGreaterThan(6);
    expect(defaultCinematic3dVisualTuning.shipDotScreenPixels).toBeLessThan(10);
    expect(defaultCinematic3dVisualTuning.shipLightBlinkFloor).toBeGreaterThan(0.1);
    expect(defaultCinematic3dVisualTuning.shipLightBlinkFloor).toBeLessThan(0.25);
    expect(defaultCinematic3dVisualTuning.shipLightBlinkBeatBoost).toBeGreaterThan(0.7);
    expect(defaultCinematic3dVisualTuning.shipLightBlinkBeatBoost).toBeLessThan(1);
    expect(defaultCinematic3dVisualTuning.shipOrbitEngineGlowFloor).toBeGreaterThan(0.25);
    expect(defaultCinematic3dVisualTuning.shipOrbitEngineGlowFloor).toBeLessThan(0.5);
    expect(defaultCinematic3dVisualTuning.shipOrbitEngineGlowBeatBoost).toBeGreaterThan(0.2);
    expect(defaultCinematic3dVisualTuning.shipOrbitEngineGlowBeatBoost).toBeLessThan(0.4);
    expect(defaultCinematic3dVisualTuning.shipOrbitEngineGlowScaleBoost).toBeGreaterThan(0.06);
    expect(defaultCinematic3dVisualTuning.shipOrbitEngineGlowScaleBoost).toBeLessThan(0.18);
    expect(defaultCinematic3dVisualTuning.shipDriveWakeLength).toBeGreaterThan(30);
    expect(defaultCinematic3dVisualTuning.shipDriveWakeLength).toBeLessThan(50);
    expect(defaultCinematic3dVisualTuning.shipDriveWakeRadius).toBeGreaterThan(0.12);
    expect(defaultCinematic3dVisualTuning.shipDriveWakeRadius).toBeLessThan(0.15);
    expect(defaultCinematic3dVisualTuning.shipDriveWakeOpacity).toBeGreaterThan(0.08);
    expect(defaultCinematic3dVisualTuning.shipDriveWakeOpacity).toBeLessThan(0.3);
    expect(defaultCinematic3dVisualTuning.shipDriveWakeFilamentOpacity).toBeGreaterThan(
      defaultCinematic3dVisualTuning.shipDriveWakeOpacity
    );
    expect(defaultCinematic3dVisualTuning.shipDriveWakeFilamentOpacity).toBeLessThan(0.6);
    expect(defaultCinematic3dVisualTuning.shipDriveWakeZoomInTailFadeStart).toBeLessThan(0.15);
    expect(defaultCinematic3dVisualTuning.shipDriveWakeZoomInTailFadeEnd).toBeGreaterThan(
      defaultCinematic3dVisualTuning.shipDriveWakeZoomInTailFadeStart
    );
    expect(defaultCinematic3dVisualTuning.shipDriveWakeZoomInTailFadeEnd).toBeLessThan(0.75);
    expect(defaultCinematic3dVisualTuning.shipDriveWakeFlowStrength).toBeGreaterThan(0.1);
    expect(defaultCinematic3dVisualTuning.shipDriveWakeFlowSpeed).toBeGreaterThan(1);
    expect(defaultCinematic3dVisualTuning.shipDriveWakeCameraDazzleIntensity).toBeGreaterThan(0.7);
    expect(defaultCinematic3dVisualTuning.shipDriveWakeCameraDazzleExposure).toBeGreaterThan(1);
    expect(defaultCinematic3dVisualTuning.shipDriveWakeCameraDazzleBloomStrength).toBeGreaterThan(
      1
    );
    expect(defaultCinematic3dVisualTuning.shipDriveWakeCameraDazzleZoomStart).toBeGreaterThan(1);
    expect(defaultCinematic3dVisualTuning.shipDriveWakeCameraDazzleZoomEnd).toBeGreaterThan(
      defaultCinematic3dVisualTuning.shipDriveWakeCameraDazzleZoomStart
    );
    expect(defaultCinematic3dVisualTuning.shipDriveWakeCameraDazzleScreenLengthEnd).toBeGreaterThan(
      defaultCinematic3dVisualTuning.shipDriveWakeCameraDazzleScreenLengthStart
    );
    expect(defaultCinematic3dVisualTuning.shipDriveWakeCameraDazzleProximityEnd).toBeGreaterThan(
      defaultCinematic3dVisualTuning.shipDriveWakeCameraDazzleProximityStart
    );
    expect(
      defaultCinematic3dVisualTuning.constructionCargoMinScreenSeparationPixels
    ).toBeGreaterThan(defaultCinematic3dVisualTuning.shipDotScreenPixels * 2);
    expect(
      defaultCinematic3dVisualTuning.constructionCargoMinScreenSeparationPixels
    ).toBeGreaterThan(60);
    expect(defaultCinematic3dVisualTuning.constructionCargoMaxAngularSpacing).toBeGreaterThan(0.3);
    expect(defaultCinematic3dVisualTuning.constructionCargoZoomOutReadabilityBoost).toBeGreaterThan(
      1
    );
    expect(defaultCinematic3dVisualTuning.constructionCargoZoomOutReadabilityBoost).toBeLessThan(
      1.8
    );
    expect(defaultCinematic3dVisualTuning.constructionCargoZoomedInScreenPixels).toBeGreaterThan(
      defaultCinematic3dVisualTuning.constructionCargoZoomedOutScreenPixels
    );
    expect(defaultCinematic3dVisualTuning.constructionCargoZoomedOutScreenPixels).toBeGreaterThan(
      18
    );
    expect(defaultCinematic3dVisualTuning.constructionCargoZoomedOutScreenPixels).toBeLessThan(20);
    expect(defaultCinematic3dVisualTuning.constructionCargoZoomedInScreenPixels).toBeGreaterThan(
      24
    );
    expect(defaultCinematic3dVisualTuning.constructionCargoZoomedInScreenPixels).toBeLessThan(27);
    expect(defaultCinematic3dVisualTuning.constructionCargoZoomInBeaconOpacity).toBeGreaterThan(
      0.8
    );
    expect(defaultCinematic3dVisualTuning.shipProductionGlowScreenPixels).toBeGreaterThan(18);
    expect(defaultCinematic3dVisualTuning.shipProductionGlowScreenPixels).toBeLessThan(26);
    expect(defaultCinematic3dVisualTuning.shipProductionGlowIntensity).toBeGreaterThan(0.4);
    expect(defaultCinematic3dVisualTuning.shipProductionGlowIntensity).toBeLessThan(
      defaultCinematic3dVisualTuning.missileImpactBodyFlashIntensity * 0.08
    );
    expect(defaultCinematic3dVisualTuning.shipProductionGlowRadius).toBeGreaterThan(120);
    expect(defaultCinematic3dVisualTuning.shipProductionGlowRadius).toBeLessThan(
      defaultCinematic3dVisualTuning.missileImpactBodyFlashRadius * 0.25
    );
    expect(defaultCinematic3dVisualTuning.burnPreviewThicknessMultiplier).toBeGreaterThan(1);
    expect(defaultCinematic3dVisualTuning.burnPreviewEffectOpacity).toBeGreaterThan(0.8);
    expect(defaultCinematic3dVisualTuning.burnPreviewEffectParticleCount).toBeGreaterThan(24);
    expect(defaultCinematic3dVisualTuning.burnPreviewEffectParticleSizePixels).toBeGreaterThan(5);
    expect(defaultCinematic3dVisualTuning.burnPreviewEffectApertureSizePixels).toBeGreaterThan(30);
    expect(defaultCinematic3dVisualTuning.burnPreviewEffectFlowSpeed).toBeGreaterThan(0);
    expect(defaultCinematic3dVisualTuning.fireMarkerColor).toBeGreaterThan(0);
    expect(defaultCinematic3dVisualTuning.fireTargetDimOpacity).toBeLessThan(0.5);
    expect(defaultCinematic3dVisualTuning.firePreviewOpacity).toBeGreaterThan(0.5);
    expect(defaultCinematic3dVisualTuning.firePreviewEffectOpacity).toBeGreaterThan(0.8);
    expect(defaultCinematic3dVisualTuning.firePreviewEffectParticleCount).toBeGreaterThan(30);
    expect(defaultCinematic3dVisualTuning.firePreviewEffectParticleSizePixels).toBeGreaterThan(
      defaultCinematic3dVisualTuning.burnPreviewEffectParticleSizePixels
    );
    expect(defaultCinematic3dVisualTuning.firePreviewEffectReticleSizePixels).toBeGreaterThan(44);
    expect(defaultCinematic3dVisualTuning.firePreviewEffectReticleSizePixels).toBeLessThan(50);
    expect(defaultCinematic3dVisualTuning.firePreviewEffectFlowSpeed).toBeGreaterThan(
      defaultCinematic3dVisualTuning.burnPreviewEffectFlowSpeed
    );
    expect(defaultCinematic3dVisualTuning.confirmedOrderEffectOpacityMultiplier).toBeGreaterThan(
      0.4
    );
    expect(defaultCinematic3dVisualTuning.confirmedOrderEffectOpacityMultiplier).toBeLessThan(0.7);
    expect(defaultCinematic3dVisualTuning.confirmedOrderEffectParticleMultiplier).toBeLessThan(0.7);
    expect(defaultCinematic3dVisualTuning.confirmedOrderEffectSizeMultiplier).toBeLessThan(1);
    expect(defaultCinematic3dVisualTuning.fireConfirmedSolutionRevealDurationSeconds).toBeLessThan(
      1
    );
    expect(defaultCinematic3dVisualTuning.fireConfirmedSolutionFadeDurationSeconds).toBeGreaterThan(
      0.1
    );
    expect(defaultCinematic3dVisualTuning.fireConfirmedSolutionFadeDurationSeconds).toBeLessThan(
      0.3
    );
    expect(defaultCinematic3dVisualTuning.fireConfirmedSolutionAimAcquireProgress).toBeGreaterThan(
      0.5
    );
    expect(defaultCinematic3dVisualTuning.fireConfirmedSolutionAimAcquireProgress).toBeLessThan(
      0.7
    );
    expect(defaultCinematic3dVisualTuning.pendingFireOpacity).toBeGreaterThan(0.5);
    expect(defaultCinematic3dVisualTuning.extremeZoomUiFadeStartDetail).toBeGreaterThan(0.6);
    expect(defaultCinematic3dVisualTuning.extremeZoomUiFadeStartDetail).toBeLessThan(
      defaultCinematic3dVisualTuning.extremeZoomUiFadeEndDetail
    );
    expect(defaultCinematic3dVisualTuning.extremeZoomUiFadeEndDetail).toBeLessThanOrEqual(1);
    expect(defaultCinematic3dVisualTuning.extremeZoomUiFadeMinOpacity).toBeGreaterThan(0.25);
    expect(defaultCinematic3dVisualTuning.extremeZoomUiFadeMinOpacity).toBeLessThan(0.5);
    expect(defaultCinematic3dVisualTuning.extremeZoomNodeFadeStartDetail).toBeLessThan(
      defaultCinematic3dVisualTuning.extremeZoomUiFadeStartDetail
    );
    expect(defaultCinematic3dVisualTuning.extremeZoomNodeFadeStartDetail).toBeLessThan(
      defaultCinematic3dVisualTuning.extremeZoomNodeFadeEndDetail
    );
    expect(defaultCinematic3dVisualTuning.extremeZoomNodeFadeEndDetail).toBeGreaterThanOrEqual(
      defaultCinematic3dVisualTuning.extremeZoomUiFadeEndDetail
    );
    expect(defaultCinematic3dVisualTuning.extremeZoomNodeFadeMinOpacity).toBe(1);
    expect(defaultCinematic3dVisualTuning.extremeZoomEdgeOnNodeFadeStartDetail).toBeGreaterThan(
      defaultCinematic3dVisualTuning.extremeZoomNodeFadeStartDetail
    );
    expect(defaultCinematic3dVisualTuning.extremeZoomEdgeOnNodeFadeStartDetail).toBeLessThan(
      defaultCinematic3dVisualTuning.extremeZoomEdgeOnNodeFadeEndDetail
    );
    expect(defaultCinematic3dVisualTuning.extremeZoomEdgeOnNodeFadeEndDetail).toBeLessThanOrEqual(
      1
    );
    expect(defaultCinematic3dVisualTuning.extremeZoomEdgeOnNodeFadeMinOpacity).toBe(1);
    expect(defaultCinematic3dVisualTuning.activeMissileOpacity).toBeGreaterThan(0.8);
    expect(defaultCinematic3dVisualTuning.missileMarkerScreenPixels).toBeGreaterThan(8);
    expect(defaultCinematic3dVisualTuning.missileMarkerScreenPixels).toBeLessThan(9.5);
    expect(defaultCinematic3dVisualTuning.missileMarkerExtremeZoomMinScreenPixels).toBeGreaterThan(
      1
    );
    expect(defaultCinematic3dVisualTuning.missileMarkerExtremeZoomMinScreenPixels).toBeLessThan(
      defaultCinematic3dVisualTuning.missileMarkerScreenPixels * 0.78
    );
    expect(defaultCinematic3dVisualTuning.missileMarkerZoomedInScreenPixels).toBeGreaterThan(16);
    expect(defaultCinematic3dVisualTuning.missileMarkerZoomedInScreenPixels).toBeLessThan(18);
    expect(defaultCinematic3dVisualTuning.missileImpactBodyFlashIntensity).toBeGreaterThan(10);
    expect(defaultCinematic3dVisualTuning.missileImpactBodyFlashAfterglowIntensity).toBeLessThan(
      defaultCinematic3dVisualTuning.missileImpactBodyFlashIntensity
    );
    expect(defaultCinematic3dVisualTuning.missileImpactBodyFlashAfterglowIntensity).toBe(0);
    expect(defaultCinematic3dVisualTuning.missileImpactBodyFlashRadius).toBeGreaterThan(150);
    expect(defaultCinematic3dVisualTuning.missileImpactBodyFlashRadius).toBeGreaterThan(800);
    expect(defaultCinematic3dVisualTuning.missileImpactBodyFlashDurationSeconds).toBeLessThan(0.5);
    expect(defaultCinematic3dVisualTuning.missileImpactBodyFlashColor).toBeGreaterThan(0);
    expect(defaultCinematic3dVisualTuning.labelMinScale).toBeGreaterThan(1);
    expect(defaultCinematic3dVisualTuning.labelMaxScale).toBeGreaterThan(1.25);
    expect(defaultCinematic3dVisualTuning.labelBackgroundOpacity).toBeLessThan(0.75);
    expect(defaultCinematic3dVisualTuning.toneMappingExposure).toBeGreaterThan(0);
    expect(defaultCinematic3dVisualTuning.solarDustEnabled).toBe(true);
    expect(defaultCinematic3dVisualTuning.solarDustOpacity).toBeGreaterThan(0);
    expect(defaultCinematic3dVisualTuning.solarDustOpacity).toBeLessThan(0.07);
    expect(defaultCinematic3dVisualTuning.solarOcclusionEnabled).toBe(true);
    expect(defaultCinematic3dVisualTuning.solarOcclusionOpacity).toBeGreaterThan(0.9);
    expect(defaultCinematic3dVisualTuning.solarOcclusionOpacity).toBeLessThanOrEqual(1);
    expect(defaultCinematic3dVisualTuning.solarOcclusionCoronaIntensity).toBeGreaterThan(0);
    expect(defaultCinematic3dVisualTuning.solarOcclusionLimbGlintIntensity).toBeGreaterThan(0.5);
    expect(defaultCinematic3dVisualTuning.solarOcclusionLimbGlintIntensity).toBeLessThan(0.8);
    expect(defaultCinematic3dVisualTuning.solarOcclusionExposureCompression).toBeGreaterThan(0);
    expect(defaultCinematic3dVisualTuning.solarOcclusionExposureCompression).toBeLessThan(0.3);
    expect(defaultCinematic3dVisualTuning.solarOcclusionReemergenceIntensity).toBeLessThan(0.4);
    expect(defaultCinematic3dVisualTuning.solarOcclusionReemergenceDurationSeconds).toBeLessThan(1);
    expect(defaultCinematic3dVisualTuning.solarOcclusionReemergenceArmCoverage).toBeGreaterThan(
      defaultCinematic3dVisualTuning.solarOcclusionReemergenceReleaseCoverage
    );
    expect(defaultCinematic3dVisualTuning.solarOcclusionReemergenceReleaseCoverage).toBeGreaterThan(
      0.6
    );
    expect(defaultCinematic3dVisualTuning.atmosphericScatteringIntensity).toBeGreaterThan(0.5);
    expect(defaultCinematic3dVisualTuning.atmosphericScatteringScale).toBeGreaterThan(1);
    expect(defaultCinematic3dVisualTuning.atmosphericScatteringScale).toBeLessThan(1.08);
    expect(defaultCinematic3dVisualTuning.atmosphericScatteringFalloff).toBeGreaterThan(2);
    expect(defaultCinematic3dVisualTuning.atmosphericScatteringTerminatorBoost).toBeGreaterThan(0);
    expect(defaultCinematic3dVisualTuning.turnAnimationDurationMs).toBeGreaterThan(0);
    expect(defaultCinematic3dVisualTuning.turnAnimationEase).toBe("smootherstep");
    expect(defaultCinematic3dVisualTuning.shipyardGridCollapseDetailStart).toBeGreaterThan(
      defaultCinematic3dVisualTuning.shipyardGridCollapseDetailEnd
    );
    expect(defaultCinematic3dVisualTuning.shipyardLightRhythmBpm).toBeGreaterThan(4);
    expect(defaultCinematic3dVisualTuning.shipyardLightRhythmBpm).toBeLessThan(8);
    expect(defaultCinematic3dVisualTuning.shipyardLightFlicker).toBeLessThan(0.06);
    expect(defaultCinematic3dVisualTuning.shipyardLightWorkerPulseBoost).toBeGreaterThan(0);
    expect(defaultCinematic3dVisualTuning.shipyardLightWorkerPulseBoost).toBeLessThan(0.75);
    expect(defaultCinematic3dVisualTuning.shipyardLightSideOpacityFloor).toBeGreaterThan(0.1);
    expect(defaultCinematic3dVisualTuning.shipyardLightSideOpacityFloor).toBeLessThan(0.2);
    expect(defaultCinematic3dVisualTuning.shipyardSurfaceCoverageRadius).toBeGreaterThan(0.85);
    expect(defaultCinematic3dVisualTuning.shipyardSurfaceCoverageRadius).toBeLessThan(0.98);
    expect(defaultCinematic3dVisualTuning.shipyardCollapsedGridMinPx).toBeGreaterThan(8);
    expect(defaultCinematic3dVisualTuning.shipyardCollapsedGridMinPx).toBeLessThan(10);
    expect(defaultCinematic3dVisualTuning.shipyardCollapsedGridMaxPx).toBeGreaterThan(
      defaultCinematic3dVisualTuning.shipyardCollapsedGridMinPx
    );
    expect(defaultCinematic3dVisualTuning.shipyardCollapsedGridMaxPx).toBeGreaterThan(12);
    expect(defaultCinematic3dVisualTuning.shipyardCollapsedGridMaxPx).toBeLessThan(14);
    expect(defaultCinematic3dVisualTuning.panMinVisibleSystemFraction).toBeGreaterThan(0.5);
    expect(defaultCinematic3dVisualTuning.panMinVisibleSystemFraction).toBeLessThanOrEqual(1);
    expect(defaultCinematic3dVisualTuning.heliocentricScaleBase).toBeGreaterThan(1);
    expect(defaultCinematic3dVisualTuning.heliocentricScaleZoomOutCompression).toBeLessThan(1);
    expect(defaultCinematic3dVisualTuning.heliocentricScaleZoomMultiplier).toBeGreaterThan(3);
    expect(defaultCinematic3dVisualTuning.heliocentricScaleZoomMultiplier).toBeLessThan(4);
    expect(defaultCinematic3dVisualTuning.heliocentricScaleFocusMultiplier).toBeGreaterThan(1.5);
    expect(defaultCinematic3dVisualTuning.heliocentricScaleFocusMultiplier).toBeLessThan(1.8);
    expect(defaultCinematic3dVisualTuning.localMoonScaleMax).toBeLessThan(
      defaultCinematic3dVisualTuning.heliocentricScaleBase
    );
    expect(defaultCinematic3dVisualTuning.moonDisplayRadiusMultiplier).toBeLessThan(
      defaultCinematic3dVisualTuning.planetDisplayRadiusMultiplier * 0.5
    );
    expect(defaultCinematic3dVisualTuning.planetDisplayRadiusMin).toBeGreaterThan(0);
    expect(defaultCinematic3dVisualTuning.moonDisplayRadiusMin).toBeGreaterThan(3);
    expect(defaultCinematic3dVisualTuning.planetDisplayRadiusMin).toBeGreaterThan(
      defaultCinematic3dVisualTuning.moonDisplayRadiusMin * 5
    );
    expect(defaultCinematic3dVisualTuning.bodyRadiusZoomOutExponent).toBeLessThan(1);
    expect(defaultCinematic3dVisualTuning.bodyRadiusZoomInExponent).toBeGreaterThan(1);
    expect(defaultCinematic3dVisualTuning.planetNodeRingScaleMultiplier).toBeGreaterThan(1);
    expect(defaultCinematic3dVisualTuning.planetNodeScale).toBeGreaterThan(
      defaultCinematic3dVisualTuning.moonNodeScale
    );
    expect(defaultCinematic3dVisualTuning.planetNodeScale).toBeLessThanOrEqual(1.4);
    expect(defaultCinematic3dVisualTuning.moonNodeRingMinRadius).toBeGreaterThan(0);
    expect(defaultCinematic3dVisualTuning.moonNodeRingZoomInMinRadius).toBeLessThan(
      defaultCinematic3dVisualTuning.moonNodeRingMinRadius
    );
    expect(defaultCinematic3dVisualTuning.planetNodeRingZoomInMinRadius).toBeLessThan(
      defaultCinematic3dVisualTuning.planetNodeRingMinRadius
    );
    expect(defaultCinematic3dVisualTuning.moonNodeScale).toBeGreaterThan(1);
    expect(defaultCinematic3dVisualTuning.moonNodeScale).toBeLessThan(1.15);
    expect(defaultCinematic3dVisualTuning.moonNodeRingMinScreenScale).toBeGreaterThan(
      defaultCinematic3dVisualTuning.nodeRingMinScreenScale
    );
    expect(defaultCinematic3dVisualTuning.moonNodeRingScaleMultiplier).toBeGreaterThan(1);
    expect(defaultCinematic3dVisualTuning.nodeRingMinGap).toBeGreaterThan(0);
    expect(defaultCinematic3dVisualTuning.parentMoonNodeRingMinGap).toBeGreaterThan(
      defaultCinematic3dVisualTuning.nodeRingMinGap
    );
    expect(defaultCinematic3dVisualTuning.panCloseSlowdownDistance).toBeGreaterThan(0);
    expect(defaultCinematic3dVisualTuning.panCloseSlowdownMinimumMultiplier).toBeGreaterThan(0);
    expect(defaultCinematic3dVisualTuning.panCloseSlowdownMinimumMultiplier).toBeLessThan(1);
    expect(defaultCinematic3dVisualTuning.panMinWorldUnitsPerPixel).toBeGreaterThan(0);
    expect(defaultCinematic3dVisualTuning.panMaxWorldUnitsPerPixel).toBeGreaterThan(
      defaultCinematic3dVisualTuning.panMinWorldUnitsPerPixel
    );
    expect(defaultCinematic3dVisualTuning.futureShipDisplayScale).toBeGreaterThan(0);
    expect(defaultCinematic3dVisualTuning.focusPanDurationMs).toBeGreaterThan(0);
    expect(defaultCinematic3dVisualTuning.focusPanDurationMs).toBeLessThan(
      defaultCinematic3dVisualTuning.turnAnimationDurationMs
    );
  });

  it("scales extreme-zoom missile dots by remaining travel time without losing T-7", () => {
    const t1 = getExtremeZoomMissileMarkerScreenPixels(defaultCinematic3dVisualTuning, 1);
    const t2 = getExtremeZoomMissileMarkerScreenPixels(defaultCinematic3dVisualTuning, 2);
    const t7 = getExtremeZoomMissileMarkerScreenPixels(defaultCinematic3dVisualTuning, 7);

    expect(t1).toBe(defaultCinematic3dVisualTuning.missileMarkerScreenPixels * 0.78);
    expect(t2).toBeLessThan(t1);
    expect(t7).toBe(defaultCinematic3dVisualTuning.missileMarkerExtremeZoomMinScreenPixels);
    expect(t7).toBeGreaterThan(1);
  });

  it("keeps every numeric visual tuning value finite", () => {
    for (const value of Object.values(defaultCinematic3dVisualTuning)) {
      if (typeof value === "number") {
        expect(Number.isFinite(value)).toBe(true);
      }
    }
  });

  it("merges overrides without changing unspecified defaults", () => {
    const merged = mergeCinematic3dTuning({
      starCount: 12,
      sunCoronaOpacity: 0.1
    });

    expect(merged.starCount).toBe(12);
    expect(merged.sunCoronaOpacity).toBe(0.1);
    expect(merged.orbitRailOpacity).toBe(defaultCinematic3dVisualTuning.orbitRailOpacity);
  });

  it("computes a finite zoom-out ceiling from active system bounds and aspect", () => {
    const bounds = {
      minX: -900,
      minY: -700,
      maxX: 900,
      maxY: 700
    };
    const wide = computeCinematicOverviewDistance(bounds, 16 / 9);
    const narrow = computeCinematicOverviewDistance(bounds, 9 / 16);

    expect(wide).toBeGreaterThan(0);
    expect(wide).toBeLessThan(2600);
    expect(narrow).toBeGreaterThan(wide);
    expect(narrow).toBeLessThan(5600);
  });

  it("scales projected eclipses to cover smaller moons inside larger planetary shadows", () => {
    const fullMoonDiskRadius = computeReceiverEclipseDiskRadius({
      edgeFeather: defaultCinematic3dVisualTuning.receiverEclipseFeather,
      minDiskRadius: defaultCinematic3dVisualTuning.receiverEclipseMinDiskRadius,
      receiverRadius: 1,
      shadowAxisOffset: 0.08,
      shadowRadius: 5
    });
    const partialCenteredDiskRadius = computeReceiverEclipseDiskRadius({
      edgeFeather: defaultCinematic3dVisualTuning.receiverEclipseFeather,
      minDiskRadius: defaultCinematic3dVisualTuning.receiverEclipseMinDiskRadius,
      receiverRadius: 1,
      shadowAxisOffset: 0,
      shadowRadius: 0.5
    });
    const grazingDiskRadius = computeReceiverEclipseDiskRadius({
      edgeFeather: defaultCinematic3dVisualTuning.receiverEclipseFeather,
      minDiskRadius: defaultCinematic3dVisualTuning.receiverEclipseMinDiskRadius,
      receiverRadius: 1,
      shadowAxisOffset: 10.9,
      shadowRadius: 10
    });

    expect(fullMoonDiskRadius).toBeGreaterThan(Math.SQRT2);
    expect(partialCenteredDiskRadius).toBeGreaterThan(0.5);
    expect(partialCenteredDiskRadius).toBeLessThan(0.54);
    expect(grazingDiskRadius).toBeGreaterThan(0.3);
    expect(grazingDiskRadius).toBeLessThan(0.6);
  });
});
