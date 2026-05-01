import { Request, Response, NextFunction } from 'express';
import urlService from '../services/urlService';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse, UrlAnalytics } from '../types';

const getIpAddress = (req: Request): string =>
  (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
  req.socket.remoteAddress ??
  '0.0.0.0';

export const shortenUrl = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { url, customSlug, expiresInDays } = req.body;
    const ip = getIpAddress(req);

    const shortened = await urlService.shorten(
      { originalUrl: url, customSlug, expiresInDays },
      ip
    );

    const shortUrl = `${process.env.BASE_URL}/${shortened.slug}`;

    const response: ApiResponse<{ shortUrl: string; slug: string; expiresAt: Date | null }> = {
      success: true,
      data: {
        shortUrl,
        slug: shortened.slug,
        expiresAt: shortened.expiresAt,
      },
    };

    res.status(201).json(response);
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
    } else if (err instanceof Error) {
      next(new AppError(400, err.message));
    } else {
      next(err);
    }
  }
};

export const redirectToUrl = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { slug } = req.params;
    const url = await urlService.resolve(slug);

    if (!url) {
      throw new AppError(404, `No active URL found for slug "${slug}"`);
    }

    // Record click asynchronously - don't block the redirect
    urlService
      .recordClick(url.id, {
        ipAddress: getIpAddress(req),
        userAgent: req.headers['user-agent'],
        referer: req.headers['referer'],
      })
      .catch((err) => console.error('Failed to record click:', err));

    res.redirect(301, url.originalUrl);
  } catch (err) {
    next(err);
  }
};

export const getAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const analytics = await urlService.getAnalytics(id);

    if (!analytics) {
      throw new AppError(404, `URL with id "${id}" not found`);
    }

    const response: ApiResponse<UrlAnalytics> = { success: true, data: analytics };
    res.json(response);
  } catch (err) {
    next(err);
  }
};

export const healthCheck = (_req: Request, res: Response): void => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
};