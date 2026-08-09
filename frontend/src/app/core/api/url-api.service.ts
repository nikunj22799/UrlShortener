import {
  HttpClient,
  HttpHeaders,
  HttpParams,
} from '@angular/common/http';
import {
  inject,
  Injectable,
} from '@angular/core';
import {
  map,
  Observable,
} from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CreateUrlRequest,
  CreateUrlResult,
  PagedUrlResponse,
  UrlExpirationPatchRequest,
  UrlListQuery,
  UrlResponse,
} from './api.models';

@Injectable({
  providedIn: 'root',
})
export class UrlApiService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl =
    `${environment.apiBaseUrl}/api/v1/urls`;

  create(
    request: CreateUrlRequest,
    idempotencyKey: string,
  ): Observable<CreateUrlResult> {
    const headers = new HttpHeaders({
      'Idempotency-Key': idempotencyKey,
    });

    return this.http
      .post<UrlResponse>(
        this.baseUrl,
        request,
        {
          headers,
          observe: 'response',
        },
      )
      .pipe(
        map((response) => ({
          url: requireBody(response.body),
          replayed:
            response.headers.get(
              'Idempotency-Replayed',
            ) === 'true',
        })),
      );
  }

  get(id: string): Observable<UrlResponse> {
    return this.http.get<UrlResponse>(
      `${this.baseUrl}/${encodeURIComponent(id)}`,
    );
  }

  list(
    query: UrlListQuery = {},
  ): Observable<PagedUrlResponse> {
    let params = new HttpParams();

    params = setParam(
      params,
      'page',
      query.page,
    );

    params = setParam(
      params,
      'size',
      query.size,
    );

    params = setParam(
      params,
      'status',
      query.status,
    );

    params = setParam(
      params,
      'search',
      query.search,
    );

    params = setParam(
      params,
      'sort',
      query.sort,
    );

    params = setParam(
      params,
      'direction',
      query.direction,
    );

    params = setParam(
      params,
      'expired',
      query.expired,
    );

    return this.http.get<PagedUrlResponse>(
      this.baseUrl,
      { params },
    );
  }

  updateExpiration(
    id: string,
    request: UrlExpirationPatchRequest,
    version: number,
  ): Observable<UrlResponse> {
    return this.http.patch<UrlResponse>(
      `${this.baseUrl}/${encodeURIComponent(id)}`,
      request,
      {
        headers: versionHeaders(version),
      },
    );
  }

  enable(
    id: string,
    version: number,
  ): Observable<UrlResponse> {
    return this.http.post<UrlResponse>(
      `${this.baseUrl}/${encodeURIComponent(id)}/enable`,
      null,
      {
        headers: versionHeaders(version),
      },
    );
  }

  disable(
    id: string,
    version: number,
  ): Observable<UrlResponse> {
    return this.http.post<UrlResponse>(
      `${this.baseUrl}/${encodeURIComponent(id)}/disable`,
      null,
      {
        headers: versionHeaders(version),
      },
    );
  }

  delete(
    id: string,
    version: number,
  ): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/${encodeURIComponent(id)}`,
      {
        headers: versionHeaders(version),
      },
    );
  }
}

function versionHeaders(
  version: number,
): HttpHeaders {
  return new HttpHeaders({
    'If-Match': `"${version}"`,
  });
}

function setParam(
  params: HttpParams,
  name: string,
  value:
    | string
    | number
    | boolean
    | undefined,
): HttpParams {
  if (
    value === undefined ||
    value === ''
  ) {
    return params;
  }

  return params.set(
    name,
    String(value),
  );
}

function requireBody<T>(
  body: T | null,
): T {
  if (body === null) {
    throw new Error(
      'The backend returned an empty success response.',
    );
  }

  return body;
}