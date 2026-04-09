import { test as setup } from "@playwright/test";
import { saveAuthenticatedStorageState } from "./fixtures/auth.fixture.ts";

setup("autentificare mock API → storageState", async ({ page }) => {
  await saveAuthenticatedStorageState(page);
});
