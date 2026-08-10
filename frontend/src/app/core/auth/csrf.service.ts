import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CsrfService {
  private readonly tokenState = signal<string | null>(null);
  private readonly headerNameState = signal('X-CSRF-TOKEN');

  readonly token = this.tokenState.asReadonly();
  readonly headerName = this.headerNameState.asReadonly();

  set(token: string, headerName: string): void {
    this.tokenState.set(token);
    this.headerNameState.set(headerName);
  }

  clear(): void {
    this.tokenState.set(null);
  }
}
