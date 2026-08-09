import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ActivatedRoute,
  ParamMap,
  Router,
  RouterLink,
} from '@angular/router';
import {
  catchError,
  combineLatest,
  map,
  of,
  startWith,
  Subject,
  switchMap,
  tap,
} from 'rxjs';

import {
  LifecycleStatus,
  PagedUrlResponse,
  SortDirection,
  UrlResponse,
  UrlSortField,
} from '../../core/api/api.models';
import { UrlApiService } from '../../core/api/url-api.service';
import {
  FrontendApiError,
  toFrontendApiError,
} from '../../core/errors/frontend-api-error';
import { ClipboardService } from '../../core/services/clipboard.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmationDialogComponent } from '../../shared/components/confirmation-dialog.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state.component';
import { LoadingIndicatorComponent } from '../../shared/components/loading-indicator.component';
import {
  UrlFilterComponent,
  UrlFilterQuery,
  UrlFilterValue,
} from './url-filter.component';
import {
  UrlTableAction,
  UrlTableComponent,
} from './url-table.component';

type ConfirmAction = 'disable' | 'delete';

interface PendingAction {
  readonly type: ConfirmAction;
  readonly url: UrlResponse;
}

interface LoadResult {
  readonly page: PagedUrlResponse | null;
  readonly error: FrontendApiError | null;
}

@Component({
  selector: 'app-url-management-page',
  imports: [
    RouterLink,
    ConfirmationDialogComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    LoadingIndicatorComponent,
    UrlFilterComponent,
    UrlTableComponent,
  ],
  templateUrl: './url-management-page.component.html',
  styleUrl: './url-management-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UrlManagementPageComponent {
  private readonly urlApi = inject(UrlApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly clipboard = inject(ClipboardService);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);


  private readonly refresh = new Subject<void>();

  protected readonly loading = signal(true);
  protected readonly page = signal<PagedUrlResponse | null>(null);
  protected readonly loadError = signal<FrontendApiError | null>(null);
  protected readonly mutationError = signal<FrontendApiError | null>(null);
  protected readonly busyId = signal<string | null>(null);
  protected readonly pendingAction = signal<PendingAction | null>(null);
  protected readonly queryState =
    signal<UrlFilterQuery>(defaultQuery());

  constructor() {
    combineLatest([
      this.route.queryParamMap,
      this.refresh.pipe(startWith(undefined)),
    ])
      .pipe(
        map(([parameters]) => parseQuery(parameters)),
        tap((query) => {
          this.queryState.set(query);
          this.loading.set(true);
          this.loadError.set(null);
        }),
        switchMap((query) =>
          this.urlApi.list(query).pipe(
            map(
              (page): LoadResult => ({
                page,
                error: null,
              }),
            ),
            catchError((error: unknown) =>
              of<LoadResult>({
                page: null,
                error: toFrontendApiError(
                  error,
                  'The URL list could not be loaded.',
                ),
              }),
            ),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        this.page.set(result.page);
        this.loadError.set(result.error);
        this.loading.set(false);
      });
  }

  protected applyFilters(
    filters: UrlFilterValue,
  ): void {
    const status = parseStatus(filters.status);

    const queryParams = compactQueryParams({
      page: 0,
      size: parseSize(filters.size),
      status,
      search:
        filters.search.trim() || undefined,
      sort: parseSort(filters.sort),
      direction: parseDirection(
        filters.direction,
      ),
      expired:
        status === 'DELETED'
          ? undefined
          : parseExpired(filters.expired),
    });

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
    });
  }

  protected resetFilters(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
    });
  }

  protected goToPage(page: number): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page },
      queryParamsHandling: 'merge',
    });
  }

  protected reload(): void {
    this.mutationError.set(null);
    this.refresh.next();
  }

  protected handleTableAction(
    action: UrlTableAction,
  ): void {
    switch (action.type) {
      case 'copy':
        void this.copy(action.url);
        break;

      case 'enable':
        this.enable(action.url);
        break;

      case 'disable':
      case 'delete':
        this.requestAction(
          action.type,
          action.url,
        );
        break;
    }
  }

  protected cancelAction(): void {
    if (this.busyId() === null) {
      this.pendingAction.set(null);
    }
  }

  protected confirmAction(): void {
    const action = this.pendingAction();

    if (
      action === null ||
      this.busyId() !== null
    ) {
      return;
    }

    if (action.type === 'disable') {
      this.disable(action.url);
      return;
    }

    this.delete(action.url);
  }

  protected confirmationMessage(
    action: PendingAction,
  ): string {
    if (action.type === 'delete') {
      return `Soft-delete ${action.url.shortCode}? The code remains reserved and will stop redirecting.`;
    }

    return `Disable ${action.url.shortCode}? Visitors will no longer be redirected until it is enabled again.`;
  }

  private requestAction(
    type: ConfirmAction,
    url: UrlResponse,
  ): void {
    this.mutationError.set(null);
    this.pendingAction.set({
      type,
      url,
    });
  }

  private enable(url: UrlResponse): void {
    if (this.busyId() !== null) {
      return;
    }

    this.runRepresentationMutation(
      url,
      this.urlApi.enable(
        url.id,
        url.version,
      ),
      'URL enabled.',
    );
  }

  private disable(url: UrlResponse): void {
    if (this.busyId() !== null) {
      return;
    }

    this.runRepresentationMutation(
      url,
      this.urlApi.disable(
        url.id,
        url.version,
      ),
      'URL disabled.',
    );
  }

  private delete(url: UrlResponse): void {
    if (this.busyId() !== null) {
      return;
    }

    this.busyId.set(url.id);

    this.urlApi
      .delete(
        url.id,
        url.version,
      )
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: () => {
          this.busyId.set(null);
          this.pendingAction.set(null);

          this.notifications.success(
            `URL ${url.shortCode} deleted.`,
          );

          const currentPage =
            this.page();

          if (
            currentPage?.items.length ===
              1 &&
            currentPage.page > 0
          ) {
            this.goToPage(
              currentPage.page - 1,
            );
            return;
          }

          this.reload();
        },
        error: (error: unknown) => {
          this.handleMutationError(
            error,
          );
        },
      });
  }

  private runRepresentationMutation(
    url: UrlResponse,
    request:
      ReturnType<
        UrlApiService['enable']
      >,
    successMessage: string,
  ): void {
    this.busyId.set(url.id);

    request
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: (updated) => {
          this.page.update(
            (currentPage) => {
              if (
                currentPage === null
              ) {
                return null;
              }

              return {
                ...currentPage,
                items:
                  currentPage.items.map(
                    (item) =>
                      item.id === updated.id
                        ? updated
                        : item,
                  ),
              };
            },
          );

          this.busyId.set(null);
          this.pendingAction.set(null);
          this.mutationError.set(null);

          this.notifications.success(
            successMessage,
          );
        },
        error: (error: unknown) => {
          this.handleMutationError(
            error,
          );
        },
      });
  }

  private async copy(
    url: UrlResponse,
  ): Promise<void> {
    const copied =
      await this.clipboard.writeText(
        url.shortUrl,
      );

    if (copied) {
      this.notifications.success(
        `Short URL ${url.shortCode} copied.`,
      );
      return;
    }

    this.notifications.warning(
      'Clipboard access was unavailable.',
    );
  }

  private handleMutationError(
    error: unknown,
  ): void {
    this.mutationError.set(
      toFrontendApiError(
        error,
        'The URL could not be changed.',
      ),
    );

    this.busyId.set(null);
    this.pendingAction.set(null);
  }
}

function parseQuery(
  parameters: ParamMap,
): UrlFilterQuery {
  const status = parseStatus(
    parameters.get('status'),
  );

  const search =
    parameters.get('search')?.trim();

  return {
    page: parsePage(
      parameters.get('page'),
    ),
    size: parseSize(
      parameters.get('size'),
    ),
    status,
    search: search
      ? search.slice(0, 200)
      : undefined,
    sort: parseSort(
      parameters.get('sort'),
    ),
    direction: parseDirection(
      parameters.get('direction'),
    ),
    expired:
      status === 'DELETED'
        ? undefined
        : parseExpired(
            parameters.get(
              'expired',
            ),
          ),
  };
}

function defaultQuery(): UrlFilterQuery {
  return {
    page: 0,
    size: 20,
    sort: 'createdAt',
    direction: 'desc',
  };
}

function parsePage(
  value: string | null,
): number {
  if (
    value === null ||
    !/^\d+$/.test(value)
  ) {
    return 0;
  }

  return Number(value);
}

function parseSize(
  value: string | null,
): number {
  const size =
    value === null
      ? 20
      : Number(value);

  return [10, 20, 50, 100].includes(
    size,
  )
    ? size
    : 20;
}

function parseStatus(
  value: string | null,
): LifecycleStatus | undefined {
  switch (value) {
    case 'ACTIVE':
    case 'DISABLED':
    case 'DELETED':
      return value;

    default:
      return undefined;
  }
}

function parseSort(
  value: string | null,
): UrlSortField {
  switch (value) {
    case 'updatedAt':
    case 'expiresAt':
    case 'shortCode':
    case 'status':
      return value;

    default:
      return 'createdAt';
  }
}

function parseDirection(
  value: string | null,
): SortDirection {
  return value === 'asc'
    ? 'asc'
    : 'desc';
}

function parseExpired(
  value: string | null,
): boolean | undefined {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return undefined;
}

function compactQueryParams(
  query: UrlFilterQuery,
): Readonly<
  Record<
    string,
    string | number | boolean
  >
> {
  const params: Record<
    string,
    string | number | boolean
  > = {
    page: query.page,
    size: query.size,
    sort: query.sort,
    direction: query.direction,
  };

  if (
    query.status !== undefined
  ) {
    params['status'] =
      query.status;
  }

  if (
    query.search !== undefined
  ) {
    params['search'] =
      query.search;
  }

  if (
    query.expired !== undefined
  ) {
    params['expired'] =
      query.expired;
  }

  return params;
}
