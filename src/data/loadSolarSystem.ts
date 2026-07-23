import { solarSystemDataSchema, type SolarSystemData } from "./schemas/solarSystem";

export function parseSolarSystemData(input: unknown): SolarSystemData {
  const parsed = solarSystemDataSchema.safeParse(input);

  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => issue.message).join(" ");
    throw new Error(`Invalid bodies config: ${details}`);
  }

  return parsed.data;
}
