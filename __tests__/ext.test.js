/* Extension merge tests, part 1: Joi validation ports + error mapping.
 * No network, no database. */

import {
  saveGradesSchema,
  leaderboardQuerySchema,
  saveCookiesSchema,
} from '@/lib/ext/schemas';
import {
  saveTimetableSchema,
  generateTokenSchema,
  verifyTokenParamsSchema,
  verifyTokenQuerySchema,
} from '@/lib/ext/schemas2';
import { validateBody, extEnvelope, extError } from '@/lib/ext/validate';

const ORIGIN = '*';

describe('ext validation (Joi ports)', () => {
  test('save-grades accepts the extension payload', () => {
    const { response, value } = validateBody(saveGradesSchema, {
      studentID: 'l1f25bscs0577',
      studentName: 'Saad',
      courseName: 'Object Oriented Programming',
      overallPercentage: 82.5,
      grade: 'A-',
      assessments: [
        {
          name: 'Quiz 1',
          totalMarks: 20,
          obtainedMarks: 18,
          percentage: 90,
          weightage: 15,
        },
      ],
    });
    expect(response).toBeUndefined();
    expect(value.courseName).toBe('Object Oriented Programming');
  });

  test('save-grades rejects missing fields with details', () => {
    const { response } = validateBody(saveGradesSchema, {
      overallPercentage: 50,
    });
    expect(response.error).toBe('Validation failed');
    expect(response.code).toBe('VALIDATION_ERROR');
    expect(response._status).toBe(400);
    expect(extEnvelope(response, ORIGIN).status).toBe(400);
  });

  test('leaderboard query requires courseName', () => {
    const bad = validateBody(leaderboardQuerySchema, {});
    expect(bad.response._status).toBe(400);
    const ok = validateBody(leaderboardQuerySchema, {
      courseName: 'OOP',
      studentId: 'x',
    });
    expect(ok.value.courseName).toBe('OOP');
  });

  test('cookies/save rejects empty jar', () => {
    const { response } = validateBody(saveCookiesSchema, {
      sessionId: 'tab-1-oauth_complete-1234567890123',
      phase: 'oauth_complete',
      triggerUrl: 'https://horizon.ucp.edu.pk/auth_oauth/microsoft/signin',
      cookies: [],
    });
    expect(response._status).toBe(400);
  });

  test('timetable save requires entries', () => {
    const { response } = validateBody(saveTimetableSchema, {
      studentID: 'x',
      timetable: [],
    });
    expect(response._status).toBe(400);
  });

  test('earn token + key patterns', () => {
    expect(
      validateBody(generateTokenSchema, { userId: 'u1' }).value.userId,
    ).toBe('u1');
    const tok = 'a'.repeat(64);
    expect(validateBody(verifyTokenParamsSchema, { token: tok }).value.token)
      .toBe(tok);
    expect(
      validateBody(verifyTokenParamsSchema, { token: 'short' }).response
        ._status,
    ).toBe(400);
    const key = 'b'.repeat(32);
    expect(validateBody(verifyTokenQuerySchema, { key }).value.key).toBe(key);
  });
});

describe('ext error mapping', () => {
  test('Mongoose ValidationError -> 400 envelope', async () => {
    const err = new Error('bad');
    err.name = 'ValidationError';
    err.errors = { courseName: { path: 'courseName', message: 'required' } };
    const res = extError(err, ORIGIN);
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('DB_VALIDATION_ERROR');
  });

  test('dup key 11000 -> 409', async () => {
    const res = extError({ code: 11000, keyValue: { token: 't' } }, ORIGIN);
    expect(res.status).toBe(409);
  });

  test('known {status,code} passes through', async () => {
    const res = extError(
      Object.assign(new Error('No valid entries'), {
        status: 400,
        code: 'NO_VALID_ENTRIES',
      }),
      ORIGIN,
    );
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('NO_VALID_ENTRIES');
  });

  test('unknown -> 500 without stack', async () => {
    const res = extError(new Error('boom'), ORIGIN);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Internal Server Error');
    expect(body.stack).toBeUndefined();
  });
});
