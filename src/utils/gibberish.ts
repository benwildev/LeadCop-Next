/**
 * Advanced Gibberish & Pattern Detection Utility
 * Designed to detect random strings, lack of linguistic structure, and suspicious sequences.
 */

export interface GibberishResult {
  isGibberish: boolean;
  score: number; // 0 to 1, higher is more likely gibberish
  reasons: string[];
}

/**
 * Detects if a string (local part or domain) looks like gibberish.
 */
export function analyzeGibberish(str: string): GibberishResult {
  const reasons: string[] = [];
  let score = 0;

  if (!str) return { isGibberish: false, score: 0, reasons: [] };

  const clean = str.toLowerCase();
  const length = clean.length;

  // 1. Vowel-to-Consonant Ratio
  const vowels = (clean.match(/[aeiou]/g) || []).length;
  const consonants = (clean.match(/[bcdfghjklmnpqrstvwxyz]/g) || []).length;
  
  if (length >= 5) {
    const vowelRatio = vowels / length;
    if (vowelRatio < 0.1) {
      score += 0.4;
      reasons.push("Extremely low vowel density");
    } else if (vowelRatio < 0.2) {
      score += 0.2;
      reasons.push("Low vowel density");
    }
  }

  // 2. Character Repetition
  const maxRepeated = /(.)\1{3,}/.test(clean); // 4+ repeated chars (aaaa, xxxx)
  if (maxRepeated) {
    score += 0.5;
    reasons.push("Excessive character repetition");
  }

  // 3. Sequential Characters (abcde, 12345)
  const sequences = ["abcdef", "qwerty", "asdfgh", "123456"];
  for (const seq of sequences) {
    if (clean.includes(seq)) {
      score += 0.3;
      reasons.push(`Pattern sequence detected (${seq})`);
    }
  }

  // 4. Consonant Clusters (e.g. "sdkfsdk", "ghjkl")
  const clusters = clean.match(/[bcdfghjklmnpqrstvwxyz]{5,}/g);
  if (clusters) {
    score += 0.4;
    reasons.push("Dense consonant clusters detected");
  }

  // 5. Entropy-like check: Diversity of characters vs length
  const uniqueChars = new Set(clean).size;
  if (length > 8 && uniqueChars / length > 0.8) {
    // Too many unique characters in a short string often means randomness
    score += 0.2;
    reasons.push("High character diversity (potential randomness)");
  }

  return {
    isGibberish: score >= 0.5,
    score: Math.min(1, score),
    reasons
  };
}

/**
 * Specialized check for domain linguistic probability.
 */
export function analyzeDomainQuality(domain: string): GibberishResult {
  const parts = domain.split(".");
  const name = parts[0];
  
  const result = analyzeGibberish(name);
  
  // Domains with numbers in the middle are often suspicious for business use
  if (/[a-z]+[0-9]{3,}[a-z]*/.test(name)) {
    result.score += 0.3;
    result.reasons.push("Suspicious numeric sequence in domain");
  }

  result.isGibberish = result.score >= 0.6;
  return result;
}
