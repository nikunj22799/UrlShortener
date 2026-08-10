import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { ApiErrorCode, ApiProblem, FieldError } from '../api/api.models';
import { FrontendApiError } from '../errors/frontend-api-error';

export const apiErrorInterceptor: HttpInterceptorFn = (request, next) =>
  next(request).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }

      const problem = parseProblem(error.error);
      const retryAfterSeconds = parseRetryAfter(error.headers.get('Retry-After'));
      const correlationId =
        problem?.correlationId ?? error.headers.get('X-Correlation-ID');
      const code = problem?.code ?? (error.status === 0 ? 'NETWORK_ERROR' : 'INTERNAL_ERROR');
      const message = problem?.message ?? fallbackMessage(error.status);

      return throwError(
        () =>
          new FrontendApiError(
            error.status,
            code,
            message,
            correlationId,
            problem?.fieldErrors ?? [],
            retryAfterSeconds,
          ),
      );
    }),
  );

function parseProblem(value: unknown): ApiProblem | null {
  if (!isRecord(value)) {
    return null;
  }

  const code = Reflect.get(value, 'code');
  const message = Reflect.get(value, 'message');
  const correlationId = Reflect.get(value, 'correlationId');
  const timestamp = Reflect.get(value, 'timestamp');
  const status = Reflect.get(value, 'status');
  const path = Reflect.get(value, 'path');
  const fieldErrors = parseFieldErrors(Reflect.get(value, 'fieldErrors'));

  if (
    typeof code !== 'string' ||
    !isApiErrorCode(code) ||
    typeof message !== 'string' ||
    (correlationId !== null && typeof correlationId !== 'string') ||
    typeof timestamp !== 'string' ||
    typeof status !== 'number' ||
    typeof path !== 'string' ||
    fieldErrors === null
  ) {
    return null;
  }

  return {
    timestamp,
    status,
    code,
    message,
    path,
    correlationId,
    fieldErrors,
  };
}

function isApiErrorCode(value: string): value is ApiErrorCode {
  switch (value) {
    case 'VALIDATION_ERROR':
    case 'INVALID_URL':
    case 'URL_NOT_FOUND':
    case 'URL_DISABLED':
    case 'URL_EXPIRED':
    case 'URL_DELETED':
    case 'ALIAS_CONFLICT':
    case 'IDEMPOTENCY_CONFLICT':
    case 'OPTIMISTIC_LOCK_CONFLICT':
    case 'PRECONDITION_REQUIRED':
    case 'RATE_LIMIT_EXCEEDED':
    case 'AUTHENTICATION_REQUIRED':
    case 'ACCESS_DENIED':
    case 'INVALID_DATE_RANGE':
    case 'INTERNAL_ERROR':
    case 'SERVICE_UNAVAILABLE':
      return true;
    default:
      return false;
  }
}

function parseFieldErrors(value: unknown): readonly FieldError[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const parsed: FieldError[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      return null;
    }
    const field = Reflect.get(item, 'field');
    const message = Reflect.get(item, 'message');
    if (typeof field !== 'string' || typeof message !== 'string') {
      return null;
    }
    parsed.push({ field, message });
  }
  return parsed;
}

function isRecord(value: unknown): value is object {
  return typeof value === 'object' && value !== null;
}

function parseRetryAfter(value: string | null): number | null {
  if (value === null || !/^\d+$/.test(value)) {
    return null;
  }
  const seconds = Number(value);
  return Number.isSafeInteger(seconds) && seconds > 0 ? seconds : null;
}

function fallbackMessage(status: number): string {
  if (status === 0) {
    return 'The backend could not be reached. Check the connection and try again.';
  }
  if (status === 503) {
    return 'The service is temporarily unavailable. Try again later.';
  }
  return 'The request could not be completed.';
}
