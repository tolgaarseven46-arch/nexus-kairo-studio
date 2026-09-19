import { describe, expect, it } from "vitest";
import {
  decideKairaInviteIntroduction,
  realizeKairaInviteIntroduction,
} from "./kairaInviteIntroduction";

describe("Kaira explicit invite introduction", () => {
  it("is minimal, natural, and only explains the invited role", () => {
    const decision = decideKairaInviteIntroduction({
      actorDisplayName: "Tolga",
      isOwner: true,
    });

    for (let i = 0; i < 24; i += 1) {
      const realized = realizeKairaInviteIntroduction({
        eventId: `invite-${i}`,
        kairaInstanceId: "kaira_reference_001",
        decision,
      });

      expect(realized.text).toBe(
        "Selam 😄 ben Kaira. Sunucuyu yönetirken yanında olacağım.",
      );
      expect(realized.variantId).toBe("kaira_invited_v1");
      expect(realized.text).not.toMatch(/oda adı|nasıl bir ortam|droit|pipeline|yapay zeka/iu);
      expect((realized.text.match(/[.!?]/g) || []).length).toBeLessThanOrEqual(2);
      expect(realized.text).not.toMatch(/\?$/u);
    }
  });

  it("keeps platform access state out of Kaira decision authority", () => {
    const withoutAccess = decideKairaInviteIntroduction({
      actorDisplayName: "Tolga",
      isOwner: true,
    });
    const withPlatformOnlyAccessContext = decideKairaInviteIntroduction({
      actorDisplayName: "Tolga",
      isOwner: true,
    });
    expect(withPlatformOnlyAccessContext).toEqual(withoutAccess);
  });

  it("is deterministic for the same invite event", () => {
    const decision = decideKairaInviteIntroduction({
      actorDisplayName: "Tolga",
      isOwner: true,
    });
    const input = {
      eventId: "invite-same",
      kairaInstanceId: "kaira_reference_001",
      decision,
    };
    expect(realizeKairaInviteIntroduction(input)).toEqual(
      realizeKairaInviteIntroduction(input),
    );
  });
});
