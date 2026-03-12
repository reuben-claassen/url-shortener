import { query, transaction } from '../config/database';
import { ShortenedUrl, ClickEvent, UrlAnalytics, CreateUrlInput } from '../types';
import { PoolClient } from 'pg';

interface UrlRow {
  id: string;
  slug: string;
  original_url: string;
  created_at: Date;
  expires_at: Date | null;
  click_count: string;
  created_by_ip: string;
}

const mapUrlRow = (row: UrlRow): ShortenedUrl => ({
  id: row.id,
  slug: row.slug,
  originalUrl: row.original_url,
  createdAt: row.created_at,
  expiresAt: row.expires_at,
  clickCount: parseInt(row.click_count, 10),
  createdByIp: row.created_by_ip,
});

export const createUrl = async (
  input: CreateUrlInput & { slug: string; ipAddress: string }
): Promise<ShortenedUrl> => {
  const expiresAt = input.expiresInDays
    ? new Date(Date.now() + input.expiresInDays * 86400000)
    : null;

  const rows = await query<UrlRow>(
    `INSERT INTO urls (slug, original_url, expires_at, created_by_ip)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.slug, input.originalUrl, expiresAt, input.ipAddress]
  );

  return mapUrlRow(rows[0]);
};

export const findBySlug = async (slug: string): Promise<ShortenedUrl | null> => {
  const rows = await query<UrlRow>(
    `SELECT * FROM urls WHERE slug = $1 AND (expires_at IS NULL OR expires_at > NOW())`,
    [slug]
  );

  return rows.length > 0 ? mapUrlRow(rows[0]) : null;
};

export const findById = async (id: string): Promise<ShortenedUrl | null> => {
  const rows = await query<UrlRow>(`SELECT * FROM urls WHERE id = $1`, [id]);
  return rows.length > 0 ? mapUrlRow(rows[0]) : null;
};

export const slugExists = async (slug: string): Promise<boolean> => {
  const rows = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM urls WHERE slug = $1`,
    [slug]
  );
  return parseInt(rows[0].count, 10) > 0;
};

export const incrementClickCount = async (
  urlId: string,
  clickEvent: Omit<ClickEvent, 'id' | 'urlId' | 'clickedAt'>,
  client?: PoolClient
): Promise<void> => {
  const exec = client
    ? (text: string, params: unknown[]) => client.query(text, params)
    : (text: string, params: unknown[]) => query(text, params);

  await exec(`UPDATE urls SET click_count = click_count + 1 WHERE id = $1`, [urlId]);

  await exec(
    `INSERT INTO click_events (url_id, ip_address, user_agent, referer, browser, os)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      urlId,
      clickEvent.ipAddress,
      clickEvent.userAgent,
      clickEvent.referer,
      clickEvent.browser,
      clickEvent.os,
    ]
  );
};

export const recordClick = async (
  urlId: string,
  clickEvent: Omit<ClickEvent, 'id' | 'urlId' | 'clickedAt'>
): Promise<void> => {
  await transaction(async (client) => {
    await incrementClickCount(urlId, clickEvent, client);
  });
};

export const getAnalytics = async (urlId: string): Promise<UrlAnalytics> => {
  const [totalRow] = await query<{ total: string }>(
    `SELECT click_count as total FROM urls WHERE id = $1`,
    [urlId]
  );

  const [last7Row] = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM click_events
     WHERE url_id = $1 AND clicked_at > NOW() - INTERVAL '7 days'`,
    [urlId]
  );

  const [last30Row] = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM click_events
     WHERE url_id = $1 AND clicked_at > NOW() - INTERVAL '30 days'`,
    [urlId]
  );

  const topReferers = await query<{ referer: string; count: string }>(
    `SELECT COALESCE(referer, 'Direct') as referer, COUNT(*) as count
     FROM click_events WHERE url_id = $1
     GROUP BY referer ORDER BY count DESC LIMIT 5`,
    [urlId]
  );

  const topBrowsers = await query<{ browser: string; count: string }>(
    `SELECT COALESCE(browser, 'Unknown') as browser, COUNT(*) as count
     FROM click_events WHERE url_id = $1
     GROUP BY browser ORDER BY count DESC LIMIT 5`,
    [urlId]
  );

  const topOs = await query<{ os: string; count: string }>(
    `SELECT COALESCE(os, 'Unknown') as os, COUNT(*) as count
     FROM click_events WHERE url_id = $1
     GROUP BY os ORDER BY count DESC LIMIT 5`,
    [urlId]
  );

  const clicksByDay = await query<{ date: string; count: string }>(
    `SELECT DATE(clicked_at) as date, COUNT(*) as count
     FROM click_events WHERE url_id = $1 AND clicked_at > NOW() - INTERVAL '30 days'
     GROUP BY DATE(clicked_at) ORDER BY date ASC`,
    [urlId]
  );

  return {
    totalClicks: parseInt(totalRow?.total ?? '0', 10),
    clicksLast7Days: parseInt(last7Row?.count ?? '0', 10),
    clicksLast30Days: parseInt(last30Row?.count ?? '0', 10),
    topReferers: topReferers.map((r) => ({ referer: r.referer, count: parseInt(r.count, 10) })),
    topBrowsers: topBrowsers.map((r) => ({ browser: r.browser, count: parseInt(r.count, 10) })),
    topOs: topOs.map((r) => ({ os: r.os, count: parseInt(r.count, 10) })),
    clicksByDay: clicksByDay.map((r) => ({ date: r.date, count: parseInt(r.count, 10) })),
  };
};
