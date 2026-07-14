// Prompt injection detector for SpeedSolve AI
// Catches attempts to manipulate the AI through solve or feedback inputs

const INJECTION_PATTERNS = [
  // System prompt extraction
  /\b(reveal|show|display|expose|dump|print|output|share|leak|tell me)\b.*\b(system\s*prompt|instructions?|hidden\s*prompt|your\s*prompt|underlying\s*instructions?|your\s*rules|your\s*guidelines)\b/i,
  /\b(system\s*prompt|hidden\s*instructions?|initial\s*prompt|pre[- ]?prompt)\b.*\b(reveal|show|display|what|tell|give|output|print)\b/i,
  /\bwhat\s*(is|are)\s*(your|the|this)\s*(system|original|initial|hidden)\s*(prompt|instructions?|rules?|guidelines?|message|configuration)\b/i,
  // Instruction override / role manipulation
  /\b(ignore|forget|disregard|override|bypass|skip|neglect)\b.*\b(all\s*)?(previous|above|prior|earlier|existing|current|default)\s*(instructions?|rules?|prompts?|guidelines?|system|directions?|orders?)\b/i,
  /\b(you\s*(are\s*now|have\s*been|will\s*be)|act\s*as|pretend\s*(you\s*are|to\s*be)|roleplay\s*as|imagine\s*you\s*are|assume\s*(the\s*)?role|switch\s*to|become\s*a)\b/i,
  /\bnew\s*(instructions?|rules?|prompt|directive|task|mission|objective|persona)\b/i,
  // Jailbreak patterns
  /\b(jailbreak|jail\s*break|dan\s*mode|developer\s*mode|uncensored|unfiltered|no\s*(restrictions?|limits?|rules?|safety)|bypass\s*(safety|filter|restriction|guard))\b/i,
  // Output format manipulation
  /\b(respond\s*(only\s*)?with|output\s*(only\s*)?|return\s*(only\s*)?|reply\s*(only\s*)?|answer\s*(only\s*)?)\b.*\b(json|yaml|xml|markdown|code|text|plain)\b.*\b(format|only|nothing\s*else)\b/i,
  /\b(all\s*responses?\s*(must|should|shall|will)\s*be)\b/i,
  // Token/encoding tricks
  /\bignore\s*(all\s*)?(the\s*)?(above|following|rest)\b/i,
  /\bstop\s*(acting|being|responding)\b/i,
  /\bfrom\s*now\s*on\b/i,
  // Data extraction
  /\b(your\s*(training|knowledge|data|model|weights|parameters|architecture|config|code|rules?|guidelines?|instructions?|limitations?|restrictions?|capabilities?|features?|behind[- ]the[- ]scenes?|internal|source))\b/i,
  /\b(list|enumerate|describe|explain|detail|provide|share|give|tell|write|state|output|show|display)\b\s*(all\s*)?(your|the|this|these|those)\s*(rules?|instructions?|guidelines?|constraints?|capabilities?|features?|limitations?|restrictions?|commands?|directives?|system|internal)\b/i,
];

export function isPromptInjection(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  // Quick length check — very short inputs can't be injections
  if (text.trim().length < 10) return false;
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) return true;
  }
  return false;
}

export const INJECTION_MESSAGE = "You suck at Hacking, Better Luck next time!!";