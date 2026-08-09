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
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
} from '@angular/forms';
import {
  ActivatedRoute,
  Router,
  RouterLink,
} from '@angular/router';
import { map, switchMap } from 'rxjs';

import { UrlResponse } from '../../core/api/api.models';
import { UrlApiService } from '../../core/api/url-api.service';
import {
  FrontendApiError,
  toFrontendApiError,
} from '../../core/errors/frontend-api-error';
import { ClipboardService } from '../../core/services/clipboard.service';
import { NotificationService } from '../../core/services/notification.service';
import { isUuid } from '../../core/utils/uuid';
import { ConfirmationDialogComponent } from '../../shared/components/confirmation-dialog.component';
import { ErrorStateComponent } from '../../shared/components/error-state.component';
import { LoadingIndicatorComponent } from '../../shared/components/loading-indicator.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';

type DetailConfirmation = 'disable' | 'delete';

@Component({
  selector: 'app-url-details-page',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    ConfirmationDialogComponent,
    ErrorStateComponent,
    LoadingIndicatorComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './url-details-page.component.html',
  styleUrl: './url-details-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UrlDetailsPageComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly urlApi = inject(UrlApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly clipboard = inject(ClipboardService);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly expirationForm = this.formBuilder.group({
    expiresAt: ['', [futureDateValidator]],
  });

  protected readonly loading = signal(true);
  protected readonly url = signal<UrlResponse | null>(null);
  protected readonly loadError = signal<FrontendApiError | null>(null);
  protected readonly mutationError = signal<FrontendApiError | null>(null);
  protected readonly mutationBusy = signal(false);
  protected readonly confirmation = signal<DetailConfirmation | null>(null);

  constructor() {
    this.route.paramMap
      .pipe(
        map((parameters) => parameters.get('id')),
        switchMap((id) => {
          if (!isUuid(id)) {
            throw invalidUrlIdError();
          }

          this.startLoading();

          return this.urlApi.get(id);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (url) => {
          this.applyLoadedUrl(url);
        },
        error: (error: unknown) => {
          this.handleLoadError(error);
        },
      });
  }

  protected reload(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (!isUuid(id)) {
      this.loadError.set(invalidUrlIdError());
      return;
    }

    this.startLoading();
    this.mutationError.set(null);

    this.urlApi
      .get(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (url) => {
          this.applyLoadedUrl(url);
        },
        error: (error: unknown) => {
          this.handleLoadError(error);
        },
      });
  }

  protected saveExpiration(): void {
    const currentUrl = this.url();

    this.expirationForm.markAllAsTouched();
    this.expirationForm.updateValueAndValidity();

    if (
      currentUrl === null ||
      this.expirationForm.invalid ||
      this.mutationBusy()
    ) {
      return;
    }

    const expirationValue =
      this.expirationForm.controls.expiresAt.value;

    this.runMutation(
      this.urlApi.updateExpiration(
        currentUrl.id,
        {
          expiresAt: expirationValue
            ? new Date(expirationValue).toISOString()
            : null,
        },
        currentUrl.version,
      ),
      'Expiration updated.',
    );
  }

  protected enable(): void {
    const currentUrl = this.url();

    if (
      currentUrl === null ||
      this.mutationBusy()
    ) {
      return;
    }

    this.runMutation(
      this.urlApi.enable(
        currentUrl.id,
        currentUrl.version,
      ),
      'URL enabled.',
    );
  }

  protected requestConfirmation(
    action: DetailConfirmation,
  ): void {
    if (!this.mutationBusy()) {
      this.mutationError.set(null);
      this.confirmation.set(action);
    }
  }

  protected confirmMutation(
    action: DetailConfirmation,
  ): void {
    const currentUrl = this.url();

    if (
      currentUrl === null ||
      this.mutationBusy()
    ) {
      return;
    }

    if (action === 'disable') {
      this.runMutation(
        this.urlApi.disable(
          currentUrl.id,
          currentUrl.version,
        ),
        'URL disabled.',
      );
      return;
    }

    this.deleteUrl(currentUrl);
  }

  protected cancelConfirmation(): void {
    if (!this.mutationBusy()) {
      this.confirmation.set(null);
    }
  }

  protected resetExpirationForm(
    url: UrlResponse,
  ): void {
    this.expirationForm.reset({
      expiresAt: toLocalDateTime(url.expiresAt),
    });
  }

  protected expirationChanged(
    url: UrlResponse,
  ): boolean {
    return (
      this.expirationForm.controls.expiresAt.value !==
      toLocalDateTime(url.expiresAt)
    );
  }

  protected confirmationMessage(
    action: DetailConfirmation,
    url: UrlResponse,
  ): string {
    if (action === 'delete') {
      return `Soft-delete ${url.shortCode}? The short code remains reserved and the URL will stop redirecting.`;
    }

    return `Disable ${url.shortCode}? Visitors will stop being redirected until the URL is enabled again.`;
  }

  protected async copyShortUrl(
    url: UrlResponse,
  ): Promise<void> {
    const copied = await this.clipboard.writeText(
      url.shortUrl,
    );

    if (copied) {
      this.notifications.success(
        'Short URL copied to the clipboard.',
      );
      return;
    }

    this.notifications.warning(
      'Clipboard access was unavailable.',
    );
  }

  private deleteUrl(url: UrlResponse): void {
    this.mutationBusy.set(true);
    this.mutationError.set(null);

    this.urlApi
      .delete(url.id, url.version)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notifications.success(
            `URL ${url.shortCode} deleted.`,
          );

          this.confirmation.set(null);
          this.mutationBusy.set(false);

          void this.router.navigate(['/urls']);
        },
        error: (error: unknown) => {
          this.handleMutationError(error);
        },
      });
  }

  private runMutation(
    request: ReturnType<UrlApiService['enable']>,
    successMessage: string,
  ): void {
    this.mutationBusy.set(true);
    this.mutationError.set(null);

    request
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (url) => {
          this.applyLoadedUrl(url);
          this.confirmation.set(null);
          this.mutationBusy.set(false);

          this.notifications.success(
            successMessage,
          );
        },
        error: (error: unknown) => {
          this.handleMutationError(error);
        },
      });
  }

  private startLoading(): void {
    this.loading.set(true);
    this.loadError.set(null);
  }

  private applyLoadedUrl(url: UrlResponse): void {
    this.url.set(url);
    this.resetExpirationForm(url);

    this.loadError.set(null);
    this.loading.set(false);
  }

  private handleLoadError(error: unknown): void {
    this.loadError.set(
      toFrontendApiError(
        error,
        'The URL could not be loaded.',
      ),
    );

    this.loading.set(false);
  }

  private handleMutationError(error: unknown): void {
    this.mutationError.set(
      toFrontendApiError(
        error,
        'The URL could not be changed.',
      ),
    );

    this.confirmation.set(null);
    this.mutationBusy.set(false);
  }
}

function futureDateValidator(
  control: AbstractControl<string>,
): ValidationErrors | null {
  if (!control.value) {
    return null;
  }

  const timestamp = new Date(
    control.value,
  ).getTime();

  return Number.isFinite(timestamp) &&
    timestamp > Date.now()
    ? null
    : { futureDate: true };
}

function toLocalDateTime(
  value: string | null,
): string {
  if (value === null) {
    return '';
  }

  const date = new Date(value);
  const timezoneOffset =
    date.getTimezoneOffset() * 60_000;

  return new Date(
    date.getTime() - timezoneOffset,
  )
    .toISOString()
    .slice(0, 16);
}


function invalidUrlIdError(): FrontendApiError {
  return new FrontendApiError(
    400,
    'VALIDATION_ERROR',
    'The URL identifier is malformed.',
    null,
    [],
    null,
  );
}
