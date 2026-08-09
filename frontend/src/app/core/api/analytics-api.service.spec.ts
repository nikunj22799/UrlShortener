import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { analyticsFixture, URL_ID } from '../../testing/api-fixtures';
import { AnalyticsApiService } from './analytics-api.service';

describe('AnalyticsApiService', () => {
  let service: AnalyticsApiService;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AnalyticsApiService);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it('builds a bounded UTC time-series request', () => {
    const range = { from: '2026-08-01T00:00:00Z', to: '2026-08-07T00:00:00Z' };

    service.timeseries(URL_ID, range, 'DAY').subscribe();

    const request = controller.expectOne(
      (candidate) => candidate.url === `/api/v1/urls/${URL_ID}/analytics/timeseries`,
    );
    expect(request.request.params.get('from')).toBe(range.from);
    expect(request.request.params.get('to')).toBe(range.to);
    expect(request.request.params.get('bucket')).toBe('DAY');
    request.flush(analyticsFixture().timeseries);
  });

  it('requests summary with an empty query when the backend default range is used', () => {
    service.summary(URL_ID, {}).subscribe();
    const request = controller.expectOne(`/api/v1/urls/${URL_ID}/analytics/summary`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);
    request.flush(analyticsFixture().summary);
  });

  it('requests bounded referrer results with the chosen limit', () => {
    service.referrers(URL_ID, { from: '2026-08-01T00:00:00Z', to: '2026-08-02T00:00:00Z' }, 25).subscribe();
    const request = controller.expectOne(`/api/v1/urls/${URL_ID}/analytics/referrers?from=2026-08-01T00:00:00Z&to=2026-08-02T00:00:00Z&limit=25`);
    expect(request.request.method).toBe('GET');
    request.flush(analyticsFixture().referrers);
  });

  it('maps an empty device response without adding categories', () => {
    let categoryCount = -1;
    service.devices(URL_ID, {}).subscribe((result) => {
      categoryCount = result.deviceTypes.length + result.browsers.length + result.operatingSystems.length;
    });
    controller.expectOne(`/api/v1/urls/${URL_ID}/analytics/devices`).flush({
      ...analyticsFixture().devices,
      deviceTypes: [],
      browsers: [],
      operatingSystems: [],
    });
    expect(categoryCount).toBe(0);
  });

  it('propagates backend errors for feature-specific handling', () => {
    let status = 0;
    service.summary(URL_ID, {}).subscribe({ error: (error: { status: number }) => (status = error.status) });
    controller.expectOne(`/api/v1/urls/${URL_ID}/analytics/summary`).flush(
      { code: 'SERVICE_UNAVAILABLE' },
      { status: 503, statusText: 'Service Unavailable' },
    );
    expect(status).toBe(503);
  });
});
