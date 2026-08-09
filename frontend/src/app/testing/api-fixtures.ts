import {
  AnalyticsSummary,
  AnalyticsTimeSeries,
  DeviceAnalytics,
  PagedUrlResponse,
  ReferrerAnalytics,
  UrlResponse,
} from '../core/api/api.models';

export const URL_ID = 'b49347f8-24a5-4f69-acf7-1fb9eac99b94';

export function urlFixture(overrides: Partial<UrlResponse> = {}): UrlResponse {
  return {
    id: URL_ID,
    shortCode: 'Ab3xYz901Q',
    shortUrl: 'http://localhost:8080/r/Ab3xYz901Q',
    originalUrl: 'https://example.com/resource/path?campaign=test-only',
    codeType: 'GENERATED',
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

export function pageFixture(items: readonly UrlResponse[] = [urlFixture()]): PagedUrlResponse {
  return {
    items,
    page: 0,
    size: 20,
    totalElements: items.length,
    totalPages: items.length === 0 ? 0 : 1,
    sort: 'createdAt',
    direction: 'desc',
  };
}

export function analyticsFixture(totalClicks = 3): {
  summary: AnalyticsSummary;
  timeseries: AnalyticsTimeSeries;
  referrers: ReferrerAnalytics;
  devices: DeviceAnalytics;
} {
  const range = {
    from: '2026-08-01T00:00:00Z',
    to: '2026-08-07T00:00:00Z',
    consistency: 'NEAR_REAL_TIME' as const,
    completeness: 'BEST_EFFORT' as const,
  };
  return {
    summary: {
      ...range,
      urlId: URL_ID,
      totalClicks,
      lastEventAt: totalClicks > 0 ? '2026-08-06T22:00:00Z' : null,
    },
    timeseries: {
      ...range,
      urlId: URL_ID,
      bucket: 'DAY',
      points: [{ start: range.from, end: '2026-08-02T00:00:00Z', clicks: totalClicks }],
    },
    referrers: {
      ...range,
      urlId: URL_ID,
      referrers: totalClicks > 0 ? [{ name: 'DIRECT_OR_UNKNOWN', clicks: totalClicks }] : [],
    },
    devices: {
      ...range,
      urlId: URL_ID,
      deviceTypes: totalClicks > 0 ? [{ name: 'DESKTOP', clicks: totalClicks }] : [],
      browsers: totalClicks > 0 ? [{ name: 'CHROME', clicks: totalClicks }] : [],
      operatingSystems: totalClicks > 0 ? [{ name: 'WINDOWS', clicks: totalClicks }] : [],
    },
  };
}
