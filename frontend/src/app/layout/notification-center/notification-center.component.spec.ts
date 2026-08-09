import {
  ComponentFixture,
  TestBed,
} from '@angular/core/testing';
import { signal } from '@angular/core';

import {
  AppNotification,
  NotificationService,
} from '../../core/services/notification.service';
import { NotificationCenterComponent } from './notification-center.component';

describe('NotificationCenterComponent', () => {
  let fixture:
    ComponentFixture<NotificationCenterComponent>;

  let notificationService:
    jasmine.SpyObj<NotificationService>;

  const notification: AppNotification = {
    id: 1,
    tone: 'success',
    message: 'URL created.',
  };

  beforeEach(async () => {
    notificationService =
      jasmine.createSpyObj<NotificationService>(
        'NotificationService',
        ['dismiss'],
        {
          notifications: signal([
            notification,
          ]).asReadonly(),
        },
      );

    await TestBed.configureTestingModule({
      imports: [
        NotificationCenterComponent,
      ],
      providers: [
        {
          provide: NotificationService,
          useValue: notificationService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(
      NotificationCenterComponent,
    );

    fixture.detectChanges();
  });

  it('renders notifications', () => {
    expect(
      pageText(fixture),
    ).toContain(
      'URL created.',
    );
  });

  it('dismisses a notification', () => {
    const button =
      (
        fixture.nativeElement as HTMLElement
      ).querySelector<HTMLButtonElement>(
        '.notification__close',
      );

    expect(button).not.toBeNull();

    button?.click();

    expect(
      notificationService.dismiss,
    ).toHaveBeenCalledWith(1);
  });
});

function pageText(
  fixture:
    ComponentFixture<NotificationCenterComponent>,
): string {
  return (
    (
      fixture.nativeElement as HTMLElement
    ).textContent ?? ''
  );
}