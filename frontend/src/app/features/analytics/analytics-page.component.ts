import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  ActivatedRoute,
  Router,
  RouterLink,
} from '@angular/router';
import { forkJoin } from 'rxjs';

import {
  AnalyticsRangeQuery,
  AnalyticsSummary,
  AnalyticsTimeSeries,
  DeviceAnalytics,
  ReferrerAnalytics,
  TimeBucket,
  UrlResponse,
} from '../../core/api/api.models';
import { AnalyticsApiService } from '../../core/api/analytics-api.service';
import { UrlApiService } from '../../core/api/url-api.service';
import {
  FrontendApiError,
  isFrontendApiError,
} from '../../core/errors/frontend-api-error';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state.component';
import { LoadingIndicatorComponent } from '../../shared/components/loading-indicator.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { AnalyticsCountTableComponent } from './analytics-count-table.component';
import { AnalyticsSummaryComponent } from './analytics-summary.component';

interface AnalyticsData {
  readonly summary: AnalyticsSummary;
  readonly timeseries: AnalyticsTimeSeries;
  readonly referrers: ReferrerAnalytics;
  readonly devices: DeviceAnalytics;
}

@Component({
  selector: 'app-analytics-page',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    EmptyStateComponent,
    ErrorStateComponent,
    LoadingIndicatorComponent,
    StatusBadgeComponent,
    AnalyticsCountTableComponent,
    AnalyticsSummaryComponent,
  ],
  templateUrl: './analytics-page.component.html',
  styleUrl: './analytics-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsPageComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly urlApi = inject(UrlApiService);
  private readonly analyticsApi = inject(AnalyticsApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly selectionForm = this.formBuilder.group({
    urlId: this.formBuilder.control('', {
      validators: [Validators.required],
    }),
  });

  protected readonly rangeForm = this.formBuilder.group({
    from: this.formBuilder.control(defaultFrom(), {
      validators: [Validators.required],
    }),
    to: this.formBuilder.control(defaultTo(), {
      validators: [Validators.required],
    }),
    bucket: this.formBuilder.control<TimeBucket>('DAY', {
      validators: [Validators.required],
    }),
  });

  protected readonly selectorLoading = signal(true);
  protected readonly selectorError =
    signal<FrontendApiError | null>(null);
  protected readonly urlOptions =
    signal<readonly UrlResponse[]>([]);

  protected readonly selectedId =
    signal<string | null>(null);
  protected readonly selectedUrl =
    signal<UrlResponse | null>(null);

  protected readonly analyticsLoading = signal(false);
  protected readonly analyticsError =
    signal<FrontendApiError | null>(null);
  protected readonly rangeError =
    signal<string | null>(null);
  protected readonly analytics =
    signal<AnalyticsData | null>(null);

  constructor() {
    this.loadUrlOptions();

    const id = this.route.snapshot.paramMap.get('id');

    if (id === null) {
      return;
    }

    this.selectedId.set(id);

    if (!isUuid(id)) {
      this.analyticsError.set(
        new FrontendApiError(
          400,
          'VALIDATION_ERROR',
          'The URL identifier is malformed.',
          null,
          [],
          null,
        ),
      );

      return;
    }

    this.loadAnalytics();
  }

  protected loadUrlOptions(): void {
    this.selectorLoading.set(true);
    this.selectorError.set(null);

    this.urlApi
      .list({
        page: 0,
        size: 20,
        sort: 'createdAt',
        direction: 'desc',
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (page) => {
          this.urlOptions.set(page.items);
          this.selectorLoading.set(false);
        },
        error: (error: unknown) => {
          this.selectorError.set(
            toFrontendError(
              error,
              'Recent URLs could not be loaded.',
            ),
          );

          this.selectorLoading.set(false);
        },
      });
  }

  protected openSelection(): void {
    const id =
      this.selectionForm.controls.urlId.value;

    if (!isUuid(id)) {
      return;
    }

    void this.router.navigate([
      '/urls',
      id,
      'analytics',
    ]);
  }

  protected chooseAnother(): void {
    void this.router.navigate([
      '/analytics',
    ]);
  }

  protected loadAnalytics(): void {
    const id = this.selectedId();

    if (
      !isUuid(id) ||
      this.analyticsLoading()
    ) {
      return;
    }

    this.rangeForm.markAllAsTouched();

    const {
      from,
      to,
      bucket,
    } = this.rangeForm.getRawValue();

    const validationMessage =
      validateRange(
        from,
        to,
        bucket,
      );

    this.rangeError.set(
      validationMessage,
    );

    if (
      validationMessage !== null
    ) {
      return;
    }

    const range: AnalyticsRangeQuery = {
      from: new Date(from).toISOString(),
      to: new Date(to).toISOString(),
    };

    this.analyticsLoading.set(true);
    this.analyticsError.set(null);

    forkJoin({
      url: this.urlApi.get(id),
      summary:
        this.analyticsApi.summary(
          id,
          range,
        ),
      timeseries:
        this.analyticsApi.timeseries(
          id,
          range,
          bucket,
        ),
      referrers:
        this.analyticsApi.referrers(
          id,
          range,
        ),
      devices:
        this.analyticsApi.devices(
          id,
          range,
        ),
    })
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: (result) => {
          this.selectedUrl.set(
            result.url,
          );

          this.analytics.set({
            summary:
              result.summary,
            timeseries:
              result.timeseries,
            referrers:
              result.referrers,
            devices:
              result.devices,
          });

          this.analyticsLoading.set(
            false,
          );
        },
        error: (error: unknown) => {
          this.analyticsError.set(
            toFrontendError(
              error,
              'Analytics could not be loaded.',
            ),
          );

          this.analyticsLoading.set(
            false,
          );
        },
      });
  }
}

function validateRange(
  from: string,
  to: string,
  bucket: TimeBucket,
): string | null {
  const fromTimestamp =
    new Date(from).getTime();

  const toTimestamp =
    new Date(to).getTime();

  if (
    !Number.isFinite(fromTimestamp) ||
    !Number.isFinite(toTimestamp)
  ) {
    return 'Both range values must be valid dates and times.';
  }

  if (
    fromTimestamp >= toTimestamp
  ) {
    return 'From must be earlier than To.';
  }

  const rangeDays =
    (toTimestamp - fromTimestamp) /
    86_400_000;

  if (rangeDays > 90) {
    return 'The selected range cannot exceed 90 days.';
  }

  if (
    bucket === 'HOUR' &&
    rangeDays > 7
  ) {
    return 'Hourly analytics are limited to 7 days.';
  }

  return null;
}

function defaultFrom(): string {
  return toLocalDateTime(
    new Date(
      Date.now() -
        7 * 86_400_000,
    ),
  );
}

function defaultTo(): string {
  return toLocalDateTime(
    new Date(
      Date.now() + 60_000,
    ),
  );
}

function toLocalDateTime(
  date: Date,
): string {
  const offset =
    date.getTimezoneOffset() *
    60_000;

  return new Date(
    date.getTime() - offset,
  )
    .toISOString()
    .slice(0, 16);
}

function isUuid(
  value: string | null,
): value is string {
  return (
    value !== null &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function toFrontendError(
  error: unknown,
  message: string,
): FrontendApiError {
  if (
    isFrontendApiError(error)
  ) {
    return error;
  }

  return new FrontendApiError(
    0,
    'NETWORK_ERROR',
    message,
    null,
    [],
    null,
  );
}