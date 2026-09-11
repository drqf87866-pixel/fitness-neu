declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    /** Optional – ohne Key nutzt die KI-Generierung einen Fallback-Plan. */
    GEMINI_API_KEY?: string;
  }
}
