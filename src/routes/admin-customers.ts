import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAdmin, AuthenticatedRequest } from '../lib/auth';

export const adminCustomersRouter = Router();

adminCustomersRouter.get('/', requireAdmin, async (_req: AuthenticatedRequest, res) => {
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

adminCustomersRouter.get('/:customerId', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const customer = await prisma.user.findUnique({
    where: {
      id: req.params.customerId,
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