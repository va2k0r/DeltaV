import * as THREE from "three";
import { samplePolylineAtProgress } from "./trajectoryPreview";

export type TrajectoryEffectPresentation = "preview" | "confirmed";

export type BurnPreviewEffectOptions = Readonly<{
  color: THREE.ColorRepresentation;
  opacity: number;
  particleCount: number;
  particleSizePixels: number;
  apertureSizePixels: number;
  flowSpeed: number;
  pixelRatio: number;
  renderLayer: number;
  presentation?: TrajectoryEffectPresentation;
  showArrivalAperture?: boolean;
}>;

export type FirePreviewEffectOptions = Readonly<{
  color: THREE.ColorRepresentation;
  opacity: number;
  particleCount: number;
  particleSizePixels: number;
  reticleSizePixels: number;
  targetPosition?: THREE.Vector3;
  showTerminalLock?: boolean;
  flowSpeed: number;
  pixelRatio: number;
  renderLayer: number;
  presentation?: TrajectoryEffectPresentation;
  solutionStartedAt?: number;
  solutionRevealDurationSeconds?: number;
  solutionFadeDurationSeconds?: number;
  initialSolutionPoints?: readonly THREE.Vector3[];
  solutionAimAcquireProgress?: number;
}>;

export const firePreviewReticleAttachmentRatio = 0.36;

export function computeSquareReticleClearancePixels(
  directionX: number,
  directionY: number,
  reticleSizePixels: number
): number {
  const directionLength = Math.hypot(directionX, directionY);
  const halfEdgePixels = Math.max(1, reticleSizePixels) * firePreviewReticleAttachmentRatio;

  if (directionLength <= 0.000001) {
    return halfEdgePixels;
  }

  const maximumAxisComponent =
    Math.max(Math.abs(directionX), Math.abs(directionY)) / directionLength;
  return halfEdgePixels / Math.max(0.000001, maximumAxisComponent);
}

export function createBurnPreviewEffect(
  points: readonly THREE.Vector3[],
  options: BurnPreviewEffectOptions
): THREE.Group | null {
  if (points.length < 2) {
    return null;
  }

  const group = new THREE.Group();
  const presentation = options.presentation ?? "preview";
  group.name =
    presentation === "confirmed"
      ? "burn-confirmed-ionized-transfer-solution"
      : "burn-preview-ionized-transfer-solution";
  const pearlColor = new THREE.Color(options.color).lerp(new THREE.Color(0xf4fdff), 0.36);
  const flow = createPreviewFlowField(points, {
    color: pearlColor,
    opacity: options.opacity,
    particleCount: options.particleCount,
    particleSizePixels: options.particleSizePixels,
    flowSpeed: options.flowSpeed,
    pixelRatio: options.pixelRatio,
    kind: "burn",
    presentation
  });
  flow.name =
    presentation === "confirmed" ? "burn-confirmed-static-glints" : "burn-preview-ion-flow";
  group.add(flow);

  if (options.showArrivalAperture !== false) {
    const aperture = createPreviewReticle(points[points.length - 1]!, {
      color: pearlColor,
      opacity: options.opacity * 0.84,
      sizePixels: options.apertureSizePixels,
      pixelRatio: options.pixelRatio,
      kind: "burn",
      presentation
    });
    aperture.name =
      presentation === "confirmed"
        ? "burn-confirmed-arrival-aperture"
        : "burn-preview-arrival-aperture";
    group.add(aperture);
  }

  setExclusiveRenderLayer(group, options.renderLayer);
  return group;
}

export function createFirePreviewEffect(
  points: readonly THREE.Vector3[],
  options: FirePreviewEffectOptions
): THREE.Group | null {
  if (points.length < 2) {
    return null;
  }

  const group = new THREE.Group();
  const presentation = options.presentation ?? "preview";
  group.name =
    presentation === "confirmed"
      ? "fire-confirmed-artillery-adjustment"
      : "fire-preview-seeker-lock-solution";
  if (presentation === "confirmed") {
    group.userData["confirmedSolutionStartedAt"] = options.solutionStartedAt ?? 0;
    group.userData["confirmedSolutionRevealDurationSeconds"] =
      options.solutionRevealDurationSeconds ?? 0.72;
    group.userData["confirmedSolutionFadeDurationSeconds"] =
      options.solutionFadeDurationSeconds ?? 0.18;
  }
  const seekerColor = new THREE.Color(options.color).lerp(new THREE.Color(0xfff3ed), 0.18);
  const initialSolutionPoints = options.initialSolutionPoints;

  if (
    presentation === "confirmed" &&
    initialSolutionPoints !== undefined &&
    initialSolutionPoints.length >= 2
  ) {
    const growingArc = createConfirmedFireGrowingArc(initialSolutionPoints, points, {
      color: seekerColor,
      opacity: options.opacity,
      particleCount: options.particleCount,
      particleSizePixels: options.particleSizePixels,
      pixelRatio: options.pixelRatio,
      solutionAimAcquireProgress: options.solutionAimAcquireProgress ?? 0.58
    });
    growingArc.name = "fire-confirmed-growing-burn-arc";
    group.add(growingArc);
    setExclusiveRenderLayer(group, options.renderLayer);
    return group;
  }

  const seekerTrain = createPreviewFlowField(points, {
    color: seekerColor,
    opacity: options.opacity,
    particleCount: options.particleCount,
    particleSizePixels: options.particleSizePixels,
    flowSpeed: options.flowSpeed,
    pixelRatio: options.pixelRatio,
    kind: "fire",
    presentation
  });
  seekerTrain.name =
    presentation === "confirmed"
      ? "fire-confirmed-solution-sweep"
      : "fire-preview-seeker-pulse-train";
  group.add(seekerTrain);

  if (options.showTerminalLock !== false) {
    const targetLock = createPreviewReticle(options.targetPosition ?? points[points.length - 1]!, {
      color: options.color,
      opacity: options.opacity * 0.72,
      sizePixels: options.reticleSizePixels,
      pixelRatio: options.pixelRatio,
      kind: "fire",
      presentation
    });
    targetLock.name =
      presentation === "confirmed"
        ? "fire-confirmed-terminal-lock"
        : "fire-preview-terminal-lock-reticle";
    group.add(targetLock);
  }

  setExclusiveRenderLayer(group, options.renderLayer);
  return group;
}

export function animateTrajectoryPreviewEffect(
  root: THREE.Object3D,
  elapsed: number,
  pixelRatio: number
): boolean {
  let animated = false;

  root.traverse((child) => {
    if (!(child instanceof THREE.Points) || !(child.material instanceof THREE.ShaderMaterial)) {
      return;
    }

    const timeUniform = child.material.uniforms["effectTime"];
    const pixelRatioUniform = child.material.uniforms["effectPixelRatio"];

    if (timeUniform !== undefined) {
      timeUniform.value = elapsed;
      animated = true;
    }

    if (pixelRatioUniform !== undefined) {
      pixelRatioUniform.value = Math.max(0.5, pixelRatio);
    }
  });

  return animated;
}

export function animateConfirmedTrajectoryEffect(
  root: THREE.Object3D,
  elapsed: number,
  pixelRatio: number
): boolean {
  let animated = false;

  for (const effect of root.children) {
    const startedAt = getFiniteUserDataNumber(effect, "confirmedSolutionStartedAt", elapsed);
    const durationSeconds = Math.max(
      0.001,
      getFiniteUserDataNumber(effect, "confirmedSolutionRevealDurationSeconds", 0.72)
    );
    const fadeDurationSeconds = Math.max(
      0.001,
      getFiniteUserDataNumber(effect, "confirmedSolutionFadeDurationSeconds", 0.18)
    );
    const elapsedSinceStart = elapsed - startedAt;
    const solutionProgress = computeConfirmedSolutionRevealProgress(
      elapsedSinceStart,
      durationSeconds
    );
    const solutionOpacity =
      1 - smoothStep(durationSeconds, durationSeconds + fadeDurationSeconds, elapsedSinceStart);
    effect.visible = solutionOpacity > 0.001;

    effect.traverse((child) => {
      if (!(child instanceof THREE.Points) || !(child.material instanceof THREE.ShaderMaterial)) {
        return;
      }

      const solutionProgressUniform = child.material.uniforms["solutionProgress"];
      const solutionOpacityUniform = child.material.uniforms["solutionOpacity"];
      const pixelRatioUniform = child.material.uniforms["effectPixelRatio"];

      if (solutionProgressUniform !== undefined) {
        solutionProgressUniform.value = solutionProgress;
      }

      if (pixelRatioUniform !== undefined) {
        pixelRatioUniform.value = Math.max(0.5, pixelRatio);
      }

      if (solutionOpacityUniform !== undefined) {
        solutionOpacityUniform.value = solutionOpacity;
      }
    });

    animated ||= elapsedSinceStart < durationSeconds + fadeDurationSeconds;
  }

  return animated;
}

export function computeConfirmedSolutionRevealProgress(
  elapsedSinceStart: number,
  durationSeconds: number
): number {
  const progress = THREE.MathUtils.clamp(
    elapsedSinceStart / Math.max(0.001, durationSeconds),
    0,
    1
  );
  return progress * progress * (3 - 2 * progress);
}

export type ConfirmedFireArcPhase = Readonly<{
  growProgress: number;
  morphProgress: number;
}>;

export function computeConfirmedFireArcPhase(
  solutionProgress: number,
  aimAcquireProgress: number
): ConfirmedFireArcPhase {
  const progress = THREE.MathUtils.clamp(solutionProgress, 0, 1);
  const aimProgress = THREE.MathUtils.clamp(aimAcquireProgress, 0.2, 0.8);
  return {
    growProgress: smoothStep(0, aimProgress, progress),
    morphProgress: smoothStep(aimProgress, 1, progress)
  };
}

type ConfirmedFireGrowingArcOptions = Readonly<{
  color: THREE.ColorRepresentation;
  opacity: number;
  particleCount: number;
  particleSizePixels: number;
  pixelRatio: number;
  solutionAimAcquireProgress: number;
}>;

function createConfirmedFireGrowingArc(
  initialPoints: readonly THREE.Vector3[],
  futurePoints: readonly THREE.Vector3[],
  options: ConfirmedFireGrowingArcOptions
): THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> {
  const sampleCount = Math.max(64, Math.round(options.particleCount * 2.6));
  const initialPositions: number[] = [];
  const futurePositions: number[] = [];
  const progresses: number[] = [];
  const scales: number[] = [];

  for (let index = 0; index < sampleCount; index += 1) {
    const pathProgress = index / (sampleCount - 1);
    const initialSample = samplePolylineAtProgress(initialPoints, pathProgress).position;
    const futureSample = samplePolylineAtProgress(futurePoints, pathProgress).position;
    initialPositions.push(initialSample.x, initialSample.y, initialSample.z);
    futurePositions.push(futureSample.x, futureSample.y, futureSample.z);
    progresses.push(pathProgress);
    scales.push(0.82 + ((index * 5) % 7) * 0.035);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(initialPositions, 3));
  geometry.setAttribute("futurePosition", new THREE.Float32BufferAttribute(futurePositions, 3));
  geometry.setAttribute("previewProgress", new THREE.Float32BufferAttribute(progresses, 1));
  geometry.setAttribute("previewScale", new THREE.Float32BufferAttribute(scales, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      effectColor: { value: new THREE.Color(options.color) },
      opacity: { value: THREE.MathUtils.clamp(options.opacity, 0, 1.35) },
      effectSize: { value: Math.max(1, options.particleSizePixels) },
      effectPixelRatio: { value: Math.max(0.5, options.pixelRatio) },
      solutionProgress: { value: 0 },
      solutionOpacity: { value: 1 },
      solutionAimAcquireProgress: {
        value: THREE.MathUtils.clamp(options.solutionAimAcquireProgress, 0.2, 0.8)
      }
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute vec3 futurePosition;
      attribute float previewProgress;
      attribute float previewScale;
      uniform float opacity;
      uniform float effectSize;
      uniform float effectPixelRatio;
      uniform float solutionProgress;
      uniform float solutionOpacity;
      uniform float solutionAimAcquireProgress;
      varying float vArcOpacity;
      varying float vArcHeat;

      void main() {
        float growProgress = smoothstep(
          0.0,
          solutionAimAcquireProgress,
          solutionProgress
        );
        float morphProgress = smoothstep(
          solutionAimAcquireProgress,
          1.0,
          solutionProgress
        );
        vec3 arcPosition = mix(position, futurePosition, morphProgress);
        float reveal = 1.0 - smoothstep(
          growProgress - 0.025,
          growProgress + 0.004,
          previewProgress
        );
        float growingHead = exp(-pow((previewProgress - growProgress) / 0.052, 2.0));
        float openingSweep = exp(-pow((previewProgress - morphProgress) / 0.13, 2.0));
        float dash = pow(
          0.5 + 0.5 * cos(previewProgress * 62.8318530718),
          7.0
        );
        float openingPhase = smoothstep(
          solutionAimAcquireProgress - 0.015,
          solutionAimAcquireProgress + 0.015,
          solutionProgress
        );
        float heat = clamp(
          0.24
            + dash * 0.2
            + growingHead * (1.0 - openingPhase) * 0.92
            + openingSweep * openingPhase * 0.58,
          0.0,
          1.0
        );
        vArcOpacity = opacity * solutionOpacity * reveal * (0.38 + heat * 0.62);
        vArcHeat = heat;
        gl_PointSize = effectSize
          * effectPixelRatio
          * previewScale
          * mix(0.48, 1.28, heat);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(arcPosition, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 effectColor;
      varying float vArcOpacity;
      varying float vArcHeat;

      void main() {
        vec2 point = gl_PointCoord - vec2(0.5);
        float radiusSquared = dot(point, point);
        float hotCore = exp(-radiusSquared * 58.0);
        float halo = exp(-radiusSquared * 11.0) * 0.42;
        float alpha = clamp((hotCore + halo) * vArcOpacity, 0.0, 1.0);

        if (alpha <= 0.002) {
          discard;
        }

        vec3 color = mix(effectColor, vec3(1.0, 0.92, 0.86), hotCore * vArcHeat * 0.62);
        gl_FragColor = vec4(color, alpha);
        #include <colorspace_fragment>
      }
    `
  });
  material.toneMapped = false;
  material.userData["extremeZoomBase:opacity"] = options.opacity;

  const arc = new THREE.Points(geometry, material);
  arc.frustumCulled = false;
  arc.renderOrder = 39.2;
  arc.userData["extremeZoomUiFade"] = true;
  return arc;
}

type PreviewFlowFieldOptions = Readonly<{
  color: THREE.ColorRepresentation;
  opacity: number;
  particleCount: number;
  particleSizePixels: number;
  flowSpeed: number;
  pixelRatio: number;
  kind: "burn" | "fire";
  presentation: TrajectoryEffectPresentation;
}>;

function createPreviewFlowField(
  points: readonly THREE.Vector3[],
  options: PreviewFlowFieldOptions
): THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> {
  const particleCount = Math.max(8, Math.round(options.particleCount));
  const positions: number[] = [];
  const progresses: number[] = [];
  const scales: number[] = [];

  for (let index = 0; index < particleCount; index += 1) {
    const pathProgress = THREE.MathUtils.lerp(0.035, 0.965, index / (particleCount - 1));
    const sample = samplePolylineAtProgress(points, pathProgress);
    positions.push(sample.position.x, sample.position.y, sample.position.z);
    progresses.push(pathProgress);
    scales.push(0.78 + ((index * 7) % 5) * 0.055);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("previewProgress", new THREE.Float32BufferAttribute(progresses, 1));
  geometry.setAttribute("previewScale", new THREE.Float32BufferAttribute(scales, 1));
  const material = createPreviewFlowMaterial(options);
  const flow = new THREE.Points(geometry, material);
  flow.frustumCulled = false;
  flow.renderOrder = 39.2;
  flow.userData["extremeZoomUiFade"] = true;
  return flow;
}

function createPreviewFlowMaterial(options: PreviewFlowFieldOptions): THREE.ShaderMaterial {
  const isBurn = options.kind === "burn";
  const isConfirmed = options.presentation === "confirmed";
  const material = new THREE.ShaderMaterial({
    uniforms: {
      effectColor: { value: new THREE.Color(options.color) },
      opacity: { value: THREE.MathUtils.clamp(options.opacity, 0, 1.35) },
      effectTime: { value: 0 },
      effectSpeed: { value: Math.max(0.01, options.flowSpeed) },
      effectSize: { value: Math.max(1, options.particleSizePixels) },
      effectPixelRatio: { value: Math.max(0.5, options.pixelRatio) },
      solutionProgress: { value: isConfirmed ? (isBurn ? 1 : 0) : 1 },
      solutionOpacity: { value: 1 }
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute float previewProgress;
      attribute float previewScale;
      uniform float opacity;
      uniform float effectTime;
      uniform float effectSpeed;
      uniform float effectSize;
      uniform float effectPixelRatio;
      uniform float solutionProgress;
      uniform float solutionOpacity;
      varying float vEffectOpacity;
      varying float vEffectHeat;

      void main() {
        float wavePhase = previewProgress - effectTime * effectSpeed;
        float wave = ${
          isConfirmed
            ? isBurn
              ? "pow(0.5 + 0.5 * cos(previewProgress * 31.4159265359), 24.0)"
              : `max(
                  exp(-pow((previewProgress - solutionProgress) / 0.055, 2.0)),
                  pow(0.5 + 0.5 * cos(previewProgress * 25.1327412287), 28.0)
                    * (1.0 - smoothstep(
                      solutionProgress - 0.018,
                      solutionProgress + 0.012,
                      previewProgress
                    ))
                    * 0.28
                )`
            : isBurn
              ? "pow(0.5 + 0.5 * cos(wavePhase * 18.8495559215), 10.0)"
              : "pow(0.5 + 0.5 * cos(wavePhase * 12.5663706144), 24.0)"
        };
        float endpointFade = smoothstep(0.015, 0.09, previewProgress)
          * (1.0 - smoothstep(0.91, 0.985, previewProgress));
        float solutionVisibility = ${
          isConfirmed && !isBurn
            ? `1.0 - smoothstep(
                solutionProgress - 0.018,
                solutionProgress + 0.012,
                previewProgress
              )`
            : "1.0"
        };
        float idle = ${isConfirmed ? (isBurn ? "0.075" : "0.065") : isBurn ? "0.10" : "0.018"};
        float heat = clamp(
          idle * solutionVisibility
            + wave * ${isConfirmed ? (isBurn ? "0.38" : "0.94") : isBurn ? "0.90" : "1.08"},
          0.0,
          1.0
        );
        vEffectOpacity = opacity * solutionOpacity * endpointFade * heat;
        vEffectHeat = wave;
        gl_PointSize = effectSize
          * effectPixelRatio
          * previewScale
          * mix(${isBurn ? "0.58" : "0.48"}, ${isBurn ? "1.48" : "1.72"}, wave);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: isBurn
      ? `
        uniform vec3 effectColor;
        varying float vEffectOpacity;
        varying float vEffectHeat;

        void main() {
          vec2 point = gl_PointCoord - vec2(0.5);
          float radiusSquared = dot(point, point);
          float pearl = exp(-radiusSquared * 54.0);
          float halo = exp(-radiusSquared * 10.0) * 0.34;
          float axialGlint = exp(-abs(point.y) * 46.0) * exp(-abs(point.x) * 4.8) * 0.32;
          float alpha = clamp((pearl + halo + axialGlint) * vEffectOpacity, 0.0, 1.0);

          if (alpha <= 0.002) {
            discard;
          }

          vec3 color = mix(effectColor * 0.76, vec3(1.0), pearl * (0.24 + vEffectHeat * 0.22));
          gl_FragColor = vec4(color, alpha);
          #include <colorspace_fragment>
        }
      `
      : `
        uniform vec3 effectColor;
        varying float vEffectOpacity;
        varying float vEffectHeat;

        void main() {
          vec2 point = gl_PointCoord - vec2(0.5);
          float diamondDistance = abs(point.x) + abs(point.y);
          float dart = 1.0 - smoothstep(0.18, 0.48, diamondDistance);
          float hotCore = 1.0 - smoothstep(0.025, 0.13, diamondDistance);
          float horizontalNeedle =
            exp(-abs(point.y) * 74.0) * (1.0 - smoothstep(0.08, 0.5, abs(point.x))) * 0.44;
          float alpha = clamp((dart + horizontalNeedle) * vEffectOpacity, 0.0, 1.0);

          if (alpha <= 0.002) {
            discard;
          }

          vec3 color = mix(effectColor, vec3(1.0, 0.94, 0.9), hotCore * (0.48 + vEffectHeat * 0.4));
          gl_FragColor = vec4(color, alpha);
          #include <colorspace_fragment>
        }
      `
  });
  material.toneMapped = false;
  material.userData["extremeZoomBase:opacity"] = options.opacity;
  return material;
}

type PreviewReticleOptions = Readonly<{
  color: THREE.ColorRepresentation;
  opacity: number;
  sizePixels: number;
  pixelRatio: number;
  kind: "burn" | "fire";
  presentation: TrajectoryEffectPresentation;
}>;

function createPreviewReticle(
  position: THREE.Vector3,
  options: PreviewReticleOptions
): THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([position.x, position.y, position.z], 3)
  );
  const isBurn = options.kind === "burn";
  const isConfirmed = options.presentation === "confirmed";
  const material = new THREE.ShaderMaterial({
    uniforms: {
      effectColor: { value: new THREE.Color(options.color) },
      opacity: { value: THREE.MathUtils.clamp(options.opacity, 0, 1.35) },
      effectTime: { value: 0 },
      effectSize: { value: Math.max(1, options.sizePixels) },
      effectPixelRatio: { value: Math.max(0.5, options.pixelRatio) },
      reticleAttachmentRatio: { value: firePreviewReticleAttachmentRatio },
      solutionProgress: { value: isConfirmed ? (isBurn ? 1 : 0) : 1 },
      solutionOpacity: { value: 1 }
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      uniform float effectTime;
      uniform float effectSize;
      uniform float effectPixelRatio;
      uniform float reticleAttachmentRatio;
      uniform float solutionProgress;
      uniform float solutionOpacity;
      varying float vReticlePulse;
      varying float vSolutionVisibility;

      void main() {
        vReticlePulse = ${
          isConfirmed ? "0.5" : `0.5 + 0.5 * sin(effectTime * ${isBurn ? "2.4" : "1.35"})`
        };
        vSolutionVisibility = ${
          isConfirmed && !isBurn ? "smoothstep(0.78, 0.98, solutionProgress)" : "1.0"
        };
        gl_PointSize = effectSize
          * effectPixelRatio
          * ${isBurn ? "mix(0.94, 1.06, vReticlePulse)" : "1.0"};
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: isBurn
      ? `
        uniform vec3 effectColor;
        uniform float opacity;
        uniform float effectTime;
        uniform float reticleAttachmentRatio;
        uniform float solutionOpacity;
        varying float vReticlePulse;
        varying float vSolutionVisibility;

        void main() {
          vec2 point = gl_PointCoord - vec2(0.5);
          float angle = effectTime * 0.42;
          mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
          vec2 rotated = rotation * point;
          float radius = length(rotated);
          float ring = smoothstep(0.47, 0.43, radius) * smoothstep(0.31, 0.345, radius);
          float arcGate = smoothstep(0.12, 0.34, abs(sin(atan(rotated.y, rotated.x) * 3.0)));
          float crosshair =
            (1.0 - smoothstep(0.012, 0.032, min(abs(rotated.x), abs(rotated.y))))
            * smoothstep(0.18, 0.25, radius)
            * (1.0 - smoothstep(0.34, 0.43, radius));
          float center = 1.0 - smoothstep(0.015, 0.055, radius);
          float alpha = clamp(
            (ring * arcGate * 0.9 + crosshair * 0.42 + center * (0.42 + vReticlePulse * 0.34))
              * opacity
              * solutionOpacity
              * vSolutionVisibility,
            0.0,
            1.0
          );

          if (alpha <= 0.002) {
            discard;
          }

          gl_FragColor = vec4(mix(effectColor, vec3(1.0), center * 0.48), alpha);
          #include <colorspace_fragment>
        }
      `
      : `
        uniform vec3 effectColor;
        uniform float opacity;
        uniform float effectTime;
        uniform float solutionOpacity;
        varying float vReticlePulse;
        varying float vSolutionVisibility;

        void main() {
          vec2 point = gl_PointCoord - vec2(0.5);
          vec2 axisDistance = abs(point);
          float squareDistance = max(axisDistance.x, axisDistance.y);
          float squareOutline =
            1.0 - smoothstep(0.008, 0.019, abs(squareDistance - reticleAttachmentRatio));
          float horizontalDatum =
            (1.0 - smoothstep(0.008, 0.018, axisDistance.y))
            * smoothstep(
              reticleAttachmentRatio + 0.018,
              reticleAttachmentRatio + 0.04,
              axisDistance.x
            )
            * (
              1.0 - smoothstep(
                reticleAttachmentRatio + 0.075,
                reticleAttachmentRatio + 0.105,
                axisDistance.x
              )
            );
          float verticalDatum =
            (1.0 - smoothstep(0.008, 0.018, axisDistance.x))
            * smoothstep(
              reticleAttachmentRatio + 0.018,
              reticleAttachmentRatio + 0.04,
              axisDistance.y
            )
            * (
              1.0 - smoothstep(
                reticleAttachmentRatio + 0.075,
                reticleAttachmentRatio + 0.105,
                axisDistance.y
              )
            );
          float datumTicks = max(horizontalDatum, verticalDatum);
          float alpha = clamp(
            (
              squareOutline * (0.48 + vReticlePulse * 0.08)
              + datumTicks * 0.36
            ) * opacity * solutionOpacity * vSolutionVisibility,
            0.0,
            1.0
          );

          if (alpha <= 0.002) {
            discard;
          }

          gl_FragColor = vec4(effectColor, alpha);
          #include <colorspace_fragment>
        }
      `
  });
  material.toneMapped = false;
  material.userData["extremeZoomBase:opacity"] = options.opacity;
  const reticle = new THREE.Points(geometry, material);
  reticle.frustumCulled = false;
  reticle.renderOrder = 39.3;
  reticle.userData["extremeZoomUiFade"] = true;
  return reticle;
}

function setExclusiveRenderLayer(root: THREE.Object3D, renderLayer: number): void {
  root.traverse((child) => {
    child.layers.set(renderLayer);
  });
}

function getFiniteUserDataNumber(object: THREE.Object3D, key: string, fallback: number): number {
  const value: unknown = object.userData[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function smoothStep(edge0: number, edge1: number, value: number): number {
  const progress = THREE.MathUtils.clamp((value - edge0) / Math.max(0.000001, edge1 - edge0), 0, 1);
  return progress * progress * (3 - 2 * progress);
}
