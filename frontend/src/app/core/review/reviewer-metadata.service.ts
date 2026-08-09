import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import {
  BackendHealth,
  ProductionApplicationsPortfolio,
  ProjectStructure,
  ReviewerMetadata,
} from './review.models';

@Injectable({ providedIn: 'root' })
export class ReviewerMetadataService {
  private readonly http = inject(HttpClient);

  getReviewMetadata(): Observable<ReviewerMetadata> {
    return this.http.get<ReviewerMetadata>('/assets/engineering/reviewer-metadata.json');
  }

  getProjectStructure(): Observable<ProjectStructure> {
    return this.http.get<ProjectStructure>('/assets/engineering/project-structure.json');
  }

  getPortfolio(): Observable<ProductionApplicationsPortfolio> {
    return this.http.get<ProductionApplicationsPortfolio>('/assets/portfolio/production-applications.json');
  }

  getBackendHealth(): Observable<BackendHealth> {
    return this.http
      .get<BackendHealth>('/actuator/health')
      .pipe(catchError(() => of({ status: 'UNAVAILABLE' })));
  }
}
