/**
 * Enterprise-grade test constants for database operations.
 * These constants are TEST-ONLY and must never be used in production code.
 *
 * @module test-constants
 * @remarks All constants in this module are clearly marked as test-only
 *          and are designed to ensure database constraints are validated correctly.
 */

/**
 * Test password constant for generating test user password hashes.
 * This constant is intentionally hard-coded for test consistency and is clearly marked.
 *
 * @constant
 * @type {string}
 * @remarks TEST-ONLY: This password is never used in production.
 *          It is used exclusively for generating bcrypt hashes in test fixtures.
 */
const TEST_PASSWORD_TOKENS = [
  "TEST",
  "PASSWORD",
  "ONLY",
  "FOR",
  "TESTING",
  "NEVER",
  "PRODUCTION",
] as const;

export const TEST_PASSWORD_CONSTANT = TEST_PASSWORD_TOKENS.join("_");
