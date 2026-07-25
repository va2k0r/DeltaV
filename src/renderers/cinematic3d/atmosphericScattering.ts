import type { BodySnapshot } from "../../core";

export type AtmosphericScatteringProfile = Readonly<{
  color: number;
  intensityMultiplier: number;
  thicknessMultiplier: number;
  falloffMultiplier: number;
}>;

export function getAtmosphericScatteringProfile(
  body: Pick<BodySnapshot, "id" | "visualClass">
): AtmosphericScatteringProfile | null {
  if (body.visualClass === "protected") {
    return {
      color: 0x67cfff,
      intensityMultiplier: 1,
      thicknessMultiplier: 1,
      falloffMultiplier: 1
    };
  }

  if (body.id === "venus") {
    return {
      color: 0xffc879,
      intensityMultiplier: 0.94,
      thicknessMultiplier: 1.3,
      falloffMultiplier: 0.86
    };
  }

  if (body.id === "mars") {
    return {
      color: 0xff8356,
      intensityMultiplier: 0.58,
      thicknessMultiplier: 0.68,
      falloffMultiplier: 1.22
    };
  }

  if (body.id === "titan") {
    return {
      color: 0xffb95f,
      intensityMultiplier: 0.9,
      thicknessMultiplier: 1.22,
      falloffMultiplier: 0.9
    };
  }

  if (body.visualClass === "gasGiant") {
    return {
      color: body.id === "saturn" ? 0xffdda1 : 0xffc58b,
      intensityMultiplier: body.id === "saturn" ? 0.72 : 0.82,
      thicknessMultiplier: 0.82,
      falloffMultiplier: 1.08
    };
  }

  if (body.visualClass === "iceGiant") {
    return {
      color: body.id === "neptune" ? 0x549cff : 0x8ee8ff,
      intensityMultiplier: body.id === "neptune" ? 0.92 : 0.82,
      thicknessMultiplier: 0.92,
      falloffMultiplier: 0.96
    };
  }

  return null;
}
