import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { map, Observable, of, switchMap, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CsrfService } from './csrf.service';

interface AuthSessionResponse {
  readonly authenticated: boolean;
  readonly username: string | null;
}

interface CsrfTokenResponse {
  readonly token: string;
  readonly headerName: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly csrf = inject(CsrfService);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/auth`;
  private readonly authenticatedState = signal(false);

  readonly authenticated = this.authenticatedState.asReadonly();

  checkSession(): Observable<boolean> {
    return this.http
      .get<AuthSessionResponse>(`${this.baseUrl}/session`)
      .pipe(
        switchMap((session) => {
          this.authenticatedState.set(session.authenticated);
          if (!session.authenticated) {
            this.csrf.clear();
            return of(false);
          }
          return this.loadCsrfToken().pipe(map(() => true));
        }),
      );
  }

  login(username: string, password: string): Observable<boolean> {
    return this.loadCsrfToken().pipe(
      switchMap(() =>
        this.http.post<AuthSessionResponse>(`${this.baseUrl}/login`, {
          username,
          password,
        }),
      ),
      tap((session) => this.authenticatedState.set(session.authenticated)),
      map((session) => session.authenticated),
    );
  }

  logout(): Observable<void> {
    return this.loadCsrfToken().pipe(
      switchMap(() => this.http.post<void>(`${this.baseUrl}/logout`, null)),
      tap(() => {
        this.authenticatedState.set(false);
        this.csrf.clear();
      }),
    );
  }

  private loadCsrfToken(): Observable<void> {
    return this.http
      .get<CsrfTokenResponse>(`${this.baseUrl}/csrf`)
      .pipe(
        tap((response) => this.csrf.set(response.token, response.headerName)),
        map(() => undefined),
      );
  }
}
