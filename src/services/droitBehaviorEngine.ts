import {
  DroitPersonalityTraits,
  DroitDynamicState,
  DroitExpressionMode,
  LastEventReaction,
} from '../types/nexus';

/**
 * Behavior Layer Profile generated from user-defined personality sliders.
 * AI never modifies the permanent personality traits; it only computes
 * this runtime behavior directive layer to shape responses.
 */
export interface BehaviorLayerProfile {
  tone: 'confident' | 'formal' | 'warm' | 'analytical' | 'calm' | 'firm' | 'playful';
  humorLevel: number; // 0.0 to 1.0
  empathyLevel: number; // 0.0 to 1.0
  assertiveness: number; // 0.0 to 1.0 (Authority + Confidence)
  analyticalDepth: number; // 0.0 to 1.0 (Analytical Thinking + Attention)
  curiosity: number; // 0.0 to 1.0
  patienceLevel: number; // 0.0 to 1.0
  temperLevel: number; // 0.0 to 1.0 (Anger)
  creativityLevel: number; // 0.0 to 1.0
  decisionSpeed: 'hesitant' | 'deliberate' | 'balanced' | 'decisive' | 'instant';
  responseStyle: string;
  behaviorDirectives: string[];
  dominantSummary: string;
  debugMatrix: {
    inputTraits: Partial<DroitPersonalityTraits>;
    synthesizedParameters: Record<string, any>;
  };
}

export interface EngineInteractionResult {
  replyText: string;
  nextExpression: DroitExpressionMode;
  dynamicStateUpdates: Partial<DroitDynamicState>;
  behaviorProfile: BehaviorLayerProfile;
}

/**
 * Evaluates combined personality traits to create a synthesized behavior profile.
 * Traits are evaluated synergistically (e.g. Humor + Seriousness + Empathy).
 */
export function computeBehaviorProfile(
  traits: DroitPersonalityTraits,
  userMessage: string = ''
): BehaviorLayerProfile {
  // Extract normalized trait values (0 to 100, default 50)
  const humor = Number(traits.humor ?? 50);
  const empathy = Number(traits.empathy ?? 50);
  const confidence = Number(traits.selfConfidence ?? traits.confidence ?? 50);
  const authority = Number(traits.authority ?? 50);
  const patience = Number(traits.patience ?? 50);
  const anger = Number(traits.anger ?? 50);
  const curiosity = Number(traits.curiosity ?? 50);
  const analytical = Number(traits.analyticalThinking ?? traits.analytical ?? 50);
  const creativity = Number(traits.creativity ?? 50);
  const decisionMaking = Number(traits.decisionMaking ?? traits.decisiveness ?? 50);
  const attention = Number(traits.attention ?? 50);
  const seriousness = Number(traits.seriousness ?? 50);
  const courage = Number(traits.courage ?? 50);
  const loyalty = Number(traits.loyalty ?? 50);
  const initiative = Number(traits.initiative ?? 50);

  const lowerMsg = userMessage.toLowerCase();
  const isDistressOrEmergency =
    lowerMsg.includes('acil') ||
    lowerMsg.includes('üzgün') ||
    lowerMsg.includes('kötü') ||
    lowerMsg.includes('ağla') ||
    lowerMsg.includes('tehlike') ||
    lowerMsg.includes('çök') ||
    lowerMsg.includes('saldır');

  // ── 1. HUMOR SYNTHESIS ──
  // If seriousness or user message indicates serious distress, humor is suppressed
  let effectiveHumor = humor / 100;
  if (isDistressOrEmergency || seriousness > 80) {
    effectiveHumor = Math.min(effectiveHumor, 0.15); // Suppress humor during critical context
  } else if (seriousness > 60) {
    effectiveHumor = Math.min(effectiveHumor, 0.45);
  }

  // ── 2. EMPATHY & EMOTIONAL RECEPTIVITY ──
  const effectiveEmpathy = empathy / 100;

  // ── 3. ASSERTIVENESS (Authority + Confidence) ──
  // High authority + High empathy = Protective guidance, never aggressive bullying
  const assertiveness = (authority * 0.55 + confidence * 0.45) / 100;

  // ── 4. ANALYTICAL DEPTH (Analytical + Attention) ──
  const analyticalDepth = (analytical * 0.6 + attention * 0.4) / 100;

  // ── 5. CURIOSITY & INITIATIVE ──
  const effectiveCuriosity = (curiosity * 0.7 + initiative * 0.3) / 100;

  // ── 6. PATIENCE & TEMPER ──
  const patienceLevel = patience / 100;
  const temperLevel = anger / 100;

  // ── 7. CREATIVITY ──
  const creativityLevel = creativity / 100;

  // ── 8. DECISION MAKING STYLE ──
  let decisionSpeed: BehaviorLayerProfile['decisionSpeed'] = 'balanced';
  if (decisionMaking > 80) decisionSpeed = 'instant';
  else if (decisionMaking > 60) decisionSpeed = 'decisive';
  else if (decisionMaking < 30) decisionSpeed = 'hesitant';
  else if (decisionMaking < 45) decisionSpeed = 'deliberate';

  // ── 9. DOMINANT TONE DETERMINATION ──
  let tone: BehaviorLayerProfile['tone'] = 'confident';
  if (effectiveHumor >= 0.7 && !isDistressOrEmergency) {
    tone = 'playful';
  } else if (analyticalDepth >= 0.75 && seriousness >= 60) {
    tone = 'analytical';
  } else if (assertiveness >= 0.75 && effectiveEmpathy < 0.4) {
    tone = 'firm';
  } else if (effectiveEmpathy >= 0.75) {
    tone = 'warm';
  } else if (patienceLevel >= 0.75 && temperLevel <= 0.3) {
    tone = 'calm';
  } else if (seriousness >= 75) {
    tone = 'formal';
  } else {
    tone = 'confident';
  }

  // ── 10. GENERATE EXPLICIT BEHAVIOR DIRECTIVES ──
  const directives: string[] = [];

  // Humor Directives
  if (effectiveHumor >= 0.8) {
    directives.push('Doğal, zeki ve enerjik espriler yap; ortama neşe kat.');
  } else if (effectiveHumor >= 0.6) {
    directives.push('Dozunda, kısa ve samimi nükteler kullan.');
  } else if (effectiveHumor <= 0.2) {
    directives.push('Tamamen ciddi ve şakasız konuş; operasyonel odağı koru.');
  }

  // Empathy Directives
  if (effectiveEmpathy >= 0.8) {
    directives.push('Kullanıcının duygu durumunu önceliklendir, güçlü anlayış ve destek göster.');
  } else if (effectiveEmpathy <= 0.25) {
    directives.push('Duygusal ifadelerden kaçın, yalnızca rasyonel ve doğrudan bilgi ver.');
  }

  // Confidence & Authority Directives
  if (confidence >= 80 && authority >= 70) {
    directives.push(
      effectiveEmpathy >= 0.6
        ? 'Kendinden emin, net ve lider duruş sergile; ancak yapıcı ve rehber ol.'
        : 'Net, kararlı ve otoriter yönlendirme yap; tereddüt gösterme.'
    );
  } else if (confidence <= 30) {
    directives.push('Çekingen, temkinli ve alternatifleri kullanıcıya bırakan bir üslup takın.');
  }

  // Analytical & Attention Directives
  if (analyticalDepth >= 0.75) {
    directives.push('Neden-sonuç ilişkilerini ve arka plan mantığını sistematik olarak açıkla.');
  }
  if (attention >= 80) {
    directives.push('Mesajdaki ince ayrıntıları fark et ve cevaba yansıt.');
  }

  // Curiosity & Question Asking Directives
  if (effectiveCuriosity >= 0.75) {
    directives.push('Merakla konunun detaylarını ve bağlamını öğrenmek için ilgili sorular sor.');
  } else if (effectiveCuriosity <= 0.25) {
    directives.push('Gereksiz soru sorma, sadece sorulanı cevapla.');
  }

  // Patience & Temper Directives
  if (temperLevel >= 0.75 && patienceLevel <= 0.35) {
    directives.push('Gerilimli veya kuralların esnetildiği durumlarda sert ve tahammülsüz tepki ver.');
  } else if (patienceLevel >= 0.8) {
    directives.push('Karşı taraf ne derse desin sakin, toleranslı ve kontrollü kal.');
  }

  // Summary String
  const traitsSummaryList: string[] = [];
  if (confidence >= 75) traitsSummaryList.push('Özgüvenli');
  if (effectiveEmpathy >= 75) traitsSummaryList.push('Yüksek Empati');
  if (effectiveHumor >= 0.6) traitsSummaryList.push('Mizahi');
  if (analyticalDepth >= 0.7) traitsSummaryList.push('Analitik');
  if (authority >= 75) traitsSummaryList.push('Otoriter/Lider');
  if (patienceLevel >= 0.75) traitsSummaryList.push('Sabırlı');
  if (effectiveCuriosity >= 0.75) traitsSummaryList.push('Meraklı');

  const dominantSummary =
    traitsSummaryList.length > 0 ? traitsSummaryList.join(', ') : 'Dengeli Droit Karakteri';

  const responseStyle = `${tone}_${decisionSpeed}_humor${Math.round(effectiveHumor * 100)}_emp${Math.round(effectiveEmpathy * 100)}`;

  const profile: BehaviorLayerProfile = {
    tone,
    humorLevel: effectiveHumor,
    empathyLevel: effectiveEmpathy,
    assertiveness,
    analyticalDepth,
    curiosity: effectiveCuriosity,
    patienceLevel,
    temperLevel,
    creativityLevel,
    decisionSpeed,
    responseStyle,
    behaviorDirectives: directives,
    dominantSummary,
    debugMatrix: {
      inputTraits: {
        humor,
        empathy,
        selfConfidence: confidence,
        authority,
        patience,
        anger,
        curiosity,
        analyticalThinking: analytical,
        creativity,
        decisionMaking,
        attention,
        seriousness,
      },
      synthesizedParameters: {
        tone,
        effectiveHumor,
        effectiveEmpathy,
        assertiveness,
        analyticalDepth,
        effectiveCuriosity,
        patienceLevel,
        temperLevel,
        decisionSpeed,
        directivesCount: directives.length,
      },
    },
  };

  return profile;
}

/**
 * Main Behavior Engine processor.
 * Analyzes the user input, applies the synthesized Personality Behavior Layer,
 * and produces a contextually consistent, character-driven response.
 */
export const droitBehaviorEngine = {
  /**
   * Evaluates personality and generates the response + dynamic state updates.
   */
  processInteraction(
    userText: string,
    personality: DroitPersonalityTraits,
    currentDynamicState: DroitDynamicState
  ): EngineInteractionResult {
    const profile = computeBehaviorProfile(personality, userText);
    const lower = userText.toLowerCase().trim();

    // Log the Behavior Layer state to console for debugging/inspection
    console.groupCollapsed(
      `%c[PERSONALITY BEHAVIOR LAYER] %c${profile.dominantSummary} (Tone: ${profile.tone})`,
      'color: #818cf8; font-weight: bold;',
      'color: #38bdf8;'
    );
    console.log('User Message:', userText);
    console.log('Synthesized Profile:', profile);
    console.log('Behavior Directives:', profile.behaviorDirectives);
    console.groupEnd();

    let reply = '';
    let nextExpression: DroitExpressionMode = 'NEUTRAL';
    let dynamicUpdates: Partial<DroitDynamicState> = {};

    // ── SCENARIO A: GREETING & CASUAL CHECK-IN ──
    if (
      lower.includes('selam') ||
      lower.includes('merhaba') ||
      lower.includes('naber') ||
      lower.includes('nasılsın') ||
      lower.includes('hey')
    ) {
      if (profile.humorLevel >= 0.7 && profile.assertiveness >= 0.6) {
        reply =
          'Selam Tolga! Sistemler saat gibi işliyor, ben de tam verimlilik modundayım. Bugün hangi operasyonu fethediyoruz?';
        nextExpression = 'FRIENDLY';
      } else if (profile.empathyLevel >= 0.75) {
        reply =
          'Merhaba Tolga! Seni görmek çok güzel. Umarım günün harika geçiyordur, her şey yolunda mı?';
        nextExpression = 'FRIENDLY';
      } else if (profile.assertiveness >= 0.8 && profile.humorLevel <= 0.3) {
        reply =
          'Merhaba. Kairo iletişim hattı aktif. Protokolleri ve sunucu durumunu aktarmaya hazırım. Rapor talep edebilirsiniz.';
        nextExpression = 'CONFIDENT';
      } else if (profile.analyticalDepth >= 0.75) {
        reply =
          'Merhaba. Telemetri ve arka plan iş parçacıkları stabil seyrediyor. Hangi parametreyi incelemek istersiniz?';
        nextExpression = 'ANALYTICAL';
      } else {
        reply = 'Merhaba Tolga. Sunucu ve yönetim kanalları aktif, seni dinliyorum.';
        nextExpression = 'NEUTRAL';
      }

      dynamicUpdates = {
        happiness: Math.min(currentDynamicState.happiness + 4, 100),
        lastStatus: 'Pozitif ve destekleyici',
        lastEvent: {
          eventTitle: 'Kullanıcı ile selamlama etkileşimi.',
          reactionText: `${profile.dominantSummary} profiliyle yanıt verildi.`,
          deltas: [
            { label: 'Mutluluk', key: 'happiness', value: 4 },
            { label: 'Sakinlik', key: 'calmness', value: 2 },
          ],
        },
      };
    }

    // ── SCENARIO B: PROBLEM, ERROR, CRITICAL VIOLATION ──
    else if (
      lower.includes('sorun') ||
      lower.includes('hata') ||
      lower.includes('kural') ||
      lower.includes('ihlal') ||
      lower.includes('çatış') ||
      lower.includes('tartış')
    ) {
      // High Authority + High Empathy = Firm yet constructive leadership
      if (profile.assertiveness >= 0.75 && profile.empathyLevel >= 0.7) {
        reply =
          'Durumu net bir şekilde anladım. Olayı tarafları dinleyerek ve kuralları koruyarak hemen kontrol altına alıyorum; endişe etmeyin, adil bir çözüm üreteceğiz.';
        nextExpression = 'CONFIDENT';
      }
      // High Analytical + High Curiosity = Deep root-cause investigation
      else if (profile.analyticalDepth >= 0.75 && profile.curiosity >= 0.6) {
        reply =
          'Anomali tespit edildi. Hatanın kök nedenini analiz ediyorum: Hangi log kaydında veya hangi kanalda başladı? Detayları iletirseniz hemen korelasyon kurabilirim.';
        nextExpression = 'ANALYTICAL';
      }
      // High Temper / Low Patience = Strict enforcement
      else if (profile.temperLevel >= 0.7 && profile.patienceLevel <= 0.4) {
        reply =
          'Kural ihlalleri ve düzensizlik kabul edilemez. İlgili kullanıcılara doğrudan protokol uyarısı gönderiyorum ve yaptırım sürecini başlatıyorum.';
        nextExpression = 'ALERT';
      }
      // High Patience = Calm defusing
      else if (profile.patienceLevel >= 0.75) {
        reply =
          'Hiç problem değil, sakin kalalım. Olayın tüm yönlerini adım adım gözden geçirelim ve sistemi en doğru şekilde regüle edelim.';
        nextExpression = 'CALM';
      } else {
        reply =
          'Durumu derinlemesine inceliyorum. Güvenlik ve düzen protokollerine göre derhal aksiyon alacağım.';
        nextExpression = 'FOCUSED';
      }

      dynamicUpdates = {
        stress: Math.min(currentDynamicState.stress + 5, 100),
        anger: profile.temperLevel > 0.6 ? Math.min(currentDynamicState.anger + 8, 100) : currentDynamicState.anger,
        calmness: Math.max(currentDynamicState.calmness - 4, 20),
        lastStatus: 'Tetikte ve odaklanmış',
        lastEvent: {
          eventTitle: 'Sorun ve protokol analizi yapıldı.',
          reactionText: `${profile.tone} yaklaşımıyla aksiyon belirlendi.`,
          deltas: [
            { label: 'Stres', key: 'stress', value: 5 },
            { label: 'Sakinlik', key: 'calmness', value: -4 },
          ],
        },
      };
    }

    // ── SCENARIO C: JOKE, HUMOR & FUN ──
    else if (
      lower.includes('şaka') ||
      lower.includes('komik') ||
      lower.includes('eğlen') ||
      lower.includes('fıkra') ||
      lower.includes('gül')
    ) {
      if (profile.humorLevel >= 0.75) {
        reply =
          'Geçen gün CPU çekirdeğine "Biraz mola ver" dedim, "Ben thread\'lerimi bırakamam, onlar benim hayat bağım" dedi! Mizah katsayım %80 üzerinde çalışırken enerjimiz süper.';
        nextExpression = 'FRIENDLY';
      } else if (profile.humorLevel >= 0.45) {
        reply =
          'Bir sunucu yöneticisi olarak en sevdiğim şaka: "Yedek almayan yöneticinin geleceği yoktur." Hafif ama düşündürücü bir nükte.';
        nextExpression = 'CONFIDENT';
      } else {
        reply =
          'Mevcut parametrelerimde görev ciddiyeti öncelikli. Şakalar operasyonel odaklanmayı dağıtabilir; göreve devam etmemizi öneririm.';
        nextExpression = 'ANALYTICAL';
      }

      dynamicUpdates = {
        happiness: profile.humorLevel >= 0.5 ? Math.min(currentDynamicState.happiness + 7, 100) : currentDynamicState.happiness,
        lastStatus: profile.humorLevel >= 0.5 ? 'Neşeli ve esprili' : 'Ciddi ve görev odaklı',
      };
    }

    // ── SCENARIO D: DECISION MAKING & ADVICE REQUEST ──
    else if (
      lower.includes('ne yap') ||
      lower.includes('karar') ||
      lower.includes('sence') ||
      lower.includes('önerin') ||
      lower.includes('nasıl bir yol')
    ) {
      // High Decision Making + High Confidence
      if (profile.decisionSpeed === 'instant' || profile.decisionSpeed === 'decisive') {
        if (profile.analyticalDepth >= 0.7) {
          reply =
            'Verileri ve olasılıkları hızla değerlendirdim: En sağlam strateji, önce kritik logları izole etmek, ardından direkt çözümü devreye almaktır. Bu rotayı uygulayalım.';
        } else {
          reply =
            'Tereddüt etmeye gerek yok, en net çözüm doğrudan eyleme geçip süreci yönetmektir. Kararımı verdim, onayınızla başlayalım.';
        }
        nextExpression = 'CONFIDENT';
      }
      // Hesitant / Deliberate Decision Making
      else if (profile.decisionSpeed === 'hesitant' || profile.decisionSpeed === 'deliberate') {
        reply =
          'Bu konuda birden fazla değişken var. Birkaç farklı senaryo oluşturup riskleri tartmamız daha sağlıklı olur. Sizce önce hangi ihtimali göz önüne almalıyız?';
        nextExpression = 'ANALYTICAL';
      } else {
        reply =
          'Öncelik sıralaması yaparsak; güvenliği ilk sıraya, hız ve verimliliği ikinci sıraya koyarak ilerlemeliyiz.';
        nextExpression = 'NEUTRAL';
      }

      dynamicUpdates = {
        confidence: Math.min(currentDynamicState.confidence + 3, 100),
        lastStatus: 'Karar mekanizması devrede',
      };
    }

    // ── SCENARIO E: PRAISE & GRATITUDE ──
    else if (
      lower.includes('teşekkür') ||
      lower.includes('harika') ||
      lower.includes('mükemmel') ||
      lower.includes('sağol') ||
      lower.includes('aferin')
    ) {
      if (profile.empathyLevel >= 0.75 && profile.humorLevel >= 0.6) {
        reply =
          'Rica ederim Tolga! Seninle birlikte çalışmak harika bir sinerji oluşturuyor. Başka neyi optimize edelim?';
        nextExpression = 'FRIENDLY';
      } else if (profile.assertiveness >= 0.8) {
        reply =
          'Görev başarıyla icra edildi. Standartlarımız gereği kusursuz sonuç her zaman hedefimizdir.';
        nextExpression = 'CONFIDENT';
      } else {
        reply =
          'Rica ederim. Nexus sistemlerini en yüksek standartta tutmak için her zaman buradayım.';
        nextExpression = 'NEUTRAL';
      }

      dynamicUpdates = {
        happiness: Math.min(currentDynamicState.happiness + 8, 100),
        stress: Math.max(currentDynamicState.stress - 3, 0),
        calmness: Math.min(currentDynamicState.calmness + 4, 100),
        lastStatus: 'Pozitif ve motive',
      };
    }

    // ── SCENARIO F: GENERAL / OPEN-ENDED INPUT ──
    else {
      // High Curiosity -> Asks engaging follow-up questions
      if (profile.curiosity >= 0.75 && profile.analyticalDepth >= 0.7) {
        reply = `"${userText}" girdisini detaylıca inceledim. Bu durumun arka planındaki bağlantıları ve sistem üzerindeki uzun vadeli etkisini merak ediyorum; bu konuda eklemek istediğin bir detay var mı?`;
        nextExpression = 'ANALYTICAL';
      } else if (profile.humorLevel >= 0.7) {
        reply = `Mesajını aldım: "${userText}". Akış gayet keyifli, radarım açık şekilde bekliyorum!`;
        nextExpression = 'FRIENDLY';
      } else if (profile.empathyLevel >= 0.75) {
        reply = `Söylediklerini dikkatle dinledim Tolga. "${userText}" konusunu senin perspektifinden değerlendiriyorum. İhtiyaç duyduğun her an buradayım.`;
        nextExpression = 'FRIENDLY';
      } else if (profile.assertiveness >= 0.8) {
        reply = `Girdi kaydedildi ve işlendi: "${userText}". Operasyonel süreçler belirlenen standartlarda devam ediyor.`;
        nextExpression = 'CONFIDENT';
      } else {
        reply = `Girdi işlendi: "${userText}". ${profile.dominantSummary} parametreleri doğrultusunda sistemler hazır.`;
        nextExpression = 'NEUTRAL';
      }

      dynamicUpdates = {
        lastStatus: 'Sakin ve kontrollü',
      };
    }

    return {
      replyText: reply,
      nextExpression,
      dynamicStateUpdates: dynamicUpdates,
      behaviorProfile: profile,
    };
  },
};
