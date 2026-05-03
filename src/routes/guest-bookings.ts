import { Router, Response } from 'express';
import { z } from 'zod';
import { notifyAdminByEmail } from '../lib/admin-notify';

export const guestBookingsRouter = Router();

const guestBookingSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(5),
  petName: z.string().min(1),
  petType: z.string().min(1),
  petDetails: z.string().optional().default(''),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  notes: z.string().optional().default(''),
});

guestBookingsRouter.post('/', async (req, res: Response) => {
  const parsed = guestBookingSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Please complete all required fields.',
      },
    });
  }

  const data = parsed.data;

  try {
    await notifyAdminByEmail({
      subject: 'New guest booking request - Happy Tails',
      html: `
        <h2>New guest booking request</h2>

        <h3>Customer</h3>
        <p><strong>Name:</strong> ${escapeHtml(data.fullName)}</p>
        <p><strong>Email:</strong> ${escapeHtml(data.email)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(data.phone)}</p>

        <h3>Pet</h3>
        <p><strong>Pet name:</strong> ${escapeHtml(data.petName)}</p>
        <p><strong>Pet type:</strong> ${escapeHtml(data.petType)}</p>
        <p><strong>Pet details:</strong> ${escapeHtml(data.petDetails || '-')}</p>

        <h3>Dates</h3>
        <p><strong>Start date:</strong> ${escapeHtml(data.startDate)}</p>
        <p><strong>End date:</strong> ${escapeHtml(data.endDate)}</p>

        <h3>Notes</h3>
        <div style="white-space: pre-wrap;">${escapeHtml(data.notes || '-')}</div>
      `,
    });

    return res.json({
      success: true,
      data: {
        sent: true,
      },
    });
  } catch (error) {
    console.error('[guest-bookings] Failed to send guest booking email:', error);

    return res.status(500).json({
      success: false,
      error: {
        code: 'EMAIL_FAILED',
        message: 'Could not send booking request. Please try again.',
      },
    });
  }
});

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}