// Runs before each test file's imports — point everything at the REAL Postgres
// TEST database (spec forbids SQLite) and pin money/gateway config deterministically.
// connection_limit is generous so the 50-way concurrency test runs truly in parallel.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://lc:lcpass@localhost:5432/lc_publications_test?connection_limit=50&pool_timeout=20";

process.env.GATEWAY_FEE_RATE = "0.0236";
process.env.GST_ENABLED = "false";
process.env.RAZORPAY_WEBHOOK_SECRET = "test_webhook_secret";
process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID = "rzp_test_key";
process.env.RAZORPAY_KEY_SECRET = "test_key_secret";
process.env.NODE_ENV = "test";
