/* Extension (Joi) validation + error helpers.
 * Port of extention-server/middleware/validate.js + errorHandler.js
 * adapted to App Router: functions return { value } or { response } —
 * never throw for client errors. Server errors map to the shared
 * { error, code } envelope via respond.js. */

import { json, fail } from '../respond.js';

export function validateBody(schema, body) {
  const { error, value } = schema.validate(body, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (!error) return { value };
  return {
    response: {
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      })),
      _status: 400,
    },
  };
}

export function validateQueryParams(schema, queryObj) {
  return validateBody(schema, queryObj);
}

export function validateParams(schema, paramsObj) {
  return validateBody(schema, paramsObj);
}

/* Map a thrown error to an App Router JSON response. Mirrors
 * errorHandler.js: Mongoose validation -> 400, dup key -> 409,
 * SyntaxError body -> 400, known {status,code} -> passthrough,
 * everything else -> 500 without stack. */
export function extError(err, origin) {
  const code = err && err.code;
  // Unexpected failures are logged (serverless drains keep them) — a
  // silent 500 is impossible to debug in production.
  if (!code && !(err && err.name === 'ValidationError')) {
    console.error('[ext] unhandled error:', err && err.message, err && err.stack);
  }
  if (err && err.name === 'ValidationError') {
    const details = Object.values(err.errors || {}).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return json(
      { error: 'Database validation error', code: 'DB_VALIDATION_ERROR', details },
      { status: 400, origin },
    );
  }
  if (code === 11000) {
    return json(
      { error: 'Duplicate entry', code: 'DUPLICATE_KEY', details: err.keyValue || undefined },
      { status: 409, origin },
    );
  }
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return json({ error: 'Invalid JSON payload', code: 'INVALID_JSON' }, { status: 400, origin });
  }
  if (err && typeof err.status === 'number' && err.status >= 400 && err.status < 600) {
    return json(
      { error: err.message || 'Request failed', code: err.code || 'REQUEST_ERROR' },
      { status: err.status, origin },
    );
  }
  return fail('Internal Server Error', { status: 500, origin });
}

/* Raw envelope responder for pre-shaped { ..., _status } bodies
 * (validation failures, rate limits) so routes stay one-liners. */
export function extEnvelope(body, origin) {
  const { _status, _origin, ...data } = body;
  return json(data, { status: _status || 200, origin: _origin || origin });
}

/* Guard: Mongo unconfigured -> 503 (community routes unaffected). */
export function needMongo(config) {
  if (config && config.mongoUri) return null;
  return fail('extension database not configured: set MONGODB_URI', {
    status: 503,
    origin: (config && config.corsOrigin) || '*',
  });
}
