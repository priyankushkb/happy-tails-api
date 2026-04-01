import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAdmin, AuthenticatedRequest } from '../lib/auth';

export const adminAuditRouter = Router();

adminAuditRouter.get('/', requireAdmin, async (_req: AuthenticatedRequest, res) => {
  const logs = await prisma.auditLog.findMany({
    include: {
      actorUser: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 200
  });

  res.json({ success: true, data: logs });
});