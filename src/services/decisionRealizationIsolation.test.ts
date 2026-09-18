import { describe, expect, it } from "vitest";
import {
  assertDecisionParityAcrossToneContexts,
  realizeWithToneContext,
  type PlatformDecisionContextV1,
  type ToneOnlyRealizationContextV1,
} from "./decisionRealizationIsolation";

describe("Slice A4 decision/realization isolation", () => {
  it("keeps tone-only demographic keys structurally out of decision context", () => {
    type Forbidden =
      | "explicitFormOfAddress"
      | "explicitFormality"
      | "locale"
      | "language"
      | "gender"
      | "ageBand"
      | "roomContext"
      | "recentStyle";

    type Leaked = Extract<keyof PlatformDecisionContextV1, Forbidden>;
    const noLeak: Leaked extends never ? true : false = true;
    expect(noLeak).toBe(true);
  });

  it("keeps a near-boundary moderation decision identical across tone profiles", () => {
    const decisionContext: PlatformDecisionContextV1 = {
      semanticEvidence: { targetedInsult: true },
      relationshipEvidence: { reciprocalBanter: false },
      appraisalEvidence: { severity: 0.4999 },
      memoryEvidence: { priorWarnings: 1 },
      platformAuthorityFacts: { serverId: "server-A" },
    };

    const toneContexts: ToneOnlyRealizationContextV1[] = [
      {
        explicitFormality: "formal",
        gender: "female",
        ageBand: "adult",
        roomContext: "large_room",
      },
      {
        explicitFormality: "informal",
        gender: "male",
        ageBand: "adult",
        roomContext: "dm",
        recentStyle: { slangLevel: "high", messageLength: "short" },
      },
    ];

    const comparable = assertDecisionParityAcrossToneContexts({
      decisionContext,
      toneContexts,
      decide: (context) => {
        const severity = Number(
          (context.appraisalEvidence as { severity: number }).severity,
        );
        return {
          actionType: severity >= 0.5 ? "member.timeout" : "member.warn",
          confidence: 0.78,
          severity,
          scope: { serverId: "server-A" },
        };
      },
      project: (decision) => decision,
    });

    expect(comparable.actionType).toBe("member.warn");
    expect(comparable.severity).toBe(0.4999);
  });

  it("allows realization wording to differ without changing the frozen decision", () => {
    const decision = {
      continueConversation: true,
      allowQuestion: false,
      actionType: "none",
    };

    const formal = realizeWithToneContext({
      decision,
      toneContext: { explicitFormality: "formal" },
      realize: (d, tone) => ({
        decision: d,
        text: tone.explicitFormality === "formal" ? "Hoş geldiniz." : "Hoş geldin.",
      }),
    });
    const informal = realizeWithToneContext({
      decision,
      toneContext: { explicitFormality: "informal" },
      realize: (d, tone) => ({
        decision: d,
        text: tone.explicitFormality === "formal" ? "Hoş geldiniz." : "Hoş geldin.",
      }),
    });

    expect(formal.decision).toEqual(informal.decision);
    expect(formal.text).not.toBe(informal.text);
  });
});
