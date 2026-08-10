import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import { CsrfService } from './csrf.service';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(environment.apiBaseUrl)) {
    return next(request);
  }

  const csrf = inject(CsrfService);
  const token = csrf.token();
  let securedRequest = request.clone({
    withCredentials: true,
  });

  if (!SAFE_METHODS.has(request.method) && token !== null) {
    securedRequest = securedRequest.clone({
      setHeaders: {
        [csrf.headerName()]: token,
      },
    });
  }

  return next(securedRequest);
};
