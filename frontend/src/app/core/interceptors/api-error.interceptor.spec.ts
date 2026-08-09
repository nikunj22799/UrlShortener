import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { FrontendApiError, isFrontendApiError } from '../errors/frontend-api-error';
import { apiErrorInterceptor } from './api-error.interceptor';

describe('apiErrorInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it('maps backend problems while preserving code, fields, and correlation ID', () => {
    let received: unknown;
    http.get('/api/test').subscribe({ error: (error: unknown) => (received = error) });

    controller.expectOne('/api/test').flush(
      {
        timestamp: '2026-08-07T00:00:00Z',
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'The request contains invalid fields.',
        path: '/api/test',
        correlationId: 'correlation-123',
        fieldErrors: [{ field: 'originalUrl', message: 'is required' }],
      },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(isFrontendApiError(received)).toBeTrue();
    if (isFrontendApiError(received)) {
      expect(received.code).toBe('VALIDATION_ERROR');
      expect(received.correlationId).toBe('correlation-123');
      expect(received.fieldErrors).toEqual([{ field: 'originalUrl', message: 'is required' }]);
    }
  });

  it('preserves rate-limit retry timing', () => {
    let received: unknown;
    http.get('/api/test').subscribe({ error: (error: unknown) => (received = error) });
    controller.expectOne('/api/test').flush(
      {
        timestamp: '2026-08-07T00:00:00Z', status: 429, code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests.', path: '/api/test', correlationId: 'correlation-429', fieldErrors: [],
      },
      { status: 429, statusText: 'Too Many Requests', headers: { 'Retry-After': '17' } },
    );

    expect(isFrontendApiError(received)).toBeTrue();
    if (isFrontendApiError(received)) {
      expect(received.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(received.retryAfterSeconds).toBe(17);
    }
  });

  for (const scenario of [
    { status: 409, code: 'ALIAS_CONFLICT', message: 'Alias already exists.' },
    { status: 409, code: 'OPTIMISTIC_LOCK_CONFLICT', message: 'The record changed.' },
    { status: 503, code: 'SERVICE_UNAVAILABLE', message: 'A required service is unavailable.' },
  ] as const) {
    it(`preserves ${scenario.code} for feature-specific handling`, () => {
      let received: unknown;
      http.get('/api/test').subscribe({ error: (error: unknown) => (received = error) });
      controller.expectOne('/api/test').flush(
        {
          timestamp: '2026-08-07T00:00:00Z',
          status: scenario.status,
          code: scenario.code,
          message: scenario.message,
          path: '/api/test',
          correlationId: `correlation-${scenario.status}`,
          fieldErrors: [],
        },
        { status: scenario.status, statusText: 'Expected failure' },
      );

      if (!isFrontendApiError(received)) {
        fail('Expected a FrontendApiError');
        return;
      }
      expect(received.code).toBe(scenario.code);
      expect(received.message).toBe(scenario.message);
    });
  }

  it('uses the response correlation header when a transport failure has no problem body', () => {
    let received: unknown;
    http.get('/api/test').subscribe({ error: (error: unknown) => (received = error) });
    controller.expectOne('/api/test').flush(null, {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'X-Correlation-ID': 'header-only-correlation' },
    });

    if (!isFrontendApiError(received)) {
      fail('Expected a FrontendApiError');
      return;
    }
    expect(received.code).toBe('INTERNAL_ERROR');
    expect(received.message).toBe('The service is temporarily unavailable. Try again later.');
    expect(received.correlationId).toBe('header-only-correlation');
  });

  it('maps an unavailable network to a stable frontend error', () => {
    let received: unknown;
    http.get('/api/test').subscribe({ error: (error: unknown) => (received = error) });
    controller.expectOne('/api/test').error(new ProgressEvent('error'));

    expect(received).toEqual(jasmine.any(FrontendApiError));
    if (isFrontendApiError(received)) {
      expect(received.code).toBe('NETWORK_ERROR');
      expect(received.status).toBe(0);
    }
  });

  it('does not expose an unexpected malformed response body', () => {
    let received: unknown;
    http.get('/api/test').subscribe({ error: (error: unknown) => (received = error) });
    controller.expectOne('/api/test').flush(
      { stackTrace: 'sensitive internals' },
      { status: 500, statusText: 'Server Error', headers: { 'X-Correlation-ID': 'header-correlation' } },
    );

    if (!isFrontendApiError(received)) {
      fail('Expected a FrontendApiError');
      return;
    }
    expect(received.code).toBe('INTERNAL_ERROR');
    expect(received.message).toBe('The request could not be completed.');
    expect(received.correlationId).toBe('header-correlation');
    expect(received.message).not.toContain('sensitive');
  });
});
