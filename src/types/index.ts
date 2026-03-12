export interface ShortenedUrl {
  id: string;
  slug: string;
  originalUrl: string;
  createdAt: Date;
  expiresAt: Date | null;
  clickCount: number;
  createdByIp: string;
}

export interface ClickEvent {
  id: string;
  urlId: string;
  clickedAt: Date;
  ipAddress: string;
  userAgent: string | null;
  referer: string | null;
  country: string | null;
  browser: string | null;
  os: string | null;
}

export interface UrlAnalytics {
  totalClicks: number;
  clicksLast7Days: number;
  clicksLast30Days: number;
  topReferers: Array<{ referer: string; count: number }>;
  topBrowsers: Array<{ browser: string; count: number }>;
  topOs: Array<{ os: string; count: number }>;
  clicksByDay: Array<{ date: string; count: number }>;
}

export interface CreateUrlInput {
  originalUrl: string;
  customSlug?: string;
  expiresInDays?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
