const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (testDatabaseUrl) {
  process.env.DATABASE_URL = testDatabaseUrl;
  process.env.SUPABASE_DB_URL_SERVICE_ROLE = testDatabaseUrl;
}

const testRedisHost = process.env.TEST_UPSTASH_REDIS_HOST;
if (testRedisHost) {
  process.env.UPSTASH_REDIS_HOST = testRedisHost;
}

const testRedisPassword = process.env.TEST_UPSTASH_REDIS_PASSWORD;
if (testRedisPassword !== undefined) {
  process.env.UPSTASH_REDIS_PASSWORD = testRedisPassword;
}
