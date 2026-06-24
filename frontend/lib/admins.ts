export const ADMIN_EMAILS = [
  "lamnguyenle05@gmail.com",
];

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}
