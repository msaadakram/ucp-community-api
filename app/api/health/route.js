import { getConfig } from '@/lib/config';
import { json } from '@/lib/respond';

export const runtime = 'nodejs';

export async function GET() {
  const config = getConfig();
  if (!config.ok) return json({ ok: false }, { status: 500 });
  return json({ ok: true, time: new Date().toISOString() });
}
