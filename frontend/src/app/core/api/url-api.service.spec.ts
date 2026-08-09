import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { URL_ID, urlFixture } from '../../testing/api-fixtures';
import { UrlApiService } from './url-api.service';

describe('UrlApiService', () => {
  let service: UrlApiService;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UrlApiService);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it('sends one idempotency key and exposes replay metadata', () => {
    let replayed = false;
    service.create({ originalUrl: 'https://example.com/resource' }, 'request-key-123').subscribe((result) => {
      replayed = result.replayed;
    });
    const request = controller.expectOne('/api/v1/urls');
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Idempotency-Key')).toBe('request-key-123');
    expect(request.request.body).toEqual({ originalUrl: 'https://example.com/resource' });
    request.flush(urlFixture(), { headers: { 'Idempotency-Replayed': 'true' } });
    expect(replayed).toBeTrue();
  });

  it('sends only allowlisted server-side list parameters', () => {
    service.list({ page: 2, size: 50, status: 'DISABLED', search: 'release', sort: 'updatedAt', direction: 'asc', expired: false }).subscribe();
    const request = controller.expectOne(
      (candidate) => candidate.url === '/api/v1/urls' && candidate.params.get('page') === '2',
    );
    expect(request.request.params.keys().sort()).toEqual(
      ['direction', 'expired', 'page', 'search', 'size', 'sort', 'status'].sort(),
    );
    expect(request.request.params.get('sort')).toBe('updatedAt');
    expect(request.request.params.get('expired')).toBe('false');
    request.flush({ items: [], page: 2, size: 50, totalElements: 0, totalPages: 0, sort: 'updatedAt', direction: 'asc' });
  });

  it('retrieves a URL by encoded public identifier', () => {
    let received = '';
    service.get('public id').subscribe((url) => (received = url.id));
    const request = controller.expectOne('/api/v1/urls/public%20id');
    expect(request.request.method).toBe('GET');
    request.flush(urlFixture());
    expect(received).toBe(URL_ID);
  });

  it('quotes the optimistic version in mutation headers', () => {
    service.updateExpiration(URL_ID, { expiresAt: null }, 7).subscribe();
    const request = controller.expectOne(`/api/v1/urls/${URL_ID}`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.headers.get('If-Match')).toBe('"7"');
    expect(request.request.body).toEqual({ expiresAt: null });
    request.flush(urlFixture({ version: 8 }));
  });

  it('sends versioned enable and disable requests to their lifecycle endpoints', () => {
    service.enable(URL_ID, 2).subscribe();
    const enable = controller.expectOne(`/api/v1/urls/${URL_ID}/enable`);
    expect(enable.request.method).toBe('POST');
    expect(enable.request.body).toBeNull();
    expect(enable.request.headers.get('If-Match')).toBe('"2"');
    enable.flush(urlFixture({ version: 3 }));

    service.disable(URL_ID, 3).subscribe();
    const disable = controller.expectOne(`/api/v1/urls/${URL_ID}/disable`);
    expect(disable.request.method).toBe('POST');
    expect(disable.request.headers.get('If-Match')).toBe('"3"');
    disable.flush(urlFixture({ status: 'DISABLED', version: 4 }));
  });

  it('soft-deletes with the last observed version and no body', () => {
    service.delete(URL_ID, 9).subscribe();
    const request = controller.expectOne(`/api/v1/urls/${URL_ID}`);
    expect(request.request.method).toBe('DELETE');
    expect(request.request.headers.get('If-Match')).toBe('"9"');
    request.flush(null);
  });

  it('surfaces an empty create success body instead of inventing a response', () => {
    let received: unknown;
    service.create({ originalUrl: 'https://example.com/resource' }, 'request-key-456').subscribe({
      error: (error: unknown) => (received = error),
    });
    controller.expectOne('/api/v1/urls').flush(null);
    expect(received).toEqual(jasmine.any(Error));
  });
});
