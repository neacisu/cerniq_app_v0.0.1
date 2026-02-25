import { faker } from "@faker-js/faker/locale/ro";

export function createTenantData(
  overrides?: Partial<{
    name: string;
    slug: string;
    status: "active" | "suspended" | "trial" | "cancelled";
    settings: Record<string, unknown>;
  }>,
) {
  const name = overrides?.name ?? faker.company.name();
  const slug =
    overrides?.slug ?? faker.helpers.slugify(name).toLowerCase().replace(/\s+/g, "-").slice(0, 80);
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
