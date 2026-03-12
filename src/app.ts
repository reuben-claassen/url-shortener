import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';

import { shortenUrl, redirectToUrl, getAnalytics, healthCheck } from './controllers/urlController';
import { validate, createUrlSchema } from './middleware/validate';
import { errorHandler, notFound } from './middleware/errorHandler';

const app = express();

// ── Security & Logging ─────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());

// ── Rate Limiting ──────────────────────────────────────────────────────────────
const shortenLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.MAX_URLS_PER_IP_PER_HOUR ?? '20', 10),
  message: { success: false, error: 'Too many URLs created from this IP — try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const redirectLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  message: { success: false, error: 'Too many requests — slow down' },
});

// ── Static Frontend ────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../frontend/public')));

// ── API Routes ─────────────────────────────────────────────────────────────────
app.get('/health', healthCheck);
app.post('/api/shorten', shortenLimiter, validate(createUrlSchema), shortenUrl);
app.get('/api/analytics/:id', getAnalytics);

// ── Redirect Route ─────────────────────────────────────────────────────────────
app.get('/:slug', redirectLimiter, redirectToUrl);

// ── Error Handling ─────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
