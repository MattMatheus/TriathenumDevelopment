export async function signInAsOwner(page) {
  await page.goto("/");

  await page.getByLabel(/email/i).fill("owner@worldforge.local");
  await page.getByLabel(/password/i).fill("worldforge-owner");
  await page.getByRole("button", { name: /sign in/i }).click();

  await page.getByText(/signed in as/i).waitFor();
}
