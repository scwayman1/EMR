/**
 * Smart Replies Engine
 * 
 * Generates context-aware quick reply suggestions for patient and clinician messaging.
 * In V1, this uses deterministic rule-based NLP. In V2, it routes to a 
 * dedicated LLM microservice.
 */

export interface MessageContext {
  lastMessageBody: string;
  senderRole: "patient" | "clinician" | "system";
  threadTopic?: string;
  triageUrgency?: "emergency" | "high" | "routine" | "low";
}

const COMMON_PATTERNS = [
  {
    regex: /\b(refill|prescription|more medicine)\b/i,
    patientReplies: ["Yes, I need a refill please.", "Can we schedule a call to discuss a refill?"],
    clinicianReplies: ["I have sent the refill to your pharmacy.", "Please schedule a quick follow-up before we refill."],
  },
  {
    regex: /\b(appointment|schedule|see you)\b/i,
    patientReplies: ["When are you available?", "Can we do a telehealth visit?"],
    clinicianReplies: ["Please use the portal to book a time.", "I have an opening on Thursday at 2 PM."],
  },
  {
    regex: /\b(side effect|dizzy|nauseous|headache)\b/i,
    patientReplies: ["Is this normal?", "Should I stop taking it?"],
    clinicianReplies: ["Please stop the medication and call the office.", "Try taking it with food and let me know if it persists."],
  },
  {
    regex: /\b(thank you|thanks|appreciate)\b/i,
    patientReplies: ["You're welcome!", "Sounds good."],
    clinicianReplies: ["You're very welcome.", "Happy to help!"],
  }
];

export function generateSmartReplies(context: MessageContext): string[] {
  // If it's a high urgency triage, don't suggest casual quick replies
  if (context.triageUrgency === "emergency" || context.triageUrgency === "high") {
    if (context.senderRole === "clinician") {
      return [
        "Please go to the nearest emergency room.",
        "I am calling you right now.",
      ];
    }
    return [];
  }

  const suggestions = new Set<string>();
  const text = context.lastMessageBody.toLowerCase();

  // Pattern matching
  for (const pattern of COMMON_PATTERNS) {
    if (pattern.regex.test(text)) {
      const replies = context.senderRole === "clinician" 
        ? pattern.clinicianReplies 
        : pattern.patientReplies;
      
      replies.forEach(r => suggestions.add(r));
    }
  }

  // Fallbacks if no patterns matched
  if (suggestions.size === 0) {
    if (text.endsWith("?")) {
      suggestions.add("Yes, that sounds right.");
      suggestions.add("No, I don't think so.");
      suggestions.add("Let me check on that and get back to you.");
    } else {
      suggestions.add("Understood.");
      suggestions.add("Thank you for the update.");
    }
  }

  // Return max 3 suggestions
  return Array.from(suggestions).slice(0, 3);
}
