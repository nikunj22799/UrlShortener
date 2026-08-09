import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';

import {
  AppNotification,
  NotificationService,
} from '../../core/services/notification.service';

@Component({
  selector: 'app-notification-center',
  imports: [],
  templateUrl: './notification-center.component.html',
  styleUrl: './notification-center.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationCenterComponent {
  private readonly notificationService =
    inject(NotificationService);

  protected readonly notifications =
    this.notificationService.notifications;

  protected dismiss(
    notification: AppNotification,
  ): void {
    this.notificationService.dismiss(
      notification.id,
    );
  }
}