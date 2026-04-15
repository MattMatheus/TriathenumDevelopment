import { test, expect } from "@playwright/test";
import { signInAsOwner } from "./helpers.js";

test("sign-in shell renders and prompts for login", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /sign in before browsing or editing this world/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
});

test("login form exposes stable baseline fields", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByLabel(/email/i)).toBeVisible();
  await expect(page.getByLabel(/password/i)).toBeVisible();
  await expect(page.getByText(/default local credentials/i)).toBeVisible();
});

test("owner sign-in reaches the world browser shell", async ({ page }) => {
  await signInAsOwner(page);

  await expect(page.getByRole("heading", { name: /world browser/i })).toBeVisible();
  await expect(page.getByText(/owner@worldforge\.local/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: /collaborator access/i })).toBeVisible();
  await expect(page.getByText(/visible entries/i)).toBeVisible();
});

test("owner can open the editor and cancel back to detail view", async ({ page }) => {
  await signInAsOwner(page);

  await page.getByRole("button", { name: /edit entity/i }).click();
  await expect(page.getByRole("heading", { name: /entity editor/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /save entity/i })).toBeVisible();

  await page.getByRole("button", { name: /^cancel$/i }).click();
  await expect(page.getByRole("heading", { name: /entity detail/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /edit entity/i })).toBeVisible();
});

test("new entity flow exposes prose assistance and unconfigured AI messaging", async ({ page }) => {
  await signInAsOwner(page);

  await page.getByRole("button", { name: /new entity/i }).click();

  await expect(page.getByRole("heading", { name: /entity editor/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /prose assistance/i })).toBeVisible();
  await expect(page.getByText(/configure the ai baseline first to enable prose assistance/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /preview suggestion/i })).toBeDisabled();
});
