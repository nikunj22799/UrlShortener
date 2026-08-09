import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { REVIEW_METADATA_FIXTURE } from '../../testing/review-fixtures';
import { ReviewerMetadataService } from './reviewer-metadata.service';

describe('ReviewerMetadataService', () => {
  let service: ReviewerMetadataService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ReviewerMetadataService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads only the fixed packaged review asset', () => {
    service.getReviewMetadata().subscribe((result) => expect(result.overview.name).toBe('Link Operations'));
    const request = http.expectOne('/assets/engineering/reviewer-metadata.json');
    expect(request.request.method).toBe('GET');
    request.flush(REVIEW_METADATA_FIXTURE);
  });

  it('reduces health failures to an unavailable state without leaking an error body', () => {
    service.getBackendHealth().subscribe((result) => expect(result).toEqual({ status: 'UNAVAILABLE' }));
    http.expectOne('/actuator/health').flush({ detail: 'sensitive' }, { status: 503, statusText: 'Unavailable' });
  });
});
