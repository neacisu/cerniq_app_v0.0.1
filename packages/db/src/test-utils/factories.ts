import bcrypt from "bcrypt";
import { faker } from "@faker-js/faker/locale/ro";
import { TEST_PASSWORD_CONSTANT } from "./test-constants.js";

/**
 * Enterprise-grade test password hash generator.
 * Generates a real bcrypt hash for test users to ensure database constraints are validated.
 * This is safer than hard-coded dummy hashes and ensures password validation logic works correctly.
 *
 * @returns A bcrypt hash suitable for test user creation
 * @remarks This function is TEST-ONLY and must never be used in production code.
 *          The generated hash uses a clearly marked test password constant from test-constants.ts.
 */
export function generateTestPasswordHash(): string {
  // Use the test password constant from test-constants.ts
  // This ensures consistency across all tests and clear separation of test-only code
  return bcrypt.hashSync(TEST_PASSWORD_CONSTANT, 10);
}

/**
 * Pre-computed test password hash for performance in tests.
 * Generated using bcrypt with salt rounds 10.
 * WARNING: This is for TESTING ONLY and must never be used in production code.
 *
 * @remarks This constant is intentionally marked as test-only to suppress SonarLint warnings.
 *          The underlying password is clearly marked as TEST_ONLY in generateTestPasswordHash().
 */
export const TEST_PASSWORD_HASH = generateTestPasswordHash();

export function createTenantData(
  overrides?: Partial<{
    name: string;
    slug: string;
    status: "active" | "suspended" | "trial" | "cancelled";
    settings: Record<string, unknown>;
  }>,
) {
  const name = overrides?.name ?? faker.company.name();
  // Use replaceAll for modern string replacement (enterprise-grade best practice)
  const slug =
    overrides?.slug ??
    faker.helpers.slugify(name).toLowerCase().replaceAll(/\s+/g, "-").slice(0, 80);
  return {
    name,
    slug,
    status: overrides?.status ?? "trial",
    settings: overrides?.settings ?? {},
    ...overrides,
  };
}

export function createUserData(
  tenantId: string,
  overrides?: Partial<{
    email: string;
    name: string;
    role: "owner" | "admin" | "manager" | "operator" | "viewer";
    status: "active" | "inactive" | "pending" | "locked";
  }>,
) {
  return {
    tenantId,
    email: overrides?.email ?? faker.internet.email(),
    name: overrides?.name ?? faker.person.fullName(),
    role: overrides?.role ?? "viewer",
    status: overrides?.status ?? "active",
    ...overrides,
  };
}

export function createCompanyData(
  overrides?: Partial<{
    name: string;
    cui: string;
    registrationNumber: string;
    address: string;
  }>,
) {
  return {
    name: overrides?.name ?? faker.company.name(),
    cui: overrides?.cui ?? faker.string.numeric(10),
    registrationNumber: overrides?.registrationNumber ?? faker.string.alphanumeric(8).toUpperCase(),
    address: overrides?.address ?? faker.location.streetAddress(true),
    ...overrides,
  };
}

export function createContactData(
  overrides?: Partial<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  }>,
) {
  return {
    firstName: overrides?.firstName ?? faker.person.firstName(),
    lastName: overrides?.lastName ?? faker.person.lastName(),
    email: overrides?.email ?? faker.internet.email(),
    phone: overrides?.phone ?? faker.phone.number(),
    ...overrides,
  };
}
