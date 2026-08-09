import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, Subject, throwError } from 'rxjs';
import { AnalyticsApiService } from '../../core/api/analytics-api.service';
import { UrlApiService } from '../../core/api/url-api.service';
import { FrontendApiError } from '../../core/errors/frontend-api-error';
import { analyticsFixture, pageFixture, URL_ID, urlFixture } from '../../testing/api-fixtures';
import { AnalyticsPageComponent } from './analytics-page.component';

describe('AnalyticsPageComponent', () => {
  let urlApi: jasmine.SpyObj<UrlApiService>;
  let analyticsApi: jasmine.SpyObj<AnalyticsApiService>;

  beforeEach(async () => {
    urlApi = jasmine.createSpyObj<UrlApiService>('UrlApiService', ['list', 'get']);
    analyticsApi = jasmine.createSpyObj<AnalyticsApiService>('AnalyticsApiService', [
      'summary', 'timeseries', 'referrers', 'devices',
    ]);
    urlApi.list.and.returnValue(of(pageFixture()));
    urlApi.get.and.returnValue(of(urlFixture()));
    await TestBed.configureTestingModule({
      providers: [
        { provide: UrlApiService, useValue: urlApi },
        { provide: AnalyticsApiService, useValue: analyticsApi },
        provideRouter([
          { path: 'analytics', component: AnalyticsPageComponent },
          { path: 'urls/:id/analytics', component: AnalyticsPageComponent },
        ]),
      ],
    }).compileComponents();
  });

  it('loads summary, time series, referrer, and device data together', async () => {
    configureAnalytics(3);
    const harness = await navigateToAnalytics();

    expect(analyticsApi.summary).toHaveBeenCalled();
    expect(analyticsApi.timeseries).toHaveBeenCalled();
    expect(analyticsApi.referrers).toHaveBeenCalled();
    expect(analyticsApi.devices).toHaveBeenCalled();
    expect(text(harness)).toContain('Redirect events');
    expect(text(harness)).toContain('DIRECT_OR_UNKNOWN');
    expect(text(harness)).toContain('DESKTOP');
  });

  it('includes the current partial minute in the default analytics range', async () => {
    configureAnalytics(3);
    const openedAt = Date.now();
    await navigateToAnalytics();
    const range = analyticsApi.summary.calls.mostRecent().args[1];
    if (range?.to === undefined) throw new Error('Expected a bounded default analytics range');
    expect(new Date(range.to).getTime()).toBeGreaterThan(openedAt);
  });

  it('renders an explicit empty state when the range has no events', async () => {
    configureAnalytics(0);
    const harness = await navigateToAnalytics();
    expect(text(harness)).toContain('No analytics in this range');
    expect(text(harness)).not.toContain('Referrer hosts');
  });

  it('keeps selector loading distinct from a successful empty selector', async () => {
    urlApi.list.and.returnValue(new Subject());
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/analytics', AnalyticsPageComponent);
    harness.fixture.detectChanges();
    expect(text(harness)).toContain('Loading recent URLs');
    expect(text(harness)).not.toContain('No URLs available');
  });

  it('keeps analytics loading distinct from data and empty states', async () => {
    const data = analyticsFixture(3);
    analyticsApi.summary.and.returnValue(new Subject());
    analyticsApi.timeseries.and.returnValue(of(data.timeseries));
    analyticsApi.referrers.and.returnValue(of(data.referrers));
    analyticsApi.devices.and.returnValue(of(data.devices));
    const harness = await navigateToAnalytics();
    expect(text(harness)).toContain('Loading analytics');
    expect(text(harness)).not.toContain('No analytics in this range');
    expect(text(harness)).not.toContain('DIRECT_OR_UNKNOWN');
  });

  it('navigates from the selector only after a valid URL is chosen', async () => {
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/analytics', AnalyticsPageComponent);
    harness.fixture.detectChanges();
    const select = harness.routeNativeElement?.querySelector<HTMLSelectElement>('#analytics-url');
    if (!select) throw new Error('Missing URL selector');
    select.value = URL_ID;
    select.dispatchEvent(new Event('change'));
    harness.fixture.detectChanges();
    clickButton(harness, 'View analytics');
    expect(navigate).toHaveBeenCalledWith(['/urls', URL_ID, 'analytics']);
  });

  it('rejects a malformed route ID without analytics requests', async () => {
    configureAnalytics(3);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/urls/not-a-uuid/analytics', AnalyticsPageComponent);
    harness.fixture.detectChanges();
    expect(text(harness)).toContain('VALIDATION_ERROR');
    expect(analyticsApi.summary).not.toHaveBeenCalled();
  });

  it('rejects a reversed range before issuing replacement requests', async () => {
    configureAnalytics(3);
    const harness = await navigateToAnalytics();
    analyticsApi.summary.calls.reset();
    analyticsApi.timeseries.calls.reset();
    setInput(harness, '#analytics-from', '2030-01-02T00:00');
    setInput(harness, '#analytics-to', '2030-01-01T00:00');
    clickButton(harness, 'Apply range');

    expect(text(harness)).toContain('From must be earlier than To.');
    expect(analyticsApi.summary).not.toHaveBeenCalled();
    expect(analyticsApi.timeseries).not.toHaveBeenCalled();
  });

  it('renders a safe API error with support correlation', async () => {
    const data = analyticsFixture(3);
    analyticsApi.summary.and.returnValue(
      throwError(
        () => new FrontendApiError(503, 'SERVICE_UNAVAILABLE', 'Analytics are temporarily unavailable.', 'analytics-correlation', [], null),
      ),
    );
    analyticsApi.timeseries.and.returnValue(of(data.timeseries));
    analyticsApi.referrers.and.returnValue(of(data.referrers));
    analyticsApi.devices.and.returnValue(of(data.devices));
    const harness = await navigateToAnalytics();

    expect(text(harness)).toContain('SERVICE_UNAVAILABLE');
    expect(text(harness)).toContain('analytics-correlation');
    expect(text(harness)).toContain('Try again');
  });

  it('preserves an authoritative backend date-range error', async () => {
    const data = analyticsFixture(3);
    analyticsApi.summary.and.returnValue(
      throwError(
        () => new FrontendApiError(400, 'INVALID_DATE_RANGE', 'Range exceeds the server limit.', 'range-correlation', [], null),
      ),
    );
    analyticsApi.timeseries.and.returnValue(of(data.timeseries));
    analyticsApi.referrers.and.returnValue(of(data.referrers));
    analyticsApi.devices.and.returnValue(of(data.devices));
    const harness = await navigateToAnalytics();
    expect(text(harness)).toContain('INVALID_DATE_RANGE');
    expect(text(harness)).toContain('range-correlation');
  });

  function configureAnalytics(totalClicks: number): void {
    const data = analyticsFixture(totalClicks);
    analyticsApi.summary.and.returnValue(of(data.summary));
    analyticsApi.timeseries.and.returnValue(of(data.timeseries));
    analyticsApi.referrers.and.returnValue(of(data.referrers));
    analyticsApi.devices.and.returnValue(of(data.devices));
  }
});

async function navigateToAnalytics(): Promise<RouterTestingHarness> {
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(`/urls/${URL_ID}/analytics`, AnalyticsPageComponent);
  harness.fixture.detectChanges();
  return harness;
}

function setInput(harness: RouterTestingHarness, selector: string, value: string): void {
  const input = harness.routeNativeElement?.querySelector<HTMLInputElement>(selector);
  if (!input) throw new Error(`Missing input ${selector}`);
  input.value = value;
  input.dispatchEvent(new Event('input'));
  harness.fixture.detectChanges();
}

function clickButton(harness: RouterTestingHarness, label: string): void {
  const buttons = Array.from(harness.routeNativeElement?.querySelectorAll<HTMLButtonElement>('button') ?? []);
  const button = buttons.find((candidate) => candidate.textContent?.trim() === label);
  if (!button) throw new Error(`Missing button ${label}`);
  button.click();
  harness.fixture.detectChanges();
}

function text(harness: RouterTestingHarness): string {
  return harness.routeNativeElement?.textContent ?? '';
}
