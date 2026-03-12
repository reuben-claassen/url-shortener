import { customAlphabet } from 'nanoid';
import UAParser from 'ua-parser-js';
import * as urlRepository from '../repositories/urlRepository';
import { ShortenedUrl, CreateUrlInput, UrlAnalytics } from '../types';

const SLUG_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const generateSlug = customAlphabet(SLUG_ALPHABET, parseInt(process.env.SLUG_LENGTH ?? '7', 10));

const RESERVED_SLUGS = new Set(['api', 'admin', 'health', 'analytics', 'shorten', 'static']);

export class UrlService {
  async shorten(
    input: CreateUrlInput,
    ipAddress: string
  ): Promise<ShortenedUrl> {
    const slug = await this.resolveSlug(input.customSlug);
    const expiresInDays =
      input.expiresInDays ?? parseInt(process.env.DEFAULT_EXPIRY_DAYS ?? '30', 10);

    return urlRepository.createUrl({
      ...input,
      slug,
      ipAddress,
      expiresInDays,
    });
  }

  async resolve(slug: string): Promise<ShortenedUrl | null> {
    return urlRepository.findBySlug(slug);
  }

  async getAnalytics(urlId: string): Promise<UrlAnalytics | null> {
    const url = await urlRepository.findById(urlId);
    if (!url) return null;
    return urlRepository.getAnalytics(urlId);
  }

  async recordClick(
    urlId: string,
    meta: { ipAddress: string; userAgent?: string; referer?: string }
  ): Promise<void> {
    const parser = new UAParser(meta.userAgent ?? '');
    const uaResult = parser.getResult();

    await urlRepository.recordClick(urlId, {
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent ?? null,
      referer: meta.referer ?? null,
      country: null, // Extend with a GeoIP lookup service if desired
      browser: uaResult.browser.name ?? null,
      os: uaResult.os.name ?? null,
    });
  }

  private async resolveSlug(customSlug?: string): Promise<string> {
    if (customSlug) {
      if (!this.isValidCustomSlug(customSlug)) {
        throw new Error('Custom slug must be 3–20 alphanumeric characters (hyphens allowed)');
      }
      if (RESERVED_SLUGS.has(customSlug.toLowerCase())) {
        throw new Error(`"${customSlug}" is a reserved slug`);
      }
      const exists = await urlRepository.slugExists(customSlug);
      if (exists) throw new Error(`Slug "${customSlug}" is already taken`);
      return customSlug;
    }

    // Generate a unique slug with collision retry
    for (let attempt = 0; attempt < 5; attempt++) {
      const slug = generateSlug();
      const exists = await urlRepository.slugExists(slug);
      if (!exists) return slug;
    }

    throw new Error('Failed to generate a unique slug — please try again');
  }

  private isValidCustomSlug(slug: string): boolean {
    return /^[a-zA-Z0-9-]{3,20}$/.test(slug);
  }
}

export default new UrlService();
