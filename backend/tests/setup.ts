// Set test environment before any imports
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/iptv_test';
process.env.ACCESS_TOKEN_SECRET = 'test-access-token-secret-min-16-chars';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-token-secret-min-16';
