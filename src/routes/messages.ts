import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthenticatedRequest } from '../lib/auth';
import { writeAuditLog } from '../lib/audit';

export const messagesRouter = Router();

const messageSchema = z.object({
  bookingId: z.string().min(1),
  text: z.string().min(1)
});

messagesRouter.get('/:bookingId', requireAuth, async (req: AuthenticatedRequest, res) => {
  const booking = await prisma.booking.findFirst({
    where: {
      id: req.params.bookingId,
      ownerId: req.userId!
    }
  });

  if (!booking) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Booking not found' }
    });
  }

  const messages = await prisma.message.findMany({
    where: { bookingId: booking.id },
    orderBy: { createdAt: 'asc' }
  });

  res.json({ success: true, data: messages });
});

messagesRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = messageSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid message input' }
    });
  }

  const booking = await prisma.booking.findFirst({
    where: {
      id: parsed.data.bookingId,
      ownerId: req.userId!
    }
  });

  if (!booking) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Booking not found' }
    });
  }

  const message = await prisma.message.create({
    data: {
      bookingId: booking.id,
      sender: 'owner',
      text: parsed.data.text
    }
  });

  await writeAuditLog({
    actorUserId: req.userId!,
    action: 'MESSAGE_SENT',
    entityType: 'Message',
    entityId: message.id,
    details: `Customer sent message on booking ${booking.id}`,
  });

  res.json({ success: true, data: message });
});