/**
 * Shared admin configuration.
 * Admin emails are loaded from ADMIN_EMAILS env var (comma-separated)
 * with a fallback to the hardcoded default.
 */

export function getAdminEmails(): string[] {
  const envEmails = process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || "";
  const emails = envEmails.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  // Fallback to ensure at least the owner is always admin
  if (emails.length === 0) return ["danteod99@gmail.com"];
  return emails;
}

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.toLowerCase());
}
