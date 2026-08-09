import {
  ApiErrorCode,
  FieldError,
} from '../api/api.models';

export type FrontendErrorCode =
  | ApiErrorCode
  | 'NETWORK_ERROR';

export class FrontendApiError
  extends Error {

  override readonly name =
    'FrontendApiError';

  constructor(
    readonly status: number,
    readonly code: FrontendErrorCode,
    message: string,
    readonly correlationId: string | null,
    readonly fieldErrors: readonly FieldError[],
    readonly retryAfterSeconds: number | null,
  ) {
    super(message);
  }
}

export function isFrontendApiError(
  error: unknown,
): error is FrontendApiError {
  return error instanceof FrontendApiError;
}
export function toFrontendApiError(
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
