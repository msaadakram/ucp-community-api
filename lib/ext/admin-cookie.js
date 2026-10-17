/* Admin cookie name shared by the cookie-session API route, admin pages,
 * and cookie-authenticated admin APIs. Kept in lib/ so API routes never
 * import from app/ (page code pulls next/headers + next/navigation). */

export const ADMIN_COOKIE = 'ucp_admin_token';
