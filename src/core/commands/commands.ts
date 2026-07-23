import type { FactionId, Vec2 } from "../state/types";

export type AdvanceTurnCommand = Readonly<{
  type: "ADVANCE_TURN";
}>;

export type AssignBurnOrderCommand = Readonly<{
  type: "ASSIGN_BURN_ORDER";
  originNodeId: string;
  destinationNodeId: string;
  factionId?: FactionId;
  shipCount?: number;
}>;

export type AssignFireOrderCommand = Readonly<{
  type: "ASSIGN_FIRE_ORDER";
  originNodeId: string;
  targetNodeId: string;
  factionId?: FactionId;
}>;

export type CancelPendingBurnOrderCommand = Readonly<{
  type: "CANCEL_PENDING_BURN_ORDER";
  originNodeId?: string;
  factionId?: FactionId;
}>;

export type CancelPendingFireOrderCommand = Readonly<{
  type: "CANCEL_PENDING_FIRE_ORDER";
  originNodeId?: string;
  factionId?: FactionId;
}>;

export type RedirectActiveBurnCommand = Readonly<{
  type: "REDIRECT_ACTIVE_BURN";
  transitId: string;
  destinationNodeId: string;
  sampleTurn?: number;
  originPosition?: Vec2;
  departureDirection?: Vec2;
  factionId?: FactionId;
}>;

export type GameCommand =
  | AdvanceTurnCommand
  | AssignBurnOrderCommand
  | AssignFireOrderCommand
  | CancelPendingBurnOrderCommand
  | CancelPendingFireOrderCommand
  | RedirectActiveBurnCommand;

export const ADVANCE_TURN_COMMAND: AdvanceTurnCommand = {
  type: "ADVANCE_TURN"
};
