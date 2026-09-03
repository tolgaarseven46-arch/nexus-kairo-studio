import fs from "node:fs";

const path = "server.ts";
let source = fs.readFileSync(path, "utf8");

function replaceOnce(before, after, label) {
  if (!source.includes(before)) {
    throw new Error(`Missing ${label} seam`);
  }
  if (source.indexOf(before) !== source.lastIndexOf(before)) {
    throw new Error(`Ambiguous ${label} seam`);
  }
  source = source.replace(before, after);
}

replaceOnce(
  'import { enforceKairaAutobiographicalResponse } from "./src/services/kairaAutobiographicalResponseGuard";\n',
  'import { enforceKairaAutobiographicalResponse } from "./src/services/kairaAutobiographicalResponseGuard";\nimport { runKairaResponseConstraintPass } from "./src/services/kairaResponseConstraintPass";\n',
  "unified guard import",
);

replaceOnce(
  '      canonicalPromptOn = isCanonicalBehaviorFlagEnabled("CANONICAL_PROMPT_BUILDER"),\n',
  '      canonicalPromptOn = isCanonicalBehaviorFlagEnabled("CANONICAL_PROMPT_BUILDER"),\n      unifiedGuardOn = isCanonicalBehaviorFlagEnabled("UNIFIED_GUARD_PASS"),\n',
  "unified guard flag",
);

const localBefore = `      const worldMemoryGuard = enforceWorldModelRecallResponse(local.reply, retrievedWorldEvents, worldReasoningContext),
        epistemicGuard = enforceKairaEpistemicResponse(worldMemoryGuard.reply, epistemicAccess),
        baseEnforced = enforceKairoResponse(epistemicGuard.reply, kdm.trace, enforcementRules),
        contractEnforced = enforceBehaviorContract(baseEnforced.reply, kdm.trace, behaviorContract),
        enforced = {
          reply: contractEnforced.reply,
          changed: worldMemoryGuard.changed || epistemicGuard.changed || baseEnforced.changed || contractEnforced.changed,
          reasons: [
            ...baseEnforced.reasons,
            ...contractEnforced.reasons,
            ...(worldMemoryGuard.reason ? [worldMemoryGuard.reason] : []),
            ...(epistemicGuard.reason ? [epistemicGuard.reason] : []),
          ],
        },
        reply = enforced.reply,
        localPlanIssues = findKairaResponsePlanIssues(reply, responsePlan),
        localEpistemicIssues = findKairaEpistemicResponseIssues(reply, epistemicAccess),
        localBaseConsistency = validateKairoResponse(reply, kdm.trace),
        consistency = {
          ...localBaseConsistency,
          accepted: localBaseConsistency.accepted && localPlanIssues.length === 0 && localEpistemicIssues.length === 0,
          score: Math.max(0, localBaseConsistency.score - (localPlanIssues.length + localEpistemicIssues.length) * 15),
          issues: [...localBaseConsistency.issues, ...localPlanIssues, ...localEpistemicIssues],
        };
`;

const localAfter = `      const canonicalConstraint = unifiedGuardOn
        ? runKairaResponseConstraintPass({
            reply: local.reply,
            trace: kdm.trace,
            plan: responsePlan,
            worldItems: retrievedWorldEvents,
            worldContext: worldReasoningContext,
            selfMemoryRuntime,
            epistemicContext: epistemicAccess,
          })
        : null,
        worldMemoryGuard = canonicalConstraint?.worldGuard ?? enforceWorldModelRecallResponse(local.reply, retrievedWorldEvents, worldReasoningContext),
        epistemicGuard = canonicalConstraint?.epistemicGuard ?? enforceKairaEpistemicResponse(worldMemoryGuard.reply, epistemicAccess),
        baseEnforced = canonicalConstraint?.planEnforcement ?? enforceKairoResponse(epistemicGuard.reply, kdm.trace, enforcementRules),
        contractEnforced = canonicalConstraint
          ? { reply: canonicalConstraint.reply, changed: false, reasons: [] as string[] }
          : enforceBehaviorContract(baseEnforced.reply, kdm.trace, behaviorContract),
        enforced = canonicalConstraint
          ? {
              reply: canonicalConstraint.reply,
              changed: canonicalConstraint.changed,
              reasons: canonicalConstraint.reasons,
            }
          : {
              reply: contractEnforced.reply,
              changed: worldMemoryGuard.changed || epistemicGuard.changed || baseEnforced.changed || contractEnforced.changed,
              reasons: [
                ...baseEnforced.reasons,
                ...contractEnforced.reasons,
                ...(worldMemoryGuard.reason ? [worldMemoryGuard.reason] : []),
                ...(epistemicGuard.reason ? [epistemicGuard.reason] : []),
              ],
            },
        reply = canonicalConstraint?.reply ?? enforced.reply,
        localPlanIssues = canonicalConstraint?.issues ?? findKairaResponsePlanIssues(reply, responsePlan),
        localEpistemicIssues = canonicalConstraint ? [] : findKairaEpistemicResponseIssues(reply, epistemicAccess),
        localBaseConsistency = canonicalConstraint?.consistency ?? validateKairoResponse(reply, kdm.trace),
        consistency = canonicalConstraint
          ? canonicalConstraint.consistency
          : {
              ...localBaseConsistency,
              accepted: localBaseConsistency.accepted && localPlanIssues.length === 0 && localEpistemicIssues.length === 0,
              score: Math.max(0, localBaseConsistency.score - (localPlanIssues.length + localEpistemicIssues.length) * 15),
              issues: [...localBaseConsistency.issues, ...localPlanIssues, ...localEpistemicIssues],
            };
`;
replaceOnce(localBefore, localAfter, "local delivery guard");

const aiStart = '    const worldMemoryGuard = enforceWorldModelRecallResponse(reply, retrievedWorldEvents, worldReasoningContext);\n';
const aiEnd = `    const consistency = {
      ...baseConsistency,
      accepted: baseConsistency.accepted && finalIssues.length === 0,
      score: Math.max(0, baseConsistency.score - finalIssues.length * 15),
      issues: [...baseConsistency.issues, ...finalIssues],
      warnings: enforced.reasons,
    };
`;
const startIndex = source.indexOf(aiStart);
const endIndex = source.indexOf(aiEnd, startIndex);
if (startIndex < 0 || endIndex < 0) throw new Error("Missing AI delivery guard seam");
const aiBefore = source.slice(startIndex, endIndex + aiEnd.length);
const aiAfter = `    const canonicalConstraint = unifiedGuardOn
      ? runKairaResponseConstraintPass({
          reply,
          trace: kdm.trace,
          plan: responsePlan,
          worldItems: retrievedWorldEvents,
          worldContext: worldReasoningContext,
          selfMemoryRuntime,
          epistemicContext: epistemicAccess,
          fallbackFactory: () =>
            buildGroundedDialogueFallback(
              dialogueDecision,
              cleanHistory,
              userMessage,
              userName,
              dialogueAnalysis,
              responsePlan.allowQuestion,
            ),
        })
      : null;
    const worldMemoryGuard = canonicalConstraint?.worldGuard ?? enforceWorldModelRecallResponse(reply, retrievedWorldEvents, worldReasoningContext);
    if (!canonicalConstraint && worldMemoryGuard.changed) {
      reply = worldMemoryGuard.reply;
      groundingIssues = [
        ...findKairoGroundingIssues(reply, cleanHistory, userMessage),
        ...findDialogueAttributionIssues(reply, cleanHistory, userMessage, userName, dialogueAnalysis),
        ...findDialogueDecisionIssues(reply, dialogueDecision, dialogueOutputStyle),
        ...findKairoResponseRhythmIssues(reply, cleanHistory, dialogueDecision.move, speech.relationshipLevel),
        ...findKairaResponsePlanIssues(reply, responsePlan),
        ...findKairoAffectiveResponseIssues(reply, kdm.trace),
        ...findWorldModelResponseIssues(reply, retrievedWorldEvents, worldReasoningContext).map((issue) => issue.message),
      ];
    }
    const selfMemoryGuard = canonicalConstraint?.autobiographicalGuard ?? enforceKairaAutobiographicalResponse(reply, selfMemoryRuntime);
    reply = canonicalConstraint?.reply ?? selfMemoryGuard.reply;
    const epistemicGuard = canonicalConstraint?.epistemicGuard ?? enforceKairaEpistemicResponse(reply, epistemicAccess);
    reply = canonicalConstraint?.reply ?? epistemicGuard.reply;
    const baseEnforced = canonicalConstraint?.planEnforcement ?? enforceKairoResponse(reply, kdm.trace, enforcementRules);
    const contractEnforced = canonicalConstraint
      ? { reply: canonicalConstraint.reply, changed: false, reasons: [] as string[] }
      : enforceBehaviorContract(baseEnforced.reply, kdm.trace, behaviorContract);
    const enforced = canonicalConstraint
      ? {
          reply: canonicalConstraint.reply,
          changed: canonicalConstraint.changed,
          reasons: canonicalConstraint.reasons,
        }
      : {
          reply: contractEnforced.reply,
          changed: worldMemoryGuard.changed || selfMemoryGuard.changed || epistemicGuard.changed || baseEnforced.changed || contractEnforced.changed,
          reasons: [
            ...baseEnforced.reasons,
            ...contractEnforced.reasons,
            ...(worldMemoryGuard.reason ? [worldMemoryGuard.reason] : []),
            ...(epistemicGuard.reason ? [epistemicGuard.reason] : []),
          ],
        };
    reply = canonicalConstraint?.reply ?? enforced.reply;
    let postEnforcementPlanIssues = canonicalConstraint?.issues ?? findKairaResponsePlanIssues(reply, responsePlan);
    if (!canonicalConstraint && postEnforcementPlanIssues.length) {
      const planSafeFallback = buildGroundedDialogueFallback(
        dialogueDecision, cleanHistory, userMessage, userName, dialogueAnalysis, responsePlan.allowQuestion,
      );
      if (planSafeFallback) {
        const candidateWorldGuard = enforceWorldModelRecallResponse(planSafeFallback, retrievedWorldEvents, worldReasoningContext);
        const candidateSelfMemoryGuard = enforceKairaAutobiographicalResponse(candidateWorldGuard.reply, selfMemoryRuntime);
        const candidateEpistemicGuard = enforceKairaEpistemicResponse(candidateSelfMemoryGuard.reply, epistemicAccess);
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
          ...findWorldModelResponseIssues(candidateReply, retrievedWorldEvents, worldReasoningContext).map((issue) => issue.message),
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
    const canonicalExternalIssues = canonicalConstraint
      ? [
          ...findKairoGroundingIssues(reply, cleanHistory, userMessage),
          ...findDialogueAttributionIssues(reply, cleanHistory, userMessage, userName, dialogueAnalysis),
          ...findDialogueDecisionIssues(reply, dialogueDecision, dialogueOutputStyle),
          ...findKairoResponseRhythmIssues(reply, cleanHistory, dialogueDecision.move, speech.relationshipLevel),
        ]
      : [];
    const baseConsistency = canonicalConstraint?.consistency ?? validateKairoResponse(reply, kdm.trace);
    const finalPlanIssues = postEnforcementPlanIssues;
    const finalEpistemicIssues = canonicalConstraint ? [] : findKairaEpistemicResponseIssues(reply, epistemicAccess);
    const finalIssues = canonicalConstraint
      ? [...new Set([...canonicalExternalIssues, ...finalPlanIssues])]
      : [...new Set([...groundingIssues, ...finalPlanIssues, ...finalEpistemicIssues])];
    const consistency = canonicalConstraint
      ? {
          ...canonicalConstraint.consistency,
          accepted: canonicalConstraint.consistency.accepted && finalIssues.length === 0,
          score: Math.max(0, canonicalConstraint.consistency.score - finalIssues.length * 15),
          issues: [...new Set([...canonicalConstraint.consistency.issues, ...finalIssues])],
          warnings: enforced.reasons,
        }
      : {
          ...baseConsistency,
          accepted: baseConsistency.accepted && finalIssues.length === 0,
          score: Math.max(0, baseConsistency.score - finalIssues.length * 15),
          issues: [...baseConsistency.issues, ...finalIssues],
          warnings: enforced.reasons,
        };
`;
source = source.slice(0, startIndex) + aiAfter + source.slice(endIndex + aiEnd.length);

fs.writeFileSync(path, source);
console.log("Unified guard server wiring applied.");
