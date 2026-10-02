/* In-process fan-out for live updates: every mutation broadcasts one
 * event; connected SSE clients refetch.
 *
 * VERCEL NOTE: serverless instances do NOT share memory. On a single warm
 * instance this works perfectly; across scaled-out instances a mutation on
 * instance A won't reach SSE clients stuck to instance B. The Flutter app
 * already refetches after every mutation and on screen open, so the worst
 * case is "updates arrive on next open" instead of instantly. For
 * guaranteed cross-instance realtime later: Supabase Realtime (postgres
 * changes) or Upstash Redis pub/sub in place of this Set. */

const clients = new Set();

export function addClient(controller) {
  clients.add(controller);
}

export function removeClient(controller) {
  clients.delete(controller);
}

export function broadcast() {
  const payload = 'data: {"type":"community-changed"}\n\n';
  for (const controller of [...clients]) {
    try {
      controller.enqueue(new TextEncoder().encode(payload));
    } catch (_) {
      clients.delete(controller);
    }
  }
}

export function clientCount() {
  return clients.size;
}

export function __reset() {
  clients.clear();
}
