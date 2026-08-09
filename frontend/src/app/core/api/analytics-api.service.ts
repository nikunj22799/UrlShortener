import {
  HttpClient,
  HttpParams,
} from '@angular/common/http';
import {
  inject,
  Injectable,
} from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AnalyticsRangeQuery,
  AnalyticsSummary,
  AnalyticsTimeSeries,
  DeviceAnalytics,
  ReferrerAnalytics,
  TimeBucket,
} from './api.models';

@Injectable({
  providedIn: 'root',
})
export class AnalyticsApiService {
  private readonly http = inject(HttpClient);

  private readonly urlsBase =
    `${environment.apiBaseUrl}/api/v1/urls`;

  summary(
    id: string,
    range: AnalyticsRangeQuery,
  ): Observable<AnalyticsSummary> {
    return this.http.get<AnalyticsSummary>(
      this.endpoint(id, 'summary'),
      {
        params: rangeParams(range),
      },
    );
  }

  timeseries(
    id: string,
    range: AnalyticsRangeQuery,
    bucket: TimeBucket,
  ): Observable<AnalyticsTimeSeries> {
    return this.http.get<AnalyticsTimeSeries>(
      this.endpoint(id, 'timeseries'),
      {
        params:
          rangeParams(range).set(
            'bucket',
            bucket,
          ),
      },
    );
  }

  referrers(
    id: string,
    range: AnalyticsRangeQuery,
    limit = 10,
  ): Observable<ReferrerAnalytics> {
    return this.http.get<ReferrerAnalytics>(
      this.endpoint(id, 'referrers'),
      {
        params:
          rangeParams(range).set(
            'limit',
            limit,
          ),
      },
    );
  }

  devices(
    id: string,
    range: AnalyticsRangeQuery,
  ): Observable<DeviceAnalytics> {
    return this.http.get<DeviceAnalytics>(
      this.endpoint(id, 'devices'),
      {
        params: rangeParams(range),
      },
    );
  }

  private endpoint(
    id: string,
    resource:
      | 'summary'
      | 'timeseries'
      | 'referrers'
      | 'devices',
  ): string {
    return (
      `${this.urlsBase}/` +
      `${encodeURIComponent(id)}/` +
      `analytics/${resource}`
    );
  }
}

function rangeParams(
  range: AnalyticsRangeQuery,
): HttpParams {
  let params = new HttpParams();

  if (range.from !== undefined) {
    params = params.set(
      'from',
      range.from,
    );
  }

  if (range.to !== undefined) {
    params = params.set(
      'to',
      range.to,
    );
  }

  return params;
}