export const KAIRA_TEST_EXECUTION_GUARD_VERSION = 1 as const;

export type KairaTestExecutionMode = "live" | "test" | "replay";

export interface KairaTestExecutionContextV1 {
  version: typeof KAIRA_TEST_EXECUTION_GUARD_VERSION;
  mode: KairaTestExecutionMode;
  testRunId?: string;
  environmentId?: "test" | "staging" | "live-beta";
}

export type PrivatRoomEffect =
  | "kaira.upstream.request"
  | "room.message.persist"
  | "trial.state.write"
  | "analytics.emit"
  | "webhook.emit"
  | "member.timeout"
  | "member.kick"
  | "member.ban"
  | "message.delete"
  | "server.rules.publish";

const REPLAY_ALLOWED_EFFECTS: ReadonlySet<PrivatRoomEffect> = new Set([]);

export function resolveKairaTestExecutionContext(input: {
  modeHeader?: string | null;
  testRunIdHeader?: string | null;
  environmentIdHeader?: string | null;
}): KairaTestExecutionContextV1 {
  const rawMode = String(input.modeHeader || "").trim().toLowerCase();
  const mode: KairaTestExecutionMode =
    rawMode === "replay" ? "replay" : rawMode === "test" ? "test" : "live";

  const environment =
    input.environmentIdHeader === "test" ||
    input.environmentIdHeader === "staging" ||
    input.environmentIdHeader === "live-beta"
      ? input.environmentIdHeader
      : undefined;

  return {
    version: KAIRA_TEST_EXECUTION_GUARD_VERSION,
    mode,
    testRunId: input.testRunIdHeader?.trim() || undefined,
    environmentId: environment,
  };
}

export function isPrivatRoomEffectAllowed(
  context: KairaTestExecutionContextV1,
  effect: PrivatRoomEffect,
): boolean {
  if (context.mode !== "replay") return true;
  return REPLAY_ALLOWED_EFFECTS.has(effect);
}

export function assertPrivatRoomEffectAllowed(
  context: KairaTestExecutionContextV1,
  effect: PrivatRoomEffect,
): void {
  if (!isPrivatRoomEffectAllowed(context, effect)) {
    throw new Error(`privatroom_replay_side_effect_denied:${effect}`);
  }
}
