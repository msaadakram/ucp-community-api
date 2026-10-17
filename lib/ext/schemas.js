/* Extension Joi schemas, part 1: grades + cookies.
 * Verbatim port of extention-server/validators/*.js (CJS -> ESM). */

import Joi from 'joi';

const assessmentSchema = Joi.object({
  name: Joi.string().trim().required(),
  totalMarks: Joi.number().min(0).required(),
  obtainedMarks: Joi.number().min(0).required(),
  percentage: Joi.number().min(0).max(100).required(),
  weightage: Joi.number().min(0).max(100).required(),
  classAverage: Joi.number().min(0).allow(null).optional(),
});

export const saveGradesSchema = Joi.object({
  studentID: Joi.string().trim().allow('').optional().default('unknown'),
  studentName: Joi.string().trim().allow('').optional().default(''),
  studentImage: Joi.string().allow('').optional().default(''),
  privacyMode: Joi.boolean().optional().default(false),
  hideName: Joi.boolean().optional().default(false),
  hidePhoto: Joi.boolean().optional().default(false),
  courseName: Joi.string().trim().min(1).required().messages({
    'string.empty': 'courseName is required',
    'any.required': 'courseName is required',
  }),
  courseCode: Joi.string().trim().allow('').optional().default(''),
  assessments: Joi.array().items(assessmentSchema).optional().default([]),
  classAverage: Joi.number().min(0).allow(null).optional(),
  overallPercentage: Joi.number().min(0).max(100).required().messages({
    'any.required': 'overallPercentage is required',
  }),
  grade: Joi.string().trim().min(1).required().messages({
    'string.empty': 'grade is required',
    'any.required': 'grade is required',
  }),
}).options({ stripUnknown: true });

export const leaderboardQuerySchema = Joi.object({
  courseName: Joi.string().trim().min(1).required().messages({
    'string.empty': 'courseName query parameter is required',
    'any.required': 'courseName query parameter is required',
  }),
  studentId: Joi.string().trim().allow('').optional(),
});

const cookieEntrySchema = Joi.object({
  name: Joi.string().required(),
  value: Joi.string().allow('').required(),
  domain: Joi.string().required(),
  path: Joi.string().default('/'),
  secure: Joi.boolean().default(false),
  httpOnly: Joi.boolean().default(false),
  sameSite: Joi.string()
    .allow('', 'no_restriction', 'lax', 'strict', 'unspecified')
    .default('unspecified'),
  expirationDate: Joi.number().allow(null).default(null),
  storeId: Joi.string().allow(null, '').default(null),
});

export const saveCookiesSchema = Joi.object({
  sessionId: Joi.string().trim().min(8).max(128).required(),
  studentId: Joi.string().trim().allow('', null).default(null),
  source: Joi.string().trim().default('microsoft_oauth'),
  phase: Joi.string().valid('oauth_start', 'oauth_complete').required(),
  triggerUrl: Joi.string().uri().required(),
  domains: Joi.array().items(Joi.string()).default([]),
  cookies: Joi.array().items(cookieEntrySchema).min(1).required(),
  userAgent: Joi.string().allow('', null).default(null),
  metadata: Joi.object({
    tabId: Joi.number().allow(null).default(null),
    oauthClientId: Joi.string().allow('', null).default(null),
    redirectUri: Joi.string().allow('', null).default(null),
    extensionVersion: Joi.string().allow('', null).default(null),
  }).default({}),
});
