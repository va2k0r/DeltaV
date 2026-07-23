export type DiagnosticCameraDump = Readonly<{
  viewport: Readonly<{
    width: number;
    height: number;
  }>;
  focus: readonly number[];
  yaw: number;
  pitch: number;
  distance: number;
  focusedTargetKey: string | null;
  trackedFocusTargetKey: string | null;
  displayScaleFocusTargetKey: string | null;
  displayScaleDistance: number;
  smoothWheelZoomTargetDistance: number | null;
  arrivalChaseCamera: Readonly<Record<string, unknown>> | null;
  shipyardAssemblyChaseCamera: Readonly<Record<string, unknown>> | null;
}>;

export type DiagnosticGameStateDumpContext = Readonly<{
  copiedAt: string;
  url: string;
  userAgent: string;
  runtime: Readonly<Record<string, unknown>>;
  camera: DiagnosticCameraDump | null;
  map: Readonly<Record<string, unknown>>;
  stateHash: string;
  summary: unknown;
  state: unknown;
  snapshot: unknown;
  trajectoryPreviews: unknown;
  solarVisuals: unknown;
  performance: unknown;
  warningProjectionAudit: unknown;
  command: Readonly<Record<string, unknown>>;
  replay: Readonly<Record<string, unknown>>;
  diagnostics: Readonly<Record<string, unknown>>;
}>;

export function buildDiagnosticGameStateDump(
  context: DiagnosticGameStateDumpContext
): Readonly<Record<string, unknown>> {
  return {
    label: "DeltaV GameState Diagnostic Dump",
    version: 1,
    copiedAt: context.copiedAt,
    url: context.url,
    userAgent: context.userAgent,
    runtime: context.runtime,
    camera: context.camera,
    map: context.map,
    stateHash: context.stateHash,
    summary: context.summary,
    state: context.state,
    snapshot: context.snapshot,
    trajectoryPreviews: context.trajectoryPreviews,
    solarVisuals: context.solarVisuals,
    performance: context.performance,
    warningProjectionAudit: context.warningProjectionAudit,
    command: context.command,
    replay: context.replay,
    diagnostics: context.diagnostics
  };
}
