import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthenticatedRequest } from '../lib/auth';
import { writeAuditLog } from '../lib/audit';
import { getParamString } from '../lib/params';
import {
  notifyAdminBookingCreated,
  notifyCustomerBookingCreated,
} from '../lib/admin-notify';

export const bookingsRouter = Router();

const bookingSchema = z.object({
  petId: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  notes: z.string().default('')
});

bookingsRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const bookings = await prisma.booking.findMany({
    where: { ownerId: req.userId! },
    include: { pet: true },
    orderBy: { createdAt: 'desc' }
  });

  res.json({ success: true, data: bookings });
});

bookingsRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = bookingSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid booking input' }
    });
  }

  const owner = await prisma.user.findUnique({
    where: { id: req.userId! }
  });

  if (!owner) {
    return res.status(404).json({
      success: false,
      error: { code: 'OWNER_NOT_FOUND', message: 'Owner not found' }
    });
  }

  const pet = await prisma.pet.findFirst({
    where: {
      id: parsed.data.petId,
      ownerId: req.userId!
    }
  });

  if (!pet) {
    return res.status(404).json({
      success: false,
      error: { code: 'PET_NOT_FOUND', message: 'Pet not found' }
    });
  }

  const booking = await prisma.booking.create({
    data: {
      ownerId: req.userId!,
      petId: pet.id,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      notes: parsed.data.notes
    },
    include: { pet: true }
  });

  await writeAuditLog({
    actorUserId: req.userId!,
    action: 'BOOKING_CREATED',
    entityType: 'Booking',
    entityId: booking.id,
    details: `Created booking for pet ${pet.name}`,
  });

  await notifyAdminBookingCreated({
    ownerName: owner.fullName,
    ownerEmail: owner.email,
    petName: pet.name,
    startDate: String(booking.startDate),
    endDate: String(booking.endDate),
    notes: booking.notes || '',
  });

  await notifyCustomerBookingCreated({
    customerEmail: owner.email,
    customerName: owner.fullName,
    petName: pet.name,
    startDate: String(booking.startDate),
    endDate: String(booking.endDate),
  });

  res.json({ success: true, data: booking });
});

bookingsRouter.get('/:bookingId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const bookingId = getParamString(req.params.bookingId);

  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      ownerId: req.userId!
    },
    include: {
      pet: true,
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

bookingsRouter.delete('/:bookingId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const bookingId = getParamString(req.params.bookingId);

  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      ownerId: req.userId!
    }
  });

  if (!booking) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Booking not found' }
    });
  }

  await prisma.booking.delete({
    where: { id: booking.id }
  });

  await writeAuditLog({
    actorUserId: req.userId!,
    action: 'BOOKING_DELETED',
    entityType: 'Booking',
    entityId: booking.id,
    details: `Deleted booking ${booking.id}`,
  });

  res.json({ success: true, data: { deleted: true } });
});