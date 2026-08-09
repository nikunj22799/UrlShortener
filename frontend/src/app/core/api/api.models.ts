export type LifecycleStatus = 'ACTIVE' | 'DISABLED' | 'DELETED';
export type CodeType = 'GENERATED' | 'CUSTOM_ALIAS';
export type UrlSortField = 'createdAt' | 'updatedAt' | 'expiresAt' | 'shortCode' | 'status';
export type SortDirection = 'asc' | 'desc';
export type TimeBucket = 'HOUR' | 'DAY';
export type AnalyticsConsistency = 'NEAR_REAL_TIME';
export type AnalyticsCompleteness = 'BEST_EFFORT';

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_URL'
  | 'URL_NOT_FOUND'
  | 'URL_DISABLED'
  | 'URL_EXPIRED'
  | 'URL_DELETED'
  | 'ALIAS_CONFLICT'
  | 'IDEMPOTENCY_CONFLICT'
  | 'OPTIMISTIC_LOCK_CONFLICT'
  | 'PRECONDITION_REQUIRED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INVALID_DATE_RANGE'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE';

export interface FieldError {
  readonly field: string;
  readonly message: string;
}

export interface ApiProblem {
  readonly timestamp: string;
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly message: string;
  readonly path: string;
  readonly correlationId: string;
  readonly fieldErrors: readonly FieldError[];
}

export interface CreateUrlRequest {
  readonly originalUrl: string;
  readonly customAlias?: string;
  readonly expiresAt?: string;
}

export interface UrlExpirationPatchRequest {
  readonly expiresAt: string | null;
}

export interface UrlResponse {
  readonly id: string;
  readonly shortCode: string;
  readonly shortUrl: string;
  readonly originalUrl: string;
  readonly codeType: CodeType;
  readonly status: LifecycleStatus;
  readonly expired: boolean;
  readonly expiresAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
  readonly version: number;
}

export interface PagedUrlResponse {
  readonly items: readonly UrlResponse[];
  readonly page: number;
  readonly size: number;
  readonly totalElements: number;
  readonly totalPages: number;
  readonly sort: UrlSortField;
  readonly direction: SortDirection;
}

export interface UrlListQuery {
  readonly page?: number;
  readonly size?: number;
  readonly status?: LifecycleStatus;
  readonly search?: string;
  readonly sort?: UrlSortField;
  readonly direction?: SortDirection;
  readonly expired?: boolean;
}

export interface CreateUrlResult {
  readonly url: UrlResponse;
  readonly replayed: boolean;
}

export interface AnalyticsRangeQuery {
  readonly from?: string;
  readonly to?: string;
}

export interface AnalyticsRange {
  readonly from: string;
  readonly to: string;
  readonly consistency: AnalyticsConsistency;
  readonly completeness: AnalyticsCompleteness;
}

export interface AnalyticsSummary extends AnalyticsRange {
  readonly urlId: string;
  readonly totalClicks: number;
  readonly lastEventAt: string | null;
}

export interface AnalyticsPoint {
  readonly start: string;
  readonly end: string;
  readonly clicks: number;
}

export interface AnalyticsTimeSeries extends AnalyticsRange {
  readonly urlId: string;
  readonly bucket: TimeBucket;
  readonly points: readonly AnalyticsPoint[];
}

export interface NamedCount {
  readonly name: string;
  readonly clicks: number;
}

export interface ReferrerAnalytics extends AnalyticsRange {
  readonly urlId: string;
  readonly referrers: readonly NamedCount[];
}

export interface DeviceAnalytics extends AnalyticsRange {
  readonly urlId: string;
  readonly deviceTypes: readonly NamedCount[];
  readonly browsers: readonly NamedCount[];
  readonly operatingSystems: readonly NamedCount[];
}
