import fs from 'node:fs';

const enginePath = 'src/services/kairoDialogueDecisionEngine.ts';
let source = fs.readFileSync(enginePath, 'utf8');

const replacements = [
  [
    'import { interpretSemanticEvent, type SemanticEvent } from "./semanticEventEngine";',
    'import {\n  interpretSemanticEvent,\n  type SemanticEvent,\n  type SemanticSocialRoutine,\n} from "./semanticEventEngine";'
  ],
  [
    '  | "follow_topic_shift"\n  | "natural_reaction";',
    '  | "follow_topic_shift"\n  | "complete_social_routine"\n  | "natural_reaction";'
  ],
  [
    '  move: DialogueMove;\n  target?: string;',
    '  move: DialogueMove;\n  target?: string;\n  socialRoutine?: SemanticSocialRoutine;'
  ],
  [
    '  "follow_topic_shift",\n]);',
    '  "follow_topic_shift",\n  "complete_social_routine",\n]);'
  ],
  [
    '  if (event.discourseAct === "recall_request") {',
    '  if (\n    event.socialRoutine === "greeting" ||\n    event.socialRoutine === "thanks" ||\n    event.socialRoutine === "agreement" ||\n    event.socialRoutine === "goodbye" ||\n    event.socialRoutine === "good_night"\n  ) {\n    return {\n      move: "complete_social_routine",\n      socialRoutine: event.socialRoutine,\n      allowFollowUpQuestion: false,\n      allowSpeculation: false,\n      maxSentences: 1,\n      maxWords: 8,\n      hasSupportedTargetClaim: false,\n      reason:\n        "Kanonik sosyal rutini aynı sosyal işlevle kısa biçimde tamamla. Yeni konu, açıklama, tahmin veya otomatik soru açma.",\n    };\n  }\n\n  if (event.discourseAct === "recall_request") {'
  ],
  [
    '  if (plan.move === "repair_or_rephrase") return "biraz saçmaladım galiba";',
    '  if (plan.move === "repair_or_rephrase") return "biraz saçmaladım galiba";\n  if (plan.move === "complete_social_routine") {\n    if (plan.socialRoutine === "greeting") return "selam";\n    if (plan.socialRoutine === "thanks") return "rica ederim";\n    if (plan.socialRoutine === "agreement") return "aynen";\n    if (plan.socialRoutine === "goodbye") return "görüşürüz";\n    if (plan.socialRoutine === "good_night") return "iyi geceler";\n    return "tamam";\n  }'
  ],
];

for (const [from, to] of replacements) {
  if (!source.includes(from)) throw new Error(`missing engine anchor: ${from.slice(0, 80)}`);
  source = source.replace(from, to);
}
fs.writeFileSync(enginePath, source);

const testPath = 'src/services/kairaTurnTakingSocialRoutineContracts.test.ts';
fs.writeFileSync(testPath, `import { describe, expect, it } from "vitest";
import { interpretSemanticEvent } from "./semanticEventEngine";
import {
  buildGroundedDialogueFallback,
  planDialogueResponse,
} from "./kairoDialogueDecisionEngine";

const routineCases = [
  ["selam", "greeting", "selam"],
  ["teşekkürler", "thanks", "rica ederim"],
  ["aynen", "agreement", "aynen"],
  ["görüşürüz", "goodbye", "görüşürüz"],
  ["iyi geceler", "good_night", "iyi geceler"],
] as const;

describe("canonical turn-taking social routines", () => {
  it.each(routineCases)(
    "preserves %s as a bounded %s adjacency response",
    (message, socialRoutine, fallback) => {
      const event = interpretSemanticEvent(message);
      expect(event.socialRoutine).toBe(socialRoutine);
      const plan = planDialogueResponse([], message, "Ali", event);
      expect(plan).toMatchObject({
        move: "complete_social_routine",
        socialRoutine,
        allowFollowUpQuestion: false,
        allowSpeculation: false,
        maxSentences: 1,
        maxWords: 8,
      });
      expect(buildGroundedDialogueFallback(plan, [], message, "Ali")).toBe(fallback);
    },
  );

  it.each(["naber", "nasılsın kanka", "ne yapıyorsun"])(
    "keeps reciprocal routine question permission: %s",
    (message) => {
      const event = interpretSemanticEvent(message);
      const plan = planDialogueResponse([], message, "Ali", event);
      expect(plan.move).toBe("natural_reaction");
      expect(plan.allowFollowUpQuestion).toBe(true);
    },
  );

  it("keeps a short agreement attached to Kaira's immediate prompt before routine completion", () => {
    const history = [{ sender: "droit", text: "çay mı kahve mi?", participantName: "Kaira" }] as any[];
    const event = interpretSemanticEvent("evet");
    const plan = planDialogueResponse(history, "evet", "Ali", event);
    expect(plan.move).toBe("follow_previous_answer");
  });

  it("consumes the supplied canonical routine instead of inventing a second raw-text meaning", () => {
    const event = { ...interpretSemanticEvent("selam"), raw: "provider-normalized", normalized: "provider-normalized" };
    const plan = planDialogueResponse([], "provider-normalized", "Ali", event);
    expect(plan).toMatchObject({
      move: "complete_social_routine",
      socialRoutine: "greeting",
    });
  });
});
`);

console.log('turn-taking social routine patch applied');
