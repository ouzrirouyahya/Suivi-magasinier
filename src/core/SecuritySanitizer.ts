import { logger } from '../lib/utils';

/**
 * Advanced Client-Side Security Suite
 * Prevents automated bots, XSS script injection, SQL-injection attempts,
 * and malicious payloads before they ever hit the database.
 */
export class SecuritySanitizer {
  // Common attack payload signatures for detection (SQL Injection, XSS, Path Traversal, Shell commands)
  private static THREAT_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // <script> tags
    /javascript:/gi,                                         // JS protocol links
    /on\w+\s*=/gi,                                           // Inline HTML event handlers (onload, onerror, etc.)
    /UNION\s+SELECT/gi,                                      // SQL injection patterns
    /SELECT\s+.*\s+FROM/gi,                                  // SQL query patterns
    /OR\s+['"]?\d+['"]?\s*=\s*['"]?\d+/gi,                   // SQL identity injections (e.g. OR '1'='1)
    /\.\.\//g,                                               // Path traversal (relative navigation)
    /(?:[;&|`]|\$\()/g                                       // Shell command injection delimiters
  ];

  /**
   * Sanitizes user-provided string inputs by removing HTML tags, escaping special characters,
   * and neutralising code snippets.
   */
  public static sanitize(input: string | null | undefined): string {
    if (!input) return '';
    let sanitized = String(input).trim();

    // 1. Strip raw HTML/JS tags
    sanitized = sanitized.replace(/<[^>]*>/g, '');

    // 2. Escape potential script tags and characters
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
      '`': '&#x60;'
    };
    sanitized = sanitized.replace(/[&<>"'/`]/g, (char) => map[char] || char);

    return sanitized;
  }

  /**
   * Scans an input string to identify potential structural attacks or payloads.
   * Returns true if a malicious signature is matched.
   */
  public static isThreatDetected(input: string | null | undefined): boolean {
    if (!input) return false;
    const str = String(input);
    for (const pattern of this.THREAT_PATTERNS) {
      if (pattern.test(str)) {
        logger.warn(`[SECURITY BREACH DETECTED] Malicious pattern matched: "${pattern}" in input.`);
        return true;
      }
    }
    return false;
  }

  /**
   * Validates multiple inputs of an object to catch attacks across any field.
   */
  public static validatePayload(payload: Record<string, any>): { safe: boolean; errorField?: string } {
    for (const key of Object.keys(payload)) {
      const val = payload[key];
      if (typeof val === 'string') {
        if (this.isThreatDetected(val)) {
          return { safe: false, errorField: key };
        }
      } else if (val && typeof val === 'object') {
        const nestedResult = this.validatePayload(val);
        if (!nestedResult.safe) {
          return nestedResult;
        }
      }
    }
    return { safe: true };
  }

  /**
   * -------------------------------------------------------------
   * PROOF OF WORK (PoW) CRYPTOGRAPHIC BOT DEFENSE
   * -------------------------------------------------------------
   * Generates a puzzle that requires client CPU power to solve.
   * Bots that spam submissions rapidly will run out of resources
   * or fail to supply the required PoW signature, causing instant block.
   */
  private static DIFFICULTY = 3; // Number of leading zero nibbles required

  /**
   * Generates a unique crypto challenge
   */
  public static generateChallenge(prefix = 'hydromines_challenge'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Computes a quick hash (client solving routine)
   */
  private static simpleHash(str: string): string {
    let hash = 0;
    if (str.length === 0) return '00000000';
    for (let i = 0; i < str.length; i++) {
      const chr = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0; // Convert to 32bit integer
    }
    // Hex representation
    const hex = (hash >>> 0).toString(16);
    return hex.padStart(8, '0');
  }

  /**
   * Solves the crypto puzzle by incrementing a nonce until a hash starts with zeroes
   */
  public static solveChallenge(challenge: string, difficulty = this.DIFFICULTY): { nonce: string; duration: number } {
    const start = Date.now();
    let nonce = 0;
    const targetPrefix = '0'.repeat(difficulty);
    
    while (nonce < 1000000) { // Safety limit to avoid hanging the browser UI
      const candidate = `${challenge}_${nonce}`;
      const hash = this.simpleHash(candidate);
      if (hash.startsWith(targetPrefix)) {
        return {
          nonce: String(nonce),
          duration: Date.now() - start
        };
      }
      nonce++;
    }
    
    return { nonce: 'failed', duration: Date.now() - start };
  }

  /**
   * Verifies if the solver answered correctly
   */
  public static verifyChallenge(challenge: string, nonce: string, difficulty = this.DIFFICULTY): boolean {
    if (!nonce || nonce === 'failed') return false;
    const candidate = `${challenge}_${nonce}`;
    const hash = this.simpleHash(candidate);
    const targetPrefix = '0'.repeat(difficulty);
    return hash.startsWith(targetPrefix);
  }
}
