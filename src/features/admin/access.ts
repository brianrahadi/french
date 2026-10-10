/**
 * Who sees the Admin link. The real check is in the database (`is_admin()` in
 * supabase/schema.sql): keep both lists the same.
 */
export const ADMIN_EMAILS = ['brian.rahadi@gmail.com']

export const isAdminEmail = (email?: string | null): boolean => !!email && ADMIN_EMAILS.includes(email.trim().toLowerCase())
