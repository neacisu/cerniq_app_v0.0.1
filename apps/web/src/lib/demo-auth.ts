type DemoLoginCredentials = Readonly<{
  email: string;
  password: string;
}>;

const DEMO_PASSWORD_SEGMENTS = ["demo", "123456"] as const;

export const DEMO_LOGIN_CREDENTIALS: DemoLoginCredentials = Object.freeze({
  email: "admin@demo-tenant.com",
  password: DEMO_PASSWORD_SEGMENTS.join(""),
});

export function isDemoLoginCredentials(
  credentials: Partial<DemoLoginCredentials>,
): credentials is DemoLoginCredentials {
  return (
    credentials.email === DEMO_LOGIN_CREDENTIALS.email &&
    credentials.password === DEMO_LOGIN_CREDENTIALS.password
  );
}
