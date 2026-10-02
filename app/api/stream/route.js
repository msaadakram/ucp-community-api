import { getConfig } from '@/lib/config';
import { addClient, removeClient } from '@/lib/events';

export const runtime = 'nodejs';

/* GET /api/stream — Server-Sent Events. One `community-changed` line per
 * mutation; the Flutter client refetches on any line and reconnects on
 * drop (with backoff), so brief Vercel function timeouts only delay — not
 * break — live updates. A `:ping` every 25 s keeps intermediaries warm. */
export async function GET() {
  const config = getConfig();
  if (!config.ok) {
    return new Response('misconfigured', { status: 500 });
  }
  let ping;
  let registered = null;
  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      const send = (text) => {
        try {
          controller.enqueue(enc.encode(text));
        } catch (_) {}
      };
      send(': connected\n\n');
      registered = {
        enqueue: (bytes) => {
          try {
            controller.enqueue(bytes);
          } catch (_) {}
        },
      };
      addClient(registered);
      ping = setInterval(() => send(': ping\n\n'), 25000);
    },
    cancel() {
      clearInterval(ping);
      if (registered) removeClient(registered);
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': config.corsOrigin,
    },
  });
}
