import { Injectable, computed, signal } from '@angular/core';

export type NotificationTone = 'success' | 'warning' | 'error';

export interface AppNotification {
  readonly id: number;
  readonly tone: NotificationTone;
  readonly message: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private static readonly MAX_VISIBLE = 4;

  private nextId = 1;
  private readonly entries = signal<readonly AppNotification[]>([]);

  readonly notifications = computed(() => this.entries());

  success(message: string): void {
    this.add('success', message);
  }

  warning(message: string): void {
    this.add('warning', message);
  }

  error(message: string): void {
    this.add('error', message);
  }

  dismiss(id: number): void {
    this.entries.update((entries) => entries.filter((entry) => entry.id !== id));
  }

  private add(tone: NotificationTone, message: string): void {
    const notification: AppNotification = { id: this.nextId++, tone, message };
    this.entries.update((entries) =>
      [...entries, notification].slice(-NotificationService.MAX_VISIBLE),
    );
  }
}
