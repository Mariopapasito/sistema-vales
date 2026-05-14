import { body, param, query } from 'express-validator';
import { UserRole, OrderStatus, Priority } from '../config/constants';

// User validation
export const validateCreateUser = [
  body('nombre')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('rol')
    .notEmpty().withMessage('Role is required')
    .isIn(Object.values(UserRole)).withMessage('Invalid role'),
  body('estacion')
    .trim()
    .notEmpty().withMessage('Station is required')
    .isLength({ max: 100 }).withMessage('Station cannot exceed 100 characters')
];

export const validateUpdateUser = [
  param('id')
    .isMongoId().withMessage('Invalid user ID'),
  body('nombre')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('rol')
    .optional()
    .isIn(Object.values(UserRole)).withMessage('Invalid role'),
  body('estacion')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Station cannot exceed 100 characters'),
  body('activo')
    .optional()
    .isBoolean().withMessage('Active must be a boolean')
];

// Order validation
export const validateCreateOrder = [
  body('prioridad')
    .isArray({ min: 1 }).withMessage('At least one priority is required')
    .custom((value: string[]) => {
      const validPriorities = Object.values(Priority);
      return value.every(p => validPriorities.includes(p as Priority));
    }).withMessage('Invalid priority'),
  body('ubicacion')
    .trim()
    .notEmpty().withMessage('Location is required')
    .isLength({ max: 200 }).withMessage('Location cannot exceed 200 characters'),
  body('descripcionProblema')
    .trim()
    .notEmpty().withMessage('Problem description is required')
    .isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),
  body('observaciones')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Observations cannot exceed 1000 characters')
];

export const validateUpdateOrderStatus = [
  param('id')
    .isMongoId().withMessage('Invalid order ID'),
  body('estado')
    .notEmpty().withMessage('Status is required')
    .isIn(Object.values(OrderStatus)).withMessage('Invalid status'),
  body('notas')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
];

export const validateGetOrders = [
  query('estado')
    .optional()
    .isIn(Object.values(OrderStatus)).withMessage('Invalid status filter'),
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

// Calendar event validation
export const validateCreateEvent = [
  body('titulo')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ max: 100 }).withMessage('Title cannot exceed 100 characters'),
  body('descripcion')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('fechaInicio')
    .notEmpty().withMessage('Start date is required')
    .isISO8601().withMessage('Invalid start date format'),
  body('fechaFin')
    .notEmpty().withMessage('End date is required')
    .isISO8601().withMessage('Invalid end date format')
    .custom((value, { req }) => {
      if (new Date(value) < new Date(req.body.fechaInicio)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  body('color')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).withMessage('Invalid hex color'),
  body('responsable')
    .optional()
    .isMongoId().withMessage('Invalid responsible user ID')
];

export const validateUpdateEvent = [
  param('id')
    .isMongoId().withMessage('Invalid event ID'),
  body('titulo')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Title cannot exceed 100 characters'),
  body('descripcion')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('fechaInicio')
    .optional()
    .isISO8601().withMessage('Invalid start date format'),
  body('fechaFin')
    .optional()
    .isISO8601().withMessage('Invalid end date format'),
  body('color')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).withMessage('Invalid hex color'),
  body('responsable')
    .optional()
    .isMongoId().withMessage('Invalid responsible user ID')
];

// Login validation
export const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
];
// Validation error handler
import { validationResult } from 'express-validator';

export const handleValidationErrors = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.type === 'field' ? err.path : 'general',
        message: err.msg
      }))
    });
  }
  next();
};
