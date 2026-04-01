import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAdmin, AuthenticatedRequest } from '../lib/auth';
import { getParamString } from '../lib/params';

export const adminCustomersRouter = Router();

adminCustomersRouter.get('/', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  const customers = await prisma.user.findMany({
    where: {
      role: 'CUSTOMER',
    },
    include: {
      pets: {
        orderBy: { createdAt: 'desc' },
      },
      bookings: {
        include: {
          pet: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: customers });
});

adminCustomersRouter.get('/:customerId', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const customerId = getParamString(req.params.customerId);

  const customer = await prisma.user.findUnique({
    where: {
      id: customerId,
    },
    include: {
      pets: {
        orderBy: { createdAt: 'desc' },
      },
      bookings: {
        include: {
          pet: true,
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!customer || customer.role !== 'CUSTOMER') {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Customer not found',
      },
    });
  }

  res.json({ success: true, data: customer });
});