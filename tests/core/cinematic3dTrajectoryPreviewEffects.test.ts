import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  animateConfirmedTrajectoryEffect,
  animateTrajectoryPreviewEffect,
  computeConfirmedFireArcPhase,
  computeConfirmedSolutionRevealProgress,
  computeSquareReticleClearancePixels,
  createBurnPreviewEffect,
  createFirePreviewEffect,
  firePreviewReticleAttachmentRatio
} from "../../src/renderers/cinematic3d/trajectoryPreviewEffects";

const previewPoints = [
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(30, 8, 18),
  new THREE.Vector3(72, 0, 44)
];

function isShaderPointField(
  object: THREE.Object3D | undefined
): object is THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> {
  return object instanceof THREE.Points && object.material instanceof THREE.ShaderMaterial;
}

describe("Cinematic 3D trajectory preview effects", () => {
  it("builds a pearl ion flow and arrival aperture for BURN", () => {
    const effect = createBurnPreviewEffect(previewPoints, {
      color: 0x9fe8ff,
      opacity: 0.9,
      particleCount: 36,
      particleSizePixels: 6.8,
      apertureSizePixels: 38,
      flowSpeed: 0.24,
      pixelRatio: 2,
      renderLayer: 3
    });

    expect(effect?.name).toBe("burn-preview-ionized-transfer-solution");
    const flow = effect?.getObjectByName("burn-preview-ion-flow");
    const aperture = effect?.getObjectByName("burn-preview-arrival-aperture");
    const previewLayer = new THREE.Layers();
    previewLayer.set(3);
    expect(flow).toBeInstanceOf(THREE.Points);
    expect(aperture).toBeInstanceOf(THREE.Points);
    expect(flow?.layers.test(previewLayer)).toBe(true);

    if (!isShaderPointField(flow)) {
      throw new Error("Expected the BURN ion flow to use a shader point field.");
    }

    expect(flow.geometry.getAttribute("position").count).toBe(36);
    expect(flow.material.fragmentShader).toContain("pearl");
    expect(flow.material.fragmentShader).not.toContain("diamondDistance");
  });

  it("can replace the BURN arrival aperture with an orbit-only flow", () => {
    const effect = createBurnPreviewEffect(previewPoints, {
      color: 0x9fe8ff,
      opacity: 0.72,
      particleCount: 20,
      particleSizePixels: 5.4,
      apertureSizePixels: 38,
      flowSpeed: 0.18,
      pixelRatio: 2,
      renderLayer: 3,
      showArrivalAperture: false
    });

    expect(effect?.getObjectByName("burn-preview-ion-flow")).toBeInstanceOf(THREE.Points);
    expect(effect?.getObjectByName("burn-preview-arrival-aperture")).toBeUndefined();
  });

  it("builds a distinct seeker train and terminal lock for FIRE", () => {
    const targetPosition = new THREE.Vector3(80, 0, 50);
    const effect = createFirePreviewEffect(previewPoints, {
      color: 0xff2638,
      opacity: 0.96,
      particleCount: 42,
      particleSizePixels: 8.2,
      reticleSizePixels: 52,
      targetPosition,
      flowSpeed: 0.42,
      pixelRatio: 2,
      renderLayer: 4
    });

    expect(effect?.name).toBe("fire-preview-seeker-lock-solution");
    const seekerTrain = effect?.getObjectByName("fire-preview-seeker-pulse-train");
    const targetLock = effect?.getObjectByName("fire-preview-terminal-lock-reticle");
    expect(seekerTrain).toBeInstanceOf(THREE.Points);
    expect(targetLock).toBeInstanceOf(THREE.Points);

    if (!isShaderPointField(seekerTrain)) {
      throw new Error("Expected the FIRE seeker train to use a shader point field.");
    }

    if (!isShaderPointField(targetLock)) {
      throw new Error("Expected the FIRE terminal lock to use a shader point reticle.");
    }

    expect(seekerTrain.geometry.getAttribute("position").count).toBe(42);
    expect(seekerTrain.material.fragmentShader).toContain("diamondDistance");
    expect(seekerTrain.material.fragmentShader).not.toContain("pearl");
    expect(targetLock.geometry.getAttribute("position").getX(0)).toBe(targetPosition.x);
    expect(targetLock.material.fragmentShader).toContain("squareOutline");
    expect(targetLock.material.fragmentShader).not.toContain("targetCore");
    expect(targetLock.material.fragmentShader).not.toContain("diamondRing");
    expect(targetLock.material.uniforms["reticleAttachmentRatio"]?.value).toBe(
      firePreviewReticleAttachmentRatio
    );
    expect(targetLock.material.vertexShader).toContain("effectTime * 1.35");
    expect(targetLock.material.vertexShader).not.toContain("mix(0.94, 1.06, vReticlePulse)");
  });

  it("can leave terminal marking to a planar world-space FIRE glyph", () => {
    const effect = createFirePreviewEffect(previewPoints, {
      color: 0xff2638,
      opacity: 0.96,
      particleCount: 24,
      particleSizePixels: 7,
      reticleSizePixels: 48,
      showTerminalLock: false,
      flowSpeed: 0.36,
      pixelRatio: 2,
      renderLayer: 4
    });

    expect(effect?.getObjectByName("fire-preview-seeker-pulse-train")).toBeInstanceOf(THREE.Points);
    expect(effect?.getObjectByName("fire-preview-terminal-lock-reticle")).toBeUndefined();
  });

  it("clips incoming lines to the square reticle boundary", () => {
    const sizePixels = 50;
    const cardinalClearance = computeSquareReticleClearancePixels(1, 0, sizePixels);
    const diagonalClearance = computeSquareReticleClearancePixels(1, 1, sizePixels);

    expect(cardinalClearance).toBeCloseTo(sizePixels * firePreviewReticleAttachmentRatio);
    expect(diagonalClearance).toBeCloseTo(cardinalClearance * Math.SQRT2);
  });

  it("animates effect time and display pixel ratio without rebuilding geometry", () => {
    const effect = createBurnPreviewEffect(previewPoints, {
      color: 0x9fe8ff,
      opacity: 0.9,
      particleCount: 12,
      particleSizePixels: 6,
      apertureSizePixels: 32,
      flowSpeed: 0.2,
      pixelRatio: 1,
      renderLayer: 3
    });

    expect(effect).not.toBeNull();
    const flow = effect?.getObjectByName("burn-preview-ion-flow");

    if (!isShaderPointField(flow)) {
      throw new Error("Expected an animatable BURN preview flow.");
    }

    const geometry = flow.geometry;
    expect(animateTrajectoryPreviewEffect(effect!, 3.25, 1.5)).toBe(true);
    expect(flow.geometry).toBe(geometry);
    expect(flow.material.uniforms["effectTime"]?.value).toBe(3.25);
    expect(flow.material.uniforms["effectPixelRatio"]?.value).toBe(1.5);
  });

  it("removes the animated BURN accent after the order is confirmed", () => {
    const effect = createBurnPreviewEffect(previewPoints, {
      color: 0x9fe8ff,
      opacity: 0.5,
      particleCount: 18,
      particleSizePixels: 5.4,
      apertureSizePixels: 30,
      flowSpeed: 0.24,
      pixelRatio: 2,
      renderLayer: 3,
      presentation: "confirmed"
    });

    expect(effect?.name).toBe("burn-confirmed-ionized-transfer-solution");
    const glints = effect?.getObjectByName("burn-confirmed-static-glints");
    expect(glints).toBeInstanceOf(THREE.Points);

    if (!isShaderPointField(glints)) {
      throw new Error("Expected confirmed BURN glints to use a shader point field.");
    }

    expect(glints.geometry.getAttribute("position").count).toBe(18);
    expect(glints.material.vertexShader).toContain("previewProgress * 31.4159265359");
    const root = new THREE.Group();
    root.add(effect!);
    expect(animateConfirmedTrajectoryEffect(root, 3.25, 1.5)).toBe(true);
    expect(glints.material.uniforms["effectTime"]?.value).toBe(0);
  });

  it("grows one BURN-style FIRE arc to the current target, then morphs it to the future target", () => {
    const currentTargetPoints = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(26, 11, 12),
      new THREE.Vector3(58, 0, 24)
    ];
    const effect = createFirePreviewEffect(previewPoints, {
      color: 0xff2638,
      opacity: 0.54,
      particleCount: 24,
      particleSizePixels: 6.4,
      reticleSizePixels: 39,
      flowSpeed: 0.42,
      pixelRatio: 1,
      renderLayer: 4,
      presentation: "confirmed",
      solutionStartedAt: 2,
      solutionRevealDurationSeconds: 0.8,
      solutionFadeDurationSeconds: 0.2,
      initialSolutionPoints: currentTargetPoints,
      solutionAimAcquireProgress: 0.58
    });
    const root = new THREE.Group();
    root.add(effect!);
    const arc = effect?.getObjectByName("fire-confirmed-growing-burn-arc");

    expect(effect?.name).toBe("fire-confirmed-artillery-adjustment");

    if (!isShaderPointField(arc)) {
      throw new Error("Expected the confirmed FIRE solution to use one morphing shader arc.");
    }

    const initialPosition = arc.geometry.getAttribute("position");
    const futurePosition = arc.geometry.getAttribute("futurePosition");
    expect(initialPosition.count).toBeGreaterThanOrEqual(64);
    expect(futurePosition.count).toBe(initialPosition.count);
    expect(initialPosition.getX(initialPosition.count - 1)).toBeCloseTo(58);
    expect(futurePosition.getX(futurePosition.count - 1)).toBeCloseTo(72);
    expect(arc.material.vertexShader).toContain("mix(position, futurePosition, morphProgress)");
    expect(arc.material.vertexShader).toContain("growProgress");
    expect(effect?.getObjectByName("fire-confirmed-terminal-lock")).toBeUndefined();
    expect(animateConfirmedTrajectoryEffect(root, 2.4, 1.5)).toBe(true);
    expect(arc.material.uniforms["solutionProgress"]?.value).toBeCloseTo(0.5);
    expect(arc.material.uniforms["effectPixelRatio"]?.value).toBe(1.5);
    expect(animateConfirmedTrajectoryEffect(root, 2.9, 1.5)).toBe(true);
    expect(arc.material.uniforms["solutionOpacity"]?.value).toBeCloseTo(0.5);
    expect(animateConfirmedTrajectoryEffect(root, 3.01, 1.5)).toBe(false);
    expect(arc.material.uniforms["solutionProgress"]?.value).toBe(1);
    expect(effect?.visible).toBe(false);
  });

  it("keeps the FIRE grow and morph phases separate", () => {
    expect(computeConfirmedFireArcPhase(0.29, 0.58).growProgress).toBeCloseTo(0.5);
    expect(computeConfirmedFireArcPhase(0.29, 0.58).morphProgress).toBe(0);
    expect(computeConfirmedFireArcPhase(0.58, 0.58)).toEqual({
      growProgress: 1,
      morphProgress: 0
    });
    expect(computeConfirmedFireArcPhase(0.79, 0.58).morphProgress).toBeCloseTo(0.5);
    expect(computeConfirmedFireArcPhase(1, 0.58)).toEqual({
      growProgress: 1,
      morphProgress: 1
    });
  });

  it("uses a smooth bounded reveal curve for confirmed solutions", () => {
    expect(computeConfirmedSolutionRevealProgress(-1, 0.72)).toBe(0);
    expect(computeConfirmedSolutionRevealProgress(0.36, 0.72)).toBeCloseTo(0.5);
    expect(computeConfirmedSolutionRevealProgress(0.72, 0.72)).toBe(1);
  });
});
