import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Cinematic 3D architecture boundary", () => {
  it("keeps transfer ribbons camera-facing and publishes complete zoom updates", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const methodStart = source.indexOf("  private shouldUpdateTacticalPresentationFrame(");
    const methodEnd = source.indexOf(
      "  private getTacticalPresentationUpdateIntervalSeconds(",
      methodStart
    );
    const methodSource = source.slice(methodStart, methodEnd);
    const wheelRefreshStart = source.indexOf("  private refreshDisplayScaleForWheelZoom(");
    const wheelRefreshEnd = source.indexOf(
      "  private recenterTrackedFocusTarget(",
      wheelRefreshStart
    );
    const wheelRefreshSource = source.slice(wheelRefreshStart, wheelRefreshEnd);

    expect(methodStart).toBeGreaterThanOrEqual(0);
    expect(methodEnd).toBeGreaterThan(methodStart);
    expect(wheelRefreshStart).toBeGreaterThanOrEqual(0);
    expect(wheelRefreshEnd).toBeGreaterThan(wheelRefreshStart);
    expect(methodSource).toContain("this.isTrajectoryLabelCameraMotionActive(performance.now())");
    expect(methodSource).toContain("this.tacticalPresentationCameraMotionWasActive = true");
    expect(methodSource).toContain("this.needsContinuousTacticalPresentationRebuild()");
    expect(wheelRefreshSource).toContain("this.tacticalPresentationDisplayScaleDirty = true");
    expect(methodSource).toContain("if (this.tacticalPresentationDisplayScaleDirty)");
    expect(methodSource.indexOf("if (this.tacticalPresentationDisplayScaleDirty)")).toBeLessThan(
      methodSource.indexOf("if (isCameraMotionActive")
    );
    const displayScaleDirtyBranch = methodSource.slice(
      methodSource.indexOf("if (this.tacticalPresentationDisplayScaleDirty)"),
      methodSource.indexOf("const isCameraMotionActive")
    );
    expect(displayScaleDirtyBranch).toContain("tacticalPresentationReducedZoomUpdateSeconds");
    expect(displayScaleDirtyBranch).toContain("tacticalPresentationMinimalZoomUpdateSeconds");
    expect(displayScaleDirtyBranch).toContain('performanceMode !== "full"');
    expect(displayScaleDirtyBranch).toContain(
      "return this.scheduleTacticalPresentationUpdate(elapsed);"
    );
    expect(displayScaleDirtyBranch.indexOf('performanceMode !== "full"')).toBeLessThan(
      displayScaleDirtyBranch.indexOf("this.tacticalPresentationDisplayScaleDirty = false")
    );
    expect(source).toContain("const tacticalPresentationMinimumFrameGap = 2");
    expect(methodSource).toContain("framesSinceLastUpdate < tacticalPresentationMinimumFrameGap");
    expect(methodSource).toContain(
      "this.tacticalPresentationLastUpdatedRenderFrameSerial = this.renderFrameSerial"
    );
    expect(source).toContain("attribute vec3 ribbonTangent;");
    expect(source).toContain("vec3 cameraFacingSide = cross(worldTangent, viewDirection);");
    expect(source).toContain("uniform float ribbonHalfWidth;");
    expect(source).not.toContain("tacticalPresentationNextCameraUpdateAt");
    expect(methodSource).not.toContain("smoothWheelZoomTargetDistance !== null");
    expect(source).not.toContain("wheelZoomTacticalPresentationUpdateSeconds");
    expect(source).not.toContain("tacticalPresentationDeferredFireUpdate");
    expect(source).not.toContain("tacticalPresentationUpdatePhase");
  });

  it("reuses zoom-driven presentation resources instead of reallocating them", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const nodeBandStart = source.indexOf("function syncNodeBandGeometry(");
    const nodeBandEnd = source.indexOf("function setLinePresentationWidth(", nodeBandStart);
    const nodeBandSource = source.slice(nodeBandStart, nodeBandEnd);

    expect(nodeBandStart).toBeGreaterThanOrEqual(0);
    expect(nodeBandEnd).toBeGreaterThan(nodeBandStart);
    expect(nodeBandSource).toContain('geometry.getAttribute("position")');
    expect(nodeBandSource).toContain("position.needsUpdate = true");
    expect(nodeBandSource).not.toContain("geometry.dispose()");
    expect(nodeBandSource).not.toContain("new THREE.TorusGeometry");
    expect(source).toContain("burnTrajectoryPresentationCache");
    expect(source).toContain("syncBurnTrajectoryRibbonGeometry(");
    expect(source).toContain("isBurnTrajectoryRibbonGeometryCurrent(");
    expect(source).toContain('mesh.userData["burnTrajectoryRibbonGeometryState"]');
    expect(source).toContain("sharedGeometry ?? createBurnTrajectoryRibbonGeometry");
    expect(source).toContain("core.geometry");
    expect(source).toContain("trajectoryLabelPool.pop()");
    expect(source).toContain("rendererPixelRatioCameraSettleMs");
  });

  it("keeps BURN and FIRE trajectory labels isolated across complete zoom rebuilds", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const burnStart = source.indexOf(
      "  private updateBurnPresentation(snapshot: SolarSystemSnapshot): void {"
    );
    const burnEnd = source.indexOf("  private renderResolvingBurnOrderWithdrawals", burnStart);
    const fireStart = source.indexOf(
      "  private updateFirePresentation(snapshot: SolarSystemSnapshot): void {"
    );
    const fireEnd = source.indexOf("  private prepareFutureFireImpactLabelAvoidBounds", fireStart);
    const burnSource = source.slice(burnStart, burnEnd);
    const fireSource = source.slice(fireStart, fireEnd);
    const updateLabelsStart = source.indexOf(
      "  private updateTrajectoryLabels(width: number, height: number): void {"
    );
    const updateLabelsEnd = source.indexOf("  private getCinematicLabelSize(", updateLabelsStart);
    const updateLabelsSource = source.slice(updateLabelsStart, updateLabelsEnd);

    expect(burnStart).toBeGreaterThanOrEqual(0);
    expect(burnEnd).toBeGreaterThan(burnStart);
    expect(fireStart).toBeGreaterThanOrEqual(0);
    expect(fireEnd).toBeGreaterThan(fireStart);
    expect(source).toContain('type TrajectoryLabelScope = "burn" | "fire" | "missile-transient";');
    expect(burnSource).toContain('this.clearTrajectoryLabelsByScope("burn")');
    expect(burnSource).not.toContain("this.clearTrajectoryLabels();");
    expect(fireSource).toContain('this.clearTrajectoryLabelsByScope("fire")');
    expect(source).toContain("scope: TrajectoryLabelScope = getTrajectoryLabelScope(kind)");
    expect(source).toContain("!isWithinOverscan && rememberedOffset === undefined");
    expect(updateLabelsStart).toBeGreaterThanOrEqual(0);
    expect(updateLabelsEnd).toBeGreaterThan(updateLabelsStart);
    expect(updateLabelsSource).not.toContain("projected.x >= -1.18");
    expect(updateLabelsSource).not.toContain("projected.y >= -1.18");
    expect(updateLabelsSource).toContain("Number.isFinite(projected.x)");
  });

  it("uses adaptive performance modes only for scheduling, never visual quality", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const interactionStart = source.indexOf("  private updateInteractionPresentation(): void {");
    const interactionEnd = source.indexOf(
      "  private shouldSyncNodePresentationFrame(",
      interactionStart
    );
    const interactionSource = source.slice(interactionStart, interactionEnd);
    const bloomStart = source.indexOf("  private renderCinematicScene(): void {");
    const bloomEnd = source.indexOf("  private syncCinematicBaseRenderScene(", bloomStart);
    const bloomSource = source.slice(bloomStart, bloomEnd);
    const pixelRatioStart = source.indexOf("  private getStableRendererPixelRatio(): number {");
    const pixelRatioEnd = source.indexOf("  private getEffectivePerformanceMode(", pixelRatioStart);
    const pixelRatioSource = source.slice(pixelRatioStart, pixelRatioEnd);

    expect(interactionStart).toBeGreaterThanOrEqual(0);
    expect(interactionEnd).toBeGreaterThan(interactionStart);
    expect(interactionSource).toContain("this.updateBurnPresentation(snapshot)");
    expect(interactionSource).toContain("this.updateFirePresentation(snapshot)");
    expect(interactionSource).not.toContain("tacticalPresentationUpdatePhase");
    expect(bloomStart).toBeGreaterThanOrEqual(0);
    expect(bloomEnd).toBeGreaterThan(bloomStart);
    expect(bloomSource).toContain("const activeWorldBloomStrength = worldBloomStrength;");
    expect(bloomSource).toContain(
      "const activeUiBloomStrength = this.bloomEnabled ? uiBloomStrength : 0;"
    );
    expect(bloomSource).not.toContain("getEffectivePerformanceMode");
    expect(pixelRatioStart).toBeGreaterThanOrEqual(0);
    expect(pixelRatioEnd).toBeGreaterThan(pixelRatioStart);
    expect(pixelRatioSource).toContain(
      "return clamp(nativePixelRatio, rendererPixelRatioMin, rendererPixelRatioFullMax);"
    );
    expect(pixelRatioSource).not.toContain("performanceMode");
    expect(pixelRatioSource).not.toContain("viewportPressure");
    expect(source).toContain("allowComplexModelDetail: true");
    expect(source).toContain("allowDriveWakeDetail: true");
    expect(source).toContain(
      'private adaptivePerformanceMode: Exclude<CinematicPerformanceMode, "auto"> = "full"'
    );
    expect(source).not.toContain("minimalActiveMissileTrajectoryLimit");
    expect(source).not.toContain("fullImpactChronology.slice");
  });

  it("updates the selected-node marker while zoom-driven label layout is throttled", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const renderFrameStart = source.indexOf("  private renderFrame(): void {");
    const renderFrameEnd = source.indexOf("  private updatePerformanceGovernor(", renderFrameStart);
    const renderFrameSource = source.slice(renderFrameStart, renderFrameEnd);
    const labelGateIndexes = [
      ...renderFrameSource.matchAll(/if \(this\.shouldUpdateLabelPresentation\(elapsed\)\) \{/g)
    ].map((match) => match.index ?? -1);
    const markerUpdateIndexes = [
      ...renderFrameSource.matchAll(/this\.updateSelectedNodeMarker\(\);/g)
    ].map((match) => match.index ?? -1);

    expect(renderFrameStart).toBeGreaterThanOrEqual(0);
    expect(renderFrameEnd).toBeGreaterThan(renderFrameStart);
    expect(labelGateIndexes).toHaveLength(2);
    expect(markerUpdateIndexes).toHaveLength(2);
    expect(markerUpdateIndexes[0] ?? -1).toBeLessThan(labelGateIndexes[0] ?? -1);
    expect(markerUpdateIndexes[1] ?? -1).toBeLessThan(labelGateIndexes[1] ?? -1);
  });

  it("keeps advancing future-orbit timing live in every performance mode", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const methodStart = source.indexOf(
      "  private needsContinuousTacticalPresentationRebuild(): boolean {"
    );
    const methodEnd = source.indexOf(
      "  private getTacticalPresentationUpdateIntervalSeconds(",
      methodStart
    );
    const methodSource = source.slice(methodStart, methodEnd);
    const returnStart = methodSource.indexOf("    return (");
    const returnSource = methodSource.slice(returnStart);
    const tutorialPulseStart = returnSource.indexOf("(this.getTutorialAttentionPulse?.() ?? null)");

    expect(methodStart).toBeGreaterThanOrEqual(0);
    expect(methodEnd).toBeGreaterThan(methodStart);
    expect(returnStart).toBeGreaterThanOrEqual(0);
    expect(returnSource).toContain("hasAdvancingFutureOrbitTiming ||");
    expect(returnSource).toContain("hasResolvingBurnWithdrawal ||");
    expect(returnSource).toContain("hasResolvingFireWithdrawal ||");
    expect(tutorialPulseStart).toBeGreaterThanOrEqual(0);
    expect(returnSource).not.toContain('performanceMode === "full"');
  });

  it("avoids rebuilding static FIRE ribbons in reduced performance modes", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const syncStart = source.indexOf("function syncBurnTrajectoryRibbonGeometry(");
    const syncEnd = source.indexOf("function syncBurnTrajectoryDashMaterial(", syncStart);
    const syncSource = source.slice(syncStart, syncEnd);
    const fireArcStart = source.indexOf("  private renderFireArc(");
    const fireArcEnd = source.indexOf("  private resolveFireTrajectory(", fireArcStart);
    const fireArcSource = source.slice(fireArcStart, fireArcEnd);

    expect(syncStart).toBeGreaterThanOrEqual(0);
    expect(syncEnd).toBeGreaterThan(syncStart);
    expect(syncSource).toContain("isBurnTrajectoryRibbonGeometryCurrent(");
    expect(syncSource).toMatch(
      /isBurnTrajectoryRibbonGeometryCurrent\([\s\S]*?\)\s*\{\s*return;\s*\}/
    );
    expect(fireArcStart).toBeGreaterThanOrEqual(0);
    expect(fireArcEnd).toBeGreaterThan(fireArcStart);
    expect(fireArcSource).toContain("trajectory.points");
    expect(fireArcSource).toContain("this.resolveFireTrajectory(plan, activeProgress)");
    expect(fireArcSource).toContain(
      'const anchorEndDash = canonicalFirePreviewGeometryEnabled || !("launchedTurn" in plan)'
    );
    expect(fireArcSource).toContain("trajectory.visibleStartProgress");
    expect(fireArcSource).not.toContain("trajectory.visiblePoints");
    expect(source).not.toContain("sliceActiveMissileTrajectoryAheadOfMissile");
  });

  it("advances cached tactical dash phases at render cadence", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const animationStart = source.indexOf("  private animatePresentationOnly(");
    const animationEnd = source.indexOf("  private updateDriveWakeCameraDazzle(", animationStart);
    const animationSource = source.slice(animationStart, animationEnd);
    const tacticalStart = source.indexOf("  private shouldUpdateTacticalPresentationFrame(");
    const tacticalEnd = source.indexOf(
      "  private getTacticalPresentationUpdateIntervalSeconds(",
      tacticalStart
    );
    const tacticalSource = source.slice(tacticalStart, tacticalEnd);

    expect(animationStart).toBeGreaterThanOrEqual(0);
    expect(animationEnd).toBeGreaterThan(animationStart);
    expect(animationSource).toContain("this.animateBurnTrajectoryDashPhases(elapsed)");
    expect(animationSource).toContain("this.burnTrajectoryPresentationCache.values()");
    expect(animationSource).toContain("this.fireTrajectoryPresentationCache.values()");
    expect(animationSource).toContain(
      'setObjectShaderUniformNumber(\n        trajectory,\n        "dashPhase"'
    );
    expect(animationSource).toContain("this.hasAnimatedUiBloomSource = true");
    expect(source).toContain('group.userData["burnTrajectoryDashCycle"] = dashCycle');
    expect(source).toContain('group.userData["burnTrajectoryDashAnimationState"]');
    expect(animationSource).toContain("advanceBurnTrajectoryDashAnimationState(");
    expect(animationSource).toContain("synchronizedCycle.cycleSeconds");
    expect(source).toContain("return `order:${String(plan.id)}`;");
    expect(source).toContain("const isPendingOrderPreview =");
    expect(source).toContain("this.getBurnPlanArrivalAngle(plan)");
    expect(source).toContain("activeProgress ?? 0");
    expect(source).toContain("isPendingOrderPreview ? 0 : undefined");
    expect(source).toContain(
      "const presentationBasePoints = flightPath === null ? visiblePoints : points"
    );
    expect(source).toContain("activeProgress === undefined && !isPendingOrderPreview");
    expect(source).toContain("function getBurnTrajectoryDashPhase(");
    expect(tacticalSource).not.toContain("animateBurnTrajectoryDashPhases");
  });

  it("clips active burn progress on the GPU at render cadence", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const animationStart = source.indexOf("  private animatePresentationOnly(");
    const animationEnd = source.indexOf("  private updateDriveWakeCameraDazzle(", animationStart);
    const animationSource = source.slice(animationStart, animationEnd);
    const interactionStart = source.indexOf("  private updateInteractionPresentation(");
    const interactionEnd = source.indexOf(
      "  private shouldSyncNodePresentationFrame(",
      interactionStart
    );
    const interactionSource = source.slice(interactionStart, interactionEnd);

    expect(interactionStart).toBeGreaterThanOrEqual(0);
    expect(interactionEnd).toBeGreaterThan(interactionStart);
    expect(animationSource).toContain("this.syncActiveBurnTrajectoryVisibleStarts()");
    expect(animationSource).toContain('"dashVisibleStart"');
    expect(source).toContain("private getActiveBurnTrajectoryVisibleStartProgress(");
    expect(source).toContain("private getResolvedBurnTrajectoryVisibleStartProgress(");
    expect(source).toContain("getActiveBurnFlightPathDistanceProgress(flightPath, progress)");
    expect(source).toContain("getBurnTrajectoryPresentationVisibleStartProgress(");
    expect(source).toContain("measurePolylineLength(trajectory.points)");
    expect(source).toContain("measurePolylineLength(trajectory.presentationPoints)");
    expect(animationSource).toContain("this.getResolvedBurnTrajectoryVisibleStartProgress(");
    expect(source).toContain(
      "const presentationBasePoints = flightPath === null ? visiblePoints : points"
    );
    expect(source).toContain("uniform float dashVisibleStart;");
    expect(source).toContain("smoothstep(dashVisibleStart, dashVisibleStart + 0.003, vDashUv.x)");
    expect(interactionSource).not.toContain("syncBurnTrajectoryGeometryForTurnTransition");
    expect(source).not.toContain("private syncBurnTrajectoryGeometryForTurnTransition(");
  });

  it("keeps renderer MSAA disabled for the performance profile", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const rendererStart = source.indexOf("private readonly renderer = new THREE.WebGLRenderer({");
    const rendererEnd = source.indexOf("});", rendererStart);
    const rendererSource = source.slice(rendererStart, rendererEnd);

    expect(rendererStart).toBeGreaterThanOrEqual(0);
    expect(rendererEnd).toBeGreaterThan(rendererStart);
    expect(rendererSource).toContain("antialias: false");
    expect(rendererSource).not.toContain("antialias: true");
  });

  it("freezes the opening tutorial log before advancing past ship selection", () => {
    const source = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const handlerStart = source.indexOf("function handleTutorialSelection(");
    const handlerEnd = source.indexOf("function handleTutorialOverlaySelection(", handlerStart);
    const handlerSource = source.slice(handlerStart, handlerEnd);
    const freezeIndex = handlerSource.indexOf(
      'freezeTutorialLiveHintsToTranscript("tutorial:opening-live-hints-frozen", {'
    );
    const phaseIndex = handlerSource.indexOf('tutorial.phase = "awaitingFirstBurnPreview";');

    expect(handlerStart).toBeGreaterThanOrEqual(0);
    expect(handlerEnd).toBeGreaterThan(handlerStart);
    expect(freezeIndex).toBeGreaterThanOrEqual(0);
    expect(phaseIndex).toBeGreaterThan(freezeIndex);
    expect(handlerSource).toContain("refresh: false");
    expect(source).toContain(
      "currentRows.length > 0 ? currentRows : lastNonEmptyTutorialLiveHintRows"
    );
    expect(source).toContain("lastNonEmptyTutorialLiveHintRows = visibleRows;");
    expect(source).toContain(
      'row.className?.includes("command-console__line--tutorial-complete-hint") === true'
    );

    const animationStart = source.indexOf(
      "async function renderLiveCommandRowsWithDynamicAnimation("
    );
    const animationEnd = source.indexOf(
      "async function appendResolutionTranscriptRows(",
      animationStart
    );
    const animationSource = source.slice(animationStart, animationEnd);

    expect(animationStart).toBeGreaterThanOrEqual(0);
    expect(animationEnd).toBeGreaterThan(animationStart);
    expect(animationSource).toContain("metadata: row.metadata");
    expect(animationSource).toContain(
      "previousLiveDynamicCommandRows = getDynamicCommandRows(rows);"
    );
    expect(animationSource).not.toContain("renderLiveCommandRowsInstant(rows);");

    const reserveStart = source.indexOf("function reserveTypewriterLineHeight(");
    const reserveEnd = source.indexOf("function startCommandLineTypewriter(", reserveStart);
    const reserveSource = source.slice(reserveStart, reserveEnd);
    const releaseStart = source.indexOf("function releaseTypewriterLineHeight(");
    const releaseEnd = source.indexOf("function eraseCommandConsoleLine(", releaseStart);
    const releaseSource = source.slice(releaseStart, releaseEnd);

    expect(reserveSource).toContain("line.getBoundingClientRect().height");
    expect(reserveSource).not.toContain("Math.ceil(line.getBoundingClientRect().height)");
    expect(releaseSource).not.toContain("Math.ceil");
  });

  it("leaves a blank transcript row between frozen plans and executed orders", () => {
    const source = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const snapshotStart = source.indexOf("function createCommandSnapshotTimelineEntry()");
    const snapshotEnd = source.indexOf(
      "function createTurnOnlyCommandSnapshotTimelineEntry()",
      snapshotStart
    );
    const snapshotSource = source.slice(snapshotStart, snapshotEnd);
    const spacerStart = source.indexOf("function appendCommandResolutionBoundarySpacer(");
    const spacerEnd = source.indexOf("function pushCommandTimelineSpacerIfNeeded(", spacerStart);
    const spacerSource = source.slice(spacerStart, spacerEnd);

    expect(snapshotStart).toBeGreaterThanOrEqual(0);
    expect(snapshotEnd).toBeGreaterThan(snapshotStart);
    expect(snapshotSource).toContain("appendCommandResolutionBoundarySpacer(rows);");
    expect(spacerSource).toContain("pushCommandTimelineSpacerIfNeeded(rows);");
  });

  it("keeps Three.js out of the headless core", () => {
    const coreSources = collectTypeScriptFiles(join(process.cwd(), "src/core"));

    for (const sourcePath of coreSources) {
      const source = readFileSync(sourcePath, "utf8");

      expect(source).not.toMatch(/\bfrom\s+["']three["']/);
      expect(source).not.toMatch(/\bimport\s+\*\s+as\s+THREE\b/);
    }
  });

  it("keeps Web Audio out of the headless core", () => {
    const coreSources = collectTypeScriptFiles(join(process.cwd(), "src/core"));
    const forbiddenAudioTerms = [
      "AudioContext",
      "webkitAudioContext",
      "AudioNode",
      "OscillatorNode",
      "createOscillator",
      "createGain"
    ];

    for (const sourcePath of coreSources) {
      const source = readFileSync(sourcePath, "utf8");

      for (const term of forbiddenAudioTerms) {
        expect(source).not.toContain(term);
      }
    }
  });

  it("keeps gameplay music asset-backed, UI-owned, looping, and autoplay-safe", () => {
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const audioSource = readFileSync(join(process.cwd(), "src/ui/audio.ts"), "utf8");

    expect(uiSource).toContain("new DeltaVMusicEngine()");
    expect(uiSource).toContain("musicButton");
    expect(uiSource).toContain("let isMusicEnabled = false;");
    expect(uiSource).toContain('musicButton.textContent = "Music Off"');
    expect(uiSource).toContain('musicButton.setAttribute("aria-pressed", "false")');
    expect(uiSource).toContain('"Music On"');
    expect(uiSource).toContain('"Music Off"');
    expect(uiSource).toContain('"Music Pending"');
    expect(uiSource).toContain("musicButton.addEventListener");
    expect(uiSource).toContain("toggleMusic()");
    expect(uiSource).toContain("startMusicOnGameStart()");
    expect(uiSource).toContain("restartMusicForZeroTimerCountdown()");
    expect(uiSource).toContain("registerMusicAutoplayUnlock()");
    expect(uiSource).toContain("cancelMusicAutoplayUnlock()");
    expect(uiSource).toContain("isAutoplayPending");
    expect(uiSource).toContain("musicButton.setAttribute");
    expect(uiSource).toContain("beforeunload");
    expect(uiSource).toContain("musicEngine.dispose()");
    expect(audioSource).toContain("border242_retrosonic_original.mp3");
    expect(audioSource).toContain('document.createElement("audio")');
    expect(audioSource).toContain("this.audio.loop = true");
    expect(audioSource).toContain("this.audio.play()");
    expect(audioSource).toContain("this.audio.currentTime");
    expect(audioSource).toContain("restartFromBeginning(): Promise<boolean>");
    expect(audioSource).toContain("captureStream(): MediaStream | null");
    expect(audioSource).toContain("getVisualPulse()");
    expect(audioSource).toContain("visualPulseBpm = 110");
    expect(audioSource).toContain("visualPulseSeconds");
    expect(audioSource).toContain("pulseIndex");
    expect(audioSource).toContain("positiveModulo");
    expect(audioSource).not.toContain("createOscillator");
    expect(audioSource).not.toContain("createLoopingNoise");
    expect(audioSource).not.toContain("fetch(");
    expect(audioSource).not.toContain("new Audio(");
  });

  it("keeps procedural SFX UI-owned, named, quietable, and autoplay-safe", () => {
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const sfxSource = readFileSync(join(process.cwd(), "src/ui/sfx.ts"), "utf8");

    expect(uiSource).toContain("new DeltaVSfxEngine()");
    expect(uiSource).toContain("sfxButton");
    expect(uiSource).toContain('sfxButton.textContent = "SFX Off"');
    expect(uiSource).toContain("SFX Pending");
    expect(uiSource).toContain("!sfxEngine.isUnlocked");
    expect(uiSource).toContain("registerSfxAutoplayUnlock()");
    expect(uiSource).toContain("cancelSfxAutoplayUnlock()");
    expect(uiSource).toContain("sfxEngine.unlock()");
    expect(uiSource).toContain(
      'window.addEventListener("pointerup", sfxAutoplayUnlockHandler, true)'
    );
    expect(uiSource).toContain('window.addEventListener("click", sfxAutoplayUnlockHandler, true)');
    expect(uiSource).toContain(
      'window.addEventListener("touchstart", sfxAutoplayUnlockHandler, true)'
    );
    expect(uiSource).toContain('sfxEngine.play("turn.execute")');
    expect(uiSource).toContain("playResolutionEventsSfx(resolutionEvents)");
    expect(uiSource).toContain("onInvalidAction(reason: string)");
    expect(uiSource).not.toContain("createOscillator()");
    expect(sfxSource).toContain("export type DeltaVSfxKey");
    expect(sfxSource).toContain("deltaVSfxDefinitions");
    expect(sfxSource).toContain("cooldownMs");
    expect(sfxSource).toContain("zenMode");
    expect(sfxSource).toContain("deltav.sfx.settings.v1");
    expect(sfxSource).toMatch(/defaultDeltaVSfxSettings: DeltaVSfxSettings = \{\s+enabled: false,/);
    expect(sfxSource).toContain("AudioContext");
    expect(sfxSource).toContain("createOscillator");
    expect(sfxSource).toContain("createDynamicsCompressor");
    expect(sfxSource).toContain("planning.burnTension");
    expect(sfxSource).toContain("updateContinuous");
    expect(sfxSource).toContain("this.audioContext ?? this.ensureAudioContext()");
    expect(sfxSource).toContain("void context");
    expect(sfxSource).toContain(".resume()");
    expect(sfxSource).toContain("this.renderSfxKey(context, key, options)");
    expect(sfxSource).toContain("export type DeltaVSfxCaptureStream");
    expect(sfxSource).toContain("createCaptureStream(): DeltaVSfxCaptureStream | null");
    expect(sfxSource).toContain("context.createMediaStreamDestination()");
    expect(sfxSource).toContain("maxSimultaneousOneShots");
    expect(sfxSource).not.toContain("fetch(");
    expect(sfxSource).not.toContain('document.createElement("audio")');
  });

  it("keeps the main HUD clean and exposes the debug drawer only by explicit opt-in", () => {
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const recordingSource = readFileSync(join(process.cwd(), "src/ui/recording.ts"), "utf8");
    const resolutionRowsSource = readFileSync(
      join(process.cwd(), "src/ui/resolutionCommandRows.ts"),
      "utf8"
    );
    const performanceDiagnosticsSource = readFileSync(
      join(process.cwd(), "src/ui/performanceDiagnostics.ts"),
      "utf8"
    );
    const styles = readFileSync(join(process.cwd(), "src/styles.css"), "utf8");

    expect(uiSource).toContain("debugToggleButton");
    expect(uiSource).toContain('header.className = "debug-drawer is-hidden"');
    expect(uiSource).toContain("function toggleDebugDrawer()");
    expect(uiSource).toContain('debugToggleButton.addEventListener("click", toggleDebugDrawer)');
    expect(uiSource).toContain(
      "if (isHidden) {\n      debugToggleButton.remove();\n      return;\n    }"
    );
    expect(uiSource).toContain('const isDebugUiEnabled = urlSearchParams.get("debug") === "1"');
    expect(uiSource).toContain(
      "if (isDebugUiEnabled) {\n    canvasFrame.append(debugToggleButton, header);\n  }"
    );
    expect(uiSource).not.toContain("isGameMenuDebugDisabled");
    expect(uiSource).not.toContain("debugToggleButton.hidden = true");
    expect(uiSource).not.toContain('event.key.toLowerCase() === "d"');
    expect(uiSource).toContain('createDebugModeButton("RECORD")');
    expect(uiSource).toContain("aiLevelSelect");
    expect(uiSource).toContain("AI LEVEL 0");
    expect(uiSource).toContain("AI LEVEL 1 · SIMPLE");
    expect(uiSource).toContain("AI LEVEL 2 · RESERVED");
    expect(uiSource).toContain("AI LEVEL 3");
    expect(uiSource).toContain('aiLevelSelect.value = "0"');
    expect(uiSource).toContain("let debugAiLevel: AiPlanningLevel = 0");
    expect(uiSource).toContain("getEffectiveDebugAiPlanningOptions");
    expect(uiSource).toContain("getEffectiveAiPlanningOptions");
    expect(uiSource).toContain("tutorialEnemySimpleAiEnabled");
    expect(uiSource).toContain("maybeActivateTutorialSimpleEnemyAiAfterFirstKill");
    expect(uiSource).toContain("falling back to AI LEVEL 3");
    expect(uiSource).toContain("copyGameStateDumpButton");
    expect(uiSource).toContain('"Copy GameState Dump"');
    expect(uiSource).toContain("buildDiagnosticGameStateDump");
    expect(uiSource).toContain("createTutorialRuntimeDiagnosticDump");
    expect(uiSource).toContain(
      "displayScaleFocusTargetKey: cameraState.displayScaleFocusTargetKey ?? null"
    );
    expect(uiSource).toContain(
      "displayScaleDistance: cameraState.displayScaleDistance ?? cameraState.distance"
    );
    expect(uiSource).toContain(
      "smoothWheelZoomTargetDistance: cameraState.smoothWheelZoomTargetDistance ?? null"
    );
    expect(uiSource).toContain("arrivalChaseCamera: cameraState.arrivalChaseCamera ?? null");
    expect(uiSource).toContain("GAMESTATE DUMP copied to clipboard");
    expect(uiSource).toContain("new DeltaVDebugRecorder");
    expect(uiSource).toContain("recordButton.addEventListener");
    expect(uiSource).toContain('"STOP RECORDING"');
    expect(uiSource).toContain("debug-recording-indicator");
    expect(uiSource).not.toContain('className = "fps-counter"');
    expect(uiSource).toContain("startFpsCounter()");
    expect(uiSource).toContain("updateFpsCounter");
    expect(uiSource).toContain('debugFps.className = "debug-fps"');
    expect(uiSource).toContain("updateDebugFps()");
    expect(uiSource).toContain('createDebugModeButton("PERF OFF")');
    expect(uiSource).toContain('createDebugModeButton("BURN FX ON")');
    expect(uiSource).toContain('let burnPreviewEffectsMode: "on" | "off" = "on";');
    expect(uiSource).toContain('createDebugModeButton("FIRE FX ON")');
    expect(uiSource).toContain('createDebugModeButton("SOLAR HAZE OFF")');
    expect(uiSource).toContain('let solarHazeMode: "on" | "off" = "off";');
    expect(uiSource).toContain('createDebugModeButton("OCCLUSION ON")');
    expect(uiSource).toContain('createDebugModeButton("ATMOSPHERE ON")');
    expect(uiSource).toContain('createDebugModeButton("SUN PASS ON")');
    expect(uiSource).toContain('createDebugModeButton("UI BLOOM ON")');
    expect(uiSource).toContain('createDebugModeButton("BLOOM LOW")');
    expect(uiSource).toContain('let lowBloomProfileMode: "on" | "off" = "on";');
    expect(uiSource).toContain('createDebugModeButton("HEAT DISTORT ON")');
    expect(uiSource).toContain("solarHazeButton.addEventListener");
    expect(uiSource).toContain("burnPreviewEffectsButton.addEventListener");
    expect(uiSource).toContain("firePreviewEffectsButton.addEventListener");
    expect(uiSource).toContain("solarOcclusionButton.addEventListener");
    expect(uiSource).toContain("atmosphericScatteringButton.addEventListener");
    expect(uiSource).toContain("compactSunBloomButton.addEventListener");
    expect(uiSource).toContain("uiBloomButton.addEventListener");
    expect(uiSource).toContain("lowBloomProfileButton.addEventListener");
    expect(uiSource).toContain("heatDistortionButton.addEventListener");
    expect(uiSource).not.toContain('createDebugModeButton("LOG CRT');
    expect(uiSource).not.toContain("commandLogCrt");
    expect(uiSource).not.toContain('commandConsole.classList.toggle("is-crt-log"');
    expect(uiSource).toContain('setSolarHazeEnabled(solarHazeMode === "on")');
    expect(uiSource).toContain('setBurnPreviewEffectsEnabled(burnPreviewEffectsMode === "on")');
    expect(uiSource).toContain('setFirePreviewEffectsEnabled(firePreviewEffectsMode === "on")');
    expect(uiSource).toContain('setSolarOcclusionEnabled(solarOcclusionMode === "on")');
    expect(uiSource).toContain(
      'setAtmosphericScatteringEnabled(atmosphericScatteringMode === "on")'
    );
    expect(uiSource).toContain('setCompactSunBloomEnabled(compactSunBloomMode === "on")');
    expect(uiSource).toContain('setUiBloomEnabled(uiBloomMode === "on")');
    expect(uiSource).toContain('setLowBloomProfileEnabled(lowBloomProfileMode === "on")');
    expect(uiSource).toContain('setHeatDistortionEnabled(heatDistortionMode === "on")');
    expect(uiSource).toContain('return "BLOOM HIGH"');
    expect(uiSource).toContain('return "BLOOM LOW"');
    expect(uiSource).toContain('return "BLOOM OFF"');
    expect(uiSource).toContain(
      'currentBloomMode === "high" ? "low" : currentBloomMode === "low" ? "off" : "high"'
    );
    expect(uiSource).toContain('element.setAttribute("aria-label", text);');
    expect(uiSource).toContain("performanceDiagnosticsMode");
    expect(uiSource).toContain("isPerformanceDiagnosticsEnabled()");
    expect(uiSource).toContain("type CinematicPerformanceStats");
    expect(uiSource).toContain("lastCinematicPerformanceStats");
    expect(uiSource).toContain("getPerformanceStats()");
    expect(uiSource).not.toContain("formatCompactCinematicPerformanceStats");
    expect(uiSource).not.toContain("formatCinematicPerformanceStatsTitle");
    expect(uiSource).toContain("formatCinematicPerformanceDebugLines");
    expect(performanceDiagnosticsSource).toContain("Presentation appears capped externally");
    expect(uiSource).toContain("shipModelSelect");
    expect(uiSource).toContain("Ship Model · Twin Cyl");
    expect(uiSource).toContain("Ship Model · Hex Stack");
    expect(uiSource).toContain("Ship Model · Ring Hex");
    expect(uiSource).toContain("Ship Model · Legacy");
    expect(uiSource).toContain('let selectedShipModelVariant: ShipModelVariant = "ring-hex"');
    expect(uiSource).toContain("cinematicRenderer.setShipModelVariant(selectedShipModelVariant)");
    expect(uiSource).toContain("performanceDiagnosticsButton.addEventListener");
    expect(uiSource).toContain("getActiveRecordingCanvas");
    expect(uiSource).toContain("getActiveRecordingAudioSources");
    expect(uiSource).toContain("musicEngine.captureStream()");
    expect(uiSource).toContain("sfxEngine.createCaptureStream()");
    expect(uiSource).not.toContain("captureAudioElementStream(trailerAudio");
    expect(uiSource).toContain("RECORDING SAVED");
    expect(recordingSource).toContain("class DeltaVDebugRecorder");
    expect(recordingSource).toContain("MediaRecorder");
    expect(recordingSource).toContain("createCanvasRecordingStream");
    expect(recordingSource).toContain("mirrorCanvas.captureStream");
    expect(recordingSource).toContain("deltav:frame-rendered");
    expect(recordingSource).toContain("requestFrame");
    expect(recordingSource).toContain("video/mp4");
    expect(recordingSource).toContain("video/webm");
    expect(recordingSource).toContain("createMediaStreamDestination");
    expect(recordingSource).toContain("DeltaV_Record_");
    expect(recordingSource).toContain("Browser download folder");
    expect(uiSource).toContain('commandConsole.className = "command-console"');
    expect(uiSource).not.toContain("commandBacklight");
    expect(uiSource).toContain(
      "commandConsole.append(commandModeLabel, commandTranscript, commandLive)"
    );
    expect(uiSource).not.toContain("commandSolarBacklight");
    expect(uiSource).not.toContain("is-solar-backlit");
    expect(uiSource).not.toContain("getSolarScreenProjection()");
    expect(uiSource).toContain('commandModeLabel.textContent = ""');
    expect(uiSource).toContain('commandTranscript.className = "command-console__transcript"');
    expect(uiSource).toContain('commandLiveRows.className = "command-console__live-rows"');
    expect(uiSource).toContain('renderExecutePrompt("execute")');
    expect(uiSource).toContain("executePrompt.addEventListener");
    expect(uiSource).toContain("executePromptAttentionDelayMs");
    expect(uiSource).toContain("syncExecutePromptAttentionState");
    expect(uiSource).toContain("isExecutePromptAttentionEligible");
    expect(uiSource).toContain("startExecutePromptAttentionLoop");
    expect(uiSource).toContain("updateCommandConsole()");
    expect(uiSource).toContain("appendFrozenCommandSnapshot()");
    expect(uiSource).toContain("appendResolutionTranscriptRows(transcriptStartIndex)");
    expect(uiSource).toContain("createDvBarsElement");
    expect(
      readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8")
    ).toContain('dispatchEvent(new CustomEvent("deltav:frame-rendered"))');
    expect(
      readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8")
    ).toContain("export type CinematicSolarScreenProjection");
    expect(
      readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8")
    ).toContain("getSolarScreenProjection()");
    expect(uiSource).toContain("createExecutePromptLabel");
    expect(uiSource).toContain('createDebugModeButton("TIMER AUTO")');
    expect(uiSource).toContain('createDebugModeButton("BEAT ON")');
    expect(uiSource).toContain('beatSyncMode: "on" | "off"');
    expect(uiSource).toContain(
      'beatSyncButton.textContent = beatSyncMode === "on" ? "BEAT ON" : "BEAT OFF"'
    );
    expect(uiSource).toContain("getBeatSyncEnabled()");
    expect(uiSource).toContain("Beat Sync ${beatSyncMode.toUpperCase()}");
    expect(uiSource).toContain("formatTurnForConsole(snapshot.turn)");
    expect(uiSource).toContain("isCommandConsoleResolving");
    expect(uiSource).toContain("isCommandConsoleAnimatingLiveRows");
    expect(uiSource).toContain("shouldTypeNextLiveCommandBlock");
    expect(uiSource).toContain("renderLiveCommandRowsWithDynamicAnimation");
    expect(uiSource).toContain("appendLiveCommandBlockSequential");
    expect(uiSource).toContain("for (const row of rows)");
    expect(uiSource).toContain("attachCommandLiveRowsBlock()");
    expect(uiSource).toContain("commandTranscript.append(commandLiveRows)");
    expect(uiSource).not.toContain("commandLive.append(commandLiveRows)");
    expect(uiSource).toContain("prepareCommandTranscriptForTimelineAppend()");
    expect(uiSource).toContain("await line.typewriterDone");
    expect(uiSource).toContain("eraseCommandConsoleLine");
    expect(uiSource).toContain("appendCommandBlockSequential");
    expect(uiSource).not.toContain("reserveCommandBlockBottomUpHeight");
    expect(uiSource).not.toContain("measureCommandRowsHeight");
    expect(uiSource).not.toContain("is-bottom-up-typewriting");
    expect(uiSource).toContain("getCommandOrderLineClass");
    expect(uiSource).toContain("getCommandTurnBoundarySpacerRows");
    expect(uiSource).toContain("pushCommandOrderTimelineRow");
    expect(uiSource).toContain("isCommandConsoleSpacerRow(row)");
    expect(uiSource).toContain("getExecutePromptMode()");
    expect(uiSource).toContain("startCommandLineTypewriter");
    expect(uiSource).toContain("commandTypewriterMsPerCharacter");
    expect(uiSource).toContain("commandTypewriterMaxDurationMs");
    expect(uiSource).toContain("releaseTypewriterLineHeight");
    expect(uiSource).not.toContain("cursor.hidden");
    expect(uiSource.indexOf("const cursor = document.createElement")).toBeGreaterThan(
      uiSource.indexOf("line.startTypewriter = () =>")
    );
    expect(uiSource).toContain("line.style.height");
    expect(uiSource).toContain("getCommandTranscriptScrollEnd()");
    expect(uiSource).toContain("commandTranscript.scrollHeight - commandTranscript.clientHeight");
    expect(uiSource).toContain("window.requestAnimationFrame(typeNextFrame)");
    expect(uiSource).toContain("window.requestAnimationFrame(eraseNextFrame)");
    expect(uiSource).not.toContain("trimCommandTranscriptToFit");
    expect(uiSource).toContain("command-console__type-cursor");
    expect(uiSource).toContain('controlType: "ai"');
    expect(uiSource).not.toContain("RUN TRAILER");
    expect(uiSource).not.toContain("trailerBeatmapPath");
    expect(uiSource).toContain('urlSearchParams.get("trailer")');
    expect(uiSource).not.toContain("processTrailerEventsAtTime");
    expect(uiSource).not.toContain("createTrailerScenario");
    expect(uiSource).not.toContain("Spotify");
    expect(uiSource).toContain("getProjectedCommandDv()");
    expect(uiSource).toContain("getCommandWarnings(projectedDv)");
    expect(uiSource).toContain('type CommandInputHintsMode = "on" | "off"');
    expect(uiSource).toContain("shouldShowCommandTimelineEntry");
    expect(uiSource).not.toContain("CommandLogMode");
    expect(uiSource).not.toContain("commandLogMode");
    expect(uiSource).not.toContain('kind: "turnCommentary"');
    expect(uiSource).not.toContain("commentaryText");
    expect(uiSource).not.toContain("createTurnCommentaryTimelineEntry");
    expect(uiSource).not.toContain("TURN COMMENTARY");
    expect(uiSource).toContain('entry.kind === "commandSnapshot"');
    expect(uiSource).toContain("getUpcomingContestedWarnings()");
    expect(uiSource).toContain('event: "CONTESTED"');
    expect(uiSource).toContain("shouldShowActiveTransitWarning(transit)");
    expect(uiSource).toContain("shouldShowActiveMissileWarning(missile)");
    expect(uiSource).toContain("formatWarningCountdown");
    expect(uiSource).toContain("return transit.arrivalTurn - snapshot.turn === 1");
    expect(uiSource).not.toContain("transit.departedTurn + 1");
    expect(uiSource).not.toContain("shouldShowWarningAtCreationOrOneTurnOut");
    expect(uiSource).toContain("threat.eventTurn === snapshot.turn + 1");
    expect(uiSource).toContain("missile.impactTurn - snapshot.turn === 1");
    expect(uiSource).toContain('event: "UPKEEP"');
    expect(uiSource).toContain("threat.projectedDvAtEvent < upkeepCost");
    expect(uiSource).toContain(
      "detail: `${formatWarningCountdown(upkeepThreat.eventTurn)} ΔV < ${upkeepCost}`"
    );
    expect(uiSource).not.toContain(
      "T+1 projected ${upkeepThreat.projectedDvAtEvent}/${upkeepCost} ΔV"
    );
    expect(uiSource).toContain('missileThreat.reason !== "evade-dv-insufficient-at-impact"');
    expect(uiSource).toContain("missileThreat.projectedDvAtEvent >= 1");
    expect(uiSource).toContain(
      "detail: `unavailable ${formatWarningCountdown(missile.impactTurn)} ΔV < 1`"
    );
    expect(uiSource).toContain("return `T-${Math.max(0, eventTurn - snapshot.turn)}`;");
    expect(uiSource).not.toContain("UNAVAILABLE  ΔV < 1");
    expect(uiSource).not.toContain("projected ${missileThreat.projectedDvAtEvent}/1 ΔV");
    expect(uiSource).not.toContain("ΔV 0/1");
    expect(uiSource).toContain("contested ${formatWarningCountdown(transit.arrivalTurn)}");
    expect(uiSource).toContain("hasPendingPlayerBurnAwayFromNode");
    expect(uiSource).toContain("getCommandTimelineRowText");
    expect(uiSource).not.toContain("getTurnCommentaryRowSourceEventId");
    expect(uiSource).not.toContain("commentary:");
    expect(uiSource).not.toContain("sourceEventIds");
    expect(uiSource).toContain("getCommandWarningNodeTargetKey");
    expect(uiSource).toContain(
      "focusTargetWithoutZoom(warningNodeTargetKey, { tutorialPan: true });"
    );
    expect(uiSource).not.toContain("isFireCommentaryRelevant");
    expect(uiSource).not.toContain("getResolutionFireTargetFactionId");
    expect(uiSource).toContain(
      'return nodeId === undefined || nodeId === "" ? null : `node:${nodeId}`'
    );
    expect(uiSource).toContain("`node:${incomingTransitTargetKey.originNodeId}`");
    expect(uiSource).toContain("`node:${incomingMissileTargetKey.originNodeId}`");
    expect(uiSource).toContain("commandDvHistory.push({ ...snapshot.factionDv })");
    expect(uiSource).toContain("getCommandDvTelemetryValues(factionId, projectedDv)");
    expect(uiSource).toContain("commandDvHistory.slice(0, -1)");
    expect(uiSource).toContain("type CommandConsoleRowMetadata");
    expect(uiSource).toContain("metadata?: CommandConsoleRowMetadata");
    expect(uiSource).toContain("withCommandConsoleRowMetadata");
    expect(uiSource).toContain("applyCommandConsoleRowMetadata");
    expect(uiSource).toContain('line.dataset["entryId"]');
    expect(uiSource).toContain('line.dataset["eventId"]');
    expect(uiSource).toContain('line.dataset["kind"]');
    expect(uiSource).toContain('line.classList.add("command-console__line--linked-event")');
    expect(uiSource).not.toContain("Focus this warning");
    expect(uiSource).not.toContain("Review this log point");
    expect(uiSource).toContain("getCommandScrollbackLine");
    expect(uiSource).toContain(
      ".command-console__line--linked-event[data-entry-id], .command-console__line--linked-event[data-row-key]"
    );
    expect(uiSource).toContain("getCommandScrollbackLineTargetId");
    expect(uiSource).toContain("getReplayPositionForCommandScrollbackTarget");
    expect(uiSource).toContain("getReplayPositionForCommandTimelineEntryId");
    expect(uiSource).toContain("getReplayTransitionIndexForTurn");
    expect(uiSource).toContain("commandLogOptions");
    expect(uiSource).toContain("cueCameraPreviewEnabled: false");
    expect(uiSource).toContain("scheduleCommandLogCueCameraPreview");
    expect(uiSource).toContain("restoreCommandLogCueCameraPreview");
    expect(uiSource).toContain("commandLogTimeReviewDurations");
    expect(uiSource).toContain("getCommandLogCueNodeIds");
    expect(uiSource).toContain("previewCommandLogCueCamera(nodeIds)");
    expect(uiSource).toContain("restoreCommandLogCueCamera()");
    expect(uiSource).toContain('commandTranscript.addEventListener("click"');
    expect(uiSource).toContain('commandTranscript.addEventListener("pointerover"');
    expect(uiSource).toContain('commandTranscript.addEventListener("mouseover"');
    expect(uiSource).toContain('commandTranscript.addEventListener("mouseleave"');
    expect(uiSource).toContain('commandTranscript.addEventListener("keydown"');
    expect(uiSource).toContain('commandLive.addEventListener("click", handleCommandLiveClick)');
    expect(uiSource).toContain('executePrompt.addEventListener("pointerup"');
    expect(uiSource).toContain("handleGlobalExecuteHotkey(event)");
    expect(uiSource).toContain('event.key !== " " && event.code !== "Space"');
    expect(uiSource).toContain("shouldIgnoreGlobalGameplayHotkey(event)");
    expect(uiSource).not.toContain("!event.repeat");
    expect(uiSource).toContain("void executeCurrentTurn();");
    expect(uiSource).toContain(
      "\"input, textarea, select, button, a[href], [contenteditable='true'], .command-console\""
    );
    expect(uiSource).toContain("suppressNextExecutePromptClick");
    expect(uiSource).toContain("type CommandScrollbackRow");
    expect(uiSource).toContain(
      "createCommandScrollbackRows(commandTimelineEntries, replayTape.entries)"
    );
    expect(uiSource).toContain("hasAppendedVictoryTranscript");
    expect(uiSource).not.toContain("createDvSparkline");
    expect(uiSource).not.toContain("command-console__execute-stamp");
    expect(uiSource).not.toContain("command-console__line--execute-stamp");
    expect(uiSource).not.toContain("createFrozenExecuteTimelineRow");
    expect(uiSource).not.toContain("command-console__line--execute-snapshot");
    expect(uiSource).not.toContain(
      "canvasFrame.append(\n    cinematicFrame,\n    tacticalCanvas,\n    replayIndicator,\n    postMatchReport,\n    debugPanel"
    );
    expect(styles).toContain(".debug-toggle");
    expect(styles).not.toContain(".fps-counter");
    expect(styles).toContain(".debug-drawer.is-hidden");
    expect(styles).toContain(".debug-recording-indicator");
    expect(styles).toContain(".map-controls button.is-recording");
    expect(styles).toContain(".app-shell.is-trailer-capture");
    expect(styles).toContain(".command-console__execute");
    expect(styles).not.toContain("VT323");
    expect(styles).not.toContain(".command-console.is-crt-log");
    expect(styles).not.toContain(".command-console__crt-glyph");
    expect(styles).not.toContain("@keyframes command-log-crt-phosphor-flicker");
    expect(styles).not.toContain(".command-console__backlight");
    expect(styles).not.toContain("command-solar-");
    expect(styles).not.toContain(".command-console.is-solar-backlit");
    expect(styles).not.toContain("-webkit-text-stroke-width");
    expect(styles).not.toContain("backdrop-filter");
    expect(styles).not.toContain("-webkit-backdrop-filter");
    expect(styles).not.toContain("@keyframes command-solar-glint");
    expect(styles).toContain("min-height: 30px");
    expect(styles).toContain("touch-action: manipulation");
    expect(styles).toContain("--execute-attention-pulse");
    expect(styles).toContain(
      ".command-console.is-tutorial .command-console__execute.is-attention-pulsing"
    );
    expect(styles).toContain("--command-rail-right: clamp(16px, 1.8vw, 40px)");
    expect(styles).toContain(
      "--command-rail-width: min(clamp(330px, 25vw, 540px), calc(100vw - 32px))"
    );
    expect(styles).toContain("--command-rail-gap: clamp(16px, 1.6vw, 32px)");
    expect(styles).toContain("right: var(--command-rail-right)");
    expect(styles).toContain("width: var(--command-rail-width)");
    expect(styles).toContain("height: clamp(250px, 34vh, 460px)");
    expect(styles).toContain("max-height: clamp(250px, 34vh, 460px)");
    expect(styles).toContain("@media (max-aspect-ratio: 1/1) and (min-height: 640px)");
    expect(styles).toContain("width: min(clamp(255px, 38vw, 315px), calc(100vw - 16px))");
    expect(styles).toContain("max-height: min(32vh, 260px)");
    expect(styles).toContain("max-height: clamp(64px, 17vh, 150px)");
    expect(styles).toContain("gap: 2px");
    expect(styles).toContain("font-weight: 430");
    expect(styles).toContain("line-height: 1.36");
    expect(styles).toContain("--command-console-line-right-gutter: clamp(22px, 2.4vw, 56px)");
    expect(styles).toContain("--command-console-line-right-gutter: clamp(14px, 4vw, 30px)");
    expect(styles).toContain("--command-console-transcript-headroom: clamp(112px, 15vh, 220px)");
    expect(styles).toContain("--command-console-transcript-headroom: 0px");
    expect(styles).toContain("contain: layout paint style");
    expect(styles).toContain("pointer-events: none");
    expect(styles).toContain("user-select: none");
    expect(styles).toContain("-webkit-user-select: none");
    expect(styles).toContain(".command-console__transcript");
    expect(styles).toContain(".command-console__transcript::before");
    expect(styles).toContain("flex: 1 1 var(--command-console-transcript-headroom)");
    expect(styles).toContain("max-height: var(--command-console-transcript-headroom)");
    expect(styles).toContain(
      "Collapse decorative headroom before the transcript starts scrolling."
    );
    expect(styles).toContain(".command-console__transcript > *");
    expect(styles).toContain("flex-shrink: 0");
    expect(styles).toContain(".command-console__type-cursor {");
    expect(styles).toContain("position: absolute");
    expect(styles).toContain(".command-console__live-rows");
    expect(styles).toContain("margin-top: 0");
    expect(styles).not.toContain(".command-console__block.is-bottom-up-typewriting");
    expect(styles).not.toContain(".command-console__block-measure");
    expect(styles).toContain(".command-console__mode-label");
    expect(styles).toContain("flex: 1 1 auto");
    expect(styles).toContain("min-width: 0");
    expect(styles).toContain("overflow-y: auto");
    expect(styles).toContain("overscroll-behavior: contain");
    expect(styles).toContain("overflow-anchor: none");
    expect(styles).toContain("scrollbar-width: none");
    expect(styles).not.toContain("mask-image: linear-gradient");
    expect(styles).toContain(
      "padding-bottom: calc(0.45em + var(--command-console-tail-snap-padding))"
    );
    expect(styles).toContain("justify-content: flex-start");
    expect(styles).toContain("pointer-events: auto");
    expect(styles).toContain("display: none;");
    expect(styles).toContain(".command-console__warning-word");
    expect(styles).toContain(".command-console__event-contested");
    expect(styles).not.toContain(".command-console__warning-word--critical");
    expect(styles).not.toContain(".command-console__line--commentary");
    expect(styles).toContain("overflow-anchor: none");
    expect(styles).toContain(".command-console__line > span");
    expect(styles).toContain("overflow-wrap: anywhere");
    expect(styles).toContain("padding-right: var(--command-console-line-right-gutter)");
    expect(styles).toContain("white-space: normal");
    expect(styles).toContain(".command-console__execute--launch");
    expect(styles).toContain(".execute-question");
    expect(styles).toContain("opacity: var(--execute-question-blink-opacity, 0.86)");
    expect(styles).toContain(".command-console__execute:disabled .execute-question");
    expect(styles).toContain(".command-console__execute.is-command-log-reviewing");
    expect(styles).toContain(".execute-launch-word");
    expect(styles).toContain("color: rgba(245, 248, 252, 0.96) !important");
    expect(styles).toContain("-webkit-text-fill-color: rgba(245, 248, 252, 0.96)");
    expect(styles).toContain(
      "animation: execute-launch-blink var(--beat-execute-launch-duration, 720ms) steps(2, end)"
    );
    expect(styles).toContain("opacity: 0.28");
    expect(styles).toContain("--execute-question-pulse");
    expect(uiSource).toContain("--execute-question-blink-opacity");
    expect(uiSource).toContain('launch.textContent = "MANDATORY LAUNCH"');
    expect(resolutionRowsSource).toContain('{ text: "MANDATORY LAUNCH", className: factionClass }');
    expect(resolutionRowsSource).toContain(
      " is required at ${nodeName}; select a BURN destination."
    );
    expect(resolutionRowsSource).toContain("MANDATORY LAUNCH FAILED");
    expect(uiSource).toContain("executeQuestionBlinkLitPhase = 0.54");
    expect(uiSource).toContain("getExecuteQuestionBeatBlinkOpacity");
    expect(uiSource).toContain(
      "musicPulse === null ? fallbackPhase : clampNumber(musicPulse.phase"
    );
    expect(styles).not.toContain(
      "0.62 + var(--execute-question-pulse) * 0.3 + var(--execute-attention-pulse)"
    );
    expect(styles).not.toContain(
      "0.18 + var(--execute-question-pulse) * 0.22 + var(--execute-attention-pulse)"
    );
    expect(uiSource).toContain("applyExecuteQuestionBeatPulse");
    expect(uiSource).toContain("clearExecuteQuestionBeatPulse");
    expect(styles).toContain(".command-console__type-cursor");
    expect(styles).toContain(".command-console__line--turn");
    expect(styles).toContain(".command-console__line--command-start");
    expect(styles).toContain(".command-console__line--erasing");
    expect(styles).toContain(".command-console__line--linked-event");
    expect(styles).toContain("touch-action: none");
    expect(styles).toContain("width: 100%");
    expect(styles).toContain(".command-console__line--linked-event.is-command-scrub-primed");
    expect(styles).toContain(".command-console__line--linked-event.is-command-scrollback-playing");
    expect(styles).toContain(
      ".command-console__line--linked-event.is-command-scrollback-review-target"
    );
    expect(styles).toContain(".dv-bars");
    expect(styles).toContain("@keyframes execute-launch-blink");
    expect(styles).not.toContain("@keyframes execute-question-blink");
    expect(styles).toContain("@keyframes command-type-cursor-blink");
    expect(styles).not.toContain("command-console__execute::after");
    expect(styles).not.toContain(".command-console::before");
    expect(styles).not.toContain("command-console__execute-stamp");
    expect(styles).not.toContain("command-console__line--execute-stamp");
    expect(styles).not.toContain("command-console__line--execute-snapshot");
    expect(styles).not.toContain("@keyframes command-typewriter");
  });

  it("keeps deterministic Trailer Capture isolated from normal gameplay startup", () => {
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const rendererSource = readFileSync(
      join(process.cwd(), "src/renderers/cinematic3d/index.ts"),
      "utf8"
    );
    const trailerSource = readFileSync(join(process.cwd(), "src/core/trailerCapture.ts"), "utf8");
    const styles = readFileSync(join(process.cwd(), "src/styles.css"), "utf8");
    const uiTrailerControllerPath = join(process.cwd(), "src/ui/trailerCameraController.ts");
    const trailerAssetsPath = join(process.cwd(), "public/assets/trailer");
    const trailerExportPath = join(process.cwd(), "public/exports/deltav_trailer_v2_1080p.webm");

    expect(uiSource).toContain('createDebugModeButton("TRAILER MODE")');
    expect(uiSource).toContain('createDebugModeButton("PLAY TRAILER")');
    expect(uiSource).toContain("let isTrailerModeActive = false");
    expect(uiSource).toContain("let isTrailerCaptureActive = false");
    expect(uiSource).toContain("function activateTrailerMode(): void");
    expect(uiSource).toContain("async function activateTrailerCapture(): Promise<void>");
    expect(uiSource).toContain("activateTrailerMode()");
    expect(uiSource).toContain("void activateTrailerCapture()");
    expect(uiSource).toContain(
      'window.addEventListener("keydown", (event) => {\n    if (isTrailerCaptureActive) {'
    );
    expect(uiSource).toContain('urlSearchParams.get("trailer")');
    expect(uiSource).toContain('urlSearchParams.get("mode") === "trailer"');
    expect(uiSource).toContain('urlSearchParams.get("play") === "all"');
    expect(uiSource).toContain('urlSearchParams.get("scene")');
    expect(uiSource).toContain("createTrailerCaptureTimeline(content)");
    expect(uiSource).toContain("playCurrentTrailerCaptureScene");
    expect(uiSource).toContain("playAllTrailerCaptureScenes");
    expect(uiSource).toContain("advanceTrailerCaptureScene");
    expect(uiSource).toContain("isTrailerCameraAutomationInterrupted");
    expect(uiSource).toContain("frameTargetsAroundFocusObliqueSmooth");
    expect(uiSource).toContain("frameTargetsAroundFocusObliqueInstant");
    expect(uiSource).toContain("yaw: shot.yawRadians");
    expect(uiSource).not.toContain("currentCamera.yaw + shot.yawRadians");
    expect(uiSource).toContain(
      "resetRuntimeAfterGameReset({ preserveCinematicScene: true });\n    stageTrailerCameraShot"
    );
    expect(uiSource).toContain("previewBurnRoute");
    expect(uiSource).toContain("header.remove()");
    expect(uiSource).toContain("debugToggleButton.remove()");
    expect(trailerSource).toContain('TRAILER_CAPTURE_SEED = "deltav-trailer-capture-v1"');
    expect(trailerSource).toContain("TRAILER_CAPTURE_PRE_ROLL_MS = 3_000");
    expect(trailerSource).toContain("TRAILER_CAPTURE_POST_ROLL_MS = 3_000");
    expect(trailerSource).toContain("state = applyCommand(state, operation.command, content)");
    expect(trailerSource).toContain("state = advanceTurn(state, content, [], {})");
    expect(rendererSource).toContain("previewBurnRoute(");
    expect(rendererSource).toContain("clearRoutePreview()");
    expect(styles).toContain(".app-shell.is-trailer-capture");
    expect(styles).toContain("cursor: none !important");
    expect(uiSource).not.toContain("RUN TRAILER");
    expect(uiSource).not.toContain("loadTrailerBeatmap");
    expect(uiSource).not.toContain("captureAudioElementStream(trailerAudio");
    expect(uiSource).not.toContain("OPEN TRAILER EDITOR");
    expect(uiSource).not.toContain('urlSearchParams.get("trailerEditor")');
    expect(uiSource).not.toContain("trailer_project_v1.json");
    expect(rendererSource).not.toContain("setGameplayInputLocked");
    expect(rendererSource).not.toContain("isGameplayInputLocked");
    expect(existsSync(uiTrailerControllerPath)).toBe(false);
    expect(existsSync(trailerAssetsPath)).toBe(false);
    expect(existsSync(trailerExportPath)).toBe(false);
  });

  it("starts 1 PLAYER debug mode as an intradiegetic tutorial", () => {
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const tutorialRuntimeSource = [
      "runtimeState.ts",
      "runtimeTypes.ts",
      "runtimeFactory.ts",
      "runtimeDiagnostics.ts"
    ]
      .map((fileName) => readFileSync(join(process.cwd(), "src/ui/tutorial", fileName), "utf8"))
      .join("\n");
    const tutorialCommandRowsSource = [
      "commandRows.ts",
      "lessonRows.ts",
      "liveHintRows.ts",
      "rowCore.ts"
    ]
      .map((fileName) => readFileSync(join(process.cwd(), "src/ui/tutorial", fileName), "utf8"))
      .join("\n");
    const tutorialConstantsSource = readFileSync(
      join(process.cwd(), "src/ui/tutorial/constants.ts"),
      "utf8"
    );
    const rendererSource = readFileSync(
      join(process.cwd(), "src/renderers/cinematic3d/index.ts"),
      "utf8"
    );
    const styles = readFileSync(join(process.cwd(), "src/styles.css"), "utf8");
    const tutorialCameraStart = uiSource.indexOf("  function frameTutorialOpeningCamera(): void {");
    const tutorialCameraEnd = uiSource.indexOf(
      "  function appendStartStateAudit(",
      tutorialCameraStart
    );
    const tutorialCameraSource = uiSource.slice(tutorialCameraStart, tutorialCameraEnd);
    const tutorialStartStart = uiSource.indexOf("  async function startTutorialSegment01()");
    const tutorialStartEnd = uiSource.indexOf(
      "  function createTutorialSegment01InitialState()",
      tutorialStartStart
    );
    const tutorialStartSource = uiSource.slice(tutorialStartStart, tutorialStartEnd);
    const shipyardChaseStart = rendererSource.indexOf("  focusShipyardAssemblyChaseSmooth(");
    const shipyardChaseEnd = rendererSource.indexOf(
      "  focusTargetWithoutZoom(",
      shipyardChaseStart
    );
    const shipyardChaseSource = rendererSource.slice(shipyardChaseStart, shipyardChaseEnd);
    const shipyardFirePromptRowsStart = tutorialCommandRowsSource.indexOf(
      "export function createTutorialShipyardFirePromptRows"
    );
    const shipyardFirePromptRowsEnd = tutorialCommandRowsSource.indexOf(
      "export function createTutorialShipyardContestedRuleRows",
      shipyardFirePromptRowsStart
    );
    const shipyardFirePromptRowsSource = tutorialCommandRowsSource.slice(
      shipyardFirePromptRowsStart,
      shipyardFirePromptRowsEnd
    );
    const handleTutorialAfterTurnStart = uiSource.indexOf("  function handleTutorialAfterTurn(");
    const tutorialAutoResolveTurnStart = uiSource.indexOf(
      "  async function tutorialAutoResolveTurn(",
      handleTutorialAfterTurnStart
    );
    const handleTutorialAfterTurnSource = uiSource.slice(
      handleTutorialAfterTurnStart,
      tutorialAutoResolveTurnStart
    );
    const autoAdvanceFirstArrivalStart = uiSource.indexOf(
      "  async function autoAdvanceTutorialToFirstArrival(",
      tutorialAutoResolveTurnStart
    );
    const autoAdvanceProductiveArrivalStart = uiSource.indexOf(
      "  async function autoAdvanceTutorialToProductiveArrival(",
      autoAdvanceFirstArrivalStart
    );
    const tutorialAutoResolveTurnSource = uiSource.slice(
      tutorialAutoResolveTurnStart,
      autoAdvanceFirstArrivalStart
    );
    const autoAdvanceFirstArrivalSource = uiSource.slice(
      autoAdvanceFirstArrivalStart,
      autoAdvanceProductiveArrivalStart
    );
    const firstBurnAfterTurnStart = handleTutorialAfterTurnSource.indexOf(
      'tutorial.phase === "firstBurnQueued"'
    );
    const firstBurnAfterTurnEnd = handleTutorialAfterTurnSource.indexOf(
      'tutorial.phase === "awaitingFirstArrival"',
      firstBurnAfterTurnStart + 1
    );
    const firstBurnAfterTurnSource = handleTutorialAfterTurnSource.slice(
      firstBurnAfterTurnStart,
      firstBurnAfterTurnEnd
    );

    expect(tutorialRuntimeSource).toContain('segmentId: "TUTORIAL_SEGMENT_01"');
    expect(uiSource).toContain("getMapPreset(DEFAULT_MAP_PRESET_ID)");
    expect(uiSource).not.toContain("getMapPreset(CURRENT_MAP_PRESET_ID)");
    expect(uiSource).toContain("createTutorialRuntimeState");
    expect(uiSource).toContain("void startTutorialSegment01()");
    expect(tutorialStartSource).toContain("const tutorialPreset = selectedMapPreset;");
    expect(tutorialStartSource).toContain("getProceduralDebugForPreset(");
    expect(tutorialStartSource).not.toContain("getMapPreset(CURRENT_MAP_PRESET_ID)");
    expect(tutorialStartSource).not.toContain("selectedMapPreset = tutorialPreset");
    expect(tutorialStartSource).not.toContain("currentProceduralDebug = null");
    expect(tutorialRuntimeSource).toContain('"awaitingInitialSelection"');
    expect(tutorialRuntimeSource).toContain('"awaitingFirstBurnPreview"');
    expect(tutorialRuntimeSource).toContain('"mandatoryLaunch"');
    expect(tutorialRuntimeSource).toContain('"awaitingBurnOut"');
    expect(tutorialCommandRowsSource).toContain("Left-click the Moon orbit to select the ship.");
    expect(uiSource).not.toContain("Hover a node to preview burn transfer.");
    expect(tutorialCommandRowsSource).toContain('{ text: "BURN", className: playerClassName }');
    expect(tutorialCommandRowsSource).toContain(
      '{ text: " spends ΔV to move a ship between orbits." }'
    );
    expect(tutorialCommandRowsSource).toContain(
      'createTutorialSpacerRow("tutorial:first-burn-cost:spacer")'
    );
    expect(tutorialCommandRowsSource).toContain(
      "All of your ships share one ΔV reserve, so an expensive transfer leaves less available for later movement, EVADE and contested upkeep."
    );
    expect(tutorialCommandRowsSource).toContain(
      '{ text: "Left-click the destination to confirm the " }'
    );
    expect(uiSource).not.toContain("Left click to confirm transfer burn.");
    expect(uiSource).toContain(
      "Fusion torch drives consume tritium to sustain acceleration, so every faction depends on a continuing fuel cycle."
    );
    expect(uiSource).toContain(
      "A ship that begins the turn at a tritium plant produces +2 ΔV if it remains eligible to WORK. It produces nothing if it "
    );
    expect(tutorialCommandRowsSource).toContain(
      "At 5/5, the new ship stays at the yard and the incumbent must execute a "
    );
    expect(tutorialCommandRowsSource).toContain(
      " to another valid destination. Keep enough ΔV and at least one useful route available before the final WORK turn."
    );
    expect(tutorialCommandRowsSource).toContain(
      'createTutorialSpacerRow("tutorial:mandatory-launch-contest-spacer")'
    );
    expect(uiSource).not.toContain("The faction controlling a shipyard at 5/5");
    expect(uiSource).toContain(
      "BURN to another orbit before impact; departure breaks every firing solution aimed at that ship."
    );
    expect(tutorialCommandRowsSource).toContain(
      "An orbit occupied by ships from two different factions becomes "
    );
    expect(uiSource).toContain(
      "Nuclear warfare is actively interdicted in Earth and lunar orbits."
    );
    expect(uiSource).toContain(
      "Beyond that protected corridor, the same acts remain unlawful but immediate enforcement is no longer available."
    );
    expect(uiSource).not.toContain(
      "Earth and Moon nodes are interdicted from orbital nuclear warfare."
    );
    expect(uiSource).toContain("normalizeTutorialPlayerFaction");
    expect(uiSource).toContain('displayName: "PLAYER"');
    expect(uiSource).toContain('if (tutorialState !== null && factionId === "player")');
    expect(uiSource).toContain('return "PLAYER";');
    expect(uiSource).not.toContain('return "APERTURE";');
    expect(uiSource).toContain("player: 50");
    expect(uiSource).toContain('displayName: "ENEMY"');
    expect(uiSource).toContain(
      "ensureTutorialOpponentFactionState(nextState, opponentFaction, 50)"
    );
    expect(uiSource).toContain("appendTutorialRows");
    expect(tutorialRuntimeSource).toContain('"awaitingFirstArrival"');
    expect(tutorialRuntimeSource).toContain('"awaitingProductiveBurnPreview"');
    expect(tutorialRuntimeSource).toContain('"awaitingProductiveBurnConfirm"');
    expect(tutorialRuntimeSource).toContain('"productiveBurnQueued"');
    expect(tutorialRuntimeSource).toContain('"awaitingProductiveArrival"');
    expect(tutorialRuntimeSource).toContain("productiveBurnOriginNodeId: null");
    expect(tutorialRuntimeSource).toContain("productiveBurnPromptStartedAt: null");
    expect(tutorialRuntimeSource).not.toContain("firstBurnConfirmCameraPoseAssistStarted");
    expect(tutorialRuntimeSource).not.toContain("productiveBurnConfirmCameraPoseAssistStarted");
    expect(tutorialRuntimeSource).not.toContain("shipyardProductionCameraPoseAssistStarted");
    expect(tutorialRuntimeSource).toContain("tutorialBurnDestinationNodeId: null");
    expect(tutorialRuntimeSource).toContain("tutorialBurnArrivalTurn: null");
    expect(uiSource).toContain("resolveTutorialFirstArrival");
    expect(uiSource).toContain("resolveTutorialProductiveArrival");
    expect(uiSource).toContain("focusTutorialArrivalTarget(`node:${arrivalNodeId}`);");
    expect(uiSource).toContain("function focusTutorialTurnSkipArrivalNode");
    expect(uiSource).toContain("focusTargetWithoutZoom(target, { tutorialPan: true });");
    expect(uiSource).toContain("focusTutorialTargetWithoutZoom(target);");
    expect(rendererSource).toContain("const tutorialFocusPanDurationMs = 720;");
    expect(rendererSource).toContain("focusTutorialTargetWithoutZoom(targetKey: string)");
    expect(rendererSource).toContain("allowDuringTurnTransition: true");
    expect(rendererSource).toContain("ignoreSelectionLock: true");
    expect(rendererSource).toContain("options.ignoreSelectionLock !== true");
    expect(uiSource).toContain("focusTutorialTurnSkipArrivalNode(destinationNodeId);");
    expect(uiSource).toContain("focusTutorialTurnSkipArrivalNode(arrivalNodeId);");
    expect(uiSource).toContain("arrivalNodeId?: string | null");
    expect(uiSource).not.toContain("if (!isTutorialShipyardNode(arrivalNodeId))");
    expect(uiSource).not.toContain("function isTutorialShipyardNode");
    expect(uiSource).not.toContain("focusTutorialTargetIfOffScreen");
    expect(uiSource).toContain("autoAdvanceTutorialUntil");
    expect(uiSource).toContain("autoAdvanceTutorialToFirstArrival");
    expect(uiSource).toContain("autoAdvanceTutorialToProductiveArrival");
    expect(uiSource).toContain("autoAdvanceTutorialBurnToDestination");
    expect(uiSource).toContain("resolveTutorialAutoFramedTurn");
    expect(uiSource).toContain("recoverStaleTutorialQueuedBurnIfNeeded");
    expect(uiSource).toContain('tutorial.phase = "awaitingProductiveBurnPreview";');
    expect(uiSource).toContain("tutorial.productiveBurnDestinationNodeId = null;");
    expect(uiSource).toContain("tutorial.tutorialBurnDestinationNodeId = null;");
    expect(uiSource).toContain("updateTutorialCommandConsoleWithTypewriter");
    expect(firstBurnAfterTurnSource).toContain('tutorial.phase = "awaitingFirstArrival";');
    expect(firstBurnAfterTurnSource).toContain("void autoAdvanceTutorialToFirstArrival();");
    expect(firstBurnAfterTurnSource).not.toContain("updateCommandConsole();");
    expect(tutorialAutoResolveTurnSource).toContain(
      "updateTutorialCommandConsoleWithTypewriter();"
    );
    expect(autoAdvanceFirstArrivalSource).toContain(
      "updateTutorialCommandConsoleWithTypewriter();"
    );
    expect(autoAdvanceFirstArrivalSource).not.toContain("updateCommandConsole();");
    expect(uiSource).not.toContain("frameTutorialAutoAdvanceMotionCue");
    expect(uiSource).toContain("startTutorialFirstTritiumPostArrivalWorkTurn");
    expect(tutorialRuntimeSource).toContain('"awaitingFirstTritiumWorkTurn"');
    expect(uiSource).toContain("startTutorialPostMandatoryLaunchEvadeSequence");
    expect(uiSource).toContain("findTutorialEvadeFireSetup");
    expect(uiSource).toContain("maybePauseTutorialEvadeForFirstTritiumArrival");
    expect(uiSource).toContain("continueTutorialBurnOutToDestination");
    expect(uiSource).toContain('tutorialState.phase === "shipyardProduction"');
    expect(uiSource).toContain('tutorialState.phase === "shipyardSupportProduction"');
    expect(uiSource).toContain('tutorialState?.phase === "shipyardSupportProductionCompletion"');
    expect(uiSource).toContain("isTutorialSupportProductionAdvancePrompt");
    expect(uiSource).toContain("hasPlayerShipyardReadyForTutorialMandatoryLaunch");
    expect(uiSource).toContain("shouldRecoverTutorialSupportProductionAdvance");
    expect(uiSource).toContain("tutorialMandatoryLaunchAutoResumeQueued");
    expect(uiSource).toContain("recoverTutorialMandatoryLaunchAutoDestination");
    expect(uiSource).toContain("isTutorialMandatoryLaunchAutoAdvancePending");
    expect(uiSource).toContain("maybeResumeTutorialMandatoryLaunchAutoAdvance");
    expect(uiSource).toContain("isTutorialForcedMandatoryLaunchToEnemyShipyardAutoAdvancing");
    expect(uiSource).toContain("hasReachedDestinationDuringAutoAdvance");
    expect(uiSource).toContain('tutorialState.phase === "mandatoryLaunchQueued"');
    expect(uiSource).toContain("findTrackedTutorialMandatoryLaunchBurn");
    expect(uiSource).toContain("driveTutorialBurnToDestination");
    expect(uiSource).toContain("tutorial.contestedNodeId !== destinationNodeId");
    expect(uiSource).toContain("isTutorialBurnStillPendingOrInFlight(tutorial, destinationNodeId)");
    expect(uiSource).toContain('"shipyardArrivalWork"');
    expect(uiSource).toContain('"shipyardFirePrompt"');
    expect(uiSource).toContain('"shipyardFireQueued"');
    expect(uiSource).toContain('"shipyardFireWorkLesson"');
    expect(uiSource).toContain('"autoAdvancingToShipyardEnemyEvade"');
    expect(uiSource).toContain('"shipyardEnemyEvadeLesson"');
    expect(uiSource).toContain('"autoAdvancingToShipyardEnemyArrival"');
    expect(uiSource).toContain('"autoAdvancingToShipyardContestedBurn"');
    expect(uiSource).toContain('"shipyardContestedFirePrompt"');
    expect(uiSource).toContain('"shipyardContestedFireQueued"');
    expect(uiSource).toContain('"autoAdvancingToShipyardContestedFireImpact"');
    expect(uiSource).toContain('"shipyardContestedBurnPrompt"');
    expect(uiSource).toContain('"shipyardProductionCompletion"');
    expect(uiSource).toContain("startTutorialShipyardArrivalWorkSequence");
    expect(uiSource).toContain("startTutorialShipyardFirePressure");
    expect(uiSource).toContain("continueTutorialToShipyardEnemyEvadeOrMandatoryLaunch");
    expect(uiSource).toContain("observeTutorialShipyardEnemyEvade");
    expect(uiSource).toContain("shipyardEnemyEvadeObserved");
    expect(uiSource).toContain("shipyardEnemyFireImpactTurn");
    expect(uiSource).toContain("hasPlayerFireSolutionTargetingOpponentNode");
    expect(uiSource).toContain("presentTutorialShipyardEnemyEvadeLesson");
    expect(uiSource).toContain("with its hard-kill defenses.");
    expect(uiSource).toContain(
      "The faction pays 1 ΔV for each missile impacting that ship in the turn."
    );
    expect(uiSource).toContain("startTutorialShipyardEnemyContestedApproach");
    expect(uiSource).toContain("completeTutorialShipyardProductionLesson");
    expect(uiSource).toContain("frameTutorialNodeShipCloseup(originNodeId)");
    expect(uiSource).toContain("frameTutorialNodeShipCloseup(shipyardNodeId)");
    expect(uiSource).toContain("function frameTutorialShipyardContestedNodeCloseup");
    expect(uiSource).toContain("focusTutorialOpeningNodeCloseupSmooth(openingTargetKey)");
    expect(uiSource).toContain("frameTutorialShipyardContestedNodeCloseup(contestedNodeId)");
    expect(uiSource).toContain(
      "void startTutorialShipyardArrivalWorkSequence(destinationNodeId, false);"
    );
    expect(uiSource).not.toContain("splitTutorialPlainRowsBySentence");
    expect(uiSource).toContain("rows.map((text, rowIndex) =>");
    expect(uiSource).toContain("tutorial: createTutorialRuntimeDiagnosticDump(tutorialState)");
    expect(tutorialCommandRowsSource).toContain(
      "A SHIPYARD stores a disassembled hull and turns five eligible WORK results into one new ship."
    );
    expect(tutorialCommandRowsSource).toContain(
      "When assembly finishes, a reserve crew transfers from the incumbent ship to commission the new hull. Production itself costs no ΔV."
    );
    expect(tutorialCommandRowsSource).toContain(
      "A ship that began the turn at the yard adds 1/5 progress if it remains eligible to WORK. It makes no progress if it "
    );
    expect(tutorialCommandRowsSource).toContain(
      '{ text: "WARNING:", className: "command-console__event-contested" }'
    );
    expect(shipyardFirePromptRowsSource).not.toContain("createTutorialSpacerRow()");
    expect(shipyardFirePromptRowsSource).toContain(
      "enemy contact. A ship in transit can be targeted through its destination, because FIRE predicts where the target will be when the missile arrives."
    );
    expect(shipyardFirePromptRowsSource).not.toContain(
      '{ text: "Right click anywhere to enter " }'
    );
    expect(tutorialCommandRowsSource).not.toContain(
      "Compact nuclear warheads are the primary weapon of orbital warfare."
    );
    expect(tutorialCommandRowsSource).toContain("createTutorialSpacerRow()");
    expect(tutorialCommandRowsSource).toContain(
      "A ship in transit can be targeted through its destination, because FIRE predicts where the target will be when the missile arrives."
    );
    expect(tutorialCommandRowsSource).not.toContain("Left click to confirm the firing solution.");
    expect(tutorialCommandRowsSource).toContain("A ship can either ");
    expect(tutorialCommandRowsSource).toContain('{ text: "WORK", className: playerClassName }');
    expect(tutorialCommandRowsSource).toContain(" in a turn, not both.");
    expect(tutorialCommandRowsSource).toContain(
      "An orbit occupied by ships from two different factions becomes "
    );
    expect(uiSource).toContain("findTutorialPlayerOpponentContestedNodeId");
    expect(uiSource).toContain("getTutorialShipyardContestedTargetNodeId");
    expect(uiSource).toContain("findTutorialShipyardContestedSupportFireNodeId");
    expect(uiSource).toContain("maybePresentTutorialShipyardContestedCheckpoint");
    expect(uiSource).toContain("tutorial.contestedNodeId = contestedNodeId;");
    expect(uiSource).toContain("isTutorialShipyardContestedCheckpointActive");
    expect(uiSource).toContain("appendTutorialShipyardContestedRuleRows");
    expect(uiSource).toContain("hasTutorialAlphaStrikeSupportAfterCounterContest");
    expect(uiSource).toContain("shouldRecoverTutorialTowardAdditionalPlayerShip");
    expect(uiSource).toContain("findTutorialOccupiedSupportShipyardNodeId");
    expect(uiSource).toContain("getTutorialForcedMandatoryLaunchDestinationNodeId");
    expect(uiSource).toContain("isTutorialCounterContestRecoveryRouteActive");
    expect(uiSource).toContain("hasTutorialBurnReachedDestination");
    expect(uiSource).toContain("isTutorialBurnStillPendingOrInFlight");
    expect(uiSource).toContain("shipyardCounterContestAutoAdvanceConsumed !== true");
    expect(uiSource).toContain("shipyardCounterContestAutoAdvanceConsumed = true;");
    expect(uiSource).toContain("shouldContinueTutorialShipyardCounterContestManually");
    expect(uiSource).toContain("finishTutorialShipyardCounterContestArrival(tutorialState)");
    expect(uiSource).toContain("tutorial.tutorialBurnDestinationNodeId = destinationNodeId;");
    expect(uiSource).toContain('tutorial.loggedKeys.has("tutorial:shipyard-contested-rule")');
    expect(uiSource).toContain("findTutorialEnemyOccupiedShipyardNodeId");
    expect(uiSource).toContain(
      "destinationNodeId === forcedTutorialMandatoryLaunchDestinationNodeId"
    );
    expect(uiSource).toContain("return [`node:${forcedTutorialDestinationNodeId}`];");
    expect(uiSource).toContain("frameTutorialShipyardContestedSupportFirePrompt");
    expect(uiSource).toContain("continueTutorialShipyardContestedFireToEnemyDestroyed");
    expect(uiSource).toContain("tutorial.shipyardContestedRecoveryActive = true;");
    expect(uiSource).toContain('{ text: "Ships occupying a " }');
    expect(uiSource).toContain('{ text: " orbit cannot " }');
    expect(uiSource).toContain('"tutorial:shipyard-contested-evade-unavailable:before"');
    expect(uiSource).toContain('"tutorial:shipyard-contested-evade-unavailable:after"');
    expect(uiSource).toContain(" orbit from this outside support ship. The enemy must either ");
    expect(uiSource).toContain(
      " out before impact or be destroyed, because it cannot EVADE while the lock remains."
    );
    const contestedSupportFirePromptStart = uiSource.indexOf(
      "function presentTutorialShipyardContestedSupportFirePrompt"
    );
    const contestedSupportFirePromptEnd = uiSource.indexOf(
      "async function continueTutorialAfterShipyardContestedBurn",
      contestedSupportFirePromptStart
    );
    const contestedSupportFirePromptSource = uiSource.slice(
      contestedSupportFirePromptStart,
      contestedSupportFirePromptEnd
    );
    const contestedSupportFireFrameStart = uiSource.indexOf(
      "function frameTutorialShipyardContestedSupportFirePrompt"
    );
    const contestedSupportFireFrameEnd = uiSource.indexOf(
      "function frameTutorialShipyardCounterContestBurnPrompt",
      contestedSupportFireFrameStart
    );
    const contestedSupportFireFrameSource = uiSource.slice(
      contestedSupportFireFrameStart,
      contestedSupportFireFrameEnd
    );
    const shipyardFireSetupStart = uiSource.indexOf("function frameTutorialShipyardFireSetup");
    const shipyardFireSetupEnd = uiSource.indexOf(
      "function frameTutorialShipyardEnemyDestination",
      shipyardFireSetupStart
    );
    const shipyardFireSetupSource = uiSource.slice(shipyardFireSetupStart, shipyardFireSetupEnd);
    const shipyardFireRetryStart = uiSource.indexOf(
      "function frameTutorialShipyardFireRetryPrompt"
    );
    const shipyardFireRetryEnd = uiSource.indexOf(
      "function hasPlayerFireSolutionTargetingOpponentNode",
      shipyardFireRetryStart
    );
    const shipyardFireRetrySource = uiSource.slice(shipyardFireRetryStart, shipyardFireRetryEnd);
    const shipyardFireWideStart = uiSource.indexOf(
      "function frameTutorialShipyardFireSelectionWide"
    );
    const shipyardFireWideEnd = uiSource.indexOf(
      "function frameTutorialShipyardCounterContestArrival",
      shipyardFireWideStart
    );
    const shipyardFireWideSource = uiSource.slice(shipyardFireWideStart, shipyardFireWideEnd);
    const shipyardContestedCloseupStart = uiSource.indexOf(
      "function frameTutorialShipyardContestedNodeCloseup"
    );
    const shipyardContestedCloseupEnd = uiSource.indexOf(
      "function syncFocusSelectToTarget",
      shipyardContestedCloseupStart
    );
    const shipyardContestedCloseupSource = uiSource.slice(
      shipyardContestedCloseupStart,
      shipyardContestedCloseupEnd
    );
    const defensiveContestedStart = uiSource.indexOf(
      "async function continueTutorialToDefensiveContestedArrival"
    );
    const defensiveContestedEnd = uiSource.indexOf(
      "async function autoAdvanceTutorialUntil",
      defensiveContestedStart
    );
    const defensiveContestedSource = uiSource.slice(defensiveContestedStart, defensiveContestedEnd);

    expect(contestedSupportFirePromptStart).toBeGreaterThanOrEqual(0);
    expect(contestedSupportFirePromptEnd).toBeGreaterThan(contestedSupportFirePromptStart);
    expect(contestedSupportFireFrameStart).toBeGreaterThanOrEqual(0);
    expect(contestedSupportFireFrameEnd).toBeGreaterThan(contestedSupportFireFrameStart);
    expect(shipyardFireSetupStart).toBeGreaterThanOrEqual(0);
    expect(shipyardFireSetupEnd).toBeGreaterThan(shipyardFireSetupStart);
    expect(shipyardFireRetryStart).toBeGreaterThanOrEqual(0);
    expect(shipyardFireRetryEnd).toBeGreaterThan(shipyardFireRetryStart);
    expect(shipyardFireWideStart).toBeGreaterThanOrEqual(0);
    expect(shipyardFireWideEnd).toBeGreaterThan(shipyardFireWideStart);
    expect(shipyardContestedCloseupStart).toBeGreaterThanOrEqual(0);
    expect(shipyardContestedCloseupEnd).toBeGreaterThan(shipyardContestedCloseupStart);
    expect(defensiveContestedStart).toBeGreaterThanOrEqual(0);
    expect(defensiveContestedEnd).toBeGreaterThan(defensiveContestedStart);
    expect(contestedSupportFirePromptSource).not.toContain(
      'parts: [{ text: "Left click to confirm firing solution." }]'
    );
    expect(contestedSupportFireFrameSource).toContain("selectTutorialTarget(supportTarget)");
    expect(contestedSupportFireFrameSource).not.toContain(
      "selectTutorialFireOriginTarget(supportTarget)"
    );
    expect(shipyardFireSetupSource).toContain("selectTutorialTarget(originTarget)");
    expect(shipyardFireSetupSource).not.toContain("selectTutorialFireOriginTarget(originTarget)");
    expect(shipyardFireSetupSource).not.toContain("focusActiveBurnChaseSmooth");
    expect(shipyardFireRetrySource).not.toContain("frameTargetsAroundFocusSmooth");
    expect(shipyardFireRetrySource).not.toContain("focusTargetWithoutZoom");
    expect(shipyardFireWideSource).toContain("selectTutorialTarget(originTarget)");
    expect(shipyardFireWideSource).not.toContain("selectTutorialFireOriginTarget(originTarget)");
    expect(shipyardFireWideSource).not.toContain("zoomBackTutorialShipyardFireEnemy");
    expect(shipyardFireWideSource).not.toContain("startTutorialCameraPoseAssist({");
    expect(shipyardFireWideSource).not.toContain("zoomOnly: true");
    expect(shipyardFireWideSource).not.toContain("targetKey: enemyBurnTargetKey");
    expect(shipyardFireWideSource).not.toContain("canStartTutorialCameraAssist(");
    expect(shipyardFireWideSource).not.toContain("frameTargetsAroundFocusObliqueInstant");
    expect(shipyardFireWideSource).not.toContain("frameTargetsAroundFocusObliqueSmooth");
    expect(shipyardFireWideSource).not.toContain("focusActiveBurnChaseSmooth");
    expect(shipyardFireWideSource).not.toContain("focusTarget(");
    expect(shipyardContestedCloseupSource).toContain("selectTutorialTarget(target)");
    expect(shipyardContestedCloseupSource).not.toContain(
      "nodeId === tutorialFallbackShipyardNodeId"
    );
    expect(shipyardContestedCloseupSource).not.toContain("startTutorialCameraPoseAssist({");
    expect(shipyardContestedCloseupSource).not.toContain("focusTutorialOpeningNodeCloseupSmooth");
    expect(shipyardContestedCloseupSource).not.toContain(
      "rememberTutorialSettledCameraAssistAnchor()"
    );
    expect(defensiveContestedSource).not.toContain("focusTarget(");
    expect(defensiveContestedSource).toContain("selectTutorialTarget(`node:${contestedNodeId}`)");
    expect(tutorialCommandRowsSource).toContain(
      " ships cannot WORK, FIRE or EVADE. Each faction pays 2 ΔV at the start of every turn to keep its ship in the lock."
    );
    expect(tutorialCommandRowsSource).toContain(
      "Left-click the target marker to confirm this firing solution."
    );
    expect(tutorialCommandRowsSource).toContain(
      "Left-click a valid destination to confirm the BURN."
    );
    expect(tutorialCommandRowsSource).toContain("options?.zoomHintText");
    expect(tutorialCommandRowsSource).toContain("options?.cameraPanOrbitHintText");
    expect(tutorialCommandRowsSource).toContain("key: `${key}:zoom-hint`");
    expect(tutorialCommandRowsSource).toContain(
      "createTutorialSpacerRow(`${key}:zoom-hint-spacer`)"
    );
    expect(tutorialCommandRowsSource).toContain("key: `${key}:camera-pan-orbit-hint`");
    expect(tutorialCommandRowsSource).toContain(
      "createTutorialSpacerRow(`${key}:camera-pan-orbit-hint-lead-spacer`)"
    );
    expect(tutorialCommandRowsSource).toContain(
      "createTutorialSpacerRow(`${key}:camera-pan-orbit-hint-spacer`)"
    );
    expect(tutorialCommandRowsSource).toContain("createTutorialOpeningCameraControlLiveRows");
    expect(tutorialCommandRowsSource).toContain("key: `${key}:orbit`");
    expect(tutorialCommandRowsSource).toContain("createTutorialSpacerRow(`${key}:select-spacer`)");
    expect(tutorialCommandRowsSource).toContain("createTutorialZoomFocusLiveRows");
    expect(tutorialCommandRowsSource).toContain("key: `${key}:zoom`");
    expect(tutorialCommandRowsSource).toContain("createTutorialSpacerRow(`${key}:spacer`)");
    expect(tutorialCommandRowsSource).toContain("key: `${key}:focus`");
    expect(uiSource).toContain("createTutorialOpeningCameraControlLiveRows(");
    expect(uiSource).toContain("tutorialCameraOrbitHintText");
    expect(uiSource).toContain("tutorialCameraPanHintText");
    expect(uiSource).not.toContain(
      "...(tutorial.hasZoomedOutCamera ? {} : { zoomHintText: tutorialCameraZoomHintText })"
    );
    expect(uiSource).toContain("zoomHintText: tutorialCameraZoomHintText");
    expect(uiSource).toContain("cameraPanOrbitHintText: getTutorialConfirmCameraPanOrbitHintText(");
    expect(uiSource).toContain("void startedAt;");
    expect(uiSource).toContain("return undefined;");
    expect(uiSource).toContain("tutorialConfirmCameraHintRefreshTimer");
    expect(uiSource).toContain("syncTutorialConfirmCameraHintRefreshTimer");
    expect(uiSource).toContain("getTutorialLiveHints");
    expect(uiSource).toContain("getTutorialZoomFocusHintDueAt");
    expect(uiSource).toContain("queueTutorialZoomFocusHintCameraCheck");
    expect(uiSource).toContain("void now;");
    expect(uiSource).toContain("return null;");
    expect(uiSource).not.toContain("tutorialConfirmCameraPanOrbitHintDelayMs");
    expect(uiSource).not.toContain("tutorialVeryZoomedOutHintDelayMs");
    expect(uiSource).toContain("await startTutorialPostMandatoryLaunchEvadeSequence();");
    expect(uiSource).not.toContain('"EVADE AUTO"');
    expect(uiSource).not.toContain('"Missile avoided."');
    expect(uiSource).not.toContain('"Ship action spent: no WORK this turn."');
    expect(uiSource).not.toContain("Starting from next turn");
    expect(uiSource).toContain("appendTutorialTurnOnlySnapshot");
    expect(uiSource).toContain("getTutorialOpeningYearTimelineRows");
    expect(tutorialCommandRowsSource).toContain('parts: [{ text: "2079" }]');
    expect(tutorialCommandRowsSource).toContain('key: "tutorial-opening-year"');
    expect(uiSource).toContain("ignoreMandatoryLaunchLock: true");
    expect(uiSource).not.toContain("Second friendly ship assigned");
    expect(uiSource).not.toContain("tutorial:tritium-anchor-online");
    expect(uiSource).not.toContain("TRITIUM SHIP UNLOCKED");
    expect(uiSource).toContain("getTurnOnlyCommandTimelineRows");
    expect(uiSource).not.toContain("Execute turns until arrival.");
    expect(uiSource).not.toContain("tutorial:first-ship-in-transit");
    expect(uiSource).not.toContain("SHIP IN TRANSIT");
    expect(uiSource).not.toContain("No WORK on arrival turn.");
    expect(uiSource).not.toContain("Select a SHIPYARD node later to train production.");
    expect(uiSource).toContain("onInputGesture");
    expect(uiSource).not.toContain("press execute");
    expect(uiSource).not.toContain("PENDING ORDER");
    expect(uiSource).not.toContain("ORDER PLANNED");
    expect(tutorialConstantsSource).toContain("const tutorialCameraGuidancePaused = true");
    expect(tutorialConstantsSource).toContain(
      '"Drag with the left button to pan the camera, or with the right button to orbit it."'
    );
    expect(tutorialConstantsSource).toContain('"Use the mouse wheel to zoom in or out."');
    expect(tutorialConstantsSource).toContain('"Drag with the right button to orbit the camera."');
    expect(tutorialConstantsSource).toContain('"Drag with the left button to pan the camera."');
    expect(tutorialConstantsSource).toContain(
      '"Double-click a visible target to focus the camera on it."'
    );
    expect(tutorialConstantsSource).not.toContain("tutorialConfirmCameraPanOrbitHintDelayMs");
    expect(tutorialConstantsSource).not.toContain("tutorialVeryZoomedOutHintDelayMs");
    expect(tutorialConstantsSource).toContain(
      '"Drag with the left button to pan, or with the right button to orbit the camera."'
    );
    expect(uiSource).toContain('gesture === "wheel-zoom-out"');
    expect(uiSource).toContain("tutorial.hasZoomedOutCamera = true;");
    expect(tutorialRuntimeSource).toContain("hasZoomedOutCamera: boolean");
    expect(tutorialRuntimeSource).toContain("hasZoomedOutCamera: false");
    expect(uiSource).not.toContain("Right click and drag to orbit camera.");
    expect(uiSource).not.toContain("Left click and drag to pan.");
    expect(uiSource).not.toContain("formatTutorialBurnLine");
    expect(uiSource).not.toContain("formatTutorialFireLine");
    expect(uiSource).toContain("tutorialState !== null");
    expect(uiSource).toContain("frameTutorialOpeningCamera");
    expect(uiSource).toContain("hasMovedTutorialOpeningCamera = false");
    expect(uiSource).toContain("tutorialCameraAssistAnchor: CinematicCameraState | null = null");
    expect(uiSource).toContain("function isTutorialFirstTurn(): boolean");
    expect(uiSource).toContain("return tutorialState !== null && state.turn === 0;");
    expect(uiSource).toContain("function areTutorialCameraMovesEnabled(): boolean");
    expect(uiSource).toContain("return isTutorialFirstTurn() && !tutorialCameraGuidancePaused;");
    expect(uiSource).toContain(
      "const turnScopedRows = isTutorialFirstTurn() ? rows : removeTutorialCameraHintRows(rows);"
    );
    expect(uiSource).toContain("if (isTutorialFirstTurn()) {");
    expect(uiSource).toContain("!areTutorialCameraMovesEnabled()");
    expect(uiSource).toContain(
      "(areTutorialCameraMovesEnabled() && !hasMovedTutorialOpeningCamera)"
    );
    expect(uiSource).toContain("cinematicRenderer?.focusTutorialOpeningNodeCloseupSmooth");
    expect(uiSource).toContain("canStartTutorialCameraAssist(");
    expect(uiSource).toContain("rememberTutorialSettledCameraAssistAnchor();");
    expect(uiSource).toContain("isTutorialCameraMovementGesture(gesture)");
    expect(uiSource).toContain('tutorial?.phase === "awaitingInitialSelection"');
    expect(tutorialConstantsSource).toContain("const tutorialOpeningCameraPose = {");
    expect(tutorialConstantsSource).toContain("focus: [-626.4921636184937, 0, 117.46770595701868]");
    expect(tutorialConstantsSource).toContain("yaw: -2.5743606466916362");
    expect(tutorialConstantsSource).toContain("pitch: 0.9100000000000004");
    expect(tutorialConstantsSource).toContain("distance: 2168.3260012386177");
    expect(tutorialConstantsSource).not.toContain("tutorialFirstBurnConfirmCameraPose");
    expect(tutorialConstantsSource).toContain('tutorialFallbackShipyardNodeId = "mars_node"');
    expect(tutorialConstantsSource).toContain(
      "focusedTargetKey: `node:${tutorialOpeningOriginNodeId}`"
    );
    expect(tutorialConstantsSource).toContain(
      "trackedFocusTargetKey: `node:${tutorialOpeningOriginNodeId}`"
    );
    expect(tutorialConstantsSource).toContain(
      "displayScaleFocusTargetKey: `node:${tutorialOpeningOriginNodeId}`"
    );
    expect(tutorialConstantsSource).toContain("displayScaleDistance: 2168.3260012386177");
    expect(tutorialConstantsSource).toContain("const tutorialFirstTritiumArrivalCameraPose = {");
    expect(tutorialConstantsSource).toContain("focus: [-330.78766944588017, 0, 994.3844198630817]");
    expect(tutorialConstantsSource).toContain(
      "focusOffset: [-246.74149069172364, 0, -50.21133373551964]"
    );
    expect(tutorialConstantsSource).toContain("yaw: -7.917804253833143");
    expect(tutorialConstantsSource).toContain("distance: 140.53901495760698");
    expect(tutorialConstantsSource).toContain('focusedTargetKey: "node:venus_node"');
    expect(tutorialConstantsSource).toContain('trackedFocusTargetKey: "node:venus_node"');
    expect(tutorialConstantsSource).not.toContain("tutorialProductiveBurnConfirmCameraPose");
    expect(tutorialConstantsSource).not.toContain("tutorialShipyardProductionCameraPose");
    expect(tutorialConstantsSource).not.toContain("tutorialShipyardContestedBurnCameraPose");
    expect(tutorialConstantsSource).not.toContain("tutorialShipyardFireTransitCameraPose");
    expect(uiSource).toContain("startTutorialFirstBurnCameraAssist()");
    expect(uiSource).not.toContain("maybeStartTutorialFirstBurnConfirmCameraAssist()");
    expect(uiSource).not.toContain("queueTutorialFirstBurnConfirmCameraAssistCheck()");
    expect(uiSource).toContain('tutorial.phase === "awaitingFirstBurnConfirm"');
    expect(uiSource).not.toContain("pose: tutorialFirstBurnConfirmCameraPose");
    expect(uiSource).toContain("shouldStartTutorialProductiveBurnCameraAssist");
    expect(uiSource).not.toContain("maybeStartTutorialProductiveBurnConfirmCameraAssist()");
    expect(uiSource).not.toContain("queueTutorialProductiveBurnConfirmCameraAssistCheck()");
    expect(uiSource).toContain("tutorial.productiveBurnOriginNodeId === tutorialEnemyFireNodeId");
    expect(uiSource).not.toContain("cinematicRenderer.isTargetVisibleInViewport(targetKey, 0.08)");
    expect(uiSource).not.toContain("pose: tutorialProductiveBurnConfirmCameraPose");
    expect(uiSource).not.toContain("maybeStartTutorialShipyardProductionCameraAssist()");
    expect(uiSource).not.toContain("queueTutorialShipyardProductionCameraAssistCheck()");
    expect(uiSource).not.toContain(
      "tutorial.shipyardLessonNodeId === tutorialFallbackShipyardNodeId"
    );
    expect(uiSource).not.toContain("pose: tutorialShipyardProductionCameraPose");
    expect(uiSource).toContain("startTutorialShipyardBurnCameraAssist()");
    expect(uiSource).toContain("tutorialFirstTritiumArrivalCameraPose");
    expect(uiSource).toContain("tutorialShipyardArrivalCameraPose");
    expect(uiSource).not.toContain("tutorialShipyardContestedBurnCameraPose");
    expect(uiSource).not.toContain("tutorialShipyardFireTransitCameraPose");
    expect(uiSource).toContain("startTutorialNodeToNodeBurnCameraAssist({");
    expect(uiSource).toContain("didStartNodeToNodeAssist");
    expect(uiSource).toContain("startTutorialTargetScreenNudgeCameraAssist({");
    expect(uiSource).not.toContain("startTutorialCameraPoseAssist({");
    expect(uiSource).toContain("const targetKey = `node:${tutorialEnemyFireNodeId}`");
    expect(uiSource).toContain(
      "const targetTurn = tutorialState?.firstBurnArrivalTurn ?? undefined"
    );
    expect(uiSource).toContain(
      "const targetTurn = tutorial.productiveBurnArrivalTurn ?? undefined"
    );
    expect(uiSource).toContain(
      "if (!canStartTutorialCameraAssist(targetKey, tutorialFirstTritiumArrivalCameraPose.distance))"
    );
    expect(uiSource).toContain(
      "if (!canStartTutorialCameraAssist(targetKey, tutorialShipyardArrivalCameraPose.distance))"
    );
    expect(uiSource).toContain("...(targetTurn === undefined ? {} : { targetTurn })");
    expect(rendererSource).toContain("startTutorialNodeToNodeBurnCameraAssist(");
    expect(rendererSource).toContain("startTutorialTargetScreenNudgeCameraAssist(");
    expect(rendererSource).not.toContain("startTutorialCameraPoseAssist(");
    expect(rendererSource).toContain("focusTargetIfOffScreenWithoutZoom(targetKey: string)");
    expect(rendererSource).toContain("isTargetOnScreen(targetKey: string): boolean");
    expect(rendererSource).toContain("isTargetVisibleInViewport(targetKey: string");
    expect(rendererSource).toContain("projectWorldPointToExtendedScreen(targetPosition");
    expect(rendererSource).toContain("projectWorldPointToViewportScreen(position");
    expect(rendererSource).toContain("captureTutorialCameraAnchorState()");
    expect(rendererSource).toContain("isTutorialCameraAssistAllowed(");
    expect(rendererSource).toContain("isCameraNearTutorialAssistAnchor(");
    expect(rendererSource).toContain("isTutorialCameraDistanceComparableTo(");
    expect(rendererSource).toContain("targetTurn?: number;");
    expect(rendererSource).toContain("pendingTutorialNodeToNodeCameraAssist");
    expect(rendererSource).toContain("tutorialNodeToNodeCameraAssist");
    expect(rendererSource).toContain("pendingTutorialScreenNudgeCameraAssist");
    expect(rendererSource).toContain("tutorialScreenNudgeCameraAssist");
    expect(rendererSource).toContain("applyPendingTutorialNodeToNodeCameraAssist(");
    expect(rendererSource).toContain("applyPendingTutorialScreenNudgeCameraAssist(");
    expect(rendererSource).toContain("findTutorialScreenNudgeTargetPosition(");
    expect(rendererSource).toContain(
      "this.getDisplayNodeRenderDataAtTurn(nodeId, targetTurn)?.center.clone()"
    );
    expect(rendererSource).toMatch(
      /this\.findTutorialScreenNudgeTargetPosition\(\s*assist\.targetKey,\s*assist\.targetTurn\s*\)/
    );
    expect(rendererSource).toContain("updateTutorialNodeToNodeCameraAssist(");
    expect(rendererSource).toContain("arrivalTurn: matchingOrder.arrivalTurn");
    expect(rendererSource).toContain("originTurn: from.turn");
    expect(rendererSource).toContain("journeyTurns * perTurnAssistDurationMs");
    expect(rendererSource).toContain("const arrivalReady =");
    expect(rendererSource).toContain("tutorialNodeToNodeCameraAssistYawDelayProgress");
    expect(rendererSource).toContain("curveControlFocus");
    expect(rendererSource).toContain("createTutorialNodeToNodeCameraAssistControlFocus(");
    expect(rendererSource).toContain("sampleTutorialNodeToNodeCameraAssistFocus(");
    expect(rendererSource).toContain("const progress = elapsedProgress;");
    expect(rendererSource).toContain("const yawProgress =");
    expect(rendererSource).toContain("if (!arrivalReady)");
    expect(rendererSource).toContain("const tutorialNodeToNodeCameraAssistYawDelayProgress = 0.78");
    expect(rendererSource).toContain("findSnapshotDisplayTargetPosition(");
    expect(rendererSource).toContain("visualTurn: snapshot.turn");
    expect(rendererSource).toContain("this.getSnapshotForDisplayTurn(matchingOrder.arrivalTurn)");
    expect(rendererSource).toContain("assist.destinationTargetKey, arrivalSnapshot");
    expect(rendererSource).not.toContain("assist.destinationTargetKey, to");
    expect(rendererSource).toContain(
      "const resolvedTargetFocus = snapshotTargetFocus ?? fallbackTargetFocus"
    );
    expect(rendererSource).toContain("displayScaleFocusTargetKey,");
    expect(rendererSource).toContain("displayScaleDistance: targetDistance");
    expect(rendererSource).toContain("this.tutorialNodeToNodeCameraAssist.displayScaleDistance");
    expect(rendererSource).toContain("updateTutorialScreenNudgeCameraAssist(");
    expect(rendererSource).toContain("zoomOnly?: boolean");
    expect(rendererSource).toContain("targetDistance?: number");
    expect(rendererSource).toContain("createTutorialZoomOnlyScreenNudgeCameraAssist(");
    expect(rendererSource).toContain("this.distance = THREE.MathUtils.lerp(");
    expect(rendererSource).toContain("assist.startDistance,\n      assist.targetDistance");
    expect(rendererSource).toContain("targetFocus: this.focus.clone()");
    expect(rendererSource).toContain("requestedTargetDistance");
    expect(rendererSource).toContain("Math.max(high, requestedTargetDistance)");
    expect(rendererSource).toContain("pendingTutorialScreenNudgeCameraAssist.targetDistance");
    expect(tutorialConstantsSource).toContain("const tutorialShipyardArrivalCameraPose = {");
    expect(tutorialConstantsSource).toContain("focus: [1751.3593871687688, 0, 528.7665738281923]");
    expect(tutorialConstantsSource).toContain(
      "focusOffset: [-47.447298353907854, 0, 195.37746071696057]"
    );
    expect(tutorialConstantsSource).toContain("yaw: -5.017390191333303");
    expect(tutorialConstantsSource).toContain("distance: 233.87052237583006");
    expect(tutorialConstantsSource).toContain(
      "focusedTargetKey: `node:${tutorialFallbackShipyardNodeId}`"
    );
    expect(tutorialConstantsSource).toContain(
      "trackedFocusTargetKey: `node:${tutorialFallbackShipyardNodeId}`"
    );
    expect(uiSource).toContain(
      "tutorialState.productiveBurnDestinationNodeId === tutorialFallbackShipyardNodeId"
    );
    expect(uiSource).toContain("node.id === tutorialFallbackShipyardNodeId");
    expect(uiSource).toContain('type: "shipyard"');
    expect(uiSource).toContain("allowsShipyard: true");
    expect(tutorialCameraSource).toContain("renderer.setSnapshot(snapshot)");
    expect(tutorialCameraSource).toContain("selectedTargetKey = null");
    expect(tutorialCameraSource).toContain("syncFocusSelectToTarget(null)");
    expect(tutorialCameraSource).toContain("renderer.selectTarget(null)");
    expect(tutorialCameraSource).toContain("if (!areTutorialCameraMovesEnabled())");
    expect(tutorialCameraSource).toContain("tutorialCameraAssistAnchor = null");
    expect(tutorialCameraSource).toContain(
      "const openingCameraPose = isGameMenuDemoActive\n      ? gameMenuOpeningCameraPose\n      : tutorialOpeningCameraPose"
    );
    expect(tutorialCameraSource).toContain("const activeOpeningCameraPose = isTrailerScreenActive");
    expect(tutorialCameraSource).toContain("focus.fromArray([...activeOpeningCameraPose.focus])");
    expect(tutorialCameraSource).toContain("renderer.restoreCameraState");
    expect(tutorialCameraSource).toContain("yaw: activeOpeningCameraPose.yaw");
    expect(tutorialCameraSource).toContain("pitch: activeOpeningCameraPose.pitch");
    expect(tutorialCameraSource).toContain("distance: activeOpeningCameraPose.distance");
    expect(tutorialCameraSource.match(/renderer\.restoreCameraState\(/g)).toHaveLength(1);
    expect(tutorialCameraSource).not.toContain("const gameMenuCamera");
    expect(tutorialCameraSource).not.toContain("frameTargetsToScreenAnchorsInstant");
    expect(tutorialCameraSource).not.toContain("tutorialOpeningCameraAnchors");
    expect(tutorialCameraSource).not.toContain("getTutorialOpeningCameraPadding()");
    expect(tutorialCameraSource).not.toContain("tutorialOpeningCameraFallbackTargets");
    expect(tutorialCameraSource).not.toContain(
      "selectTutorialTarget(`node:${tutorialOpeningOriginNodeId}`)"
    );
    expect(tutorialCameraSource).not.toContain("fitSystem();");
    expect(tutorialCommandRowsSource).toContain("command-console__line--tutorial-live-hint");
    expect(uiSource).toContain("getTutorialLiveHints");
    expect(tutorialCommandRowsSource).toContain("command-console__line--tutorial-complete-hint");
    expect(uiSource).toContain("tutorial:live-confirm-first-burn");
    expect(uiSource).toContain("tutorial:live-reselect-first-burn-ship");
    expect(uiSource).toContain("tutorial:live-confirm-productive-burn");
    expect(uiSource).toContain("getTutorialRequiredShipSelection");
    expect(uiSource).toContain("getTutorialRequiredFireMode");
    expect(uiSource).toContain("tutorial:live-reselect-productive-burn-ship");
    expect(uiSource).toContain("tutorial:live-reselect-shipyard-fire-ship");
    expect(uiSource).toContain("tutorial:live-enter-shipyard-fire-mode");
    expect(uiSource).toContain("tutorial:live-reselect-burn-out-ship");
    expect(uiSource).toContain("tutorial:live-confirm-burn-out");
    expect(tutorialCommandRowsSource).toContain('{ text: "Right-click anywhere to enter " }');
    expect(tutorialCommandRowsSource).toContain('{ text: "Every " }');
    expect(tutorialCommandRowsSource).toContain('{ text: "BURN", className: playerClassName }');
    expect(tutorialCommandRowsSource).toContain(
      " commits both time and ΔV. Its T+ value is the number of turns before the ship reaches its destination; one Earth-Moon transfer is roughly three days."
    );
    expect(tutorialCommandRowsSource).toContain(
      'createTutorialSpacerRow("tutorial:first-burn-time-cost:lead-spacer")'
    );
    expect(uiSource).toContain("appendTutorialFirstBurnTimeCostOnce()");
    expect(uiSource).toContain('"mandatory-launch-arrival"');
    expect(uiSource).toContain("continueTutorialAfterMandatoryLaunchArrival");
    expect(uiSource).toContain("rows.push(...tutorialLiveRows.postOrders)");
    expect(uiSource).toContain('row.key === "tutorial:first-burn-time-cost"');
    expect(uiSource).toContain("tutorialLiveHintClassName");
    expect(tutorialCommandRowsSource).toContain("tutorialDelayedLiveHintClassName");
    expect(tutorialCommandRowsSource).toContain(
      '{ text: "Left-click the destination to confirm the " }'
    );
    expect(uiSource).not.toContain("Left click to confirm transfer burn.");
    expect(uiSource).toContain("includeTutorialHints: false");
    expect(uiSource).toContain("return rows.filter((row) => row.key !== undefined);");
    expect(uiSource).toContain("TUTORIAL TEXT OFF");
    expect(uiSource).toContain("CONTEXT BLINK OFF");
    expect(uiSource).toContain('type TutorialOverlayMode = "on" | "off"');
    expect(uiSource).toContain("tutorialOverlayTextMode");
    expect(uiSource).toContain("tutorialOverlayBlinkMode");
    expect(uiSource).toContain("getTutorialOverlayLiveHint");
    expect(uiSource).toContain("getTutorialOverlayGuidanceAttentionPulse");
    expect(uiSource).toContain("getTutorialOverlayGuidanceAttentionTarget");
    expect(tutorialConstantsSource).toContain("tutorialOverlayGuidanceDelayMs = 4200");
    expect(tutorialConstantsSource).toContain("mandatoryLaunchGuidanceDelayMs = 3200");
    expect(uiSource).toContain("getCinematicGuidanceAttentionPulse");
    expect(uiSource).toContain("getMandatoryLaunchGuidanceAttentionPulse");
    expect(uiSource).toContain("getMandatoryLaunchGuidanceAttentionTarget");
    expect(uiSource).toContain("getMandatoryLaunchPromptTargetKeys");
    expect(uiSource).toContain("plan?.isAffordable !== true");
    expect(uiSource).toContain("executePromptAttentionDelayMs = 3600");
    expect(uiSource).toContain("tutorialState !== null");
    expect(uiSource).toContain("hasConfirmedPlayerOrderAfterSelection");
    expect(uiSource).toContain("markPlayerOrderConfirmedAfterSelection");
    expect(uiSource).toContain("getPendingPlayerBurnOrFireOrderCount() > 0");
    expect(uiSource).toContain("shouldPulseExecuteQuestion");
    expect(tutorialRuntimeSource).toContain("firstSelectionAt: null");
    expect(tutorialRuntimeSource).toContain("firstBurnReselectionStartedAt: null");
    expect(tutorialRuntimeSource).toContain("firstBurnPreviewDestinationNodeId: null");
    expect(tutorialRuntimeSource).toContain("productiveBurnReselectionStartedAt: null");
    expect(tutorialConstantsSource).toContain("tutorialFirstBurnConfusionDelayMs");
    expect(uiSource).toContain("getTutorialGuidanceAttentionPulse");
    expect(uiSource).toContain("getTutorialGuidanceAttentionTarget");
    expect(uiSource).toContain('colorRole?: "burn-preview"');
    expect(uiSource).toContain('nodeBlinkMode?: "on-off"');
    expect(uiSource).not.toContain('nodeBlinkMode: "on-off"');
    expect(uiSource).not.toContain("pinPriorityBurnConnector");
    expect(uiSource).toContain('colorRole: "burn-preview" as const');
    const tutorialGuidanceTargetStart = uiSource.indexOf(
      "function getTutorialGuidanceAttentionTarget"
    );
    const selectShipAttentionStart = uiSource.indexOf(
      "const requiredShipSelection = getTutorialRequiredShipSelection(tutorial);",
      tutorialGuidanceTargetStart
    );
    const selectShipAttentionEnd = uiSource.indexOf(
      "const requiredFireMode = getTutorialRequiredFireMode(tutorial);",
      selectShipAttentionStart
    );
    const selectShipAttentionSource = uiSource.slice(
      selectShipAttentionStart,
      selectShipAttentionEnd
    );
    expect(selectShipAttentionStart).toBeGreaterThanOrEqual(0);
    expect(selectShipAttentionEnd).toBeGreaterThan(selectShipAttentionStart);
    expect(selectShipAttentionSource).toContain('colorRole: "burn-preview" as const');
    expect(selectShipAttentionSource).not.toContain('nodeBlinkMode: "on-off"');
    expect(uiSource).toContain("burnConfirmGuidancePulseSeconds = 0.42");
    expect(uiSource).toContain("burnConfirmGuidanceIntensityFloor = 0.38");
    expect(uiSource).toContain("getTutorialFirstBurnAttentionTargetKeys");
    expect(uiSource).toContain("getTutorialProductiveBurnPromptTargetKeys");
    expect(uiSource).toContain("getTutorialShipyardContestedBurnPromptTargetKeys");
    expect(uiSource).toContain(
      '(node.type !== "shipyard" && node.type !== "tritium" && node.type !== "barren")'
    );
    expect(uiSource).toContain("const hasShipyardTarget = candidateTargets.some");
    expect(uiSource).toContain("!hasShipyardTarget || target.typePriority === 0");
    expect(uiSource).toContain('tutorial.phase === "awaitingFirstBurnConfirm"');
    expect(uiSource).toContain('colorRole: "burn-preview" as const');
    expect(uiSource).toContain("`node:${tutorialEnemyFireNodeId}`");
    expect(uiSource).toContain("`node:${tutorialFallbackShipyardNodeId}`");
    expect(uiSource).toContain(
      "const productiveShipyardTargetKey = `node:${tutorialFallbackShipyardNodeId}`"
    );
    expect(uiSource).toContain(
      "const candidateTargetKeys = shouldUseShipyardHintPulse ? [] : promptTargetKeys.slice(1)"
    );
    expect(uiSource).toContain("!promptTargetKeys.includes(productiveShipyardTargetKey)");
    expect(uiSource).toContain("candidateTargetKeys: []");
    const firstBurnAttentionStart = uiSource.indexOf("const isAwaitingFirstBurnTarget =");
    const firstBurnAttentionEnd = uiSource.indexOf(
      "function getTutorialFirstBurnAttentionTargetKeys",
      firstBurnAttentionStart
    );
    expect(firstBurnAttentionStart).toBeGreaterThanOrEqual(0);
    expect(firstBurnAttentionEnd).toBeGreaterThan(firstBurnAttentionStart);
    expect(uiSource).not.toContain("shouldPulseTutorialFirstBurnShipyardHint");
    expect(uiSource).not.toContain(
      "pulseCandidateTargets: shouldPulseTutorialFirstBurnShipyardHint"
    );
    expect(rendererSource).toContain("? targetKey === pulse.targetKey ||");
    expect(rendererSource).toContain(
      "(targetKeys.includes(targetKey) && this.isTutorialAttentionPulseTargetVisible(targetKey))"
    );
    expect(rendererSource).not.toContain("tutorial-attention-distance-pulse");
    expect(rendererSource).not.toContain("tutorialAttentionDistancePingCoreMinScreenPixels");
    expect(rendererSource).toContain("tutorialAttentionNodeColorPulseMinMix");
    expect(rendererSource).toContain("tutorialAttentionNodeColorPulseMaxMix");
    expect(rendererSource).toContain("getTutorialAttentionNodeColorPulse");
    expect(rendererSource).toContain("getTutorialAttentionNodeColor");
    expect(rendererSource).toContain("pulsedOccupancyColor");
    expect(rendererSource).toContain("tutorialNodeBlinkBoost");
    expect(rendererSource).toContain("tutorialNodeBlinkBoost * 0.48");
    expect(rendererSource).toContain("tutorialNodeBlinkBoost * 0.82");
    expect(rendererSource).not.toContain("createTutorialAttentionDistancePulseMarker");
    expect(rendererSource).not.toContain(
      'getSharpPointTexture("tutorial-attention-distance-pulse-core"'
    );
    expect(rendererSource).not.toContain("syncTutorialAttentionDistancePulse");
    expect(uiSource).not.toContain("tutorialFirstBurnPromptNodeId");
    expect(uiSource).not.toContain("const candidateNodes = [");
    expect(uiSource).toContain("destinationNodeId !== originNodeId");
    expect(uiSource).toContain("isSuggestedBurnGuidanceNode(node)");
    expect(uiSource).toContain("focusTargetWithoutZoom(target)");
    expect(uiSource).toContain("candidateTargetKeys: target.candidateTargetKeys");
    expect(uiSource).toContain("musicEngine.getVisualPulse()");
    expect(uiSource).toContain("getGuidanceFallbackPulseIntensity");
    expect(uiSource).toContain("getProductiveMarkerVisualPulse");
    expect(uiSource).toContain("getRawMusicBeatVisualPulse");
    expect(uiSource).toContain("musicPulse.secondsPerPulse * 2");
    expect(uiSource).toContain("slowPulseSlot === 0 ? musicPulse.intensity : 0");
    expect(uiSource).toContain("appendTutorialLog");
    expect(uiSource).toContain("appendTutorialTimelineRows");
    expect(uiSource).toContain('{ text: "BURN", className: getCommandFactionClass("player") }');
    expect(uiSource).toContain('{ text: "FIRE", className: getCommandFactionClass("player") }');
    expect(uiSource).toContain('{ text: "EVADE", className: getCommandFactionClass("player") }');
    expect(uiSource).not.toContain(
      '{ text: "BURNs", className: getCommandFactionClass("player") }'
    );
    expect(uiSource).not.toContain(
      '{ text: "FIREs", className: getCommandFactionClass("player") }'
    );
    expect(uiSource).not.toContain(
      '{ text: "EVADES", className: getCommandFactionClass("player") }'
    );
    expect(uiSource).toContain("beginTutorialProductiveBurnPrompt(destinationNodeId)");
    expect(uiSource).toContain("beginProductiveNodeBranch(arrivalNodeId)");
    expect(uiSource).toContain("getTutorialProductiveBurnTypePriority");
    expect(uiSource).toContain("command-console__line--tutorial");
    expect(uiSource).toContain("freezeTutorialLiveHintsToTranscript");
    expect(uiSource).toContain("freezeTutorialLiveHintClassName");
    expect(tutorialCommandRowsSource).toContain(
      'value !== "command-console__line--tutorial-live-hint"'
    );
    expect(uiSource).toContain('"tutorial:first-burn-live-hints-frozen"');
    expect(uiSource).toContain('"tutorial:productive-burn-live-hints-frozen"');
    expect(uiSource).toContain("getFrozenCommandSnapshotAppendOptions");
    expect(uiSource).toContain("const options = getFrozenCommandSnapshotAppendOptions();");
    expect(uiSource).toContain("return { typewriter: false };");
    expect(uiSource).toContain("getTutorialTurnSnapshotAppendOptions");
    expect(uiSource).toContain("const options = getTutorialTurnSnapshotAppendOptions();");
    expect(uiSource).toContain("appendCommandTimelineEntrySequential(entry, options)");
    expect(uiSource).toContain("typewriteAllNonSpacerRows: tutorialState !== null");
    expect(uiSource).toContain("shouldTypewriteCommandTimelineRow(row, options)");
    expect(uiSource).toContain("shouldShowExecutePrompt()");
    expect(uiSource).toContain('shouldShowExecutePrompt() && getExecutePromptMode() === "execute"');
    expect(uiSource).toContain('? "PRESS EXECUTE?"');
    expect(uiSource).toContain("isTutorialBurnPlanAllowed");
    expect(uiSource).toContain("isTutorialFirePlanAllowed");
    expect(uiSource).toContain("isFireModeAllowed()");
    expect(rendererSource).toContain("isFireModeActive(): boolean");
    expect(rendererSource).toContain("selectFireOriginTarget(targetKey: string | null): void");
    expect(uiSource).toContain("isTutorialShipyardFireModeActive(tutorial)");
    expect(uiSource).toContain("cinematicRenderer?.isFireModeActive() === true");
    expect(tutorialCommandRowsSource).not.toContain("Right click again to return to ");
    expect(uiSource).not.toContain("Right click again to enter ");
    expect(uiSource).toContain("tutorial:live-confirm-shipyard-fire");
    expect(uiSource).toContain('tutorialState.phase === "shipyardFirePrompt"');
    expect(uiSource).toContain('tutorialState.phase === "shipyardFireQueued"');
    expect(uiSource).toContain('tutorialState.phase === "shipyardContestedFirePrompt"');
    expect(uiSource).toContain('tutorialState.phase === "shipyardContestedFireQueued"');
    expect(uiSource).toContain("isTutorialFireRouteNode(destinationNode.id)");
    expect(uiSource).toContain("isTutorialFireRouteNode(originNode.id)");
    expect(uiSource).toContain("return !isTutorialProtectedInterdictionNode(nodeId);");
    expect(rendererSource).toContain("this.transientTargetLastKnownPositions.set(targetKey");
    expect(rendererSource).toContain("this.getTutorialAttentionPulseForTarget(targetKey)");
    expect(rendererSource).toContain("closeBurnPreviewDestinationLoop(");
    expect(rendererSource).toContain("presentationPoints");
    expect(uiSource).toContain('tutorialState.phase === "shipyardFirePrompt"');
    expect(uiSource).toContain('tutorialState.phase === "shipyardContestedFirePrompt"');
    expect(uiSource).toContain('tutorial.phase === "shipyardFirePrompt"');
    expect(uiSource).toContain("resumeTutorialShipyardContestedSupportFireAfterMandatoryLaunch");
    expect(uiSource).toContain(
      "if (resumeTutorialShipyardContestedSupportFireAfterMandatoryLaunch(tutorial))"
    );
    expect(uiSource).toContain("canTutorialShipyardContestedSupportFireFromNode");
    expect(uiSource).toContain("applyTutorialShipyardContestedSupportFirePlan");
    expect(uiSource).toContain(
      'return "MANDATORY LAUNCH REQUIRED";\n    }\n\n    if (!isTutorialFirePlanAllowed'
    );
    expect(uiSource).toContain("await startTutorialDefensiveForecast();");
    expect(uiSource).not.toContain('"friendlyFireLesson"');
    expect(uiSource).not.toContain('"friendlyFireQueued"');
    expect(uiSource).not.toContain("friendlyFireNodeId");
    expect(uiSource).not.toContain("Right click arms FIRE for the selected ship.");
    expect(uiSource).not.toContain(
      "Left click to select a ship, then left click again to enter FIRE mode."
    );
    expect(uiSource).toContain("tutorialAutoResolveTurn");
    expect(uiSource).toContain("frameTutorialOpeningCamera");
    expect(rendererSource).toContain("frameTargetsInstant");
    expect(rendererSource).toContain("frameTargetsAroundFocusInstant");
    expect(rendererSource).toContain("frameTargetsAroundFocusSmooth");
    expect(rendererSource).toContain("frameTargetsAroundFocusObliqueInstant");
    expect(rendererSource).toContain("frameTargetsAroundFocusObliqueSmooth");
    expect(rendererSource).toContain("focusActiveBurnChaseSmooth");
    expect(rendererSource).toContain("focusShipyardAssemblyChaseSmooth");
    expect(shipyardChaseStart).toBeGreaterThanOrEqual(0);
    expect(shipyardChaseEnd).toBeGreaterThan(shipyardChaseStart);
    expect(rendererSource).toContain("shipyardAssemblyChaseCameraEnabled = false");
    expect(rendererSource).toContain("shipyardAssemblyChaseCamera: null");
    expect(shipyardChaseSource).toContain("this.clearShipyardAssemblyChaseCamera()");
    expect(shipyardChaseSource).toContain("return false");
    expect(shipyardChaseSource).not.toContain("shipyardAssemblyChaseCameraEnabled");
    expect(shipyardChaseSource).not.toContain("this.startShipyardAssemblyChaseCamera(");
    expect(rendererSource).toContain("type ShipyardAssemblyChaseCamera");
    expect(rendererSource).not.toContain("tryStartShipyardAssemblyChaseCamera(from, to, isReplay)");
    expect(rendererSource).toContain("getActiveShipyardAssemblyCargo");
    expect(rendererSource).toContain("focusNodeShipCloseupSmooth(targetKey: string): boolean");
    expect(rendererSource).toContain(
      "focusTutorialOpeningNodeCloseupSmooth(targetKey: string): boolean"
    );
    expect(rendererSource).toContain('this.onInputGesture?.("keyboard-camera")');
    expect(rendererSource).toContain("areTargetKeysVisibleInFrame");
    expect(uiSource).toContain("frameTutorialShipyardFireSelectionWide");
    expect(uiSource).not.toContain(
      "cinematicRenderer.focusActiveBurnChaseSmooth(`burn:${enemyTransitId}`"
    );
    expect(uiSource).not.toContain("cinematicRenderer.frameTargetsAroundFocusObliqueSmooth");
    expect(uiSource).not.toContain("cinematicRenderer.areTargetKeysVisibleInFrame(frameTargets)");
    expect(rendererSource).toContain("this.tuning.shipModelCollapseDistance * 0.48");
    expect(rendererSource).toContain("selectTarget(targetKey: string | null): void");
    expect(rendererSource).toContain("isCameraVeryZoomedOut(): boolean");
    expect(rendererSource).toContain("zoomOutRatio >= 0.72");
    expect(rendererSource).toContain("detailProgress <= 0.08");
    expect(rendererSource).not.toContain("focusTargetWithoutZoomSlow(targetKey: string): void");
    expect(rendererSource).toContain("type CinematicTutorialAttentionPulse");
    expect(rendererSource).toContain("getTutorialAttentionPulse?:");
    expect(rendererSource).toContain('colorRole?: "burn-preview"');
    expect(rendererSource).toContain('nodeBlinkMode?: "on-off"');
    expect(rendererSource).toContain("getTutorialAttentionNodeOnOffOpacityMultiplier");
    expect(rendererSource).toContain("const nodeVisualOpacityMultiplier =");
    expect(rendererSource).toContain(
      "presentationOpacityMultiplier * tutorialNodeOnOffOpacityMultiplier"
    );
    expect(rendererSource).toContain("renderTutorialAttentionPulseConnectors");
    expect(rendererSource).toContain("getTutorialAttentionPulseConnectorNodeIds");
    expect(rendererSource).not.toContain("pinPriorityBurnConnector");
    expect(rendererSource).not.toContain("tutorialBurnConfirmDistancePingCoreMinScreenPixels");
    expect(rendererSource).toContain("tutorialNodeBlinkBoost");
    expect(rendererSource).toContain("getBurnTransferFieldPriorityDestinationNodeId");
    expect(rendererSource).toContain("burnTransferFieldTutorialTargetConnectorOpacityBoost");
    expect(rendererSource).toContain("burnTransferFieldTutorialTargetConnectorPulseOpacityBoost");
    expect(rendererSource).toContain("tutorialAttentionFutureLinkOpacityBoost");
    expect(rendererSource).toContain("this.tuning.burnPreviewColor");
    expect(rendererSource).toContain("private getTutorialAttentionPulseForTarget");
    expect(rendererSource).toContain("private resolveTutorialAttentionPulseTargetKey");
    expect(rendererSource).toContain("private isTutorialAttentionPulseTargetVisible");
    expect(rendererSource).toContain("const nodeGroupScale = baseScale;");
    expect(rendererSource).toContain("const nodeVisualScale = 1 + selectedHoverScaleBoost;");
    expect(rendererSource).toContain("nodeObject.group.scale.setScalar(nodeGroupScale)");
    expect(rendererSource).toContain("nodeObject.ring.scale.setScalar(nodeVisualScale)");
    expect(rendererSource).toContain("nodeObject.occupancyRing.scale.setScalar(nodeVisualScale)");
    expect(rendererSource).toContain("nodeObject.occupiedBand.scale.setScalar(nodeVisualScale)");
    expect(rendererSource).toContain("nodeObject.contestedRings.scale.setScalar(nodeVisualScale)");
    expect(rendererSource).toContain("nodeObject.selectedMarker.scale.setScalar(nodeVisualScale)");
    expect(rendererSource).toContain("nodeObject.halo.scale.setScalar(nodeVisualScale)");
    expect(rendererSource).not.toContain(
      "const nodeGroupScale = baseScale * (1 + selectedHoverScaleBoost);"
    );
    expect(rendererSource).not.toContain(
      "baseScale * (1 + selectedHoverScaleBoost + tutorialPulseIntensity"
    );
    expect(styles).toContain(".command-console__line--tutorial");
    expect(styles).toContain(".command-console__line--tutorial-live-hint");
    expect(styles).toContain(".command-console__line--tutorial-live-hint-delayed");
    expect(styles).toContain(".command-console__line--tutorial-complete-hint");
    expect(styles).toContain(".command-console__line--tutorial-overlay");
    expect(styles).toContain(".command-console__line--tutorial-spacer");
    expect(styles).toContain(".command-console__line--spacer");
    expect(styles).toContain(".command-console__line--spacer + .command-console__line--turn");
    expect(styles).toContain("min-height: 0.48em");
    expect(styles).toContain("opacity: calc(0.72 + var(--execute-attention-pulse) * 0.28)");
    expect(styles).toContain(".command-console__block + .command-console__block");
    expect(styles).toContain("tutorial-live-hint-blink var(--beat-tutorial-hint-duration, 1050ms)");
    expect(styles).toContain("@keyframes tutorial-live-hint-blink");
    expect(styles).toContain("color: rgba(245, 248, 252, 0.96)");
    expect(styles).toContain(".command-console__transcript {\n  order: 1;");
    expect(styles).toContain(".command-console__live {\n  order: 2;");
    expect(styles).not.toContain(".command-console.is-tutorial .command-console__live");
    expect(styles).not.toContain(".command-console.is-tutorial .command-console__transcript");
    expect(uiSource).toContain("function shouldTypewriteLiveCommandRow(");
    expect(uiSource).toContain("function shouldTypewriteCommandTimelineRow(");
    expect(uiSource).toContain("typewriteAllNonSpacerRows");
    expect(uiSource).toContain('className.includes("command-console__line--turn")');
    expect(uiSource).toContain('className.includes("command-console__line--dv-telemetry")');
    expect(uiSource).toContain(
      "typewriter: options.typewriter && shouldTypewriteLiveCommandRow(row)"
    );
    expect(uiSource).toContain("shouldTypewriteCommandTimelineRow(row, options)");
    expect(uiSource).toContain("typewriter: shouldTypewriteRow");
    expect(uiSource).toContain("typewriter: isNewRow && shouldTypewriteLiveCommandRow(row)");
    expect(uiSource).not.toContain("tutorial-popup");
    expect(uiSource).not.toContain("tutorial billboard");
  });

  it("restores a required tutorial selection before refreshing the command log", () => {
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const selectionCallbackStart = uiSource.indexOf(
      "      onSelectionChange(selection: CinematicSelection | null) {"
    );
    const selectionCallbackEnd = uiSource.indexOf(
      "      onUserFocusChange(targetKey: string) {",
      selectionCallbackStart
    );
    const selectionCallbackSource = uiSource.slice(selectionCallbackStart, selectionCallbackEnd);
    const restoreCallIndex = selectionCallbackSource.indexOf(
      "if (restoreTutorialRequiredShipSelectionAfterDeselect())"
    );
    const tutorialSelectionIndex = selectionCallbackSource.indexOf(
      "handleTutorialSelection(selection)"
    );

    expect(selectionCallbackStart).toBeGreaterThanOrEqual(0);
    expect(selectionCallbackEnd).toBeGreaterThan(selectionCallbackStart);
    expect(selectionCallbackSource).toContain("if (isRestoringTutorialRequiredShipSelection)");
    expect(selectionCallbackSource).toContain(
      "if (restoreTutorialRequiredShipSelectionAfterDeselect()) {\n          return;\n        }"
    );
    expect(restoreCallIndex).toBeGreaterThanOrEqual(0);
    expect(tutorialSelectionIndex).toBeGreaterThan(restoreCallIndex);
    expect(selectionCallbackSource).toContain("updateStatus();");
    expect(selectionCallbackSource).not.toContain("updateCommandConsole();");
    expect(uiSource).toContain("isRestoringTutorialRequiredShipSelection = true;");
    expect(uiSource).toContain("isRestoringTutorialRequiredShipSelection = false;");
  });

  it("exposes observed AI debug modes without treating an AI player as human", () => {
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const coreSource = readFileSync(
      join(process.cwd(), "src/core/simulation/gameState.ts"),
      "utf8"
    );

    expect(uiSource).toContain('createDebugModeButton("AIvsAI")');
    expect(uiSource).toContain('createDebugModeButton("AIvsAIvsAI")');
    expect(uiSource).toContain('createDebugModeButton("FIREvsAI")');
    expect(uiSource).toContain('createDebugModeButton("MISSILE T-1")');
    expect(uiSource).toContain('createDebugModeButton("EVADE")');
    expect(uiSource).toContain('startDebugAiAutorunMode("2p")');
    expect(uiSource).toContain('startDebugAiAutorunMode("3p")');
    expect(uiSource).toContain("resetDebugFireVsAiMode()");
    expect(uiSource).toContain("runFireVsAiDebugSimulation(");
    expect(uiSource).toContain("resetDebugMissileImpactTest()");
    expect(uiSource).toContain("createMissileImpactTMinusOneDebugScenario(content)");
    expect(uiSource).toContain("resetDebugEvadeTest()");
    expect(uiSource).toContain("createEvadeTMinusOneDebugScenario(content)");
    expect(uiSource).toContain("withAiControlledFactions");
    expect(uiSource).toContain("createControllerAuditOverrides(nextState)");
    expect(uiSource).toContain("!isPlayerFactionHuman()");
    expect(uiSource).toContain("Controllers ${controllerSummary}");
    expect(coreSource).toContain("isAiControlledFaction(state, factionId)");
    expect(coreSource).toContain("isHumanControlledFaction(state, defaultPlayerFactionId)");
  });

  it("starts the default runtime in the main menu while retaining debug AI controls", () => {
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const startupStart = uiSource.indexOf("  startMusicOnGameStart();");
    const startupEnd = uiSource.indexOf("  function tacticalViewport(): ViewportSize {");
    const startupBlock = uiSource.slice(startupStart, startupEnd);
    const mainActionsStart = uiSource.indexOf('mainActions.className = "game-menu__actions');
    const mainActionsEnd = uiSource.indexOf(
      "mainColumn.append(title, mainActions);",
      mainActionsStart
    );
    const mainActionsSource = uiSource.slice(mainActionsStart, mainActionsEnd);
    const orderedMainMenuLabels = [
      "PLAY TUTORIAL",
      "WATCH TRAILER",
      "WISHLIST ON STEAM",
      "NEW GAME",
      "PLAYER VS PLAYER",
      "OPTIONS",
      "QUIT"
    ];

    expect(startupStart).toBeGreaterThanOrEqual(0);
    expect(startupEnd).toBeGreaterThan(startupStart);
    expect(mainActionsStart).toBeGreaterThanOrEqual(0);
    expect(mainActionsEnd).toBeGreaterThan(mainActionsStart);
    expect(startupBlock).toContain("startGameMenuDemo();");
    expect(startupBlock).not.toContain('startDebugAiAutorunMode("2p");');
    expect(uiSource).toContain('planningTimerMode = "zero";');
    expect(uiSource).toContain("hasConsumedZeroTimerInitialCountdown = true;");
    for (const label of orderedMainMenuLabels) {
      expect(mainActionsSource.indexOf(`"${label}"`)).toBeGreaterThanOrEqual(0);
    }
    for (let index = 1; index < orderedMainMenuLabels.length; index += 1) {
      const previousLabel = orderedMainMenuLabels[index - 1];
      const label = orderedMainMenuLabels[index];
      expect(mainActionsSource.indexOf(`"${label}"`)).toBeGreaterThan(
        mainActionsSource.indexOf(`"${previousLabel}"`)
      );
    }
    expect(mainActionsSource.match(/createGameMenuSpacer\(\)/g)).toHaveLength(2);
    expect(mainActionsSource).not.toContain('"RESUME"');
    expect(mainActionsSource).not.toContain('"2VS"');
    expect(mainActionsSource).not.toContain('"3VS"');
    expect(mainActionsSource).not.toContain("PLAYER VS PLAYER VS PLAYER");
  });

  it("uses the canonical planets-crossing-space composition for the opening menu", () => {
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");

    expect(uiSource).toContain("focus: [652.9258901215434, 0, 366.4386699181108]");
    expect(uiSource).toContain("yaw: 6.141398437499985");
    expect(uiSource).toContain("pitch: 1.5707963267948966");
    expect(uiSource).toContain("distance: 1812.3634761265382");
    expect(uiSource).toContain('displayScaleFocusTargetKey: "node:mercury_node"');
    expect(uiSource).toContain("displayScaleDistance: 2535.4735630035007");
    expect(uiSource).toContain('const gameMenuCanonicalProceduralSeed = "proc-ms4v3wlj-0puste0"');
    expect(uiSource).toContain("const gameMenuCanonicalOpeningOrbitTurn = 76");
    expect(uiSource).toContain(
      "content = shiftSolarSystemOrbitPhase(gameMenuCanonicalContent, gameMenuOrbitEpochTurn)"
    );
  });

  it("provides clean title and CTA trailer screens with a dedicated camera composition", () => {
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const styles = readFileSync(join(process.cwd(), "src/styles.css"), "utf8");

    expect(uiSource).toContain('createDebugModeButton("TRAILER SCREEN")');
    expect(uiSource).toContain('createDebugModeButton("CTA SCREEN")');
    expect(uiSource).toContain('requestedTrailerScreen === "trailer"');
    expect(uiSource).toContain('requestedTrailerScreen === "cta"');
    expect(uiSource).toContain('["DELTAV", "ORBITAL", "STRATEGY"]');
    expect(uiSource).toContain('"WISHLIST NOW ON STEAM"');
    expect(uiSource).not.toContain("COMING SOON");
    expect(uiSource).toContain("function activateTrailerScreen(): void");
    expect(uiSource).toContain("function activateTrailerCtaScreen(): void");
    expect(uiSource).toContain("forceCanonicalGameMenuOpening = true");
    expect(uiSource).toContain("trailerScreenOpeningCameraPose");
    expect(uiSource).toContain("setGameMenuGlyphText(line, lineText)");
    expect(uiSource).toContain(
      'trailerScreenTitle.querySelectorAll<HTMLElement>(".game-menu__glyph")'
    );
    expect(uiSource).toContain("scheduleGameMenuDemoTurn(0);");
    expect(styles).toContain(".trailer-screen-title");
    expect(styles).toContain(".trailer-screen-title__line");
    expect(styles).toContain(".trailer-cta-screen");
    expect(styles).toContain(".trailer-cta-screen__action");
    expect(styles).toContain("font-size: clamp(15px, 1.15vw, 24px)");
    expect(styles).toContain("font: inherit");
    expect(styles).toContain(".app-shell.is-trailer-screen");
  });

  it("keeps lighting and background ownership in the cinematic renderer", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const styles = readFileSync(join(process.cwd(), "src/styles.css"), "utf8");
    const visualTuningSource = readFileSync(
      join(process.cwd(), "src/renderers/cinematic3d/visualTuning.ts"),
      "utf8"
    );
    const bloomCacheSource = readFileSync(
      join(process.cwd(), "src/renderers/cinematic3d/bloomCache.ts"),
      "utf8"
    );

    expect(source).toContain("sun-main-light");
    expect(source).toContain("alpha: false");
    expect(source).toContain("this.renderer.setClearColor(0x07111a, 1)");
    expect(source).not.toContain("this.renderer.setClearColor(0x010205");
    expect(source).toContain("createDeepSpaceBackgroundTexture");
    expect(source).toContain("this.scene.background = this.deepSpaceBackgroundTexture");
    const backgroundTextureBlock = source.slice(
      source.indexOf("function createDeepSpaceBackgroundTexture"),
      source.indexOf("function createSolarDustTextureCanvas")
    );
    expect(source).toContain("const deepSpaceBackgroundWidth = 2048");
    expect(source).toContain("const deepSpaceBackgroundHeight = 1024");
    expect(backgroundTextureBlock).toContain("eclipticHaze");
    expect(backgroundTextureBlock).not.toContain("broadNoise");
    expect(backgroundTextureBlock).not.toContain("cloudNoise");
    expect(styles).not.toContain(".cinematic-frame::after");
    expect(styles).not.toContain("radial-gradient(circle at 50% 48%");
    expect(source).toContain("const sunSurfacePlasmaEnabled = true");
    expect(source).toContain("const sunCoronaEnabled = true");
    expect(source).toContain("const sunSmoothGlareEnabled = true");
    expect(source).toContain("const solarGlareAndDazzleEnabled = true");
    expect(visualTuningSource).toContain("sunLightIntensity: 1.35");
    expect(visualTuningSource).toContain("sunBloomIntensity: 1.08");
    expect(visualTuningSource).toContain("sunCoronaOpacity: 0.64");
    expect(visualTuningSource).toContain("sunCoronaZoomOutOpacity: 0.64");
    expect(visualTuningSource).toContain("sunAnimatedCoronaOpacity: 0.62");
    expect(visualTuningSource).toContain("sunFocusMinimumCameraDistanceMultiplier: 5.2");
    expect(visualTuningSource).toContain("planetRingGlintMultiplier: 1.4");
    expect(visualTuningSource).toContain("sunPlanetDazzleIntensity: 0.74");
    expect(visualTuningSource).toContain("sunPlanetDazzleSurfaceGain: 2.05");
    expect(visualTuningSource).toContain("sunGlobalBloomIntensity: 0.27");
    expect(visualTuningSource).toContain("sunGlobalBloomRadius: 0.06");
    expect(visualTuningSource).toContain("sunGlobalBloomThreshold: 0.28");
    expect(visualTuningSource).toContain("receiverEclipseStrength: 1");
    expect(visualTuningSource).toContain("shadowVolumeStrength: 1");
    expect(visualTuningSource).toContain("legacyPhysicalShadowConeVisualTuning");
    expect(visualTuningSource).toContain("opacity: 0.46");
    expect(visualTuningSource).toContain("contrastOpacity: 0.23");
    expect(visualTuningSource).toContain(
      "physicalShadowConeOpacity: legacyPhysicalShadowConeVisualTuning.opacity"
    );
    expect(visualTuningSource).toContain(
      "physicalShadowConeContrastOpacity: legacyPhysicalShadowConeVisualTuning.contrastOpacity"
    );
    expect(visualTuningSource).toContain("physicalShadowConeZoomInFarRadius: 1");
    expect(visualTuningSource).toContain("physicalShadowConeZoomInOpacityMultiplier: 0.46");
    expect(visualTuningSource).toContain("solarOcclusionEnabled: true");
    expect(source).not.toContain("sunSmoothGlareMinimalPerformanceScaleMultiplier");
    expect(source).not.toContain("sunSmoothGlareMinimalPerformanceOpacityMultiplier");
    expect(source).not.toContain("sunSmoothGlareReducedPerformanceScaleMultiplier");
    expect(source).not.toContain("sunSmoothGlareReducedPerformanceOpacityMultiplier");
    expect(source).toContain("sunSmoothGlareSolarStressRadiusStartRatio");
    expect(source).toContain("skipGlare: false");
    expect(source).toContain("? sunSurfacePlasmaEnabled");
    expect(source).toContain("? createSunMaterial(this.tuning)");
    expect(source).toContain("createFlatSunMaterial()");
    expect(source).toContain("bodyObject.mesh.visible = true");
    expect(source).toContain('if (sunCoronaEnabled && body.visualClass === "star")');
    expect(source).toContain('if (sunSmoothGlareEnabled && body.visualClass === "star")');
    const coronaTextureBlock = source.slice(
      source.indexOf("function createCoronaTexture"),
      source.indexOf("function createSmoothSolarGlareTexture")
    );
    expect(coronaTextureBlock).toContain("const size = 1024");
    expect(coronaTextureBlock).toContain("context.createImageData(size, size)");
    expect(coronaTextureBlock).not.toContain("createRadialGradient");
    expect(coronaTextureBlock).toContain("texture.minFilter = THREE.LinearFilter");
    expect(coronaTextureBlock).toContain("texture.magFilter = THREE.LinearFilter");
    expect(coronaTextureBlock).toContain("texture.generateMipmaps = false");
    expect(source).toContain("createSunSmoothGlare(this.tuning)");
    expect(source).toContain("createSunAnimatedCorona(this.tuning)");
    expect(source).toContain('corona.name = "sun-animated-corona"');
    expect(source).toContain('"sun-animated-corona", sunCoronaEnabled');
    expect(source).toContain("displayRadius * this.tuning.sunFocusMinimumCameraDistanceMultiplier");
    expect(source).toContain('sprite.name = "sun-smooth-glare"');
    expect(source).toContain("createSmoothSolarGlareTexture");
    const smoothGlareTextureBlock = source.slice(
      source.indexOf("function createSmoothSolarGlareTexture"),
      source.indexOf("const radialGlowTextures")
    );
    expect(smoothGlareTextureBlock).toContain("const size = 1024");
    expect(smoothGlareTextureBlock).toContain("const visibleRadius = size * 0.46");
    expect(smoothGlareTextureBlock).toContain("context.createImageData(size, size)");
    expect(smoothGlareTextureBlock).not.toContain("createRadialGradient");
    expect(smoothGlareTextureBlock).toContain("texture.generateMipmaps = false");
    expect(source).toContain("syncSunGlowLayerPresence(bodyObject)");
    expect(source).toContain("syncNamedSunGlowLayer(");
    expect(source).toContain("disposeObject(staleLayer)");
    expect(source).toContain(
      'const corona = sunCoronaEnabled ? bodyObject.group.getObjectByName("sun-corona") : undefined'
    );
    expect(source).toContain(
      'const smoothGlare = sunSmoothGlareEnabled\n      ? bodyObject.group.getObjectByName("sun-smooth-glare")'
    );
    expect(source).toContain("getSunSmoothGlarePerformanceBudget");
    expect(source).toContain("getSunSmoothGlareSolarStressPressure");
    expect(source).toContain("const coronaScale = baseScale * 1.04");
    expect(source).toContain("const coronaOpacity = this.tuning.sunCoronaOpacity");
    expect(source).toContain("this.setSunGlowSpriteOpacity(corona, coronaOpacity * 0.04)");
    expect(source).toContain("coronaOpacity * this.tuning.sunAnimatedCoronaOpacity * 2.08");
    expect(source).toContain("clamp(coronaOpacity * 0.08, 0, 0.06)");
    expect(source).toContain("smoothGlare.visible = smoothGlareOpacity > 0.012");
    expect(source).not.toContain("localizedSunBloomProgress");
    expect(source).toContain("const sunDazzleStrength =");
    expect(source).toContain("solarGlareAndDazzleEnabled");
    expect(source).toContain("this.computeSunDazzleStrength(body, position, bodiesById)");
    expect(source).toContain("createStarfieldLayer");
    expect(source).not.toContain("configureStarfieldSolarMask");
    expect(source).not.toContain("syncStarfieldSolarMask");
    expect(source).not.toContain("getStarfieldSolarMask");
    expect(source).toContain("const backgroundStarfieldEnabled = true");
    expect(source).toContain("const backgroundViewportStarfieldEnabled = false");
    expect(source).toContain("const background3dStarfieldEnabled = true");
    expect(source).toContain("const starfieldAfterglowOpacityMultiplier = 1.05");
    expect(source).toContain("const starfieldAfterglowSizeMultiplier = 0.92");
    expect(source).toContain("const starfieldAfterglowLagRatio = 0.24");
    expect(source).toContain("const starfieldAfterglowDecay = 0.95");
    expect(source).toContain("const starfieldAfterglowLagDecay = 0.89");
    expect(source).toContain("const starfieldAfterglowLagMax = 0.075");
    expect(source).toContain("const starfieldAfterglowMinSeparationScale = 0.22");
    expect(source).toContain("const starfieldAfterglowFullSeparationScale = 1.1");
    expect(source).toContain("const starfieldAfterglowTrailSteps = 10");
    expect(source).toContain("const starfieldPanParallaxMultiplier = 12");
    expect(source).toContain("const starfieldZoomParallaxMultiplier = 0.18");
    expect(source).toContain("if (!backgroundStarfieldEnabled)");
    expect(source).toContain("private viewportStarfield: THREE.Points | null = null");
    expect(source).toContain(
      "type StarfieldAfterglowLayer = THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>"
    );
    expect(source).toContain(
      "private readonly starAfterglowLayers: StarfieldAfterglowLayer[] = []"
    );
    expect(source).toContain("background3dStarfieldEnabled,");
    expect(source).toContain("viewportStarfield:");
    expect(source).toContain("this.viewportStarfield = createViewportStarfield(this.tuning)");
    expect(source).toContain("this.scene.add(this.viewportStarfield)");
    expect(source).toContain("if (background3dStarfieldEnabled)");
    expect(source).toContain("createStarfieldAfterglowLayer(layer, layerIndex)");
    expect(source).toContain("this.scene.add(afterglowLayer, layer.group)");
    expect(source).toContain(
      "syncViewportStarfield(this.viewportStarfield, this.camera, this.tuning)"
    );
    expect(source).toContain(
      "backgroundViewportStarfieldEnabled && this.viewportStarfield !== null"
    );
    expect(source).toContain("if (!background3dStarfieldEnabled)");
    expect(source).toContain("this.updateStarfieldCameraMotion()");
    expect(source).toContain("this.camera.getWorldDirection(this.starfieldCameraForward)");
    expect(source).toContain("private getStarfieldLayerParallaxOffset(");
    expect(source).toContain(".add(this.getStarfieldLayerParallaxOffset(layer, index))");
    expect(source).toContain("this.tuning.starParallaxStrength * starfieldPanParallaxMultiplier");
    expect(source).toContain(
      "this.tuning.starParallaxStrength *\n      starfieldZoomParallaxMultiplier"
    );
    expect(source).toContain("this.syncStarfieldPointLayer(layer, elapsed)");
    expect(source).toContain("this.syncStarfieldAfterglowLayer(layer, index)");
    expect(source).toContain('starfield.name = "background-viewport-starfield"');
    expect(source).toContain("background-3d-starfield-afterglow:${layerIndex}");
    expect(source).not.toContain("background-star-proof");
    expect(source).toContain("layer.group.visible = false");
    expect(source).toContain("private getSolarPointOverlayVisibility");
    expect(source).not.toContain("projectWorldPointToExtendedScreen(this.sunPosition");
    expect(source).not.toContain("isStarfieldSolarMaskNearViewport");
    expect(source).not.toContain("getStarfieldSolarOpacityMultiplier");
    expect(source).not.toContain("solarOpacityMultiplier");
    expect(source).not.toContain("const layerBreath =");
    expect(source).not.toContain("starfieldPreviousDistance");
    expect(source).not.toContain("this.starfieldTravelLag");
    expect(source).not.toContain("this.starfieldZoomLag");
    expect(source).not.toContain("const starBreath =");
    expect(source).not.toContain("const sparkle =");
    expect(source).not.toContain("const zoomParallax =");
    expect(source).not.toContain("const zoomTrail =");
    expect(source).not.toContain("const breathingVisibility =");
    expect(source).toContain("this.tuning.starFlickerSpeed");
    expect(source).toContain("this.tuning.starFlickerAmount");
    expect(source).toContain('geometry.setAttribute("starPulseMode"');
    expect(source).toContain('geometry.setAttribute("starPulseSpeed"');
    expect(source).toContain('geometry.setAttribute("starPulseAmount"');
    expect(source).toContain('"starPulseSharpness",');
    expect(source).toContain("attribute float starPulseMode");
    expect(source).toContain("beatSynchronizedStarAngle(starFlickerSpeed * starPulseSpeed)");
    expect(source).toContain("return starElapsed * angularFrequency");
    expect(source).toContain("this.starfieldAfterglowYawLag * starfieldAfterglowLagDecay");
    expect(source).toContain("this.starfieldAfterglowPitchLag * starfieldAfterglowLagDecay");
    expect(source).toContain("const trailSeparation =");
    expect(source).toContain("const separationVisibility = smoothStep(");
    expect(source).toContain(
      "afterglowLayer.visible = intensity > 0.006 && separationVisibility > 0.02"
    );
    expect(source).toContain("const texture = createStarTexture()");
    expect(source).toContain(
      "vStarOpacity = clamp(starBaseOpacity * starBrightness * opacityPulse, 0.0, 1.0)"
    );
    expect(source).not.toContain("background-3d-starfield-afterglow-impression");
    expect(source).toContain("for (let stepIndex = 0; stepIndex < starfieldAfterglowTrailSteps");
    expect(source).toContain(
      'geometry.setAttribute("afterglowProgress", new THREE.Float32BufferAttribute(progresses, 1))'
    );
    expect(source).toContain("fades.push(Math.pow(1 - stepIndex / starfieldAfterglowTrailSteps");
    expect(source).toContain("afterglowTrailYawOffset * afterglowProgress");
    expect(source).toContain("afterglowTrailPitchOffset * afterglowProgress");
    expect(source).toContain(
      "-this.starfieldAfterglowPitchLag * layer.radius * starfieldAfterglowLagRatio"
    );
    expect(source).toContain("float headSeparation = smoothstep(");
    expect(source).toContain("* headSeparation");
    expect(source).toContain("const afterglowLayer = new THREE.Points(geometry, material)");
    expect(source).not.toContain("createStarTrailTexture");
    expect(source).not.toContain("camera.position.x * (1 - parallax)");
    expect(source).toContain("starPointDebug: this.starLayers.map");
    expect(source).toContain("private createStarfieldPointDebugEntry(layer: StarfieldPointLayer)");
    expect(source).toContain(
      "const screen = projectWorldPointToViewportScreen(worldPosition, this.camera, width, height)"
    );
    expect(source).toContain("material.toneMapped = false");
    expect(source).toContain("group.frustumCulled = false");
    expect(source).toContain("for (let layerIndex = 0; layerIndex < this.tuning.starLayerCount");
    const starfieldBlock = source.slice(
      source.indexOf("function createStarfieldLayer"),
      source.indexOf("function createPhysicalShadowCone")
    );
    expect(starfieldBlock).toContain("const layerWeights = [0.5, 0.32, 0.18]");
    expect(starfieldBlock).toContain("const radius = 24000 + layerIndex * 4200");
    expect(starfieldBlock).toContain("group.name = `background-3d-starfield:${layerIndex}`");
    expect(starfieldBlock).toContain('group.userData["starfieldRadius"] = radius');
    expect(starfieldBlock).toContain("const goldenAngle = Math.PI * (3 - Math.sqrt(5))");
    expect(starfieldBlock).toContain("const uniformY = 1 - ((index + 0.5) / count) * 2");
    expect(starfieldBlock).toContain("const bandSample = seededUnit(globalIndex, 1200)");
    expect(starfieldBlock).toContain("const layerRadius = radius * (0.985 +");
    expect(starfieldBlock).toContain("const basePositions: THREE.Vector3[] = []");
    expect(starfieldBlock).toContain("const material = new THREE.ShaderMaterial");
    expect(starfieldBlock).toContain("const points = new THREE.Points(geometry, material)");
    expect(starfieldBlock).toContain("points.renderOrder = -20");
    expect(starfieldBlock).toContain('geometry.setAttribute("starPhase"');
    expect(starfieldBlock).toContain("basePositions.push(basePosition)");
    expect(starfieldBlock).toContain('geometry.setAttribute("starColor"');
    expect(starfieldBlock).toContain('geometry.setAttribute("starBrightness"');
    expect(starfieldBlock).toContain('geometry.setAttribute("starSizeMultiplier"');
    expect(starfieldBlock).not.toContain("new THREE.SpriteMaterial");
    expect(starfieldBlock).not.toContain("new THREE.Sprite(material)");
    expect(starfieldBlock).toContain("getStarfieldSpriteWorldScale");
    expect(starfieldBlock).toContain("worldHeightAtRadius / Math.max(1, viewportHeight)");
    expect(starfieldBlock).toContain(
      "const count = Math.max(24, Math.round(tuning.starCount * 0.34))"
    );
    expect(starfieldBlock).toContain("tuning.starParallaxStrength");
    expect(starfieldBlock).toContain("0.22 + seededUnit(index, 1415) * 0.34");
    expect(starfieldBlock).toContain("tuning.starFlickerSpeed");
    expect(starfieldBlock).toContain("tuning.starFlickerAmount");
    expect(starfieldBlock).not.toContain("const sparkle =");
    expect(starfieldBlock).toContain("starfield.material.opacity = 0.92");
    expect(starfieldBlock).toContain("sizeAttenuation: false");
    expect(starfieldBlock).toContain("depthTest: true");
    expect(starfieldBlock).not.toContain("depthTest: false");
    expect(starfieldBlock).toContain("camera.far * anchor.depth");
    expect(starfieldBlock).toContain("addScaledVector(direction");
    expect(starfieldBlock).toContain("starfield.renderOrder = -25");
    expect(starfieldBlock).toContain("afterglowLayer.renderOrder = -21");
    expect(starfieldBlock).toContain("afterglowLayer.visible = false");
    const starTextureBlock = source.slice(source.indexOf("function createStarTexture"));
    expect(starTextureBlock).toContain("const size = 32");
    expect(starTextureBlock).toContain("context.createImageData(size, size)");
    expect(starTextureBlock).not.toContain("outerGlow");
    expect(starTextureBlock).not.toContain("createRadialGradient");
    expect(starTextureBlock).toContain("texture.generateMipmaps = false");
    expect(source).toContain("createBodyMaterial");
    expect(source).toContain("seamlessGasPatternWarp");
    expect(source).toContain("giantPatternFamily");
    expect(source).toContain("getGiantPatternFamily");
    expect(source).toContain("getSunFarCameraBrightness");
    expect(source).toContain("getSunProximityGlowProgress");
    expect(source).toContain("getSunGlowZoomProgress");
    expect(source).toContain("getSunExtremeZoomProgress");
    expect(source).not.toContain("sunCoronaExtremeZoomOpacity");
    expect(source).not.toContain("sunExtremeZoomBloomBoost");
    expect(source).not.toContain("float coronalSpikes =");
    expect(source).not.toContain("float lapilli =");
    expect(source).not.toContain("float gaussianRing =");
    expect(source).not.toContain("float mirroredField =");
    expect(source).not.toContain("float solarCell(");
    expect(source).toContain("float surfaceWarp =");
    expect(source).toContain("float plasmaGranulation =");
    expect(source).toContain("float moltenChannels =");
    expect(source).toContain("float surfaceIntensity = min(intensity, 1.08)");
    expect(source).toContain("vec3 deepGold = vec3(1.0, 0.48, 0.065)");
    expect(source).toContain("vec3 solarYellow = vec3(1.0, 0.86, 0.34)");
    expect(source).toContain("vec3 incandescentWhite = vec3(1.0, 0.995, 0.86)");
    expect(source).toContain("float edgeSway =");
    expect(source).toContain("float edgeShimmer =");
    expect(source).toContain("float shimmeringEdge =");
    expect(source).toContain("vec3 edgeGold = vec3(1.0, 0.62, 0.12)");
    expect(source).toContain("uniform float surfaceRadius");
    expect(source).toContain("float filamentFlow =");
    expect(source).toContain("float microProminenceFlow =");
    expect(source).toContain("float microProminences =");
    expect(source).toContain("float prominenceField =");
    expect(source).toContain("float coronalTongues =");
    expect(source).toContain("0.12 +");
    expect(source).toContain("pow(flameField, 1.24) * 0.07");
    expect(source).toContain("prominenceField * 0.13");
    expect(source).toContain("float stableCoronaEdge =");
    expect(source).toContain("float stableCoronaMask =");
    expect(source).toContain("float stableCoronaRipple =");
    expect(source).toContain("float stableCoronaAlpha =");
    expect(source).toContain("stableCoronaEdge - surfaceRadius * 0.012");
    expect(source).toContain("stableCoronaEdge + surfaceRadius * 0.007");
    expect(source).toContain("stableCoronaMask * stableCoronaRipple * 0.76");
    expect(source).toContain("vec3 stableCoronaColor = vec3(1.0, 0.72, 0.2)");
    expect(source).toContain("float movingFilaments =");
    expect(source).toContain("float curvedAngle =");
    expect(source).toContain("float prominenceCore =");
    expect(source).toContain("vec3 flameBase = vec3(1.0, 0.93, 0.52)");
    expect(source).toContain("const sunCoronaMinimumScale = 5.2");
    expect(source).toContain(
      "const visibleCoronaScale = Math.max(sunCoronaMinimumScale, coronaScale)"
    );
    expect(source).toContain(
      '"surfaceRadius",\n            2 / Math.max(0.001, animatedCorona.scale.x)'
    );
    expect(source).toContain("const innerFade = smoothStep(0.36, 0.43, distance)");
    expect(source).not.toContain("0xffffed");
    expect(source).not.toContain("vec3(1.0, 1.0, 0.929)");
    expect(source).toContain("const innerClear = smoothStep(0.58, 0.72, distance)");
    expect(source).not.toContain("const solarDiskDetailProgress =");
    expect(source).not.toContain("for (let spikeIndex = 0; spikeIndex < 34");
    expect(source).toContain("vViewNormal = normalize(normalMatrix * normal)");
    expect(source).not.toContain("computeSolarCameraDazzle");
    expect(source).not.toContain("solarCameraDazzleElement");
    expect(styles).not.toContain(".cinematic-solar-dazzle");
    expect(source).not.toContain("updateLocalizedSunBloom");
    expect(source).not.toContain("computeLocalizedSunBloomStrength");
    expect(source).not.toContain("localizedSunBloomStrength");
    expect(source).toContain("EffectComposer");
    expect(source).toContain("UnrealBloomPass");
    expect(source).toContain("FullScreenQuad");
    expect(source).toContain("this.cinematicComposer.renderToScreen = false");
    expect(source).toContain("this.renderer.outputColorSpace = THREE.SRGBColorSpace");
    expect(source).toContain("this.renderer.toneMapping = THREE.ACESFilmicToneMapping");
    expect(source).toContain("this.renderer.render(this.cinematicBaseRenderScene, this.camera)");
    expect(source).toContain("this.cinematicComposer.render()");
    expect(source).toContain("this.cinematicBloomOverlay.render(this.renderer)");
    expect(source).toContain("const cinematicBloomRenderScale = 0.4");
    expect(source).toContain("const lowCinematicBloomStrengthScale = 0.28");
    expect(source).toContain("const highCinematicBloomStrengthScale = 0.9");
    expect(source).toContain("const highCinematicBloomCacheUpdateIntervalMs = 1000 / 30");
    expect(source).toContain("const lowCinematicBloomCacheUpdateIntervalMs = 1000 / 15");
    expect(source).toContain("this.bloomStrengthScale = nextBloomStrengthScale");
    expect(source).not.toContain("reducedCinematicBloomRenderScale");
    expect(source).not.toContain("syncCinematicBloomBlurSampling");
    expect(source).toContain("getCinematicBloomRadius");
    expect(source).toContain("applyCinematicBloomScreenSpaceSourceScale(this.worldBloomScene)");
    expect(source).toContain("applyCinematicBloomScreenSpaceSourceScale(this.uiBloomScene)");
    expect(source).toContain("restoreCinematicBloomScreenSpaceSourceScale");
    expect(source).toContain("computeCinematicBloomScreenSpaceSourceEnergyScale");
    expect(source).toContain("computeCinematicBloomScreenSpaceSourceScale");
    expect(source).toContain("material.size *= sourceScale");
    expect(source).toContain("material.opacity *= energyScale");
    expect(source).not.toContain("cinematicMinimalBloomRenderScale");
    expect(source).toContain("this.cinematicComposer.setPixelRatio(this.bloomRenderScale)");
    expect(source).toContain("const cinematicBloomOverlayGain = 0.78");
    expect(source).not.toContain("const isZoomInMotion =");
    expect(source).toContain("computeCinematicBloomStrength({");
    expect(source).toContain("this.solarHazeEnabled ? undefined : 0");
    expect(source).toContain(
      "(this.uiBloomEnabled ? Math.max(0, this.tuning.uiBloomIntensity) : 0) *"
    );
    expect(source).toContain("this.bloomStrengthScale");
    expect(source).toContain("this.cinematicBloomPass.radius = this.getCinematicBloomRadius(");
    expect(source).toContain("this.tuning.uiBloomRadius");
    expect(source).toContain("this.cinematicBloomPass.threshold = this.tuning.uiBloomThreshold");
    expect(source).toContain("const cinematicUiBloomRenderLayer = 1");
    expect(source).toContain("setExclusiveObjectRenderLayer(group, cinematicUiBloomRenderLayer);");
    expect(source).toContain("const cinematicDirectUiRenderLayer = 2");
    expect(source).toContain("const cinematicSunCompactBloomRenderLayer = 3");
    expect(source).toContain("const cinematicSunCompactBloomRadius = 0.1");
    expect(source).toContain(
      "setExclusiveObjectRenderLayer(existingLayer, cinematicDirectUiRenderLayer)"
    );
    expect(source).toContain("this.camera.layers.set(cinematicWorldRenderLayer)");
    expect(source).toContain("this.camera.layers.set(cinematicUiBloomRenderLayer)");
    expect(source).toContain("this.camera.layers.set(cinematicSunCompactBloomRenderLayer)");
    expect(source).toContain("mesh.layers.enable(cinematicSunCompactBloomRenderLayer)");
    expect(source).toContain("const renderCompactSunBloom = (): void =>");
    expect(source).toContain("this.compactSunBloomEnabled &&");
    expect(source).toContain("setExclusiveObjectRenderLayer");
    expect(source).toContain("this.cinematicCompactSunBloomCacheTarget");
    expect(source).toContain("this.compositeCinematicBloomTexture(");
    expect(source).toContain("const solarOccluder = this.solarOcclusionFlarePresentation");
    expect(source).toContain('uniforms["occlusionMaskEnabled"]!.value');
    expect(source).toContain("float occlusionVisibility = mix(1.0, outsideOccluder");
    const animatedCoronaBlock = source.slice(
      source.indexOf("function createSunAnimatedCorona"),
      source.indexOf("function createSunSmoothGlare")
    );
    const smoothGlareBlock = source.slice(
      source.indexOf("function createSunSmoothGlare"),
      source.indexOf("function createSaturnRingSystem")
    );
    expect(animatedCoronaBlock).toContain("depthTest: true");
    expect(smoothGlareBlock).toContain("depthTest: true");
    expect(source).toContain("cinematicUiBloomCacheTarget");
    expect(source).toContain("cacheCurrentCinematicBloomTexture");
    expect(source).toContain("getCinematicUiBloomCacheSignature");
    expect(source).toContain("getCinematicBloomCameraSignature");
    expect(source).toContain("shouldRefreshCinematicBloomCache");
    expect(source).toContain("const bloomCacheMaximumDeferralMs = bloomCacheUpdateIntervalMs * 2");
    expect(source).toContain("maximumDeferralMs: bloomCacheMaximumDeferralMs");
    expect(source).toContain("peerPassRefreshedThisFrame: didRefreshWorldBloomThisFrame");
    expect(source).toContain("this.cinematicWorldBloomCacheCameraSignature");
    expect(source).toContain("this.cinematicUiBloomCacheCameraSignature");
    expect(bloomCacheSource).toContain(
      "input.cachedCameraSignature !== input.currentCameraSignature"
    );
    expect(bloomCacheSource.indexOf("input.cachedCameraSignature")).toBeLessThan(
      bloomCacheSource.indexOf("const canReuseCache")
    );
    expect(source).toContain("nodeRingCelestialOccludersRenderFrameSerial");
    expect(visualTuningSource).toContain("uiBloomIntensity: 0.11");
    expect(visualTuningSource).toContain("uiBloomRadius: 0");
    expect(visualTuningSource).toContain("uiBloomThreshold: 0.24");
    expect(visualTuningSource).toContain("nodeBloomSourceGain: 1.9");
    expect(source).toContain('this.recordPerformanceSection("worldBloom", 0)');
    expect(source).toContain('this.recordPerformanceSection("uiBloom", 0)');
    expect(source).not.toContain("planetSurfaceBloomLayer");
    expect(source).toContain("computeCinematicBloomStrength");
    expect(source).toContain("setPlanetAndNodeBloomSourceGain");
    expect(source).toContain("applyShipBloomSourceGain");
    expect(source).toContain("this.tuning.shipBloomSourceGain");
    expect(visualTuningSource).toContain("shipBloomSourceGain: 0.32");
    expect(source).toContain("computeApparentBodyBloomSourceGain");
    expect(source).toContain("const cinematicSunBloomReferenceRadiusPixels = 36");
    expect(source).toContain("const cinematicSunBloomFalloffExponent = 1.1");
    expect(source).toContain("const cinematicSunBloomMinimumSourceGain = 0.4");
    expect(source).toContain("const cinematicPlanetBloomReferenceRadiusPixels = 24");
    expect(source).toContain("const cinematicPlanetBloomFalloffExponent = 1.25");
    expect(source).toContain("const cinematicPlanetBloomMinimumSourceGain = 1.15");
    expect(source).toContain("getProjectedBodyRadiusPixels");
    expect(source).toContain('setShaderUniformNumber(bodyObject.mesh.material, "bloomSourceGain"');
    expect(source).toContain('"bloomSourcePass"');
    expect(source).toContain("if (bloomSourcePass > 0.5)");
    expect(source).toContain("float bloomIllumination = smoothstep(0.0, 0.12, nDotL)");
    expect(source).not.toContain("float bloomIllumination = mix(0.62, 1.0, dayMask)");
    expect(source).toContain("bloomTint * bloomIllumination * bloomRim * bloomSourceGain");
    expect(source).toContain("ringColor * bloomSourceGain");
    expect(source).toContain("color * bloomSourceGain");
    expect(source).not.toContain("syncCinematicBloomPresentation");
    expect(source).toContain("float surfaceWarp =");
    expect(source).toContain("float furnace =");
    expect(source).toContain("vec3 deepGold =");
    expect(source).toContain("vec3 solarYellow =");
    expect(source).toContain("vec3 incandescentWhite =");
    expect(source).not.toContain("float grain = sin(warped.x * 18.0");
    expect(source).not.toContain("* sin(warped.y * 23.0");
    expect(source).not.toContain("float cells = sin(length(warped.xy) * 28.0");
    expect(source).toContain("sunFarCameraIntensityMultiplier");
    expect(source).toContain("sunFarCameraCoronaOpacityMultiplier");
    expect(source).toContain("const focusSunDistanceRatio");
    expect(source).toContain("const remoteSystemProgress = smootherStep(12, 32");
    expect(source).toContain(
      "const closeRemoteOrbitProgress = smootherStep(0.82, 1, detailProgress)"
    );
    expect(source).toContain(
      "const distantSunDimProgress = remoteSystemProgress * closeRemoteOrbitProgress"
    );
    expect(source).toContain("const normalizedDistance = clamp(focusSunDistanceRatio, 0.28, 36)");
    expect(source).toContain("return 1 - smootherStep(0, 1, logarithmicDistance)");
    expect(source).toContain("computeSunDazzleStrength");
    expect(source).toContain("getSolarReflectedLightProfile");
    expect(source).toContain("sunDazzleStrength");
    expect(source).toContain("sunPlanetDazzleSurfaceGain");
    expect(source).toContain("sunDazzleColor = mix(surface");
    expect(source).toContain("sunDazzleLobe");
    expect(source).not.toContain("createBodySolarBloomSprite");
    expect(source).not.toContain("solarReflectionDirection = reflect(-lightDirection, normal)");
    expect(source).toContain("sunPlanetInnerReflectionMultiplier");
    expect(source).toContain("sunPlanetEarthReflectionMultiplier");
    expect(source).toContain("sunPlanetOuterGlintMultiplier");
    expect(source).toContain('body.id === "mercury"');
    expect(source).toContain('body.id === "venus"');
    expect(source).toContain("smallEarthCityLights");
    expect(source).toContain("earthNightContinentMask");
    expect(source).toContain("earthNightLongitudeDistance");
    expect(source).toContain("earthDirectionFromSpherical");
    expect(source).toContain("earthSeamlessDirectionalNoise");
    expect(source).toContain("earthLandMask");
    expect(source).toContain("urbanAgglomeration");
    expect(source).toContain("earthNightSurfaceColor");
    expect(source).toContain("earthNightLandSilhouette");
    expect(source).toContain("cityHaloColor");
    expect(source).toContain("isEarthLikeProtectedBody");
    expect(source).toContain('body.visualClass === "protected"');
    expect(source).toContain('body.id === "earth"');
    expect(source).toContain("earthRotationSpeed");
    expect(source).toContain("getBodySelfRotationSpeed");
    expect(source).toContain("planetRotationSpeed");
    expect(source).toContain("moonRotationSpeed");
    expect(source).toContain('body.id === "venus" || body.id === "uranus" ? -1 : 1');
    expect(source).toContain("const bodySelfRotation = getBeatSynchronizedCycleAngle(");
    expect(source).toContain("getBodySelfRotationSpeed(body, this.tuning)");
    expect(source).toContain("bodyObject.mesh.rotation.y = bodySelfRotation");
    expect(source).toContain("earthCloudMask");
    expect(source).toContain("earthWrappedLongitudeDelta");
    expect(source).toContain("earthCloudSoftNoise");
    expect(source).toContain("earthCloudSoftNoiseScaled");
    expect(source).toContain("earthCloudFrontMass");
    expect(source).toContain("earthCloudCyclone");
    expect(source).toContain("earthCloudHorizontalBand");
    expect(source).toContain("float stagger");
    expect(source).toContain("float cloudFronts");
    expect(source).toContain("float stormCells");
    expect(source).toContain("float globalCloudDeck");
    expect(source).toContain("float denseCoverage");
    expect(source).toContain("float cloudCoverage");
    expect(source).toContain('cloudMesh.name = "earth-cloud-shell"');
    expect(source).toContain("cloudMesh.scale.setScalar(this.tuning.earthCloudAltitudeScale)");
    expect(source).toContain("createEarthCloudMaterial(body, this.tuning)");
    expect(source).toContain("transparent: earthCloudLayer");
    expect(source).toContain("depthWrite: !earthCloudLayer");
    expect(source).toContain("bodyObject.cloudMesh.rotation.y = getBeatSynchronizedCycleAngle(");
    expect(source).toContain("this.tuning.earthCloudRotationSpeed");
    expect(source).toContain(
      "gl_FragColor = vec4(cloudLayerFinalColor * bloomSourceGain, earthCloudLayerAlpha)"
    );
    expect(source).not.toContain("float metroGlow");
    expect(source).toContain("exp(-pow(latitudeOffset");
    expect(source).not.toContain("(longitude + 3.14159265359) * 2.35");
    expect(source).not.toMatch(/earthCloudSoftNoise\(\s*(longitude|earthLongitude)\s*\*/);
    expect(source).not.toContain("float smallBreaks");
    expect(source).toContain("isEarthLikeProtectedBody(body) ? 1 : 0");
    expect(source).toContain("computeProjectedEclipseShadow");
    expect(source).toContain("eclipseCenterDirection");
    expect(source).toContain("eclipseDiskRadius");
    expect(source).toContain("eclipseDarkness");
    expect(source).toContain("renderSolarDust");
    expect(source).not.toContain("paintDistantCanvasStars");
    expect(source).not.toContain("distantStarCanvasSignature");
    expect(source).not.toContain("getBackgroundStarfieldParallaxOffset");
    expect(source).toContain("createSolarDustTextureCanvas");
    expect(source).toContain("this.solarDustCanvas,\n      this.labelLayer");
    expect(styles).toContain(".cinematic-dust-canvas");
    expect(styles).toContain("z-index: 2;\n  display: block;");
    expect(visualTuningSource).toContain("solarDustEnabled: true");
    expect(source).toContain("const defaultSolarHazeEnabled = false");
    expect(source).toContain("private solarHazeEnabled = defaultSolarHazeEnabled;");
    expect(source).toContain("private compactSunBloomEnabled = true;");
    expect(source).toContain("private uiBloomEnabled = true;");
    expect(source).toContain("private readonly bloomRenderScale = cinematicBloomRenderScale;");
    expect(source).toContain("private lowBloomProfileEnabled = true;");
    expect(source).toContain("private bloomStrengthScale = lowCinematicBloomStrengthScale;");
    expect(source).toContain("private burnPreviewEffectsEnabled = true;");
    expect(source).toContain("setSolarHazeEnabled(enabled: boolean): void");
    expect(source).toContain("setBurnPreviewEffectsEnabled(enabled: boolean): void");
    expect(source).toContain("setFirePreviewEffectsEnabled(enabled: boolean): void");
    expect(source).toContain("setCompactSunBloomEnabled(enabled: boolean): void");
    expect(source).toContain("setUiBloomEnabled(enabled: boolean): void");
    expect(source).toContain("setLowBloomProfileEnabled(enabled: boolean): void");
    expect(source).toContain("if (!this.solarHazeEnabled || !this.tuning.solarDustEnabled)");
    expect(source).toContain("const productiveNodeMarkersEnabled = true");
    expect(source).toContain("setVisualTuning(overrides: Partial<Cinematic3dVisualTuning> = {})");
    expect(source).toContain("private shouldShowProductiveMarkerForNode(node: NodeSnapshot)");
    expect(source).toContain('return node.type === "shipyard";');
    expect(source).toContain("private getShipyardSurfaceGridDetailOpacity(detailProgress: number)");
    expect(source).not.toContain("CinematicProductionMarkerMode");
    expect(source).not.toContain("getProductionMarkerMode");
    expect(source).not.toContain("getActiveProductionMarkerMode");
    expect(source).not.toContain("no-production-markers");
    expect(source).toContain(
      'setShaderUniformNumber(\n        candidate,\n        "lightSideOpacityFloor"'
    );
    expect(source).toContain("tuning.shipyardLightSideOpacityFloor");
    expect(source).toContain('"darkSideOpacityBoost"');
    expect(source).toContain("tuning.shipyardDarkSideOpacityBoost");
    expect(source).toContain('"terminatorGlowBoost"');
    expect(source).toContain("tuning.shipyardTerminatorGlowBoost");
    expect(visualTuningSource).toContain("planetDisplayRadiusMultiplier: 2");
    expect(visualTuningSource).toContain("planetDisplayRadiusMin: 18.5");
    expect(visualTuningSource).toContain("moonDisplayRadiusMultiplier: 0.55");
    expect(visualTuningSource).toContain("moonDisplayRadiusMin: 3.3");
    expect(visualTuningSource).toContain("nodeRingMinScreenSize: 40");
    expect(visualTuningSource).toContain("planetNodeScale: 1.32");
    expect(visualTuningSource).toContain("moonNodeScale: 1.03");
    expect(visualTuningSource).toContain("shipyardGridCollapseDetailStart: 0.86");
    expect(visualTuningSource).toContain("shipyardGridCollapseDetailEnd: 0.48");
    expect(visualTuningSource).not.toContain("shipyardGridCollapseDetailStart: -");
    expect(visualTuningSource).not.toContain("shipyardGridCollapseDetailEnd: -");
    expect(uiSource).not.toContain("noProductionMarkersCinematicTuning");
    expect(uiSource).not.toContain("productionMarkerModeSelect");
    expect(uiSource).not.toContain("No Production Markers");
    expect(uiSource).not.toContain("no-production-markers");
    expect(uiSource).not.toContain("productionMarkerMode");
    expect(uiSource).not.toContain("getCinematicVisualTuningOverrides");
    expect(source).toContain("const tritiumSurfaceGridEnabled = true");
    expect(source).toContain("const shipyardSurfaceGridEnabled = true");
    expect(source).toContain(
      "const industrialSurfaceLightsEnabled = tritiumSurfaceGridEnabled || shipyardSurfaceGridEnabled"
    );
    expect(source).toContain("const tacticalMarkerSolarGlowOcclusionRadiusMultiplier = 3.2");
    expect(source).toContain("const tacticalMarkerSolarGlareScreenRadiusMultiplier = 2.65");
    expect(source).toContain("const nodeRingMaxCelestialOccluders = 24");
    expect(source).toContain("private getNodeRingCelestialOccluders()");
    expect(source).toContain("occluderCenters: {");
    expect(source).toContain("occluderRadii: {");
    expect(source).toContain("uniform vec3 occluderCenters[${nodeRingMaxCelestialOccluders}]");
    expect(source).toContain("uniform float occluderRadii[${nodeRingMaxCelestialOccluders}]");
    expect(source).toContain("varying vec3 vWorldPosition");
    expect(source).toContain("float computeSolidBodyOcclusion(vec3 worldPosition)");
    expect(source).toContain("occlusion = max(occlusion, bodyOcclusion)");
    expect(source).toContain("float occlusion = computeSolidBodyOcclusion(vWorldPosition)");
    expect(source).toContain("if (alpha <= 0.002)");
    expect(source).toContain("shaderMaterial.depthTest = true");
    expect(source).toContain("shaderMaterial.depthWrite = false");
    expect(source).toContain("const nodeRingOccluders = this.getNodeRingCelestialOccluders()");
    expect(visualTuningSource).toContain("nodeRingOccludedOpacity: 0");
    expect(source).toContain("const tritiumWorkEffectsEnabled = true");
    expect(source).toContain("const disabledProductiveMarkerNameFragments = [");
    expect(source).toContain("const disabledTritiumSurfaceGridNameFragments = [");
    expect(source).toContain("const disabledShipyardSurfaceGridNameFragments = [");
    expect(source).toContain("const disabledTritiumWorkEffectNameFragments = [");
    expect(source).toContain("const productiveNodeMarkerMinimumVisibleOpacity = 0.2");
    expect(source).toContain("if (!productiveNodeMarkersEnabled)");
    expect(source).toContain("if (!industrialSurfaceLightsEnabled)");
    expect(source).toContain("if (!tritiumWorkEffectsEnabled)");
    expect(source).toContain("enforceDisabledSceneObjectChannels()");
    expect(source).toContain("shouldHideDisabledSceneObject(object.name)");
    expect(source).toContain("disabledProductiveMarkerNameFragments.some");
    expect(source).toContain("disabledTritiumSurfaceGridNameFragments.some");
    expect(source).toContain("disabledShipyardSurfaceGridNameFragments.some");
    expect(source).toContain("disabledTritiumWorkEffectNameFragments.some");
    expect(source).toContain("shouldRenderIndustrialSurfaceLightsForNode");
    expect(source).toContain("computeSolarGlareMarkerOcclusion(worldPosition)");
    expect(source).toContain("computeSolarGlareMarkerOcclusion(motion.position)");
    expect(source).toContain("isWorldPointBehindSolarDisc(worldPosition)");
    expect(source).toContain("sunDistance > 0 && sunDistance < pointDistance");
    expect(source).toContain('"viewer-tritium"');
    expect(source).toContain('"tritium-canister"');
    expect(source).toContain(
      'body.visualClass === "star" ? tacticalMarkerSolarGlowOcclusionRadiusMultiplier : 1'
    );
    expect(source).toContain("paintSolarDustPatternLayer");
    expect(source).toContain("applySolarDustSunNoParticleMask");
    expect(source).toContain("solarDustSunNoParticleRadiusMultiplier");
    expect(source).not.toContain("starfieldSolarMask");
    expect(source).toContain("const solarPointOverlayExclusionRadiusMultiplier = 7.2");
    expect(source).toContain("const solarPointOverlayExclusionPaddingPixels = 320");
    expect(source).toContain("solarProjection.radius * solarPointOverlayExclusionRadiusMultiplier");
    expect(source).toContain("const solarDustSunNoParticleRadiusMultiplier = 5.8");
    expect(source).toContain("const solarDustSunNoParticlePaddingPixels = 220");
    expect(source).toContain("getSolarDustParallaxOffset");
    expect(source).toContain("interpolatedTileableNoise2d");
    expect(source).toContain("tileableValueNoise2d");
    expect(source).not.toContain("interpolatedStaticNoise2d");
    expect(source).toContain("this.solarDustContext.createPattern(");
    expect(source).toContain('globalCompositeOperation = "destination-in"');
    expect(source).toContain("solarDustCanvasMaxWidth");
    expect(source).toContain("const solarDustCanvasMaxWidth = 960");
    expect(source).toContain("const solarDustParticleOpacityMultiplier = 0");
    expect(source).toContain(
      "this.tuning.solarDustOpacity * 1.34 * solarDustParticleOpacityMultiplier"
    );
    expect(source).toContain(
      "this.tuning.solarDustOpacity * 0.78 * solarDustParticleOpacityMultiplier"
    );
    expect(source).not.toContain("Math.min(1180");
    expect(
      source.indexOf("this.applySolarDustSunNoParticleMask(sun, sunNoParticleRadius);")
    ).toBeGreaterThan(source.indexOf("this.paintSolarDustPatternLayer("));
    expect(
      source.indexOf("this.applySolarDustSunNoParticleMask(sun, sunNoParticleRadius);")
    ).toBeLessThan(source.indexOf("const glow = context.createRadialGradient"));
    expect(source).not.toContain("smoothValueNoise2d");
    expect(source).not.toContain("createImageData(width, height)");
    expect(source).toContain("new THREE.PerspectiveCamera(42, 1, 0.1, 64000)");
    expect(source).toContain("sizeAttenuation: false");
    expect(source).toContain("createPhysicalShadowCone");
    expect(source).toContain("physical-shadow-cone");
    expect(source).not.toContain("createShadowTrailTexture");
    expect(source).toContain("syncNodePresentation");
    expect(source).toContain("updateOrbitRailPresentation");
    expect(source).toContain("getNodeWarningLevel?:");
    expect(source).toContain("nodeWarningPulse");
    expect(source).toContain("triggerProductiveMarkerZoomOutFlash");
    expect(source).toContain("productiveMarkerZoomOutFlashStartedAt");
    expect(source).toContain("refreshProductiveMarkerZoomOutFlashFromWheel");
    expect(source).toContain("extendProductiveMarkerZoomOutFlashHold");
    expect(source).toContain("getMusicVisualPulse?:");
    expect(source).toContain("getRawMusicVisualPulse?:");
    expect(source).toContain("getPresentationBeatPulse");
    expect(source).toContain("getProductiveMarkerZoomOutPulseIntensity");
    expect(source).toContain("flashPulseWeight");
    expect(source).not.toContain("scheduleProductiveMarkerZoomOutFlashAfterWheelIdle");
    expect(source).not.toContain("productiveMarkerZoomOutFlashWheelIdleMs");
  });

  it("keeps Saturn rings renderer-owned, tilted, translucent, and scaled near Titan orbit", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const coreSources = collectTypeScriptFiles(join(process.cwd(), "src/core"));

    expect(source).toContain("saturnRingInclinationRadians = Math.PI / 9");
    expect(source).toContain("saturnRingFallbackTiltAxis");
    expect(source).toContain("saturnRingSystemBaseOuterRadius");
    expect(source).toContain("saturnRingTitanOrbitTangentRatio");
    expect(source).toContain('body.id === "saturn"');
    expect(source).toContain("createSaturnRingSystem(this.tuning)");
    expect(source).toContain('"saturn-ring-system"');
    expect(source).toContain("syncSaturnRingSunRadialTilt");
    expect(source).toContain("this.sunPosition.clone().sub(saturnPosition)");
    expect(source).toContain("radialTiltAxis.y = 0");
    expect(source).toContain("applyAxisAngle(radialTiltAxis, saturnRingInclinationRadians)");
    expect(source).toContain("ringSystem.quaternion.setFromUnitVectors(mapPlaneUp, tiltedNormal)");
    expect(source).toContain("getSaturnRingOuterRadiusForTitanOrbit");
    expect(source).toContain('bodiesById.get("titan")');
    expect(source).toContain("titan.orbitRadius * this.getDisplayOrbitScale(titan)");
    expect(source).toContain("THREE.RingGeometry");
    expect(source).toContain("createSaturnRingMaterial");
    expect(source).toContain("THREE.AdditiveBlending");
    expect(source).toContain("reflect(-lightDirection, normal)");
    expect(source).toContain("sunPosition");

    for (const sourcePath of coreSources) {
      const coreSource = readFileSync(sourcePath, "utf8");

      expect(coreSource).not.toContain("saturn-ring-system");
      expect(coreSource).not.toContain("saturnRing");
    }
  });

  it("keeps Jupiter rings renderer-owned, narrow, and readable only close or backlit", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const coreSources = collectTypeScriptFiles(join(process.cwd(), "src/core"));

    expect(source).toContain("jupiterRingInclinationRadians = Math.PI / 24");
    expect(source).toContain("jupiterRingFallbackTiltAxis");
    expect(source).toContain("jupiterRingSystemBaseOuterRadius");
    expect(source).toContain("jupiterRingStrategicOpacity = 0.13");
    expect(source).toContain("jupiterRingCloseOpacityBoost");
    expect(source).toContain("jupiterRingBacklightOpacityBoost");
    expect(source).toContain('body.id === "jupiter"');
    expect(source).toContain("createJupiterRingSystem(this.tuning)");
    expect(source).toContain('"jupiter-ring-system"');
    expect(source).toContain('"jupiter-ring-gossamer-thread"');
    expect(source).toContain("syncJupiterRingSunRadialTilt");
    expect(source).toContain("applyAxisAngle(radialTiltAxis, jupiterRingInclinationRadians)");
    expect(source).toContain("getJupiterRingPresentationOpacity");
    expect(source).toContain("cameraDistanceBodyRadii");
    expect(source).toContain("backlightVisibility");
    expect(source).toContain("headOnOpacity: 1");
    expect(source).toContain("edgeOnOpacityBoost: 1");
    expect(source).toContain("syncPlanetRingOpacity");
    expect(source).toContain("applyPlanetRingGlintMultiplier");
    expect(source).toContain("glintPresentationBoost");
    expect(source).toContain("baseOuterRadius: jupiterRingSystemBaseOuterRadius");

    for (const sourcePath of coreSources) {
      const coreSource = readFileSync(sourcePath, "utf8");

      expect(coreSource).not.toContain("jupiter-ring-system");
      expect(coreSource).not.toContain("jupiterRing");
    }
  });

  it("keeps Neptune rings renderer-owned, cold, sparse, and backlight-reactive", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const coreSources = collectTypeScriptFiles(join(process.cwd(), "src/core"));

    expect(source).toContain("neptuneRingInclinationRadians = THREE.MathUtils.degToRad(28)");
    expect(source).toContain("neptuneRingFallbackTiltAxis");
    expect(source).toContain("neptuneRingSystemBaseOuterRadius");
    expect(source).toContain("neptuneRingPerceptibleOpacityMultiplier = 1");
    expect(source).toContain("neptuneRingBacklightOpacityMultiplier = 0");
    expect(source).toContain('body.id === "neptune"');
    expect(source).toContain("createNeptuneRingSystem(this.tuning)");
    expect(source).toContain('"neptune-ring-system"');
    expect(source).toContain('"neptune-ring-cold-adams"');
    expect(source).toContain('"neptune-ring-frost-galle"');
    expect(source).toContain("syncNeptuneRingSunRadialTilt");
    expect(source).toContain("applyAxisAngle(radialTiltAxis, neptuneRingInclinationRadians)");
    expect(source).toContain("baseOuterRadius: neptuneRingSystemBaseOuterRadius");
    expect(source).toContain("opacity: 0.16");
    expect(source).toContain("opacity: 0.18");
    expect(source).toContain("headOnOpacity: 1");
    expect(source).toContain("edgeOnOpacityBoost: 1");
    expect(source).toContain("glintExponent: 12");
    expect(source).toContain("glintBoost: 0.85");
    expect(source).toContain("syncPlanetRingOpacityMultiplier");
    expect(source).toContain("getIceGiantRingBacklightVisibility");
    expect(source).toContain("planetRingBaseOpacity");

    for (const sourcePath of coreSources) {
      const coreSource = readFileSync(sourcePath, "utf8");

      expect(coreSource).not.toContain("neptune-ring-system");
      expect(coreSource).not.toContain("neptuneRing");
    }
  });

  it("keeps Uranus rings renderer-owned, sparse, dark, and steeply tilted", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const coreSources = collectTypeScriptFiles(join(process.cwd(), "src/core"));

    expect(source).toContain("uranusRingInclinationRadians = THREE.MathUtils.degToRad(100)");
    expect(source).toContain("uranusRingFallbackTiltAxis");
    expect(source).toContain("uranusRingSystemBaseOuterRadius");
    expect(source).toContain("uranusRingPerceptibleOpacityMultiplier = 1.45");
    expect(source).toContain("uranusRingBacklightOpacityMultiplier = 0");
    expect(source).toContain("iceGiantRingBacklightFadeStart = 0.25");
    expect(source).toContain("iceGiantRingBacklightFadeEnd = 0.88");
    expect(source).toContain('body.id === "uranus"');
    expect(source).toContain("createUranusRingSystem(this.tuning)");
    expect(source).toContain('"uranus-ring-system"');
    expect(source).toContain('"uranus-ring-charcoal-epsilon"');
    expect(source).toContain('"uranus-ring-smoke-delta"');
    expect(source).toContain('"uranus-ring-cold-alpha"');
    expect(source).toContain('"uranus-ring-outer-ink"');
    expect(source).toContain('"uranus-ring-charcoal-epsilon-thread"');
    expect(source).toContain('"uranus-ring-cold-alpha-thread"');
    expect(source).toContain("createUranusRingVisibilityThread");
    expect(source).toContain("syncUranusRingSunRadialTilt");
    expect(source).toContain("applyAxisAngle(radialTiltAxis, uranusRingInclinationRadians)");
    expect(source).toContain("baseOuterRadius: uranusRingSystemBaseOuterRadius");
    expect(source).toContain("headOnOpacity: 0.4");
    expect(source).toContain("headOnOpacity: 0.64");
    expect(source).toContain("edgeOnOpacityBoost: 1.52");
    expect(source).toContain("edgeOnOpacityBoost: 0.95");
    expect(source).toContain("ambientLightBoost: 0.2");
    expect(source).toContain("sunFacingExponent: 0.24");
    expect(source).toContain("glintExponent: 5.6");
    expect(source).toContain("glintBoost: 1.15");
    expect(source).toContain("planetRingHeadOnOpacity");
    expect(source).toContain("planetRingEdgeOnOpacityBoost");
    expect(source).toContain("uniform float headOnOpacity");
    expect(source).toContain("uniform float edgeOnOpacityBoost");
    expect(source).toContain("uniform float ambientLightBoost");
    expect(source).toContain("uniform float sunFacingExponent");
    expect(source).toContain("uniform float glintExponent");
    expect(source).toContain("uniform float glintBoost");
    expect(source).toContain("float viewProfile = clamp(");
    expect(source).toContain("viewProfile *");
    expect(source).toContain("syncPlanetRingOpacityMultiplier");
    expect(source).toContain("getIceGiantRingBacklightVisibility");

    for (const sourcePath of coreSources) {
      const coreSource = readFileSync(sourcePath, "utf8");

      expect(coreSource).not.toContain("uranus-ring-system");
      expect(coreSource).not.toContain("uranusRing");
    }
  });

  it("keeps animated planet patterns seamless across the sphere wrap", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const solidSurfaceStart = source.indexOf(
      "float seamlessSolidBodyNoise(vec3 direction, float seed, float frequency)"
    );
    const solidSurfaceEnd = source.indexOf(
      "float moonCircularPatch(vec3 direction, vec3 center, float radius)",
      solidSurfaceStart
    );
    const solidSurfaceSource = source.slice(solidSurfaceStart, solidSurfaceEnd);
    const moonSurfaceStart = source.indexOf(
      "float getMoonSurfaceRelief(vec3 direction, float seed)"
    );
    const moonSurfaceEnd = source.indexOf("void main()", moonSurfaceStart);
    const moonSurfaceSource = source.slice(moonSurfaceStart, moonSurfaceEnd);

    expect(source).toContain("seamlessGasPatternWarp");
    expect(source).toContain("seamlessGasDirectionalWave");
    expect(source).toContain("softenedPatternStep");
    expect(source).toContain("finePatternVisibility");
    expect(source).toContain("giantPatternMask");
    expect(source).toContain("float jupiterPattern = giantPatternMask(1.0)");
    expect(source).toContain("float saturnPattern = giantPatternMask(2.0)");
    expect(source).toContain("float uranusPattern = giantPatternMask(3.0)");
    expect(source).toContain("float neptunePattern = giantPatternMask(4.0)");
    expect(source).toContain("float braidedLatitude =");
    expect(source).toContain("gasWarpA * 0.014");
    expect(source).toContain("slowEddy * 0.008");
    expect(source).toContain("float bandFrequencyA = (7.5 + bodySeed * 5.0)");
    expect(source).toContain("float bandFrequencyB = (13.0 + bodySeed * 5.0)");
    expect(source).toContain("float bandFrequencyC = (22.0 + bodySeed * 6.0)");
    expect(source).toContain("+ gasWarpA * 0.72 * giantTurbulence");
    expect(source).toContain("+ gasWarpB * 0.42 * giantTurbulence");
    expect(source).toContain("bandB * 0.28");
    expect(source).toContain("bandC * 0.05");
    expect(source).toContain("float silkFrequency = 34.0 + bodySeed * 8.0");
    expect(source).toContain("float silkVisibility = finePatternVisibility(silkFrequency) * 0.62");
    expect(source).toContain("float saturnSilkFrequency = 40.0");
    expect(source).toContain("finePatternVisibility(saturnSilkFrequency) * 0.58");
    expect(source).toContain("float silkFilament = softenedPatternStep");
    expect(source).toContain("float jupiterCells = softenedPatternStep");
    expect(source).toContain("float saturnSilk = softenedPatternStep");
    expect(source).toContain("float uranusCurtain = softenedPatternStep");
    expect(source).toContain("float neptuneStorm = softenedPatternStep");
    expect(source).toContain("float auroralUndertow =");
    expect(source).toContain("float solidBodyRotationCue(vec3 direction, float seed)");
    expect(source).toContain("float solidBodyFineMineral(vec3 direction, float seed)");
    expect(source).toContain(
      "solidSurfaceFeatureStrength: { value: getSolidSurfaceFeatureStrength(body) }"
    );
    expect(source).toContain("float seamlessSolidBodyNoise(");
    expect(solidSurfaceSource).not.toContain("atan(");
    expect(solidSurfaceSource).not.toContain("longitude");
    expect(solidSurfaceSource).not.toContain("moonCircularPatch");
    expect(source).not.toContain("float solidBodyImpactBasin(");
    expect(source).not.toContain("float solidBodyCraterField(vec3 direction, float seed)");
    expect(source).not.toContain("float solidBodyBasinField(vec3 direction, float seed)");
    expect(source).toContain(
      "float solidRotationCue = solidBodyRotationCue(localDirection, bodySeed)"
    );
    expect(source).toContain(
      "float solidFineMineral = solidBodyFineMineral(localDirection, bodySeed)"
    );
    expect(source).toContain("vec3 solidBodyRelief = mix(");
    expect(source).toContain("float solidReliefStrength = max(");
    expect(source).toContain("surface = mix(surface, solidBodyRelief, solidReliefStrength)");
    expect(source).toContain("function getSolidSurfaceFeatureStrength(body: BodySnapshot): number");
    expect(source).toContain("hashStringToUnitInterval(`solid-palette:${body.id}`)");
    expect(source).toContain("moonSurfaceFeatureStrength");
    expect(source).toContain("float moonCircularPatch(vec3 direction, vec3 center, float radius)");
    expect(source).not.toContain(
      "float moonCraterRelief(vec3 direction, vec3 center, float radius)"
    );
    expect(source).toContain("float moonArtificialRing(");
    expect(source).toContain("float moonSettlementCorridor(");
    expect(source).toContain("float getMoonSettlementMask(vec3 direction)");
    expect(source).toContain("float getMoonSurfaceRelief(vec3 direction, float seed)");
    expect(source).toContain("float mareField = smoothstep(0.57, 0.78, mareNoise)");
    expect(moonSurfaceSource).not.toContain("atan(");
    expect(moonSurfaceSource).not.toContain("moonCircularPatch");
    expect(moonSurfaceSource).not.toContain("moonCraterRelief");
    expect(source).toContain("moonSurfaceRelief = getMoonSurfaceRelief(localDirection, bodySeed)");
    expect(source).toContain("moonInfrastructureMask = getMoonSettlementMask(localDirection)");
    expect(source).toContain("vec3 moonInfrastructureColor = vec3(0.58)");
    expect(source).toContain("vec3 moonInfrastructureEmission = vec3(0.62)");
    expect(source).toContain("vec3 moonMareColor");
    expect(source).toContain("silkFilament * gasPatternStrength * 0.07");
    expect(source).toContain("jupiterCells * jupiterPattern * gasPatternStrength * 0.055");
    expect(source).not.toContain("float gasLongitude");
    expect(source).not.toContain("vBodyApparentRadius");
    expect(source).not.toContain("gasPatternDetailVisibility");
    expect(source).not.toContain("longitude * (2.0 + bodySeed");
    expect(source).not.toContain("longitude * (1.2 + bodySeed");
    expect(source).not.toContain("localDirection.y * (18.0 + bodySeed * 18.0)");
    expect(source).not.toContain("localDirection.y * (35.0 + bodySeed * 13.0)");
  });

  it("keeps beat sync cached per frame and presentation-only", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const shipModelsSource = readFileSync(
      join(process.cwd(), "src/renderers/cinematic3d/shipModels.ts"),
      "utf8"
    );
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const beatSource = readFileSync(join(process.cwd(), "src/shared/presentationBeat.ts"), "utf8");
    const setSnapshotStart = source.indexOf("  setSnapshot(");
    const animateTurnTransitionStart = source.indexOf("  animateTurnTransition(", setSnapshotStart);
    const setSnapshotSource = source.slice(setSnapshotStart, animateTurnTransitionStart);
    const tacticalSignatureStart = source.indexOf("  private getTacticalPresentationSignature(");
    const tacticalSignatureEnd = source.indexOf(
      "  private getExtremeZoomTacticalUiOpacityMultiplier(",
      tacticalSignatureStart
    );
    const tacticalSignatureSource = source.slice(tacticalSignatureStart, tacticalSignatureEnd);
    const trajectoryDetailModeStart = source.indexOf("  private getTacticalTrajectoryDetailMode(");
    const trajectoryDetailModeEnd = source.indexOf(
      "  private getFutureBurnDestinationLineRadius(",
      trajectoryDetailModeStart
    );
    const trajectoryDetailModeSource = source.slice(
      trajectoryDetailModeStart,
      trajectoryDetailModeEnd
    );

    expect(uiSource).toContain("getRawMusicBeatVisualPulse");
    expect(uiSource).toContain("getRawMusicVisualPulse()");
    expect(source).toContain("frameBeatPulse");
    expect(source).toContain("isRenderingFrame");
    expect(source).toContain("readPresentationBeatPulse");
    expect(source).toContain("presentationBeatGridSubdivisions = 4");
    expect(source).toContain("presentationBeatMaxNudgeRatio = 0.12");
    expect(beatSource).toContain("presentationCycleBeatGridSubdivisions = 32");
    expect(beatSource).toContain("presentationCycleMaxNudgeRatio = 0.12");
    expect(beatSource).toContain("getBeatSynchronizedCycleAngle");
    expect(uiSource).toContain("syncBeatSynchronizedCssAnimations");
    expect(uiSource).toContain("let beatSynchronizedCssAnimationsActive = false");
    expect(uiSource).toContain("if (!beatSynchronizedCssAnimationsActive) {");
    expect(uiSource).toContain("musicPulse === null");
    expect(uiSource).toContain('shell.classList.remove("is-beat-synchronized")');
    expect(source).toContain("getBeatSynchronizedCycleAngle");
    expect(source).toContain("getMillisecondsUntilNextBeatGrid");
    expect(source).toContain("getSecondsUntilNextMainBeat");
    expect(source).toContain("missileExplosionBeatWindowSeconds");
    expect(source).toContain("getNextMainBeatPresentationElapsed");
    expect(source).toContain("getNoLateMainBeatPresentationElapsed");
    expect(source).toContain("getMissileImpactPresentationElapsed");
    expect(source).toContain("nudgeSecondsToBeatGrid");
    expect(source).toContain("nudgeMillisecondsToBeatGrid");
    expect(source).toContain("beatSyncedStartDelayMs");
    expect(source).toContain("beatNudgedDurationMs");
    expect(source).toContain("getBeatSyncedTurnTransitionDelayMs");
    expect(source).toContain("getBeatNudgedTurnTransitionDurationMs");
    expect(source).not.toContain("nudgeProgressToBeatGrid");
    expect(source).not.toContain("nudgeTurnTransitionProgressToBeatGrid");
    expect(source).toContain("getBeatSyncEnabled?: () => boolean");
    expect(source).toContain("private isBeatSyncEnabled(): boolean");
    expect(source).toContain("if (!this.isBeatSyncEnabled())");
    expect(source).not.toContain("isReducedPerformanceMode");
    expect(source).not.toContain("isMinimalPerformanceMode");
    expect(source).toContain("CinematicPerformanceMode");
    expect(source).toContain("export type CinematicPerformanceStats");
    expect(source).toContain("getPerformanceDiagnosticsEnabled?: () => boolean");
    expect(source).toContain("private isPerformanceDiagnosticsEnabled(): boolean");
    expect(source).toContain("performanceSectionKeys");
    expect(source).toContain("private readonly performanceSections");
    expect(source).toContain("EXT_disjoint_timer_query_webgl2");
    expect(source).toContain("private beginGpuFrameTimer(): void");
    expect(source).toContain("private pollGpuFrameTimer(): void");
    expect(source).toContain("private scheduleCinematicShaderWarmup(): void");
    expect(source).toContain("this.renderer.compile(this.scene, this.camera)");
    expect(source).not.toContain("compileAsync(this.scene, this.camera)");
    expect(source).toContain("private enqueueCinematicGeometryWarmup(): void");
    expect(source).toContain("private scheduleCinematicGeometryWarmupBatch(): void");
    expect(source).toContain("private warmCinematicGeometry(");
    expect(source).toContain("new THREE.WebGLRenderTarget(1, 1");
    expect(source).toContain("cinematicGeometryWarmupBatchSize = 4");
    expect(source).toContain("cinematicDecorativePointLightPoolSize = 4");
    expect(source).toContain("private syncCinematicDecorativePointLightPools(): void");
    expect(source).toContain("this.camera.layers.set(cinematicWorldRenderLayer)");
    expect(source).toContain("this.camera.layers.set(cinematicUiBloomRenderLayer)");
    expect(source).toContain("this.requestCinematicResourceWarmup();");
    expect(source).toContain("public getPerformanceStats()");
    expect(source).toContain('this.measurePerformanceSection("turnTransition"');
    expect(source).toContain('this.measurePerformanceSection("nodePresentation"');
    expect(source).toContain('this.measurePerformanceSection("tactical"');
    expect(source).toContain('this.measurePerformanceSection("solarDust"');
    expect(source).toContain('this.measurePerformanceSection("sceneRender"');
    expect(source).toContain('this.measurePerformanceSection("labels"');
    expect(setSnapshotSource.match(/this\.syncScene\(snapshot\);/g)).toHaveLength(1);
    expect(source).toContain("updatePerformanceGovernor");
    expect(source).toContain("performanceFrameSpikeReducedMs");
    expect(source).toContain("performanceSpikeHoldMs");
    expect(source).toContain("performanceStartupEvaluationDelayMs");
    expect(source).toContain(
      'private adaptivePerformanceMode: Exclude<CinematicPerformanceMode, "auto"> = "full"'
    );
    expect(source).toContain('this.adaptivePerformanceMode = "full"');
    expect(source).toContain("adaptivePerformanceHoldUntil");
    expect(source).toContain('this.snapshot.gameMode !== "1p"');
    expect(source).toContain("computeMultiplayerOpeningSystemCameraComposition");
    expect(source).toContain("getMultiplayerOpeningCameraCompositionScore");
    expect(source).toContain("getMultiplayerOpeningCameraYawCandidates");
    expect(source).toContain("getMultiplayerOpeningCameraYaw(");
    expect(source).toContain("multiplayerOpeningCameraYawSearchSpan");
    expect(source).toContain('body.id === "saturn"');
    expect(source).toContain('body.id === "titan"');
    expect(source).toContain('multiplayerOpeningPlutoBodyIds = ["pluto", "pluto_charon"]');
    expect(source).toContain("findOpeningBodyByIds(multiplayerOpeningPlutoBodyIds)");
    expect(source).toContain("multiplayerOpeningFrameBodyIds");
    expect(source).toContain("multiplayerOpeningLeftEdgeBodyIds");
    expect(source).toContain("multiplayerOpeningRightEdgeBodyIds");
    expect(source).not.toContain("rendererPixelRatioHugeViewportFullMax");
    expect(source).not.toContain("rendererPixelRatioMinimalMax");
    expect(source).not.toContain("rendererPixelRatioMinimalMin");
    expect(source).not.toContain("rendererSolarStressMinimalPixelRatioMax");
    expect(source).not.toContain("rendererLargeViewportPixels");
    expect(source).toContain("syncRendererPixelRatio");
    expect(source).toContain("getStableRendererPixelRatio");
    expect(source).toContain("Performance modes never change the game's resolution");
    expect(source).toContain("rendererPixelRatio: this.currentRendererPixelRatio");
    expect(source).toContain("framePerformanceMode");
    expect(source).toContain("refreshFrameVisibilityFrustum");
    expect(source).toContain("isWorldSphereVisibleInFrame");
    expect(source).toContain("hideShipMarkerGroup(nodeObject.shipMarkers)");
    expect(source).toContain("marker.visible = false");
    expect(source).toContain("model.visible = modelOpacity > 0.012");
    expect(shipModelsSource).toContain("cacheShipMarkerPresentationObjects");
    expect(source).toContain("getCachedShipMarkerObject");
    expect(source).toContain("tacticalPresentationFullUpdateSeconds");
    expect(source).toContain("tacticalPresentationReducedUpdateSeconds");
    expect(source).toContain("tacticalPresentationMinimalUpdateSeconds");
    expect(source).toContain("shouldUpdateTacticalPresentationFrame");
    expect(source).toContain("updateActiveBurnMarkerPresentation");
    expect(source).toContain("updateActiveMissileMarkerPresentation");
    expect(source).toContain("activeBurnResolvedTrajectories");
    expect(source).not.toContain("shouldUpdateTacticalPresentationEveryFrame");
    expect(source).toContain('this.recordPerformanceSection("tactical", 0)');
    expect(source).toContain('this.measurePerformanceSection("transitMarkers"');
    expect(source).toContain("getTacticalPresentationSignature");
    expect(tacticalSignatureSource).not.toContain("this.distance");
    expect(tacticalSignatureSource).not.toContain("this.yaw");
    expect(tacticalSignatureSource).not.toContain("this.pitch");
    expect(trajectoryDetailModeSource).toContain('return "full";');
    expect(trajectoryDetailModeSource).not.toContain("this.turnTransition !== null");
    expect(source).toContain("workEffectsFullUpdateSeconds");
    expect(source).not.toContain("workEffectsReducedUpdateSeconds");
    expect(source).not.toContain("workEffectsMinimalUpdateSeconds");
    expect(source).toContain("tritiumWorkStreamsGroup");
    expect(source).toContain("updateTritiumWorkStreams(gameplayElapsed)");
    expect(source).toContain("getGameplayPresentationElapsed");
    expect(source).toContain("tritiumWorkStreamsLastUpdatedAt");
    expect(source).toContain("tritiumWorkStreamsLastSignature");
    expect(source).toContain("tritiumWorkEffects = new Map<string, TritiumWorkEffect>()");
    expect(source).toContain("tritiumStreamSuppressedArrivalTurns");
    expect(source).toContain("captureTritiumStreamArrivalSuppressions");
    expect(source).toContain("isTritiumStreamSuppressedForArrival");
    expect(source).toContain("getTritiumWorkStreamsSignature");
    expect(source).toContain("contestedThrusterJetsFullUpdateSeconds");
    expect(source).not.toContain("contestedThrusterJetsReducedUpdateSeconds");
    expect(source).toContain("getContestedThrusterJetsUpdateIntervalSeconds");
    expect(source).toContain("getContestedThrusterJetGeometry");
    expect(source).toContain("getSharedUnitSphereGeometry");
    expect(source).toContain("solarDustFullUpdateSeconds");
    expect(source).not.toContain("solarDustReducedUpdateSeconds");
    expect(source).not.toContain("solarDustMinimalUpdateSeconds");
    expect(source).toContain("shouldRenderSolarDustFrame");
    expect(source.indexOf("if (!this.shouldRenderSolarDustFrame")).toBeLessThan(
      source.indexOf("if (!this.solarHazeEnabled || !this.tuning.solarDustEnabled)")
    );
    expect(source).toContain("getSolarDustPattern");
    expect(source).toContain("solarDustPattern");
    expect(source).toContain("syncSnapshotPresentationIndexes");
    expect(source).toContain("snapshotBodiesById");
    expect(source).toContain("snapshotNodesById");
    expect(source).toContain("snapshotNodeOccupanciesById");
    expect(source).toContain("nodeOccupanciesById.set(occupancy.nodeId, nodeOccupancies)");
    expect(source).toContain("snapshotOccupiedShipyardBodyIds");
    expect(source).toContain("labelSizeCache");
    expect(source).toContain("getCinematicLabelSize");
    expect(source).toContain("allowDriveWakeDetail");
    expect(source).toContain("allowComplexModelDetail");
    expect(source).toContain("forceMinimalLod");
    expect(source).toContain("if (forceMinimalLod)");
    const shipPresentationStart = source.indexOf("function syncShipMarkerPresentation");
    const collapsedSilhouettePresentation = source.indexOf(
      "if (silhouette !== undefined)",
      shipPresentationStart
    );
    const lightweightShipLodBranch = source.indexOf("if (forceMinimalLod)", shipPresentationStart);
    expect(collapsedSilhouettePresentation).toBeGreaterThan(shipPresentationStart);
    expect(collapsedSilhouettePresentation).toBeLessThan(lightweightShipLodBranch);
    expect(source.match(/shouldForceStrategicShipMarkerLod\(/g)?.length).toBe(2);
    expect(source).not.toContain("forceMinimalLod: this.isMinimalPerformanceMode()");
    expect(source).not.toContain("allowComplexModelDetail: !this.isReducedPerformanceMode()");
    expect(source.match(/allowComplexModelDetail: true/g)?.length).toBeGreaterThanOrEqual(2);
    expect(source).toContain("allowDriveWakeDetail: true");
    expect(source).toContain("shouldForceStrategicShipMarkerLod(detailProgress, false)");
    expect(source).toContain("syncShipComplexModelDetailVisibility");
    expect(source).toContain("setShipModelOpacity(model, modelOpacity, allowComplexModelDetail)");
    expect(shipModelsSource).toContain('"shipComplexModelDetail"');
    expect(source).toContain("usesSharedGeometry");
    expect(source).not.toContain("line.geometry.computeBoundingSphere()");
    expect(uiSource).not.toContain("deltavPerformanceMode");
    expect(source).not.toContain("getBeatNudgedAngularSpeed");
    expect(source).not.toContain("getBeatNudgedLinearSpeed");
  });

  it("keeps snapshot sync from snapping tracked focus during camera pans", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const setSnapshotStart = source.indexOf("  setSnapshot(");
    const animateTurnTransitionStart = source.indexOf("  animateTurnTransition(", setSnapshotStart);
    const setSnapshotSource = source.slice(setSnapshotStart, animateTurnTransitionStart);
    const resizeStart = source.indexOf("  resize(width: number, height: number): void {");
    const fitSystemStart = source.indexOf("  fitSystem(): void {", resizeStart);
    const resizeSource = source.slice(resizeStart, fitSystemStart);
    const helperStart = source.indexOf("  private shouldRecenterTrackedFocusTarget(): boolean {");
    const rawZoomOutStart = source.indexOf("  private getRawZoomOutDistance(", helperStart);
    const helperSource = source.slice(helperStart, rawZoomOutStart);
    const manualPanStart = source.indexOf(
      "  private panByScreenDelta(delta: Vec2, referenceDistance = this.distance): void {"
    );
    const clampFocusStart = source.indexOf(
      "  private clampFocusToVisibleDisplayBounds(",
      manualPanStart
    );
    const manualPanSource = source.slice(manualPanStart, clampFocusStart);
    const tutorialCameraUpdateStart = source.indexOf(
      "  private updateTutorialNodeToNodeCameraAssist("
    );
    const tutorialScreenNudgeUpdateStart = source.indexOf(
      "  private updateTutorialScreenNudgeCameraAssist(",
      tutorialCameraUpdateStart
    );
    const tutorialCameraUpdateSource = source.slice(
      tutorialCameraUpdateStart,
      tutorialScreenNudgeUpdateStart
    );
    const applyPendingTutorialStart = source.indexOf(
      "  private applyPendingTutorialNodeToNodeCameraAssist("
    );
    const applyPendingScreenNudgeStart = source.indexOf(
      "  private applyPendingTutorialScreenNudgeCameraAssist(",
      applyPendingTutorialStart
    );
    const applyPendingTutorialSource = source.slice(
      applyPendingTutorialStart,
      applyPendingScreenNudgeStart
    );

    expect(setSnapshotStart).toBeGreaterThanOrEqual(0);
    expect(animateTurnTransitionStart).toBeGreaterThan(setSnapshotStart);
    expect(resizeStart).toBeGreaterThanOrEqual(0);
    expect(fitSystemStart).toBeGreaterThan(resizeStart);
    expect(helperStart).toBeGreaterThanOrEqual(0);
    expect(rawZoomOutStart).toBeGreaterThan(helperStart);
    expect(manualPanStart).toBeGreaterThanOrEqual(0);
    expect(clampFocusStart).toBeGreaterThan(manualPanStart);
    expect(source).not.toContain("  startTutorialCameraPoseAssist(");
    expect(tutorialCameraUpdateStart).toBeGreaterThanOrEqual(0);
    expect(tutorialScreenNudgeUpdateStart).toBeGreaterThan(tutorialCameraUpdateStart);
    expect(applyPendingTutorialStart).toBeGreaterThanOrEqual(0);
    expect(applyPendingScreenNudgeStart).toBeGreaterThan(applyPendingTutorialStart);
    expect(helperSource).toContain("this.focusPanTransition === null");
    expect(helperSource).toContain("this.arrivalChaseCamera === null");
    expect(helperSource).toContain("!this.hasTutorialCameraAssist()");
    expect(helperSource).toContain(
      "pose.focusOffset === undefined ? pose.trackedFocusTargetKey : null"
    );
    expect(setSnapshotSource).toContain("if (this.shouldRecenterTrackedFocusTarget())");
    expect(setSnapshotSource).not.toContain("if (!this.hasTutorialCameraAssist())");
    expect(resizeSource).toContain("if (this.shouldRecenterTrackedFocusTarget())");
    expect(resizeSource).not.toContain("if (!this.hasTutorialCameraAssist())");
    expect(manualPanSource).toContain("this.focusedTargetKey = null");
    expect(manualPanSource).toContain("this.trackedFocusTargetKey = null");
    expect(manualPanSource).toContain("this.refreshDisplayScale()");
    expect(tutorialCameraUpdateSource).toContain(
      "this.getTutorialPoseTrackedFocusTargetKey(assist.arrivalPose)"
    );
    expect(tutorialCameraUpdateSource).not.toContain(
      "this.trackedFocusTargetKey = assist.arrivalPose.trackedFocusTargetKey"
    );
    expect(applyPendingTutorialSource).toContain("this.focusedTargetKey = null");
    expect(applyPendingTutorialSource).toContain("this.trackedFocusTargetKey = null");
    expect(applyPendingTutorialSource).not.toContain(
      "this.trackedFocusTargetKey = assist.arrivalPose.trackedFocusTargetKey"
    );
  });

  it("keeps beat sync from quantizing per-frame ship movement", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const shipModelsSource = readFileSync(
      join(process.cwd(), "src/renderers/cinematic3d/shipModels.ts"),
      "utf8"
    );
    const combinedSource = `${source}\n${shipModelsSource}`;
    const orbitStart = source.indexOf("function computeNodeShipOrbitAngle");
    const launchStart = source.indexOf("function getStrategicContestedOrbitBasis", orbitStart);
    const transitionStart = source.indexOf("  private updateTurnTransition");
    const transitionEnd = source.indexOf(
      "  private registerMissileImpactPresentations",
      transitionStart
    );

    expect(orbitStart).toBeGreaterThanOrEqual(0);
    expect(launchStart).toBeGreaterThan(orbitStart);
    expect(transitionStart).toBeGreaterThanOrEqual(0);
    expect(transitionEnd).toBeGreaterThan(transitionStart);

    const orbitSource = source.slice(orbitStart, launchStart);
    const transitionSource = source.slice(transitionStart, transitionEnd);

    expect(orbitSource).toContain("const orbitAngularSpeed = tuning.shipOrbitAngularSpeed");
    expect(orbitSource).toContain("elapsed * orbitAngularSpeed");
    expect(orbitSource).toContain("beat pulses can accent lights, not retime motion");
    expect(orbitSource).not.toContain("Math.round");
    expect(orbitSource).not.toContain("Math.floor");
    expect(orbitSource).not.toContain("pulse.phase");
    expect(orbitSource).not.toContain("pulse.intensity");
    expect(source).not.toContain("nudgeAngleTowardBeatAnchor");
    expect(transitionSource).toContain("easeTurnProgress(progress");
    expect(transitionSource).not.toContain("nudgeTurnTransitionProgressToBeatGrid");
    expect(source).toContain("getContinuousPulseBeatTime");
    expect(combinedSource).toContain("context.pulseBeatTime * 0.22");
    expect(source).toContain("elapsed >= effect.nextLaunchTime");
    expect(source).toContain("frame.shipAngularSpeed * (startDelay + ascentDuration * ascent)");
    expect(source).toContain("getTritiumCanisterPreOrbitShipClearance");
    expect(source).toContain("shipAngularSpeed: -this.tuning.shipOrbitAngularSpeed");
    expect(source).toContain("getBeatSynchronizedCycleAngle(elapsed, 18.5, beatPulse)");
    expect(combinedSource).not.toContain("Math.floor(elapsed / pulse.secondsPerPulse)");
    expect(combinedSource).not.toContain("context.pulsePhase * 0.22");
    expect(source).not.toContain("index / particleCountPerStream + extractionBeat.phase");
    expect(source).not.toContain("index / particleCount + extractionBeat.phase");
  });

  it("keeps projected body eclipses shader-owned and separate from space trails", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const eclipseStart = source.indexOf("  private computeProjectedEclipseShadow");
    const nodeScaleStart = source.indexOf("  private getDisplayNodeRingScale", eclipseStart);
    const eclipseSource = source.slice(eclipseStart, nodeScaleStart);

    expect(eclipseStart).toBeGreaterThanOrEqual(0);
    expect(nodeScaleStart).toBeGreaterThan(eclipseStart);
    expect(source).toContain("getLocalSystemRootId");
    expect(eclipseSource).toContain("receiverSystemRootId");
    expect(eclipseSource).toContain("getLocalSystemRootId(casterBody, bodiesById)");
    expect(eclipseSource).toContain("distanceAlongAxis <= 0");
    expect(eclipseSource).toContain(
      "corridorRadius = casterRadius * 0.9 + distanceAlongAxis * 0.012"
    );
    expect(eclipseSource).toContain("perpendicularDistance > corridorRadius + receiverRadiusSafe");
    expect(eclipseSource).toContain("centerFactor");
    expect(eclipseSource).not.toContain("1.28");
    expect(source).toContain("computeReceiverEclipseDiskRadius");
    expect(source).toContain("fullDayHemisphereDiskRadius");
    expect(source).toContain("Math.SQRT2");
    expect(source).toContain("shadowAxisOffset + receiverRadius * 0.995");
    expect(source).not.toContain("(casterRadius / receiverRadiusSafe) * 0.36");
    expect(eclipseSource).not.toContain("0.58");
    expect(eclipseSource).toContain("edgeFeather");
    expect(eclipseSource).not.toContain("new THREE.ConeGeometry");
    expect(source).toContain("finalBodyEclipseMultiplier");
    expect(source).toContain("maxMissileBodyFlashLights = 4");
    expect(source).toContain("missileFlashPositions");
    expect(source).toContain("missileFlashIntensities");
    expect(source).toContain("missileFlashColors");
    expect(source).toContain("missileFlashRadii");
    expect(source).toContain("missileImpactBodyFlashIntensity");
    expect(source).toContain("flashHemisphere");
    expect(source).toContain("flashRetinalWash");
    expect(source).toContain("color += missileFlashLight");
    expect(source).toContain("getMeshLocalDirection");
    expect(source).toContain("length(localDirection - normalize(eclipseCenterDirection))");
    expect(source).toContain("computeReceiverShadowVolume");
    expect(source).toContain("shadowVolumeOrigin");
    expect(source).toContain("shadowVolumeAxis");
    expect(source).toContain("shadowVolumeLength");
    expect(source).toContain("shadowVolumeNearRadius");
    expect(source).toContain("shadowVolumeDarkness");
    expect(source).toContain("finalShadowVolumeMultiplier");
    expect(source).toContain("color *= finalBodyEclipseMultiplier * finalShadowVolumeMultiplier");
    expect(source).toContain("createPhysicalShadowCone");
    expect(source).toContain("createPhysicalShadowConeContrast");
    expect(source).toContain("createPhysicalShadowConeGeometry");
    expect(source).toContain("PhysicalShadowConeHit");
    expect(source).toContain("findFirstPhysicalShadowConeHit");
    expect(source).toContain("updatePhysicalShadowConeGeometry");
    expect(source).toContain("computePhysicalShadowConeRadiusAtDistance");
    expect(source).toContain("const lengthWorld = maxLengthWorld");
    expect(source).not.toContain("const lengthWorld = hit?.length ?? maxLengthWorld");
    expect(source).not.toContain("hit?.farRadius ?? 0");
    expect(source).toContain("28 * lengthMultiplier");
    expect(source).toContain("bodyRadius * 260");
    expect(source).not.toContain("180 * lengthMultiplier");
    expect(source).not.toContain("farCenterIndex");
    expect(source).toContain('cone.name = "physical-shadow-cone"');
    expect(source).toContain('cone.name = "physical-shadow-cone-contrast"');
    expect(source).toContain("cone.renderOrder = 24");
    expect(source).toContain("cone.renderOrder = 25");
    expect(source).toContain("depthTest: true");
    expect(source).toContain("shadowConeContrast");
    expect(source).toContain("shadowCone.position.set(0, 0, 0)");
    expect(source).toContain("shadowConeContrast.position.set(0, 0, 0)");
    expect(source).not.toContain("shadowCone.position.copy(awayFromSun).multiplyScalar");
    expect(source).toContain("shadowCone.quaternion.setFromUnitVectors");
    expect(source).toContain("shadowConeContrast.quaternion.setFromUnitVectors");
    expect(source).toContain("localAwayFromSun");
    expect(source).toContain("getMeshLocalDirection(shadowCone.parent, awayFromSun)");
    expect(source).toContain("getPhysicalShadowConeStyle");
    expect(source).toContain('body.kind !== "moon"');
    expect(source).toContain("coreOpacityMultiplier: 0.92");
    expect(source).toContain("coreOpacityMultiplier: 1.08");
    expect(source).toContain("contrastOpacityMultiplier: 1.08");
    expect(source).toContain("contrastColor: 0x0a0a0a");
    expect(source).toContain("renderOrderOffset: 0.2");
    expect(source).toContain("shadowCone.renderOrder = 24 + shadowStyle.renderOrderOffset");
    expect(source).toContain("shadowConeContrast.renderOrder = 25 + shadowStyle.renderOrderOffset");
    expect(source).toContain("setShaderUniformColor");
    expect(source).toContain("shadowCoreOpacity");
    expect(source).toContain("shadowCoreColor");
    expect(source).toContain("PhysicalShadowConePresentation");
    expect(source).toContain("getPhysicalShadowConePresentation");
    expect(source).toContain("getPhysicalShadowConeDistanceOpacityMultiplier");
    expect(source).toContain("      nearRadius\n    );");
    expect(source).toContain("shadowTailFadeStart");
    expect(source).toContain(
      "float tailFade = 1.0 - smoothstep(shadowTailFadeStart, shadowTailFadeEnd, vConeDepth)"
    );
    expect(source).toContain("shadowCoreOpacity * startFade * tailFade");
    expect(source).toContain("shadowContrastOpacity * penumbra * startFade * tailFade");
    expect(source).toContain("physicalShadowConeOpacity");
    expect(source).toContain("physicalShadowConeContrastOpacity");
    expect(source).toContain("physicalShadowConeContrastColor");
    expect(source).toContain("physicalShadowConeFarRadius");
    expect(source).toContain("shadowContrastOpacity");
    expect(source).toContain("THREE.NormalBlending");
    expect(source).toContain("giantProjectedShadowLengthMultiplier = 0.5");
    expect(source).toContain("getProjectedShadowLengthMultiplier");
    expect(source.indexOf("float finalBodyEclipseMultiplier")).toBeGreaterThan(
      source.indexOf("color += backlightColor")
    );
    expect(source).toContain("smoothstep(\n            eclipseDiskRadius,");
    expect(source).not.toContain("this.applySolarDustOcclusions(pixels, width, height, sun)");
    expect(source).not.toContain("estimateProjectedDustOcclusionSystemSpan");
    expect(source).not.toContain("puffCount");
    expect(source).not.toContain("localHalfWidth");
    expect(source).not.toContain('globalCompositeOperation = "destination-out"');
    expect(source).not.toContain("color: 0x111824");
    const physicalShadowSource = source.slice(
      source.indexOf("function createPhysicalShadowCone("),
      source.indexOf("function computePhysicalShadowConeRadiusAtDistance")
    );
    expect(physicalShadowSource).not.toContain("new THREE.PlaneGeometry");
    expect(source).not.toContain("shadow.renderOrder = 8");
  });

  it("protects the silhouetted solar eclipse presentation", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");

    expect(source).toContain('sprite.name = "sun-corona"');
    expect(source).toContain("blending: THREE.AdditiveBlending");
    expect(source).toContain("depthWrite: false");
    expect(source).toContain("float nightFloor = bodyNightSideDarkness");
    expect(source).toContain("nightClamp * bodyNightSideDarkness * 1.8");
    expect(source).toContain("float eclipseDisk = 0.0");
    expect(source).toContain("eclipseDisk *= smoothstep(0.0, 0.16, nDotL)");
    expect(source).toContain(
      "float finalBodyEclipseMultiplier = mix(1.0, eclipseDarkness, eclipseFactor)"
    );
    expect(source).toContain("color *= finalBodyEclipseMultiplier * finalShadowVolumeMultiplier");
    expect(source.indexOf("color += backlightColor")).toBeLessThan(
      source.indexOf("float finalBodyEclipseMultiplier")
    );
    expect(source).toContain("createSunCorona");
    expect(source).toContain('"sun-corona", sunCoronaEnabled');
    expect(source).not.toContain("createSunEmbers");
    expect(source).not.toContain("sun-embers");
  });

  it("keeps gameplay systems out of the cinematic renderer", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const forbiddenGameplayTerms = ["tritiumIncome", "movementCommand", "victory", "defeat"];

    for (const term of forbiddenGameplayTerms) {
      expect(source.toLowerCase()).not.toContain(term.toLowerCase());
    }

    expect(source).toContain("node.shipyardProgress");
    expect(source).toContain("node.isWorking");
    expect(source).not.toContain("SHIPYARD_PROGRESS");
    expect(source).not.toContain("TRITIUM_INCOME");
  });

  it("keeps strategic warning computation out of node presentation frames", () => {
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const rendererSource = readFileSync(
      join(process.cwd(), "src/renderers/cinematic3d/index.ts"),
      "utf8"
    );
    const nodeWarningCallbackStart = uiSource.indexOf(
      "      getNodeWarningLevel(nodeId: string) {"
    );
    const nodeWarningCallbackEnd = uiSource.indexOf(
      "      getBurnPlan(originNodeId: string, destinationNodeId: string)",
      nodeWarningCallbackStart
    );
    const nodeWarningCallbackSource = uiSource.slice(
      nodeWarningCallbackStart,
      nodeWarningCallbackEnd
    );
    const commandNodeWarningStart = uiSource.indexOf(
      "function getCommandNodeWarningLevel(nodeId: string)"
    );
    const commandNodeWarningEnd = uiSource.indexOf(
      "function hasAffordableLaunchCandidate",
      commandNodeWarningStart
    );
    const commandNodeWarningSource = uiSource.slice(commandNodeWarningStart, commandNodeWarningEnd);
    const getLiveCommandRowsStart = uiSource.indexOf("function getLiveCommandRows(");
    const getLiveCommandRowsEnd = uiSource.indexOf(
      "function getLiveCommandTimelineRows",
      getLiveCommandRowsStart
    );
    const getLiveCommandRowsSource = uiSource.slice(getLiveCommandRowsStart, getLiveCommandRowsEnd);

    expect(uiSource).toContain("type CommandWarningSnapshot");
    expect(uiSource).toContain("let cachedWarningSnapshot");
    expect(uiSource).toContain("computeCommandWarningSnapshot(state)");
    expect(uiSource).toContain("computeCachedNodeWarningLevels(warnings)");
    expect(uiSource).toContain("function getCachedNodeWarningLevels()");
    expect(nodeWarningCallbackSource).toContain("return getCommandNodeWarningLevel(nodeId);");
    expect(nodeWarningCallbackSource).not.toContain("getCommandWarnings");
    expect(nodeWarningCallbackSource).not.toContain("evaluateFactionRecoveryPath");
    expect(nodeWarningCallbackSource).not.toContain("calculateBurnPlan");
    expect(commandNodeWarningSource).toContain("getCachedNodeWarningLevels().get(nodeId)");
    expect(commandNodeWarningSource).not.toContain("getCommandWarnings");
    expect(commandNodeWarningSource).not.toContain("evaluateFactionRecoveryPath");
    expect(getLiveCommandRowsSource).toContain(
      "const warningSnapshot = getCachedCommandWarningSnapshot()"
    );
    expect(getLiveCommandRowsSource).toContain("warningSnapshot.projectedDv");
    expect(getLiveCommandRowsSource).toContain("warningSnapshot.warnings");
    expect(rendererSource).toContain('this.recordDebugCounter?.("syncNodePresentation")');
    expect(rendererSource).not.toContain("getCommandWarnings");
    expect(rendererSource).not.toContain("evaluateFactionRecoveryPath");
    expect(rendererSource).not.toContain("getAiSolvencyTritiumCountAudits");
  });

  it("caches core burn plans and exposes debug counters behind performance diagnostics", () => {
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const performanceDiagnosticsSource = readFileSync(
      join(process.cwd(), "src/ui/performanceDiagnostics.ts"),
      "utf8"
    );
    const coreSource = readFileSync(
      join(process.cwd(), "src/core/simulation/gameState.ts"),
      "utf8"
    );
    const indexSource = readFileSync(join(process.cwd(), "src/core/index.ts"), "utf8");

    expect(coreSource).toContain("const burnPlanCacheByContent = new WeakMap");
    expect(coreSource).toContain("function getBurnPlanCache(");
    expect(coreSource).toContain("function getBurnPlanCacheKey(");
    expect(coreSource).toContain('recordSimulationPerformanceCounter("calculateBurnPlan")');
    expect(coreSource).toContain(
      'recordSimulationPerformanceCounter("calculateBurnPlanFromPosition")'
    );
    expect(coreSource).toContain(
      'recordSimulationPerformanceCounter("evaluateFactionRecoveryPath")'
    );
    expect(coreSource).toContain(
      'recordSimulationPerformanceCounter("getAiSolvencyTritiumCountAudits")'
    );
    expect(coreSource).toContain("setSimulationPerformanceCountersEnabled");
    expect(coreSource).toContain("flushSimulationPerformanceCounters");
    expect(indexSource).toContain("flushSimulationPerformanceCounters");
    expect(indexSource).toContain("setSimulationPerformanceCountersEnabled");
    expect(uiSource).toContain("syncPerformanceDiagnosticsCountersEnabled()");
    expect(uiSource).toContain("samplePerformanceCounterRates(now)");
    expect(performanceDiagnosticsSource).toContain("formatPerformanceCounterRateLines");
    expect(uiSource).toContain('recordBrowserPerformanceCounter("getCommandWarnings")');
  });

  it("keeps future FIRE impact arms at the smallest-node scale", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const previewPathStart = source.indexOf("  private getFirePreviewDisplayPath(");
    const previewPathEnd = source.indexOf(
      "  private renderFireFutureTargetPreview(",
      previewPathStart
    );
    const markerSyncStart = source.indexOf("function syncFutureFireImpactMarker(");
    const markerSyncEnd = source.indexOf("function syncFutureFireImpactArmLayer(", markerSyncStart);
    const previewPathSource = source.slice(previewPathStart, previewPathEnd);
    const markerSyncSource = source.slice(markerSyncStart, markerSyncEnd);
    const incomingPreviewStart = source.indexOf("  private renderIncomingFireTargetPreviews(");
    const incomingPreviewEnd = source.indexOf(
      "  private prepareFutureFireImpactLabelAvoidBounds(",
      incomingPreviewStart
    );
    const incomingPreviewSource = source.slice(incomingPreviewStart, incomingPreviewEnd);

    expect(source).toContain("futureFireImpactFallbackSmallestOrbitRadius = 7");
    expect(source).toContain("futureFireImpactArmLengthScale = 0.9");
    expect(source).toContain("futureFireImpactTickMinimumOuterRadiusPixels = 11");
    expect(source).toContain("private getFutureFireImpactArmOuterRadiusWorld(scale = 1)");
    expect(source).toContain(
      "private getFireImpactArmHalfWidthWorld(trajectory: ResolvedFireTrajectory)"
    );
    expect(source).toContain("this.getFireImpactArmHalfWidthWorld(resolvedTrajectory)");
    expect(incomingPreviewSource).toContain(
      "resolvedTrajectory === null\n            ? undefined\n            : this.getFireImpactArmHalfWidthWorld(resolvedTrajectory)"
    );
    expect(incomingPreviewSource).toContain("          impactArmHalfWidthWorld,");
    expect(source).toContain("node.nodeOrbitRadius * ringScale");
    expect(source).toContain(
      "return referenceOrbitRadius * scale * futureFireImpactArmLengthScale"
    );
    expect(previewPathSource).toContain(
      "this.getFutureFireImpactArmOuterRadiusWorld(markerScaleMultiplier)"
    );
    expect(previewPathSource).not.toContain("target.ringRadius");
    expect(markerSyncSource).toContain(
      "proportions.outerRadiusWorld / Math.max(0.001, futureFireImpactTickOuterRadius)"
    );
    expect(markerSyncSource).toContain(
      "layer.scale.setScalar(armMarkerScale / Math.max(0.001, markerScale))"
    );
    expect(markerSyncSource).toContain("getFutureFireImpactMarkerProportions(");
    expect(markerSyncSource).toContain("targetPointScale");
    expect(source).toContain("futureFireImpactTargetPointStrokeRadiusMultiplier");
    expect(source).toContain("futureFireImpactArmGapStrokeMultiplier");
    expect(source).toContain("futureFireImpactArmMinimumLengthOuterRadiusRatio");
    expect(source).toContain("futureFireImpactArmMaximumLengthOuterRadiusRatio");
    expect(source).toContain("targetPointRadiusWorld + targetPointGapWorld");
    expect(source).toContain('"future-fire-impact-target-point-fire-rim"');
    expect(source).toContain("targetPointRim.material.color.set(fireColor)");
    expect(source).toContain("targetPoint.material.color.set(targetColor)");
    expect(source).toContain("const targetOpacity = clamp(opacity * 1.65, 0, 1)");
    expect(source).toContain("this.tuning.firePreviewOpacity * (isTargetHovered ? 1 : 0.58)");
    expect(source).toContain("const tickOpacity = clamp(armOpacity, 0, 1)");
    expect(source).toContain("setExclusiveObjectRenderLayer(ticks, cinematicUiBloomRenderLayer)");
    expect(source).toContain(
      "setExclusiveObjectRenderLayer(targetPointRim, cinematicUiBloomRenderLayer)"
    );
  });

  it("keeps FIRE presentation explicit and visually separate from BURN", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const orbitInterpolationSource = readFileSync(
      join(process.cwd(), "src/renderers/cinematic3d/orbitInterpolation.ts"),
      "utf8"
    );
    const incomingPreviewStart = source.indexOf("  private renderIncomingFireTargetPreviews(");
    const incomingPreviewEnd = source.indexOf(
      "  private getFutureFireTargetLineRadius(",
      incomingPreviewStart
    );
    const incomingPreviewSource = source.slice(incomingPreviewStart, incomingPreviewEnd);
    const firePreviewStart = source.indexOf("  private renderFireFutureTargetPreview(");
    const firePreviewEnd = source.indexOf("  private getHoverFirePlan(", firePreviewStart);
    const firePreviewSource = source.slice(firePreviewStart, firePreviewEnd);
    const evadePresentationStart = source.indexOf("  private renderEvadedMissilePresentations()");
    const evadePresentationEnd = source.indexOf(
      "  private renderMissileSolutionBrokenPresentations()",
      evadePresentationStart
    );
    const evadePresentationSource = source.slice(evadePresentationStart, evadePresentationEnd);
    const transientPresentationStart = source.indexOf(
      "  private updateTransientMissilePresentations()"
    );
    const transientPresentationEnd = source.indexOf(
      "  private shouldUpdateTransientMissilePresentations()",
      transientPresentationStart
    );
    const transientPresentationSource = source.slice(
      transientPresentationStart,
      transientPresentationEnd
    );
    const confirmedBurnEffectStart = source.indexOf("  private renderConfirmedBurnOrderEffect(");
    const confirmedBurnEffectEnd = source.indexOf(
      "  private renderConfirmedFireOrderEffect(",
      confirmedBurnEffectStart
    );
    const confirmedBurnEffectSource = source.slice(
      confirmedBurnEffectStart,
      confirmedBurnEffectEnd
    );
    const trajectoryPreviewSource = readFileSync(
      join(process.cwd(), "src/renderers/cinematic3d/trajectoryPreview.ts"),
      "utf8"
    );
    const styles = readFileSync(join(process.cwd(), "src/styles.css"), "utf8");

    expect(source).toContain("selectedActionMode");
    expect(source).toContain('"fire"');
    expect(source).toContain("getSelectedFireOriginNodeId");
    expect(source).toContain("tryRequestFireOrder");
    expect(source).toContain("firePreviewGroup");
    expect(source).toContain("confirmedBurnEffectGroup");
    expect(source).toContain("confirmedFireEffectGroup");
    expect(source).toContain("syncConfirmedFireSolutionStartTimes");
    expect(source).toContain("renderConfirmedBurnOrderEffect(order)");
    expect(source).toContain("renderConfirmedFireOrderEffect(order)");
    expect(confirmedBurnEffectStart).toBeGreaterThanOrEqual(0);
    expect(confirmedBurnEffectEnd).toBeGreaterThan(confirmedBurnEffectStart);
    expect(confirmedBurnEffectSource).toContain("showArrivalAperture: false");
    expect(source).toContain("animateConfirmedTrajectoryEffect(");
    expect(source).toContain('presentation: "confirmed"');
    expect(source).toContain("fireConfirmedSolutionRevealDurationSeconds");
    expect(source).toContain("fireConfirmedSolutionFadeDurationSeconds");
    expect(source).toContain("fireConfirmedSolutionAimAcquireProgress");
    expect(source).toContain("initialSolutionPoints: initialAimPoints");
    expect(source).toContain("computeConfirmedFireArcPhase(");
    expect(source).toContain("initialAimPoints");
    expect(source).not.toContain("buildConfirmedFireAdjustmentTrajectory(");
    expect(trajectoryPreviewSource).not.toContain("tactical elbow");
    expect(source).toContain("pendingFireGroup");
    expect(source).toContain("activeMissileGroup");
    expect(source).toContain("buildMissileTrajectoryPreview");
    expect(source).toContain("getFireOriginRenderData");
    expect(source).toContain("captureDepartingMissileLaunchSamples(from, to)");
    expect(source).toContain("activeMissileLaunchPositions");
    expect(source).toContain("activeMissileLaunchDirections");
    expect(source).toContain("activeMissileLaunchAngles");
    expect(source).toContain("activeMissileTargetAngles");
    expect(source).toContain("captureResolvingMissileTargetAngles");
    expect(source).toContain("getFirePlanTargetOrbitAngle");
    expect(source).toContain("getFirePlanPresentationKey");
    expect(source).toContain("createPreviewFireLaunchOriginRenderData");
    expect(source).toContain("lockedTargetOrbitAngle");
    expect(source).toContain("lockedOrbitAngle === undefined");
    expect(trajectoryPreviewSource).toContain("appendMissileTerminalIngressPoints");
    expect(source).toContain("renderIncomingFireTargetPreviews");
    expect(source).toContain("renderPendingBurnFutureDestinationLink");
    expect(source).toContain("pending-burn-future-destination-link");
    expect(source).toContain("groupIncomingMissilesByTarget");
    expect(source).toContain("getEarliestIncomingMissile");
    expect(source).toContain("getIncomingFireImpactChronology");
    expect(source).toContain("compareFireArrivalsForPresentation");
    expect(source).toContain("pendingFireOrders].sort(");
    expect(source).toContain("presentations.sort(compareFireArrivalsForPresentation)");
    expect(source).toContain("private getFireImpactBillboardAnchor(");
    expect(source).toContain("private prepareFutureFireImpactLabelAvoidBounds(");
    expect(source).toContain("futureFireImpactLabelAvoidBounds");
    expect(source).toContain("futureFireImpactLabelGapPixels = 5");
    expect(source).toContain("additionalAvoidBounds");
    expect(source).toContain("createCenteredScreenRect(");
    expect(source).toContain('link.name = "fire-impact-chronology-link"');
    expect(source).toContain("previousImpactTurn ?? impact.issuedTurn");
    expect(source).toContain("this.futureDestinationGroup.add(link, ...timingPreview.timingDots)");
    expect(source).toContain("...snapshot.pendingFireOrders");
    expect(source).toContain("getCurrentDisplayNodeRenderData");
    expect(source).toContain("getDisplayNodeRenderDataFromSnapshot(nodeId, this.snapshot)");
    expect(source).toContain("impactMarker.name = `fire-future-impact-marker:");
    expect(source).toContain("createFutureFireImpactMarker");
    expect(source).not.toContain('terminal.name = "fire-impact-terminal-tick"');
    expect(incomingPreviewSource).toContain("this.getCachedFutureFireImpactMarker(");
    expect(incomingPreviewSource).toContain("const targetColor = this.getFactionColor(");
    expect(incomingPreviewSource).toMatch(
      /this\.createFutureOrbitTimingPreview\([\s\S]*?impact\.impactTurn,\s*targetColor,/
    );
    expect(incomingPreviewSource).toMatch(
      /this\.getCachedOrbitTimingSegment\([\s\S]*?timingPreview\.points,\s*targetColor,/
    );
    expect(firePreviewSource).toContain("this.getCachedFutureFireImpactMarker(");
    expect(incomingPreviewSource).not.toContain("this.getCachedFutureNodeGhost(");
    expect(firePreviewSource).not.toContain("this.getCachedFutureNodeGhost(");
    expect(source).toContain("getFireTargetFactionColor");
    expect(source).toContain("getFirePlanOriginFactionId");
    expect(source).toContain("const originFactionId = this.getFirePlanOriginFactionId(plan)");
    expect(source).toContain("this.getFactionColor(impact.targetFactionId)");
    expect(source).toContain("const targetColor = this.getFireTargetFactionColor(plan)");
    expect(firePreviewSource).toContain("this.createFutureOrbitTimingPreview(");
    expect(firePreviewSource).toContain("targetColor,");
    expect(firePreviewSource).toContain("...timingPreview.timingDots");
    expect(firePreviewSource).toContain('link.name = "fire-target-prediction-track"');
    expect(source).not.toContain("`IMPACT T-");
    expect(source).toContain("marker.position.copy(destination.center)");
    expect(firePreviewSource).toContain("end: futureTarget");
    expect(firePreviewSource).not.toContain("endClearanceWorld");
    expect(source).toContain("const shouldLeaveImpactMarkerClear = activeProgress === undefined");
    expect(source).toContain("this.getFirePreviewDisplayPath(");
    expect(source).toContain("trimFirePreviewPathBeforeImpact(");
    expect(source).toContain("firePreviewImpactGapPixels");
    expect(source).toContain("createFirePreviewEffect(previewPoints");
    expect(source).not.toContain("createFirePreviewEffect(trajectory.points");
    expect(firePreviewSource).not.toContain("getCachedFutureFireOrbitGhost(");
    expect(firePreviewSource).toContain("createFirePredictionRulerTicks(");
    expect(firePreviewSource).not.toContain("firePreviewEffectsEnabled");
    expect(source).toContain(
      "(originFactionId === null || occupancy.factionId !== originFactionId)"
    );
    expect(source).toContain("(originFactionId === null || order.factionId !== originFactionId)");
    expect(source).toContain("(originFactionId === null || transit.factionId !== originFactionId)");
    expect(trajectoryPreviewSource).toContain("missileTrajectoryBaseHeightScale");
    expect(trajectoryPreviewSource).toContain("missileTrajectoryExtraLiftScale");
    expect(source).toContain('"future-fire-impact-diagonal-ticks"');
    expect(source).toContain('"future-fire-impact-target-point"');
    expect(source).toContain("targetPoint.rotation.x = -Math.PI / 2");
    expect(source).toContain("futureFireImpactTickMinimumOuterRadiusPixels = 11");
    expect(source).toContain("futureFireImpactTickThicknessPixels = 1.35");
    expect(source).toContain("futureFireImpactFallbackSmallestOrbitRadius = 7");
    expect(source).toContain("minimumTickOuterRadiusWorld");
    expect(source).toContain("getBurnTrajectoryCoreHalfWidth(");
    expect(firePreviewSource).toContain("this.getFireImpactArmHalfWidthWorld(resolvedTrajectory)");
    expect(firePreviewSource).toContain("sourceTrajectoryKey");
    expect(source).toContain("createFutureFireImpactArmLayer(");
    expect(source).toContain('"future-fire-impact-diagonal-ticks-glow"');
    expect(source).toContain('"future-fire-impact-diagonal-ticks-edge"');
    expect(source).toContain("futureFireImpactArmDashLength");
    expect(source).toContain('marker.userData["futureFireImpactAnimated"] = isAnimated');
    expect(source).toContain("syncFutureFireImpactMarkerAnimation(");
    expect(source).toContain("sourceAnimationState.phase /");
    expect(source).toContain("armHalfWidthWorld * 2.45");
    expect(source).toContain(
      "proportions.outerRadiusWorld / Math.max(0.001, futureFireImpactTickOuterRadius)"
    );
    expect(source).toContain(
      "layer.scale.setScalar(armMarkerScale / Math.max(0.001, markerScale))"
    );
    expect(source).toContain("this.getFutureFireImpactArmOuterRadiusWorld(markerScaleMultiplier)");
    expect(source).toContain("syncFutureFireImpactTicksGeometry(");
    expect(source).not.toContain("ticks.scale.setScalar(tickScale)");
    expect(source).toContain("new THREE.Float32BufferAttribute(positions, 3)");
    expect(source).toContain("futureGhostCache");
    expect(source).toContain("orbitTimingDotCache");
    expect(source).toContain("createMissileMarkerObject");
    expect(source).toContain("getMissileLaunchPresentation");
    expect(source).toContain("missileLaunchDriftScreenPixels");
    expect(source).toContain("getRenderedShipMissileLaunchSample");
    expect(source).toContain("missileLaunchMountLocalPosition");
    expect(source).toContain("missile-engine-trail");
    expect(source).toContain("missile-ignition-flash");
    expect(source).toContain("enginePower: launchPresentation.enginePower");
    expect(source).toContain("ignitionFlash: launchPresentation.ignitionFlash");
    expect(source).toContain("trailProgress");
    expect(source).toContain("syncMissileMarkerPresentation");
    expect(source).toContain("getActiveMissileTrajectoryVisibleStartProgress");
    expect(source).toContain("getMissileFlightProgress");
    expect(source).toContain("alignMissileFlightProgressToImpactPresentation");
    expect(source).toContain("getMissileDefenseNeutralizationFlightProgress");
    expect(source).toContain("renderResolvingBurnOrderWithdrawals");
    expect(source).toContain("renderResolvingFireOrderWithdrawals");
    expect(source).toContain("renderResolutionTrajectoryWithdrawal");
    expect(source).toContain("renderFutureTimingWithdrawal");
    expect(source).toContain("turnOrderWithdrawalStartProgress = 0.035");
    expect(source).toContain("turnOrderWithdrawalEndProgress = 0.62");
    expect(source).toContain("slicePolylineByDistance(options.points, 0, visibleDistance)");
    expect(source).toContain("name: `burn-order-withdrawal:${order.id}`");
    expect(source).toContain("name: `fire-order-withdrawal:${order.id}`");
    expect(source).toContain("`${missile.id}:tracking-lost:${transition.to.turn}`");
    expect(source).toContain("missileImpactVisualProgress");
    expect(source).toContain("missileImpactGroup");
    expect(source).toContain("missileEvadePresentations");
    expect(source).toContain("missileSolutionBrokenPresentations");
    expect(source).toContain("missileVoidBurstPresentations");
    expect(source).toContain("updateMissileThreatIndicators");
    expect(source).toContain('missile.targetFactionId === "player"');
    expect(source).toContain("clampScreenPointToEdge");
    expect(source).toContain("missileThreatIndicatorSmoothAlpha");
    expect(styles).toContain("cinematic-missile-threat");
    expect(styles).not.toContain("cinematic-missile-threat__pointer");
    expect(source).toContain('event.type === "EVADE"');
    expect(source).toContain("missile.impactTurn === transition.to.turn");
    expect(source).toContain("event.missileId === missile.id");
    expect(source).toContain('event.type === "MISSILE_SOLUTION_BROKEN"');
    expect(source).toContain("renderMissileSolutionBrokenPresentations");
    expect(source).toContain("missile-solution-broken-trajectory");
    expect(source).toContain("missileSolutionBrokenTrajectoryWithdrawalDurationSeconds = 0.56");
    expect(evadePresentationSource).toContain("disableBlink: true");
    expect(evadePresentationSource).not.toContain("const blink");
    expect(evadePresentationSource).not.toContain("* blink");
    expect(transientPresentationSource).toContain(
      'this.clearTrajectoryLabelsByScope("missile-transient")'
    );
    expect(evadePresentationSource).toContain('"missile-transient"');
    expect(evadePresentationSource).toContain("`missile-evade:${labelKey}`");
    expect(source).toContain("missileOverviewBlinkFloor = 0.64");
    expect(source).toContain("context.elapsed * 12.4 * animationSpeedMultiplier");
    expect(source).toContain("const withdrawalProgress = smoothStep(");
    expect(source).toContain("missileDistance + remainingDistance,");
    expect(source).toContain("missileDistance,\n        withdrawalProgress");
    expect(source).toContain(
      "slicePolylineByDistance(points, missileDistance, visibleEndDistance)"
    );
    expect(source).toContain("renderMissileOffTargetFlight");
    expect(source).toContain('"missile-off-target-flight-marker"');
    expect(source).toContain("missileOffTargetDeflectionStartProgress = 0.46");
    expect(source).toContain("missileOffTargetOverviewMarkerScreenPixels = 4.8");
    expect(source).toContain(
      'this.registerMissileVoidBurstPresentation(\n          missile,\n          "off-target"'
    );
    expect(source).toContain(
      "`${source}:${missile.id}:${missile.targetNodeId}:${missile.targetFactionId}:T${scheduledTurn}`"
    );
    expect(source).not.toContain('"TRACKING LOST"');
    expect(source).not.toContain("getEvadeOrbitTilt");
    expect(source).toContain("createMissileEvadeTracerBurst");
    expect(source).toContain("missile-evade-pds-tracer-burst");
    expect(source).toContain("createMissileEvadeProjectileSaturation");
    expect(source).toContain("missile-evade-pds-projectile-saturation");
    expect(source).toContain("missileEvadeProjectileCount = 450");
    expect(source).toContain("missileEvadeTracerProjectileIntervalA = 3");
    expect(source).toContain("missileEvadeTracerProjectileIntervalB = 2");
    expect(source).toContain("missileEvadeCentralTracerIntervalMultiplier = 160");
    expect(source).toContain("missileEvadeTracerMaxConeRadiusRatio = 0.48 / 4.78");
    expect(source).toContain("missileEvadeTracerMinimumMissRadiusRatio = 0.018");
    expect(source).toContain("missileEvadeOffTargetTracerInterval = 8");
    expect(source).toContain("missileEvadeTracerBurstDurationSeconds = 0.6");
    expect(source).toContain("missileEvadeTracerTerminalAccelerationExponent = 2.6");
    expect(source).toContain("missileEvadeTracerSpiralTurns = 6");
    expect(source).toContain("missileEvadeTracerSpiralEaseExponent = 2.2");
    expect(source).toContain("missileEvadeTracerAfterglowDurationSeconds = 2.72");
    expect(source).toContain("missileEvadeTracerFlightDurationSeconds = 0.24");
    expect(source).toContain("missileEvadeTracerTrailLengthRatio = 0.42");
    expect(source).toContain("missileEvadeTracerImpactTrailCollapseSeconds = 1.2");
    expect(source).toContain("missileEvadeTracerWallFadeSeconds = 2.56");
    expect(source).toContain("missileEvadeTracerTrailPointSamples = 40");
    expect(source).toContain("missileEvadeTracerMissileApproachRatio = 0.2");
    expect(source).toContain("missileEvadeNeutralizationExplosionScale = 0.6");
    expect(source).toContain(
      'missileEvadeProjectilePresentationStyle: "saturation" | "tracer-lines"'
    );
    expect(source).toContain('return "tracer-lines";');
    expect(source).toContain("missileEvadeProjectileTrailSamples = 5");
    expect(source).toContain("missileEvadeProjectileTravelDurationSeconds = 0.24");
    expect(source).toContain("missileEvadeProjectileFlightDurationSeconds = 0.6");
    expect(source).toContain("missileEvadeProjectileDistanceFadeStartRatio = 1.14");
    expect(source).toContain("missileEvadeProjectileTrailLengthRatio = 0.045");
    expect(source).toContain("const trailFlightProgress =");
    expect(source).toContain("const flightDuration = isTargetShot");
    expect(source).toContain("gl_PointSize = 1.0");
    expect(source).toContain('geometry.setAttribute("projectileOpacity"');
    expect(source).toContain("const tracerColor = 0xffffff");
    expect(source).toContain("function getMissileEvadeTracerSpiralProgress");
    expect(source).toContain("function getMissileEvadeTracerNeutralizationPosition");
    expect(source).toContain("function getMissileEvadeNeutralizationDelaySeconds");
    expect(source).toContain("function getMissileEvadeTracerTargetShotImpactSeconds");
    expect(source).toContain(
      "const detonationDelaySeconds = getMissileEvadeNeutralizationDelaySeconds("
    );
    expect(source).toContain(
      "const finalNeutralizationPosition = getMissileEvadeTracerNeutralizationPosition("
    );
    expect(source).toContain('trailGeometry.setAttribute("tracerOpacity"');
    expect(source).toContain('"tracerHeadOpacity"');
    expect(source).toContain('"tracerTrailOpacity"');
    expect(source).toContain("gl_PointSize = 1.0");
    expect(source).toContain("const isTargetShot = projectileIndex + projectileInterval");
    expect(source).toContain("const trailStartDistance = Math.max(0, headDistance - trailLength)");
    expect(source).toContain("const wallFade =");
    expect(source).toContain("getCurrentMissileEvadeMuzzlePosition(presentation)");
    expect(source).toContain("tracerMuzzlePositions: new Map()");
    expect(source).toContain("getMissileEvadeTracerMuzzlePosition(presentation, projectileIndex)");
    expect(source).toContain("missileEvadeDetonationDelaySeconds");
    expect(source).toContain("createMissileShipDestructionEffectGroup");
    expect(source).toContain('defenseFlash.name = "missile-evade-neutralization-ship-destruction"');
    expect(source).toContain(
      "missileImpactFlashDurationSeconds + missileImpactAfterglowDurationSeconds"
    );
    expect(source).not.toContain("point-defense");
    expect(source).not.toContain("missile-evade-pds-muzzle-flash");
    expect(source).not.toContain("missile-evade-nuclear-glare");
    expect(source).not.toContain("getMissileEvadeWhiteoutOpacity");
    expect(source).toContain("detonationPosition: detonationPosition.clone()");
    expect(source).toContain("neutralizationProgress");
    expect(evadePresentationSource).toContain("const trajectory = this.resolveFireTrajectory");
    expect(evadePresentationSource).toContain(
      "const missileProgressAtEvade = presentation.neutralizationProgress"
    );
    expect(source).toContain("automaticEvadeDvCostForPresentation");
    expect(source).toContain('"T-0 BURN"');
    expect(source.indexOf('event.type === "EVADE"')).toBeLessThan(
      source.indexOf("presentationProgress < missileImpactVisualProgress")
    );
    expect(source).toContain("missileWreckageGroup");
    expect(source).toContain("createMissileWreckageChunkObject");
    expect(orbitInterpolationSource).toContain("contestedUpkeepImpactVisualProgress = 0.08");
    expect(source).toContain("getContestedUpkeepImpactWorldPosition");
    expect(source).toContain("anchorTurn: transition.from.turn");
    expect(source).toContain("const missileImpactFlashDurationSeconds = 0.3");
    expect(source).toContain("const missileImpactAfterglowDurationSeconds = 0.86");
    expect(source).toContain("const missileImpactSensorWhiteoutPeakSeconds = 0.018");
    expect(source).toContain("const missileImpactSensorWhiteoutFadeSeconds = 0.095");
    expect(source).toContain("const missileImpactSensorWhiteoutPeakOpacity = 0.72");
    expect(source).toContain("const missileImpactSensorWhiteoutFullZoomRatio = 0.18");
    expect(source).toContain("const missileImpactSensorWhiteoutHiddenZoomRatio = 0.42");
    expect(source).toContain("const missileVoidBurstFlashDurationSeconds = 0.22");
    expect(source).toContain("const missileVoidBurstAfterglowDurationSeconds = 0.54");
    expect(source).toContain("missileVoidBurstVisualProgressTurnOffset");
    expect(source).toContain("startedAt: this.getNextMainBeatPresentationElapsed()");
    expect(source).toContain("startedAt: this.getMissileImpactPresentationElapsed()");
    expect(source).toContain("never wait for the next one");
    expect(source).toContain("missileImpactWhiteoutElement");
    expect(source).toContain("updateMissileImpactWhiteout(elapsed)");
    expect(source).toContain("getMissileImpactWhiteoutOpacity");
    expect(source).toContain("getMissileVoidBurstWhiteoutOpacity");
    expect(source).toContain('event.type === "SHIP_DESTROYED"');
    expect(source).toContain("createsScreenRetinalAfterimage: destroysShip");
    expect(source).toContain("updateShipDestructionRetinalAfterimages(elapsed)");
    expect(source).toContain("getShipDestructionRetinalAfterimageViewportPosition");
    expect(source).toContain('element.className = "cinematic-ship-destruction-retinal-afterimage"');
    expect(source).toContain("element.style.left = `${(viewportPosition.x * 100).toFixed(3)}%`");
    expect(source).toContain("element.style.top = `${(viewportPosition.y * 100).toFixed(3)}%`");
    expect(source).not.toContain("getContestedSkirmishVoidBurstWhiteoutOpacity");
    expect(source).toContain("getMissileVoidBurstCloseIntensity");
    expect(source).toContain(
      "const zoomOutRatio = clamp(this.distance / Math.max(1, this.getZoomOutLimit()), 0, 1)"
    );
    expect(source).toContain("const zoomWhiteoutGate =\n      1 -");
    expect(source).toContain("if (zoomWhiteoutGate <= 0.001)");
    expect(source).toContain("THREE.MathUtils.lerp(0.68, 0.86, zoomWhiteoutGate)");
    expect(source).toContain("1 - smoothStep(0.02, 0.82, afterglowProgress)");
    expect(source).toContain("THREE.MathUtils.lerp(72, 240, afterimageExpansion)");
    expect(source).not.toContain("const missileImpactAfterglowDurationSeconds = 3.65");
    expect(styles).toContain(".cinematic-impact-whiteout");
    expect(styles).toContain(".cinematic-ship-destruction-retinal-layer");
    expect(styles).toContain(".cinematic-ship-destruction-retinal-afterimage");
    expect(styles).toContain("ellipse 68% 53% at 45% 51%");
    expect(styles).toContain("filter: blur(clamp(24px, 3.2vmin, 48px))");
    expect(styles).not.toContain("rgba(255, 255, 248, 0.98)");
    expect(styles).not.toContain("repeating-conic-gradient");
    expect(styles).toContain("mix-blend-mode: screen");
    expect(styles).toContain("pointer-events: none");
    expect(styles).toContain("transition: opacity 12ms linear");
    expect(source).toContain("missile-impact-nuclear-glare");
    expect(source).toContain("missile-impact-flash-point");
    expect(source).toContain("missile-impact-retinal-afterimage");
    expect(source).toContain("missile-void-burst-glare");
    expect(source).toContain("missile-void-burst-core");
    expect(source).toContain("missile-void-burst-afterimage");
    expect(source).toContain('"off-target"');
    expect(source).toContain("target.ringRadius * 1.65");
    expect(source).toContain(
      "addScaledVector(mapPlaneUp, offPlaneClearance * offPlaneJitter * presentation.planeSign)"
    );
    expect(source).toContain("THREE.MathUtils.lerp(0.42, 1.35, closeIntensity ** 1.85)");
    expect(source).toContain("THREE.MathUtils.lerp(18, 110, coreExpansion)");
    expect(source).toContain("THREE.MathUtils.lerp(5, 28, coreExpansion)");
    expect(source).not.toContain("missile-impact-optical-streak");
    expect(source).not.toContain("createMissileImpactOpticalStreaks");
    expect(source).not.toContain("createMissileImpactOpticalStreakMesh");
    expect(source).toContain("createMissileImpactRetinalPoint");
    expect(source).toContain("getRetinalFlashTexture()");
    expect(source).toContain("hardScienceImpactScale");
    expect(source).toContain("THREE.MathUtils.lerp(0.34, 0.92, detailProgress)");
    expect(source).toContain("THREE.MathUtils.lerp(96, 420, coreExpansion)");
    expect(source).toContain("THREE.MathUtils.lerp(18, 160, coreExpansion)");
    expect(source).not.toContain("THREE.MathUtils.lerp(2.35, 1.08, detailProgress)");
    expect(source).toContain("color += missileFlashLight * (0.58 + surfaceLuma * 1.24)");
    expect(source).toContain("sizeAttenuation: false");
    expect(source).not.toContain("new THREE.CircleGeometry(1, 48)");
    expect(source).not.toContain("new THREE.SphereGeometry(1, 28");
    expect(source).toContain("const wreckageChunkShipScale = 0.6");
    expect(source).toContain("wreckageChunkScreenPixelMultiplier");
    expect(source).toContain("impactAngle");
    expect(source).toContain("targetOrbitRadius");
    expect(source).toContain("inclination");
    expect(source).toContain("inclinedOrbitY");
    expect(source).not.toContain("missile-wreckage-collapsed-dot");
    expect(source).toContain("fireTargetDimOpacity");
    expect(source).toContain("enemyFactionColor");
    expect(source).toContain("fireMarkerColor");
    expect(source).toContain("const radius = clamp(markerRadius * 0.92 + 2, 27, 68)");
    expect(source).toContain("const size = clamp(radius * 0.22, 7, 13)");
    expect(styles).toContain("--fire-marker-size: 11px");
    expect(styles).toContain("--fire-marker-radius: 36px");
    expect(styles).toContain("cinematic-fire-marker__triangle--top");
    expect(styles).toContain("cinematic-fire-marker__triangle--bottom-left");
    expect(styles).toContain("cinematic-fire-marker__triangle--bottom-right");
    expect(styles).toContain(
      "animation: cinematic-fire-marker-pulse var(--beat-fire-marker-duration, 1160ms) steps(1, end)"
    );
    expect(styles).toContain("transform: rotate(var(--fire-marker-rotation)) scale(0.88)");
    expect(styles).toContain("transform: rotate(var(--fire-marker-rotation)) scale(1.1)");
    expect(styles).toContain("cinematic-trajectory-label--fire");
    expect(styles).toContain("cinematic-trajectory-label--fire-summary");
    expect(styles).toContain("cinematic-trajectory-label--fire-field");
    expect(source).toContain("renderSelectedFireEngagementField(snapshot)");
    expect(source).toContain("isValidFireTargetFromOrigin");
    expect(source).toContain('occupancy.factionId !== "player"');
    expect(source).not.toContain("isSelectableBurnDestinationFromOrigin");
    expect(source).not.toContain("createFireEngagementFieldConnector");
    expect(source).not.toContain("getFireEngagementFieldLabelAnchor");
    expect(source).toContain("type ResolvedFireTrajectory");
    expect(source).toContain("private resolveFireTrajectory(");
    expect(source).toContain("this.renderFireArc(");
    expect(source).toContain(
      "this.renderActiveMissileMarker(missile, launchPresentation, trajectory)"
    );
    expect(source).toContain("this.renderFireFutureTargetPreview(plan, resolvedTrajectory)");
    expect(source).toContain("!this.isDisplayNodeCenterInViewport(target)");
    expect(source).toContain("this.tuning.firePreviewOpacity * 0.58");
    expect(source).toContain("getFutureFireTargetLinkOpacity");
    expect(source).toContain("0.24 + weight.timingOpacityMultiplier * 0.16");
    expect(source).toContain("getFutureFireTargetLinkRadius");
    expect(source).toContain("THREE.MathUtils.lerp(0.78, 0.96, weight.timingRadiusMultiplier)");
    expect(source).toContain("const tutorialLinkPulse = getTutorialAttentionNodeColorPulse");
    expect(source).toContain("tutorialAttentionFutureLinkRadiusBoost");
    expect(source).toContain("setPreserveExtremeZoomUiOpacity(link, targetPulse !== null)");
    expect(source).not.toContain(
      "const currentTarget = this.getDisplayNodeRenderDataAtTurn(\n      plan.targetNodeId,\n      Math.floor(this.visualTurn)"
    );
    expect(source).not.toContain(
      "const currentTarget = this.getDisplayNodeRenderDataAtTurn(\n        targetNodeId,\n        Math.floor(this.visualTurn)"
    );
    expect(source).toContain("`T-${plan.missileEtaTurns}`");
    expect(source).toContain('"fire-field"');
    expect(source).toContain("pickSelectedNodeHoverZone(point)");
    expect(source).toContain("selectedScreenRadius + 22");
    expect(source).toContain("centerDistance - otherScreenRadius - 8");
  });

  it("keeps single-click focus from changing zoom distance", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const focusWithoutZoomStart = source.indexOf(
      "  focusTargetWithoutZoom(targetKey: string, options: FocusTargetWithoutZoomOptions = {}): void {"
    );
    const focusIfOffScreenStart = source.indexOf(
      "  focusTargetIfOffScreenWithoutZoom(targetKey: string): boolean {",
      focusWithoutZoomStart
    );
    const focusWithoutZoomSource = source.slice(focusWithoutZoomStart, focusIfOffScreenStart);

    expect(focusWithoutZoomStart).toBeGreaterThanOrEqual(0);
    expect(focusIfOffScreenStart).toBeGreaterThan(focusWithoutZoomStart);
    expect(focusWithoutZoomSource).toContain('targetKey === "body:sun"');
    expect(focusWithoutZoomSource).toContain("previousFocusedTargetKey");
    expect(focusWithoutZoomSource).toContain("trackedFocusTargetKey = targetKey");
    expect(focusWithoutZoomSource).toContain("refreshDisplayScale()");
    expect(focusWithoutZoomSource).not.toContain("this.distance =");
  });

  it("prevents repeated node clicks from triggering zoom focus", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const doubleClickStart = source.indexOf('canvas.addEventListener("dblclick"');
    const wheelStart = source.indexOf('canvas.addEventListener("wheel"', doubleClickStart);
    const doubleClickSource = source.slice(doubleClickStart, wheelStart);

    expect(doubleClickStart).toBeGreaterThanOrEqual(0);
    expect(wheelStart).toBeGreaterThan(doubleClickStart);
    expect(doubleClickSource).toContain("focusTargetFromClick(targetKey)");
    expect(doubleClickSource).not.toContain("focusTarget(targetKey)");
    expect(source).toContain("private focusTargetFromClick(targetKey: string | null): void");
    expect(source).toContain("this.shouldIgnoreRedundantFocusClick(targetKey)");
    expect(source).toContain("private shouldIgnoreRedundantFocusClick(targetKey: string): boolean");
    expect(source).toContain("this.hasTutorialCameraAssist()");
    expect(source).toContain("this.lockedSelectionTargetKey !== targetKey");
    expect(source).toContain("camera-only");
    expect(source).toContain("this.focusTargetWithoutZoom(targetKey)");
  });

  it("keeps FIRE mode deliberate instead of sharing the double-click focus gesture", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const clickStart = source.indexOf("  private handlePrimaryClickAtScreenPoint(point: Vec2)");
    const selectStart = source.indexOf("  private selectAtScreenPoint(point: Vec2)", clickStart);
    const toggleStart = source.indexOf("  private canToggleFireModeWithDeliberateClick");
    const rejectedStart = source.indexOf("  private explainRejectedFireModeToggle", toggleStart);
    const clickSource = source.slice(clickStart, selectStart);
    const toggleSource = source.slice(toggleStart, rejectedStart);

    expect(clickStart).toBeGreaterThanOrEqual(0);
    expect(selectStart).toBeGreaterThan(clickStart);
    expect(toggleStart).toBeGreaterThanOrEqual(0);
    expect(rejectedStart).toBeGreaterThan(toggleStart);
    expect(source).toContain("relaxedFocusDoubleClickMs = 520");
    expect(source).toContain("deliberateFireClickMinMs = 560");
    expect(source).toContain("deliberateFireClickMaxMs = 2400");
    expect(source).toContain("isFireModeAllowed?: () => boolean");
    expect(source).toContain("private canUseFireMode(): boolean");
    expect(clickSource).toContain("elapsedMs <= relaxedFocusDoubleClickMs");
    expect(clickSource).toContain("elapsedMs >= deliberateFireClickMinMs");
    expect(clickSource).toContain("canToggleFireModeWithDeliberateClick(targetKey)");
    expect(toggleSource).toContain("this.canUseFireMode()");
    expect(source).toContain("canPlayerNodeOriginateFire(targetKey)");
    expect(source).toContain("normalizeSelectedActionModeForSnapshot(snapshot)");
    expect(source).toContain("!this.isNodeContested(nodeId)");
    expect(clickSource).toContain(
      'this.selectedActionMode = this.selectedActionMode === "fire" ? "burn" : "fire"'
    );
    expect(clickSource).toContain("this.focusTargetFromClick(targetKey)");
    expect(clickSource).not.toContain('this.selectedActionMode === "burn" ? "fire" : "burn"');
  });

  it("keeps single left click as selection only without changing focus", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const clickStart = source.indexOf(
      "  private handleTargetClick(targetKey: string | null): void {"
    );
    const focusOnlyStart = source.indexOf("  private isFocusOnlyTarget", clickStart);
    const clickSource = source.slice(clickStart, focusOnlyStart);

    expect(clickStart).toBeGreaterThanOrEqual(0);
    expect(focusOnlyStart).toBeGreaterThan(clickStart);
    expect(clickSource).toContain("this.setSelectedTarget(targetKey)");
    expect(clickSource).not.toContain("focusTargetWithoutZoom");
    expect(clickSource).not.toContain("focusTarget(");
  });

  it("lets the tutorial reject non-actionable target clicks before selection", () => {
    const rendererSource = readFileSync(
      join(process.cwd(), "src/renderers/cinematic3d/index.ts"),
      "utf8"
    );
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const clickStart = rendererSource.indexOf(
      "  private handlePrimaryClickAtScreenPoint(point: Vec2): void {"
    );
    const focusStart = rendererSource.indexOf("  private focusTargetFromClick", clickStart);
    const clickSource = rendererSource.slice(clickStart, focusStart);

    expect(rendererSource).toContain("isTargetInputAllowed?: (targetKey: string) => boolean");
    expect(rendererSource).toContain(
      "private canAcceptTargetInput(targetKey: string | null): boolean"
    );
    expect(clickSource).toContain("if (!this.canAcceptTargetInput(targetKey))");
    expect(uiSource).toContain("isTutorialTargetInputAllowed(tutorialState, targetKey)");
  });

  it("keeps gameplay hover previews independent from the log-relative tutorial glossary", () => {
    const rendererSource = readFileSync(
      join(process.cwd(), "src/renderers/cinematic3d/index.ts"),
      "utf8"
    );
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");

    expect(rendererSource).toContain("getHoverTextEnabled?: () => boolean");
    expect(rendererSource).toContain("private isHoverTextEnabled(): boolean");
    expect(rendererSource).toContain("private showHoverTrajectoryLabel(");
    expect(rendererSource).toContain("if (!this.isHoverTextEnabled())");
    expect(uiSource).not.toContain("getHoverTextEnabled()");
    expect(uiSource).not.toContain("onHoverInterestChange");
    expect(uiSource).toContain("commandGlossaryController.bindRoot(commandTranscript)");
    expect(rendererSource).toContain("const hoverPlan = this.getHoverBurnPlan()");
    expect(rendererSource).toContain("const hoverPlan = this.getHoverFirePlan()");
  });

  it("prevents orphan BURN destination ghosts when hover input or trajectory data is unavailable", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const cameraInputStart = source.indexOf("  setCameraInputEnabled(enabled: boolean): void {");
    const forcedFocusStart = source.indexOf("  setForcedCameraFocusTarget(", cameraInputStart);
    const cameraInputSource = source.slice(cameraInputStart, forcedFocusStart);
    const bindEventsStart = source.indexOf("  private bindEvents(): void {");
    const keyboardHandlerStart = source.indexOf(
      "  private readonly handleKeyboardCameraKeyDown",
      bindEventsStart
    );
    const bindEventsSource = source.slice(bindEventsStart, keyboardHandlerStart);
    const updateBurnStart = source.indexOf(
      "  private updateBurnPresentation(snapshot: SolarSystemSnapshot): void {"
    );
    const resolveWithdrawalsStart = source.indexOf(
      "  private renderResolvingBurnOrderWithdrawals(): void {",
      updateBurnStart
    );
    const updateBurnSource = source.slice(updateBurnStart, resolveWithdrawalsStart);

    expect(cameraInputSource).toContain("if (!enabled) {");
    expect(cameraInputSource).toContain("this.lastPointerCanvasPoint = null;");
    expect(cameraInputSource).toContain("this.setHoveredTarget(null);");
    expect(bindEventsSource).toContain(
      "if (!this.cameraInputEnabled) {\n        this.lastPointerCanvasPoint = null;\n        this.setHoveredTarget(null);\n        return;\n      }"
    );
    expect(source).toContain("function isResolvedBurnTrajectoryRenderable(");
    expect(updateBurnSource).toContain("const resolvedHoverTrajectory =");
    expect(updateBurnSource).toContain(
      "if (isHoverPlanAffordable && labelAnchor !== null && resolvedHoverTrajectory !== null)"
    );
    expect(updateBurnSource).toContain(
      "this.renderBurnPreviewEffect(hoverPlan, resolvedHoverTrajectory);"
    );
    expect(updateBurnSource).toContain(
      "this.getBurnTrajectoryColor(hoverPlan),\n        resolvedHoverTrajectory"
    );
  });

  it("keeps dotted timing tracks outside occupied and BURN-destination orbits", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const cachedSegmentStart = source.indexOf("  private getCachedOrbitTimingSegment(");
    const detachSegmentsStart = source.indexOf(
      "  private detachCachedOrbitTimingSegments(): void {",
      cachedSegmentStart
    );
    const cachedSegmentSource = source.slice(cachedSegmentStart, detachSegmentsStart);

    expect(source).toContain("this.refreshOrbitTimingProtectedOrbitInterruptions(snapshot);");
    expect(source).toContain(
      "snapshot.nodeOccupancies\n        .filter((occupancy) => occupancy.shipCount > 0)"
    );
    expect(source).toContain(
      "const burnPreviewDestinationNodeId = this.getHoverBurnPlan()?.destinationNodeId ?? null;"
    );
    expect(source).toContain("points: [node.center.clone()]");
    expect(source).toContain("clearanceWorld: orbitRadius + visualClearance");
    expect(cachedSegmentSource).toContain("...this.orbitTimingProtectedOrbitInterruptions");
    expect(cachedSegmentSource).toContain("dotSpacingWorld,\n        interruptions");
  });

  it("keeps the sun focusable but transparent to selection picking", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");

    expect(source).toContain("isSelectionTransparentTargetKey");
    expect(source).toContain('return targetKey === "body:sun";');
    expect(source).toContain("includeSelectionTransparentTargets");
    expect(source).toContain("{ includeSelectionTransparentTargets: true }");
    expect(source).toContain("!isSelectionTransparentTargetKey(targetKey)");
    expect(source).toContain("targetKey = null;");
  });

  it("converts pending BURN and FIRE target clicks before falling back to cancel", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const clickStart = source.indexOf(
      "  private handleTargetClick(targetKey: string | null): void {"
    );
    const focusOnlyStart = source.indexOf("  private isFocusOnlyTarget", clickStart);
    const clickSource = source.slice(clickStart, focusOnlyStart);

    expect(clickStart).toBeGreaterThanOrEqual(0);
    expect(focusOnlyStart).toBeGreaterThan(clickStart);
    expect(clickSource.indexOf("tryConvertPendingBurnOrderToFire")).toBeGreaterThan(
      clickSource.indexOf("tryRequestFireOrder")
    );
    expect(clickSource.indexOf("tryConvertPendingBurnOrderToFire")).toBeLessThan(
      clickSource.indexOf("tryCancelPendingFireOrder")
    );
    expect(clickSource.indexOf("tryConvertPendingFireOrderToBurn")).toBeLessThan(
      clickSource.indexOf("tryCancelPendingBurnOrder")
    );
    expect(source).toContain("findPlayerPendingBurnOrderForDestination");
    expect(source).toContain("findPlayerPendingFireOrderForTarget");
    expect(source).toContain("this.onBurnOrderCancelled(order.originNodeId)");
    expect(source).toContain("this.onFireOrderRequested(order.originNodeId, targetNodeId)");
    expect(source).toContain("this.onFireOrderCancelled(order.originNodeId)");
    expect(source).toContain("this.onBurnOrderRequested(order.originNodeId, destinationNodeId)");
    expect(source).toContain("pending-burn-future-destination-link");
    expect(source).toContain("targetKey: `node:${plan.destinationNodeId}`");
  });

  it("uses a short right click to enter or leave contextual FIRE without confirming it", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const pointerUpStart = source.indexOf('canvas.addEventListener("pointerup"');
    const pointerLeaveStart = source.indexOf(
      'canvas.addEventListener("pointerleave"',
      pointerUpStart
    );
    const pointerUpSource = source.slice(pointerUpStart, pointerLeaveStart);
    const contextStart = source.indexOf("  private handleContextFireClickAtScreenPoint");
    const selectStart = source.indexOf("  private selectAtScreenPoint(point: Vec2)", contextStart);
    const contextSource = source.slice(contextStart, selectStart);

    expect(source).toContain("contextFireClickMaxMs = 320");
    expect(pointerUpSource).toContain("wasContextFireClick");
    expect(pointerUpSource).toContain("this.handleContextFireClickAtScreenPoint");
    expect(contextSource).toContain('if (this.selectedActionMode === "fire")');
    expect(contextSource).toContain('this.selectedActionMode = "burn"');
    expect(contextSource).toContain("toggleSelectedNodeFireModeFromContextClick()");
    expect(contextSource).toContain("this.canUseFireMode()");
    expect(contextSource).toContain('this.selectedActionMode = "fire"');
    expect(contextSource).not.toContain("tryRequestFireOrder");
    expect(contextSource).not.toContain("this.getFirePlan");
    expect(contextSource).toContain("this.lockedSelectionTargetKey !== null");
    expect(source).toContain('event.button === 2 ? "orbit"');
  });

  it("keeps click-only pointerdown from cancelling camera transitions", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const pointerDownStart = source.indexOf('canvas.addEventListener("pointerdown"');
    const pointerMoveStart = source.indexOf(
      'canvas.addEventListener("pointermove"',
      pointerDownStart
    );
    const pointerUpStart = source.indexOf('canvas.addEventListener("pointerup"', pointerMoveStart);
    const pointerDownSource = source.slice(pointerDownStart, pointerMoveStart);
    const pointerMoveSource = source.slice(pointerMoveStart, pointerUpStart);

    expect(pointerDownStart).toBeGreaterThanOrEqual(0);
    expect(pointerMoveStart).toBeGreaterThan(pointerDownStart);
    expect(pointerUpStart).toBeGreaterThan(pointerMoveStart);
    expect(pointerDownSource).not.toContain("this.focusPanTransition = null;");
    expect(pointerDownSource).not.toContain("this.clearArrivalChaseCamera();");
    expect(pointerMoveSource).toContain("const wasCameraDragActive = this.dragState.moved");
    expect(pointerMoveSource).toContain("const shouldStartCameraDrag =");
    expect(pointerMoveSource).toContain("if (!shouldStartCameraDrag)");
    expect(pointerMoveSource).toContain("this.settleFocusPanTransition();");
    expect(pointerMoveSource.indexOf("this.settleFocusPanTransition();")).toBeLessThan(
      pointerMoveSource.indexOf("this.clearArrivalChaseCamera();")
    );
  });

  it("keeps selected burn destination affordances visual-only", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const trajectoryPreviewSource = readFileSync(
      join(process.cwd(), "src/renderers/cinematic3d/trajectoryPreview.ts"),
      "utf8"
    );
    const styles = readFileSync(join(process.cwd(), "src/styles.css"), "utf8");
    const hoverBurnStart = source.indexOf("  private getHoverBurnPlan()");
    const activeBurnStart = source.indexOf(
      "  private getPresentationActiveBurnTransits(",
      hoverBurnStart
    );
    const hoverBurnSource = source.slice(hoverBurnStart, activeBurnStart);

    expect(source).toContain("type BurnDestinationVisualState");
    expect(source).toContain("getSelectedBurnDestinationVisualState");
    expect(source).toContain("shouldDimFriendlyBurnDestination");
    expect(source).toContain("shouldDimFriendlyBurnDestination ? 0.3 : 1");
    expect(source).toContain("burnDestinationRingBoost");
    expect(source).toContain("? 0.34\n        : 0.26");
    expect(source).toContain("burnTransferFieldGroup");
    expect(source).toContain("renderSelectedBurnTransferField(snapshot)");
    expect(source).toContain("ownShipPresentBillboardDurationMs = 1050");
    expect(source).toContain("ownShipPresentBillboardFadeMs = 360");
    expect(source).toContain('variant: "default" | "execute-prompt" | "own-ship-present"');
    expect(source).toContain('text === "OWN SHIP PRESENT"');
    expect(source).toContain('text === "PRESS EXECUTE?"');
    expect(source).toContain('"cinematic-invalid-action-billboard--own-ship-present"');
    expect(source).toContain('"cinematic-invalid-action-billboard--execute-prompt"');
    expect(source).toContain("this.hoveredTargetKey !== `node:${originNodeId}`");
    expect(source).toContain("!this.shouldRenderSelectedBurnTransferField(originNodeId)");
    expect(source).toContain("burnTransferFieldMaxDetailProgress = 0.78");
    expect(source).toContain("burnTransferFieldContourFadeEndDetail = 0.96");
    expect(source).toContain("burnTransferFieldHoverContourMinOpacityMultiplier = 0");
    expect(source).toContain("getShipDetailProgress(this.distance, this.tuning)");
    expect(source).toContain("renderBurnTransferFieldContours");
    expect(source).toContain("renderBurnTransferFieldDestinationHalos");
    expect(source).toContain("createBurnTransferFieldContour");
    expect(source).toContain("createBurnTransferFieldHalo");
    expect(source).toContain("createBurnTransferFieldConnector");
    expect(source).toContain("applyExtremeZoomTacticalUiFade");
    expect(source).toContain("getExtremeZoomTacticalUiOpacityMultiplier");
    expect(source).toContain("getExtremeZoomNodeOpacityMultiplier");
    expect(source).toContain("getZoomInMapNodeToneDownOpacityMultiplier");
    expect(source).toContain("mapNodeZoomInToneDownFadeStartDetail = 0.48");
    expect(source).toContain("mapNodeZoomInToneDownMinOpacity = 0.44");
    expect(source).toContain(
      "this.getExtremeZoomNodeOpacityMultiplier() * this.getZoomInMapNodeToneDownOpacityMultiplier()"
    );
    expect(source).toContain("zoomNodeOpacityMultiplier *");
    expect(source).toContain("extremeZoomUiFadeStartDetail");
    expect(source).toContain("extremeZoomUiFadeMinOpacity");
    expect(source).toContain("extremeZoomBillboardMinOpacity = 0.04");
    expect(source).toContain("getExtremeZoomBillboardOpacityMultiplier");
    expect(source).toContain("* extremeZoomBillboardOpacityMultiplier");
    expect(source).toContain("extremeZoomNodeFadeStartDetail");
    expect(source).toContain("extremeZoomNodeFadeEndDetail");
    expect(source).toContain("extremeZoomNodeFadeMinOpacity");
    expect(source).toContain("getEdgeOnDistantNodeOpacityMultiplier");
    expect(source).toContain("extremeZoomEdgeOnNodeFadeStartDetail");
    expect(source).toContain("extremeZoomEdgeOnNodeFadeMinOpacity");
    expect(source).toContain("const edgeOnProgress = 1 - smootherStep");
    expect(source).toContain("const distantProgress = smootherStep");
    expect(source).toContain('trajectory.userData["extremeZoomUiFade"] = true');
    expect(source).toContain("fadeMarkedExtremeZoomUiObjects(this.burnPreviewGroup");
    expect(source).toContain("fadeMarkedExtremeZoomUiObjects(this.firePreviewGroup");
    expect(source).toContain("fadeMarkedExtremeZoomUiObjects(this.futureDestinationGroup");
    expect(source).not.toContain("fadeMarkedExtremeZoomUiObjects(this.activeBurnGroup");
    expect(source).not.toContain("fadeMarkedExtremeZoomUiObjects(this.activeMissileGroup");
    expect(source).not.toContain("this.applyExtremeZoomTrajectoryLabelFade");
    expect(source).toContain('for (const key of ["dashOpacity", "opacity"])');
    expect(source).toContain('label.dataset["baseOpacity"]');
    expect(source).toContain("type BurnTransferFieldEtaPresentation");
    expect(source).toContain("getScreenRelevantBurnTransferFieldSamples");
    expect(source).toContain("getBurnTransferFieldSampleScreenPoint");
    expect(source).toContain("projectWorldPointToViewportScreen");
    expect(source).not.toContain("getBurnTransferFieldDirectionalFallbackPoint");
    expect(source).not.toContain("getBurnTransferFieldConnectorFallbackEnd");
    expect(source).toContain("shouldRenderSelectedBurnTransferField(originNodeId)");
    expect(source).toContain("this.renderTutorialAttentionPulseConnectors(snapshot)");
    expect(source).toContain("private renderTutorialAttentionPulseConnectors(");
    expect(source).toContain("private getTutorialAttentionPulseConnectorNodeIds(");
    expect(source).toContain("pulse.pulseCandidateTargets === true");
    expect(source).toContain("this.resolveTutorialAttentionPulseTargetKey(pulse)");
    expect(source).toContain("tutorial-attention-pulse-connector");
    expect(source).toContain("nodeId !== originNodeId");
    expect(source).not.toContain("shouldPinBurnTransferFieldToTutorialPriority");
    expect(source).not.toContain("renderTutorialPriorityBurnConnector");
    expect(source).not.toContain("tutorial-priority-burn-connector");
    expect(source).toContain(
      "return isHoveringSelectedBurnOrigin && this.shouldRenderBurnTransferField();"
    );
    expect(source).toContain("[pulse.targetKey, ...(pulse.candidateTargetKeys ?? [])]");
    expect(source).not.toContain("samples.filter((sample) => pinnedDestinationNodeIds.has");
    expect(source).toContain("getBurnTransferFieldEtaPresentations");
    expect(source).toContain("getBurnTransferFieldRepresentativeSample");
    expect(source).toContain("getBurnTransferFieldLineLabelAnchor");
    expect(source).toContain("const originScreen = projectWorldPointToViewportScreen(");
    expect(source).not.toContain("const isPinnedDestination = pinnedDestinationNodeIds.has");
    expect(source).not.toContain("if (isPinnedDestination) {");
    expect(source).not.toContain("!isPinnedDestination &&");
    expect(source).toContain("for (const priorityDestinationNodeId of priorityDestinationNodeIds)");
    expect(source).toContain("const isTutorialTargetConnector = priorityDestinationNodeIds.has(");
    expect(source).toContain("const tutorialConnectorPulse = getTutorialAttentionNodeColorPulse");
    expect(source).toContain("burnTransferFieldTutorialTargetConnectorPulseOpacityBoost");
    expect(source).toContain("burnTransferFieldTutorialTargetConnectorMaxOpacity");
    expect(source).toContain("visibleSamples.push(sample)");
    expect(source).not.toContain("doesScreenSegmentIntersectRect");
    expect(source).toContain("presentation.representative");
    expect(source).toContain("burnTransferFieldContourFadeEndDetail");
    expect(source).toContain("burnTransferFieldConnectorMinOpacity");
    expect(source).toContain("burnTransferFieldHoverContourMinOpacityMultiplier");
    expect(source).toContain("burnTransferFieldHoverConnectorMinOpacityMultiplier");
    expect(source).toContain("burnTransferFieldHoverLabelMinOpacity");
    expect(source).toContain("burnTransferFieldMaxContourScreenRadiusRatio");
    expect(source).toContain("burnTransferFieldScreenStableStartDetail = 0.72");
    expect(source).toContain("burnTransferFieldScreenStableViewportMargin = 48");
    expect(source).toContain("private createBurnTransferFieldPresentationConnector(");
    expect(source).toContain("private getScreenStableBurnTransferFieldConnectorEnd(");
    expect(source).toContain("type ScreenStableBurnTransferFieldConnector");
    expect(source).toContain("screenStableBurnTransferFieldConnectors");
    expect(source).toContain("private syncScreenStableBurnTransferFieldConnectors()");
    expect(source).toContain("this.syncScreenStableBurnTransferFieldConnectors();");
    expect(source).toContain("syncBurnTransferFieldConnectorGeometry(");
    expect(source).toContain("positions.needsUpdate = true");
    const cameraUpdateSource = source.slice(
      source.indexOf("  private updateCamera(): void {"),
      source.indexOf("  private updateLabels(): void {")
    );
    expect(cameraUpdateSource).toContain("this.camera.updateMatrixWorld();");
    expect(cameraUpdateSource).toContain("this.syncScreenStableBurnTransferFieldConnectors();");
    expect(cameraUpdateSource.indexOf("this.camera.updateMatrixWorld();")).toBeLessThan(
      cameraUpdateSource.indexOf("this.syncScreenStableBurnTransferFieldConnectors();")
    );
    expect(source).toContain("unprojectScreenPointAtCameraForwardDistance(");
    expect(source).toContain("{ depthTest: false }");
    expect(source).not.toContain("const compositionBaseAngle = this.yaw");
    expect(source).toContain("createBurnTransferFieldMaterial(color, opacity * 0.34");
    expect(source).toContain(
      "createBurnTransferFieldMaterial(color, opacity, THREE.AdditiveBlending"
    );
    expect(source).not.toContain("createDashedCircleLine");
    expect(source).toContain(
      "this.showHoverTrajectoryLabel(\n        presentation.labelAnchor,\n        `T+${presentation.etaTurns}`"
    );
    expect(source).toContain('kind === "burn-field"');
    expect(source).toContain("getMedianNumber(distances)");
    expect(source).toContain("const hoveredNodeId = getNodeIdFromTargetKey(this.hoveredTargetKey)");
    expect(source).toContain("label.targetKey === this.selectedTargetKey");
    expect(source).toContain("labelNodeId !== this.getSelectedBurnOriginNodeId()");
    expect(source).toContain("labelNodeId !== this.getSelectedFireOriginNodeId()");
    expect(source).toContain("return false;");
    expect(source).not.toContain("renderSelectedBurnDestinationBillboards");
    expect(source).toContain("trajectoryLabelBounds");
    expect(source).toContain("private placeTrajectoryLabel(");
    expect(source).toContain("private scoreTrajectoryLabelCandidate(");
    expect(source).toContain("private getTrajectoryLabelAvoidRects(");
    expect(source).toContain("private getProjectedNodeAvoidRects(");
    expect(source).toContain("private getProjectedSceneAvoidRects(");
    expect(source).toContain("private getProjectedBodyAvoidRects(");
    expect(source).toContain("getCinematicLabelOffsetCandidates");
    expect(source).toContain("allowLongRange: true");
    expect(source).toContain("this.labelPlacements");
    expect(source).toContain("private getSmoothedInteractiveLabelPlacement");
    expect(source).toContain("private getReusableInteractiveLabelPlacement");
    expect(source).toContain("const cameraMotionActive = this.isTrajectoryLabelCameraMotionActive");
    expect(source).toContain("lastPointerCanvasPoint");
    expect(source).toContain("trajectoryLabelCameraSettleMs = 150");
    expect(source).toContain("lastTrajectoryLabelCameraMotionAt");
    expect(source).toContain("stabilizeTrajectoryLabelOffsetsForCameraMotion");
    expect(source).toContain("trajectoryLabelOffsetMemory");
    expect(source).toContain("worldAnchor: THREE.Vector3");
    expect(source).toContain("private updateTrajectoryLabels(width: number, height: number): void");
    expect(source).toContain("label.worldAnchor.clone().project(this.camera)");
    expect(source).toContain("this.updateTrajectoryLabels(width, height)");
    expect(source).not.toContain("? rememberedOffset.worldAnchor");
    expect(source).toContain("const projected = anchor.clone().project(this.camera);");
    expect(source).toContain("private placeTrajectoryLabelWithOffset(");
    expect(source).not.toContain("freezeTrajectoryLabelsForCameraMotion");
    expect(source).toContain("private noteTrajectoryLabelCameraMotion");
    expect(source).toContain("private isTrajectoryLabelCameraMotionActive(now: number): boolean");
    expect(source).toContain("this.noteTrajectoryLabelCameraMotion();");
    expect(source).toContain("this.noteTrajectoryLabelCameraMotion(now)");
    expect(source).toContain(
      "this.stabilizeTrajectoryLabelOffsetsForCameraMotion =\n        this.isTrajectoryLabelCameraMotionActive(now)"
    );
    expect(source).toContain("getTrajectoryLabelPreferredOffset(kind)");
    expect(source).toContain("private doesTrajectoryLabelPlacementNeedReflow(");
    expect(source).toContain("private createInteractiveLabelPlacement(");
    expect(source).toContain("private getWorldAnchoredInteractiveLabelPlacement(");
    expect(source).toContain("this.clearTrajectoryLabels();");
    expect(source).toContain("getTrajectoryLabelOffsetCandidates(kind, size)");
    expect(source).toContain("labelsOverlap(bounds, placed)");
    expect(source).toContain("labelsOverlap(bounds, avoid)");
    expect(source).toContain("computeRectOverlapArea(bounds, placed)");
    expect(source).toContain("computeRectOverlapArea(bounds, avoid)");
    expect(hoverBurnStart).toBeGreaterThanOrEqual(0);
    expect(activeBurnStart).toBeGreaterThan(hoverBurnStart);
    expect(hoverBurnSource).toContain(
      "isPlayerOccupiedNodeTarget(this.snapshot, `node:${destinationNodeId}`)"
    );
    expect(source).toContain("dimColor(this.getBurnTrajectoryColor(plan), 0.58)");
    expect(source).toContain("private getBurnPlanFactionId(plan: RenderableBurnPlan)");
    expect(source).toContain("private getSelectedBurnOriginFactionColor()");
    expect(trajectoryPreviewSource).toContain("burnTransferVerticalHeightScale");
    expect(trajectoryPreviewSource).toContain("activeBurnNodeOrbitHeightOffset");
    expect(source).toContain("activeBurnTrajectoryCoreScreenPixels");
    expect(source).toContain("sliceActiveBurnFlightPathAheadOfShip");
    expect(source).toContain("getBurnDestinationBillboardAnchor");
    expect(source).toContain("plan.issuedTurn");
    expect(source).toContain('kind === "burn-hover"');
    expect(source).toContain("? { x: 1, y: -6 }");
    expect(source).toContain('kind === "burn-field"');
    expect(source).toContain("? { x: 0, y: -5 }");
    expect(source).toContain("const worldPadding = clamp(destination.ringRadius * 0.04");
    expect(source).not.toContain("const screenPadding = getWorldUnitsForScreenPixels");
    expect(source).toContain("`T+${order.etaTurns} -${order.burnCost} ΔV`");
    expect(source).toContain("`T+${hoverPlan.etaTurns} -${hoverPlan.burnCost} ΔV`");
    expect(source).not.toContain("`ARRIVAL T+");
    expect(source).toContain('return "weapons offline";');
    expect(source).toContain('return "shipyard";');
    expect(source).toContain('return "tritium";');
    expect(source).toContain('return node.type === "barren" ? "barren" : node.type;');
    expect(source).not.toContain('"Unclaimed"');
    expect(source).not.toContain("`Tritium +${node.tritiumOutput} ΔV`");
    expect(source).not.toContain("`Shipyard ${node.shipyardProgress}/5`");
    expect(source).not.toContain(
      "`T+${destinationVisual.plan.etaTurns} - ${destinationVisual.plan.burnCost} ΔV`"
    );
    expect(source).not.toContain("`T+${etaTurns} ·");
    expect(source).toContain('"burn-hover"');
    expect(source).toContain('"burn-field"');
    expect(styles).toContain(".cinematic-trajectory-label--burn-field");
    expect(styles).toContain("border: 0");
    expect(styles).toContain("--cinematic-billboard-font-base");
    expect(styles).toContain("clamp(12px");
    expect(styles).toContain("clamp(10px");
    expect(styles).toContain("font-size: var(--cinematic-billboard-font-tiny)");
    expect(styles).toContain(".cinematic-trajectory-label--burn-hover");
    expect(styles).toContain("background: transparent");
    expect(styles).toContain("border: 0");
    expect(styles).toContain("pointer-events: none");
    expect(styles).toContain(".cinematic-invalid-action-billboard--own-ship-present");
    expect(styles).toContain(".cinematic-invalid-action-billboard--execute-prompt");
    expect(styles).toContain("color: rgba(245, 248, 252, 0.96);");
    expect(styles).toContain("border-color: transparent;");
    expect(styles).toContain("box-shadow: none;");
  });

  it("keeps max zoom-out wheel input from resyncing camera state", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");

    expect(source).toContain("zoomOutDistanceEpsilon");
    expect(source).toContain('from "./cameraZoom"');
    expect(source).toContain("resolveWheelZoomStep");
    expect(source).toContain("const zoomOutLimit = this.getZoomOutLimit();");
    expect(source).toContain("const minimumDistance = this.getMinimumCameraDistance();");
    expect(source).toContain("zoomStep.isZoomingInAtMinimumDistance");
    expect(source).toContain("this.smoothWheelZoomTargetDistance = minimumDistance");
    expect(source).toContain("this.refreshProductiveMarkerZoomOutFlashFromWheel();");
    expect(source).toContain("zoomStep.isDistanceNoop");
    expect(source).toContain("return;");
    expect(source).not.toContain("handleManualChaseZoomIn");
    expect(source).not.toContain("tryEnterManualChaseCamera");
    expect(source).not.toContain("manualChaseZoomInDeadZone");
  });

  it("smooths wheel zoom instead of applying one hard distance step per notch", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const wheelStart = source.indexOf('canvas.addEventListener("wheel"');
    const zoomLimitStart = source.indexOf("  private getZoomOutLimit", wheelStart);
    const wheelSource = source.slice(wheelStart, zoomLimitStart);

    expect(wheelStart).toBeGreaterThanOrEqual(0);
    expect(zoomLimitStart).toBeGreaterThan(wheelStart);
    expect(source).toContain("smoothWheelZoomTargetDistance");
    expect(source).toContain("smoothWheelZoomTimeConstantMs");
    expect(source).toContain("smoothWheelZoomMaxNormalizedDelta");
    expect(source).toContain("smoothWheelZoomResponseExponent");
    expect(source).toContain("smoothWheelZoomSmallDeltaBoost");
    expect(source).toContain("private updateSmoothWheelZoom(now: number): void");
    expect(source).toContain("1 - Math.exp(-deltaMs / smoothWheelZoomTimeConstantMs)");
    expect(source).toContain("this.clearSmoothWheelZoomTarget()");
    expect(wheelSource).toContain("this.getSmoothWheelZoomFactor(event)");
    expect(wheelSource).toContain('this.onInputGesture?.("wheel");');
    expect(wheelSource).toContain("if (factor > 1) {");
    expect(wheelSource).toContain('this.onInputGesture?.("wheel-zoom-out");');
    expect(wheelSource).toContain("Math.pow(Math.abs(rawDeltaY), smoothWheelZoomResponseExponent)");
    expect(wheelSource).toContain(
      "Math.min(smoothWheelZoomMaxNormalizedDelta, responsiveMagnitude)"
    );
    expect(wheelSource).toContain("const zoomStep = resolveWheelZoomStep");
    expect(wheelSource).toContain("pendingTargetDistance: this.smoothWheelZoomTargetDistance");
    expect(wheelSource).toContain("zoomStep.isDistanceNoop");
    expect(wheelSource).toContain("this.smoothWheelZoomTargetDistance = nextDistance");
    expect(wheelSource).toContain("this.noteTrajectoryLabelCameraMotion();");
    expect(wheelSource).not.toContain("this.distance = nextDistance");
    expect(source).not.toContain("smoothWheelZoomAnchorScreenPoint");
    expect(source).not.toContain("smoothWheelZoomAnchorWorldPoint");
    expect(source).not.toContain("smoothWheelZoomAnchorMaxCorrectionDistanceRatio");
    expect(source).not.toContain("private getMapPlaneIntersectionAtScreenPoint");
    expect(source).not.toContain("private applySmoothWheelZoomAnchorCorrection");
    expect(wheelSource).not.toContain("this.setSmoothWheelZoomAnchor");
    expect(wheelSource).not.toContain("event.deltaY < 0 ? 0.88 : 1.14");
    expect(wheelSource).not.toContain("clamp(event.deltaY * modeScale, -240, 240)");
    expect(source).toContain("constrainChaseDistanceByWheelTarget");
    expect(source).toContain("this.smoothWheelZoomTargetDistance");
    expect(source).not.toContain("getWheelConstrainedChaseDistance");
    expect(source).not.toContain("manualChaseZoomIn");
  });

  it("anchors active burn focus to a real origin or destination scale target", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const focusKeyStart = source.indexOf(
      "  private getDisplayScaleFocusTargetKey(): string | null {"
    );
    const presentationKeyStart = source.indexOf(
      "  private getPresentationFocusTargetKey(",
      focusKeyStart
    );
    const displayScaleSource = source.slice(focusKeyStart, presentationKeyStart);

    expect(source).toContain("private getActiveBurnDisplayScaleFocusTargetKey");
    expect(source).toContain("const originTargetKey = `node:${transit.originNodeId}`");
    expect(source).toContain("const destinationTargetKey = `node:${transit.destinationNodeId}`");
    expect(source).toContain(
      "cachedTargetKey === originTargetKey || cachedTargetKey === destinationTargetKey"
    );
    expect(source).toContain("return destinationTargetKey;");
    expect(source).toContain("this.activeBurnDisplayScaleFocusTargetKeys.set(");
    expect(source).toContain("activeBurnDisplayScaleDistances");
    expect(source).toContain("rememberActiveBurnDisplayScaleDistance");
    expect(source).toContain("private getDisplayScaleDistance()");
    expect(source).toContain("distance: this.getDisplayScaleDistance()");
    expect(source).toContain("type ManualPanDisplayScaleContext");
    expect(displayScaleSource).toContain("this.manualPanDisplayScaleContext.focusedTargetKey");
    expect(displayScaleSource).toContain("return this.manualPanDisplayScaleContext.distance");
    expect(displayScaleSource).toContain(
      "cameraState.displayScaleDistance ?? cameraState.distance"
    );
    expect(source).toContain("`node:${transit.destinationNodeId}`");
    expect(source).not.toContain(
      "return this.activeBurnDisplayScaleFocusTargetKeys.get(this.focusedTargetKey) ?? null"
    );
  });

  it("adds held arrow-key cinematic camera controls without stealing editable input", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const keyboardHandlerStart = source.indexOf(
      "  private handleKeyboardCameraKey(event: KeyboardEvent, isPressed: boolean): void {"
    );
    const keyboardReleaseStart = source.indexOf(
      "  private releaseKeyboardCameraArrowKey(key: string): boolean {",
      keyboardHandlerStart
    );
    const keyboardHandlerSource = source.slice(keyboardHandlerStart, keyboardReleaseStart);

    expect(source).toContain("keyboardCinematicOrbitRadiansPerSecond");
    expect(source).toContain("keyboardCinematicPanPixelsPerSecond");
    expect(source).toContain("keyboardCinematicZoomDistanceRatePerSecond");
    expect(source).toContain("const keyboardCinematicOrbitRadiansPerSecond = 0.36");
    expect(source).toContain("const keyboardCinematicPanPixelsPerSecond = 240");
    expect(source).toContain("const keyboardCinematicZoomDistanceRatePerSecond = 1.1");
    expect(source).toContain("keyboardCinematicReleaseTimeConstantMs");
    expect(source).toContain("resolveDampedCameraControlVelocity({");
    expect(source).toContain("keyboardCameraControls");
    expect(source).toContain('event.key === "ArrowUp"');
    expect(source).toContain('event.key === "ArrowDown"');
    expect(source).toContain('event.key === "ArrowLeft"');
    expect(source).toContain('event.key === "ArrowRight"');
    expect(source).toContain("event.shiftKey");
    expect(source).toContain("this.isKeyboardCameraArrowKey(event.key)");
    expect(source).toContain("(event.ctrlKey && !isCameraArrowKey)");
    expect(source).toContain("orbitClockwise");
    expect(source).toContain("panLeft");
    expect(source).toContain("panRight");
    expect(source).toContain("panUp");
    expect(source).toContain("panDown");
    expect(source).toContain("clearKeyboardPanControls()");
    expect(source).toContain("releaseKeyboardCameraArrowKey(event.key)");
    expect(source).toContain(
      'window.addEventListener("keydown", this.handleKeyboardCameraKeyDown)'
    );
    expect(source).toContain('window.addEventListener("keyup", this.handleKeyboardCameraKeyUp)');
    expect(source).toContain('window.addEventListener("blur", this.clearKeyboardCameraControls)');
    expect(source).toContain(
      'window.removeEventListener("keydown", this.handleKeyboardCameraKeyDown)'
    );
    expect(source).toContain("private updateKeyboardCameraControls(now: number): void");
    expect(source).toContain("this.updateKeyboardCameraControls(now);");
    expect(source).toContain("target instanceof HTMLInputElement");
    expect(source).toContain("target instanceof HTMLTextAreaElement");
    expect(source).toContain("target instanceof HTMLSelectElement");
    expect(source).toContain("this.keyboardCameraControls.zoomIn = !isPanKey");
    expect(source).toContain("this.keyboardCameraControls.zoomOut = !isPanKey");
    expect(source).toContain("this.keyboardCameraControls.panUp = isPanKey");
    expect(source).toContain("this.keyboardCameraControls.panDown = isPanKey");
    expect(source).toContain("this.keyboardCameraControls.orbitClockwise = !isPanKey");
    expect(source).toContain("this.keyboardCameraControls.panLeft = isPanKey");
    expect(source).toContain("this.keyboardCameraControls.orbitCounterClockwise = !isPanKey");
    expect(source).toContain("this.keyboardCameraControls.panRight = isPanKey");
    expect(source).toContain(
      "zoomDirection * keyboardCinematicZoomDistanceRatePerSecond * panZoomInputSpeedScale"
    );
    expect(source).toContain("this.keyboardCameraVelocity.zoomLogDistancePerSecond * deltaSeconds");
    expect(source).toContain("this.refreshDisplayScaleForWheelZoom();");
    expect(source).toContain("target: -orbitDirection * keyboardCinematicOrbitRadiansPerSecond");
    expect(source).toContain("this.keyboardCameraVelocity.orbitRadiansPerSecond * deltaSeconds");
    expect(source).toContain("this.yaw += yawDelta");
    expect(source).toContain("this.offsetActiveCameraTransitionRotation(yawDelta, 0)");
    expect(source).toContain("const diagonalScale = panXDirection !== 0 && panYDirection !== 0");
    expect(source).toContain("panXDirection *");
    expect(source).toContain("keyboardCinematicPanPixelsPerSecond *");
    expect(source).toContain("diagonalScale *");
    expect(source).toContain("panZoomInputSpeedScale");
    expect(source).toContain("panYPixelsPerSecond * deltaSeconds");
    expect(source).toContain("this.panByScreenDelta({");
    expect(source).toContain("using the current camera distance");
    expect(source).toContain(
      "this.offsetActiveCameraTransitionFocus(this.focus.clone().sub(previousFocus))"
    );
    expect(source).toContain("this.isKeyboardCameraControlActive()");
    expect(keyboardHandlerStart).toBeGreaterThanOrEqual(0);
    expect(keyboardReleaseStart).toBeGreaterThan(keyboardHandlerStart);
    expect(keyboardHandlerSource).toContain("this.updateKeyboardCameraControls(performance.now())");
    expect(
      keyboardHandlerSource.lastIndexOf("this.updateKeyboardCameraControls(performance.now())")
    ).toBeLessThan(keyboardHandlerSource.indexOf("this.releaseKeyboardCameraArrowKey(event.key)"));
  });

  it("toggles a wrapped Sun-relative camera reference without overriding manual orbit", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const referenceSource = readFileSync(
      join(process.cwd(), "src/renderers/cinematic3d/cameraReference.ts"),
      "utf8"
    );
    const updateStart = source.indexOf("  private updateSunRelativeCameraYaw(): void {");
    const bearingStart = source.indexOf(
      "  private getTrackedFocusSunBearing(): number | null {",
      updateStart
    );
    const updateSource = source.slice(updateStart, bearingStart);

    expect(source).toContain(
      'private cameraReferenceMode: CinematicCameraReferenceMode = "inertial"'
    );
    expect(source).toContain('event.key.toLowerCase() === "c" && !event.repeat');
    expect(source).toContain("this.toggleCameraReferenceMode()");
    expect(source).toContain(
      'this.cameraReferenceMode === "inertial" ? "sun-relative" : "inertial"'
    );
    expect(source).toContain("this.updateSunRelativeCameraYaw();");
    expect(updateSource).toContain("this.sunRelativeCameraTargetKey !== targetKey");
    expect(updateSource).toContain("this.focusPanTransition !== null");
    expect(updateSource).toContain("this.arrivalChaseCamera !== null");
    expect(updateSource).toContain("advanceSunRelativeCameraYaw(");
    expect(updateSource).not.toContain("this.yaw = nextBearing");
    expect(referenceSource).toContain("normalizeRadians(nextSunBearing - previousSunBearing)");
  });

  it("keeps strategic shadow connectors alongside analytic per-fragment solar visibility", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const dynamicLightingSource = readFileSync(
      join(process.cwd(), "src/renderers/cinematic3d/dynamicSolarLighting.ts"),
      "utf8"
    );

    expect(source).toContain("const physicalShadowConeMeshesEnabled = true");
    expect(source).toContain("!physicalShadowConeMeshesEnabled ||");
    expect(source).toContain(
      "this.syncDynamicSolarLighting(bodyObject, body, position, bodiesById)"
    );
    expect(source).toContain("getDynamicSolarVisibility(vWorldPosition, sunPosition)");
    expect(source).toContain("solarDayMask = dayMask * solarVisibility");
    expect(source).toContain("sunFacing * solarVisibility * 0.62");
    expect(source).toContain("opticalDepth *= mix(0.08, 1.0, solarVisibility)");
    expect(source).toContain("!dynamicSolarLightingEnabled && this.tuning.receiverEclipseStrength");
    expect(source).toContain("!dynamicSolarLightingEnabled && this.tuning.shadowVolumeStrength");
    expect(dynamicLightingSource).toContain("export const dynamicSolarLightingEnabled = true");
    expect(dynamicLightingSource).toContain("float dynamicSolarDiscCoverage(");
    expect(dynamicLightingSource).toContain("float getDynamicSolarVisibility(");
    expect(dynamicLightingSource).toContain("uniform vec4 dynamicSolarOccluders[");
    expect(source).toContain("computeReceiverShadowVolume");
    expect(source).toContain("finalShadowVolumeMultiplier");
  });

  it("keeps the cinematic camera free of automatic low-angle presentation assists", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");

    expect(source).not.toContain("getComfortAdjustedOrbitPitchDelta");
    expect(source).not.toContain("applyStrategicPitchAssist");
    expect(source).not.toContain("getLowAngleRisk");
    expect(source).not.toContain("updateLowAnglePresentationProtection");
    expect(source).not.toContain("getForegroundBodyScaleMultiplier");
    expect(source).not.toContain("getPhysicalShadowDominanceOpacityMultiplier");
    expect(source).not.toContain("getOrbitRailHorizonOpacityMultiplier");
    expect(source).not.toContain("camera.position.y =");
  });

  it("allows right-drag orbit to clamp exactly at top-down zenith", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");

    expect(source).toContain("const maxPitch = Math.PI / 2");
    expect(source).toContain("topDownPitchEpsilon");
    expect(source).toContain("this.focus.y + this.distance");
    expect(source).toContain("this.camera.up.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw))");
  });

  it("starts the cinematic camera with an oblique full-system Mercury/Sun composition", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const stateStart = source.indexOf("  private focus = new THREE.Vector3");
    const constructorStart = source.indexOf("  constructor(", stateStart);
    const stateSource = source.slice(stateStart, constructorStart);
    const resizeStart = source.indexOf("  resize(width: number, height: number): void {");
    const fitStartFromResize = source.indexOf("  fitSystem(): void {", resizeStart);
    const resizeSource = source.slice(resizeStart, fitStartFromResize);
    const fitStart = source.indexOf("  fitSystem(): void {");
    const focusTargetStart = source.indexOf("  focusTarget(targetKey: string): void {", fitStart);
    const fitSource = source.slice(fitStart, focusTargetStart);
    const resetRuntimeStart = uiSource.indexOf("  function resetRuntimeAfterGameReset(");
    const handleTutorialAfterTurnStart = uiSource.indexOf(
      "  function handleTutorialAfterTurn(",
      resetRuntimeStart
    );
    const resetRuntimeSource = uiSource.slice(resetRuntimeStart, handleTutorialAfterTurnStart);

    expect(stateSource).toContain("private pitch = maxPitch");
    expect(stateSource).toContain("private distance = maxDistance");
    expect(stateSource).toContain("private hasAppliedOpeningSystemCamera = false");
    expect(source).toContain("const openingCameraMaxPitch");
    expect(source).toContain("const openingCameraMinPitch");
    expect(source).toContain("const openingCameraYawSearchStep");
    expect(source).toContain("const openingCameraYawSearchSpan");
    expect(source).toContain("const openingCameraFramePaddingPixels");
    expect(source).toContain("const openingMercurySolarGapPixels");
    expect(source).toContain("const openingMercurySolarGapRadiusRatio");
    expect(source).toContain("const openingMercurySolarMaxCenterRatio");
    expect(source).toContain("const openingMercurySolarBelowCenterRatio");
    expect(source).toContain("const openingVenusSolarAboveCenterRatio");
    expect(source).not.toContain("openingMercurySolarOverlapMinCenterRatio");
    expect(source).not.toContain("openingMercurySolarOverlapMaxCenterRatio");
    expect(source).toContain("applyOpeningSystemCamera()");
    expect(source).toContain("hasUsableOpeningCameraViewport()");
    expect(source).toContain("computeOpeningSystemCameraComposition()");
    expect(source).toContain("getMultiplayerOpeningCameraFrameTargets()");
    expect(source).toContain("getOpeningCameraFrameTargetsForBodyIds(");
    expect(source).toContain('"neptune"');
    expect(source).toContain('"triton"');
    expect(source).toContain('"uranus"');
    expect(source).toContain('"titania"');
    expect(source).toContain('"oberon"');
    expect(source).toContain('"iapetus"');
    expect(source).toContain("multiplayerOpeningFullOrbitBodyIds");
    expect(source).toContain("getOpeningMoonOrbitFrameTargets(");
    expect(source).toContain("id: `orbit:${moon.id}`");
    expect(source).toContain("getOpeningCameraFocus(sunPosition)");
    expect(source).toContain(
      "getOpeningCameraYawCandidates(\n      sunPosition,\n      mercuryNodePosition,\n      venusPosition"
    );
    expect(source).toContain("getOpeningCameraYaw(sunPosition, mercuryPosition, venusPosition)");
    expect(source).toContain("getMultiplayerOpeningCameraYaw(");
    expect(source).toContain("titanPosition");
    expect(source).toContain("plutoPosition");
    expect(source).toContain("titanSide");
    expect(source).toContain("plutoOppositionSide");
    expect(source).toContain("getOpeningSideBodyScore(");
    expect(source).toContain("multiplayerOpeningLeftEdgeScreenX");
    expect(source).toContain("multiplayerOpeningRightEdgeScreenX");
    expect(source).toContain(
      "innerPlanetSplitDirection = mercuryDirection.clone().sub(venusDirection)"
    );
    expect(source).toContain("findClosestOpeningCameraDistance(focus, yaw, pitch, targets)");
    expect(source).toContain("doesOpeningCameraContainTargets(");
    expect(source).toContain(
      "hasClearOpeningInnerPlanetSolarComposition(sun, mercury, venusPosition)"
    );
    expect(source).toContain("projectWorldRadiusToScreenPixels(");
    expect(source).toContain('this.snapshot.nodes.find((node) => node.bodyId === "mercury")');
    expect(source).toContain('this.snapshot.nodes.find((node) => node.bodyId === "venus")');
    expect(source).toContain("const mercuryPosition = this.getDisplayBodyPosition(mercury)");
    expect(source).toContain("mercuryScreen.y >= sunScreen.y");
    expect(source).toContain("venusScreen.y <= sunScreen.y");
    expect(source).toContain("centerDistance >= minimumVisibleGapDistance");
    expect(source).toContain("centerDistance <= maximumReadableMercuryDistance");
    expect(source).toContain("snapshot.turn < this.snapshot.turn");
    expect(source).not.toContain("focusDefaultPlayerOverview()");
    expect(source).not.toContain("findNearestPlayerOccupiedNodeTargetKeyToSun");
    expect(source).not.toContain(
      "setSelectedTarget(targetKey);\n    this.focusDefaultPlayerOverview"
    );
    expect(resizeSource).toContain("!this.hasAppliedOpeningSystemCamera");
    expect(resizeSource).toContain("this.applyOpeningSystemCamera()");
    expect(fitSource).toContain("this.applyOpeningSystemCamera()");
    expect(fitSource).toContain("this.snapshot.turn <= 0");
    expect(fitSource).toContain("this.pitch = maxPitch");
    expect(fitSource).toContain("this.distance = this.getZoomOutLimit()");
    expect(resetRuntimeSource).toContain("ensureCinematicRenderer();");
    expect(resetRuntimeSource).toContain("cinematicRenderer?.setSnapshot(snapshot);");
    expect(resetRuntimeSource).toContain("frameMultiplayerOpeningCamera()");
    expect(source).toContain("frameMultiplayerOpeningCameraInstant()");
    expect(resetRuntimeSource.indexOf("cinematicRenderer?.setSnapshot(snapshot);")).toBeLessThan(
      resetRuntimeSource.indexOf("fitSystem();")
    );
  });

  it("keeps left-drag pan axes stable across camera pitch", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const panStart = source.indexOf("  private getFocusedPanReferenceDistance(): number {");
    const panEnd = source.indexOf("\n  }\n}\n\nfunction createCircleLine", panStart);
    const panSource = source.slice(panStart, panEnd);

    expect(panStart).toBeGreaterThanOrEqual(0);
    expect(panEnd).toBeGreaterThan(panStart);
    expect(source).toContain("panReferenceDistance: number | null;");
    expect(source).toContain('mode === "pan" ? this.getFocusedPanReferenceDistance() : null');
    expect(panSource).toContain("this.trackedFocusTargetKey ?? this.focusedTargetKey");
    expect(panSource).toContain("computeFocusedPanReferenceDistance({");
    expect(panSource).toContain("cameraPosition: this.camera.position");
    expect(panSource).toContain("focusedTargetPosition");
    expect(panSource).toContain("distance: referenceDistance");
    expect(panSource).toContain(
      "const releasedTargetKey = this.trackedFocusTargetKey ?? this.focusedTargetKey"
    );
    expect(panSource).toContain("const releasedDisplayScaleContext: ManualPanDisplayScaleContext");
    expect(panSource).toContain("focusedTargetKey: this.getDisplayScaleFocusTargetKey()");
    expect(panSource).toContain("distance: this.getDisplayScaleDistance()");
    expect(panSource).toContain("this.manualPanDisplayScaleContext = releasedDisplayScaleContext");
    expect(panSource).toContain("releasedTargetPositionBefore");
    expect(panSource).toContain("releasedTargetPositionAfter");
    expect(panSource).toContain(
      "this.focus.add(releasedTargetPositionAfter.clone().sub(releasedTargetPositionBefore))"
    );
    expect(panSource).toContain("const focusHeight = this.focus.y;");
    expect(panSource).toContain("this.focus.set(clampedFocus.x, focusHeight, clampedFocus.y)");
    expect(panSource).not.toContain("this.focus.set(clampedFocus.x, 0, clampedFocus.y)");
    expect(panSource).toContain("new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw))");
    expect(panSource).toContain("new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw))");
    expect(panSource).not.toContain("getWorldDirection");
    expect(panSource).not.toContain("crossVectors");
  });

  it("keeps persistent wreckage recognizable as ring-hex ship fragments", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");

    expect(source).toContain('"missile-wreckage-ring-c-chunk"');
    expect(source).toContain('"missile-wreckage-ring-c-arc"');
    expect(source).toContain("const survivingArc = Math.PI * 1.55");
    expect(source).toContain('"missile-wreckage-ring-engine-hub"');
    expect(source).toContain('"missile-wreckage-hex-habitat-module"');
    expect(source).toContain('"missile-wreckage-folded-radiator-panel"');
  });

  it("keeps ships visible as blinking lights at far zoom and during BURN", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");

    expect(source).toContain("opacityMultiplier");
    expect(source).toContain("activeBurnMarkerOpacity");
    expect(source).toContain("shipMarkerReadableScaleMultiplier = 1.16");
    expect(source).toContain("Math.max(markerWorldSize, minWorldSize)");
    expect(source).toContain("orbitingShipMinimumWorldSizeZoomOut = 0.6");
    expect(source).toContain("orbitingShipMinimumWorldSizeZoomIn = 2.72");
    expect(source).toContain("orbitingShipMinimumWorldSizeModelDetailStart = 0.18");
    expect(source).toContain("getOrbitingShipMinimumWorldSize(detailProgress)");
    expect(source).toContain("activeBurnMarkerMinimumWorldSize = 0.9");
    expect(source).toContain("Math.max(markerWorldSize, activeBurnMarkerMinimumWorldSize)");
    expect(source).toContain("shipStrategicMarkerCoarseCullDetailThreshold");
    expect(source).toContain("useCoarseShipMarkerCulling &&");
    expect(source).toContain("const strategicMarkerVisibility =");
    expect(source).toContain(
      "const collapsedOccludedOpacity = Math.max(occludedOpacity, strategicMarkerVisibility)"
    );
    expect(source).not.toContain("clamp(markerWorldSize, 0.9, 2.2)");
  });

  it("uses faction-colored technical ship markers and non-aerodynamic payload missiles", () => {
    const rendererSource = readFileSync(
      join(process.cwd(), "src/renderers/cinematic3d/index.ts"),
      "utf8"
    );
    const shipModelsSource = readFileSync(
      join(process.cwd(), "src/renderers/cinematic3d/shipModels.ts"),
      "utf8"
    );
    const source = `${rendererSource}\n${shipModelsSource}`;

    expect(source).toContain("ShipModelFactoryOptions");
    expect(source).toContain(
      'export type ShipModelVariant = "double-cylinder" | "hex-modular" | "ring-hex" | "legacy"'
    );
    expect(source).toContain('const defaultShipModelVariant: ShipModelVariant = "ring-hex"');
    expect(source).toContain("setShipModelVariant(variant: ShipModelVariant)");
    expect(source).toContain('model.userData["shipModelVariant"] = options.variant');
    expect(source).toContain("createHardSciFiShipModel");
    expect(source).toContain("ship-forward-cylinder");
    expect(source).toContain("new THREE.CylinderGeometry(0.235, 0.235, 0.3, 18, 1)");
    expect(source).toContain("ship-mid-cylinder");
    expect(source).toContain("new THREE.CylinderGeometry(0.235, 0.235, 0.36, 18, 1)");
    expect(source).toContain("ship-aft-cylinder");
    expect(source).toContain("new THREE.CylinderGeometry(0.235, 0.235, 0.34, 18, 1)");
    expect(source).toContain("ship-forward-cylinder-bridge");
    expect(source).toContain("ship-aft-cylinder-bridge");
    expect(source).toContain("new THREE.BoxGeometry(0.16, 0.27, 0.25)");
    expect(source).toContain("ship-hex-forward-module");
    expect(source).toContain("new THREE.CylinderGeometry(0.255, 0.255, moduleLength, 6, 1)");
    expect(source).toContain("ship-hex-forward-cylinder");
    expect(source).toContain("new THREE.CylinderGeometry(0.225, 0.225, moduleLength, 18, 1)");
    expect(source).toContain("ship-hex-central-module");
    expect(source).toContain("new THREE.CylinderGeometry(0.305, 0.305, moduleLength, 6, 1)");
    expect(source).toContain("ship-hex-aft-cylinder");
    expect(source).toContain("new THREE.CylinderGeometry(0.18, 0.18, moduleLength, 18, 1)");
    expect(source).toContain('options.variant === "ring-hex"');
    expect(source).toContain("buildRingHexShipModel");
    expect(source).toContain("ship-ring-hex-nose-cone");
    expect(source).toContain("ship-ring-hex-front-module");
    expect(source).toContain("ship-ring-hex-front-face-cylinder-${faceIndex}");
    expect(source).toContain("ship-ring-hex-habitat-module");
    expect(source).toContain("ship-ring-hex-engine-truss");
    expect(source).toContain("ship-ring-hex-central-engine-cylinder");
    expect(source).toContain("ship-ring-hex-engine-interstage-frustum");
    expect(source).toContain("ship-ring-hex-engine-front-field-collar");
    expect(source).toContain("ship-ring-hex-engine-reactor-collar");
    expect(source).toContain("ship-ring-hex-engine-rear-field-collar");
    expect(source).toContain("ship-ring-hex-engine-rotor");
    expect(source).toContain('engineRotor.userData["ringHexEngineRotor"] = true');
    expect(source).toContain("ship-ring-hex-engine-ring");
    expect(source).toContain("ship-ring-hex-ring-strut-${index}");
    expect(source).toContain("ship-ring-hex-zigzag-radiator-assembly-array");
    expect(source).toContain("ship-ring-hex-zigzag-radiator-panels");
    expect(source).toContain("ship-ring-hex-radiator-clockwork-rotor");
    expect(source).toContain("shipAccordionRadiatorBatch");
    const ringHexRadiatorStart = source.indexOf("function createRingHexRadiatorAssembly");
    const ringHexRadiatorEnd = source.indexOf(
      "export function setRingHexShipRadiatorExtension",
      ringHexRadiatorStart
    );
    const ringHexRadiatorSource = source.slice(ringHexRadiatorStart, ringHexRadiatorEnd);
    expect(ringHexRadiatorStart).toBeGreaterThanOrEqual(0);
    expect(ringHexRadiatorEnd).toBeGreaterThan(ringHexRadiatorStart);
    expect(ringHexRadiatorSource).not.toContain("markShipComplexModelDetail(assembly)");
    expect(ringHexRadiatorSource).toContain("new THREE.InstancedMesh");
    expect(ringHexRadiatorSource).toContain("foldCount * bandCount * 2");
    expect(source).toContain("filaments.setMatrixAt");
    expect(source).toContain("setRingHexShipRadiatorExtension");
    expect(source).toContain("setRingHexShipRadiatorClockRotation");
    expect(source).toContain("setRingHexShipEngineRotorRotation");
    expect(source).toContain("shipEngineRotorRadiansPerSecond = 0.32");
    expect(source).toContain("shipRadiatorAnimationInitialPoseIndex = 2");
    expect(source).toContain("getShipRadiatorAnimationFrame");
    expect(source).toContain("startShipRadiatorClockworkTurn");
    expect(source).toContain("radiatorClockRotation");
    expect(source).toContain("ship-ring-hex-exhaust-nozzle");
    expect(source).toContain("ship-ring-hex-red-corner-light");
    expect(source).toContain("ship-ring-hex-amber-engine-light");
    expect(source).toContain("createShipZigzagRadiatorAssembly");
    expect(source).toContain("ship-zigzag-radiator-assembly-${sideName}");
    expect(source).toContain("ship-zigzag-radiator-panel-${sideName}-${row}-${column}");
    expect(source).toContain("ship-zigzag-radiator-rib-${sideName}-${row}-${column}");
    expect(source).toContain("ship-central-hull");
    expect(source).toContain("ship-mission-module");
    expect(source).toContain("missionModule.position.set(0.08, 0, -0.28)");
    expect(source).toContain("ship-structural-spine");
    expect(source).toContain(
      "new THREE.CylinderGeometry(0.04, 0.04, isHexModularVariant ? 1.18 : 1.2, 8, 1)"
    );
    expect(source).toContain("new THREE.CylinderGeometry(0.04, 0.04, 0.72, 8, 1)");
    expect(source).toContain("ship-forward-nose-cone");
    expect(source).toContain("isHexModularVariant ? 0.045 : 0.058");
    expect(source).toContain("isHexModularVariant ? 0.19 : 0.235");
    expect(source).toContain("isHexModularVariant ? 0.44 : 0.54");
    expect(source).toContain("new THREE.CylinderGeometry(0.035, 0.17, 0.48, 8, 1)");
    expect(source).toContain(
      "nose.position.x = isHexModularVariant ? 0.78 : isDoubleCylinderVariant ? 0.82 : 0.67"
    );
    expect(source).toContain("ship-nose-blink-light");
    expect(source).toContain("createShipServiceBlinkLight");
    expect(source).toContain("new THREE.PointLight(color, 0, options.baseDistance, 2.2)");
    expect(source).toContain("markCinematicDecorativePointLightSource");
    expect(source).toContain('light.userData["shipServiceBlinkPointLight"] = true');
    expect(source).toContain('lens.userData["shipServiceBlinkLens"] = true');
    expect(source).toContain("syncShipServiceBlinkLightPresentation");
    expect(source).not.toContain("new THREE.SphereGeometry(0.022, 8, 6)");
    expect(source).not.toContain("new THREE.SphereGeometry(0.024, 8, 6)");
    expect(source).not.toContain("new THREE.SphereGeometry(0.026, 8, 6)");
    expect(source).toContain(
      "isHexModularVariant ? 1.02 : isDoubleCylinderVariant ? 1.115 : 0.925"
    );
    expect(source).toContain("noseBlinkPulse");
    expect(source).toContain("ship-drive-section");
    expect(source).toContain("ship-engine-bell");
    expect(source).toContain("new THREE.CylinderGeometry(0.26, 0.22, 0.3, 16, 1)");
    expect(source).toContain("new THREE.CylinderGeometry(0.18, 0.14, 0.24, 14, 1)");
    expect(source).toContain("new THREE.CylinderGeometry(0.15, 0.27, 0.18, 16, 1, true)");
    expect(source).toContain("new THREE.CylinderGeometry(0.11, 0.19, 0.16, 14, 1, true)");
    expect(source).toContain("shipMetalSunGlintBaseOpacity");
    expect(source).toContain("shipMetalSunGlintDetailFadeStart");
    expect(source).toContain("shipMetalSunGlintDetailFadeEnd");
    expect(source).toContain("shipMetalSunGlintSpecularPower");
    expect(source).toContain("addShipMetalMeshWithSunGlint(model, hull, 1)");
    expect(source).toContain("addShipMetalMeshWithSunGlint(model, nose, 1.18)");
    expect(source).toContain("createShipMetalSunGlintMaterial");
    expect(source).toContain('"shipMetalSunGlint"');
    expect(source).toContain("syncShipMetalSunGlintPresentation");
    expect(source).toContain("sunPosition: this.sunPosition");
    expect(source).toContain("reflect(-lightDirection, normal)");
    expect(source).toContain("specularPower");
    expect(source).toContain("ship-engine-bloom-point");
    expect(source).toContain(
      'root.userData["shipEngineBloomPointObject"] = model.getObjectByName("ship-engine-bloom-point")'
    );
    expect(source).toMatch(
      /getCachedShipMarkerObject\(\s*marker,\s*"shipEngineBloomPointObject",\s*"ship-engine-bloom-point"\s*\)/
    );
    expect(source).toContain("shipEngineBloomPointHdrIntensity = 12");
    expect(source).toContain("new THREE.Points(geometry, material)");
    expect(source).toContain('point.userData["shipEngineHdrBloomPoint"] = true');
    expect(source).toContain("material.toneMapped = false");
    expect(source).not.toContain("ship-tritium-engine-ring");
    expect(source).not.toContain("ship-ring-hex-exhaust-plasma-throat");
    expect(source).toContain("getShipAuxiliaryBeat");
    expect(source).toContain("getShipBeatBlinkPulse");
    expect(source).toContain("getShipOrbitFusionEngineGlow");
    expect(source).toContain("shipAuxiliaryFallbackPulseSeconds = 0.75");
    expect(source).toContain("pulse.pulseIndex");
    expect(source).toContain("positiveModulo(beatIndex + laneOffset, 2)");
    expect(source).toContain("shipLightBlinkFloor");
    expect(source).toContain("shipOrbitEngineGlowBeatBoost");
    expect(source).not.toContain("new THREE.TorusGeometry(0.052, 0.0058, 6, 18)");
    expect(source).toContain("createShipElectromagneticDriveWake");
    expect(source).toContain("syncShipDriveWakePresentation");
    expect(source).toContain("markerScale?: number");
    expect(source).toContain("markerScale: context.markerScale");
    expect(source).toContain("markerScale,");
    expect(source).toContain("ship-electromagnetic-drive-wake");
    expect(source).toContain("ship-drive-wake-plasma-blue-outline");
    expect(source).toContain("ship-drive-wake-plasma-core");
    expect(source).toContain("ship-drive-wake-plasma-halo-${index}");
    expect(source).toContain("plasma-tube-blue-outline");
    expect(source).toContain("plasma-tube-core");
    expect(source).toContain("plasma-tube-halo");
    expect(source).toContain("ship-drive-wake-nozzle-light");
    expect(source).toContain("ship-drive-wake-lance-light");
    expect(source).toContain("shipDriveWakeLight");
    expect(source).toContain("createShipDriveWakeTubeMaterial");
    const driveWakeTubeMaterialStart = source.indexOf("function createShipDriveWakeTubeMaterial");
    const driveWakeTubeMaterialEnd = source.indexOf(
      "function configureShipDriveWakeTailFade",
      driveWakeTubeMaterialStart
    );
    const driveWakeTubeMaterialSource = source.slice(
      driveWakeTubeMaterialStart,
      driveWakeTubeMaterialEnd
    );
    expect(driveWakeTubeMaterialStart).toBeGreaterThanOrEqual(0);
    expect(driveWakeTubeMaterialEnd).toBeGreaterThan(driveWakeTubeMaterialStart);
    expect(driveWakeTubeMaterialSource).toContain("depthTest: true");
    expect(driveWakeTubeMaterialSource).toContain("side: THREE.DoubleSide");
    expect(driveWakeTubeMaterialSource).toContain("diffuseColor.a *= vWakeTailFade");
    expect(driveWakeTubeMaterialSource).toContain("diffuseColor.a <= 0.002");
    expect(source).toContain("configureShipDriveWakeTailFade");
    expect(source).toContain('material.userData["wakeTailFadeStart"] = 0.22');
    expect(source).toContain('material.userData["wakeTailFadeEnd"] = 0.88');
    expect(source).toContain("ship-drive-wake-tail-fade-v2");
    expect(source).toContain("writeShipDriveWakeTubeGeometry");
    expect(source).not.toContain("ship-drive-wake-confinement-ring");
    expect(source).not.toContain("ship-tritium-field-envelope");
    expect(source).toContain("getShipDriveWakeZoomProgress");
    expect(source).toContain("getShipDriveWakeLengthScale");
    expect(source).toContain("shipDriveWakeFallbackPulseSeconds = 1.15");
    expect(source).toContain("shipDriveWakeMinimumTransitPower = 0.055");
    expect(source).toContain("activeBurnDriveWakeFocusedDetailStart = 0.42");
    expect(source).toContain("activeBurnDriveWakeFocusedDetailEnd = 0.92");
    expect(source).not.toContain("activeBurnDriveWakeAxialViewStart");
    expect(source).not.toContain("activeBurnDriveWakeAxialViewEnd");
    expect(source).not.toContain("activeBurnDriveWakeCameraDirection");
    expect(source).not.toContain("activeBurnDriveWakeShipDirection");
    expect(source).not.toContain("const axialViewVisibility =");
    expect(source).toContain("const driveWakeVisibility = isFocusedTransit");
    expect(source).toContain("getShipDriveWakeOpacityProgress");
    expect(source).toContain("getShipDriveWakeLengthProgress");
    expect(source).toContain("wakeZoomProgress, wakeLengthProgress");
    expect(source).toContain("driveWakeVisibility,");
    expect(source).toContain("visibility: context.driveWakeVisibility ?? 0");
    expect(source).toContain("const rawDrivePower = clamp(");
    expect(source).toContain("Math.max(shipDriveWakeMinimumTransitPower, rawDrivePower)");
    expect(source).toContain("const visibleDrivePower = drivePower * wakeVisibility");
    expect(source).toContain(
      "wake.visible = context.isInTransit === true && wakeVisibility > 0.012"
    );
    expect(source).toContain("child.visible = visibleDrivePower > 0.02");
    expect(source).toContain("syncShipEngineBloomPointPresentation(engineBloomPoint");
    expect(source).toContain("writeShipDriveWakeTubeGeometry(wakeTube, {");
    expect(source).toContain('component === "plasma-tube-core"');
    expect(source).toContain("const markerScale = Math.max(0.001, context.markerScale ?? 1)");
    expect(source).toContain("const axialWakeScale = THREE.MathUtils.lerp(");
    expect(source).toContain("wakeLengthScale / markerScale");
    expect(source).toContain("wake.scale.x = axialWakeScale");
    expect(source).toContain("wake.scale.y = radialWakeScale");
    expect(source).toContain('child.userData["shipDriveWakeDecorative"] === true');
    expect(source).toContain('if (options.state === "burn")');
    expect(source).toContain('const sideName = side > 0 ? "top" : "bottom"');
    expect(source).toContain("ship-radiator-assembly-${sideName}");
    expect(source).toContain("ship-radiator-boom-${sideName}");
    expect(source).toContain("ship-radiator-${sideName}");
    expect(source).toContain("ship-radiator-segment-${sideName}-${index}");
    expect(source).toContain("new THREE.BoxGeometry(0.04, 0.78, 0.3)");
    expect(source).toContain("new THREE.BoxGeometry(0.046, 0.018, 0.34)");
    expect(source).toContain("anchorX = -0.02");
    expect(source).toContain("isDoubleCylinderVariant ? -0.1 : -0.02");
    expect(source).toContain("radiator.position.set(anchorX, side * 0.72, 0)");
    expect(source).toContain("radiatorExtension");
    expect(source).toContain("context.radiatorExtension ?? 1");
    expect(source).toContain('segment.userData["shipRadiatorBreathTarget"] = true');
    expect(source).not.toContain('radiator.userData["shipRadiatorBreathTarget"] = true');
    expect(source).toContain("getShipRadiatorBeatBreath");
    expect(source).toContain("getSymmetricRadiatorBreathIntensity");
    expect(source).toContain("syncShipRadiatorBreath");
    expect(source).toContain("target.scale.setScalar(1)");
    expect(source).toContain("syncShipRadiatorLineMaterialBreath");
    expect(source).toContain("material.opacity = clamp(material.opacity * opacityBreath, 0, 1)");
    expect(source).toContain(
      "material.emissiveIntensity = baseEmissiveIntensity * (0.82 + breathIntensity * 0.38)"
    );
    expect(source).toContain("color: factionColor");
    expect(source).toContain("emissive: factionColor");
    expect(source).toContain("color: 0x8d9aa5");
    expect(source).toContain("color: 0x34404a");
    expect(source).toContain("color: 0x25323a");
    expect(source).toContain("color: 0xa8bac2");
    expect(source).toContain("ship-sensor-mast");
    expect(source).toContain("ship-antenna");
    expect(source).toContain("ship-sensor-light");
    expect(source).toContain("color: 0x7adfff");
    expect(source).toContain("depthTest: true");
    expect(source).toContain("const enginePointPulse =");
    expect(source).toContain("mandatoryLaunchEngineBlinkBoost");
    expect(source).toContain("const enginePointOpacity =");
    expect(source).toContain("syncShipEngineBloomPointPresentation(engineBloomPoint");
    expect(source).toContain('"shipEngineDirectGlowConfigured"');
    expect(source).toContain(
      "setExclusiveObjectRenderLayer(engineBloomPoint, cinematicDirectUiRenderLayer)"
    );
    expect(source).toContain(
      'const shouldPreserveHdrEngineSource = child.userData["shipEngineHdrBloomPoint"] === true'
    );
    expect(source).not.toContain("ship-engine-trail");
    expect(source).not.toContain("createShipDrivePlume");
    expect(source).not.toContain("ship-drive-plume");
    expect(source).not.toContain("ship-technical-hull");
    expect(source).not.toContain("ship-faction-hull-fairing");
    expect(source).not.toContain("ship-radiator-stack");
    expect(source).not.toContain("ship-main-spine");
    expect(source).not.toContain("ship-reactor-bus");
    expect(source).not.toContain("ship-aft-reactor-block");
    expect(source).not.toContain("ship-radiator-left");
    expect(source).not.toContain("ship-radiator-right");
    expect(source).toContain("burnTransitInspectableMinDistance");
    expect(source).toContain("closeInspectableTargetMinDistance");
    expect(source).toContain("if (isBurnTargetKey(targetKey))");
    expect(source).toContain("return burnTransitInspectableMinDistance");
    expect(source).toContain("isCloseInspectableTargetKey(targetKey)");
    expect(source).toContain("orbitingShipModelScreenPixelMultiplier = 0.96");
    expect(source).toContain("transitShipModelScreenPixelMultiplier");
    expect(source).toContain("focusedTransitShipModelScreenPixelMultiplier");
    expect(source).toContain("missile-payload-body");
    expect(source).toContain("missile-payload-cap");
    expect(source).toContain("missile-payload-face");
    expect(source).toContain("missile-stabilizer-fin");
    expect(source).toContain("missile-drive-cap");
    expect(source).not.toContain("missile-kinetic-tip");
    expect(source).not.toContain("missile-threat-glint");
    expect(source).toContain("missile-ignition-flash");
    expect(source).toContain("missile-engine-trail");
  });

  it("lets celestial bodies occlude distant tactical objects", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");

    expect(source).toContain("type CelestialBodyOccluder");
    expect(source).toContain("getCelestialBodyOccluders");
    expect(source).toContain("computeCelestialBodyOcclusion");
    expect(source).toContain("const celestialBodyOccluders = this.getCelestialBodyOccluders()");
    expect(source).toContain("this.computeCelestialBodyOcclusion(worldPosition");
    expect(source).toContain("this.computeCelestialBodyOcclusion(motion.position)");
    expect(source).toContain("celestialBodyOcclusionSurfaceMarginRatio");
    expect(source).toContain("frontSurfaceDistance");
    expect(source).toContain("pointDistance <= frontSurfaceDistance + surfaceDepthMargin");
    expect(source).not.toContain("bodyDistance >= pointDistance");
    expect(source).toContain("const occludedOpacity = 1 - clamp(context.occlusion, 0, 1)");
    expect(source).toContain("const occludedOpacity = 1 - clamp(context.occlusion ?? 0, 0, 1)");
    expect(source).toContain("if (occlusion < 0.995)");
    expect(source).toContain("depthTest: true");
    expect(source).toContain("depthWrite: true");
  });

  it("launches and fuses all five construction cargos on the ship orbit", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const cargoStart = source.indexOf("  private animateConstructionCargo");
    const workEffectsStart = source.indexOf("  private updateWorkEffects", cargoStart);
    const cargoSource = source.slice(cargoStart, workEffectsStart);

    expect(cargoStart).toBeGreaterThanOrEqual(0);
    expect(workEffectsStart).toBeGreaterThan(cargoStart);
    expect(cargoSource).toContain("constructionCargoZoomInBeaconOpacity");
    expect(cargoSource).toContain("getConstructionCargoShipLocalScale");
    expect(cargoSource).toContain("this.getTacticalUiZoomOutBoost()");
    expect(cargoSource).toContain("const tacticalZoomOutBoost = this.getTacticalUiZoomOutBoost()");
    expect(cargoSource).toContain("getConstructionCargoLaunchDurationSeconds(cargoIndex)");
    expect(cargoSource).toContain("getConstructionCargoSettleDurationSeconds(cargoIndex)");
    expect(cargoSource).toContain("getConstructionCargoAssemblyLaunchDurationSeconds(cargoIndex)");
    expect(cargoSource).toContain("getConstructionCargoAssemblySettleDurationSeconds(cargoIndex)");
    expect(cargoSource).toContain("nodeObject.constructionCargo.visible = false");
    expect(cargoSource).toContain("nodeObject.constructionCargo.visible = true");
    expect(cargoSource).toContain("constructionLaunchStartedAt");
    expect(cargoSource).toContain("getConstructionCargoLaunchPose");
    expect(cargoSource).toContain("getConstructionCargoOrbitPose");
    expect(cargoSource).toContain("constructionLaunchFlameOpacity");
    expect(cargoSource).toContain("launchVisibility");
    expect(cargoSource).toContain("constructionAssemblyStartedAt");
    expect(cargoSource).toContain("getConstructionCargoAssemblyPushProgress");
    expect(cargoSource).toContain("getConstructionCargoAssemblyPose");
    expect(cargoSource).toContain("constructionAssemblyMorphProgress");
    expect(cargoSource).toContain("producedShipPosition");
    expect(cargoSource).toContain("const bodyWorldPosition = this.getDisplayBodyPosition(body)");
    expect(cargoSource).toContain("bodyCenterLocal");
    expect(cargoSource).toContain("bodyRadiusLocal");
    expect(cargoSource).toContain("nodeObject.group.worldToLocal(bodyWorldPosition)");
    expect(cargoSource).toContain("const bodyRadius = this.getDisplayBodyRadius(body)");
    expect(cargoSource).toContain("bodyRadius / Math.max(0.001");
    expect(cargoSource).toContain("this.getNodeConvoyFormation(");
    expect(cargoSource).not.toContain("getNodeContestedFormation");
    expect(source).toContain("node.shipyardProgress > 0");
    expect(source).toContain("const cargoCount = isAssembly ? 5 : progress");
    expect(source).toContain("existingCargoIndices");
    expect(source).toContain("if (existingCargoIndices.has(index))");
    expect(source).toContain("getConstructionCargoLaunchDelaySeconds(index, index)");
    expect(source).toContain("addedCargoCount * constructionCargoLaunchStaggerSeconds");
    expect(source).toContain("constructionCargo.remove(cargo)");
    expect(source).toContain("createConstructionCargoObject(index, cargoFactionColor)");
    expect(source).toContain("getConstructionCargoAssemblyModuleLaunchStartedAt");
    expect(source).not.toContain("isConstructionCargoPrepositionedAssemblyModule");
    expect(source).not.toContain("getConstructionCargoPrepositionedAssemblyModuleLaunchStartedAt");
    expect(source).toContain("getConstructionCargoAssemblyModuleLaunchStartedAt(");
    expect(source).toContain("getConstructionCargoAssemblyLaunchDelaySeconds");
    expect(source).toContain("constructionCargoAssemblyLaunchStaggerSeconds");
    expect(source).toContain("Math.cos(cargoAngle) * formation.orbitRadius");
    expect(source).toContain("Math.sin(cargoAngle) * formation.orbitRadius");
    expect(source).toContain("getConstructionCargoOrbitAngleAtDistanceOffset");
    expect(source).toContain("const pieceAngle = getConstructionCargoOrbitAngleAtDistanceOffset");
    expect(source).toContain("getCargoOrbitPosition(context.formation, pieceAngle)");
    expect(source).toContain("this.tuning.constructionCargoMinScreenSeparationPixels");
    expect(source).toContain("this.tuning.constructionCargoMaxAngularSpacing");
    expect(source).toContain("minimumPieceSpacingLocal");
    expect(source).toContain("maximumPieceSpacingSceneUnits");
    expect(source).toContain("minimumPieceSpacingSceneUnits");
    expect(cargoSource).toContain("constructionCargoAssemblyFusionProgress");
    expect(cargoSource).toContain("renderMinimumPieceSpacingSceneUnits");
    expect(source).toContain("minimumPieceSpacing: renderMinimumPieceSpacingSceneUnits");
    expect(source).toContain("allowModelFusion: isAssembly");
    expect(source).toContain("allowModelFusion: true");
    expect(source).toContain("const constructionCargoUiSeparationDetailStart = 0.18");
    expect(source).toContain("const constructionCargoUiSeparationDetailEnd = 0.34");
    expect(source).toContain("const constructionCargoModelMinimumPieceSpacing");
    expect(source).toContain("const constructionCargoAssemblyRingHandoffDistance");
    expect(source).toContain("const constructionCargoAssemblyModelHandoffSpacing");
    expect(source).toContain("getConstructionCargoUiSeparationProgress(detailProgress)");
    expect(source).toContain("getConstructionCargoUiMarkerOrbitPosition");
    expect(source).toContain("return getCargoOrbitPosition(context.formation, markerAngle)");
    expect(source).toContain(
      "context.followAngle - orbitDirection * angleStep * clamp(context.cargoIndex, 0, count - 1)"
    );
    expect(source).toContain("signedAngleDelta(context.cargoAngle, separatedMarkerAngle)");
    expect(source).toContain("separationProgress: constructionCargoUiMarkerSeparationProgress");
    expect(source).not.toContain("const proxyOrbitRadius");
    expect(source).not.toContain("minimumSeparationLocal: readablePieceSpacingLocal");
    expect(source).not.toContain(
      ".lerp(uiMarkerProxyPosition, constructionCargoUiMarkerSeparationProgress)"
    );
    expect(source).toContain("modelHandoffLeadDistanceLocal");
    expect(source).toContain("modelHandoffSpacingLocal");
    expect(source).toContain("uiHandoffSpacingLocal");
    expect(source).toContain("handoffLeadDistanceLocal: assemblyHandoffLeadDistanceLocal");
    expect(source).toContain("handoffSpacingLocal: assemblyHandoffSpacingLocal");
    expect(source).toContain("uiSeparationProgress: constructionCargoUiSeparationProgress");
    expect(source).toContain("Math.max(0, minimumPieceSpacing) * uiSeparationProgress");
    expect(source).toContain("allowModelFusion ? 0 : constructionCargoModelMinimumPieceSpacing");
    expect(source).toContain("getConstructionCargoMinimumSeparatedOrbitOffset");
    expect(source).toContain("getConstructionCargoOrbitSeparationLaneIndex");
    expect(source).toContain("const minimumOffset = -minimumPieceSpacing * laneIndex");
    expect(source).toContain("bodyCenter: bodyCenterLocal");
    expect(source).toContain("bodyRadius: bodyRadiusLocal");
    expect(source).toContain(
      "context.bodyCenter.x + Math.cos(context.launchLongitude) * surfaceRadius"
    );
    expect(source).toContain("const shipyardViewerPlanetRadius = 2.55");
    expect(source).toContain("const shipyardViewerShipScale = 0.36");
    expect(source).toContain("const constructionCargoOrbitAngularSpeed = -0.34");
    expect(source).toContain("const constructionCargoLaunchTailLeadAngle = 0.18");
    expect(source).toContain("const constructionCargoFollowDistance = 0.82");
    expect(source).toContain("const constructionCargoConvoyFollowExtraDistance = 0.34");
    expect(source).toContain("const constructionCargoOrbitSettleLagDistance = 0.48");
    expect(source).toContain(
      "const convoyFollowDistance = constructionCargoConvoyFollowExtraDistance"
    );
    expect(source).toContain("context.formation.angle -");
    expect(source).toContain(
      "orbitDirection * (followDistance / Math.max(0.001, context.formation.orbitRadius))"
    );
    expect(source).toContain("clamp(context.uiSeparationProgress, 0, 1) *");
    expect(source).not.toContain("(1 - clamp(context.detailProgress, 0, 1)) *");
    expect(source).toContain("getConstructionCargoOrbitQuaternion(pieceAngle, orbitDirection)");
    expect(source).toContain("getConstructionCargoViewerTargetScale(cargoIndex)");
    expect(source).toContain("shipModelScreenPixels");
    expect(source).toContain("shipDotMinPx");
    expect(source).toContain("getOrbitingShipMinimumWorldSize(context.detailProgress)");
    expect(source).toContain("constructionCargoModuleOffsets");
    expect(source).toContain("shipyardSceneUnitScale");
    expect(source).toContain("position.y = context.formation.origin.y");
    expect(source).toContain("constructionCargoLaunchSurfaceScale");
    expect(source).toContain("getConstructionCargoLaunchSurfacePoint");
    expect(cargoSource).toContain("launchSurfacePoint");
    expect(source).toContain("constructionCargoSurfaceFlashDurationSeconds");
    expect(source).toContain("constructionCargoSurfaceFlashLightIntensity");
    expect(source).toContain("constructionLaunchAge");
    expect(source).toContain("constructionSceneUnitScale");
    expect(source).toContain("constructionCargoStatusBeaconCoreZoomOutPx");
    expect(source).toContain("constructionCargoStatusBeaconHaloZoomOutPx");
    expect(source).toContain("zoomOutScreenScale");
    expect(source).toContain("zoomOutBoost: context.zoomOutBoost");
    expect(source).toContain("createConstructionCargoStatusBeacon");
    expect(source).toContain("syncConstructionCargoStatusBeacon");
    expect(source).toContain("construction-cargo-status-beacon");
    expect(source).toContain("construction-cargo-status-beacon-core");
    expect(source).toContain("construction-cargo-status-beacon-halo");
    expect(source).toContain("viewer-shipyard-status-beacon-core");
    expect(source).toContain("getSharpPointTexture(`viewer-shipyard-status-beacon-core");
    expect(source).toContain("sizeAttenuation: false");
    expect(source).toContain("this.getSolarPointOverlayVisibility(cargoWorldPosition)");
    expect(source).toContain("constructionAssemblyLockProgress");
    expect(source).toContain("constructionAssemblyHandoffOpacity");
    expect(source).toContain("getConstructionCargoAssemblyHandoffOpacity");
    expect(source).toContain("opacityMultiplier: 1 - smootherStep(0.88, 1, morphProgress)");
    expect(source).toContain("constructionLaunchReadyAssembly");
    expect(source).toContain("const internalDetailVisibility = THREE.MathUtils.lerp(");
    expect(source).toContain("const zoomOutBlinkerScale = THREE.MathUtils.lerp");
    expect(source).toContain("smoothStep(0.24, 0.78, detail)");
    expect(source).toContain("construction-cargo-launch-flash");
    expect(source).toContain("construction-cargo-launch-flash-core");
    expect(source).toContain("construction-cargo-launch-flash-halo");
    expect(source).toContain("getNuclearStyleLaunchFlashBurst(progress)");
    expect(source).toContain("return getNuclearStyleRetinalFlashBurst(progress)");
    expect(source).toContain("orbitalCargoLaunchPointLightIntensityMultiplier = 2.8");
    expect(source).toContain("const orbitalCargoLaunchFlashIntensityMultiplier = 0.3");
    expect(source).toContain(
      "const orbitalCargoLaunchSurfaceLightIntensity = 4.6 * orbitalCargoLaunchFlashIntensityMultiplier"
    );
    expect(source).toContain("const orbitalCargoLaunchPointLightRadiusMultiplier = 0.18");
    expect(source).toContain("const orbitalCargoLaunchSurfaceLightRadiusMultiplier = 0.22");
    expect(source).toContain("const orbitalCargoLaunchZoomInIntensityMultiplier = 1.72");
    expect(source).toContain("syncOrbitalCargoLaunchFlashPoints");
    expect(source).toContain("getActiveOrbitalCargoBodyFlashLights");
    expect(source).toContain("getActiveTritiumLaunchBodyFlashLights");
    expect(source).toContain("getActiveConstructionLaunchBodyFlashLights");
    expect(source).toContain("this.syncActiveBodyFlashUniforms(elapsed)");
    expect(source).toContain("frame.planetRadius * orbitalCargoLaunchSurfaceLightRadiusMultiplier");
    expect(source).toContain("bodyRadius * orbitalCargoLaunchSurfaceLightRadiusMultiplier");
    expect(source).toContain("float flashRange = max(0.001, missileFlashRadii[flashIndex])");
    expect(source).toContain("cargo.worldToLocal(cargo.parent.localToWorld");
    expect(source).toContain("new THREE.PointsMaterial");
    expect(source).toContain("alphaTest: 0.018");
    expect(source).toContain("viewer-shipyard-industrial-blinker");
    expect(source).toContain('child.userData["shipyardIndustrialBlinker"] === true');
    expect(source).toContain("const constructionCargoIndustrialPendingLightColor = 0xffc65a");
    expect(source).toContain("getConstructionCargoIndustrialBlinkerReadyColor");
    expect(source).toContain("getConstructionCargoPendingOrReadyColorHex");
    expect(source).toContain("child.material.color.setHex(");
    expect(source).toContain("child.color.setHex(");
    expect(source).toContain('"shipyardIndustrialBlinkerPendingColor"');
    expect(source).toContain('"shipyardIndustrialBlinkerReadyColor"');
    expect(source).toContain('"constructionCargoStatusBeaconPendingColor"');
    expect(source).toContain('"constructionCargoStatusBeaconReadyColor"');
    expect(source).toContain("getConstructionCargoIndustrialSequenceIndex");
    expect(source).toContain("getConstructionCargoIndustrialSequencePulse");
    expect(source).toContain("constructionCargoAssemblySequenceSeconds");
    expect(source).toContain("constructionAssemblySequenceActive");
    expect(source).toContain("isShipyardMandatoryLaunchReady");
    expect(source).toContain("isLaunchReadyAssembly");
    expect(source).toContain("isPresentationAssemblyActive");
    expect(source).toContain("getConstructionCargoAssemblyReadyAge");
    expect(source).toContain("viewer-shipyard-assembly-strut-${index}");
    expect(source).toContain('strut.userData["shipyardAssemblyStrut"] = true');
    expect(source).toContain("syncConstructionCargoAssemblyStruts");
    expect(source).toContain("constructionCargoAssemblyStrutStartProgress");
    expect(source).toContain("getConstructionCargoAssemblyPushStartSeconds");
    expect(source).toContain("constructionCargoAssemblyEnginePushAscentProgress");
    expect(source).toContain("constructionCargoAssemblyEnginePushSettleProgress");
    expect(source).toContain("constructionCargoAssemblyPushDurationSeconds = 3.65");
    expect(source).toContain("constructionCargoAssemblyTimingScale = 0.08");
    expect(cargoSource).toContain('workerFactionId === "player"');
    expect(source).toContain("fuelScoop: { base: -0.32, final: 0.36");
    expect(source).toContain("weapons: { base: -0.62, final: 0.24");
    expect(source).toContain("radiator: { base: -0.92, final: 0.12");
    expect(source).toContain("createConstructionCargoViewerOnlyObject");
    expect(source).toContain("shouldUseModelViewerConstructionCargo()");
    expect(source).toContain("viewer-shipyard-launched-engine-ring-shell");
    expect(source).toContain("ship-ring-hex-engine-ring");
    expect(source).toContain("viewer-shipyard-fuel-scoop-open-intake");
    expect(source).toContain("viewer-shipyard-weapons-hex-module");
    expect(source).toContain("viewer-shipyard-folded-radiator-habitat-module");
    expect(source).toContain("viewer-shipyard-engine-core-cylinder");
    expect(source).toContain("viewer-shipyard-engine-plasma-glow");
    expect(source).not.toContain("Math.max(0.2, cargoWorldSize)");
    expect(source).not.toContain("launchPose?.yaw");
    expect(source).toContain("getConstructionCargoAssemblyFinalMorphProgress");
    expect(source).toContain("getShipyardAssemblyShipRevealProgress");
    expect(source).toContain("markerIndex === producedShipMarkerIndex");
    expect(source).toContain("const mandatoryLaunchShipMarkerIndex = 0");
    expect(source).toContain("markerIndex === mandatoryLaunchShipMarkerIndex");
    expect(source).toContain("construction-cargo-launch-flame");
    expect(source).toContain("constructionCargoOverlayRenderOrder");
    expect(source).toContain("enforceConstructionCargoPlanetOcclusion(root)");
    expect(source).not.toContain("makeConstructionCargoDepthIndependent");
    const cargoDepthStart = source.indexOf("function enforceConstructionCargoPlanetOcclusion");
    const cargoDepthEnd = source.indexOf(
      "function syncConstructionCargoViewerModulePower",
      cargoDepthStart
    );
    const cargoDepthSource = source.slice(cargoDepthStart, cargoDepthEnd);
    expect(cargoDepthStart).toBeGreaterThanOrEqual(0);
    expect(cargoDepthEnd).toBeGreaterThan(cargoDepthStart);
    expect(cargoDepthSource).toContain("material.depthTest = true");
    expect(cargoDepthSource).not.toContain("material.depthTest = false");
    expect(cargoDepthSource).toContain("material.depthWrite = false");
    expect(source).toContain("child.frustumCulled = false");
    expect(source).toContain("root.frustumCulled = false");
    expect(source).toContain("model.frustumCulled = false");
    expect(source).toContain("group.frustumCulled = false");
    expect(source).toContain("sampleCubicBezierTangent3");
    expect(source).toContain("finalFormation: formation");
    expect(source).toContain(
      "const finalPieceAngle = getConstructionCargoOrbitAngleAtDistanceOffset"
    );
    expect(source).toContain("const finalOrbitPosition = getCargoOrbitPosition");
    expect(source).toContain(
      "const finalHandoffPosition = getConstructionCargoAssemblyHandoffPosition"
    );
    expect(source).toContain("Math.max(0, context.handoffLeadDistanceLocal)");
    expect(source).toContain(
      "Math.max(0, context.handoffSpacingLocal) * Math.max(0, context.cargoIndex)"
    );
    expect(source).not.toContain("addScaledVector(context.sourceTangent");
    expect(source).not.toContain("construction-cargo-stripe");
  });

  it("feeds tutorial shipyards through the same construction cargo renderer as the main game", () => {
    const rendererSource = readFileSync(
      join(process.cwd(), "src/renderers/cinematic3d/index.ts"),
      "utf8"
    );
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const syncStart = rendererSource.indexOf("  private syncConstructionCargo");
    const syncEnd = rendererSource.indexOf("  private isShipyardAssemblyAnimating", syncStart);
    const syncSource = rendererSource.slice(syncStart, syncEnd);
    const animateStart = rendererSource.indexOf("  private animateConstructionCargo");
    const animateEnd = rendererSource.indexOf("  private updateWorkEffects", animateStart);
    const animateSource = rendererSource.slice(animateStart, animateEnd);
    const tutorialStart = uiSource.indexOf(
      "  async function startTutorialShipyardArrivalWorkSequence"
    );
    const tutorialEnd = uiSource.indexOf(
      "  function beginTutorialShipyardProductionLesson",
      tutorialStart
    );
    const tutorialSource = uiSource.slice(tutorialStart, tutorialEnd);
    const progressStart = uiSource.indexOf("  function withTutorialShipyardProgress");
    const progressEnd = uiSource.indexOf("  function withTutorialFireImpactTurn", progressStart);
    const progressSource = uiSource.slice(progressStart, progressEnd);

    expect(syncStart).toBeGreaterThanOrEqual(0);
    expect(syncEnd).toBeGreaterThan(syncStart);
    expect(animateStart).toBeGreaterThanOrEqual(0);
    expect(animateEnd).toBeGreaterThan(animateStart);
    expect(tutorialStart).toBeGreaterThanOrEqual(0);
    expect(tutorialEnd).toBeGreaterThan(tutorialStart);
    expect(progressStart).toBeGreaterThanOrEqual(0);
    expect(progressEnd).toBeGreaterThan(progressStart);
    expect(syncSource).not.toMatch(/tutorial/i);
    expect(animateSource).not.toMatch(/tutorial/i);
    expect(syncSource).toContain("node.shipyardProgress > 0");
    expect(syncSource).toContain("const cargoCount = isAssembly ? 5 : progress");
    expect(syncSource).toContain("createConstructionCargoObject(index, cargoFactionColor)");
    expect(animateSource).toContain("for (const node of this.snapshot.nodes)");
    expect(animateSource).toContain("getConstructionCargoOrbitPose");
    expect(animateSource).toContain("getConstructionCargoLaunchPose");
    expect(animateSource).toContain("getConstructionCargoAssemblyPose");
    expect(tutorialSource).toContain(
      "state = withTutorialShipyardProgress(state, shipyardNodeId, 0);"
    );
    expect(tutorialSource).toContain("snapshot = createSolarSystemSnapshot(content, state);");
    expect(progressSource).toContain("shipyardProgress: [");
    expect(progressSource).toContain('workerFactionId: "player"');
    expect(rendererSource).not.toContain("createTutorialConstructionCargo");
    expect(rendererSource).not.toContain("tutorialShipyardAnimation");
    expect(uiSource).not.toContain("createTutorialConstructionCargo");
    expect(rendererSource).toContain("getTurnTransitionDurationMs(from, to)");
    expect(rendererSource).toContain("missileLaunchTransitionMinDurationMs");
    expect(rendererSource).toContain("hasDepartingMissile");
    expect(rendererSource).toContain("hasShipyardProductionEvent(to)");
    expect(rendererSource).toContain("shipyardProductionTransitionMaxDurationMs");
    expect(rendererSource).toContain("getConstructionCargoAssemblyReadyAge(5)");
    expect(rendererSource).toContain("Math.min(");
    expect(uiSource).toContain("turnResolutionPresentationMaxMs = 1600");
    expect(uiSource).toContain("turnTransitionWatchdogGraceMs = 180");
    expect(uiSource).toContain("turnTransitionWatchdogMaxMs = turnResolutionPresentationMaxMs");
    expect(uiSource).toContain(
      "renderer.getTurnTransitionDurationMs(from, to) + turnTransitionWatchdogGraceMs"
    );
    expect(uiSource).not.toContain("renderer.getTurnTransitionDurationMs(from, to) + 2500");
  });

  it("uses sparse surface grid linework, not dots, for shipyard identity", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");

    expect(source).toContain("createShipyardInfrastructureGrid");
    expect(source).toContain("createShipyardProductiveMarkerSquare");
    expect(source).toContain("buildShipyardZenithGrid");
    expect(source).toContain("splitShipyardGridPhaseBuckets");
    expect(source).toContain("getShipyardZenithAnchorDirection");
    expect(source).toContain("Math.pow(rawY, 0.68)");
    expect(source).toContain("const coverageRadius = tuning.shipyardSurfaceCoverageRadius");
    expect(source).toContain("const phaseBucketCount = 7");
    expect(source).toContain("bodyObject.industrialLights.rotation.copy(bodyObject.mesh.rotation)");
    expect(source).toContain("bodyObject.industrialLights.rotation.y = bodySelfRotation");
    expect(source).toContain("shipyardLightRhythmBpm");
    expect(source).toContain("shipyardLightWorkerPulseBoost");
    expect(source).toContain("getShipyardIndustrialLightSignal");
    expect(source).toContain('lines.userData["shipyardLightIndustrialChannel"]');
    expect(source).toContain("const breathingRate =");
    expect(source).toContain("const logisticsBreath =");
    expect(source).toContain("const feederBreath =");
    expect(source).toContain("const corridorEnergy =");
    expect(source).not.toContain("isShipyardIndustrialLightStepLit");
    expect(source).not.toContain('lines.userData["shipyardLightSequenceLength"]');
    expect(source).not.toContain('lines.userData["shipyardLightDutyCycle"]');
    expect(source).toContain("shipyardLightSideOpacityFloor");
    expect(source).toContain("shipyardDarkSideOpacityBoost");
    expect(source).toContain("shipyardTerminatorGlowBoost");
    expect(source).toContain("shipyardSurfaceCoverageRadius");
    expect(source).toContain("createShipyardSurfaceGridMaterial");
    expect(source).toContain("setShipyardSurfaceGridOpacity");
    expect(source).toContain("float lightSideFade = smoothstep(-0.12, 0.62, sunDot);");
    expect(source).toContain("mix(darkSideOpacityBoost, lightSideOpacityFloor, lightSideFade)");
    expect(source).toContain('lines.userData["shipyardLightFlowPhase"]');
    expect(source).toContain('node.type === "tritium" || node.type === "shipyard"');
    expect(source).toContain("shipyard-surface-grid");
    expect(source).toContain("shipyard-collapsed-square");
    expect(source).toContain("createTritiumProductiveMarkerPip");
    expect(source).toContain("tritiumProductiveMarkerPipSpriteScale");
    expect(source).toContain("pip.frustumCulled = false");
    const productiveMarkerGroupStart = source.indexOf("function createProductiveMarkerGroup");
    const productiveMarkerGroupEnd = source.indexOf(
      "function createTritiumProductiveMarkerPip",
      productiveMarkerGroupStart
    );
    expect(productiveMarkerGroupStart).toBeGreaterThanOrEqual(0);
    expect(productiveMarkerGroupEnd).toBeGreaterThan(productiveMarkerGroupStart);
    const productiveMarkerGroupSource = source.slice(
      productiveMarkerGroupStart,
      productiveMarkerGroupEnd
    );
    expect(productiveMarkerGroupSource).toContain("new THREE.Vector3(-0.38, 0.72, -0.22)");
    expect(productiveMarkerGroupSource).toContain("new THREE.Vector3(0.38, 0.72, -0.22)");
    expect(productiveMarkerGroupSource).toContain("new THREE.Vector3(0, 0.72, 0.44)");
    expect(productiveMarkerGroupSource).not.toContain("new THREE.Vector3(-0.62, 0.72, -0.36)");
    expect(productiveMarkerGroupSource).not.toContain("new THREE.Vector3(-0.82, 0.72, -0.48)");
    const tritiumPipStart = source.indexOf("function createTritiumProductiveMarkerPip");
    const tritiumPipEnd = source.indexOf(
      "function createTritiumInfrastructureGrid",
      tritiumPipStart
    );
    expect(tritiumPipStart).toBeGreaterThanOrEqual(0);
    expect(tritiumPipEnd).toBeGreaterThan(tritiumPipStart);
    const tritiumPipSource = source.slice(tritiumPipStart, tritiumPipEnd);
    expect(tritiumPipSource).toContain("depthTest: false");
    expect(tritiumPipSource).toContain("pip.renderOrder = 38.9");
    expect(source).not.toContain("new THREE.BoxGeometry(0.78, 0.16, 0.78)");
    expect(source).toContain("nodeObject.productiveMarkers.scale.setScalar");
    expect(source).toContain("productiveNodeMarkerMinimumVisibleOpacity");
    expect(source).toContain("tritiumProductiveMarkerGlowOpacity");
    expect(source).toContain("shipyardProductiveMarkerGlowOpacity");
    expect(source).toContain("shipyardProductiveMarkerRenderOrder = 40.2");
    expect(source).toContain("shipyardProductiveMarkerZoomOutLift = 0.96");
    expect(source).toContain("shipyardProductiveMarkerZoomInLift = 0.48");
    expect(source).toContain("new THREE.ShapeGeometry(outline)");
    const shipyardMarkerStart = source.indexOf("function createShipyardProductiveMarkerSquare");
    const shipyardMarkerEnd = source.indexOf(
      "function buildShipyardZenithGrid",
      shipyardMarkerStart
    );
    const shipyardMarkerSource = source.slice(shipyardMarkerStart, shipyardMarkerEnd);
    expect(shipyardMarkerSource).toContain("new THREE.Mesh");
    expect(shipyardMarkerSource).not.toContain("THREE.Sprite");
    expect(source).toContain("nodeObject.productiveMarkers.visible = true");
    expect(source).not.toContain("nodeObject.productiveMarkers.visible = opacity > 0.025");
    const productiveMarkerReadabilityStart = source.indexOf(
      "private updateProductiveMarkerReadability("
    );
    const productiveMarkerReadabilityEnd = source.indexOf(
      "private getTacticalUiZoomOutBoost",
      productiveMarkerReadabilityStart
    );
    expect(productiveMarkerReadabilityStart).toBeGreaterThanOrEqual(0);
    expect(productiveMarkerReadabilityEnd).toBeGreaterThan(productiveMarkerReadabilityStart);
    expect(
      source.slice(productiveMarkerReadabilityStart, productiveMarkerReadabilityEnd)
    ).not.toContain("node.isWorking");
    const productiveMarkerReadabilitySource = source.slice(
      productiveMarkerReadabilityStart,
      productiveMarkerReadabilityEnd
    );
    expect(productiveMarkerReadabilitySource).not.toContain(
      'getNumericUserData(nodeObject.productiveMarkers, "opacityMultiplier")'
    );
    expect(productiveMarkerReadabilitySource).not.toContain(
      "this.getSolarPointOverlayVisibility(worldCenter)"
    );
    expect(productiveMarkerReadabilitySource).toContain("shipyardCollapsedGridMaxPx");
    expect(productiveMarkerReadabilitySource).toContain("shipyardCollapsedGridMinPx");
    expect(productiveMarkerReadabilitySource).toContain(
      'child.userData["shipyardGridLod"] === "collapsed-square"'
    );
    expect(source).toContain("tritiumProductiveMarkerGlowOpacity * flashOpacityMultiplier");
    expect(source).toContain('node.type === "shipyard"');
    expect(source).toContain("shipyardProductiveMarkerGlowOpacity * flashOpacityMultiplier");
    expect(source).toContain("new THREE.MeshBasicMaterial");
    expect(source).toContain("square.rotation.x = -Math.PI / 2");
    expect(source).toContain("square.position.y = shipyardProductiveMarkerZoomOutLift");
    expect(source).toContain("square.renderOrder = shipyardProductiveMarkerRenderOrder");
    expect(source).toContain("square.frustumCulled = false");
    expect(source).toContain("child instanceof THREE.Mesh");
    expect(source).not.toContain("baseLineWidth + flashLevel * flashPulseWeight");
    expect(source).not.toContain("updateShipyardProductiveMarkerStability");
    expect(source).not.toContain("screenStableWorldScale");
    expect(source).toContain("THREE.MathUtils.lerp(1.38, 0.78, detailProgress)");
    expect(source).toContain(
      "flashLevel * flashPulseWeight * THREE.MathUtils.lerp(0.26, 0.08, detailProgress)"
    );
    expect(source).not.toContain("halfSize * 0.52");
    expect(source).not.toContain("halfSize * 0.46");
    expect(source).not.toContain("halfSize * 0.42");
    expect(source).toContain("depthTest: false");
    expect(source).toContain('group.userData["shipyardMarkerKind"] = "surface-grid"');
    expect(source).toContain('square.userData["shipyardGridLod"] = "collapsed-square"');
    expect(source).not.toContain("createShipyardProductiveMarkerFallback");
    expect(source).not.toContain("shipyard-collapsed-square-fallback");
    expect(source).not.toContain("child.quaternion.copy(this.camera.quaternion)");
    expect(source).not.toContain("new THREE.SphereGeometry(0.035");
    expect(source).not.toContain("bodyObject.industrialLights.quaternion.identity()");
    expect(source).not.toContain("bodyObject.industrialLights.quaternion.setFromUnitVectors");
  });

  it("keeps the tritium polar network varied and independently power-cycled", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const gridStart = source.indexOf("function createTritiumInfrastructureGrid");
    const gridEnd = source.indexOf("function createTritiumSurfaceLineMaterial", gridStart);

    expect(gridStart).toBeGreaterThanOrEqual(0);
    expect(gridEnd).toBeGreaterThan(gridStart);
    const gridSource = source.slice(gridStart, gridEnd);

    expect(gridSource).toContain('"viewer-tritium-surface-grid-equator"');
    expect(gridSource).toContain("const polarNetworkRootCount = body.kind");
    expect(gridSource).toContain("for (const side of [-1, 1] as const)");
    expect(gridSource).toContain("polarReach");
    expect(gridSource).toContain("isShortEquatorialTrunk");
    expect(gridSource).toContain("isMediumLatitudeTrunk");
    expect(gridSource).toContain("polarReach < 0.62");
    expect(gridSource).toContain("polarReach < 0.9");
    expect(gridSource).toContain("tipLatitudeMagnitude");
    expect(gridSource).toContain("branchLatitudeCeiling");
    expect(gridSource).toContain("availableBranchClimb");
    expect(gridSource).toContain("finalClimbMagnitude");
    expect(gridSource).toContain("const trunkJunctions:");
    expect(gridSource).toContain("const lateralJogDirection");
    expect(gridSource).toContain("const elbowLongitude");
    expect(gridSource).toContain("const elbowLatitude");
    expect(gridSource).not.toContain("wideningMeander");
    expect(gridSource).not.toContain("riverDrift");
    expect(gridSource).not.toContain("localJitter");
    expect(gridSource).toContain("polarNetworkSegmentsByChannel");
    expect(gridSource).toContain("tritiumPolarLightChannelCount");
    expect(gridSource).toContain("trunkChannel");
    expect(gridSource).toContain("branchChannel");
    expect(gridSource).toContain("viewer-tritium-surface-grid-polar-network-channel-");
    expect(gridSource).toContain("0xa4f6e7");
    expect(gridSource).toContain("0xb5f5ff");
    expect(source).toContain("const tritiumSurfacePatternSwitchMinSeconds = 1.5");
    expect(source).toContain("const tritiumSurfacePatternSwitchMaxSeconds = 2.5");
    expect(source).toContain('lines.userData["tritiumLightStepSeconds"]');
    expect(source).toContain(
      "getBeatSynchronizedCycleAngle(elapsed, Math.PI / stepSeconds, beatPulse) + phase"
    );
    expect(source).not.toContain("isWorking ? 8.8 : 3.2");
  });

  it("keeps contested-node presentation driven by snapshot state", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");

    expect(source).toContain("contestedRings");
    expect(source).toContain("syncContestedRings");
    expect(source).toContain("node.isContested");
    expect(source).toContain("nodeOccupancies[slot]");
    expect(source).toContain("getNodeContestedFormation");
    expect(source).toContain("getStrategicContestedRingQuaternion");
    expect(source).toContain("getStrategicContestedOrbitBasis");
    expect(source).toContain("contestedStrategicViewPitch");
    expect(source).not.toContain("getViewContestedRingQuaternion");
    expect(source).not.toContain("getViewContestedOrbitBasis");
    expect(source).toContain("contested-ring-band");
    expect(source).toContain("Math.max(0.32, node.nodeOrbitRadius * 0.055)");
    expect(source).toContain("shipyardWorkerFactionId");
    expect(source).toContain("getCargoOrbitPosition");
    expect(source).toContain("formation.roll");
    expect(source).toContain("contested-skirmish-along");
    expect(source).toContain("contested-skirmish-lateral");
    expect(source).toContain("contestedSkirmishMissileMissBeatInterval = 13");
    expect(source).toContain("getContinuousPulseBeatTime");
    expect(source).toContain("contestedThrusterFallbackPulseSeconds = 0.56");
    expect(source).toContain("contestedThrusterJetCycleBeats = 8");
    expect(source).toContain("getContestedThrusterJetSlot");
    expect(source).toContain("slot === 0 || slot === 3 || slot === 6");
    expect(source).toContain("contestedThrusterJetsGroup");
    expect(source).toContain("contested-stabilizer-jets");
    expect(source).toContain("contested-stabilizer-jet");
    expect(source).toContain("createContestedThrusterJetMesh");
    expect(source).toContain("getContestedSkirmishMissileVoidBurst");
    expect(source).toContain("createMissileVoidBurstEffectGroup");
    expect(source).not.toContain("getContestedSkirmishVoidBurstWhiteoutOpacity");
    expect(source).toContain("contested-skirmish-flash");
    expect(source).toContain("missile-void-burst-glare");
    expect(source).not.toContain("contested-skirmish-nuclear-glare");
    expect(source).not.toContain("contested-skirmish-afterimage");
    expect(source).not.toContain("TRITIUM_INCOME");
    expect(source).not.toContain("SHIPYARD_PROGRESS");
  });

  it("re-arms tutorial FIRE after cancellation and advances only with a queued solution", () => {
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const cancelStart = uiSource.indexOf("      onFireOrderCancelled(originNodeId: string) {");
    const cancelEnd = uiSource.indexOf("      onInvalidAction(reason: string) {", cancelStart);
    const cancelSource = uiSource.slice(cancelStart, cancelEnd);
    const executeStart = uiSource.indexOf("  async function executeCurrentTurn(): Promise<void> {");
    const executeEnd = uiSource.indexOf("  async function resolveCurrentTurn(", executeStart);
    const executeSource = uiSource.slice(executeStart, executeEnd);

    expect(cancelStart).toBeGreaterThanOrEqual(0);
    expect(cancelEnd).toBeGreaterThan(cancelStart);
    expect(cancelSource).toContain("const queuedTutorialOrder = getTutorialQueuedFireOrder();");
    expect(cancelSource).toContain("handleTutorialFireOrderCancelled(cancelledTutorialOrder);");
    expect(uiSource).toContain("recoverTutorialQueuedFireLessonAfterCancellation(");
    expect(executeStart).toBeGreaterThanOrEqual(0);
    expect(executeEnd).toBeGreaterThan(executeStart);
    expect(executeSource).toContain('tutorialState?.phase === "shipyardFireQueued"');
    expect(executeSource).toContain('tutorialState?.phase === "shipyardContestedFireQueued"');
    expect(executeSource.match(/getTutorialQueuedFireOrder\(\) !== undefined/g)).toHaveLength(2);
  });

  it("keeps mandatory launch selection locked until a burn destination is chosen", () => {
    const rendererSource = readFileSync(
      join(process.cwd(), "src/renderers/cinematic3d/index.ts"),
      "utf8"
    );
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const selectionLockStart = rendererSource.indexOf(
      "  setSelectionLock(targetKey: string | null): void {"
    );
    const selectTargetStart = rendererSource.indexOf(
      "  selectTarget(targetKey: string | null): void {",
      selectionLockStart
    );
    const selectionLockSource = rendererSource.slice(selectionLockStart, selectTargetStart);

    expect(rendererSource).toContain("setSelectionLock(targetKey: string | null)");
    expect(selectionLockStart).toBeGreaterThanOrEqual(0);
    expect(selectTargetStart).toBeGreaterThan(selectionLockStart);
    expect(selectionLockSource).toContain("this.lockedSelectionTargetKey = targetKey");
    expect(selectionLockSource).toContain("this.setSelectedTarget(targetKey)");
    expect(rendererSource).toContain("this.pickBurnDestinationHoverZone(point)");
    expect(rendererSource).toContain("private pickBurnDestinationHoverZone(point: Vec2)");
    expect(rendererSource).toContain("const originNodeId = this.getSelectedBurnOriginNodeId()");
    expect(rendererSource).toContain("const plan = this.getBurnPlan?.(originNodeId, node.id)");
    expect(rendererSource).toContain("const pickRadius = clamp(screenRadius + 36, 34, 92)");
    expect(selectionLockSource).not.toContain("focusTargetWithoutZoom");
    expect(selectionLockSource).not.toContain("focusTarget(");
    expect(rendererSource).toContain("this.lockedSelectionTargetKey !== null");
    expect(rendererSource).toContain("event.button === 0 || event.button === 1");
    expect(rendererSource).toContain('type DragMode = "orbit" | "pan"');
    expect(rendererSource).not.toContain('"select"');
    expect(rendererSource).toContain("this.onBurnOrderCancelled(orderToCancel.originNodeId)");
    expect(uiSource).toContain("isMandatoryLaunchLockActive()");
    expect(uiSource).toContain("if (!isPlayerFactionHuman())");
    expect(uiSource).toContain("return getNextPlayerMandatoryLaunch() !== undefined;");
    expect(uiSource).toContain("nextTurnButton.disabled =");
    expect(uiSource).toContain("function isManualExecutePromptDisabled()");
    expect(uiSource).toContain("executePrompt.disabled = isManualExecutePromptDisabled();");
    expect(uiSource).toContain('source === "manual" && isMandatoryLaunchLockActive()');
    expect(uiSource).toContain("mandatoryLaunchGuidanceStartedAt");
    expect(uiSource).toContain("mandatoryLaunchGuidanceStartedAt = null;");
    expect(uiSource).toContain("mandatoryLaunchGuidanceStartedAt = performance.now();");
    expect(uiSource).not.toContain("executePrompt.disabled = nextTurnButton.disabled");
    expect(uiSource).not.toContain('(source === "manual" && nextTurnButton.disabled)');
    expect(uiSource).toContain("fitButton.disabled = isReplayMode || isMandatoryLaunchLocked");
    expect(uiSource).toContain("viewSelect.disabled = isReplayMode || isMandatoryLaunchLocked");
    expect(uiSource).toContain(
      "shipModelSelect.disabled = isReplayMode || isMandatoryLaunchLocked"
    );
    expect(uiSource).toContain("focusSelect.disabled = isReplayMode || isMandatoryLaunchLocked");
    expect(uiSource).toContain("forceCinematicViewForMandatoryLaunch()");
    expect(uiSource).not.toContain("cinematicRenderer?.focusTargetWithoutZoom(lockedTargetKey)");
  });

  it("replaces the tutorial execute prompt with a disabled crew lost cue after ship destruction", () => {
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const styleSource = readFileSync(join(process.cwd(), "src/styles.css"), "utf8");

    expect(uiSource).toContain(
      'type ExecutePromptMode = "execute" | "launch" | "countdown" | "crew-lost";'
    );
    expect(uiSource).toContain("function isTutorialCrewLostExecuteCueActive()");
    expect(uiSource).toContain('return phase === "autoAdvancingToShipyardContestedFireImpact";');
    expect(uiSource).toContain('event.type === "SHIP_DESTROYED"');
    expect(uiSource).toContain('return "crew-lost";');
    expect(uiSource).toContain("isTutorialCrewLostExecuteCueActive() ||");
    expect(uiSource).toContain('crewLost.textContent = "CREW LOST";');
    expect(uiSource).toContain(
      'executePrompt.classList.toggle("command-console__execute--crew-lost"'
    );
    expect(styleSource).toContain(".command-console__execute--crew-lost");
    expect(styleSource).toContain(".execute-crew-lost-word");
    expect(styleSource).toContain(
      ".command-console__line--tutorial-replay-cue .command-console__crew-lost-cue"
    );
    expect(styleSource).toContain(
      "animation: command-warning-blink var(--beat-command-warning-duration, 820ms) steps(2, end)"
    );
    expect(styleSource).toContain(
      "animation: tutorial-live-hint-blink var(--beat-tutorial-replay-duration, 1400ms) steps(2, end)"
    );
  });

  it("prioritizes the first enemy kill replay over simultaneous mandatory launch", () => {
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const flowStart = uiSource.indexOf(
      "  async function continueTutorialShipyardContestedFireToEnemyDestroyed()"
    );
    const flowEnd = uiSource.indexOf(
      "  function pauseTutorialForFirstEnemyKillReplayCue()",
      flowStart
    );
    const flowSource = uiSource.slice(flowStart, flowEnd);

    expect(flowStart).toBeGreaterThanOrEqual(0);
    expect(flowEnd).toBeGreaterThan(flowStart);
    expect(flowSource).toContain("maybePauseTutorialShipyardFlowForMandatoryLaunch()");
    expect(flowSource.indexOf("pauseTutorialForFirstEnemyKillReplayCue()")).toBeLessThan(
      flowSource.indexOf("maybePauseTutorialShipyardFlowForMandatoryLaunch()")
    );
    expect(flowSource).toContain('tutorial.phase !== "autoAdvancingToShipyardContestedFireImpact"');
    expect(uiSource).toContain("getMandatoryLaunchPromptTargetKeys(mandatoryLaunch.nodeId)");
    expect(uiSource).toContain("fallbackStartedAt: startedAt + mandatoryLaunchGuidanceDelayMs");
  });

  it("starts the replay cue from the global first enemy destruction event", () => {
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const afterTurnStart = uiSource.indexOf("  function handleTutorialAfterTurn(");
    const autoResolveStart = uiSource.indexOf(
      "  async function tutorialAutoResolveTurn()",
      afterTurnStart
    );
    const afterTurnSource = uiSource.slice(afterTurnStart, autoResolveStart);
    const pauseStart = uiSource.indexOf(
      "  function pauseTutorialForFirstEnemyKillReplayCue(): boolean {"
    );
    const completeStart = uiSource.indexOf(
      "  function completeTutorialFirstEnemyKillReplayCue(): void {",
      pauseStart
    );
    const pauseSource = uiSource.slice(pauseStart, completeStart);

    expect(afterTurnStart).toBeGreaterThanOrEqual(0);
    expect(autoResolveStart).toBeGreaterThan(afterTurnStart);
    expect(afterTurnSource).toContain("if (pauseTutorialForFirstEnemyKillReplayCue()) {");
    expect(afterTurnSource.indexOf("pauseTutorialForFirstEnemyKillReplayCue()")).toBeLessThan(
      afterTurnSource.indexOf("resumeTutorialShipyardContestedSupportFire")
    );
    expect(pauseSource).toContain(
      "findFirstTutorialEnemyKillResolutionEvent(matchResolutionEvents)"
    );
    expect(pauseSource).not.toContain("getTutorialShipyardContestedTargetNodeId");
    expect(pauseSource).toContain("event.nodeId ?? event.replayCue?.nodeIds[0] ?? null");
    expect(pauseSource).toContain("if (isTutorialFirstEnemyKillReplayCueActive()) {");
  });

  it("does not reveal the menu demo transcript while a new session is starting", () => {
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const stopDemoStart = uiSource.indexOf("  function stopGameMenuDemo(): void {");
    const hideConsoleStart = uiSource.indexOf(
      "  function hideCommandConsoleForGameMenuLaunch(): void {",
      stopDemoStart
    );
    const revealConsoleStart = uiSource.indexOf(
      "  function revealCommandConsoleForActiveGame(): void {",
      hideConsoleStart
    );
    const clearTimersStart = uiSource.indexOf(
      "  function clearGameMenuDemoTimers(): void {",
      revealConsoleStart
    );
    const stopDemoSource = uiSource.slice(stopDemoStart, hideConsoleStart);
    const hideConsoleSource = uiSource.slice(hideConsoleStart, revealConsoleStart);
    const tutorialStart = uiSource.indexOf(
      "  async function startTutorialSegment01(): Promise<void> {"
    );
    const tutorialEnd = uiSource.indexOf(
      "  function createTutorialSegment01InitialState",
      tutorialStart
    );
    const tutorialSource = uiSource.slice(tutorialStart, tutorialEnd);
    const resetGameStart = uiSource.indexOf(
      "  function resetDebugGameMode(mode: GameModeId): void {"
    );
    const resetGameEnd = uiSource.indexOf("  function resetDebugAiMode", resetGameStart);
    const resetGameSource = uiSource.slice(resetGameStart, resetGameEnd);

    expect(stopDemoStart).toBeGreaterThanOrEqual(0);
    expect(hideConsoleStart).toBeGreaterThan(stopDemoStart);
    expect(revealConsoleStart).toBeGreaterThan(hideConsoleStart);
    expect(clearTimersStart).toBeGreaterThan(revealConsoleStart);
    expect(stopDemoSource).toContain("hideCommandConsoleForGameMenuLaunch();");
    expect(stopDemoSource).not.toContain('commandConsole.classList.remove("is-hidden");');
    expect(hideConsoleSource).toContain('commandConsole.classList.add("is-hidden");');
    expect(hideConsoleSource).toContain("commandTranscript.replaceChildren();");
    expect(hideConsoleSource).toContain("commandLive.replaceChildren();");
    expect(tutorialSource).toContain("revealCommandConsoleForActiveGame();");
    expect(
      tutorialSource.indexOf("resetRuntimeAfterGameReset({ preserveTutorial: true });")
    ).toBeLessThan(tutorialSource.indexOf("revealCommandConsoleForActiveGame();"));
    expect(resetGameSource).toContain("resetRuntimeAfterGameReset();");
    expect(resetGameSource).toContain("revealCommandConsoleForActiveGame();");
  });

  it("runs the menu background conflict with the competitive AI planner", () => {
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const rendererSource = readFileSync(
      join(process.cwd(), "src/renderers/cinematic3d/index.ts"),
      "utf8"
    );
    const startDemoStart = uiSource.indexOf("  function startGameMenuDemo(): void {");
    const createDemoStateStart = uiSource.indexOf(
      "  function createGameMenuDemoInitialState(): GameState {",
      startDemoStart
    );
    const startDemoSource = uiSource.slice(startDemoStart, createDemoStateStart);
    const clearEffectsStart = rendererSource.indexOf("  clearPresentationEffects(): void {");
    const clearEffectsEnd = rendererSource.indexOf(
      "  freezeTimelineReviewCamera(): void {",
      clearEffectsStart
    );
    const clearEffectsSource = rendererSource.slice(clearEffectsStart, clearEffectsEnd);

    expect(startDemoStart).toBeGreaterThanOrEqual(0);
    expect(createDemoStateStart).toBeGreaterThan(startDemoStart);
    expect(startDemoSource).toContain("setDebugAiLevel(3);");
    expect(startDemoSource).not.toContain("setDebugAiLevel(1);");
    expect(startDemoSource).toContain("scheduleGameMenuDemoTurn(0);");
    expect(uiSource).toContain(
      "cinematicRenderer.setTrajectoryReflectionMode(trajectoryReflectionMode);"
    );
    expect(clearEffectsSource).not.toContain("burnPreviewGroup");
    expect(clearEffectsSource).not.toContain("pendingBurnGroup");
    expect(clearEffectsSource).not.toContain("activeBurnGroup");
    expect(clearEffectsSource).not.toContain("firePreviewGroup");
    expect(clearEffectsSource).not.toContain("pendingFireGroup");
    expect(clearEffectsSource).not.toContain("activeMissileGroup");
  });

  it("flickers isolated menu glyphs without glitching the whole menu", () => {
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const styleSource = readFileSync(join(process.cwd(), "src/styles.css"), "utf8");
    const flickerStyleStart = styleSource.indexOf(".game-menu__glyph.is-crt-flickering");
    const flickerStyleEnd = styleSource.indexOf(
      "@media (prefers-reduced-motion",
      flickerStyleStart
    );
    const flickerStyle = styleSource.slice(flickerStyleStart, flickerStyleEnd);

    expect(uiSource).toContain("scheduleGameMenuCrtFlicker();");
    expect(uiSource).toContain('gameMenu.querySelectorAll<HTMLElement>(".game-menu__glyph")');
    expect(uiSource).toContain('glyph.classList.add("is-crt-flickering")');
    expect(uiSource).not.toContain('gameMenu.classList.add("is-crt-flicker")');
    expect(uiSource).toContain('window.matchMedia("(prefers-reduced-motion: reduce)").matches');
    expect(uiSource).toContain("const gameMenuCrtFlickerMinDelayMs = 1_200;");
    expect(uiSource).toContain("const gameMenuCrtFlickerMaxDelayMs = 3_400;");
    expect(styleSource).toContain(".game-menu__glyph.is-crt-flickering");
    expect(styleSource).toContain("@keyframes game-menu-crt-phosphor-flicker");
    expect(styleSource).toContain("--game-menu-crt-flicker-duration");
    expect(flickerStyle).not.toContain("transform:");
    expect(flickerStyle).not.toContain("filter:");
    expect(flickerStyle).not.toContain("blur(");
    expect(styleSource).not.toContain("rgba(255, 54, 92");
    expect(styleSource).not.toContain("rgba(79, 231, 255");
  });

  it("keeps browser gameplay and trailer presentation inside the adaptive performance budget", () => {
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const modeResolverStart = uiSource.indexOf(
      "  function getCinematicPerformanceMode(): CinematicPerformanceMode {"
    );
    const modeResolverEnd = uiSource.indexOf(
      "  function getStoredTrajectoryReflectionMode(): CinematicTrajectoryReflectionMode {",
      modeResolverStart
    );
    const resolverStart = uiSource.indexOf(
      "  function getCinematicRendererPerformanceMode(): CinematicPerformanceMode {"
    );
    const resolverEnd = uiSource.indexOf("  function playSelectionChangedSfx", resolverStart);
    const modeResolverSource = uiSource.slice(modeResolverStart, modeResolverEnd);
    const resolverSource = uiSource.slice(resolverStart, resolverEnd);

    expect(modeResolverStart).toBeGreaterThanOrEqual(0);
    expect(modeResolverEnd).toBeGreaterThan(modeResolverStart);
    expect(resolverStart).toBeGreaterThanOrEqual(0);
    expect(resolverEnd).toBeGreaterThan(resolverStart);
    expect(modeResolverSource).toContain('return isGameMenuOpen() ? "minimal" : "auto";');
    expect(modeResolverSource).not.toContain("isTrailerModeActive");
    expect(modeResolverSource).not.toContain("localStorage");
    expect(resolverSource).toContain("return getCinematicPerformanceMode();");
    expect(resolverSource).not.toContain('"auto"');
    expect(uiSource).toContain("return getCinematicRendererPerformanceMode();");
    expect(uiSource).toContain("const gameMenuBackgroundAiTurnsEnabled = false;");
  });

  it("offers AI showcase matches as alternatives in the New Game mode selector", () => {
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const newGameOptionsStart = uiSource.indexOf("  function appendGameMenuNewGameOptions(");
    const newGameOptionsEnd = uiSource.indexOf(
      "  function appendGameMenuOptions(",
      newGameOptionsStart
    );
    const configuredGameStart = uiSource.indexOf("  function startConfiguredGameFromMenu()");
    const configuredGameEnd = uiSource.indexOf(
      "  function resetNewGameWithAutomaticProceduralMap(",
      configuredGameStart
    );
    const newGameOptionsSource = uiSource.slice(newGameOptionsStart, newGameOptionsEnd);
    const configuredGameSource = uiSource.slice(configuredGameStart, configuredGameEnd);

    expect(newGameOptionsStart).toBeGreaterThanOrEqual(0);
    expect(newGameOptionsEnd).toBeGreaterThan(newGameOptionsStart);
    expect(configuredGameStart).toBeGreaterThanOrEqual(0);
    expect(configuredGameEnd).toBeGreaterThan(configuredGameStart);
    expect(uiSource).toContain(
      'type GameMenuNewGameMode = "2-factions" | "3-factions" | "ai-vs-ai" | "ai-vs-ai-vs-ai";'
    );
    expect(newGameOptionsSource).toContain("gameMenuNewGameMode = getNextGameMenuNewGameMode();");
    expect(newGameOptionsSource).toContain("getGameMenuModeLabel()");
    expect(newGameOptionsSource).toContain(
      "timerAction.disabled = isTrailerModeActive || isGameMenuNewGameAiMode();"
    );
    expect(newGameOptionsSource.match(/createGameMenuAction\(/g)).toHaveLength(3);
    expect(uiSource).toContain('return "2 FACTIONS";');
    expect(uiSource).toContain('return "3 FACTIONS";');
    expect(uiSource).toContain('return gameMenuNewGameMode === "ai-vs-ai" ? "AI VS AI"');
    expect(configuredGameSource).toContain("const mode = getGameMenuGameModeId();");
    expect(configuredGameSource).toContain("const isAiShowcaseMode = isGameMenuNewGameAiMode();");
    expect(configuredGameSource).toContain("if (isAiShowcaseMode) {");
    expect(configuredGameSource).toContain("enableTrailerPresentationMode();");
    expect(uiSource).toContain('const trailerModePlanningTimerLabel = "9:99";');
    expect(uiSource).toContain("if (isTrailerModeActive || isGameMenuNewGameAiMode())");
  });

  it("toggles a non-destructive in-game menu with Escape", () => {
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const openMenuStart = uiSource.indexOf("  function openInGameMenu(): void {");
    const resumeStart = uiSource.indexOf("  function resumeGameFromMenu(): void {", openMenuStart);
    const hideConsoleStart = uiSource.indexOf(
      "  function hideCommandConsoleForGameMenuLaunch(): void {",
      resumeStart
    );
    const renderMenuStart = uiSource.indexOf("  function renderGameMenu(): void {");
    const renderMenuEnd = uiSource.indexOf(
      "  function syncGameMenuMainActionSelection(): void {",
      renderMenuStart
    );
    const keydownStart = uiSource.indexOf('  window.addEventListener("keydown", (event) => {');
    const keydownEnd = uiSource.indexOf(
      '  window.addEventListener("beforeunload", () => {',
      keydownStart
    );
    const openMenuSource = uiSource.slice(openMenuStart, resumeStart);
    const resumeSource = uiSource.slice(resumeStart, hideConsoleStart);
    const renderMenuSource = uiSource.slice(renderMenuStart, renderMenuEnd);
    const keydownSource = uiSource.slice(keydownStart, keydownEnd);

    expect(openMenuStart).toBeGreaterThanOrEqual(0);
    expect(resumeStart).toBeGreaterThan(openMenuStart);
    expect(hideConsoleStart).toBeGreaterThan(resumeStart);
    expect(renderMenuStart).toBeGreaterThanOrEqual(0);
    expect(renderMenuEnd).toBeGreaterThan(renderMenuStart);
    expect(keydownStart).toBeGreaterThanOrEqual(0);
    expect(keydownEnd).toBeGreaterThan(keydownStart);
    expect(openMenuSource).toContain("isInGameMenuActive = true;");
    expect(openMenuSource).toContain("pausePlanningTimerForGameMenu();");
    expect(resumeSource).toContain("resumePlanningTimerAfterGameMenu();");
    expect(uiSource).toContain("const shouldRemainPausedForGameMenu = isInGameMenuActive;");
    expect(uiSource).toContain(
      "planningTimerPausedAtMs = shouldRemainPausedForGameMenu ? performance.now() : null;"
    );
    expect(openMenuSource).toContain("renderGameMenu();");
    expect(openMenuSource).not.toContain("resetRuntimeAfterGameReset");
    expect(openMenuSource).not.toContain("replaceChildren");
    expect(resumeSource).toContain("isInGameMenuActive = false;");
    expect(resumeSource).toContain("updateCommandConsole();");
    expect(resumeSource).not.toContain("resetRuntimeAfterGameReset");
    expect(resumeSource).not.toContain("replaceChildren");
    expect(renderMenuSource).not.toContain('"RESUME"');
    expect(renderMenuSource).toContain('commandConsole.classList.toggle("is-hidden", isMenuOpen);');
    expect(uiSource).toContain("if (generation !== gameMenuTypingGeneration || !isGameMenuOpen())");
    expect(keydownSource).toContain("if (isInGameMenuActive) {");
    expect(keydownSource).toContain("resumeGameFromMenu();");
    expect(keydownSource).toContain("openInGameMenu();");
    expect(keydownSource).not.toContain('type: "CANCEL_PENDING_BURN_ORDER"');
    expect(keydownSource).not.toContain('type: "CANCEL_PENDING_FIRE_ORDER"');
  });

  it("keeps title-screen hover explanations concise and left of the menu log column", () => {
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const glossaryControllerSource = readFileSync(
      join(process.cwd(), "src/ui/gameGlossaryController.ts"),
      "utf8"
    );
    const styleSource = readFileSync(join(process.cwd(), "src/styles.css"), "utf8");
    const bindHoverStart = glossaryControllerSource.indexOf(
      "  const bindHoverRoot = (root: HTMLElement, options: GlossaryHoverRootOptions = {}): void => {"
    );
    const bindHoverEnd = glossaryControllerSource.indexOf(
      "  function handlePointerOver",
      bindHoverStart
    );
    const bindHoverSource = glossaryControllerSource.slice(bindHoverStart, bindHoverEnd);

    expect(glossaryControllerSource).toContain("export const gameMenuGlossaryHoverDwellMs = 240;");
    expect(uiSource).toContain("commandGlossaryController.bindHoverRoot(gameMenu, {");
    expect(uiSource).toContain("dwellMs: gameMenuGlossaryHoverDwellMs");
    expect(uiSource).toContain('applyGameMenuHoverCopy(title, "DELTAV", "ORBITAL STRATEGY");');
    expect(uiSource).toContain(
      'tooltip: "Begin the guided introduction to movement, production and combat."'
    );
    expect(uiSource).toContain(
      'tooltip: "Open match configuration for factions and planning time."'
    );
    expect(uiSource).toContain(
      'tooltip: "Open audio, display and trajectory presentation settings."'
    );
    expect(uiSource).toContain('tooltip: "Open the command used to close this window."');
    expect(uiSource).toContain(
      'applyGameMenuHoverCopy(control, "BRIGHTNESS", "Set the global display brightness.");'
    );
    expect(bindHoverSource).toContain('root.addEventListener("pointerover"');
    expect(bindHoverSource).toContain('root.addEventListener("focusin"');
    expect(bindHoverSource).not.toContain('root.addEventListener("click"');
    expect(styleSource).toContain(".game-menu__title:hover,\n.game-menu__title:focus-visible");
    expect(styleSource).toContain(
      "var(--command-rail-right) + var(--command-rail-width) + var(--command-rail-gap)"
    );
    expect(styleSource).toContain("--game-menu-column-gap: var(--command-rail-gap)");
  });

  it("keeps the Logbook prompt in the log and opens tooltips only from actual hover", () => {
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const glossaryControllerSource = readFileSync(
      join(process.cwd(), "src/ui/gameGlossaryController.ts"),
      "utf8"
    );

    expect(uiSource).toContain(
      'commandGlossaryController.getTutorialLogbookIntroductionStep() === "open-prompt"'
    );
    expect(uiSource).toContain("freezeCompletedTutorialLogbookOpenPrompt();");
    expect(uiSource).not.toContain("pendingTutorialGlossaryHandoffPoint");
    expect(uiSource).not.toContain("commandGlossaryController.beginHoverHandoff({");
    expect(glossaryControllerSource).not.toContain("tutorialLogbookHoverInstruction");
    expect(glossaryControllerSource).not.toContain("hoverText.classList.toggle(");
  });

  it("keeps audio controls in the Options submenu", () => {
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const styleSource = readFileSync(join(process.cwd(), "src/styles.css"), "utf8");
    const mainActionsStart = uiSource.indexOf(
      '      const mainActions = document.createElement("div");'
    );
    const mainActionsEnd = uiSource.indexOf(
      "      mainColumn.append(title, mainActions);",
      mainActionsStart
    );
    const optionsStart = uiSource.indexOf("  function appendGameMenuOptions(");
    const optionsEnd = uiSource.indexOf("  function toggleGameMenuMusic(", optionsStart);
    const mainActionsSource = uiSource.slice(mainActionsStart, mainActionsEnd);
    const optionsSource = uiSource.slice(optionsStart, optionsEnd);

    expect(mainActionsStart).toBeGreaterThanOrEqual(0);
    expect(mainActionsEnd).toBeGreaterThan(mainActionsStart);
    expect(optionsStart).toBeGreaterThanOrEqual(0);
    expect(optionsEnd).toBeGreaterThan(optionsStart);
    expect(mainActionsSource).not.toContain("getGameMenuMusicLabel()");
    expect(mainActionsSource).not.toContain("getGameMenuSfxLabel()");
    expect(optionsSource).toContain("getGameMenuMusicLabel()");
    expect(optionsSource).toContain("getGameMenuSfxLabel()");
    expect(optionsSource).toContain("getGameMenuReflectionsLabel()");
    expect(optionsSource).toContain("getGameMenuAccentsLabel()");
    expect(optionsSource).toContain("setGameMenuAccentsMode(nextAccentsMode);");
    expect(optionsSource).toContain("getGameMenuFullscreenLabel()");
    expect(optionsSource).toContain("toggleGameMenuFullscreen(action)");
    expect(optionsSource).toContain('"DEBUG"');
    expect(optionsSource).toContain("openDebugDrawerFromGameMenu");
    expect(optionsSource).not.toContain("getGameMenuPerformanceLabel()");
    expect(optionsSource).not.toContain("performanceAction");
    expect(optionsSource).toContain(
      "actions.append(\n" +
        "      musicAction,\n" +
        "      sfxAction,\n" +
        "      bloomAction,\n" +
        "      reflectionsAction,\n" +
        "      accentsAction,\n" +
        "      fullscreenAction,\n" +
        "      brightnessControl,\n" +
        "      debugAction\n" +
        "    );"
    );
    expect(optionsSource).toContain("createGameMenuBrightnessControl(typingTargets)");
    expect(optionsSource).toContain(
      'reflectionsAction.classList.add("game-menu__action--nowrap");'
    );
    expect(uiSource).toContain('modeAction.classList.add("game-menu__action--nowrap");');
    expect(uiSource).toContain('const displayBrightnessStorageKey = "deltav.displayBrightness.v1"');
    expect(uiSource).toContain(
      'canvasFrame.style.setProperty("--display-brightness", String(value))'
    );
    expect(uiSource).toContain('type GameMenuAccentsMode = "on" | "burn" | "fire" | "off";');
    expect(uiSource).toContain("return `ACCENTS ${getGameMenuAccentsMode().toUpperCase()}`;");
    expect(uiSource).toContain(
      "if (!debugToggleButton.isConnected || !header.isConnected) {\n" +
        "      canvasFrame.append(debugToggleButton, header);\n" +
        "    }"
    );
    expect(styleSource).toContain("filter: brightness(var(--display-brightness));");
    expect(styleSource).toContain(".game-menu__brightness-slider");
    expect(styleSource).toContain(
      "  --game-menu-tone-bright: #eef1e3;\n" +
        "  --game-menu-tone-regular: #e1e6d5;\n" +
        "  --game-menu-tone-soft: #d1dac3;\n" +
        "  --game-menu-tone-dim: #bbc7ad;"
    );
    expect(styleSource).toContain(
      '.game-menu__submenu-actions[data-screen="options"] {\n' +
        "  --game-menu-tone-bright: #eef1e3;\n" +
        "  --game-menu-tone-regular: #e2e6d4;\n" +
        "  --game-menu-tone-soft: #d1d8c1;\n" +
        "  --game-menu-tone-dim: #bbc4ac;\n" +
        "  top: calc(100% - 4px - 2.72em);"
    );
    expect(styleSource).toContain(
      '.game-menu__submenu-actions[data-screen="quit"] {\n' +
        "  --game-menu-tone-bright: #efefe2;\n" +
        "  --game-menu-tone-regular: #e3e2d2;\n" +
        "  --game-menu-tone-soft: #d2d1c0;\n" +
        "  --game-menu-tone-dim: #bdbdab;\n" +
        "  top: calc(100% - 4px - 1.36em);"
    );
    expect(uiSource).toContain('"CLOSE WINDOW"');
    expect(styleSource).toMatch(/\.game-menu__title \{[^}]*white-space: nowrap;/s);
    expect(styleSource).toMatch(/\.game-menu__action \{[^}]*white-space: nowrap;/s);
    expect(uiSource).toContain(
      'return storedMode === "on" || storedMode === "off" ? storedMode : "hover";'
    );
    expect(styleSource).toContain(".game-menu__action--nowrap {\n  white-space: nowrap;\n}");
    expect(uiSource).toContain(
      "cinematicRenderer.setTrajectoryReflectionMode(trajectoryReflectionMode);"
    );
  });

  it("skips tutorial turns through a mandatory launch until the ship reaches its destination", () => {
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const autoAdvanceStart = uiSource.indexOf(
      "  async function autoAdvanceTutorialMandatoryLaunchToDestination()"
    );
    const autoAdvanceEnd = uiSource.indexOf(
      "  async function continueTutorialAfterMandatoryLaunchArrival(",
      autoAdvanceStart
    );
    const autoAdvanceSource = uiSource.slice(autoAdvanceStart, autoAdvanceEnd);

    expect(autoAdvanceStart).toBeGreaterThanOrEqual(0);
    expect(autoAdvanceEnd).toBeGreaterThan(autoAdvanceStart);
    expect(autoAdvanceSource).toContain("await startTutorialPostMandatoryLaunchEvadeSequence();");
    expect(autoAdvanceSource).not.toContain('await resolveCurrentTurn("planning-all-locked");');
    expect(uiSource).toContain("void autoAdvanceTutorialMandatoryLaunchToDestination();");
  });

  it("does not let redraw cancel an active cinematic turn transition", () => {
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const redrawStart = uiSource.indexOf("  function redraw(): void {");
    const tacticalBranchStart = uiSource.indexOf("    if (tacticalCanvas.width <= 0", redrawStart);
    const redrawSource = uiSource.slice(redrawStart, tacticalBranchStart);

    expect(redrawStart).toBeGreaterThanOrEqual(0);
    expect(tacticalBranchStart).toBeGreaterThan(redrawStart);
    expect(redrawSource).toContain('if (currentView === "cinematic3d")');
    expect(redrawSource.indexOf("if (isTurnTransitionActive)")).toBeLessThan(
      redrawSource.indexOf("cinematicRenderer?.setSnapshot(snapshot);")
    );
    expect(redrawSource).toContain("return;");
  });

  it("keeps command log clicks from changing camera zoom", () => {
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const focusLineStart = uiSource.indexOf(
      "  function focusCommandScrollbackLineTarget(line: HTMLElement | null)"
    );
    const hoverStart = uiSource.indexOf("  function handleCommandTranscriptHover", focusLineStart);
    const focusLineSource = uiSource.slice(focusLineStart, hoverStart);
    const focusWithoutZoomStart = uiSource.indexOf(
      "  function focusTargetWithoutZoom(\n    target: string,"
    );
    const resetStart = uiSource.indexOf(
      "  function handleTutorialInputGesture",
      focusWithoutZoomStart
    );
    const focusWithoutZoomSource = uiSource.slice(focusWithoutZoomStart, resetStart);

    expect(focusLineStart).toBeGreaterThanOrEqual(0);
    expect(hoverStart).toBeGreaterThan(focusLineStart);
    expect(focusLineSource).toContain(
      "focusTargetWithoutZoom(warningNodeTargetKey, { tutorialPan: true });"
    );
    expect(focusLineSource).toContain("focusFirstAvailableTargetWithoutZoom(targetKeys)");
    expect(focusLineSource).not.toContain("focusTarget(warningNodeTargetKey)");
    expect(focusWithoutZoomStart).toBeGreaterThanOrEqual(0);
    expect(resetStart).toBeGreaterThan(focusWithoutZoomStart);
    expect(focusWithoutZoomSource).toContain("cinematicRenderer?.focusTargetWithoutZoom(target)");
    expect(focusWithoutZoomSource).toContain("center: focused");
    expect(focusWithoutZoomSource).not.toContain("zoom: Math.max");
  });

  it("pans to an orbit before targeted rewind and leaves turn headers camera-free", () => {
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const animateStart = uiSource.indexOf(
      "  async function animateCommandLogTimeReviewToPosition("
    );
    const playbackStart = uiSource.indexOf(
      "  async function playCommandLogReviewForwardToPosition(",
      animateStart
    );
    const animateSource = uiSource.slice(animateStart, playbackStart);
    const renderStart = uiSource.indexOf("  function renderCommandLogReviewPosition(");
    const cancelStart = uiSource.indexOf(
      "  function cancelCommandLogTimeReviewAnimation(",
      renderStart
    );
    const renderSource = uiSource.slice(renderStart, cancelStart);

    expect(animateStart).toBeGreaterThanOrEqual(0);
    expect(playbackStart).toBeGreaterThan(animateStart);
    expect(animateSource).toContain(
      "if (!preserveCurrentCameraAndFocus && focusTargetKeys.length === 0)"
    );
    expect(animateSource).toContain("cinematicRenderer?.freezeTimelineReviewCamera()");
    expect(animateSource).toContain("syncLogReviewStaticFocusTargetKeys(focusTargetKeys)");
    expect(animateSource).toContain("await waitForCommandLogReplayFocusBeforePlayback()");
    expect(animateSource).toContain("reviewState.followTrackedFocus = false");
    expect(animateSource).toContain("getAcceleratedTimelineReviewDurationMs(");
    expect(animateSource).toContain("sampleAcceleratedTimelineReviewPosition(");
    expect(
      animateSource.indexOf("await waitForCommandLogReplayFocusBeforePlayback()")
    ).toBeLessThan(animateSource.indexOf("const clampedTarget"));
    expect(uiSource).toContain("function isCommandLogTurnHeaderLine(");
    expect(uiSource).toContain("{ preserveCurrentCameraAndFocus }");
    expect(uiSource).toContain(
      'const orbitTargetKeys = targetKeys.filter((targetKey) => targetKey.startsWith("node:"))'
    );
    expect(renderSource).toContain(
      "followTrackedFocus: commandLogTimeReviewState?.followTrackedFocus === true"
    );
  });

  it("keeps tutorial command log scrolling active while rewind is disabled", () => {
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const wheelStart = uiSource.indexOf(
      "  function handleCommandLiveRowsWheel(event: WheelEvent): void {"
    );
    const listenersStart = uiSource.indexOf(
      '  commandTranscript.addEventListener("pointerover", handleCommandTranscriptHover);',
      wheelStart
    );
    const wheelSource = uiSource.slice(wheelStart, listenersStart);

    expect(wheelStart).toBeGreaterThanOrEqual(0);
    expect(listenersStart).toBeGreaterThan(wheelStart);
    expect(wheelSource).not.toContain("isTutorialCommandLogLocked()");
    expect(wheelSource).toContain("normalizeCommandLogWheelDelta(");
    expect(wheelSource).toContain("commandTranscript.scrollTop = clampNumber(");
    expect(wheelSource).toContain("event.preventDefault();");
    expect(wheelSource).toContain("event.stopPropagation();");
    expect(uiSource).toContain(
      'commandTranscript.addEventListener("wheel", handleCommandLiveRowsWheel, { passive: false })'
    );
    expect(uiSource).toContain(
      'commandLive.addEventListener("wheel", handleCommandLiveRowsWheel, { passive: false })'
    );
    expect(uiSource).toContain("function syncTutorialCommandLogPinnedRow(");
    expect(uiSource).toContain("commandPinnedLiveRow.append(pinnedLine)");
    expect(uiSource).toContain("commandLive.prepend(commandPinnedLiveRow)");
    expect(uiSource).toContain(
      'line.classList.contains("command-console__line--tutorial-live-hint")'
    );
  });

  it("suspends command-log tail following while the player scrolls through history", () => {
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const scrollStart = uiSource.indexOf("  function scrollCommandTranscriptToEnd(): void {");
    const lineAppendStart = uiSource.indexOf("  function appendCommandConsoleLine(", scrollStart);
    const scrollSource = uiSource.slice(scrollStart, lineAppendStart);
    const wheelStart = uiSource.indexOf(
      "  function handleCommandLiveRowsWheel(event: WheelEvent): void {"
    );
    const listenersStart = uiSource.indexOf(
      '  commandTranscript.addEventListener("pointerover", handleCommandTranscriptHover);',
      wheelStart
    );
    const wheelSource = uiSource.slice(wheelStart, listenersStart);

    expect(uiSource).toContain("let commandTranscriptFollowsTail = true");
    expect(uiSource).toContain("const commandTranscriptTailTolerancePixels = 2");
    expect(scrollSource).toContain("if (!commandTranscriptFollowsTail) {");
    expect(scrollSource).toContain("function snapCommandTranscriptToLiveTail(): void");
    expect(scrollSource).toContain("commandTranscriptFollowsTail = true;");
    expect(scrollSource).toContain("snapCommandTranscriptTailWithoutClippedLine();");
    expect(scrollSource).toContain('"--command-console-tail-snap-padding"');
    expect(scrollSource).toContain('querySelectorAll<HTMLElement>(".command-console__line")');
    expect(scrollSource).toContain("function isCommandTranscriptAtEnd(): boolean");
    expect(wheelSource).toContain("commandTranscriptFollowsTail = isCommandTranscriptAtEnd();");
    expect(
      uiSource.match(/snapCommandTranscriptToLiveTail\(\);/g)?.length ?? 0
    ).toBeGreaterThanOrEqual(7);
    expect(uiSource).toContain(
      'if (source === "manual") {\n      snapCommandTranscriptToLiveTail();'
    );
    expect(uiSource).toContain(
      "commandTranscriptFollowsTail = true;\n    commandTranscript.innerHTML ="
    );
  });

  it("provides paced 1/2/3 command-log transport and an exact first-turn scroll stop", () => {
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const styles = readFileSync(join(process.cwd(), "src/styles.css"), "utf8");
    const hotkeyStart = uiSource.indexOf(
      "  function handleCommandLogTransportHotkey(event: KeyboardEvent): boolean {"
    );
    const clampStart = uiSource.indexOf("  function clampCommandLogReviewPosition", hotkeyStart);
    const hotkeySource = uiSource.slice(hotkeyStart, clampStart);

    expect(hotkeyStart).toBeGreaterThanOrEqual(0);
    expect(clampStart).toBeGreaterThan(hotkeyStart);
    expect(hotkeySource).toContain("isTrailerCaptureActive ||");
    expect(hotkeySource).not.toContain("isTrailerModeActive ||");
    expect(hotkeySource).toContain('key !== "1" && key !== "2" && key !== "3"');
    expect(hotkeySource).toContain('playFixedCommandLogTimeReviewToPosition(0, "REWIND")');
    expect(hotkeySource).toContain("pauseCommandLogTimeReview()");
    expect(hotkeySource).toContain(
      'playFixedCommandLogTimeReviewToPosition(replayTape.transitions.length, "REPLAY")'
    );
    expect(uiSource).toContain("sampleFixedTimelineReviewPosition(");
    expect(uiSource).toContain("normalizeCommandLogWheelDelta(");
    expect(uiSource).toContain('commandTranscript.classList.add("has-scrollback")');
    expect(styles).toContain(".command-console__transcript.has-scrollback::before");
    expect(styles).toContain("max-height: 0;");
    expect(uiSource).toContain("getReplayEntryVisualProgress");
    expect(uiSource).not.toContain("beginTrailerReplayLogRewrite");
    expect(uiSource).not.toContain("syncTrailerReplayCommandLog");
    expect(styles).not.toContain(".is-trailer-replay-future");
    expect(styles).not.toContain("@keyframes command-trailer-replay-reveal");
  });

  it("coalesces timeline previews into the renderer frame and caches replay-only work", () => {
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const rendererSource = readFileSync(
      join(process.cwd(), "src/renderers/cinematic3d/index.ts"),
      "utf8"
    );
    const previewStart = rendererSource.indexOf("  previewReplayTransition(");
    const cameraStart = rendererSource.indexOf("  captureCameraState()", previewStart);
    const previewSource = rendererSource.slice(previewStart, cameraStart);
    const reviewPositionStart = uiSource.indexOf("  function setCommandLogReviewPosition(");
    const reviewPositionEnd = uiSource.indexOf(
      "  function syncLogReviewStaticFocusTargetKeys(",
      reviewPositionStart
    );
    const reviewPositionSource = uiSource.slice(reviewPositionStart, reviewPositionEnd);
    const playingEventStart = uiSource.indexOf("  function setCommandScrollbackPlayingEvent(");
    const redrawStart = uiSource.indexOf("  function redraw()", playingEventStart);
    const playingEventSource = uiSource.slice(playingEventStart, redrawStart);

    expect(previewStart).toBeGreaterThanOrEqual(0);
    expect(cameraStart).toBeGreaterThan(previewStart);
    expect(rendererSource).toContain("deferRender?: boolean");
    expect(previewSource).toContain("if (options.deferRender === true)");
    expect(previewSource).toContain("this.pendingReplayPreview = {");
    expect(previewSource).toContain(
      "this.applyReplayTransitionPreview(from, to, progress, options)"
    );
    expect(rendererSource).toContain("this.applyPendingReplayTransitionPreview()");
    expect(uiSource.match(/deferRender: true/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(rendererSource).toContain("this.getReplayDestructionTimeline(transitions)");
    expect(rendererSource).toContain("this.replayDestructionTimelineTransitions !== transitions");
    expect(reviewPositionStart).toBeGreaterThanOrEqual(0);
    expect(reviewPositionEnd).toBeGreaterThan(reviewPositionStart);
    expect(reviewPositionSource).not.toContain("renderCommandTranscriptFromTimeline");
    expect(reviewPositionSource).not.toContain("scrollCommandTranscriptToEnd");
    expect(reviewPositionSource).not.toContain("commandTranscript.scrollTop");
    expect(uiSource).not.toContain("trailerReplayLogLineCache");
    expect(uiSource).not.toContain("handleTrailerReplayLogRevealAnimationEnd");
    expect(playingEventSource).toContain("commandScrollbackPlayingEventId === eventId");
    expect(rendererSource).toContain("Math.floor(snapshot.turn + 0.0001)");
    expect(rendererSource).toContain(
      "const transition = this.turnTransition ?? this.replayPreviewContext"
    );
    expect(uiSource).toContain("function getCinematicPerformanceMode(): CinematicPerformanceMode");
    expect(uiSource).toContain('return "auto";');
    expect(rendererSource).toContain("const performanceFrameBudgetReducedMs = 8.55");
    expect(rendererSource).toContain("const performanceFrameBudgetMinimalMs = 8.9");
    expect(rendererSource).toContain("const performanceReplayFrameBudgetMinimalMs = 8.75");
    expect(rendererSource).toContain("const performanceFrameSpikeMinimalMs = 12.5");
    expect(rendererSource).toContain("const performanceRecoveryFrameMs = 8.45");
    expect(rendererSource).not.toContain("detailedBodyAnimationReducedUpdateSeconds");
    expect(rendererSource).not.toContain("detailedBodyAnimationMinimalUpdateSeconds");
    expect(rendererSource).toContain(
      'if (shouldUpdateDetailedBodyAnimation) {\n        setShaderUniformNumber(bodyObject.mesh.material, "time", elapsed);'
    );
    expect(rendererSource).not.toContain("labelPresentationMinimalUpdateSeconds");
    expect(rendererSource).not.toContain("tacticalPresentationUpdatePhase");
    expect(rendererSource).toContain("private scheduleTacticalPresentationUpdate(elapsed: number)");
    expect(rendererSource).not.toContain("tacticalPresentationDeferredFireUpdate");
    expect(rendererSource).toContain("tacticalPresentationReducedZoomUpdateSeconds");
    expect(rendererSource).toContain("tacticalPresentationMinimalZoomUpdateSeconds");
    expect(rendererSource).toContain(
      "this.isTimelinePreviewActive && this.replayPresentationEffectsEnabled"
    );
    expect(rendererSource).not.toContain("fullImpactChronology.slice(0, 1)");
    expect(rendererSource).not.toContain("minimalActiveMissileTrajectoryLimit");
    expect(rendererSource).toContain("private readonly pendingFireResolvedTrajectories");
    expect(rendererSource).toContain("this.pendingFireResolvedTrajectories.get(impact.id) ??");
    expect(uiSource).toContain(
      "cinematicRenderer.setSnapshot(reviewState.liveSnapshot, { deferRender: true })"
    );
    expect(uiSource).toContain(
      "cinematicRenderer.restoreCameraState(cameraStateToRestore, { deferRender: true })"
    );
  });

  it("keeps replay trajectory anchors on the requested historical orbital turn", () => {
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const snapshotAtTurnStart = uiSource.indexOf("      getSnapshotAtTurn(turn: number) {");
    const burnRequestStart = uiSource.indexOf(
      "      onBurnOrderRequested(originNodeId: string, destinationNodeId: string) {",
      snapshotAtTurnStart
    );
    const snapshotAtTurnSource = uiSource.slice(snapshotAtTurnStart, burnRequestStart);

    expect(snapshotAtTurnStart).toBeGreaterThanOrEqual(0);
    expect(burnRequestStart).toBeGreaterThan(snapshotAtTurnStart);
    expect(snapshotAtTurnSource).toContain("return createSolarSystemSnapshot(content, {");
    expect(snapshotAtTurnSource).toContain("...state,\n          turn");
    expect(snapshotAtTurnSource).not.toContain("return snapshot;");
    expect(snapshotAtTurnSource).not.toContain("if (isReplayMode)");
  });

  it("keeps the focused object tracked through fixed rewind, pause, and replay", () => {
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const focusKeysStart = uiSource.indexOf("  function getTimelineReviewCameraFocusTargetKeys(");
    const replayStart = uiSource.indexOf(
      "  async function playReplay(): Promise<void>",
      focusKeysStart
    );
    const focusKeysSource = uiSource.slice(focusKeysStart, replayStart);
    const ensureStart = uiSource.indexOf("  function ensureCommandLogTimeReviewState()");
    const animateStart = uiSource.indexOf(
      "  async function animateCommandLogTimeReviewToPosition(",
      ensureStart
    );
    const ensureSource = uiSource.slice(ensureStart, animateStart);
    const fixedStart = uiSource.indexOf("  function playFixedCommandLogTimeReviewToPosition(");
    const pauseStart = uiSource.indexOf("  function pauseCommandLogTimeReview()", fixedStart);
    const fixedSource = uiSource.slice(fixedStart, pauseStart);
    const forwardStart = uiSource.indexOf(
      "  async function playCommandLogReviewForwardToPosition(",
      pauseStart
    );
    const pauseSource = uiSource.slice(pauseStart, forwardStart);
    const restoreStart = uiSource.indexOf("  function restoreCommandLogTimeReviewToLive(");
    const restoreEnd = uiSource.indexOf(
      "  function setCommandLogReviewPromptDimmed(",
      restoreStart
    );
    const restoreSource = uiSource.slice(restoreStart, restoreEnd);

    expect(focusKeysStart).toBeGreaterThanOrEqual(0);
    expect(focusKeysSource).toContain(
      "cameraState.trackedFocusTargetKey ?? cameraState.focusedTargetKey"
    );
    expect(ensureSource).toContain("focusTargetKeys: liveCameraFocusTargetKeys");
    expect(ensureSource).toContain("followTrackedFocus: liveCameraFocusTargetKeys.length > 0");
    expect(ensureSource).toContain("cinematicRenderer.restoreCameraState(capturedLiveCameraState)");
    expect(fixedSource).not.toContain("reviewState.focusTargetKeys = []");
    expect(fixedSource).toContain(
      "syncLogReviewStaticFocusTargetKeys(reviewState.focusTargetKeys)"
    );
    expect(fixedSource).toContain("preserveCurrentFocusTracking:");
    expect(pauseSource).toContain(
      "syncLogReviewStaticFocusTargetKeys(reviewState.focusTargetKeys)"
    );
    expect(restoreSource).toContain("options.preserveCurrentFocusTracking === true");
    expect(uiSource).toContain(
      "followTrackedFocus: commandLogTimeReviewState?.followTrackedFocus === true"
    );
  });

  it("lets replay focus follow moving targets and reversibly hand them to endpoint orbits", () => {
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const rendererSource = readFileSync(
      join(process.cwd(), "src/renderers/cinematic3d/index.ts"),
      "utf8"
    );
    const replayFocusStart = rendererSource.indexOf("  private applyReplayTimelineFocus(");
    const replayFocusEnd = rendererSource.indexOf(
      "  private getActiveMovingTargetPosition(",
      replayFocusStart
    );
    const replayFocusSource = rendererSource.slice(replayFocusStart, replayFocusEnd);

    expect(uiSource).toContain("onUserFocusChange(targetKey: string)");
    expect(uiSource).toContain("setUserReplayFocusTarget(targetKey)");
    expect(uiSource).toContain("reviewState.focusTargetKeys = [targetKey]");
    expect(uiSource).toContain("reviewState.followTrackedFocus = true");
    expect(uiSource).toContain(
      "commandLogTimeReviewState?.followTrackedFocus === true\n              ? commandLogTimeReviewState.focusTargetKeys"
    );
    expect(rendererSource).toContain("private applyReplayTimelineFocus(");
    expect(rendererSource).toContain("this.getActiveMovingTargetPosition(targetKey)");
    expect(rendererSource).toContain("descriptor.originTargetKey");
    expect(rendererSource).toContain("descriptor.destinationTargetKey");
    expect(rendererSource).not.toContain("applyReplayMovingFocusFraming");
    expect(rendererSource).toContain("this.distance = this.getFocusTargetSafeCameraDistance(");
    expect(replayFocusStart).toBeGreaterThanOrEqual(0);
    expect(replayFocusEnd).toBeGreaterThan(replayFocusStart);
    expect(replayFocusSource).not.toContain("this.yaw =");
    expect(replayFocusSource).not.toContain("this.pitch =");
    expect(rendererSource).toContain("this.activeMissileTargetDirections.set(");
    expect(rendererSource).toContain("this.syncReplayTransientTimeline(");
    expect(rendererSource).toContain("this.syncReplayDestructionTimeline(");
  });

  it("reconstructs ship destruction and orbital wreckage in both replay directions", () => {
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const rendererSource = readFileSync(
      join(process.cwd(), "src/renderers/cinematic3d/index.ts"),
      "utf8"
    );
    const timelineSource = readFileSync(
      join(process.cwd(), "src/renderers/cinematic3d/replayDestructionTimeline.ts"),
      "utf8"
    );
    const interpolationSource = readFileSync(
      join(process.cwd(), "src/renderers/cinematic3d/orbitInterpolation.ts"),
      "utf8"
    );

    expect(uiSource).toContain("destructionTimeline: {");
    expect(uiSource).toContain(
      "cinematicRenderer.syncReplayDestructionTimeline(\n      replayTape.transitions,"
    );
    expect(rendererSource).toContain("syncReplayDestructionTimeline(");
    expect(rendererSource).toContain("timelineControlled: true");
    expect(rendererSource).toContain("presentation.timelineControlled ? age : elapsed");
    expect(rendererSource).toContain("impactTurn: missile.impactTurn");
    expect(rendererSource).toContain("{ impactTurn: destruction.impactTurn }");
    expect(rendererSource).toContain(
      'presentation.source === "missile-impact" && presentation.impactTurn !== undefined'
    );
    expect(rendererSource).toContain("presentation.targetOrbitAngle");
    expect(rendererSource).toContain(
      "this.getMissileTargetShipWorldPosition(\n          impactTarget,"
    );
    expect(rendererSource).toContain("nodeObject.group.worldToLocal(impactWorldPosition.clone())");
    expect(rendererSource).toContain("wreckageRoot.removeFromParent()");
    expect(timelineSource).toContain("createReplayShipDestructionTimeline");
    expect(timelineSource).toContain("impactTurn: missile?.impactTurn ?? transition.to.turn");
    expect(timelineSource).toContain("timelinePosition - destruction.impactTimelinePosition");
    expect(interpolationSource).toContain("progress < contestedUpkeepImpactVisualProgress");
    expect(interpolationSource).toContain("progress < missileImpactVisualProgress");
  });

  it("moves a missile-focused camera into a stable impact frame before detonation", () => {
    const rendererSource = readFileSync(
      join(process.cwd(), "src/renderers/cinematic3d/index.ts"),
      "utf8"
    );
    const cameraHelperSource = readFileSync(
      join(process.cwd(), "src/renderers/cinematic3d/missileImpactCamera.ts"),
      "utf8"
    );
    const prepareStart = rendererSource.indexOf(
      "  private prepareFocusedMissileImpactCameraAssist("
    );
    const prepareEnd = rendererSource.indexOf(
      "  private handoffFocusedMissileImpactSelection(",
      prepareStart
    );
    const prepareSource = rendererSource.slice(prepareStart, prepareEnd);

    expect(prepareStart).toBeGreaterThanOrEqual(0);
    expect(prepareEnd).toBeGreaterThan(prepareStart);
    expect(rendererSource).toContain("this.captureResolvingMissileTargetAngles(");
    expect(rendererSource).toContain("this.prepareFocusedMissileImpactCameraAssist(");
    expect(prepareSource).toContain("getMissileImpactCameraTravelDurationMs(");
    expect(prepareSource).toContain("getMissileImpactCameraDistance({");
    expect(prepareSource).toContain("allowDuringTurnTransition: true");
    expect(prepareSource).not.toContain("this.yaw =");
    expect(prepareSource).not.toContain("this.pitch =");
    expect(rendererSource).toContain("this.focusedMissileImpactCameraAssist === null");
    expect(rendererSource).toContain("this.handoffFocusedMissileImpactSelection(missile)");
    expect(rendererSource).not.toContain("cutCameraToFocusedMissileImpact");
    expect(cameraHelperSource).toContain("Math.max(options.currentDistance, requiredDistance)");
  });

  it("locks command log controls in tutorial until the CREW LOST replay cue", () => {
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const helperStart = uiSource.indexOf("  function isTutorialCommandLogLocked(): boolean {");
    const eventIdStart = uiSource.indexOf(
      "  function isTutorialFirstEnemyKillReplayEventId",
      helperStart
    );
    const helperSource = uiSource.slice(helperStart, eventIdStart);
    const reviewStart = uiSource.indexOf("  function isCommandLogTemporalReviewEnabled()");
    const reviewEnd = uiSource.indexOf("  function clampCommandLogReviewPosition", reviewStart);
    const reviewSource = uiSource.slice(reviewStart, reviewEnd);
    const pointerStart = uiSource.indexOf("  function handleCommandTranscriptPointerDown");
    const pointerEnd = uiSource.indexOf(
      "  function handleCommandTranscriptPointerMove",
      pointerStart
    );
    const pointerSource = uiSource.slice(pointerStart, pointerEnd);
    const clickStart = uiSource.indexOf("  function handleCommandLogClick");
    const keydownStart = uiSource.indexOf("  function handleCommandLogKeydown", clickStart);
    const clickSource = uiSource.slice(clickStart, keydownStart);
    const keydownEnd = uiSource.indexOf(
      "  function handleTutorialFirstEnemyKillReplayCueInput",
      keydownStart
    );
    const keydownSource = uiSource.slice(keydownStart, keydownEnd);

    expect(helperStart).toBeGreaterThanOrEqual(0);
    expect(eventIdStart).toBeGreaterThan(helperStart);
    expect(helperSource).toContain(
      "return tutorialState !== null && !isTutorialFirstEnemyKillReplayCueActive();"
    );
    expect(uiSource).not.toContain("commandLogTemporalReviewTemporarilyDisabled");
    expect(reviewSource).toContain("!isTutorialCommandLogLocked() &&");
    expect(reviewSource).toContain("replayTape.transitions.length > 0");
    expect(pointerSource).toContain("if (isTutorialCommandLogLocked()) {");
    expect(pointerSource).toContain("clearCommandLogScrubState();");
    expect(pointerSource).toContain("event.preventDefault();");
    expect(pointerSource).toContain("event.stopPropagation();");
    expect(pointerSource.indexOf("if (isTutorialCommandLogLocked()) {")).toBeLessThan(
      pointerSource.indexOf("commandLogScrubState = {")
    );
    expect(pointerSource).toContain("if (isTutorialFirstEnemyKillReplayCueActive()) {");
    expect(pointerSource.indexOf("if (isTutorialFirstEnemyKillReplayCueActive()) {")).toBeLessThan(
      pointerSource.indexOf("commandLogScrubState = {")
    );
    expect(clickSource).toContain("if (isTutorialCommandLogLocked()) {");
    expect(clickSource.indexOf("if (isTutorialCommandLogLocked()) {")).toBeLessThan(
      clickSource.indexOf("handleTutorialFirstEnemyKillReplayCueInput(line)")
    );
    expect(keydownSource).toContain("if (isTutorialCommandLogLocked()) {");
    expect(keydownSource).toContain('event.key === "Enter" || event.key === " "');
    expect(keydownSource.indexOf("if (isTutorialCommandLogLocked()) {")).toBeLessThan(
      keydownSource.indexOf("handleTutorialFirstEnemyKillReplayCueInput(line)")
    );
    expect(uiSource).toContain('if (line?.dataset["eventId"] !== cue.eventId) {');
    expect(uiSource).toContain(
      'line.classList.toggle("command-console__line--tutorial-replay-disabled", isDisabledByCue);'
    );
    expect(uiSource).toContain("line.tabIndex = isDisabledByCue ? -1 : 0;");
    expect(uiSource).toContain('line.setAttribute("aria-disabled", "true");');
    expect(uiSource).toContain('line.removeAttribute("aria-disabled");');
  });

  it("keeps replay playback presentation-only and camera-stable", () => {
    const rendererSource = readFileSync(
      join(process.cwd(), "src/renderers/cinematic3d/index.ts"),
      "utf8"
    );
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const postMatchReportSource = readFileSync(
      join(process.cwd(), "src/ui/postMatchReport.ts"),
      "utf8"
    );
    const playReplayStart = uiSource.indexOf("  async function playReplay()");
    const redrawStart = uiSource.indexOf("  function redraw(): void", playReplayStart);
    const playReplaySource = uiSource.slice(playReplayStart, redrawStart);
    const globalTimeReviewPointerStart = uiSource.indexOf(
      "  function handleGlobalTimeReviewPointerDown"
    );
    const commandLiveClickStart = uiSource.indexOf(
      "  function handleCommandLiveClick",
      globalTimeReviewPointerStart
    );
    const globalTimeReviewPointerSource = uiSource.slice(
      globalTimeReviewPointerStart,
      commandLiveClickStart
    );

    expect(uiSource).toContain("const replayTape: ReplayTape");
    expect(uiSource).toContain("recordReplayTransition(previousSnapshot, snapshot)");
    expect(uiSource).toContain("createReplayEntries(");
    expect(uiSource).toContain("createPostMatchReport(");
    expect(postMatchReportSource).toContain("detectAlphaStrikes(");
    expect(uiSource).toContain("hashReplayState(liveState)");
    expect(uiSource).toContain("validateReplayStateIntegrity");
    expect(uiSource).toContain("replayIndicator.classList.remove");
    expect(uiSource).toContain("playReplayFromCommandRow");
    expect(uiSource).toContain("rewindCommandLogToEvent");
    expect(uiSource).toContain("animateCommandLogTimeReviewToPosition");
    expect(uiSource).toContain("playCommandLogReviewForwardToPosition");
    expect(uiSource).toContain("CommandLogReviewPlaybackOptions");
    expect(uiSource).toContain("preserveCurrentFocus");
    expect(uiSource).toContain("options.preserveCurrentFocus !== true");
    expect(uiSource).toContain("setCommandLogReviewPromptDimmed(true)");
    expect(uiSource).toContain('executePrompt.classList.toggle("is-command-log-reviewing"');
    expect(uiSource).toContain("activeCommandRowKey");
    expect(uiSource).toContain("getCommandScrollbackLineReviewKey");
    expect(uiSource).toContain("commandLogTimeReviewState.activeCommandRowKey === commandRowKey");
    expect(uiSource).toContain(
      'options.preserveCurrentCameraAndFocus === true ? "accelerated" : "standard"'
    );
    expect(uiSource).toContain("playCommandLogReviewToLiveFromLine(line)");
    expect(uiSource).toContain("setCommandLogReviewPosition");
    expect(uiSource).toContain("handleCommandTranscriptPointerMove");
    expect(uiSource).toContain("getCommandScrollbackLineAtPoint");
    expect(uiSource).toContain("getCommandScrollbackLineFromPointer");
    expect(uiSource).toContain("handleGlobalTimeReviewPointerDown");
    expect(globalTimeReviewPointerSource).toContain("event.button !== 2");
    expect(globalTimeReviewPointerSource).toContain("event.preventDefault()");
    expect(globalTimeReviewPointerSource).toContain("skipCommandLogTimeReviewToLive");
    expect(globalTimeReviewPointerSource).toContain("isCommandLogInteractionTarget(event.target)");
    expect(uiSource).toContain(
      'window.addEventListener("contextmenu", handleCommandLogContextMenu)'
    );
    expect(uiSource).toContain("armCommandLogScrub");
    expect(uiSource).toContain("updateCommandLogScrubPosition");
    expect(uiSource).toContain("commandLogScrubLongPressMs = 115");
    expect(uiSource).toContain("commandLogScrubMoveThresholdPixels = 2");
    expect(uiSource).toContain("commandLogScrubPixelsPerTurn = 42");
    expect(uiSource).toContain("commandLogScrubLineHitSlopPixels = 6");
    expect(uiSource).toContain("scrubState.startPosition + deltaY / commandLogScrubPixelsPerTurn");
    expect(uiSource).toContain("reviewState.focusTargetKeys = []");
    expect(uiSource).not.toContain("startCommandLogAcceleratedScrub");
    expect(uiSource).not.toContain("computeCommandLogScrubAcceleration");
    expect(uiSource).not.toContain("commandLogScrubMaxTurnsPerSecond");
    expect(uiSource).toContain("handleCommandLiveClick");
    expect(uiSource).toContain("focusCommandScrollbackLineTarget");
    expect(uiSource).toContain("getCommandScrollbackLineFocusTargetKeys");
    expect(uiSource).toContain("getResolutionEventFocusTargetKeys");
    expect(uiSource).toContain("getReplayTransitionFocusTargetKeys");
    expect(uiSource).toContain("focusReplayCameraForTransition");
    expect(uiSource).toContain("focusFirstAvailableTargetWithoutZoom");
    expect(uiSource).toContain("preferCommandLogOrbitFocusTargetKeys");
    expect(uiSource).toContain("freezeTimelineReviewCamera");
    expect(uiSource).toContain("restoreCommandLogTimeReviewToLive");
    expect(rendererSource).toContain("transientTargetLastKnownPositions");
    expect(rendererSource).toContain(
      "this.transientTargetLastKnownPositions.get(targetKey)?.clone()"
    );
    expect(uiSource).toContain("commandLogTimeReviewState");
    expect(uiSource).toContain("const durationMs = getFixedTimelineReviewDurationMs(");
    expect(uiSource).toContain("getAcceleratedTimelineReviewDurationMs(");
    expect(uiSource).toContain("sampleAcceleratedTimelineReviewPosition(");
    expect(uiSource).toContain("commandLogTimeReviewDurations.replayTurnMs");
    expect(uiSource).toContain('const pacing = options.pacing ?? "standard"');
    expect(uiSource).toContain("replayTurnMs: fixedTimelineReviewReplayTurnDurationMs");
    expect(uiSource).toContain("getReplayTransitionIndexForResolutionEventId");
    expect(uiSource).toContain("getReplayPositionForResolutionEventId");
    expect(uiSource).toContain("getCommandLogEventIdNearReviewPosition");
    expect(uiSource).toContain("showTutorialFirstEnemyKillReplayFollowupHint(tutorial)");
    expect(uiSource).toContain("isTutorialFirstEnemyKillReplayCueInputPending");
    expect(uiSource).toContain("waitForCommandLogReplayFocusBeforePlayback");
    expect(uiSource).toContain("focusCommandScrollbackLineTarget(line)");
    expect(uiSource).toContain("rewindCommandLogToEvent(targetId, focusTargetKeys, commandRowKey)");
    expect(uiSource).toContain(
      "followTrackedFocus: commandLogTimeReviewState?.followTrackedFocus === true"
    );
    expect(uiSource).toContain("preserveCurrentFocus: true");
    expect(uiSource).toContain(
      "completeTutorialFirstEnemyKillReplayCue();\n        scrollCommandTranscriptToEnd();"
    );
    expect(uiSource).toContain(
      "showTutorialFirstEnemyKillReplayFollowupHint(tutorial);\n    updateInteractionLocks();"
    );
    expect(uiSource).toContain("tutorial:first-enemy-kill-replay-followup-hint");
    expect(uiSource).toContain("Left-click the blinking log line again to rewind to that event.");
    expect(uiSource).toContain("Left-click the same line once more to resume from the present.");
    expect(uiSource).toContain(
      "commandLogTimeReviewState !== null) {\n        freezeTutorialFirstEnemyKillReplayFollowupHints();"
    );
    expect(uiSource).toContain("const hintRowKeys = new Set([`${key}:rewind`, `${key}:replay`]);");
    expect(uiSource).toContain("const frozenRow = freezeTutorialLiveHintRow(row);");
    expect(uiSource).toContain("appendTutorialFirstEnemyKillPostReplayWarning(tutorial)");
    expect(uiSource).toContain("firstEnemyKillReplayWarningPending = true");
    expect(uiSource).toContain("tutorialPostVictoryActionLessonTurn = snapshot.turn;");
    expect(uiSource).toContain("tutorialPostVictoryActionLessonTurn + 1 === snapshot.turn");
    expect(uiSource).toContain("createTutorialPostVictoryAutomaticBehaviorRows");
    expect(uiSource).toContain("snapshot.turn > tutorialPostVictoryActionLessonTurn");
    expect(uiSource).toContain(
      "updateTutorialCommandConsoleWithTypewriter();\n    handOffTutorialToNormalMatch(tutorial);\n    updateInteractionLocks();"
    );
    expect(uiSource).toContain("handOffTutorialToNormalMatch(tutorial);");
    expect(uiSource).toContain("tutorialState = null;");
    expect(uiSource).not.toContain("completeTutorialGuidedSegment({ immediate: true });");
    expect(uiSource).toContain("createTutorialEnemyContactVictoryWarningRows()");
    expect(uiSource).toContain("requestedReplayStartTransitionIndex");
    expect(uiSource).toContain(".slice(firstTransitionIndex)");
    expect(uiSource).toContain("requestAnimationFrame(tick)");
    expect(uiSource).toContain("setCommandScrollbackPlayingEvent");
    expect(uiSource).toContain("captureCommandLogCueReturnCameraState()");
    expect(uiSource).toContain("detachCinematicCameraTracking");
    expect(uiSource).toContain("preserveCurrentCamera: true");
    expect(playReplayStart).toBeGreaterThanOrEqual(0);
    expect(redrawStart).toBeGreaterThan(playReplayStart);
    expect(playReplaySource).toContain("animateReplayTransition(transition.from, transition.to)");
    expect(playReplaySource).toContain("clearPresentationEffects()");
    expect(playReplaySource).toContain("focusReplayCameraForTransition(transition)");
    expect(playReplaySource).toContain("captureCameraState()");
    expect(playReplaySource).toContain("getTimelineReviewCameraFocusTargetKeys(liveCameraState)");
    expect(playReplaySource).toContain("userReplayFocusTargetKeys = liveReplayFocusTargetKeys");
    expect(playReplaySource).toContain("replayEndCameraState");
    expect(playReplaySource).toContain(
      "userReplayFocusTargetKeys.length > 0\n          ? capturedReplayEndCameraState"
    );
    expect(playReplaySource).toContain("restoreCameraState(replayEndCameraState)");
    expect(playReplaySource).not.toContain("restoreCameraState(liveCameraState)");
    expect(playReplaySource).not.toContain("applyCommand");
    expect(playReplaySource).not.toContain("runAiVsAiDebugSimulation");
    expect(playReplaySource).not.toContain("runAIVsAIDiagnostics40T");
    expect(rendererSource).toContain("animateReplayTransition");
    expect(rendererSource).toContain("previewReplayTransition");
    expect(rendererSource).toContain("clearPresentationEffects()");
    expect(rendererSource).not.toContain("setTrailerPresentationMode");
    expect(rendererSource).not.toContain("applyTrailerCameraShot");
    expect(rendererSource).not.toContain("getTrailerBillboardStabilityWarningCount");
    expect(rendererSource).not.toContain("TRAILER_BILLBOARD_STABILITY_AUDIT");
    expect(rendererSource).not.toContain("getTrailerCameraProfileSettings");
    expect(rendererSource).toContain(
      "this.registerMissileImpactPresentations({ from, to }, clampedProgress)"
    );
    expect(rendererSource).toContain("this.syncReplayTransientTimeline(");
    expect(rendererSource).toContain("options.followTrackedFocus !== false");
    expect(rendererSource).toContain("options.includePresentationEffects !== false");
    expect(rendererSource).toContain("durationMs = this.tuning.turnAnimationDurationMs");
    expect(rendererSource).toContain("arrivalHoldMs");
    expect(rendererSource).toContain("isReplay?: boolean");
    expect(rendererSource).not.toContain("this.turnTransition?.isReplay !== true");
    expect(rendererSource).not.toContain("transition.isReplay !== true");
    expect(rendererSource).toContain("this.shouldRecenterTrackedFocusTarget()");
    expect(rendererSource).toContain("captureCameraState()");
    expect(rendererSource).toContain("previewCommandLogCueCamera");
    expect(rendererSource).toContain("restoreCommandLogCueCamera");
    expect(rendererSource).toContain("commandLogCueCameraReturnState");
    expect(rendererSource).toContain("computeCommandLogCuePreviewDistance");
    expect(rendererSource).toContain("fromDistance");
    expect(rendererSource).toContain("toDistance");
    expect(rendererSource).toContain("restoreCameraState");
  });

  it("does not expose trailer camera tooling through console API or debug toggles", () => {
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const rendererSource = readFileSync(
      join(process.cwd(), "src/renderers/cinematic3d/index.ts"),
      "utf8"
    );

    expect(uiSource).not.toContain("window.deltaVTrailerCamera");
    expect(uiSource).not.toContain("TRAILER CAM");
    expect(uiSource).not.toContain("trailerCameraController");
    expect(rendererSource).not.toContain("animateTrailerCameraShot");
    expect(rendererSource).not.toContain("resolveTrailerCameraShotState");
    expect(rendererSource).not.toContain("TrailerCameraShotMotion");
    expect(rendererSource).not.toContain("createTrailerCameraShotEndpoints");
    expect(rendererSource).not.toContain("createTrailerZenithPanOffset");
    expect(rendererSource).not.toContain("trailerManualDistanceScale");
    expect(rendererSource).not.toContain("applyTrailerManualCameraOffsets");
    expect(rendererSource).not.toContain("resetTrailerManualCameraOffsets");
    expect(rendererSource).toContain("offsetActiveCameraTransitionFocus");
    expect(rendererSource).toContain("offsetActiveCameraTransitionRotation");
    expect(rendererSource).not.toContain("applyManualTrailerZoomFactor");
    expect(rendererSource).toContain(
      "this.offsetActiveCameraTransitionFocus(this.focus.clone().sub(previousFocus))"
    );
  });

  it("builds the post-match report from recorded presentation data only", () => {
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const postMatchReportSource = readFileSync(
      join(process.cwd(), "src/ui/postMatchReport.ts"),
      "utf8"
    );
    const reportStart = postMatchReportSource.indexOf("export function createPostMatchReport(");
    const reportEnd = postMatchReportSource.indexOf(
      "export function countRemainingShips",
      reportStart
    );
    const reportSource = postMatchReportSource.slice(reportStart, reportEnd);
    const maybeReportStart = uiSource.indexOf("function maybeShowPostMatchReport(): void");
    const maybeReportEnd = uiSource.indexOf("async function playReplay", maybeReportStart);
    const maybeReportSource = uiSource.slice(maybeReportStart, maybeReportEnd);
    const victoryAuditStart = uiSource.indexOf(
      "workerEvaluation?.victoryAudit ?? createVictoryAudit"
    );
    const victoryEventStart = uiSource.indexOf("const victoryEvent = createVictoryResolutionEvent");

    expect(uiSource).toContain("postMatchReportText = createPostMatchReport(");
    expect(uiSource).toContain("matchDebugEvents.push(...recordedDebugEvents)");
    expect(uiSource).toContain("createVictoryAudit(content, state, snapshot, outcome)");
    expect(postMatchReportSource).toContain("winner: FactionId | null");
    expect(postMatchReportSource).toContain('"no-winner-yet"');
    expect(postMatchReportSource).toContain("pendingFireOrders: []");
    expect(postMatchReportSource).toContain("activeMissiles: []");
    expect(uiSource).toContain("createVictoryAuditContradictions(");
    expect(uiSource).toContain('console.info("VICTORY_AUDIT_CONTRADICTION"');
    expect(postMatchReportSource).toContain("hasProvenStableVictoryRecovery");
    expect(postMatchReportSource).toContain("createVictoryEvaluationState(recoveryState)");
    expect(postMatchReportSource).toContain(
      "createVictoryRecoveryByFaction(content, recoveryState, snapshot)"
    );
    expect(uiSource).toContain('console.info("VICTORY_CONFIRMED"');
    expect(uiSource).toContain("createMapOutcomeAudit(");
    expect(uiSource).toContain('console.info("VICTORY_AUDIT", victoryAudit)');
    expect(uiSource).toContain('console.info("MAP_OUTCOME_AUDIT", lastMapOutcomeAudit)');
    expect(uiSource).toContain("victoryAudit: lastVictoryAudit");
    expect(uiSource).toContain("mapOutcomeAudit: lastMapOutcomeAudit");
    expect(uiSource).toContain("getProceduralDebugForGameMode(");
    expect(uiSource).toContain(
      "const fairnessAudit = debug.fairnessAuditByMode[mode] ?? debug.fairnessAudit"
    );
    expect(postMatchReportSource).toContain("predictedTritiumAccessScores");
    expect(postMatchReportSource).toContain("actualTritiumNodesByTurn");
    expect(postMatchReportSource).toContain("actualDvByTurn");
    expect(postMatchReportSource).toContain("actualShipsByTurn");
    expect(postMatchReportSource).toContain("actualCollapseTurnPerFaction");
    expect(postMatchReportSource).toContain("whetherMapLikelyCausedRunaway");
    expect(postMatchReportSource).toContain("whetherAILikelyCausedRunaway");
    expect(postMatchReportSource).toContain("auditModeMismatch");
    expect(postMatchReportSource).toContain("AUDIT_MODE_MISMATCH");
    expect(postMatchReportSource).toContain("collapseStatus");
    expect(postMatchReportSource).toContain('collapseStatus === "forced"');
    expect(postMatchReportSource).toContain('"false-positive-victory"');
    expect(postMatchReportSource).toContain('"premature-victory-audit"');
    expect(postMatchReportSource).toContain('"player-collapse-opponent-vs-ai2-unresolved"');
    expect(postMatchReportSource).toContain('"ai-induced-runaway-pending-verification"');
    expect(postMatchReportSource).toContain("pendingRecoveryTransitBlocksVictory");
    expect(postMatchReportSource).toContain("VICTORY_DELAYED_PENDING_RECOVERY_TRANSIT");
    expect(postMatchReportSource).toContain("VICTORY_CONTESTED_RECOVERY_AUDIT");
    expect(postMatchReportSource).toContain("VICTORY_COLLAPSE_CLASSIFICATION_AUDIT");
    expect(postMatchReportSource).toContain("outcomeClassification");
    expect(postMatchReportSource).toContain("Alpha Strike");
    expect(reportStart).toBeGreaterThanOrEqual(0);
    expect(reportEnd).toBeGreaterThan(reportStart);
    expect(maybeReportStart).toBeGreaterThanOrEqual(0);
    expect(maybeReportEnd).toBeGreaterThan(maybeReportStart);
    expect(victoryAuditStart).toBeGreaterThanOrEqual(0);
    expect(victoryEventStart).toBeGreaterThan(victoryAuditStart);
    expect(maybeReportSource).toContain("victory-audit-contradiction");
    expect(maybeReportSource).not.toContain("replayTape.transitions.length === 0");
    expect(reportSource).toContain("replayTape.entries");
    expect(reportSource).toContain("replayTape.transitions");
    expect(reportSource).toContain("MISSILE_SOLUTION_BROKEN");
    expect(reportSource).toContain("CONTESTED_UPKEEP_FAILED");
    expect(reportSource).not.toContain("applyCommand");
    expect(reportSource).not.toContain("runAiVsAiDebugSimulation");
    expect(reportSource).not.toContain("runAIVsAIDiagnostics40T");
  });

  it("persists completed match logs through the UI dev-server boundary", () => {
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const viteSource = readFileSync(join(process.cwd(), "vite.config.ts"), "utf8");
    const coreSources = collectTypeScriptFiles(join(process.cwd(), "src/core"));

    expect(uiSource).toContain("function shouldPersistCompletedMatchLog()");
    expect(uiSource).toContain("return getActiveFactions(state).length > 0;");
    expect(uiSource).toContain("function buildCompletedMatchLog(");
    expect(uiSource).toContain("terminationReason: MatchTerminationReason");
    expect(uiSource).toContain('"DeltaV Compact Match Log"');
    expect(uiSource).toContain("function buildCompactCompletedMatchLogPayload(");
    expect(uiSource).toContain("winner: outcome?.winner ?? null");
    expect(uiSource).toContain("requestedSeed: currentRequestedSeed");
    expect(uiSource).toContain("effectiveMapSeed: currentEffectiveMapSeed");
    expect(uiSource).toContain("mapGameplayHash: currentMapGameplayHash");
    expect(uiSource).toContain("terminationReason,");
    expect(uiSource).toContain("commandScrollbackRecent: createCompactCommandScrollbackRows()");
    expect(uiSource).toContain(
      "debugEventSummary: createCompactDebugEventSummary(matchDebugEvents)"
    );
    expect(uiSource).toContain(
      "Full replay entries and per-turn snapshots are intentionally omitted"
    );
    expect(uiSource).not.toContain("replayEntries: replayTape.entries");
    expect(uiSource).not.toContain("finalSnapshot: snapshot");
    expect(uiSource).not.toContain("functionalDebugLog: buildFunctionalDebugLog()");
    expect(uiSource).toContain('void persistCompletedMatchLog(outcome, "strategic-victory");');
    expect(uiSource).toContain('fetch("/__deltav/match-log"');
    expect(uiSource).toContain('console.info("MATCH_LOG_SAVED"');
    expect(uiSource).toContain('console.warn("MATCH_LOG_SAVE_FAILED"');
    expect(viteSource).toContain('name: "deltav-match-log-writer"');
    expect(viteSource).toContain('const matchLogRoute = "/__deltav/match-log"');
    expect(viteSource).toContain("const maxMatchLogPayloadBytes = 4 * 1024 * 1024");
    expect(viteSource).toContain("terminationReason");
    expect(viteSource).toContain('"match-logs"');
    expect(viteSource).toContain('writeFile(filePath, payload.text, "utf8")');
    expect(viteSource).toContain('ignored: ["**/release/**", "**/match-logs/**"]');
    expect(viteSource).toContain("configureServer(server)");
    expect(viteSource).toContain("configurePreviewServer(server)");

    for (const sourcePath of coreSources) {
      const source = readFileSync(sourcePath, "utf8");

      expect(source).not.toContain("__deltav/match-log");
      expect(source).not.toContain("match-logs");
      expect(source).not.toContain("writeFile(");
    }
  });

  it("keeps AI strategic audits explicit for runaway, last tritium, and elimination states", () => {
    const coreSource = readFileSync(
      join(process.cwd(), "src/core/simulation/gameState.ts"),
      "utf8"
    );

    expect(coreSource).toContain("AI_RUNAWAY_DETECTION_AUDIT");
    expect(coreSource).toContain("AI_ANTI_RUNAWAY_ACTION_AUDIT");
    expect(coreSource).toContain("shouldSuppressThirdPartyBeneficiaryEconomicFire");
    expect(coreSource).toContain("third-party-beneficiary:stable-leader-priority");
    expect(coreSource).toContain("AI_LAST_TRITIUM_PARALYSIS_AUDIT");
    expect(coreSource).toContain("FACTION_ELIMINATED");
    expect(coreSource).toContain("anti-runaway:own-economy-cannot-sustain-pressure");
    expect(coreSource).not.toContain("anti-runaway:own-economy-collapsed");
  });

  it("keeps the multiplayer planning timer in UI orchestration with server clock hooks", () => {
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const styleSource = readFileSync(join(process.cwd(), "src/styles.css"), "utf8");
    const coreSource = readFileSync(
      join(process.cwd(), "src/core/simulation/gameState.ts"),
      "utf8"
    );

    expect(uiSource).toContain("PlanningTimerState");
    expect(uiSource).toContain(
      'type PlanningTimerMode = "auto" | "two" | "ten" | "twenty" | "zero"'
    );
    expect(uiSource).toContain("planningTimerDurationMs");
    expect(uiSource).toContain("planningTimerShortExecuteCountdownMs");
    expect(uiSource).toContain("zeroTimerAutoRestartDelayMs");
    expect(uiSource).toContain("planningTimerLongExecuteCountdownMs");
    expect(uiSource).toContain("hasConsumedZeroTimerInitialCountdown");
    expect(uiSource).toContain("isZeroTimerAutoRestarting");
    expect(uiSource).toContain("getPlanningTimerDurationMs()");
    expect(uiSource).toContain('planningTimerMode === "auto" ? planningTimerDurationMs : 0');
    expect(uiSource).toContain("shouldStartPlanningTimerCountdown(options)");
    expect(uiSource).toContain('planningTimerMode === "two"');
    expect(uiSource).toContain('planningTimerMode === "ten"');
    expect(uiSource).toContain('planningTimerMode === "twenty"');
    expect(uiSource).toContain("shouldResolvePlanningTimerImmediately(options)");
    expect(uiSource).toContain("shouldRestartMusicForZeroTimerCountdown(reason)");
    expect(uiSource).toContain("musicEngine.restartFromBeginning()");
    expect(uiSource).toContain("fallbackBeatSyncStartedAtMs = performance.now()");
    expect(uiSource).toContain('void commitPlanningTimerAndResolve("timeout");');
    expect(uiSource).toContain('planningTimerState.phase !== "executeCountdown"');
    expect(uiSource).toContain("getPlanningTimerButtonText()");
    expect(uiSource).toContain("getNextPlanningTimerMode()");
    expect(uiSource).toContain('return "TIMER 10 SEC"');
    expect(uiSource).toContain('return "TIMER 20 SEC"');
    expect(uiSource).toContain('return "TIMER 0 SEC"');
    expect(uiSource).toContain('return "TIMER AUTO"');
    expect(uiSource).toContain("getPlanningExecuteCountdownDurationMs()");
    expect(uiSource).toContain("planningTimerExecuteCountdownMs");
    expect(uiSource).toContain('"deltav:planning-clock"');
    expect(uiSource).toContain("applyServerPlanningClock");
    expect(uiSource).toContain("getPlanningTurnTimerSuffix");
    expect(uiSource).toContain("command-console__line--turn-timer-warning");
    expect(uiSource).toContain("EXECUTE IN ${getPlanningExecuteCountdownSeconds()}");
    expect(uiSource).toContain("planningTimerState.deadlineAtMs");
    expect(uiSource).toContain("deadlineAtMs: options.deadlineAtMs ?? now + timerDurationMs");
    expect(uiSource).toContain("if (remainingMs <= 0)");
    expect(uiSource).toContain('if (planningTimerMode === "zero")');
    expect(uiSource).toContain(
      'planningTimerButton.classList.toggle("is-active", planningTimerMode !== "auto")'
    );
    expect(uiSource).toContain("startPlanningExecuteCountdown(now);");
    expect(uiSource).toContain("scheduleZeroTimerAutoRestart()");
    expect(uiSource).toContain("restartZeroTimerAutorunMatch()");
    expect(uiSource).toContain("ZERO_TIMER_AUTORUN_RESTART");
    expect(uiSource).toContain("function startDebugAiAutorunMode(");
    expect(uiSource).toContain('planningTimerMode = "zero";');
    expect(uiSource).toContain("getActiveFactions(state).every");
    expect(uiSource).toContain('faction.controlType === "ai"');
    expect(uiSource).toContain('"STARTING NEXT AI MATCH..."');
    expect(uiSource).toContain("hasConsumedZeroTimerInitialCountdown = true;");
    expect(uiSource).toContain("pendingCinematicCameraRestore");
    expect(uiSource).toContain("resetRuntimeAfterGameReset({ preserveCamera: true");
    expect(uiSource).toContain("preserveCinematicScene: true");
    expect(uiSource).toContain("restoreCameraState(pendingCinematicCameraRestore)");
    expect(uiSource).toContain("withControllerOverrides(");
    expect(uiSource).toContain('await resolveCurrentTurn("manual");');
    expect(uiSource).toContain("isPlanningTimerExecuteLocked()");
    expect(uiSource).toContain("isManualExecutePromptDisabled()");
    expect(uiSource).toContain('ignoreMandatoryLaunchLock: source !== "manual"');
    expect(uiSource).toContain("getAutomaticMandatoryLaunchFactionIdsForResolution");
    expect(uiSource).toContain('if (planningTimerMode !== "auto")');
    expect(uiSource).toContain("return getPlanningParticipantFactionIds();");
    expect(uiSource).toContain("getEffectiveDebugAiPlanningOptions()");
    expect(uiSource).toContain("getEffectiveAiPlanningOptions()");
    expect(uiSource).toContain("advanceSimulationTurn(");
    expect(uiSource).not.toContain("shouldLockPlanningInsteadOfResolving");
    expect(uiSource).not.toContain("lockLocalPlanningPlayer");
    expect(uiSource).not.toContain('planningTimerMode === "on"');
    expect(uiSource).not.toContain('planningTimerMode === "off"');
    expect(uiSource).not.toContain(
      "startPlanningExecuteCountdown(now, planningTimerState.deadlineAtMs)"
    );
    expect(uiSource).not.toContain("if (remainingMs <= planningTimerWarningMs)");
    expect(uiSource).not.toContain("enemy order count");
    expect(styleSource).not.toContain(".planning-timer");
    expect(styleSource).toContain(".command-console__line--turn-timer-warning");
    expect(styleSource).toContain(".command-console__execute--countdown");
    expect(styleSource).toContain("@keyframes planning-execute-blink");
    expect(coreSource).not.toContain("PlanningTimerState");
    expect(coreSource).not.toContain("planningTimerDurationMs");
  });

  it("drives the command transcript from structured resolution events", () => {
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const coreIndexSource = readFileSync(join(process.cwd(), "src/core/index.ts"), "utf8");
    const resolutionSource = readFileSync(
      join(process.cwd(), "src/core/resolution/resolutionEvents.ts"),
      "utf8"
    );
    const replayTimelineSource = readFileSync(
      join(process.cwd(), "src/ui/replayTimeline.ts"),
      "utf8"
    );
    const rowsSource = readFileSync(join(process.cwd(), "src/ui/resolutionCommandRows.ts"), "utf8");

    expect(coreIndexSource).toContain("createPlayerFacingResolutionEvents");
    expect(coreIndexSource).toContain("type ResolutionEvent");
    expect(resolutionSource).toContain("export type ResolutionEvent");
    expect(resolutionSource).toContain("mapCue: ResolutionCue");
    expect(resolutionSource).toContain("cameraCue?: ResolutionCue");
    expect(resolutionSource).toContain("audioCue?: ResolutionCue");
    expect(resolutionSource).toContain("replayCue?: ResolutionCue");
    expect(uiSource).toContain("const matchResolutionEvents: ResolutionEvent[] = []");
    expect(replayTimelineSource).toContain("type ReplayLogLink");
    expect(replayTimelineSource).toContain("logLink?: ReplayLogLink");
    expect(uiSource).toContain("type CommandTimelineEntry");
    expect(uiSource).toContain('kind: "commandSnapshot"');
    expect(uiSource).toContain("rows: readonly CommandTimelineRow[]");
    expect(uiSource).toContain("const commandTimelineEntries: CommandTimelineEntry[] = []");
    expect(uiSource).toContain("createCommandSnapshotTimelineEntry()");
    expect(uiSource).toContain("commandTimelineEntries.push(entry)");
    expect(uiSource).toContain("commandTimelineEntries.push(...entries)");
    expect(uiSource).toContain("renderCommandTranscriptFromTimeline()");
    expect(uiSource).toContain("createCommandConsoleRows(entry.rows)");
    expect(uiSource).toContain("isCommandTimelineSpacerRow(row)");
    expect(uiSource).toContain("? []");
    expect(uiSource).toContain("createCommandConsoleTextParts(part.text, part.className)");
    expect(uiSource).toContain('"command-console__event-contested"');
    expect(uiSource).toContain("createPlayerFacingResolutionEvents(");
    expect(uiSource).toContain("matchResolutionEvents.push(...resolutionEvents)");
    expect(uiSource).toContain(
      "const recordedDebugEvents = to.debugEvents.filter(shouldRecordReplayDebugEvent)"
    );
    expect(uiSource).toContain(
      "const resolutionEvents = createPlayerFacingResolutionEvents(recordedDebugEvents)"
    );
    expect(replayTimelineSource).toContain("createReplayLogLinksByDebugEventIndex");
    expect(replayTimelineSource).toContain("resolutionEvent.sourceDebugEventIndices");
    expect(replayTimelineSource).toContain(
      "commandTimelineEntryId: `command-resolution:${resolutionEvent.id}`"
    );
    expect(uiSource).toContain("createVictoryResolutionEvent(");
    expect(uiSource).toContain("createVictoryTimelineEntry(victoryEvent)");
    expect(rowsSource).toContain("function createPlayerFacingResolutionRow(");
    expect(rowsSource).toContain("events: readonly ResolutionEvent[]");
    expect(rowsSource).toContain(
      '{ text: "CONTESTED upkeep", className: "command-console__event-contested" }'
    );
    expect(rowsSource).toContain('const crewLostCueClassName = "command-console__crew-lost-cue";');
    expect(rowsSource).toContain('text: "CREW LOST"');
    expect(rowsSource).toContain("text: ` at ${nodeName}; `");
    expect(rowsSource).not.toContain("events: readonly TurnDebugEvent[]");
    expect(rowsSource).not.toContain(".message");
  });

  it("renders produced ships with a beat-synced glow instead of a flat white pulse", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const pulseStart = source.indexOf("  private createShipyardEventPulse");
    const tritiumEffectStart = source.indexOf("  private updateTritiumWorkEffect", pulseStart);
    const pulseSource = source.slice(pulseStart, tritiumEffectStart);
    const glowStart = source.indexOf("  private createShipProductionGlow", pulseStart);
    const glowSource = source.slice(glowStart, tritiumEffectStart);

    expect(pulseStart).toBeGreaterThanOrEqual(0);
    expect(tritiumEffectStart).toBeGreaterThan(pulseStart);
    expect(glowStart).toBeGreaterThan(pulseStart);
    expect(pulseSource).toContain("createShipProductionGlow");
    expect(pulseSource).toContain("getShipyardEventWorldPosition");
    expect(pulseSource).toContain("getShipProductionGlowBeatIntensity");
    expect(glowSource).toContain("shipyard-assembly-birth-glint");
    expect(glowSource).toContain("shipyard-assembly-birth-glint-major");
    expect(glowSource).toContain("shipyard-assembly-birth-glint-minor");
    expect(glowSource).toContain("shipyard-assembly-birth-glint-spark");
    expect(glowSource).toContain("createShipProductionGlintLine");
    expect(glowSource).toContain("root.quaternion.copy(this.camera.quaternion)");
    expect(glowSource).toContain("depthTest: true");
    expect(glowSource).toContain("this.tuning.shipProductionGlowScreenPixels");
    expect(glowSource).not.toContain("shipyard-assembly-birth-glow-aura");
    expect(glowSource).not.toContain("shipyard-assembly-birth-glow-core");
    expect(glowSource).not.toContain("new THREE.SphereGeometry");
    expect(pulseSource).not.toContain('eventType === "SHIP_PRODUCED" ? 17 : 24');
  });

  it("charges the mandatory-launch engine bloom point without boosting the planet light glow", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const shipMarkersStart = source.indexOf("  private animateShipMarkers");
    const shipMarkersEnd = source.indexOf(
      "  private getShipyardAssemblyShipRevealProgress",
      shipMarkersStart
    );
    const presentationStart = source.indexOf("function syncShipMarkerPresentation");
    const presentationEnd = source.indexOf("function getCachedShipMarkerObject", presentationStart);
    const radiatorPresentationStart = source.indexOf("function syncShipRadiatorPresentation");
    const radiatorPresentationEnd = source.indexOf(
      "function getShipRadiatorBeatBreath",
      radiatorPresentationStart
    );
    const shipMarkersSource = source.slice(shipMarkersStart, shipMarkersEnd);
    const presentationSource = source.slice(presentationStart, presentationEnd);
    const radiatorPresentationSource = source.slice(
      radiatorPresentationStart,
      radiatorPresentationEnd
    );

    expect(shipMarkersStart).toBeGreaterThanOrEqual(0);
    expect(shipMarkersEnd).toBeGreaterThan(shipMarkersStart);
    expect(presentationStart).toBeGreaterThanOrEqual(0);
    expect(presentationEnd).toBeGreaterThan(presentationStart);
    expect(radiatorPresentationStart).toBeGreaterThanOrEqual(0);
    expect(radiatorPresentationEnd).toBeGreaterThan(radiatorPresentationStart);
    expect(shipMarkersSource).toContain("mandatoryLaunchForNode");
    expect(shipMarkersSource).toContain("isMandatoryLaunchChargeMarker");
    expect(shipMarkersSource).toContain("enginePointBoost");
    expect(shipMarkersSource).toContain("enginePointCharge");
    expect(shipMarkersSource).toContain("mandatoryLaunchBlink: isMandatoryLaunchChargeMarker");
    expect(shipMarkersSource).toContain("engineRotorActive");
    expect(shipMarkersSource).toContain("const enginePointCharge = isMandatoryLaunchChargeMarker");
    expect(shipMarkersSource).toContain("const radiatorExtension = isMandatoryLaunchChargeMarker");
    expect(shipMarkersSource).toContain(": (radiatorAnimation?.extension ?? 1)");
    expect(shipMarkersSource).toContain("isProducedAssemblyMarker ? 0 : 1");
    expect(presentationSource).toContain("enginePointChargeBeatPulse");
    expect(presentationSource).toContain("enginePointPulse");
    expect(presentationSource).toContain("mandatoryLaunchBlink?: boolean");
    expect(presentationSource).toContain("mandatoryLaunchBlinkOpacity");
    expect(source).toContain("function getMandatoryLaunchBlinkPulse");
    expect(source).toContain("private isMandatoryLaunchTransit");
    expect(source).toContain("event.mandatoryLaunchId === transit.id");
    expect(presentationSource).toContain("syncShipEngineRotorPresentation");
    expect(source).toContain("shipEngineRotorRadiansPerSecond");
    expect(source).toContain("setRingHexShipEngineRotorRotation");
    expect(presentationSource).toContain("ship-engine-bloom-point");
    expect(presentationSource).toContain(
      "const radiatorExtension = clamp(context.radiatorExtension ?? 1, 0, 1)"
    );
    expect(presentationSource).not.toContain("requestedRadiatorExtension");
    expect(presentationSource).not.toContain("THREE.MathUtils.lerp(\n    0.18");
    expect(presentationSource.indexOf("syncShipRadiatorPresentation(")).toBeLessThan(
      presentationSource.indexOf("if (allowComplexModelDetail)")
    );
    expect(radiatorPresentationSource).toContain("const poseExtension = radiatorExtension");
    expect(radiatorPresentationSource).not.toContain("THREE.MathUtils.lerp(0.1, radiatorExtension");
    expect(presentationSource).not.toContain("ship-tritium-engine-ring");
  });

  it("starts burn preview meshes ahead of close-up ship noses", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const resolveStart = source.indexOf("  private resolveBurnTrajectory");
    const renderStart = source.indexOf("  private renderBurnArc", resolveStart);
    const resolveSource = source.slice(resolveStart, renderStart);
    const clearanceStart = source.indexOf("  private getBurnPreviewLaunchClearedPoints");
    const activeLimitStart = source.indexOf(
      "  private getActiveBurnTrajectoryCoreRadiusLimit",
      clearanceStart
    );
    const clearanceSource = source.slice(clearanceStart, activeLimitStart);
    const activeSliceStart = source.indexOf("  private sliceActiveBurnFlightPathAheadOfShip");
    const activeMarkerStart = source.indexOf("  private renderActiveBurnMarker", activeSliceStart);
    const activeSliceSource = source.slice(activeSliceStart, activeMarkerStart);

    expect(source).toContain("burnPreviewLaunchNoseClearanceModelLengthRatio");
    expect(source).toContain("burnPreviewLaunchNoseClearanceScreenPadding");
    expect(source).toContain("burnPreviewLaunchNoseClearanceModelLengthRatio = 0.62");
    expect(source).toContain("burnPreviewLaunchNoseClearanceScreenPadding = 6");
    expect(resolveStart).toBeGreaterThanOrEqual(0);
    expect(renderStart).toBeGreaterThan(resolveStart);
    expect(clearanceStart).toBeGreaterThanOrEqual(0);
    expect(activeLimitStart).toBeGreaterThan(clearanceStart);
    expect(activeSliceStart).toBeGreaterThan(activeLimitStart);
    expect(activeMarkerStart).toBeGreaterThan(activeSliceStart);
    expect(resolveSource).toContain(
      "this.shouldClearBurnPreviewLaunchNose(\n      group,\n      activeProgress,\n      flightPath\n    )"
    );
    expect(resolveSource).toContain(
      "this.getBurnPreviewLaunchClearedPoints(origin, rawVisiblePoints)"
    );
    expect(source).toContain("private isBurnPreviewLaunchClearanceGroup");
    expect(source).toContain("group === this.burnPreviewGroup || group === this.pendingBurnGroup");
    expect(source).toContain("private getActiveBurnTrajectoryNoseClearance");
    expect(source).toContain("private getBurnTrajectoryShipNoseClearance");
    expect(clearanceSource).toContain("measurePolylineLength(points)");
    expect(clearanceSource).toContain("slicePolylineByDistance(points, launchClearance, distance)");
    expect(clearanceSource).toContain(
      "this.getBurnTrajectoryShipNoseClearance(\n      origin.center,"
    );
    expect(activeSliceSource).toContain("sliceActiveBurnFlightPathFromProgress");
    expect(activeSliceSource).toContain("measurePolylineLength(visiblePoints)");
    expect(activeSliceSource).toContain("const startPoint = visiblePoints[0]");
    expect(activeSliceSource).toContain(
      "this.getActiveBurnTrajectoryNoseClearance(startPoint, plan)"
    );
    expect(activeSliceSource).toContain(
      "slicePolylineByDistance(visiblePoints, launchClearance, distance)"
    );
    expect(activeSliceSource).not.toContain("void plan");
    expect(clearanceSource).toContain(
      "shipMarkerApproxVisualLength *\n        burnPreviewLaunchNoseClearanceModelLengthRatio"
    );
    expect(clearanceSource).toContain("focusedTransitShipModelScreenPixelMultiplier");
    expect(clearanceSource).toContain("transitShipModelScreenPixelMultiplier");
    expect(clearanceSource).toContain("activeBurnMarkerMinimumWorldSize");
  });

  it("uses viewer-like orbital canisters instead of technical stream lines for tritium work", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const streamUpdateStart = source.indexOf("  private updateTritiumWorkStreams");
    const frameUpdateStart = source.indexOf("  private updateTritiumWorkEffect", streamUpdateStart);
    const frameStart = source.indexOf("  private createTritiumWorkFrame", frameUpdateStart);
    const primaryShipStart = source.indexOf("  private getPrimaryShipWorldPosition", frameStart);
    const effectCreateStart = source.indexOf("function createTritiumWorkEffect");
    const flashCreateStart = source.indexOf("function createTritiumFlash", effectCreateStart);
    const canisterCreateStart = source.indexOf("function createTritiumCanister", flashCreateStart);
    const bokehCreateStart = source.indexOf(
      "function createTritiumCanisterBokehPoint",
      canisterCreateStart
    );
    const depthReadableStart = source.indexOf(
      "function makeTritiumCanisterDepthReadable",
      bokehCreateStart
    );
    const effectUpdateStart = source.indexOf(
      "function updateTritiumWorkEffect",
      canisterCreateStart
    );
    const emitStart = source.indexOf("function emitTritiumCanister", effectUpdateStart);
    const canisterUpdateStart = source.indexOf("function updateTritiumCanister", emitStart);
    const framePointStart = source.indexOf("function getTritiumFramePoint", canisterUpdateStart);
    const streamUpdateSource = source.slice(streamUpdateStart, frameUpdateStart);
    const frameSource = source.slice(frameStart, primaryShipStart);
    const effectCreateSource = source.slice(effectCreateStart, flashCreateStart);
    const canisterCreateSource = source.slice(canisterCreateStart, effectUpdateStart);
    const bokehCreateSource = source.slice(bokehCreateStart, depthReadableStart);
    const effectUpdateSource = source.slice(effectUpdateStart, emitStart);
    const emitSource = source.slice(emitStart, canisterUpdateStart);
    const canisterUpdateSource = source.slice(canisterUpdateStart, framePointStart);

    expect(streamUpdateStart).toBeGreaterThanOrEqual(0);
    expect(frameUpdateStart).toBeGreaterThan(streamUpdateStart);
    expect(frameStart).toBeGreaterThan(frameUpdateStart);
    expect(primaryShipStart).toBeGreaterThan(frameStart);
    expect(effectCreateStart).toBeGreaterThanOrEqual(0);
    expect(canisterCreateStart).toBeGreaterThan(flashCreateStart);
    expect(bokehCreateStart).toBeGreaterThan(canisterCreateStart);
    expect(depthReadableStart).toBeGreaterThan(bokehCreateStart);
    expect(effectUpdateStart).toBeGreaterThan(canisterCreateStart);
    expect(emitStart).toBeGreaterThan(effectUpdateStart);
    expect(canisterUpdateStart).toBeGreaterThan(emitStart);
    expect(source).toContain("const tritiumOrbitalCanisterCount = 20");
    expect(source).toContain("const tritiumOrbitalCanisterOrbitAngularSpeed = 0.34");
    expect(source).toContain("const tritiumOrbitalCanisterLaunchSpacingSeconds = 0.76");
    expect(source).toContain("const tritiumOrbitalCanisterLaunchJitterSeconds = 0.24");
    expect(source).toContain("const tritiumCanisterLaunchCandidateCount = 24");
    expect(source).toContain("const tritiumCanisterLaunchAngularSpacing = 0.24");
    expect(source).toContain("const tritiumCanisterOrbitAngularSpacing = 0.28");
    expect(source).toContain("const tritiumCanisterModelDetailLodFadeStart = 0.34");
    expect(source).toContain("const tritiumCanisterModelDetailLodFadeEnd = 0.74");
    expect(source).toContain("const orbitalCargoLaunchFlashDurationSeconds = 0.34");
    expect(source).toContain("const orbitalCargoLaunchSurfaceScale = 1.035");
    expect(source).toContain("const orbitalCargoLaunchFlashIntensityMultiplier = 0.3");
    expect(source).toContain(
      "const orbitalCargoLaunchFlashLightIntensity = 1.6 * orbitalCargoLaunchFlashIntensityMultiplier"
    );
    expect(source).toContain("const orbitalCargoLaunchPointLightRadiusMultiplier = 0.18");
    expect(source).toContain("const orbitalCargoLaunchSurfaceLightRadiusMultiplier = 0.22");
    expect(source).toContain(
      "const tritiumCanisterLaunchFlashDurationSeconds = orbitalCargoLaunchFlashDurationSeconds"
    );
    expect(source).toContain(
      "const tritiumCanisterLaunchFlashSurfaceScale = orbitalCargoLaunchSurfaceScale"
    );
    expect(source).toContain(
      "const tritiumCanisterLaunchFlashLightIntensity = orbitalCargoLaunchFlashLightIntensity"
    );
    expect(source).toContain(
      "const constructionCargoSurfaceFlashDurationSeconds = orbitalCargoLaunchFlashDurationSeconds"
    );
    expect(source).toContain("const tritiumCanisterScoopZoomOutFadeStart = 0.62");
    expect(source).toContain("const tritiumCanisterScoopZoomOutFadeEnd = 0.86");
    expect(source).toContain("const tritiumCanisterScoopFlashDurationSeconds = 0.16");
    expect(source).toContain("viewer-tritium-scoop-nuclear-glint-core");
    expect(source).toContain("viewer-tritium-scoop-nuclear-glint-halo");
    expect(source).toContain("getNuclearStyleRetinalFlashBurst(flashProgress)");
    expect(source).toContain(
      "const tritiumReceiverLocalPoint = new THREE.Vector3(0.148, 0.012, 0)"
    );
    expect(streamUpdateSource).toContain("this.getOrCreateTritiumWorkEffect(node.id)");
    expect(streamUpdateSource).toContain("this.updateTritiumWorkEffect");
    expect(streamUpdateSource).toContain("effect.retiringStartedAt = Number.POSITIVE_INFINITY");
    expect(streamUpdateSource).toContain("effect.retiringStartedAt = elapsed");
    expect(streamUpdateSource).toContain("isTritiumWorkEffectRetired(effect, elapsed)");
    expect(streamUpdateSource).not.toContain("clearGroup(this.tritiumWorkStreamsGroup)");
    expect(frameSource).toContain("this.getTritiumReceiverWorldPosition");
    expect(frameSource).toContain(
      "shipTangent: getTritiumOrbitTangent(radialAxis, tangentAxis, shipAngle, -1)"
    );
    expect(frameSource).toContain("shipAngularSpeed: -this.tuning.shipOrbitAngularSpeed");
    expect(frameSource).toContain("sceneUnitScale");
    expect(frameSource).toContain("planetSpin: elapsed * 0.17");
    expect(frameSource).toContain(
      "const nodeFactionId = this.getNodeActionOccupancyFactionId(node.id)"
    );
    expect(frameSource).toContain("nodeColor");
    expect(frameSource).toContain("const canCapture = node.isWorking && nodeFactionId !== null");
    expect(frameSource).toContain("canCapture,");
    expect(frameSource).toContain("private createDormantTritiumWorkFrame");
    expect(frameSource).toContain(
      "const bodyDelta = bodyPosition.clone().sub(previous.bodyPosition)"
    );
    expect(frameSource).toContain(
      "shipWorldPosition: previous.shipWorldPosition.clone().add(bodyDelta)"
    );
    expect(frameSource).toContain(
      "receiverWorldPosition: previous.receiverWorldPosition.clone().add(bodyDelta)"
    );
    expect(frameSource).toContain("canCapture: false");
    expect(effectCreateSource).toContain("createTritiumFlash");
    expect(effectCreateSource).toContain("createTritiumScoopFlash");
    expect(effectCreateSource).toContain("createTritiumCanister");
    expect(effectCreateSource).toContain("viewer-tritium-receiver-halo");
    expect(effectCreateSource).toContain("viewer-tritium-receiver-core");
    expect(effectCreateSource).toContain("receiverHalo.visible = false");
    expect(effectCreateSource).toContain("receiverCore.visible = false");
    expect(effectCreateSource).toContain("receiverLight.intensity = 0");
    expect(effectCreateSource).toContain("lastFrame: null");
    expect(effectCreateSource).toContain("retiringStartedAt: Number.POSITIVE_INFINITY");
    expect(source).toContain(
      "const liveFrame = allowLaunches\n      ? this.createTritiumWorkFrame"
    );
    expect(source).toContain("const dormantFrame =");
    expect(source).toContain("effect.lastFrame = liveFrame");
    expect(source).toContain("effect.lastFrame = dormantFrame");
    expect(source).toContain("allowLaunches && liveFrame !== null");
    expect(effectUpdateSource).toContain("effect.receiverHalo.visible = false");
    expect(effectUpdateSource).toContain("effect.receiverCore.visible = false");
    expect(effectUpdateSource).toContain("effect.receiverLight.visible = false");
    expect(effectUpdateSource).toContain("effect.receiverLight.intensity = 0");
    expect(effectUpdateSource).toContain("const retireOpacityMultiplier");
    expect(effectUpdateSource).toContain("allowLaunches && elapsed >= effect.nextLaunchTime");
    expect(effectUpdateSource).toContain("updateTritiumCanister(");
    expect(effectUpdateSource).toContain("updateTritiumScoopFlash(");
    expect(effectUpdateSource).toContain("retireOpacityMultiplier,\n      allowLaunches");
    expect(effectUpdateSource).toContain("getTritiumWorkEffectRetireOpacity");
    expect(source).toContain("const tritiumCanisterRetireFadeDelaySeconds");
    expect(source).toContain("const tritiumCanisterRetireFadeDurationSeconds");
    expect(effectUpdateSource).not.toContain("const receiverScale = getWorldUnitsForScreenPixels");
    expect(source).toContain("viewer-tritium-orbital-canister");
    expect(source).toContain("viewer-tritium-canister-model");
    expect(source).toContain("viewer-tritium-canister-blinker");
    expect(source).not.toContain("tritium-canister-hard-edge-light");
    expect(source).toContain("texture.magFilter = THREE.NearestFilter");
    expect(source).toContain("texture.minFilter = THREE.NearestFilter");
    expect(source).toContain("const tritiumCanisterBodyRevealStart = 0.16");
    expect(source).toContain("const tritiumCanisterBodyRevealEnd = 0.74");
    expect(source).toContain("const tritiumCanisterBodyRevealSilhouetteOpacity = 0.92");
    expect(source).not.toContain("tritiumCanisterBodyRevealScaleBoost");
    expect(source).not.toContain("tritiumCanisterBodyRevealModelDrop");
    expect(source).not.toContain("tritiumCanisterBodyRevealBeaconLift");
    expect(source).not.toContain("tritiumCanisterBodyRevealBeaconBlinkMask");
    expect(source).not.toContain("tritiumCanisterCloseModelSolarVisibilityFloor");
    expect(source).toContain("const tritiumCanisterModelReferenceDiameter = 0.176");
    expect(source).toContain("const tritiumCanisterLaunchScreenPixels = 2.8");
    expect(source).toContain("const tritiumCanisterCloseScreenPixels = 8");
    expect(source).toContain("const tritiumCanisterCloseBeaconPixels = 4.6");
    expect(source).toContain("const tritiumCanisterCloseBeaconBlinkSpeed = 6.2");
    expect(source).toContain("const tritiumCanisterCloseBeaconBlinkOnStart = 0.72");
    expect(source).toContain("const tritiumCanisterCloseBeaconBlinkOnEnd = 0.9");
    expect(source).toContain("const tritiumCanisterBokehCollapseStart = 0.34");
    expect(source).toContain("const tritiumCanisterBokehCollapseEnd = 0.74");
    expect(source).not.toContain("tritiumCanisterPlanetOcclusionRadiusMultiplier");
    expect(source).not.toContain("tritiumCanisterModelReadabilityFadeStart");
    expect(source).not.toContain("tritiumCanisterModelReadabilityFadeEnd");
    expect(source).not.toContain("tritiumCanisterMidLod");
    expect(source).toContain("const tritiumCanisterRoundBeaconPlanetFadeStartPixels = 36");
    expect(source).toContain("const tritiumCanisterRoundBeaconPlanetFadeEndPixels = 82");
    expect(source).not.toContain("tritiumCanisterBeaconReadabilityEdgeOnStart");
    expect(source).not.toContain("tritiumCanisterBeaconReadabilityEdgeOnEnd");
    expect(source).not.toContain("tritiumCanisterBeaconSolarVisibilityFloor");
    expect(source).not.toContain("tritiumCanisterBeaconBlinkOpacityFloor");
    expect(source).not.toContain("tritiumCanisterFarPointBeacon");
    expect(source).toContain("const tritiumCanisterZoomOutUiSolarVisibilityFloor = 0.68");
    expect(source).not.toContain("tritiumCanisterUiMarker");
    expect(source).not.toContain("tritiumCanisterSoftBeaconCloseScreenScale");
    expect(source).not.toContain("tritiumCanisterSoftBeaconCloseBlinkScreenScale");
    expect(source).not.toContain("tritiumCanisterSharpBeacon");
    expect(source).not.toContain("tritiumCanisterCloseBlinkFadeStart");
    expect(source).not.toContain("tritiumCanisterCloseBlinkFadeEnd");
    expect(source).not.toContain("tritiumCanisterClosePointBeacon");
    expect(source).not.toContain("tritiumCanisterPinpointBeacon");
    expect(source).toContain("const tritiumCanisterBokehBeaconMinScreenScale = 0.0014");
    expect(source).toContain("const tritiumCanisterBokehBeaconScreenScale = 0.008");
    expect(source).toContain("const tritiumCanisterBokehBeaconOpacity = 0.82");
    expect(source).toContain("const tritiumCanisterGlowStripCloseOpacityBoost = 0.3");
    expect(source).toContain("const tritiumCanisterGlowStripCloseBlinkOpacityBoost = 0.66");
    expect(source).not.toContain("tritiumCanisterBeaconLens");
    expect(source).not.toContain("tritiumCanisterBeaconLamp");
    expect(source).not.toContain("tritiumCanisterBeaconPointLight");
    expect(source).toContain("const tritiumCanisterBeaconLightDistance = 0.28");
    expect(source).toContain("const tritiumCanisterBeaconLightIntensityBase = 0.52");
    expect(source).toContain("const tritiumCanisterBeaconLightBlinkIntensity = 1.08");
    expect(source).not.toContain("viewer-tritium-canister-crisp-blinker");
    expect(source).toContain("viewer-tritium-launch-flash-core");
    expect(source).toContain("viewer-tritium-launch-flash-halo");
    expect(source).toContain("viewer-tritium-launch-flash-light");
    expect(canisterCreateSource).not.toContain("createRectangularGlowSprite(");
    expect(canisterCreateSource).not.toContain('"viewer-tritium-canister-blinker-lamp"');
    expect(canisterCreateSource).not.toContain("getRectangularLightTexture");
    expect(canisterCreateSource).toContain("glowStrip: strip");
    expect(canisterCreateSource).not.toContain("createTritiumCanisterSharpPoint");
    expect(canisterCreateSource).not.toContain("createTritiumCanisterFarBeacon");
    expect(canisterCreateSource).not.toContain("new THREE.CircleGeometry");
    expect(canisterCreateSource).not.toContain("new THREE.SphereGeometry");
    expect(canisterCreateSource).toContain("createTritiumCanisterCloseBeacon");
    expect(canisterCreateSource).toContain("tritium-canister-close-beacon");
    expect(canisterCreateSource).toContain("new THREE.PointsMaterial");
    expect(canisterCreateSource).not.toContain("viewer-tritium-canister-metal-glint");
    expect(canisterCreateSource).not.toContain("getSharpRadialGlowTexture");
    expect(canisterCreateSource).not.toContain("beacon.material.sizeAttenuation = false");
    expect(canisterCreateSource).toContain("viewer-tritium-canister-blinker-light");
    expect(canisterCreateSource).toContain("viewer-tritium-canister-blinker-post");
    expect(canisterCreateSource).not.toContain("viewer-tritium-canister-blinker-lens");
    expect(canisterCreateSource).not.toContain("tritium-canister-pinpoint-light");
    expect(canisterCreateSource).toContain("tritium-canister-bokeh-point");
    expect(canisterCreateSource).toContain(
      "beaconLight.position.copy(tritiumCanisterBeaconLightLocalPosition)"
    );
    expect(canisterCreateSource).toContain("group.add(beaconLight)");
    expect(canisterCreateSource).not.toContain("createTritiumCanisterPinpointBeacon");
    expect(canisterCreateSource).toContain("createTritiumCanisterBokehPoint");
    expect(canisterCreateSource).not.toContain("crispBeacon");
    expect(bokehCreateSource).toContain("depthTest: true");
    expect(bokehCreateSource).not.toContain("depthTest: false");
    expect(canisterCreateSource).not.toContain("viewer-tritium-canister-mid-lod");
    expect(emitSource).toContain("tritiumCanisterLaunchCandidateCount");
    expect(emitSource).toContain("getTritiumCanisterSpacingClearance");
    expect(emitSource).toContain("getTritiumCanisterPreOrbitShipClearance");
    expect(emitSource).toContain("tritiumCanisterLaunchCollisionRetrySeconds");
    expect(emitSource).toContain("if (canisterClearance < 0)");
    expect(emitSource).toContain("seededUnit(candidateSeed, 84)");
    expect(emitSource).toContain("emitTritiumLaunchFlash");
    expect(source).toContain("function emitTritiumLaunchFlash");
    expect(source).toContain("flash.startTime = elapsed");
    expect(source).toContain("flash.longitude = startLongitude");
    expect(source).toContain("flash.latitude = startLatitude");
    expect(source).toContain("frame.planetRadius * tritiumCanisterLaunchFlashSurfaceScale");
    expect(emitSource).toContain("effect.nextLaunchTime");
    expect(emitSource).toContain("tritiumOrbitalCanisterLaunchJitterSeconds");
    expect(emitSource).toContain("canister.hasPreviousPosition = false");
    expect(emitSource).not.toContain("attempt * 2.399963229728653");
    expect(emitSource).not.toContain("frame.shipWorldPosition.y");
    expect(canisterUpdateSource).toContain("canister.capturing");
    expect(canisterUpdateSource).toContain("canister.capturing && !frame.canCapture");
    expect(canisterUpdateSource).toContain("scoopDistanceBoost");
    expect(canisterUpdateSource).toContain("scoopZoomVisibility");
    expect(canisterUpdateSource).toContain("tritiumCanisterScoopZoomOutFadeStart");
    expect(canisterUpdateSource).toContain("tritiumCanisterScoopZoomOutFadeEnd");
    expect(canisterUpdateSource).toContain("getPointToSegmentDistance");
    expect(canisterUpdateSource).toContain(
      "frame.canCapture && ascentProgress >= 1 && nearestReceiverDistance < captureRadius"
    );
    expect(canisterUpdateSource).toContain(
      "emitTritiumScoopFlash(effect, elapsed, frame.receiverWorldPosition)"
    );
    expect(canisterUpdateSource).not.toContain("age > canister.lifetime");
    expect(canisterUpdateSource).toContain("canister.previousPosition.copy(canisterPosition)");
    expect(canisterUpdateSource).toContain("getTritiumCanisterScreenScale");
    expect(source).not.toContain("function getTritiumCanisterVisualScale");
    expect(canisterUpdateSource).toContain("const distanceBoost = 1 - closeBlinkBoost");
    expect(frameSource).toContain("solarPointVisibilityForWorldPosition:");
    expect(canisterUpdateSource).toContain("frame.solarPointVisibilityForWorldPosition");
    expect(source).not.toContain("function getTritiumCanisterPlanetVisibility");
    expect(source).not.toContain("function getTritiumCanisterModelPlanetVisibility");
    expect(source).toContain("computeBodyOcclusion(");
    expect(canisterUpdateSource).not.toContain("planetVisibility");
    expect(canisterUpdateSource).not.toContain("modelPlanetVisibility");
    expect(canisterUpdateSource).not.toContain("frame.shipWorldPosition.y");
    expect(canisterUpdateSource).not.toContain("canister.beacon.material");
    expect(canisterUpdateSource).not.toContain("canister.farBeacon");
    expect(canisterUpdateSource).toContain("const modelDetail =");
    expect(canisterUpdateSource).toContain("tritiumCanisterModelDetailLodFadeStart");
    expect(canisterUpdateSource).toContain("tritiumCanisterModelDetailLodFadeEnd");
    expect(canisterUpdateSource).toContain("const bodyReveal = smoothStep(");
    expect(canisterUpdateSource).toContain("const bokehCollapse = smootherStep(");
    expect(canisterUpdateSource).toContain("const modelSilhouette =");
    expect(canisterUpdateSource).toContain(
      "const modelVisibility = Math.max(modelDetail, modelSilhouette * (1 - bokehCollapse))"
    );
    expect(canisterUpdateSource).not.toContain("const modelReadability =");
    expect(canisterUpdateSource).not.toContain("tritiumCanisterModelReadabilityFadeStart");
    expect(canisterUpdateSource).not.toContain("tritiumCanisterModelReadabilityFadeEnd");
    expect(canisterUpdateSource).not.toContain("modelCloseVisibility");
    expect(canisterUpdateSource).not.toContain("modelSolarVisibility");
    expect(canisterUpdateSource).not.toContain("midLod");
    expect(canisterUpdateSource).not.toContain("midModel");
    expect(canisterUpdateSource).toContain(
      "const planetScreenRadius = getScreenPixelsForWorldRadius"
    );
    expect(canisterUpdateSource).toContain("const zoomOutMarkerVisibility = 1 - closeBlinkBoost");
    expect(canisterUpdateSource).toContain("tritiumCanisterRoundBeaconPlanetFadeStartPixels");
    expect(canisterUpdateSource).toContain("tritiumCanisterRoundBeaconPlanetFadeEndPixels");
    expect(canisterUpdateSource).toContain("renderZoomOutElements: boolean");
    expect(canisterUpdateSource).toContain("const zoomOutElementVisibility =");
    expect(canisterUpdateSource).toContain("renderZoomOutElements ? 1 : 0");
    expect(canisterUpdateSource).toContain("const zoomOutBeaconSolarVisibility =");
    expect(canisterUpdateSource).toContain(
      "Math.max(beaconSolarVisibility, tritiumCanisterZoomOutUiSolarVisibilityFloor)"
    );
    expect(canisterUpdateSource).toContain("bokehCollapse * zoomOutElementVisibility");
    expect(canisterUpdateSource).not.toContain("farPointBlink");
    expect(canisterUpdateSource).not.toContain("const closeBeaconVisibility =");
    expect(canisterUpdateSource).not.toContain("beaconPresentationVisibility");
    expect(canisterUpdateSource).not.toContain("const bodyRevealOrbitUp");
    expect(canisterUpdateSource).toContain("canister.model.position.set(0, 0, 0)");
    expect(canisterUpdateSource).toContain("canister.model.scale.setScalar(1)");
    expect(canisterUpdateSource).not.toContain("canister.beacon.position");
    expect(canisterUpdateSource).not.toContain("canister.pinpointBeacon");
    expect(canisterUpdateSource).toContain("canister.bokehBeacon.position.set(0, 0, 0)");
    expect(canisterUpdateSource).not.toContain("crispBeacon");
    expect(canisterUpdateSource).not.toContain(
      "canister.bokehBeacon.position.copy(canister.beacon.position)"
    );
    expect(canisterUpdateSource).toContain(
      "canister.beaconLight.position.copy(tritiumCanisterBeaconLightLocalPosition)"
    );
    expect(canisterUpdateSource).toContain("canister.model.visible = modelVisibility > 0.025");
    expect(canisterUpdateSource).toContain(
      "setObjectOpacity(canister.model, opacityMultiplier * modelVisibility)"
    );
    expect(canisterUpdateSource).toContain(
      "syncTritiumCanisterNodeColor(canister, frame.nodeColor)"
    );
    expect(source).toContain("function syncTritiumCanisterNodeColor");
    expect(source).toContain("function syncSpriteMaterialColor");
    expect(source).toContain("canister.glowStrip.material.color.copy(color)");
    expect(source).toContain("canister.closeBeacon.material.color.copy(color)");
    expect(source).not.toContain("canister.beaconLens");
    expect(source).not.toContain("canister.pinpointBeacon");
    expect(source).toContain("syncSpriteMaterialColor(canister.bokehBeacon, color)");
    expect(source).toContain("canister.beaconLight.color.copy(color)");
    expect(source).not.toContain("syncTritiumFlashNodeColor");
    expect(canisterUpdateSource).not.toContain("canister.beacon.scale.set(");
    expect(canisterUpdateSource).not.toContain("tritiumCanisterSoftBeacon");
    expect(canisterUpdateSource).toContain("const localScaleDivisor = Math.max(0.001, scale)");
    expect(canisterUpdateSource).not.toContain("tritiumCanisterSharpPoint");
    expect(canisterUpdateSource).not.toContain("farPointBlink");
    expect(canisterUpdateSource).not.toContain("const cameraDirection =");
    expect(canisterUpdateSource).not.toContain("edgeOnReadability");
    expect(canisterUpdateSource).not.toContain("beaconReadability");
    expect(canisterUpdateSource).toContain("const beaconSolarVisibility = solarPointVisibility");
    expect(canisterUpdateSource).not.toContain("const beaconSolarVisibility = Math.max(");
    expect(canisterUpdateSource).not.toContain("tritiumCanisterBeaconSolarVisibilityFloor");
    expect(canisterUpdateSource).not.toContain("uiPointBeaconVisibility");
    expect(canisterUpdateSource).not.toContain("distantPointBeaconVisibility");
    expect(canisterUpdateSource).toContain("const bokehBeaconVisibility =");
    expect(canisterUpdateSource).not.toContain("planetVisibility");
    expect(canisterUpdateSource).toContain(
      "const bokehScaleProgress = smootherStep(0, 1, bokehCollapse)"
    );
    expect(canisterUpdateSource).toContain("tritiumCanisterBokehBeaconMinScreenScale");
    expect(canisterUpdateSource).toContain(
      "canister.group.visible = Math.max(modelVisibility, bokehBeaconVisibility) > 0.01"
    );
    expect(canisterUpdateSource).not.toContain("tritiumCanisterFarPointBeacon");
    expect(canisterUpdateSource).not.toContain("const farPointParentScaleCompensation =");
    expect(canisterUpdateSource).not.toContain(
      "canister.crispBeacon.material.depthTest = farPointBlink < 0.65"
    );
    expect(canisterUpdateSource).not.toContain("tritiumCanisterFarPointBeacon");
    expect(canisterUpdateSource).toContain(
      "bokehCollapse *\n    zoomOutElementVisibility *\n    zoomOutMarkerVisibility"
    );
    expect(canisterUpdateSource).not.toContain("beaconBodyReveal");
    expect(canisterUpdateSource).not.toContain("tritiumCanisterBodyRevealBeaconBlinkMask");
    expect(canisterUpdateSource).not.toContain("tritiumCanisterBeaconBlinkOpacityFloor");
    expect(canisterUpdateSource).not.toContain("canister.beacon.material");
    expect(canisterUpdateSource).not.toContain("canister.pinpointBeacon.visible");
    expect(canisterUpdateSource).toContain("canister.bokehBeacon.visible");
    expect(canisterUpdateSource).not.toContain("crispBeacon");
    expect(canisterUpdateSource).not.toContain("circularBeaconSuppression");
    expect(canisterUpdateSource).not.toContain("tritiumCanisterBeaconLampVisibility");
    expect(canisterUpdateSource).not.toContain("rectangularBeaconVisibility");
    expect(canisterUpdateSource).not.toContain("canister.beacon.visible");
    expect(canisterUpdateSource).not.toContain("crispUiVisibility");
    expect(canisterUpdateSource).not.toContain("pointBeaconOpacity");
    expect(canisterUpdateSource).toContain("beaconSolarVisibility");
    expect(canisterUpdateSource).toContain("const closeBlinkBoost =");
    expect(canisterUpdateSource).toContain("planetScreenRadius");
    expect(canisterUpdateSource).not.toContain("closePointBlink");
    expect(canisterUpdateSource).not.toContain("lensBlink");
    expect(canisterUpdateSource).not.toContain("canister.beaconLens");
    expect(canisterUpdateSource).not.toContain("tritiumCanisterClosePointBeacon");
    expect(canisterUpdateSource).toContain("tritiumCanisterGlowStripCloseBlinkOpacityBoost");
    expect(canisterUpdateSource).not.toContain("softBeaconCloseOpacityBoost");
    expect(canisterUpdateSource).not.toContain("beaconLightOrbitVisibility");
    expect(canisterUpdateSource).not.toContain("beaconLightPointVisibility");
    expect(canisterUpdateSource).not.toContain("beaconLightLensVisibility");
    expect(canisterUpdateSource).not.toContain("tritiumCanisterBeaconLightClose");
    expect(canisterUpdateSource).not.toContain("softBeaconOpacity");
    expect(canisterUpdateSource).toContain("opacityMultiplier");
    expect(canisterUpdateSource).not.toContain("tritiumCanisterSharpBeacon");
    expect(canisterUpdateSource).not.toContain("pointBeaconOpacity");
    expect(canisterUpdateSource).toContain("canister.model.visible");
    expect(canisterUpdateSource).toContain("canister.beaconLight.visible");
    expect(canisterUpdateSource).not.toContain("beaconPresentationVisibility");
    expect(canisterUpdateSource).toContain("const closeBeaconPulse =");
    expect(canisterUpdateSource).toContain("const closeBeaconOpacity =");
    expect(canisterUpdateSource).toContain("getTritiumCanisterCloseBeaconPulse");
    expect(canisterUpdateSource).toContain(
      "canister.closeBeacon.visible = closeBeaconOpacity > 0.04"
    );
    expect(canisterUpdateSource).toContain("const pointLightVisibility =");
    expect(canisterUpdateSource).toContain(
      "canister.beaconLight.visible = pointLightVisibility > 0.04"
    );
    expect(canisterUpdateSource).toContain("tritiumCanisterBeaconLightLocalPosition");
    expect(source).toContain("function getTritiumCanisterCloseBeaconPulse");
    expect(source).toContain("canister.startLongitude * 1.7");
    expect(source).toContain("function getTritiumCanisterScoopPlaneLatitude");
    expect(source).toContain("const scoopPlaneLatitude = getTritiumCanisterScoopPlaneLatitude");
    expect(source).toContain("getTritiumFramePoint(frame, shipOrbitRadius, scoopPlaneLatitude");
    expect(canisterUpdateSource).not.toContain("tritiumCanisterBlinkerDeltaVScreenScale");
    expect(canisterUpdateSource).not.toContain("tritiumCanisterFarLodStart");
    expect(canisterUpdateSource).not.toContain("tritiumCanisterFarLodEnd");
    expect(source).toContain("function getPointToSegmentDistance");
    expect(source).toContain("child instanceof THREE.Sprite");
    expect(source).toContain("syncTritiumExtractionSurfaceGlowUniforms");
    expect(source).toContain("getTritiumExtractionSurfaceGlowPosition");
    expect(source).toContain("tritiumExtractionGlowPosition");
    expect(source).toContain("tritiumExtractionGlowIntensity");
    expect(source).toContain("tritiumExtractionGlowRadius");
    expect(source).toContain("tritiumExtractionSurfaceGlowIntensity");
    expect(source).toContain("tritiumExtractionSurfaceGlowRadiusMultiplier");
    expect(source).toContain("this.tuning.tritiumExtractionSurfaceGlowIntensity <= 0");
    expect(source).toContain("this.isTritiumStreamSuppressedForArrival(node.id)");
    expect(source).toContain("color += tritiumGlowLight");
    expect(source).toContain("const tritiumExtractionFallbackPulseSeconds = 1.15");
    expect(source).toContain("const tritiumExtractionMotionBeatDivisor = 2");
    expect(source).toContain("const beatTime = rawBeatTime / tritiumExtractionMotionBeatDivisor");
    expect(source).toContain("const opacity = Math.max(");
    expect(source).toContain("productiveNodeMarkerMinimumVisibleOpacity");
    expect(source).not.toContain(
      'getNumericUserData(nodeObject.productiveMarkers, "opacityMultiplier")'
    );
    expect(source).toContain("tritiumProductiveMarkerGlowOpacity * flashOpacityMultiplier");
    expect(source).toContain('node.type === "shipyard"');
    expect(source).toContain("shipyardProductiveMarkerGlowOpacity * flashOpacityMultiplier");
    expect(source).not.toContain("(node.isWorking ? 0 : 0.82)");
    expect(source).not.toContain("createTritiumSurfaceSweepBand");
    expect(source).not.toContain("createTritiumExtractionStreamField");
    expect(source).not.toContain("createTritiumExtractionPackets");
    expect(source).not.toContain("createTritiumCentralExtractionPackets");
    expect(source).not.toContain("getTritiumExtractionStreamPoint");
    expect(source).not.toContain("tritium-extraction-wave-field");
    expect(source).not.toContain("tritium-extraction-technical-line");
    expect(source).not.toContain("tritium-extraction-packets");
    expect(source).not.toContain("tritium-extraction-central-packets");
    expect(source).toContain("suppressZoomOutDotGlow:");
    expect(source).toContain("!this.isTritiumStreamSuppressedForArrival(node.id)");
    expect(source).toContain("zoomOutDotGlowSuppression");
  });

  it("caps close body zoom by apparent diameter so large planets remain framed", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");

    expect(source).toContain("jupiter: { min: 0.42, max: 0.5 }");
    expect(source).toContain("private getFocusedBodyMinimumCameraDistance");
    expect(source).toContain("apparentTarget.max * tangent");
    expect(source).toContain("return this.getFocusedBodyMinimumCameraDistance(body);");
    expect(source).not.toContain("jupiter: { min: 0.55, max: 0.65 }");
  });

  it("keeps trajectory previews tangent-to-tangent and debuggable", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const trajectoryPreviewSource = readFileSync(
      join(process.cwd(), "src/renderers/cinematic3d/trajectoryPreview.ts"),
      "utf8"
    );
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");
    const diagnosticsSource = readFileSync(join(process.cwd(), "src/ui/diagnostics.ts"), "utf8");

    expect(trajectoryPreviewSource).toContain('type TransferPreviewStyle = "burn" | "fire"');
    expect(trajectoryPreviewSource).toContain("includeDepartureContinuity === true");
    expect(trajectoryPreviewSource).toContain('options.style ?? "burn"');
    expect(trajectoryPreviewSource).toContain('style: "fire"');
    expect(trajectoryPreviewSource).toContain('if (style === "burn")');
    expect(trajectoryPreviewSource).toContain("getLocalNodeOrbitTangentCandidates");
    expect(trajectoryPreviewSource).toContain("getTransferNodeTangentCandidates");
    expect(trajectoryPreviewSource).toContain("buildMostReadableSingleSpanTransferPreview");
    expect(trajectoryPreviewSource).toContain("scoreTransferPreviewCurvature");
    expect(trajectoryPreviewSource).toContain("scoreTransferPreviewMidspanArcShape");
    expect(trajectoryPreviewSource).toContain("scoreTransferPreviewEndpointCoherence");
    expect(trajectoryPreviewSource).toContain("scoreTransferPreviewSharpTurnPenalty");
    expect(trajectoryPreviewSource).toContain("softenImpossibleBurnPreviewTurns");
    expect(trajectoryPreviewSource).toContain("burnPreviewEndpointSharpTurnLimitRadians");
    expect(trajectoryPreviewSource).toContain("burnPreviewMidspanBowPower");
    expect(trajectoryPreviewSource).toContain("missilePreviewLiftPower");
    expect(trajectoryPreviewSource).toContain("missilePreviewSupportingLiftPower");
    expect(trajectoryPreviewSource).toContain("getTransferPreviewBowEnvelope(progress, style)");
    expect(trajectoryPreviewSource).toContain("getReadableEndpointControlTangent");
    expect(trajectoryPreviewSource).toContain("startTangentLocked");
    expect(trajectoryPreviewSource).toContain("endAlignmentShortfall");
    expect(trajectoryPreviewSource).not.toContain(
      '.addScaledVector(readableBow, style === "fire" ? 0.22 : 0.82)'
    );
    expect(trajectoryPreviewSource).not.toContain(
      '.addScaledVector(readableBow, style === "fire" ? 0.18 : 0.48)'
    );
    expect(trajectoryPreviewSource).toContain("getEndpointTurnPenalty");
    expect(trajectoryPreviewSource).toContain("getPolylineStartTangent");
    expect(trajectoryPreviewSource).toContain("burnTransferVerticalHeightScale = 0.8");
    expect(trajectoryPreviewSource).toContain("missileTrajectoryBaseHeightScale = 0.46");
    expect(trajectoryPreviewSource).toContain("missileTrajectoryExtraLiftScale = 0.68");
    expect(trajectoryPreviewSource).toContain("smoothMissileApex");
    expect(trajectoryPreviewSource).not.toContain("sharpMidpointApex");
    expect(source).toContain("captureTrajectoryPreviewDebugState()");
    expect(source).toContain("createActiveBurnChaseDebugSamples");
    expect(source).toContain("flightPath:");
    expect(uiSource).toContain(
      "trajectoryPreviews: cinematicRenderer?.captureTrajectoryPreviewDebugState() ?? null"
    );
    expect(source).toContain("captureSolarVisualDebugState()");
    expect(source).toContain("collectSolarVisualSuspects");
    expect(source).toContain("object instanceof THREE.Light");
    expect(source).toContain("sunSmoothGlareBudget: this.createSunSmoothGlareBudgetDebugEntry()");
    expect(source).toContain("createSolarVisualScreenFootprintDebugEntry");
    expect(source).toContain("viewportCoverage");
    expect(source).not.toContain("object.renderOrder <= 0");
    expect(source).toContain("suspectRenderables: suspects.slice(0, 180)");
    expect(uiSource).toContain(
      "solarVisuals: cinematicRenderer?.captureSolarVisualDebugState() ?? null"
    );
    expect(uiSource).toContain("camera: cinematicRenderer?.captureCameraState() ?? null");
    expect(uiSource).toContain('label: "ΔV Functional Debug Log"');
    expect(uiSource).toContain(
      "const performanceDiagnosticsEnabled = isPerformanceDiagnosticsEnabled()"
    );
    expect(uiSource).toContain("Enable PERF diagnostics before copying the functional debug log.");
    expect(uiSource).toContain("const cinematicPerformanceStats =");
    expect(uiSource).toContain("performance: {");
    expect(uiSource).toContain("diagnosticsEnabled: isPerformanceDiagnosticsEnabled()");
    expect(uiSource).toContain("Enable PERF diagnostics before copying the dump");
    expect(diagnosticsSource).toContain("trajectoryPreviews: unknown");
    expect(diagnosticsSource).toContain("solarVisuals: unknown");
    expect(diagnosticsSource).toContain("performance: unknown");
  });

  it("keeps long-range FIRE routes readable without losing the dotted grammar", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const visualTuningSource = readFileSync(
      join(process.cwd(), "src/renderers/cinematic3d/visualTuning.ts"),
      "utf8"
    );
    const weightStart = source.indexOf("function getFireTrajectoryVisualWeight(");
    const weightEnd = source.indexOf("function getTrajectoryEtaLabelClassName(", weightStart);
    const weightSource = source.slice(weightStart, weightEnd);

    expect(visualTuningSource).toContain("pendingFireOpacity: 0.82");
    expect(weightSource).toContain("opacityMultiplier: 0.66");
    expect(weightSource).toContain("thicknessMultiplier: 0.82");
    expect(source).toContain("const dashLength = dashCycle * (isInvalid ? 0.44 : 0.58)");
    expect(source).toContain(
      "continuousSilhouette: isPreview ? 0.2 : activeProgress === undefined ? 0.12 : 0.08"
    );
  });

  it("keeps occupied-node selection and burn confirmation visually distinct", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");
    const trajectoryPreviewSource = readFileSync(
      join(process.cwd(), "src/renderers/cinematic3d/trajectoryPreview.ts"),
      "utf8"
    );
    const styles = readFileSync(join(process.cwd(), "src/styles.css"), "utf8");
    const burnRequestStart = source.indexOf("  private tryRequestBurnOrder");
    const burnOriginStart = source.indexOf("  private getSelectedBurnOriginNodeId");
    const burnRequestSource = source.slice(burnRequestStart, burnOriginStart);
    const sampleMotionStart = trajectoryPreviewSource.indexOf(
      "function sampleActiveBurnPhysicalMotion"
    );
    const insertionArcStart = trajectoryPreviewSource.indexOf(
      "function createNodeOrbitInsertionArcPoints",
      sampleMotionStart
    );
    const sampleMotionSource = trajectoryPreviewSource.slice(sampleMotionStart, insertionArcStart);
    const resolveBurnTrajectoryStart = source.indexOf("  private resolveBurnTrajectory(");
    const renderBurnArcStart = source.indexOf("  private renderBurnArc(");
    const renderActiveBurnMarkerStart = source.indexOf(
      "  private renderActiveBurnMarker(",
      renderBurnArcStart
    );
    const resolveBurnTrajectorySource = source.slice(
      resolveBurnTrajectoryStart,
      renderBurnArcStart
    );
    const resolveFireTrajectoryStart = source.indexOf("  private resolveFireTrajectory(");
    const renderFireArcStart = source.indexOf("  private renderFireArc(");
    const renderFireArcSource = source.slice(renderFireArcStart, resolveFireTrajectoryStart);
    const sliceActiveMissileTrajectoryStart = source.indexOf(
      "  private sliceActiveMissileTrajectoryAheadOfMissile(",
      resolveFireTrajectoryStart
    );
    const resolveFireTrajectorySource = source.slice(
      resolveFireTrajectoryStart,
      sliceActiveMissileTrajectoryStart
    );
    const renderBurnArcSource = source.slice(renderBurnArcStart, renderActiveBurnMarkerStart);
    const renderPendingBurnFutureDestinationLinkStart = source.indexOf(
      "  private renderPendingBurnFutureDestinationLink(",
      renderBurnArcStart
    );
    const getBurnTrajectoryZoomOutThicknessMultiplierStart = source.indexOf(
      "  private getBurnTrajectoryZoomOutThicknessMultiplier(",
      renderPendingBurnFutureDestinationLinkStart
    );
    const renderPendingBurnFutureDestinationLinkSource = source.slice(
      renderPendingBurnFutureDestinationLinkStart,
      getBurnTrajectoryZoomOutThicknessMultiplierStart
    );
    const renderFutureBodyPreviewStart = source.indexOf(
      "  private renderFutureBodyPreview(",
      renderActiveBurnMarkerStart
    );
    const createFutureOrbitTimingPreviewStart = source.indexOf(
      "  private createFutureOrbitTimingPreview(",
      renderFutureBodyPreviewStart
    );
    const renderFutureBodyPreviewSource = source.slice(
      renderFutureBodyPreviewStart,
      createFutureOrbitTimingPreviewStart
    );
    const renderActiveBurnMarkerSource = source.slice(
      renderActiveBurnMarkerStart,
      renderFutureBodyPreviewStart
    );
    const getPlanOriginStart = source.indexOf("  private getPlanOriginRenderData(");
    const createPreviewBurnLaunchOriginStart = source.indexOf(
      "  private createPreviewBurnLaunchOriginRenderData(",
      getPlanOriginStart
    );
    const createLaunchOriginStart = source.indexOf(
      "  private createActiveBurnLaunchOriginRenderData(",
      getPlanOriginStart
    );
    const getPlanOriginSource = source.slice(getPlanOriginStart, createLaunchOriginStart);
    const createPreviewBurnLaunchOriginSource = source.slice(
      createPreviewBurnLaunchOriginStart,
      createLaunchOriginStart
    );
    const createPreviewFireLaunchOriginStart = source.indexOf(
      "  private createPreviewFireLaunchOriginRenderData(",
      getPlanOriginStart
    );
    const getFireOriginStart = source.indexOf(
      "  private getFireOriginRenderData(",
      createPreviewFireLaunchOriginStart
    );
    const createPreviewFireLaunchOriginSource = source.slice(
      createPreviewFireLaunchOriginStart,
      getFireOriginStart
    );
    const getFireTargetRenderDataStart = source.indexOf("  private getFireTargetRenderData(");
    const getFirePlanPresentationKeyStart = source.indexOf(
      "  private getFirePlanPresentationKey(",
      getFireTargetRenderDataStart
    );
    const getFireTargetRenderDataSource = source.slice(
      getFireTargetRenderDataStart,
      getFirePlanPresentationKeyStart
    );
    const updateTurnTransitionStart = source.indexOf("  private updateTurnTransition(");
    const updateFocusPanTransitionStart = source.indexOf(
      "  private updateFocusPanTransition(",
      updateTurnTransitionStart
    );
    const updateTurnTransitionSource = source.slice(
      updateTurnTransitionStart,
      updateFocusPanTransitionStart
    );
    const animateTurnTransitionStart = source.indexOf("  animateTurnTransition(");
    const resizeStart = source.indexOf("  resize(", animateTurnTransitionStart);
    const animateTurnTransitionSource = source.slice(animateTurnTransitionStart, resizeStart);
    const createBurnTrajectoryDashStart = source.indexOf("function createBurnTrajectoryDash(");
    const createOrbitTimingSegmentStart = source.indexOf("function createOrbitTimingSegment(");
    const createOrbitTimingDotStart = source.indexOf(
      "function createOrbitTimingDot(",
      createOrbitTimingSegmentStart
    );
    const createNodeRingMaterialStart = source.indexOf(
      "function createNodeRingMaterial(",
      createOrbitTimingDotStart
    );
    const getMissileFlightProgressStart = source.indexOf(
      "function getMissileFlightProgress(",
      createBurnTrajectoryDashStart
    );
    const burnTrajectoryDashSource = source.slice(
      createBurnTrajectoryDashStart,
      getMissileFlightProgressStart
    );
    const orbitTimingSegmentSource = source.slice(
      createOrbitTimingSegmentStart,
      createOrbitTimingDotStart
    );
    const orbitTimingDotSource = source.slice(
      createOrbitTimingDotStart,
      createNodeRingMaterialStart
    );

    expect(source).toContain("createSelectedNodeMarkerMesh");
    expect(source).toContain("selectedNodeMarkerElement");
    expect(source).toContain("cinematic-selected-focus-bracket");
    expect(source).toContain("updateSelectedNodeMarker()");
    expect(source).toContain("nodeObject.occupiedBand.visible = !isContested");
    expect(source).not.toContain("createOccupiedNodeOrbitGlint");
    expect(source).not.toContain("occupied-node-orbit-glint");
    expect(source).toContain("pickAtScreenPoint(point) ?? this.pickBurnPreviewHoverZone(point)");
    expect(source).toContain("onBurnOrderCancelled");
    expect(source).toContain('from "./trajectoryPreview"');
    expect(source).not.toContain("function buildZoomStableBurnPreviewTrajectory");
    expect(trajectoryPreviewSource).toContain("buildLocalOrbitalTransferPreview");
    expect(trajectoryPreviewSource).toContain(
      "const localPreview = buildLocalOrbitalTransferPreview("
    );
    expect(trajectoryPreviewSource).toContain("getLocalTransferFrame");
    expect(trajectoryPreviewSource).toContain("isLocalTransferVisualProfile");
    expect(trajectoryPreviewSource).toContain("parentBodyPosition");
    expect(source).toContain("getTransferArcDirection");
    expect(trajectoryPreviewSource).toContain("getTransferNodeTangentPoint");
    expect(trajectoryPreviewSource).toContain("buildReadableSingleSpanTransferPreview");
    expect(trajectoryPreviewSource).toContain("lockArcBranch?: boolean");
    expect(trajectoryPreviewSource).toContain("getTransferArcDirectionFromPositions");
    expect(source).toContain("buildZoomStableBurnPreviewTrajectory");
    expect(source).toContain("private getStableBurnPlanArcDirection");
    expect(source).toContain("lockTransferAnchor: true");
    expect(source).not.toContain("zoomStableBurnPreviewCache");
    expect(source).not.toContain("stabilizeReadableTransferPreview");
    expect(source).not.toContain("isBizarreTransferPreview");
    expect(source).not.toContain("strongestBacktrack");
    expect(source).not.toContain("strongestEndpointOvershoot");
    expect(source).not.toContain("lengthRatio > 2.15");
    expect(source).toContain("getSnapshotForDisplayTurn");
    expect(trajectoryPreviewSource).toContain("getNodeOrbitTangentPoint");
    expect(trajectoryPreviewSource).toContain("nodeRenderData.ringRadius");
    expect(trajectoryPreviewSource).toContain("chooseLambertLiteArc");
    expect(source).toContain("type ResolvedBurnTrajectory");
    expect(source).toContain("type ResolvedFireTrajectory");
    expect(source).toContain("private resolveBurnTrajectory(");
    expect(source).toContain("private resolveFireTrajectory(");
    expect(source).toContain("createBurnTrajectoryMesh");
    expect(source).toContain("createBurnTrajectoryDash");
    expect(source).toContain("createBurnTrajectoryDashLayer");
    expect(source).toContain("createBurnTrajectoryDashMaterial");
    expect(source).toContain("createBurnTrajectoryPlaneReflectionMaterial");
    expect(source).toContain('"burn-trajectory-plane-reflection"');
    expect(source).toContain("trajectoryPlaneReflectionVerticalScale");
    expect(source).toContain("reflection.scale.set(1, -trajectoryPlaneReflectionVerticalScale, 1)");
    expect(source).toContain("trajectoryPlaneReflectionDistanceDepthRatio");
    expect(source).toContain("reflection.position.set(0, -reflectionDepth, 0)");
    expect(source).toContain("trajectoryPlaneReflectionScreenOffsetY");
    expect(source).toContain("A small refractive split keeps the reflection legible");
    expect(source).toContain("firePreviewReflectionOpacityBoost");
    expect(source).toContain("firePreviewReflectionWidthBoost");
    expect(source).toContain("firePreviewReflectionAccentBoost");
    expect(source).toContain("firePreviewReflectionScreenOffsetScale");
    expect(source).toContain("readability * firePreviewReflectionScreenOffsetScale");
    expect(source).toContain("readability: isPreview ? 1 : 0");
    expect(source).toContain("uniform float reflectionReadability");
    expect(source).toContain("float continuousSilhouette =");
    expect(source).toContain("* reflectionReadability\n          * angularVisibility");
    expect(source).toContain("trajectoryPlaneReflectionMinimumAngularVisibility = 0.12");
    expect(source).toContain("trajectoryPlaneReflectionMaximumAngularVisibility = 0.62");
    expect(source).toContain("trajectoryPlaneReflectionViewGrazingExponent = 1.35");
    expect(source).toContain("trajectoryPlaneReflectionSolarGlintExponent = 10");
    expect(source).toContain("trajectoryPlaneReflectionSolarGlintVisibilityBoost = 0.82");
    expect(source).toContain("trajectoryPlaneReflectionMinimumAccentVisibility = 0.1");
    expect(source).toContain("trajectoryPlaneReflectionSolarGlintAccentBoost = 1.45");
    expect(source).toContain("trajectoryPlaneReflectionMaximumTurnMarkers = 24");
    expect(source).toContain("trajectoryPlaneReflectionTurnMarkerCoreInnerRadius = 0.018");
    expect(source).toContain("trajectoryPlaneReflectionTurnMarkerCoreOuterRadius = 0.085");
    expect(source).toContain("trajectoryPlaneReflectionTurnMarkerHaloInnerRadius = 0.07");
    expect(source).toContain("trajectoryPlaneReflectionTurnMarkerHaloOuterRadius = 0.3");
    expect(source).toContain("trajectoryPlaneReflectionTurnMarkerCoreGain = 0.86");
    expect(source).toContain("trajectoryPlaneReflectionTurnMarkerNeighborGain = 0.34");
    expect(source).toContain("trajectoryPlaneReflectionTurnMarkerColorGain = 0.38");
    expect(source).toContain("uniform vec3 sunPosition");
    expect(source).toContain("uniform float reflectionTurnCount");
    expect(source).toContain("vReflectionSolarAlignment");
    expect(source).toContain("vec3 reflectedLight = reflect(-lightDirection, planeNormal)");
    expect(source).toContain("float viewGrazingProfile = pow(");
    expect(source).toContain("float solarGlintLobe = pow(");
    expect(source).toContain("float angularVisibility =");
    expect(source).toContain("float glintAngularVisibility =");
    expect(source).toContain("* glintAngularVisibility");
    expect(source).toContain("* angularVisibility;");
    expect(source).toContain("const reflectionSunPosition = options.sunPosition ?? mapPlaneOrigin");
    expect(source).toContain("reflectionSunPosition.copy(sunPosition)");
    expect(source).toContain("Math.round(options.turnCount ?? 0)");
    expect(source).toContain("float turnMarkerCore =");
    expect(source).toContain("float turnMarkerHalo =");
    expect(source).toContain("turnMarkerHalo *");
    expect(source).toContain("float turnPatternMask =");
    expect(source).toContain("float turnColorHighlight = clamp(");
    expect(source).toContain("turnCount: plan.missileEtaTurns");
    expect(source).toContain("turnCount: plan.etaTurns");
    expect(source).toContain("turnCount: options.turnCount");
    expect(source).toContain('reflection.userData["usesSharedGeometry"] = true');
    expect(source).toContain("float glintCenter = trajectoryAccentPhase");
    expect(source).toContain('"trajectoryAccentSpeed"');
    expect(source).toContain("trajectoryAccentStrength");
    expect(source).toContain("uniform float trajectoryContinuousSilhouette");
    expect(source).toContain("max(dashMask, continuousMask)");
    expect(source).toContain("planeReflection.showAnimatedAccent ? 1.2 : 0");
    expect(source).toContain("showAnimatedAccent: isPreview");
    expect(source).toContain("const isBurnHoverPreview = group === this.burnPreviewGroup");
    expect(source).toContain("readability: isBurnHoverPreview ? 1 : 0");
    expect(source).toContain("showAnimatedAccent: isBurnHoverPreview");
    expect(source).toContain(
      "accentSpeed: isBurnHoverPreview\n          ? this.tuning.firePreviewEffectFlowSpeed\n          : this.tuning.burnPreviewEffectFlowSpeed"
    );
    expect(renderFireArcStart).toBeGreaterThanOrEqual(0);
    expect(resolveFireTrajectoryStart).toBeGreaterThan(renderFireArcStart);
    expect(renderFireArcSource).toContain("createBurnTrajectoryMesh(");
    expect(renderFireArcSource).toContain("const isPreview = group === this.firePreviewGroup");
    expect(renderFireArcSource).toContain("accentSpeed: this.tuning.firePreviewEffectFlowSpeed");
    expect(renderFireArcSource).toContain(
      "continuousSilhouette: isPreview ? 0.2 : activeProgress === undefined ? 0.12 : 0.08"
    );
    expect(renderFireArcSource).toContain("readability: isPreview ? 1 : 0");
    expect(renderFireArcSource).toContain("showAnimatedAccent: isPreview");
    expect(renderBurnArcSource).toContain("createBurnTrajectoryMesh(");
    expect(renderBurnArcSource).toContain("showAnimatedAccent: isBurnHoverPreview");
    expect(source).toContain("showAnimatedAccent: false");
    expect(source).toContain("const reflectionSourcePoints =");
    expect(source).toContain(
      "flightPath === null ? presentationBasePoints : flightPath.transferPoints"
    );
    expect(source).toContain("points: reflectionPoints");
    expect(source).toContain("* trajectoryAccentStrength;");
    expect(source).toContain("this.tuning.firePreviewEffectFlowSpeed");
    expect(source).toContain("this.tuning.burnPreviewEffectFlowSpeed");
    expect(source).toContain("enabled: this.shouldRenderTrajectoryPlaneReflection(group)");
    expect(source).toContain("enabled: hasPlaneReflection");
    expect(source).toContain(
      'private trajectoryReflectionMode: CinematicTrajectoryReflectionMode = "hover"'
    );
    expect(source).toContain('this.tacticalPresentationLastSignature = "";');
    expect(source).toContain("this.trajectoryReflectionMode,");
    expect(source).toContain("group === this.activeBurnGroup");
    expect(source).toContain("group === this.activeMissileGroup");
    expect(source).toContain(
      "Keep one ribbon,\n      // reflection, and accent phase across that boundary"
    );
    expect(source).toContain("createBurnTrajectoryRibbonGeometry");
    expect(source).toContain('"ribbonTangent"');
    expect(source).toContain('"ribbonSideSign"');
    expect(source).toContain("vec3 cameraFacingSide = cross(worldTangent, viewDirection);");
    expect(source).toContain("ribbonSide * ribbonSideSign * ribbonHalfWidth");
    expect(source).toContain("side: THREE.DoubleSide");
    expect(source).not.toContain(
      "createBurnTrajectoryMesh(\n      visiblePoints,\n      color,\n      isAffordable ? opacity : opacity * 0.48,\n      activeProgress === undefined ? this.presentationElapsed : this.presentationElapsed * 1.55,\n      group === this.burnPreviewGroup\n        ? this.tuning.burnPreviewThicknessMultiplier *\n            (isAffordable ? 1 : 0.72) *\n            zoomOutThicknessMultiplier\n        : zoomOutThicknessMultiplier,\n      !isAffordable,\n      false,\n      this.camera.position"
    );
    expect(source).not.toContain("createBurnTrajectoryRibbonFrame");
    expect(source).toContain("const dashLength = dashCycle * (isInvalid ? 0.44 : 0.58)");
    expect(source).toContain("dashPosition = mod(alongDistance - dashPhase + dashCycle");
    expect(source).toContain("dashCycle * 0.16");
    expect(source).toContain("smoothstep(0.66, 1.04, lateral)");
    expect(source).toContain("lateralMask");
    expect(createBurnTrajectoryDashStart).toBeGreaterThanOrEqual(0);
    expect(getMissileFlightProgressStart).toBeGreaterThan(createBurnTrajectoryDashStart);
    expect(burnTrajectoryDashSource).not.toContain("TubeGeometry");
    expect(source).toContain("burnPreviewThicknessMultiplier");
    expect(source).toContain("getBurnTrajectoryZoomOutThicknessMultiplier");
    expect(source).toContain("burnTrajectoryZoomOutThicknessBoost");
    expect(source).not.toContain("let startDistance =");
    expect(source).toContain("burnLaunchTransitionHoldMs");
    expect(source).toContain("mandatoryLaunchTransitionDurationMs = 620");
    expect(source).toContain("mandatoryLaunchTransitionStartHoldMs = 28");
    expect(source).toContain("mandatoryLaunchTransitionArrivalHoldMs = 70");
    expect(source).toContain("private isFastMandatoryLaunchTransition(");
    expect(source).toContain("order.mandatoryLaunchId === undefined");
    expect(source).toContain(
      "Math.min(this.tuning.turnAnimationDurationMs, mandatoryLaunchTransitionDurationMs)"
    );
    expect(source).toContain(
      "? mandatoryLaunchTransitionArrivalHoldMs\n      : arrivalTransitionHoldMs"
    );
    expect(source).toContain("this.turnTransition.from.pendingBurnOrders");
    expect(source).toContain("captureDepartingBurnLaunchSamples(from, to)");
    expect(source).toContain("getTransitionDepartingBurnTransits(from, to)");
    expect(source).toContain("getTransitionLaunchedMissiles(from, to)");
    expect(source).not.toContain("getCachedFutureNodeGhost(");
    expect(source).toContain("closeBurnPreviewDestinationLoop(");
    expect(resolveBurnTrajectorySource).toContain("presentationPoints");
    expect(renderFutureBodyPreviewSource).toMatch(
      /if \(isHoverPreview\) \{[\s\S]*?this\.getCachedFutureBodyGhost\(/
    );
    expect(renderFutureBodyPreviewSource.match(/this\.getCachedFutureBodyGhost\(/g)).toHaveLength(
      1
    );
    expect(source).toContain("activeBurnLaunchPositions");
    expect(source).toContain("activeBurnLaunchAngles");
    expect(trajectoryPreviewSource).toContain("DepartureOrbitRenderData");
    expect(trajectoryPreviewSource).toContain("departureOrbit");
    expect(source).toContain("createLaunchOriginRenderData");
    expect(trajectoryPreviewSource).toContain("createOrbitalDepartureTransferPoints");
    expect(trajectoryPreviewSource).toContain("chooseShortestNodeOrbitDirection");
    expect(source).toContain("createActiveBurnLaunchOriginRenderData");
    expect(source).toContain("createActiveMissileLaunchOriginRenderData");
    expect(source).toContain("createPreviewFireLaunchOriginRenderData");
    expect(source).toContain("createPositionOriginRenderData");
    expect(createPreviewBurnLaunchOriginSource).toContain("previewLaunchKey");
    expect(createPreviewBurnLaunchOriginSource).toContain(
      "const previewLaunchKey = getBurnPreviewLaunchKey(plan);"
    );
    expect(createPreviewBurnLaunchOriginSource).toContain(
      "getStableBurnTransferFieldAngle(previewLaunchKey)"
    );
    expect(createPreviewBurnLaunchOriginSource).toContain("capturedLaunchPosition: undefined");
    expect(createPreviewBurnLaunchOriginSource).not.toContain(
      "this.getRenderedShipMarkerWorldPosition"
    );
    expect(createPreviewBurnLaunchOriginSource).not.toContain("this.getBurnPlanFactionId");
    expect(source).toContain("captureDepartingBurnLaunchSamples");
    expect(source).toContain(
      "this.getRenderedShipMarkerWorldPosition(\n        transit.originNodeId,\n        transit.factionId"
    );
    expect(createPreviewFireLaunchOriginSource).toContain("previewLaunchKey");
    expect(createPreviewFireLaunchOriginSource).toContain(
      "getStableBurnTransferFieldAngle(previewLaunchKey)"
    );
    expect(createPreviewFireLaunchOriginSource).toContain(
      "this.getRenderedShipMissileLaunchSample("
    );
    expect(createPreviewFireLaunchOriginSource).toContain("plan.originNodeId, factionId");
    expect(createPreviewFireLaunchOriginSource).toContain(
      "const currentOrigin = this.getCurrentDisplayNodeRenderData(plan.originNodeId);"
    );
    expect(createPreviewFireLaunchOriginSource).toContain("this.reprojectCapturedLaunchPosition(");
    expect(createPreviewFireLaunchOriginSource).toContain("center: currentOrigin.center");
    expect(createPreviewFireLaunchOriginSource).toContain("ringRadius: currentOrigin.ringRadius");
    expect(createPreviewFireLaunchOriginSource).toContain(
      "capturedLaunchPosition: renderedLaunchPosition"
    );
    expect(createPreviewFireLaunchOriginSource).toContain("destination: baseTarget");
    expect(createPreviewFireLaunchOriginSource).not.toContain("this.getFireTargetRenderData(");
    expect(getFireTargetRenderDataSource).toContain(
      "const lockedTargetOrbitAngle = this.getFirePlanTargetOrbitAngle(plan);"
    );
    expect(getFireTargetRenderDataSource).not.toContain('if (!("id" in plan))');
    expect(source).toContain(
      "private getFirePlanTargetOrbitAngle(plan: RenderableFirePlan): number | undefined"
    );
    expect(source).toContain(
      'if ("launchedTurn" in plan) {\n      return this.activeMissileTargetAngles.get(plan.id);\n    }'
    );
    expect(resolveFireTrajectorySource).toContain("canonicalFirePreviewTargetMode");
    expect(resolveFireTrajectorySource).toContain(
      "const target = this.getFireTargetRenderData(plan, baseTarget);"
    );
    expect(resolveFireTrajectorySource).not.toContain('"orbit-center"');
    expect(resolveFireTrajectorySource).toContain(
      "`${this.getFirePlanPresentationKey(plan)}:${resolvedTargetMode}`"
    );
    expect(source).not.toContain('"orbit-center"');
    expect(source).not.toContain("private getFirePreviewRenderedPoints(");
    expect(source).toContain("dashTerminalAnchorProgress");
    expect(source).toContain("max(min(lead, trail), terminalAnchor)");
    expect(source).not.toContain("clipFirePreviewToImpactMarker");
    expect(source).not.toContain("getFutureFireImpactMarkerClearanceWorld");
    expect(source).toContain("showTerminalLock: false");
    expect(source).toContain('rulerTicks.name = "fire-target-prediction-ruler-ticks"');
    expect(source).toContain("function createFutureFireImpactTicksGeometry()");
    expect(source).toContain("plan.originPosition");
    expect(source).toContain(
      "this.getDisplayNodeRenderDataAtTurn(plan.originNodeId, plan.issuedTurn) ??"
    );
    expect(trajectoryPreviewSource).toContain("measurePolylineLength(transferPoints)");
    expect(trajectoryPreviewSource).toContain("measurePolylineLength(insertionPoints)");
    expect(source).toContain("type ActiveBurnVisualTiming");
    expect(source).toContain("activeBurnVisualTimings");
    expect(source).toContain("type ArrivalOrbitHandoff");
    expect(source).toContain("arrivalOrbitHandoffs");
    expect(source).toContain("captureArrivingBurnOrbitHandoffs(from, to)");
    expect(source).toContain(
      "getArrivalOrbitHandoffKey(transit.destinationNodeId, transit.factionId)"
    );
    expect(source).toContain("startedAtElapsed: null");
    expect(source).toContain("handoff.startedAtElapsed = elapsed");
    expect(source).toContain("handoff.arrivalAngle +");
    expect(source).toContain("getNodeShipOrbitAngleForFormation(");
    expect(source).toContain("pruneArrivalOrbitHandoffs(transition.to)");
    expect(source).toContain("this.arrivalOrbitHandoffs.clear();");
    expect(source).toContain("getActiveBurnVisualProgress");
    expect(source).toContain("computeActiveBurnVisualTiming");
    expect(source).toContain("computeFusionIgnitionPresentationTiming(transit.etaTurns, seed)");
    expect(source).not.toContain("applyFusionIgnitionMotionKick(");
    expect(source).not.toContain("getFusionIgnitionGlowTexture()");
    expect(source).not.toContain("active-burn-fusion-ignition");
    expect(source).not.toContain("ignitionWorldPosition");
    expect(source).not.toContain("sampleFusionIgnitionFlash(");
    expect(source).not.toContain("FusionIgnitionStarburst");
    expect(source).not.toContain("active-burn-fusion-ignition-shockwave");
    expect(source).not.toContain("active-burn-fusion-ignition-halo");
    expect(source).toContain("activeBurnVisualMinimumTravelWindow");
    expect(source).toContain("hashStringToUnitInterval(transit.id)");
    expect(source).toContain("getShipMarkerTimelineElapsed");
    expect(source).toContain("this.visualTurn * replayTimelineSecondsPerTurn");
    expect(source).toContain("isTimelinePreviewActive");
    expect(animateTurnTransitionSource).toContain("animateTurnTransitionInternal(");
    expect(animateTurnTransitionSource).toContain("false");
    expect(animateTurnTransitionSource).toContain("animateReplayTransition");
    expect(animateTurnTransitionSource).toContain("true");
    expect(updateTurnTransitionSource).toContain("transition.isReplay");
    expect(updateTurnTransitionSource).toContain("? progress");
    expect(updateTurnTransitionSource).toContain(
      ": easeTurnProgress(progress, this.tuning.turnAnimationEase)"
    );
    expect(updateTurnTransitionSource).toContain("this.snapshot = transition.to");
    expect(updateTurnTransitionSource).toContain("this.visualTurn = transition.to.turn");
    expect(updateTurnTransitionSource).toContain("presentationStateProgress");
    expect(updateTurnTransitionSource).toContain(
      "transition.to,\n      easedProgress,\n      presentationStateProgress"
    );
    expect(updateTurnTransitionSource).toContain(
      "(transition.to.turn - transition.from.turn) * easedProgress"
    );
    expect(source).toContain("activeBurnDisplayScaleFocusTargetKeys");
    expect(source).toContain("activeBurnDisplayScaleDistances");
    expect(source).toContain("getDisplayScaleFocusTargetKey()");
    expect(source).toContain("getDisplayScaleDistance()");
    expect(source).toContain("getRenderedShipMarkerWorldPosition");
    expect(source).toContain("createActiveBurnLaunchOriginRenderData");
    expect(source).toContain("type ActiveBurnBodyClearance");
    expect(source).toContain("getActiveBurnFlightClearanceBodies");
    expect(source).toContain("addActiveBurnFlightClearanceBodiesFromSnapshot");
    expect(source).toContain("applyActiveBurnBodyClearance");
    expect(trajectoryPreviewSource).toContain("getActiveBurnBodyClearancePoint");
    expect(trajectoryPreviewSource).toContain("activeBurnBodyClearanceMultiplier");
    expect(source).toContain('body.visualClass === "star"');
    expect(trajectoryPreviewSource).toContain(
      "clearanceBodies: readonly ActiveBurnBodyClearance[] = []"
    );
    expect(getPlanOriginSource.indexOf('"departedTurn" in plan')).toBeLessThan(
      getPlanOriginSource.indexOf("createPositionOriginRenderData(plan)")
    );
    expect(source).toContain(
      "(order.originNodeId === focusedNodeId || order.destinationNodeId === focusedNodeId)"
    );
    expect(source).toContain("preserveDepartingBurnNodeFocus(");
    expect(source).toContain(
      "departingOrder.destinationNodeId === focusedNodeId ? destinationTargetKey : originTargetKey"
    );
    expect(source).toContain("order.originNodeId === focusedNodeId");
    expect(source).not.toContain("shouldStartDepartureArrivalChaseFromNode");
    expect(source).toContain("arrivalChaseMinimumShipDetailProgress");
    expect(source).toContain("startArrivalChaseCameraForTransit");
    expect(source).toContain("{ preserveFraming: true }");
    expect(source).toContain('phase: "orbit-handoff"');
    expect(source).toContain("handoffFromFocus: this.focus.clone()");
    expect(source).toContain("resolveArrivalOrbitHandoffProgress(");
    expect(source).toContain("resolveArrivalOrbitHandoffDistance({");
    expect(source).not.toContain("findArrivalChaseOrbitalShipPosition");
    expect(source).toContain("this.selectedTargetKey === destinationTargetKey");
    expect(source).toContain("buildActiveBurnFlightPath");
    expect(trajectoryPreviewSource).toContain("getTransferArcGeometry");
    expect(source).toContain("slicePolylineByDistance");
    expect(source).toContain("sliceActiveBurnFlightPathFromProgress");
    expect(source).toContain("getActiveBurnTrajectoryCoreRadiusLimit");
    expect(source).toContain("activeBurnCoreRadiusLimit");
    expect(trajectoryPreviewSource).toContain("createNodeOrbitInsertionArcPoints");
    expect(trajectoryPreviewSource).toContain("chooseNodeOrbitDirectionFromIncomingTangent");
    expect(trajectoryPreviewSource).toContain("const finalTransfer =");
    expect(trajectoryPreviewSource).toContain(
      "return finalTransfer.map((point) => point.clone());"
    );
    expect(source).toContain("sampleActiveBurnPhysicalMotion");
    expect(trajectoryPreviewSource).toContain("getActiveBurnTransferProgress");
    expect(trajectoryPreviewSource).toContain("point.y = nodeRenderData.center.y;");
    expect(trajectoryPreviewSource).toContain("destination.ringRadius * 1.13");
    expect(trajectoryPreviewSource).toContain("activeBurnNodeOrbitHeightOffset");
    expect(trajectoryPreviewSource).not.toContain("activeBurnNodeOrbitHeightScale * nodeScale");
    expect(trajectoryPreviewSource).not.toContain("0.42 * nodeScale");
    expect(source).toContain("activeBurnPickables");
    expect(source).toContain("activeBurnTargetPositions");
    expect(source).toContain("activeBurnTargetMarkerRadii");
    expect(source).toContain("retargetDepartingBurnFocus(from)");
    expect(source).toContain("handoffArrivedBurnFocus(transition)");
    expect(source).toContain("isBurnTargetKey(targetKey)");
    expect(source).toContain("this.trackedFocusTargetKey = targetKey");
    expect(source).not.toContain("this.trackedFocusTargetKey = burnTargetKey");
    expect(source).toContain("createActiveBurnPickerObject");
    expect(source).toContain("showSelectedTargetMarker");
    expect(source).toContain("return true;");
    expect(source).toContain("this.setSelectedTarget(null);");
    expect(source).not.toContain("getSelectedTransitHoverBurnPlan");
    expect(source).not.toContain("onActiveBurnRedirectRequested");
    expect(source).not.toContain("this.onActiveBurnRedirectRequested(");
    expect(source).not.toContain("sample.originPosition");
    expect(source).not.toContain("this.onBurnOrderRequested(selectedTransit.destinationNodeId");
    expect(source).toContain("this.getBurnTrajectoryColor(transit)");
    expect(source).toContain("getTrajectoryLabelAnchor(renderedPoints)");
    expect(source).toContain("getBurnFutureLabelAnchor");
    expect(source).toContain("getFutureBurnDestinationLineRadius");
    expect(source).toContain("type OrbitTimingSegmentEndpoints");
    expect(source).toContain("clipOrbitTimingSegment(points, endpoints)");
    expect(source).toContain("clipOrbitTimingPolylineStartToClearance");
    expect(source).toContain("getOrbitTimingEndpointClearance");
    expect(source).toContain("Math.max(bodyClearance, orbitClearance)");
    expect(source).toContain("getBurnTrajectoryLabelAnchor(points)");
    expect(source).toContain("burnPreviewHoverZones.push");
    expect(source).toContain("new THREE.CircleGeometry");
    expect(source).toContain("filledRingPoints");
    expect(source).toContain("isPointInsideScreenPolygon");
    expect(styles).toContain("cinematic-selected-focus-bracket--left");
    expect(styles).toContain("cinematic-selected-focus-bracket--right");
    expect(styles).not.toContain("cinematic-selected-node-marker__fin");
    expect(source).not.toContain("CubicBezierCurve3");
    expect(sampleMotionStart).toBeGreaterThanOrEqual(0);
    expect(insertionArcStart).toBeGreaterThan(sampleMotionStart);
    expect(sampleMotionSource).toContain("flightPath.insertionStart");
    expect(sampleMotionSource).toContain("flightPath.transferPoints");
    expect(sampleMotionSource).toContain("flightPath.insertionPoints");
    expect(sampleMotionSource).toContain("getActiveBurnTransferProgress");
    expect(sampleMotionSource).not.toContain(
      "return samplePolylineAtProgress(flightPath, progress);"
    );
    expect(resolveBurnTrajectoryStart).toBeGreaterThanOrEqual(0);
    expect(renderBurnArcStart).toBeGreaterThan(resolveBurnTrajectoryStart);
    expect(renderActiveBurnMarkerStart).toBeGreaterThan(renderBurnArcStart);
    expect(renderFutureBodyPreviewStart).toBeGreaterThan(renderActiveBurnMarkerStart);
    expect(resolveBurnTrajectorySource).toContain("buildActiveBurnFlightPath");
    expect(resolveBurnTrajectorySource).toContain("activeBurnClearanceBodies");
    expect(resolveBurnTrajectorySource).toContain("applyActiveBurnBodyClearance");
    expect(resolveBurnTrajectorySource).not.toContain("shouldUseZoomStablePreview");
    expect(resolveBurnTrajectorySource).not.toContain(
      "group === this.burnPreviewGroup || group === this.pendingBurnGroup"
    );
    expect(resolveBurnTrajectorySource).toContain("buildZoomStableBurnPreviewTrajectory(");
    expect(resolveBurnTrajectorySource).toContain("trajectoryArcDirection");
    expect(resolveBurnTrajectorySource).toContain("sliceActiveBurnFlightPathAheadOfShip");
    expect(resolveBurnTrajectorySource).toContain("activeProgress === undefined");
    expect(resolveFireTrajectorySource).toContain("buildMissileTrajectoryPreview(");
    expect(resolveFireTrajectorySource).toContain("includeDepartureContinuity:");
    expect(resolveFireTrajectorySource).toContain(
      "origin.departureOrbit !== undefined || origin.departureDirection !== undefined"
    );
    expect(renderBurnArcSource).toContain("this.resolveBurnTrajectory(");
    expect(renderBurnArcSource).toContain("activeProgress === undefined ? 1 : 1.55");
    expect(renderBurnArcSource).toContain("this.getPresentationBeatPulse()");
    expect(renderBurnArcSource).toContain("this.camera.position");
    expect(renderBurnArcSource).toContain("trajectoryData.activeCoreRadiusLimit");
    expect(renderBurnArcSource).toContain(
      "showFutureMarker && isAffordable && group !== this.burnPreviewGroup"
    );
    expect(source).toContain("this.hoveredTargetKey === `node:${sample.plan.destinationNodeId}`");
    expect(source).not.toContain("private renderBurnFutureOrbitEffect(");
    expect(source).not.toContain("burn-preview-future-orbit-flow:");
    expect(source).toContain('const isHoverPreview = !("id" in plan)');
    expect(source).not.toContain("`burn-preview-node:${presentationKey}`");
    expect(resolveBurnTrajectorySource).toContain("closeBurnPreviewDestinationLoop(");
    expect(resolveBurnTrajectorySource).toContain(
      "const presentationBasePoints = flightPath === null ? visiblePoints : points"
    );
    expect(resolveBurnTrajectorySource).toContain("flightPath?.insertionPoints[0]");
    expect(resolveBurnTrajectorySource).toContain("getBurnPreviewDestinationLoopDirection(");
    expect(renderPendingBurnFutureDestinationLinkStart).toBeGreaterThan(renderBurnArcStart);
    expect(getBurnTrajectoryZoomOutThicknessMultiplierStart).toBeGreaterThan(
      renderPendingBurnFutureDestinationLinkStart
    );
    expect(source).toContain("type FutureOrbitTimingPreview");
    expect(source).toContain("createFutureOrbitTimingPreview(");
    expect(source).toContain("getFutureOrbitTimingStartNodeRenderData(");
    expect(source).toContain(
      "const visibleStartTurn = clamp(this.visualTurn, startTurn, targetTurn)"
    );
    expect(source).toContain("getFutureOrbitTimingSampleTurns(");
    expect(source).toContain("roundFutureOrbitTimingSampleTurn(sampleTurn)");
    expect(source).toContain(
      "const fractionalSampleCount = Math.round(clamp(duration * 6, 6, 24))"
    );
    expect(renderPendingBurnFutureDestinationLinkSource).toContain("timingPreview.points");
    expect(renderPendingBurnFutureDestinationLinkSource).toContain("timingPreview.target");
    expect(renderPendingBurnFutureDestinationLinkSource).toContain(
      "this.getBurnOrbitTimingSegmentEndpoints(timingPreview, resolvedTrajectory)"
    );
    expect(renderPendingBurnFutureDestinationLinkSource).toContain('"astronomical"');
    expect(source).toContain("endClearanceWorld: getOrbitTimingGhostCenterClearance(");
    expect(source).toContain("interruptions: [");
    expect(renderPendingBurnFutureDestinationLinkSource).not.toContain(
      "[currentDestination.center, futureDestination.center]"
    );
    expect(renderPendingBurnFutureDestinationLinkSource).not.toContain(
      "[origin.center, destination.center]"
    );
    expect(createOrbitTimingSegmentStart).toBeGreaterThanOrEqual(0);
    expect(createOrbitTimingDotStart).toBeGreaterThan(createOrbitTimingSegmentStart);
    expect(orbitTimingSegmentSource).toContain("new THREE.Points(");
    expect(orbitTimingSegmentSource).toContain("createOrbitTimingDottedTrackPoints(");
    expect(orbitTimingSegmentSource).toContain("getOrbitTimingDottedTrackTexture()");
    expect(orbitTimingSegmentSource).toContain("sizeAttenuation: false");
    expect(orbitTimingSegmentSource).toContain('"future-orbit-timing-dotted-track"');
    expect(orbitTimingSegmentSource).toContain('"astronomical-orbit-ephemeris-dotted-track"');
    expect(orbitTimingSegmentSource).toContain("THREE.NormalBlending");
    expect(orbitTimingSegmentSource).toContain("new THREE.Color(0xa8c4cf)");
    expect(orbitTimingSegmentSource).toContain('track.userData["extremeZoomUiFade"] = true');
    expect(orbitTimingDotSource).toContain('dot.userData["extremeZoomUiFade"] = true');
    expect(orbitTimingDotSource).toContain('"astronomical-orbit-ephemeris-point"');
    expect(orbitTimingDotSource).toContain("isAstronomical ? 0.72 : 1.75");
    expect(orbitTimingDotSource).toContain("dot.material.depthTest = isAstronomical");
    expect(source).toContain('ghost.userData["extremeZoomUiFade"] = true');
    expect(source).toContain('ghost.userData["extremeZoomCelestialGhostFade"] = true');
    expect(source).toContain("getExtremeZoomCelestialGhostOpacityMultiplier");
    expect(source).toContain("fadeMarkedExtremeZoomCelestialGhosts(");
    expect(source).toContain('marker.userData["extremeZoomUiFade"] = true');
    expect(orbitTimingSegmentSource).toContain("depthTest: true");
    expect(orbitTimingSegmentSource).not.toContain("TubeGeometry");
    expect(renderActiveBurnMarkerSource).toContain(
      "this.resolveBurnTrajectory(transit, this.activeBurnGroup, progress, arrivalAngle, null)"
    );
    expect(renderActiveBurnMarkerSource).toContain(
      "sampleActiveBurnPhysicalMotion(trajectory.flightPath, progress)"
    );
    expect(renderActiveBurnMarkerSource).toContain("allowDriveWakeDetail: true");
    expect(renderActiveBurnMarkerSource).toContain("driveWakeVisibility,");
    expect(renderActiveBurnMarkerSource).toContain("marker.rotation.y = getYawForDirection(");
    expect(source).not.toContain("activeBurnRetroTurnStartProgress");
    expect(source).not.toContain("activeBurnRetroTurnDuration");
    expect(source).not.toContain("getActiveBurnRetroTurnProgress");
    expect(source).not.toContain("retroTurnProgress");
    expect(source).not.toContain("retroTurnPulse");
    expect(renderActiveBurnMarkerSource).not.toContain(
      "allowDriveWakeDetail: !this.isMinimalPerformanceMode()"
    );
    expect(animateTurnTransitionSource.indexOf("this.syncScene(from);")).toBeLessThan(
      animateTurnTransitionSource.indexOf("this.captureDepartingBurnLaunchSamples(from, to);")
    );
    expect(animateTurnTransitionSource.indexOf("this.animatePresentationOnly")).toBeLessThan(
      animateTurnTransitionSource.indexOf("this.captureDepartingBurnLaunchSamples(from, to);")
    );
    expect(updateTurnTransitionStart).toBeGreaterThanOrEqual(0);
    expect(updateFocusPanTransitionStart).toBeGreaterThan(updateTurnTransitionStart);
    expect(updateTurnTransitionSource).not.toContain(
      "isHoldingArrivalFrame\n      ? this.handoffArrivedBurnFocus"
    );
    expect(burnRequestStart).toBeGreaterThanOrEqual(0);
    expect(burnOriginStart).toBeGreaterThan(burnRequestStart);
    expect(burnRequestSource).toContain("this.settleFocusPanTransition();");
    expect(burnRequestSource.indexOf("this.settleFocusPanTransition();")).toBeLessThan(
      burnRequestSource.indexOf("this.onBurnOrderRequested(originNodeId, destinationNodeId);")
    );
    expect(burnRequestSource).not.toContain("this.focusPanTransition = null;");
    expect(
      burnRequestSource.indexOf("this.onBurnOrderRequested(originNodeId, destinationNodeId);")
    ).toBeLessThan(burnRequestSource.indexOf("this.setSelectedTarget(null);"));
  });
});

function collectTypeScriptFiles(directory: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectTypeScriptFiles(entryPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(entryPath);
    }
  }

  return files;
}
