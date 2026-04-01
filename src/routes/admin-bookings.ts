import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAdmin, AuthenticatedRequest } from '../lib/auth';
import { writeAuditLog } from '../lib/audit';

export const adminBookingsRouter = Router();

const statusSchema = z.object({
  status: z.enum(['CONFIRMED', 'DECLINED', 'COMPLETED', 'CANCELLED'])
});

adminBookingsRouter.get('/', requireAdmin, async (_req: AuthenticatedRequest, res) => {
  const bookings = await prisma.booking.findMany({
    include: {
      pet: true,
      owner: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({ success: true, data: bookings });
});

adminBookingsRouter.get('/:bookingId', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.bookingId },
    include: {
      pet: true,
      owner: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true
        }
      },
      messages: { orderBy: { createdAt: 'asc' } }
    }
  });

  if (!booking) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Booking not found' }
    });
  }

  res.json({ success: true, data: booking });
});

adminBookingsRouter.patch('/:bookingId/status', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const parsed = statusSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid status input' }
    });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: req.params.bookingId }
  });

  if (!booking) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Booking not found' }
    });
  }

  const updatedBooking = await prisma.booking.update({
    where: { id: booking.id },
    data: { status: parsed.data.status },
    include: {
      pet: true,
      owner: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true
        }
      },
      messages: { orderBy: { createdAt: 'asc' } }
    }
  });

  await writeAuditLog({
    actorUserId: req.userId!,
    action: 'ADMIN_BOOKING_STATUS_UPDATED',
    entityType: 'Booking',
    entityId: booking.id,
    details: `Changed booking status to ${parsed.data.status}`,
  });

  res.json({ success: true, data: updatedBooking });
});