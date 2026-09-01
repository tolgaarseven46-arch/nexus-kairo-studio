const fs = require('fs');

const path = 'server.ts';
let source = fs.readFileSync(path, 'utf8');
function replaceOnce(needle, replacement) {
  if (!source.includes(needle)) throw new Error(`Target not found: ${needle.slice(0, 140)}`);
  source = source.replace(needle, replacement);
}

replaceOnce(
`import {
  buildKairaEpistemicInstruction,
  enforceKairaEpistemicResponse,
} from "./src/services/kairaEpistemicResponsePolicy";`,
`import {
  buildKairaEpistemicInstruction,
  enforceKairaEpistemicResponse,
  findKairaEpistemicResponseIssues,
} from "./src/services/kairaEpistemicResponsePolicy";`,
);

replaceOnce(
`        localPlanIssues = findKairaResponsePlanIssues(reply, responsePlan),
        localBaseConsistency = validateKairoResponse(reply, kdm.trace),
        consistency = {
          ...localBaseConsistency,
          accepted: localBaseConsistency.accepted && localPlanIssues.length === 0,
          score: Math.max(0, localBaseConsistency.score - localPlanIssues.length * 15),
          issues: [...localBaseConsistency.issues, ...localPlanIssues],
        };`,
`        localPlanIssues = findKairaResponsePlanIssues(reply, responsePlan),
        localEpistemicIssues = findKairaEpistemicResponseIssues(reply, epistemicAccess),
        localBaseConsistency = validateKairoResponse(reply, kdm.trace),
        consistency = {
          ...localBaseConsistency,
          accepted: localBaseConsistency.accepted && localPlanIssues.length === 0 && localEpistemicIssues.length === 0,
          score: Math.max(0, localBaseConsistency.score - (localPlanIssues.length + localEpistemicIssues.length) * 15),
          issues: [...localBaseConsistency.issues, ...localPlanIssues, ...localEpistemicIssues],
        };`,
);

replaceOnce(
`    let postEnforcementPlanIssues = findKairaResponsePlanIssues(reply, responsePlan);
    if (postEnforcementPlanIssues.length) {
      const planSafeFallback = buildGroundedDialogueFallback(
        dialogueDecision, cleanHistory, userMessage, userName, dialogueAnalysis, responsePlan.allowQuestion,
      );
      if (planSafeFallback) {
        const planSafeIssues = [
          ...findKairoGroundingIssues(planSafeFallback, cleanHistory, userMessage),
          ...findDialogueAttributionIssues(planSafeFallback, cleanHistory, userMessage, userName, dialogueAnalysis),
          ...findDialogueDecisionIssues(planSafeFallback, dialogueDecision, dialogueOutputStyle),
          ...findKairoResponseRhythmIssues(planSafeFallback, cleanHistory, dialogueDecision.move, speech.relationshipLevel),
          ...findKairaResponsePlanIssues(planSafeFallback, responsePlan),
          ...findWorldModelResponseIssues(planSafeFallback, retrievedWorldEvents).map((issue) => issue.message),
        ];
        if (planSafeIssues.length === 0) {
          reply = planSafeFallback;
          postEnforcementPlanIssues = [];
          enforced.changed = true;
          enforced.reasons.push("response_plan_delivery_fallback");
        }
      }
    }
    const aiMs = Math.round(now() - aiStart);
    const baseConsistency = validateKairoResponse(reply, kdm.trace);
    const finalPlanIssues = postEnforcementPlanIssues;
    const finalIssues = [...new Set([...groundingIssues, ...finalPlanIssues])];`,
`    let postEnforcementPlanIssues = findKairaResponsePlanIssues(reply, responsePlan);
    if (postEnforcementPlanIssues.length) {
      const planSafeFallback = buildGroundedDialogueFallback(
        dialogueDecision, cleanHistory, userMessage, userName, dialogueAnalysis, responsePlan.allowQuestion,
      );
      if (planSafeFallback) {
        const candidateWorldGuard = enforceWorldModelRecallResponse(planSafeFallback, retrievedWorldEvents);
        const candidateEpistemicGuard = enforceKairaEpistemicResponse(candidateWorldGuard.reply, epistemicAccess);
        const candidateBaseEnforced = enforceKairoResponse(candidateEpistemicGuard.reply, kdm.trace, enforcementRules);
        const candidateContractEnforced = enforceBehaviorContract(candidateBaseEnforced.reply, kdm.trace, behaviorContract);
        const candidateReply = candidateContractEnforced.reply;
        const planSafeIssues = [
          ...findKairoGroundingIssues(candidateReply, cleanHistory, userMessage),
          ...findDialogueAttributionIssues(candidateReply, cleanHistory, userMessage, userName, dialogueAnalysis),
          ...findDialogueDecisionIssues(candidateReply, dialogueDecision, dialogueOutputStyle),
          ...findKairoResponseRhythmIssues(candidateReply, cleanHistory, dialogueDecision.move, speech.relationshipLevel),
          ...findKairaResponsePlanIssues(candidateReply, responsePlan),
          ...findKairoAffectiveResponseIssues(candidateReply, kdm.trace),
          ...findWorldModelResponseIssues(candidateReply, retrievedWorldEvents).map((issue) => issue.message),
          ...findKairaEpistemicResponseIssues(candidateReply, epistemicAccess),
        ];
        if (planSafeIssues.length === 0) {
          reply = candidateReply;
          postEnforcementPlanIssues = [];
          enforced.changed = true;
          enforced.reasons.push(
            "response_plan_delivery_fallback",
            ...(candidateWorldGuard.reason ? [candidateWorldGuard.reason] : []),
            ...(candidateEpistemicGuard.reason ? [candidateEpistemicGuard.reason] : []),
            ...candidateBaseEnforced.reasons,
            ...candidateContractEnforced.reasons,
          );
        }
      }
    }
    const aiMs = Math.round(now() - aiStart);
    const baseConsistency = validateKairoResponse(reply, kdm.trace);
    const finalPlanIssues = postEnforcementPlanIssues;
    const finalEpistemicIssues = findKairaEpistemicResponseIssues(reply, epistemicAccess);
    const finalIssues = [...new Set([...groundingIssues, ...finalPlanIssues, ...finalEpistemicIssues])];`,
);

// Test-session debug metadata should expose the same epistemic decision as KNT.
source = source.replaceAll(
`            worldMemoryGuard,
            responsePlan,`,
`            worldMemoryGuard,
            epistemicAccess,
            responsePlan,`,
);
source = source.replaceAll(
`          worldMemoryGuard,
          responsePlan,`,
`          worldMemoryGuard,
          epistemicAccess,
          responsePlan,`,
);

fs.writeFileSync(path, source);

const testPath = 'src/services/kairaEpistemicRuntimeContracts.test.ts';
let test = fs.readFileSync(testPath, 'utf8');
const marker = `    expect(server).toContain('epistemicAccess, behaviorContract');`;
if (!test.includes(marker)) throw new Error('Runtime contract marker not found');
test = test.replace(
  marker,
  `${marker}\n    expect(server).toContain('const candidateEpistemicGuard = enforceKairaEpistemicResponse(candidateWorldGuard.reply, epistemicAccess)');\n    expect(server).toContain('const finalEpistemicIssues = findKairaEpistemicResponseIssues(reply, epistemicAccess)');`,
);
fs.writeFileSync(testPath, test);
