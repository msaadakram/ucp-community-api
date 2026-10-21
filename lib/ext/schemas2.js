/* Extension Joi schemas, part 2: timetable, credits, privacy,
 * students, earn, admin. */

import Joi from 'joi';

const timetableEntrySchema = Joi.object({
  class: Joi.string().trim().allow('').optional().default(''),
  time: Joi.string().trim().min(1).required().messages({
    'string.empty': 'time is required for each timetable entry',
  }),
  teacher: Joi.string().trim().min(1).required().messages({
    'string.empty': 'teacher is required for each timetable entry',
  }),
  courseName: Joi.string().trim().min(1).required().messages({
    'string.empty': 'courseName is required for each timetable entry',
  }),
  day: Joi.string().trim().min(1).required().messages({
    'string.empty': 'day is required for each timetable entry',
  }),
  room: Joi.string().trim().allow('').optional().default(''),
});

export const saveTimetableSchema = Joi.object({
  studentID: Joi.string().trim().min(1).required().messages({
    'string.empty': 'studentID is required',
    'any.required': 'studentID is required',
  }),
  // Which client sent this ("app" | "extension"). Informational: it
  // documents the mixed ecosystem in the data.
  source: Joi.string().trim().lowercase().valid('app', 'extension').optional(),
  timetable: Joi.array()
    .items(timetableEntrySchema)
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one valid timetable entry is required',
      'any.required': 'timetable array is required',
    }),
});

export const deductCreditSchema = Joi.object({
  studentId: Joi.string().trim().min(1).required().messages({
    'string.empty': 'studentId is required',
    'any.required': 'studentId is required',
  }),
});

export const getCreditsParamsSchema = Joi.object({
  studentId: Joi.string().trim().min(1).required().messages({
    'string.empty': 'studentId is required',
    'any.required': 'studentId is required',
  }),
});

export const privacyUpdateSchema = Joi.object({
  studentId: Joi.string().trim().min(1).required().messages({
    'string.empty': 'studentId is required',
    'any.required': 'studentId is required',
  }),
  hideName: Joi.boolean().required(),
  hidePhoto: Joi.boolean().required(),
});

export const privacyParamsSchema = Joi.object({
  studentId: Joi.string().trim().min(1).required().messages({
    'string.empty': 'studentId is required',
    'any.required': 'studentId is required',
  }),
});

export const checkStudentParamsSchema = Joi.object({
  studentId: Joi.string().trim().min(1).required().messages({
    'string.empty': 'studentId parameter is required',
    'any.required': 'studentId parameter is required',
  }),
});

export const generateTokenSchema = Joi.object({
  userId: Joi.string().trim().min(1).required(),
});

export const verifyTokenParamsSchema = Joi.object({
  token: Joi.string().trim().pattern(/^[a-f0-9]{64}$/i).required(),
});

export const verifyTokenQuerySchema = Joi.object({
  key: Joi.string().trim().pattern(/^[a-f0-9]{32}$/i).required(),
});

export const creditsParamsSchema = Joi.object({
  userId: Joi.string().trim().min(1).required(),
});

export const adminLoginSchema = Joi.object({
  username: Joi.string().trim().min(1).max(64).required(),
  password: Joi.string().min(1).max(128).required(),
});
