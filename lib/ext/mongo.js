/* MongoDB connection for the extension (/api/ext/*) routes.
 * Port of extention-server/config/db.js: serverless-safe cache on
 * globalThis so warm instances reuse one connection (pool <= 5).
 * Community (Supabase) routes never touch this. */

import mongoose from 'mongoose';

function cache() {
  const g = globalThis;
  if (!g.__ucpMongooseCache) {
    g.__ucpMongooseCache = { conn: null, promise: null };
  }
  return g.__ucpMongooseCache;
}

if (typeof mongoose !== 'undefined' && mongoose.connection) {
  try {
    mongoose.connection.on('disconnected', () => {
      const c = cache();
      c.conn = null;
      c.promise = null;
    });
  } catch (_) {}
}

export async function ensureMongo(mongoUri) {
  if (!mongoUri) {
    throw Object.assign(
      new Error('MONGODB_URI environment variable is not configured'),
      { status: 503, code: 'DB_UNCONFIGURED' },
    );
  }
  const c = cache();
  if (mongoose.connection.readyState === 1 && c.conn) return c.conn;
  if (!c.promise || mongoose.connection.readyState === 0) {
    c.promise = mongoose
      .connect(mongoUri, {
        maxPoolSize: 5,
        minPoolSize: 0,
        maxIdleTimeMS: 20000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 20000,
        serverSelectionTimeoutMS: 10000,
      })
      .then((m) => {
        c.conn = m;
        return m;
      })
      .catch((err) => {
        c.promise = null;
        throw err;
      });
  }
  return c.promise;
}
