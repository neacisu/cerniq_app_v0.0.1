process.env.NODE_ENV = "test";
process.env.PORT = "0";
process.env.JWT_SECRET = "test-jwt-secret-minimum-32-characters-long";
process.env.DATABASE_URL = "postgresql://test:test@localhost:6432/test";
process.env.REDIS_URL = "redis://localhost:6379";
process.env.LOG_LEVEL = "error";
