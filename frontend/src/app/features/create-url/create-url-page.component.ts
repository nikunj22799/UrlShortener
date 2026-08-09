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
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  CreateUrlRequest,
  UrlResponse,
} from '../../core/api/api.models';
import { UrlApiService } from '../../core/api/url-api.service';
import {
  FrontendApiError,
  isFrontendApiError,
} from '../../core/errors/frontend-api-error';
import { ClipboardService } from '../../core/services/clipboard.service';
import { NotificationService } from '../../core/services/notification.service';
import { ErrorStateComponent } from '../../shared/components/error-state.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';

type CreateUrlControlName =
  | 'originalUrl'
  | 'customAlias'
  | 'expiresAt';

@Component({
  selector: 'app-create-url-page',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    ErrorStateComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './create-url-page.component.html',
  styleUrl: './create-url-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateUrlPageComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly urlApi = inject(UrlApiService);
  private readonly clipboard = inject(ClipboardService);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  private lastPayloadSignature: string | null = null;
  private idempotencyKey: string | null = null;

  protected readonly form = this.formBuilder.group({
    originalUrl: [
      '',
      [
        Validators.required,
        Validators.minLength(10),
        Validators.maxLength(2048),
        Validators.pattern(/^https?:\/\/\S+$/i),
      ],
    ],
    customAlias: [
      '',
      [
        Validators.minLength(3),
        Validators.maxLength(48),
        Validators.pattern(
          /^[A-Za-z0-9][A-Za-z0-9-]{1,46}[A-Za-z0-9]$/,
        ),
      ],
    ],
    expiresAt: ['', futureDateValidator],
  });

  protected readonly submitting = signal(false);
  protected readonly createdUrl = signal<UrlResponse | null>(null);
  protected readonly replayed = signal(false);
  protected readonly error = signal<FrontendApiError | null>(null);

  protected readonly serverFieldErrors = signal<
    Readonly<Record<string, string>>
  >({});

  protected submit(): void {
    this.form.markAllAsTouched();
    this.form.updateValueAndValidity();

    if (this.form.invalid || this.submitting()) {
      return;
    }

    const request = this.buildRequest();
    const idempotencyKey = this.resolveIdempotencyKey(request);

    this.submitting.set(true);
    this.error.set(null);
    this.serverFieldErrors.set({});

    this.urlApi
      .create(request, idempotencyKey)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.createdUrl.set(result.url);
          this.replayed.set(result.replayed);
          this.submitting.set(false);

          this.notifications.success(
            result.replayed
              ? 'The previous result was safely replayed.'
              : 'Short URL created.',
          );
        },
        error: (error: unknown) => {
          const frontendError = toFrontendError(
            error,
            'The URL could not be created.',
          );

          this.error.set(frontendError);
          this.serverFieldErrors.set(
            createFieldErrorMap(frontendError),
          );
          this.submitting.set(false);
        },
      });
  }

  protected createAnother(): void {
    this.form.reset();

    this.createdUrl.set(null);
    this.replayed.set(false);
    this.error.set(null);
    this.serverFieldErrors.set({});

    this.lastPayloadSignature = null;
    this.idempotencyKey = null;
  }

  protected async copyShortUrl(shortUrl: string): Promise<void> {
    const copied = await this.clipboard.writeText(shortUrl);

    if (copied) {
      this.notifications.success(
        'Short URL copied to the clipboard.',
      );
      return;
    }

    this.notifications.warning(
      'Clipboard access was unavailable. Copy the URL manually.',
    );
  }

  protected showError(
    controlName: CreateUrlControlName,
  ): boolean {
    const control = this.form.controls[controlName];

    return (
      (control.touched && control.invalid) ||
      this.serverFieldErrors()[controlName] !== undefined ||
      (
        controlName === 'customAlias' &&
        this.error()?.code === 'ALIAS_CONFLICT'
      )
    );
  }

  protected originalUrlError(): string {
    const serverMessage =
      this.serverFieldErrors()['originalUrl'];

    if (serverMessage) {
      return serverMessage;
    }

    if (this.form.controls.originalUrl.hasError('required')) {
      return 'Original URL is required.';
    }

    return 'Enter an absolute HTTP or HTTPS URL of 10 to 2,048 characters.';
  }

  protected aliasError(): string {
    const serverMessage =
      this.serverFieldErrors()['customAlias'];

    if (serverMessage) {
      return serverMessage;
    }

    if (this.error()?.code === 'ALIAS_CONFLICT') {
      return 'That alias is already reserved.';
    }

    return 'Alias must be 3 to 48 letters, numbers, or hyphens and start and end with a letter or number.';
  }

  private buildRequest(): CreateUrlRequest {
    const value = this.form.getRawValue();

    return {
      originalUrl: value.originalUrl.trim(),
      ...(value.customAlias.trim()
        ? {
            customAlias: value.customAlias
              .trim()
              .toLowerCase(),
          }
        : {}),
      ...(value.expiresAt
        ? {
            expiresAt: new Date(
              value.expiresAt,
            ).toISOString(),
          }
        : {}),
    };
  }

  private resolveIdempotencyKey(
    request: CreateUrlRequest,
  ): string {
    const signature = JSON.stringify(request);

    if (
      signature !== this.lastPayloadSignature ||
      this.idempotencyKey === null
    ) {
      this.lastPayloadSignature = signature;
      this.idempotencyKey = crypto.randomUUID();
    }

    return this.idempotencyKey;
  }
}

function futureDateValidator(
  control: AbstractControl,
): ValidationErrors | null {
  if (!control.value) {
    return null;
  }

  const timestamp = new Date(control.value).getTime();

  return Number.isFinite(timestamp) &&
    timestamp > Date.now()
    ? null
    : { futureDate: true };
}

function createFieldErrorMap(
  error: FrontendApiError,
): Readonly<Record<string, string>> {
  return Object.fromEntries(
    error.fieldErrors.map((fieldError) => [
      fieldError.field,
      fieldError.message,
    ]),
  );
}

function toFrontendError(
  error: unknown,
  fallbackMessage: string,
): FrontendApiError {
  if (isFrontendApiError(error)) {
    return error;
  }

  return new FrontendApiError(
    0,
    'NETWORK_ERROR',
    fallbackMessage,
    null,
    [],
    null,
  );
}