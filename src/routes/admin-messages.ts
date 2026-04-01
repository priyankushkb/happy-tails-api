import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAdmin, AuthenticatedRequest } from '../lib/auth';
import { writeAuditLog } from '../lib/audit';

export const adminMessagesRouter = Router();

const messageSchema = z.object({
  bookingId: z.string().min(1),
  text: z.string().min(1)
});

adminMessagesRouter.post('/', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const parsed = messageSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid message input' }
    });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: parsed.data.bookingId }
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
      sender: 'admin',
      text: parsed.data.text
    }
  });

  await writeAuditLog({
    actorUserId: req.userId!,
    action: 'ADMIN_MESSAGE_SENT',
    entityType: 'Message',
    entityId: message.id,
    details: `Admin sent message on booking ${booking.id}`,
  });

  res.json({ success: true, data: message });
});