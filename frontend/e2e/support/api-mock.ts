import { Page, Route } from '@playwright/test';

export interface MockUrl {
  id: string;
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  codeType: 'GENERATED' | 'CUSTOM_ALIAS';
  status: 'ACTIVE' | 'DISABLED' | 'DELETED';
  expired: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  version: number;
}

export interface ApiMockOptions {
  initialUrls?: readonly MockUrl[];
  createFailure?: MockFailure;
  listFailure?: MockFailure;
  totalClicks?: number;
}

interface MockFailure {
  status: number;
  code: string;
  message: string;
  retryAfterSeconds?: number;
}

export const PRIMARY_ID = 'b49347f8-24a5-4f69-acf7-1fb9eac99b94';

export function mockUrl(overrides: Partial<MockUrl> = {}): MockUrl {
  return {
    id: PRIMARY_ID,
    shortCode: 'release-notes',
    shortUrl: 'http://127.0.0.1:4200/r/release-notes',
    originalUrl: 'https://example.com/resource/path?campaign=browser-fixture',
    codeType: 'CUSTOM_ALIAS',
    status: 'ACTIVE',
    expired: false,
    expiresAt: null,
    createdAt: '2026-08-06T20:00:00Z',
    updatedAt: '2026-08-06T20:00:00Z',
    deletedAt: null,
    version: 0,
    ...overrides,
  };
}

export async function installApiMock(page: Page, options: ApiMockOptions = {}): Promise<void> {
  let urls = [...(options.initialUrls ?? [mockUrl()])];
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const parsed = new URL(request.url());
    const path = parsed.pathname;
    const method = request.method();

    if (path === '/api/v1/urls' && method === 'GET') {
      if (options.listFailure) return error(route, options.listFailure);
      const search = parsed.searchParams.get('search')?.toLowerCase();
      const status = parsed.searchParams.get('status');
      const expired = parsed.searchParams.get('expired');
      const pageNumber = Number(parsed.searchParams.get('page') ?? '0');
      const size = Number(parsed.searchParams.get('size') ?? '20');
      let filtered = urls.filter((item) => status === 'DELETED' ? item.status === 'DELETED' : item.status !== 'DELETED');
      if (status && status !== 'DELETED') filtered = filtered.filter((item) => item.status === status);
      if (expired !== null) filtered = filtered.filter((item) => item.expired === (expired === 'true'));
      if (search) {
        filtered = filtered.filter((item) =>
          `${item.shortCode} ${item.originalUrl}`.toLowerCase().includes(search),
        );
      }
      const start = pageNumber * size;
      return json(route, {
        items: filtered.slice(start, start + size),
        page: pageNumber,
        size,
        totalElements: filtered.length,
        totalPages: filtered.length === 0 ? 0 : Math.ceil(filtered.length / size),
        sort: parsed.searchParams.get('sort') ?? 'createdAt',
        direction: parsed.searchParams.get('direction') ?? 'desc',
      });
    }

    if (path === '/api/v1/urls' && method === 'POST') {
      if (options.createFailure) return error(route, options.createFailure);
      const body = request.postDataJSON() as { originalUrl: string; customAlias?: string; expiresAt?: string };
      const created = mockUrl({
        id: '32f40ef0-2de4-4cb4-866b-a80c86e592cd',
        shortCode: body.customAlias ?? 'Generated42',
        shortUrl: `http://127.0.0.1:4200/r/${body.customAlias ?? 'Generated42'}`,
        originalUrl: body.originalUrl,
        codeType: body.customAlias ? 'CUSTOM_ALIAS' : 'GENERATED',
        expiresAt: body.expiresAt ?? null,
      });
      urls = [created, ...urls];
      return json(route, created, 201, { 'Idempotency-Replayed': 'false', ETag: '"0"' });
    }

    const urlMatch = path.match(/^\/api\/v1\/urls\/([^/]+)(?:\/(enable|disable))?$/);
    if (urlMatch) {
      const id = decodeURIComponent(urlMatch[1]);
      const action = urlMatch[2];
      const index = urls.findIndex((item) => item.id === id);
      if (index < 0) return error(route, { status: 404, code: 'URL_NOT_FOUND', message: 'URL not found.' });
      if (method === 'GET' && action === undefined) return json(route, urls[index]);
      if (method === 'DELETE') {
        urls[index] = { ...urls[index], status: 'DELETED', deletedAt: '2026-08-07T02:00:00Z', version: urls[index].version + 1 };
        return route.fulfill({ status: 204 });
      }
      if (method === 'PATCH') {
        const body = request.postDataJSON() as { expiresAt: string | null };
        urls[index] = { ...urls[index], expiresAt: body.expiresAt, version: urls[index].version + 1 };
        return json(route, urls[index], 200, { ETag: `"${urls[index].version}"` });
      }
      if (method === 'POST' && action) {
        urls[index] = {
          ...urls[index],
          status: action === 'enable' ? 'ACTIVE' : 'DISABLED',
          version: urls[index].version + 1,
        };
        return json(route, urls[index], 200, { ETag: `"${urls[index].version}"` });
      }
    }

    const analyticsMatch = path.match(/^\/api\/v1\/urls\/([^/]+)\/analytics\/(summary|timeseries|referrers|devices)$/);
    if (analyticsMatch) {
      const urlId = analyticsMatch[1];
      const view = analyticsMatch[2];
      const clicks = options.totalClicks ?? 4;
      const base = {
        urlId,
        from: parsed.searchParams.get('from') ?? '2026-08-01T00:00:00Z',
        to: parsed.searchParams.get('to') ?? '2026-08-07T00:00:00Z',
        consistency: 'NEAR_REAL_TIME',
        completeness: 'BEST_EFFORT',
      };
      if (view === 'summary') return json(route, { ...base, totalClicks: clicks, lastEventAt: clicks ? '2026-08-06T22:00:00Z' : null });
      if (view === 'timeseries') return json(route, { ...base, bucket: parsed.searchParams.get('bucket') ?? 'DAY', points: clicks ? [{ start: base.from, end: base.to, clicks }] : [] });
      if (view === 'referrers') return json(route, { ...base, referrers: clicks ? [{ name: 'DIRECT_OR_UNKNOWN', clicks }] : [] });
      return json(route, {
        ...base,
        deviceTypes: clicks ? [{ name: 'DESKTOP', clicks }] : [],
        browsers: clicks ? [{ name: 'CHROME', clicks }] : [],
        operatingSystems: clicks ? [{ name: 'WINDOWS', clicks }] : [],
      });
    }

    return error(route, { status: 404, code: 'NOT_FOUND', message: `No mock for ${method} ${path}.` });
  });
}

async function json(
  route: Route,
  body: unknown,
  status = 200,
  headers: Readonly<Record<string, string>> = {},
): Promise<void> {
  await route.fulfill({ status, contentType: 'application/json', headers, body: JSON.stringify(body) });
}

async function error(
  route: Route,
  failure: MockFailure,
): Promise<void> {
  await json(route, {
    timestamp: '2026-08-07T02:00:00Z',
    status: failure.status,
    error: 'Request failed',
    code: failure.code,
    message: failure.message,
    path: new URL(route.request().url()).pathname,
    correlationId: 'e2e-correlation',
    fieldErrors: [],
  }, failure.status, failure.retryAfterSeconds === undefined
    ? {}
    : { 'Retry-After': String(failure.retryAfterSeconds) });
}
