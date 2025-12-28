

const INTENTS = [
  "APPOINTMENT",
  "ENQUIRY", 
  "GENERAL_ENQUIRY",
  "FOLLOW_UP",
  "MEDICAL_DICTATION",
  "NOT_INTERESTED"
];

const INTENT_PATTERNS = {
  "APPOINTMENT": [
    "book an appointment",
    "schedule an appointment", 
    "want to see the doctor",
    "consult the doctor",
    "appointment availability",
    "when can i see",
    "available slots",
    "book a slot"
  ],

  "ENQUIRY": [
    "enquire about appointment",
    "appointment enquiry",
    "when is doctor available",
    "doctor availability", 
    "consultation timing",
    "appointment timing",
    "available for consultation",
    "doctor available",
    "consultation availability"
  ],

  "GENERAL_ENQUIRY": [
    "enquire about",
    "want to know",
    "need information",
    "can you tell me",
    "looking for details",
    "what is",
    "how much",
    "general information"
  ],

  "FOLLOW_UP": [
    "follow up",
    "checking again", 
    "previous consultation",
    "earlier appointment"
  ],

  "MEDICAL_DICTATION": [
    "dear doctor",
    "referral letter",
    "date of birth",
    "clinical examination",
    "on examination",
    "diagnosis",
    "treatment plan"
  ],

  "NOT_INTERESTED": [
    "not interested",
    "don't want",
    "stop calling",
    "no longer needed"
  ]
};

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function scoreIntents(text: string): Record<string, number> {
  const scores: Record<string, number> = {};
  INTENTS.forEach(intent => scores[intent] = 0);

  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    for (const phrase of patterns) {
      if (text.includes(phrase)) {
        scores[intent] += 1;
      }
    }
  }

  return scores;
}

function resolveIntent(scores: Record<string, number>): string {
  // Medical dictation takes priority
  if (scores["MEDICAL_DICTATION"] >= 2) {
    return "MEDICAL_DICTATION";
  }

  // Not interested always wins
  if (scores["NOT_INTERESTED"] >= 1) {
    return "NOT_INTERESTED";
  }

  // Pick highest scoring intent
  const bestIntent = Object.keys(scores).reduce((a, b) => 
    scores[a] > scores[b] ? a : b
  );

  // Default fallback
  if (scores[bestIntent] === 0) {
    return "GENERAL_ENQUIRY";
  }

  return bestIntent;
}

export function classifyIntent(text: string): {
  intent: string;
  confidence: number;
  scores: Record<string, number>;
  is_hot: boolean;
} {
  const normalizedText = normalizeText(text);
  const scores = scoreIntents(normalizedText);
  const finalIntent = resolveIntent(scores);

  // Only appointment-related enquiries and actual appointments are hot leads
  const isHot = ["APPOINTMENT", "ENQUIRY", "FOLLOW_UP"].includes(finalIntent);

  const confidence = Math.min(0.95, 0.5 + (scores[finalIntent] || 0) * 0.15);

  return {
    intent: finalIntent,
    confidence: Math.round(confidence * 100) / 100,
    scores,
    is_hot: isHot
  };
}