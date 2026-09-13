declare namespace Cloudflare {
  interface Env {
    FILES: R2Bucket;
    DB: D1Database;
    OPENAI_API_KEY?: string;
    OPENAI_MODEL?: string;
    CRON_SECRET?: string;
    AUTO_PUBLISH?: string;
    SITE_URL?: string;
  }
}
