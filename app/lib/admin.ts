/**
 * Shared admin configuration.
 * Admin emails are loaded from ADMIN_EMAILS env var (comma-separated)
 * with a fallback to the hardcoded default.
 */

const FALLBACK_ADMIN_EMAILS = ["danteod99@gmail.com"];

export function getAdminEmails(): string[] {
  const envEmails = process.env.ADMIN_EMAILS;
  if (envEmails) {
    return envEmails.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  }
  return FALLBACK_ADMIN_EMAILS;
}

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.toLowerCase());
}
