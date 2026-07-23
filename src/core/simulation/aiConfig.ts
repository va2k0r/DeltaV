import type { FactionId } from "../state/types";

export const AI_PROFILE_TRYHARD = "tryhard-solvency-v1";
export const AI_PLANNER_NAME = AI_PROFILE_TRYHARD;
export const AI_MIN_DV_RESERVE = 4;
export const AI_CRITICAL_DV = 3;
export const AI_TRYHARD_SOLVENCY_HORIZON_TURNS = 8;
export const AI_ACTION_SOLVENCY_HORIZON_TURNS = 6;
export const AI_CONTESTED_SUSTAIN_TURNS = 2;
export const AI_TRYHARD_MAX_COORDINATED_ACTIONS = 2;
export const AI_TRYHARD_MIN_ACTION_SCORE = 560;
export const AI_TRYHARD_SECOND_TRITIUM_OPENING_END_TURN = 6;
export const AI_STRATEGY_READ_TOO_LATE_TURN = 10;
export const AI_INSOLVENCY_GUARD_HORIZON_TURNS = 3;
export const AI_GREEDY_MIRROR_PAYBACK_TURNS = 4;
export const AI_OPENING_SOLVENCY_HARD_GATE_END_TURN = 8;

export type AiPlanningLevel = 0 | 1 | 2 | 3;

export type AiStrategyProfile = "FIRE" | "NOFIRE";

export type AiPlanningOptions = Readonly<{
  aiLevel?: AiPlanningLevel;
  factionStrategyProfiles?: Readonly<Partial<Record<FactionId, AiStrategyProfile>>>;
  enableForcedEconomicEndgame?: boolean;
}>;

export type EffectiveAiPlanningLevel = 0 | 1 | 3;
