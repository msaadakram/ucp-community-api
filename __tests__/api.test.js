/* API route tests: real route handlers, mocked Odoo verifier + Supabase.
 * No network, no database. */

import { testApiHandler } from 'next-test-api-route-handler';
import * as healthHandler from '../app/api/health/route';
import * as meHandler from '../app/api/me/route';
import * as postsHandler from '../app/api/posts/route';
import * as postVoteHandler from '../app/api/posts/[id]/vote/route';
import * as threadHandler from '../app/api/posts/[id]/comments/route';
import * as commentVoteHandler from '../app/api/comments/[id]/vote/route';
import * as uploadHandler from '../app/api/upload/route';
import * as commentVoteHandler from '../app/api/comments/[id]/vote/route';
import { __setClient, __resetClient } from '@/lib/supabase';
import { __reset as __resetEvents } from '@/lib/events';
import {
  makeRows,
  makeSupabase,
  authedVerify,
  anonVerify,
} from '../test-support/fakes';

jest.mock('../lib/odoo.js', () => ({
  verifyOdooSession: jest.fn(),
}));

import { verifyOdooSession } from '@/lib/odoo';

const POST_ID = makeRows().community_posts[0].id;

function authed() {
  verifyOdooSession.mockResolvedValue({
    uid: 7,
    email: 'tester@ucp.edu.pk',
    name: 'tester',
  });
}

function anon() {
  verifyOdooSession.mockResolvedValue(null);
}

beforeEach(() => {
  verifyOdooSession.mockReset();
  __resetClient();
  __resetEvents();
  process.env.SUPABASE_URL = 'https://x.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

describe('auth', () => {
  test('health is public', async () => {
    await testApiHandler({
      appHandler: healthHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: 'GET' });
        expect(res.status).toBe(200);
        expect((await res.json()).ok).toBe(true);
      },
    });
  });

  test('/api/me is 401 without a session', async () => {
    anon();
    await testApiHandler({
      appHandler: meHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: 'GET' });
        expect(res.status).toBe(401);
      },
    });
  });

  test('/api/me echoes the verified Odoo identity', async () => {
    authed();
    await testApiHandler({
      appHandler: meHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'GET',
          headers: { 'x-ucp-session': 'live-sid' },
        });
        expect(res.status).toBe(200);
        expect((await res.json()).user.email).toBe('tester@ucp.edu.pk');
      },
    });
  });

  test('writes without a session are 401', async () => {
    anon();
    __setClient(makeSupabase(makeRows()));
    await testApiHandler({
      appHandler: postsHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'x', flair: 'Study' }),
        });
        expect(res.status).toBe(401);
      },
    });
  });
});

describe('posts', () => {
  test('feed aggregates scores, votes and threads', async () => {
    const tables = makeRows();
    const pid = tables.community_posts[0].id;
    tables.community_votes.push(
      { post_id: pid, author_email: 'a@x', value: 1 },
      { post_id: pid, author_email: 'a@x', value: 1 },
      { post_id: pid, author_email: 'tester@ucp.edu.pk', value: -1 },
    );
    tables.community_comments.push({
      id: 'c1',
      post_id: pid,
      parent_id: null,
      author_name: 's',
      text: 't',
      created_at: new Date().toISOString(),
    });
    authed();
    __setClient(makeSupabase(tables));
    await testApiHandler({
      appHandler: postsHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'GET',
          headers: { 'x-ucp-session': 'live-sid' },
        });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.posts).toHaveLength(1);
        expect(body.posts[0].score).toBe(2);
        expect(body.posts[0].vote).toBe(-1);
        expect(body.posts[0].commentCount).toBe(1);
        expect(body.posts[0].comments).toHaveLength(1);
      },
    });
  });

  test('before cursor pages older posts, garbage means page one', async () => {
    const tables = makeRows();
    const newer = tables.community_posts[0].created_at;
    tables.community_posts.push({
      id: '22222222-2222-2222-2222-222222222222',
      author_email: 'old@ucp.edu.pk',
      author_name: 'oldie',
      title: 'Older post',
      body: 'from yesterday',
      flair: 'Study',
      image_url: null,
      created_at: new Date(Date.now() - 26 * 3600000).toISOString(),
    });
    authed();
    __setClient(makeSupabase(tables));
    await testApiHandler({
      appHandler: postsHandler,
      url: `/api/posts?limit=10&before=${encodeURIComponent(newer)}`,
      test: async ({ fetch }) => {
        const page2 = await fetch({
          method: 'GET',
          headers: { 'x-ucp-session': 'live-sid' },
        });
        expect(page2.status).toBe(200);
        const b2 = await page2.json();
        expect(b2.posts).toHaveLength(1);
        expect(b2.posts[0].title).toBe('Older post');
      },
    });
    await testApiHandler({
      appHandler: postsHandler,
      url: '/api/posts?limit=10&before=not-a-date',
      test: async ({ fetch }) => {
        const garbage = await fetch({
          method: 'GET',
          headers: { 'x-ucp-session': 'live-sid' },
        });
        expect(garbage.status).toBe(200);
        expect((await garbage.json()).posts).toHaveLength(2);
      },
    });
  });

  test('create uses the SESSION identity, never the body author', async () => {
    authed();
    __setClient(makeSupabase(makeRows()));
    await testApiHandler({
      appHandler: postsHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-ucp-session': 'live-sid',
          },
          body: JSON.stringify({
            title: 'Hello campus',
            body: 'first!',
            flair: 'Study',
            author_email: 'evil@x',
            author_name: 'evil',
          }),
        });
        expect(res.status).toBe(201);
        expect((await res.json()).post.author).toBe('tester');
      },
    });
  });

  test('create validation: title, flair', async () => {
    authed();
    __setClient(makeSupabase(makeRows()));
    await testApiHandler({
      appHandler: postsHandler,
      test: async ({ fetch }) => {
        const post = (body) =>
          fetch({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-ucp-session': 'live-sid',
            },
            body: JSON.stringify(body),
          });
        expect((await post({ title: '', flair: 'Study' })).status).toBe(400);
        expect((await post({ title: 'ok', flair: 'Nope' })).status).toBe(400);
        expect((await post({ title: 'x'.repeat(121), flair: 'Study' })).status).toBe(
          400,
        );
      },
    });
  });

  test('vote set, clear, bad values, bad ids', async () => {
    authed();
    __setClient(makeSupabase(makeRows()));
    const headers = {
      'Content-Type': 'application/json',
      'x-ucp-session': 'live-sid',
    };
    await testApiHandler({
      appHandler: postVoteHandler,
      params: { id: POST_ID },
      test: async ({ fetch }) => {
        expect(
          (await fetch({ method: 'POST', headers, body: JSON.stringify({ value: 1 }) }))
            .status,
        ).toBe(200);
        expect(
          (await fetch({ method: 'POST', headers, body: JSON.stringify({}) }))
            .status,
        ).toBe(200);
        expect(
          (
            await fetch({
              method: 'POST',
              headers,
              body: JSON.stringify({ value: 7 }),
            })
          ).status,
        ).toBe(400);
      },
    });
    await testApiHandler({
      appHandler: postVoteHandler,
      params: { id: 'not-a-uuid' },
      test: async ({ fetch }) => {
        expect(
          (
            await fetch({
              method: 'POST',
              headers,
              body: JSON.stringify({ value: 1 }),
            })
          ).status,
        ).toBe(400);
      },
    });
  });
});

describe('comments', () => {
  test('add top-level then nested reply; grafts and blanks rejected', async () => {
    authed();
    __setClient(makeSupabase(makeRows()));
    const headers = {
      'Content-Type': 'application/json',
      'x-ucp-session': 'live-sid',
    };
    let topId;
    await testApiHandler({
      appHandler: threadHandler,
      params: { id: POST_ID },
      test: async ({ fetch }) => {
        const top = await fetch({
          method: 'POST',
          headers,
          body: JSON.stringify({ text: 'top comment' }),
        });
        expect(top.status).toBe(201);
        const topBody = await top.json();
        topId = topBody.comment.id;
        expect(topBody.comment.author).toBe('tester');
        const nested = await fetch({
          method: 'POST',
          headers,
          body: JSON.stringify({ text: 'nested', parentId: topId }),
        });
        expect(nested.status).toBe(201);
        expect(
          (
            await fetch({
              method: 'POST',
              headers,
              body: JSON.stringify({
                text: 'x',
                parentId: '22222222-2222-2222-2222-222222222222',
              }),
            })
          ).status,
        ).toBe(400);
        expect(
          (
            await fetch({
              method: 'POST',
              headers,
              body: JSON.stringify({ text: '   ' }),
            })
          ).status,
        ).toBe(400);
      },
    });
    await testApiHandler({
      appHandler: threadHandler,
      params: { id: POST_ID },
      test: async ({ fetch }) => {
        // NOTE: in-memory fake is rebuilt per handler instance; thread shape
        // is covered by the feed test. This asserts the route stays 200.
        const res = await fetch({ method: 'GET', headers });
        expect(res.status).toBe(200);
      },
    });
  });

  test('comment vote set and clear', async () => {
    const tables = makeRows();
    tables.community_comments.push({
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      post_id: POST_ID,
      parent_id: null,
      author_name: 's',
      text: 't',
      created_at: new Date().toISOString(),
    });
    authed();
    __setClient(makeSupabase(tables));
    await testApiHandler({
      appHandler: commentVoteHandler,
      params: { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
      test: async ({ fetch }) => {
        const headers = {
          'Content-Type': 'application/json',
          'x-ucp-session': 'live-sid',
        };
        expect(
          (
            await fetch({
              method: 'POST',
              headers,
              body: JSON.stringify({ value: 1 }),
            })
          ).status,
        ).toBe(200);
        expect(
          (await fetch({ method: 'POST', headers, body: JSON.stringify({}) }))
            .status,
        ).toBe(200);
      },
    });
  });
});

describe('upload', () => {
  test('missing file is 400', async () => {
    authed();
    __setClient(makeSupabase(makeRows()));
    await testApiHandler({
      appHandler: uploadHandler,
      test: async ({ fetch }) => {
        const form = new FormData();
        form.append('note', 'no file here');
        const res = await fetch({
          method: 'POST',
          headers: { 'x-ucp-session': 'live-sid' },
          body: form,
        });
        expect(res.status).toBe(400);
      },
    });
  });

  test('non-image is 400, jpeg under limit returns a public url', async () => {
    authed();
    __setClient(makeSupabase(makeRows()));
    await testApiHandler({
      appHandler: uploadHandler,
      test: async ({ fetch }) => {
        const headers = { 'x-ucp-session': 'live-sid' };
        const bad = new FormData();
        bad.append(
          'image',
          new Blob(['not an image'], { type: 'text/plain' }),
          'evil.txt',
        );
        expect((await fetch({ method: 'POST', headers, body: bad })).status).toBe(
          400,
        );
        const good = new FormData();
        good.append(
          'image',
          new Blob([new Uint8Array(1024).fill(7)], { type: 'image/jpeg' }),
          'photo.jpg',
        );
        const res = await fetch({ method: 'POST', headers, body: good });
        expect(res.status).toBe(201);
        expect((await res.json()).url).toMatch(/^https:\/\/cdn\.test\/posts\//);
      },
    });
  });

  test('upload without session is 401', async () => {
    anon();
    __setClient(makeSupabase(makeRows()));
    await testApiHandler({
      appHandler: uploadHandler,
      test: async ({ fetch }) => {
        const form = new FormData();
        form.append(
          'image',
          new Blob([new Uint8Array(16)], { type: 'image/jpeg' }),
          'a.jpg',
        );
        expect((await fetch({ method: 'POST', body: form })).status).toBe(401);
      },
    });
  });
});

describe('validate helpers', () => {
  test('uuids, titles, votes, flairs', async () => {
    const v = await import('../lib/validate.js');
    expect(v.isUuid('11111111-1111-1111-1111-111111111111')).toBe(true);
    expect(v.isUuid('nope')).toBe(false);
    expect(v.cleanTitle('  hi  ')).toBe('hi');
    expect(v.cleanTitle('')).toBeNull();
    expect(v.cleanVote(1)).toBe(1);
    expect(v.cleanVote(null)).toBeNull();
    expect(v.cleanVote(7)).toBe('invalid');
    expect(v.FLAIRS).toContain('Marketplace');
  });
});
