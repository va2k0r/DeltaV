const sixtyFpsBudgetMs = 1000 / 60;
const presentationCapMinimumFps = 28;
const presentationCapMaximumFps = 35;
const presentationCapCpuMaximumMs = 20;

export function isPresentationLikelyExternallyCapped(options: {
  estimatedFps: number;
  averageCpuMs: number;
  maxCpuMs: number;
  averageGpuMs: number | null;
}): boolean {
  return (
    options.estimatedFps >= presentationCapMinimumFps &&
    options.estimatedFps <= presentationCapMaximumFps &&
    options.averageCpuMs < sixtyFpsBudgetMs &&
    options.maxCpuMs < presentationCapCpuMaximumMs &&
    (options.averageGpuMs === null || options.averageGpuMs < sixtyFpsBudgetMs)
  );
}
