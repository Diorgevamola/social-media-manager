import { createClient } from '@/lib/supabase/server'

/**
 * Returns true if the given email is in the ADMIN_EMAIL env variable.
 * Multiple admins: ADMIN_EMAIL=admin1@x.com,admin2@x.com
 */
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false
  const admins = (process.env.ADMIN_EMAIL ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return admins.includes(email.toLowerCase())
}

/**
 * Validates the current session and checks admin status.
 * Use in API routes that require admin access.
 *
 * Returns { userId } if ok, or a Response (401/403) if not.
 */
export async function requireAdmin(
  _request: Request,
): Promise<{ userId: string } | Response> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!isAdminEmail(user.email)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return { userId: user.id }
}
