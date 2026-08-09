import { TestBed } from '@angular/core/testing';

import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificationService);
  });

  it('keeps only the four most recent notifications', () => {
    for (let index = 1; index <= 5; index++) {
      service.success(`Message ${index}`);
    }

    expect(service.notifications().map((item) => item.message)).toEqual([
      'Message 2',
      'Message 3',
      'Message 4',
      'Message 5',
    ]);
  });

  it('dismisses a notification by id', () => {
    service.warning('Clipboard unavailable.');
    const id = service.notifications()[0].id;

    service.dismiss(id);

    expect(service.notifications()).toEqual([]);
  });
});
