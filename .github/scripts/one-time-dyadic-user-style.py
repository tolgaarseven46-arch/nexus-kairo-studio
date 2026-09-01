from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    source = p.read_text()
    if old not in source:
        raise SystemExit(f"target not found in {path}: {old[:100]!r}")
    p.write_text(source.replace(old, new, 1))


def replace_all(path: str, old: str, new: str, minimum: int = 1) -> None:
    p = Path(path)
    source = p.read_text()
    count = source.count(old)
    if count < minimum:
        raise SystemExit(f"target count {count} < {minimum} in {path}: {old[:100]!r}")
    p.write_text(source.replace(old, new))


memory = "src/services/kairoLanguageMemory.ts"

replace_once(
    memory,
    """  recentReplies: string[];\n  interactionCount: number;\n}""",
    """  recentReplies: string[];\n  interactionCount: number;\n  userMarkerWeights: Record<string, number>;\n  recentUserWordCounts: number[];\n  userStyleInteractionCount: number;\n}""",
)

replace_once(
    memory,
    """export interface LanguageStyleMemorySignal {\n  interactionCount: number;\n  maturity: 'cold' | 'emerging' | 'learned';\n  preferredMarkers: string[];\n  averageWords: number;\n  lengthPreference: 'very_short' | 'short' | 'medium';\n}\n""",
    """export interface LanguageStyleMemorySignal {\n  interactionCount: number;\n  maturity: 'cold' | 'emerging' | 'learned';\n  preferredMarkers: string[];\n  averageWords: number;\n  lengthPreference: 'very_short' | 'short' | 'medium';\n}\n\nexport interface DyadicUserStyleSignal {\n  interactionCount: number;\n  maturity: 'cold' | 'emerging' | 'learned';\n  preferredMarkers: string[];\n  averageWords: number;\n  lengthPreference: 'very_short' | 'short' | 'medium';\n}\n\nexport type DyadicRelationshipLevel = 'new' | 'familiar' | 'close';\n""",
)

replace_once(
    memory,
    """const STYLE_MARKERS = ['kanka', 'ya', 'valla', 'aynen', 'he', 'be', 'işte', 'hani', 'yani', 'neyse', 'eyvallah', 'hadi', 'falan', 'filan', 'harbi', 'cidden'] as const;\n""",
    """const STYLE_MARKERS = ['kanka', 'ya', 'valla', 'aynen', 'he', 'be', 'işte', 'hani', 'yani', 'neyse', 'eyvallah', 'hadi', 'falan', 'filan', 'harbi', 'cidden'] as const;\nconst SAFE_USER_STYLE_MARKERS = ['kanka', 'lan', 'aga', 'ya', 'be', 'valla', 'aynen', 'eyvallah', 'harbi', 'cidden', 'işte', 'hani', 'neyse'] as const;\nconst USER_STYLE_MARKER_SET = new Set<string>(SAFE_USER_STYLE_MARKERS);\nconst USER_STYLE_MARKER_THRESHOLD = 2.5;\nconst USER_STYLE_RETENTION = 0.9;\n""",
)

replace_once(
    memory,
    """function createProfile(): LanguageMemoryProfile {\n  return { wordWeights: { ...BASE_WORDS }, phraseWeights: {}, recentReplies: [], interactionCount: 0 };\n}""",
    """function createProfile(): LanguageMemoryProfile {\n  return {\n    wordWeights: { ...BASE_WORDS },\n    phraseWeights: {},\n    recentReplies: [],\n    interactionCount: 0,\n    userMarkerWeights: {},\n    recentUserWordCounts: [],\n    userStyleInteractionCount: 0,\n  };\n}""",
)

replace_once(
    memory,
    """    recentReplies: Array.isArray(raw?.recentReplies) ? raw.recentReplies.filter((x: any) => typeof x === 'string').slice(0, 8) : [],\n    interactionCount: Number.isFinite(Number(raw?.interactionCount)) ? Math.max(0, Number(raw.interactionCount)) : 0,\n""",
    """    recentReplies: Array.isArray(raw?.recentReplies) ? raw.recentReplies.filter((x: any) => typeof x === 'string').slice(0, 8) : [],\n    interactionCount: Number.isFinite(Number(raw?.interactionCount)) ? Math.max(0, Number(raw.interactionCount)) : 0,\n    userMarkerWeights: boundedWeights(raw?.userMarkerWeights, SAFE_USER_STYLE_MARKERS.length, 20),\n    recentUserWordCounts: Array.isArray(raw?.recentUserWordCounts)\n      ? raw.recentUserWordCounts.map(Number).filter((x: number) => Number.isFinite(x) && x >= 0).slice(0, 8)\n      : [],\n    userStyleInteractionCount: Number.isFinite(Number(raw?.userStyleInteractionCount)) ? Math.max(0, Number(raw.userStyleInteractionCount)) : 0,\n""",
)

anchor = "export function learnLanguageReply(userId: string, reply: string) {"
insert = """function dyadicSignalFromProfile(profile: LanguageMemoryProfile): DyadicUserStyleSignal {\n  const preferredMarkers = SAFE_USER_STYLE_MARKERS\n    .map((marker) => ({ marker, weight: profile.userMarkerWeights[marker] ?? 0 }))\n    .filter((item) => item.weight >= USER_STYLE_MARKER_THRESHOLD)\n    .sort((a, b) => b.weight - a.weight || a.marker.localeCompare(b.marker, 'tr'))\n    .slice(0, 4)\n    .map((item) => item.marker);\n  const counts = profile.recentUserWordCounts.filter((count) => count > 0);\n  const averageWords = counts.length ? counts.reduce((sum, count) => sum + count, 0) / counts.length : 0;\n  const lengthPreference: DyadicUserStyleSignal['lengthPreference'] = averageWords <= 4\n    ? 'very_short'\n    : averageWords <= 8\n      ? 'short'\n      : 'medium';\n  const maturity = profile.userStyleInteractionCount >= 10 ? 'learned' : profile.userStyleInteractionCount >= 4 ? 'emerging' : 'cold';\n  return {\n    interactionCount: profile.userStyleInteractionCount,\n    maturity,\n    preferredMarkers,\n    averageWords: Number(averageWords.toFixed(1)),\n    lengthPreference,\n  };\n}\n\nexport function observeUserLanguageStyle(userId: string, userMessage: string, useLearnedMemory = true) {\n  if (!useLearnedMemory) return;\n  const profile = getLanguageMemory(userId);\n  const words = normalizeLanguageText(userMessage).split(/\\s+/).filter(Boolean);\n  const observed = new Set(words.filter((word) => USER_STYLE_MARKER_SET.has(word)));\n  for (const marker of SAFE_USER_STYLE_MARKERS) {\n    const current = profile.userMarkerWeights[marker] ?? 0;\n    const next = observed.has(marker) ? Math.min(20, current + 1) : current * USER_STYLE_RETENTION;\n    if (next < 0.1) delete profile.userMarkerWeights[marker];\n    else profile.userMarkerWeights[marker] = next;\n  }\n  profile.userStyleInteractionCount += 1;\n  profile.recentUserWordCounts = [words.length, ...profile.recentUserWordCounts].slice(0, 8);\n  schedulePersist(userId);\n}\n\nexport function dyadicLanguageStyleSignal(userId: string, useLearnedMemory = true): DyadicUserStyleSignal {\n  if (!useLearnedMemory) {\n    return { interactionCount: 0, maturity: 'cold', preferredMarkers: [], averageWords: 0, lengthPreference: 'very_short' };\n  }\n  return dyadicSignalFromProfile(getLanguageMemory(userId));\n}\n\nfunction dyadicCandidateAffinity(profile: LanguageMemoryProfile, reply: string, relationshipLevel: DyadicRelationshipLevel) {\n  if (relationshipLevel === 'new') return 0;\n  const signal = dyadicSignalFromProfile(profile);\n  if (signal.maturity === 'cold') return 0;\n  const words = new Set(normalizeLanguageText(reply).split(/\\s+/).filter(Boolean));\n  const relationshipWeight = relationshipLevel === 'close' ? 0.45 : 0.22;\n  return signal.preferredMarkers.reduce((sum, marker) => sum + (words.has(marker) ? relationshipWeight : 0), 0);\n}\n\nexport function dyadicLanguageAlignmentInstruction(\n  userId: string,\n  relationshipLevel: DyadicRelationshipLevel,\n  useLearnedMemory = true,\n) {\n  const signal = dyadicLanguageStyleSignal(userId, useLearnedMemory);\n  if (relationshipLevel === 'new' || signal.maturity === 'cold') return '';\n  const allowedMarkers = signal.preferredMarkers.filter((marker) => relationshipLevel === 'close' || marker !== 'lan');\n  const markers = allowedMarkers.length ? allowedMarkers.join(', ') : 'belirgin güvenli marker yok';\n  return `KİŞİYE ÖZGÜ DİL UYUMU (HOW-ONLY, ÇOK DÜŞÜK OTORİTE):\\nBu kullanıcıyla yerleşen güvenli yazım ritmi=${signal.lengthPreference} (~${signal.averageWords} kelime); tekrar eden güvenli markerlar=${markers}.\\nYalnız doğal olduğunda hafifçe yakınsa. Küfür/hakaret, içerik, anı, duygu, niyet, ilişki sonucu veya davranış izni öğrenme/üretme. Kullanıcının cümlesini kopyalama. ResponsePlan ve SpeechIdentity her zaman üstündür.`;\n}\n\n"""
replace_once(memory, anchor, insert + anchor)

replace_once(
    memory,
    """export function chooseLanguageReply(userId: string, candidates: string[], seed: string, useLearnedMemory = true) {\n  const profile = useLearnedMemory ? getLanguageMemory(userId) : createProfile();""",
    """export function chooseLanguageReply(\n  userId: string,\n  candidates: string[],\n  seed: string,\n  useLearnedMemory = true,\n  relationshipLevel: DyadicRelationshipLevel = 'new',\n) {\n  const profile = useLearnedMemory ? getLanguageMemory(userId) : createProfile();""",
)

replace_once(
    memory,
    """      score: affinityForProfile(profile, reply)\n        - repetitionPenalty(profile, reply)\n        + (((hash + index * 17) % 100) / 100) * 1.25,""",
    """      score: affinityForProfile(profile, reply)\n        + dyadicCandidateAffinity(profile, reply, relationshipLevel)\n        - repetitionPenalty(profile, reply)\n        + (((hash + index * 17) % 100) / 100) * 1.25,""",
)

replace_once(
    "src/services/kairoLocalLanguageEngine.ts",
    """    useLearnedMemory,\n  );""",
    """    useLearnedMemory,\n    relationshipLevel,\n  );""",
)

replace_once(
    "server.ts",
    """  languageStyleMemoryInstruction,\n  languageStyleMemorySignal,\n  learnLanguageReply,""",
    """  languageStyleMemoryInstruction,\n  languageStyleMemorySignal,\n  dyadicLanguageAlignmentInstruction,\n  observeUserLanguageStyle,\n  learnLanguageReply,""",
)

replace_all(
    "server.ts",
    """    ]);\n    const memoryMs = Math.round(now() - memoryStart),\n      languageStyleMemory = languageStyleMemorySignal(stateUserId, kairaPolicy.persistentUserMemory),""",
    """    ]);\n    observeUserLanguageStyle(stateUserId, userMessage, kairaPolicy.persistentUserMemory);\n    const memoryMs = Math.round(now() - memoryStart),\n      languageStyleMemory = languageStyleMemorySignal(stateUserId, kairaPolicy.persistentUserMemory),""",
    minimum=2,
)

replace_all(
    "server.ts",
    """${languageStyleMemoryInstruction(stateUserId, kairaPolicy.persistentUserMemory)}\\\n${socialStyle}\\""",
    """${languageStyleMemoryInstruction(stateUserId, kairaPolicy.persistentUserMemory)}\\\n${dyadicLanguageAlignmentInstruction(stateUserId, speech.relationshipLevel, kairaPolicy.persistentUserMemory)}\\\n${socialStyle}\\""",
    minimum=2,
)

# Existing policy contract should continue to assert explicit local memory gating while accepting relation-aware HOW selection.
replace_once(
    "src/services/kairaLanguageMemoryPolicyBoundaryContracts.test.ts",
    """    expect(local).toContain('useLearnedMemory,\\n  );');""",
    """    expect(local).toContain('useLearnedMemory,\\n    relationshipLevel,\\n  );');""",
)

Path("src/services/kairaDyadicUserStyleContracts.test.ts").write_text("""import { beforeEach, describe, expect, it } from 'vitest';\nimport { readFileSync } from 'node:fs';\nimport {\n  dyadicLanguageAlignmentInstruction,\n  dyadicLanguageStyleSignal,\n  getLanguageMemory,\n  observeUserLanguageStyle,\n} from './kairoLanguageMemory';\n\nconst userId = 'dyadic-user-style-contract';\n\nbeforeEach(() => {\n  const profile = getLanguageMemory(userId);\n  profile.userMarkerWeights = {};\n  profile.recentUserWordCounts = [];\n  profile.userStyleInteractionCount = 0;\n  profile.recentReplies = [];\n  profile.phraseWeights = {};\n  profile.interactionCount = 0;\n});\n\ndescribe('dyadic user style projection contracts', () => {\n  it('does not infer a stable style from one message', () => {\n    observeUserLanguageStyle(userId, 'naber lan kanka');\n    expect(dyadicLanguageStyleSignal(userId).maturity).toBe('cold');\n    expect(dyadicLanguageAlignmentInstruction(userId, 'close')).toBe('');\n  });\n\n  it('learns only allowlisted HOW markers after repeated evidence', () => {\n    for (let i = 0; i < 8; i += 1) observeUserLanguageStyle(userId, 'naber lan kanka aq salak');\n    const signal = dyadicLanguageStyleSignal(userId);\n    expect(signal.maturity).toBe('emerging');\n    expect(signal.preferredMarkers).toContain('kanka');\n    expect(signal.preferredMarkers).toContain('lan');\n    expect(signal.preferredMarkers).not.toContain('aq');\n    expect(signal.preferredMarkers).not.toContain('salak');\n  });\n\n  it('keeps relationship authority above alignment', () => {\n    for (let i = 0; i < 8; i += 1) observeUserLanguageStyle(userId, 'lan kanka');\n    expect(dyadicLanguageAlignmentInstruction(userId, 'new')).toBe('');\n    expect(dyadicLanguageAlignmentInstruction(userId, 'familiar')).not.toContain('lan');\n    expect(dyadicLanguageAlignmentInstruction(userId, 'close')).toContain('lan');\n  });\n\n  it('does not observe or expose learned user style when memory policy is disabled', () => {\n    observeUserLanguageStyle(userId, 'kanka kanka', false);\n    expect(dyadicLanguageStyleSignal(userId, false)).toEqual({\n      interactionCount: 0,\n      maturity: 'cold',\n      preferredMarkers: [],\n      averageWords: 0,\n      lengthPreference: 'very_short',\n    });\n  });\n\n  it('wires user observation and the same HOW-only projection to AI and local verbalizers', () => {\n    const server = readFileSync('server.ts', 'utf8');\n    const local = readFileSync('src/services/kairoLocalLanguageEngine.ts', 'utf8');\n    expect(server).toContain('observeUserLanguageStyle(stateUserId, userMessage, kairaPolicy.persistentUserMemory)');\n    expect(server).toContain('dyadicLanguageAlignmentInstruction(stateUserId, speech.relationshipLevel, kairaPolicy.persistentUserMemory)');\n    expect(local).toContain('useLearnedMemory,\\n    relationshipLevel,');\n  });\n\n  it('keeps the projection HOW-only and subordinate to canonical behavior authorities', () => {\n    const source = readFileSync('src/services/kairoLanguageMemory.ts', 'utf8');\n    expect(source).toContain('KİŞİYE ÖZGÜ DİL UYUMU (HOW-ONLY, ÇOK DÜŞÜK OTORİTE)');\n    expect(source).toContain('Küfür/hakaret, içerik, anı, duygu, niyet, ilişki sonucu veya davranış izni öğrenme/üretme');\n    expect(source).toContain('ResponsePlan ve SpeechIdentity her zaman üstündür');\n  });\n});\n""")
