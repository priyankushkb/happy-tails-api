import express from 'express';
import cors from 'cors';

import { authRouter } from './routes/auth';
import { petsRouter } from './routes/pets';
import { bookingsRouter } from './routes/bookings';
import { messagesRouter } from './routes/messages';
import { adminBookingsRouter } from './routes/admin-bookings';
import { adminCustomersRouter } from './routes/admin-customers';
import { adminMessagesRouter } from './routes/admin-messages';
import { adminAuditRouter } from './routes/admin-audit';
import { requestLogger } from './lib/request-logger';
import { generalApiRateLimiter } from './lib/rate-limit';
import { corsOptions } from './lib/cors';
import { errorHandler } from './lib/error-handler';

export const app = express();

app.disable('x-powered-by');

app.use(cors(corsOptions));
app.use(express.json({ limit: '2mb' }));
app.use(requestLogger);
app.use('/api', generalApiRateLimiter);

app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

app.use('/api/auth', authRouter);
app.use('/api/pets', petsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/messages', messagesRouter);

app.use('/api/admin/bookings', adminBookingsRouter);
app.use('/api/admin/customers', adminCustomersRouter);
app.use('/api/admin/messages', adminMessagesRouter);
app.use('/api/admin/audit', adminAuditRouter);

app.use(errorHandler);