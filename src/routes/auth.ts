import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import {
  comparePassword,
  hashPassword,
  requireAuth,
  signToken,
  AuthenticatedRequest
} from '../lib/auth';
import { authRateLimiter } from '../lib/rate-limit';
import { writeAuditLog } from '../lib/audit';

export const authRouter = Router();

const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(6)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

authRouter.post('/register', authRateLimiter, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid input' }
    });
  }

  const { fullName, email, phone, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    return res.status(409).json({
      success: false,
      error: { code: 'EMAIL_EXISTS', message: 'Email already registered' }
    });
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      fullName,
      email,
      phone,
      passwordHash
    }
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: 'AUTH_REGISTER',
    entityType: 'User',
    entityId: user.id,
    details: `User registered with email ${user.email}`,
  });

  const token = signToken(user.id);

  return res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    }
  });
});

authRouter.post('/login', authRateLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid input' }
    });
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
    });
  }

  const valid = await comparePassword(password, user.passwordHash);

  if (!valid) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
    });
  }

  await writeAuditLog({
    actorUserId: user.id,
    action: 'AUTH_LOGIN',
    entityType: 'User',
    entityId: user.id,
    details: `User logged in with email ${user.email}`,
  });

  const token = signToken(user.id);

  return res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    }
  });
});

authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! }
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'User not found' }
    });
  }

  return res.json({
    success: true,
    data: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role
    }
  });
});