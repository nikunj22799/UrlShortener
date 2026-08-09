import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import {
  PagedUrlResponse,
  UrlResponse,
} from '../../core/api/api.models';
import { UrlApiService } from '../../core/api/url-api.service';
import {
  FrontendApiError,
  toFrontendApiError,
} from '../../core/errors/frontend-api-error';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state.component';
import { LoadingIndicatorComponent } from '../../shared/components/loading-indicator.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { DestinationSummaryPipe } from '../../shared/pipes/destination-summary.pipe';

interface DashboardData {
  readonly total: number;
  readonly active: number;
  readonly disabled: number;
  readonly expired: number;
  readonly recent: readonly UrlResponse[];
}

@Component({
  selector: 'app-dashboard-page',
  imports: [
    DatePipe,
    RouterLink,
    EmptyStateComponent,
    ErrorStateComponent,
    LoadingIndicatorComponent,
    StatusBadgeComponent,
    DestinationSummaryPipe,
  ],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPageComponent {
  private readonly urlApi = inject(UrlApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly error = signal<FrontendApiError | null>(null);
  protected readonly dashboard = signal<DashboardData | null>(null);

  constructor() {
    this.loadDashboard();
  }

  protected loadDashboard(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      recent: this.urlApi.list({
        page: 0,
        size: 5,
        sort: 'createdAt',
        direction: 'desc',
      }),
      active: this.urlApi.list({
        page: 0,
        size: 1,
        status: 'ACTIVE',
      }),
      disabled: this.urlApi.list({
        page: 0,
        size: 1,
        status: 'DISABLED',
      }),
      expired: this.urlApi.list({
        page: 0,
        size: 1,
        expired: true,
      }),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ recent, active, disabled, expired }) => {
          this.dashboard.set(
            createDashboardData(
              recent,
              active,
              disabled,
              expired,
            ),
          );

          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.error.set(
            toFrontendApiError(
              error,
              'The dashboard could not be loaded.',
            ),
          );
          this.loading.set(false);
        },
      });
  }
}

function createDashboardData(
  recent: PagedUrlResponse,
  active: PagedUrlResponse,
  disabled: PagedUrlResponse,
  expired: PagedUrlResponse,
): DashboardData {
  return {
    total: recent.totalElements,
    active: active.totalElements,
    disabled: disabled.totalElements,
    expired: expired.totalElements,
    recent: recent.items,
  };
}
