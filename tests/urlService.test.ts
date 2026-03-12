import { UrlService } from '../src/services/urlService';
import * as urlRepository from '../src/repositories/urlRepository';

jest.mock('../src/repositories/urlRepository');

const mockedRepo = urlRepository as jest.Mocked<typeof urlRepository>;

describe('UrlService', () => {
  let service: UrlService;

  beforeEach(() => {
    service = new UrlService();
    jest.clearAllMocks();
  });

  describe('shorten()', () => {
    it('creates a shortened URL with a generated slug', async () => {
      mockedRepo.slugExists.mockResolvedValue(false);
      mockedRepo.createUrl.mockResolvedValue({
        id: 'test-id',
        slug: 'abc1234',
        originalUrl: 'https://example.com',
        createdAt: new Date(),
        expiresAt: null,
        clickCount: 0,
        createdByIp: '127.0.0.1',
      });

      const result = await service.shorten(
        { originalUrl: 'https://example.com' },
        '127.0.0.1'
      );

      expect(result.slug).toBeDefined();
      expect(result.originalUrl).toBe('https://example.com');
      expect(mockedRepo.createUrl).toHaveBeenCalledTimes(1);
    });

    it('uses a custom slug when provided and available', async () => {
      mockedRepo.slugExists.mockResolvedValue(false);
      mockedRepo.createUrl.mockResolvedValue({
        id: 'test-id',
        slug: 'my-link',
        originalUrl: 'https://example.com',
        createdAt: new Date(),
        expiresAt: null,
        clickCount: 0,
        createdByIp: '127.0.0.1',
      });

      const result = await service.shorten(
        { originalUrl: 'https://example.com', customSlug: 'my-link' },
        '127.0.0.1'
      );

      expect(result.slug).toBe('my-link');
    });

    it('throws if a custom slug is already taken', async () => {
      mockedRepo.slugExists.mockResolvedValue(true);

      await expect(
        service.shorten({ originalUrl: 'https://example.com', customSlug: 'taken' }, '127.0.0.1')
      ).rejects.toThrow('already taken');
    });

    it('throws if a custom slug is a reserved word', async () => {
      await expect(
        service.shorten({ originalUrl: 'https://example.com', customSlug: 'api' }, '127.0.0.1')
      ).rejects.toThrow('reserved');
    });

    it('throws if custom slug format is invalid', async () => {
      await expect(
        service.shorten(
          { originalUrl: 'https://example.com', customSlug: 'a' }, // too short
          '127.0.0.1'
        )
      ).rejects.toThrow('3–20');
    });
  });

  describe('resolve()', () => {
    it('returns the URL record when slug exists', async () => {
      const mockUrl = {
        id: 'test-id',
        slug: 'abc1234',
        originalUrl: 'https://example.com',
        createdAt: new Date(),
        expiresAt: null,
        clickCount: 5,
        createdByIp: '127.0.0.1',
      };
      mockedRepo.findBySlug.mockResolvedValue(mockUrl);

      const result = await service.resolve('abc1234');
      expect(result).toEqual(mockUrl);
    });

    it('returns null when slug does not exist', async () => {
      mockedRepo.findBySlug.mockResolvedValue(null);
      const result = await service.resolve('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('recordClick()', () => {
    it('parses browser and OS from a Chrome on Windows user agent', async () => {
      mockedRepo.recordClick.mockResolvedValue(undefined);

      await service.recordClick('test-id', {
        ipAddress: '127.0.0.1',
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        referer: 'https://google.com',
      });

      expect(mockedRepo.recordClick).toHaveBeenCalledWith('test-id', expect.objectContaining({
        ipAddress: '127.0.0.1',
        browser: 'Chrome',
        os: 'Windows',
        referer: 'https://google.com',
      }));
    });

    it('parses browser and OS from a Safari on macOS user agent', async () => {
      mockedRepo.recordClick.mockResolvedValue(undefined);

      await service.recordClick('test-id', {
        ipAddress: '10.0.0.1',
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      });

      expect(mockedRepo.recordClick).toHaveBeenCalledWith('test-id', expect.objectContaining({
        browser: 'Safari',
        os: 'Mac OS',
      }));
    });

    it('handles a missing user agent gracefully', async () => {
      mockedRepo.recordClick.mockResolvedValue(undefined);

      await service.recordClick('test-id', { ipAddress: '127.0.0.1' });

      expect(mockedRepo.recordClick).toHaveBeenCalledWith('test-id', expect.objectContaining({
        ipAddress: '127.0.0.1',
        userAgent: null,
        referer: null,
        country: null,
      }));
    });

    it('passes the url id through to the repository', async () => {
      mockedRepo.recordClick.mockResolvedValue(undefined);

      await service.recordClick('specific-url-id', { ipAddress: '127.0.0.1' });

      expect(mockedRepo.recordClick).toHaveBeenCalledWith('specific-url-id', expect.anything());
    });
  });

  describe('getAnalytics()', () => {
    const mockAnalytics = {
      totalClicks: 100,
      clicksLast7Days: 20,
      clicksLast30Days: 80,
      topReferers: [{ referer: 'Direct', count: 60 }],
      topBrowsers: [{ browser: 'Chrome', count: 75 }],
      topOs: [{ os: 'Windows', count: 50 }],
      clicksByDay: [{ date: '2024-01-15', count: 10 }],
    };

    it('returns analytics for a valid url id', async () => {
      mockedRepo.findById.mockResolvedValue({
        id: 'test-id',
        slug: 'abc1234',
        originalUrl: 'https://example.com',
        createdAt: new Date(),
        expiresAt: null,
        clickCount: 100,
        createdByIp: '127.0.0.1',
      });
      mockedRepo.getAnalytics.mockResolvedValue(mockAnalytics);

      const result = await service.getAnalytics('test-id');

      expect(result).toEqual(mockAnalytics);
      expect(mockedRepo.getAnalytics).toHaveBeenCalledWith('test-id');
    });

    it('returns null when the url id does not exist', async () => {
      mockedRepo.findById.mockResolvedValue(null);

      const result = await service.getAnalytics('nonexistent-id');

      expect(result).toBeNull();
      expect(mockedRepo.getAnalytics).not.toHaveBeenCalled();
    });

    it('does not call getAnalytics on the repository if the url is not found', async () => {
      mockedRepo.findById.mockResolvedValue(null);

      await service.getAnalytics('ghost-id');

      expect(mockedRepo.getAnalytics).toHaveBeenCalledTimes(0);
    });
  });
});