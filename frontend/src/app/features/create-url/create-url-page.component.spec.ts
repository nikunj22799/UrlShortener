import {
  ComponentFixture,
  TestBed,
} from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  of,
  Subject,
  throwError,
} from 'rxjs';

import { CreateUrlResult } from '../../core/api/api.models';
import { UrlApiService } from '../../core/api/url-api.service';
import { FrontendApiError } from '../../core/errors/frontend-api-error';
import { ClipboardService } from '../../core/services/clipboard.service';
import { NotificationService } from '../../core/services/notification.service';
import { urlFixture } from '../../testing/api-fixtures';
import { CreateUrlPageComponent } from './create-url-page.component';

describe('CreateUrlPageComponent', () => {
  let fixture: ComponentFixture<CreateUrlPageComponent>;
  let urlApi: jasmine.SpyObj<UrlApiService>;
  let clipboard: jasmine.SpyObj<ClipboardService>;
  let notifications: jasmine.SpyObj<NotificationService>;

  beforeEach(async () => {
    urlApi = jasmine.createSpyObj<UrlApiService>(
      'UrlApiService',
      ['create'],
    );

    clipboard = jasmine.createSpyObj<ClipboardService>(
      'ClipboardService',
      ['writeText'],
    );

    notifications =
      jasmine.createSpyObj<NotificationService>(
        'NotificationService',
        ['success', 'warning'],
      );

    clipboard.writeText.and.resolveTo(true);

    await TestBed.configureTestingModule({
      imports: [CreateUrlPageComponent],
      providers: [
        {
          provide: UrlApiService,
          useValue: urlApi,
        },
        {
          provide: ClipboardService,
          useValue: clipboard,
        },
        {
          provide: NotificationService,
          useValue: notifications,
        },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture =
      TestBed.createComponent(
        CreateUrlPageComponent,
      );

    fixture.detectChanges();
  });

  it('requires an original URL before submission', () => {
    submit(fixture);

    expect(urlApi.create).not.toHaveBeenCalled();
    expect(pageText(fixture)).toContain(
      'Original URL is required.',
    );
  });

  for (const scheme of ['http', 'https']) {
    it(`accepts a valid ${scheme.toUpperCase()} URL`, () => {
      const originalUrl =
        `${scheme}://example.com/resource`;

      urlApi.create.and.returnValue(
        of({
          url: urlFixture({ originalUrl }),
          replayed: false,
        }),
      );

      setInput(
        fixture,
        '#original-url',
        originalUrl,
      );

      submit(fixture);

      expect(urlApi.create).toHaveBeenCalledWith(
        { originalUrl },
        jasmine.stringMatching(
          /^[0-9a-f-]{36}$/,
        ),
      );
    });
  }

  it('rejects a non-HTTP destination before calling the API', () => {
    setInput(
      fixture,
      '#original-url',
      'ftp://example.com/resource',
    );

    submit(fixture);

    expect(urlApi.create).not.toHaveBeenCalled();

    expect(pageText(fixture)).toContain(
      'Enter an absolute HTTP or HTTPS URL',
    );
  });

  it('explains invalid alias syntax', () => {
    setInput(
      fixture,
      '#original-url',
      'https://example.com/resource',
    );

    setInput(
      fixture,
      '#custom-alias',
      'bad alias',
    );

    submit(fixture);

    expect(urlApi.create).not.toHaveBeenCalled();

    expect(pageText(fixture)).toContain(
      'Alias must be 3 to 48 letters',
    );
  });

  it('normalizes a custom alias to lowercase', () => {
    urlApi.create.and.returnValue(
      of({
        url: urlFixture({
          shortCode: 'release-notes',
        }),
        replayed: false,
      }),
    );

    setInput(
      fixture,
      '#original-url',
      'https://example.com/resource',
    );

    setInput(
      fixture,
      '#custom-alias',
      'Release-Notes',
    );

    submit(fixture);

    expect(
      urlApi.create.calls.mostRecent().args[0],
    ).toEqual({
      originalUrl:
        'https://example.com/resource',
      customAlias: 'release-notes',
    });
  });

  it('enforces alias length boundaries', () => {
    setInput(
      fixture,
      '#original-url',
      'https://example.com/resource',
    );

    setInput(
      fixture,
      '#custom-alias',
      'ab',
    );

    submit(fixture);

    expect(urlApi.create).not.toHaveBeenCalled();

    setInput(
      fixture,
      '#custom-alias',
      `a${'b'.repeat(47)}c`,
    );

    submit(fixture);

    expect(urlApi.create).not.toHaveBeenCalled();
  });

  it('rejects an expiration that is not in the future', () => {
    setInput(
      fixture,
      '#original-url',
      'https://example.com/resource',
    );

    setInput(
      fixture,
      '#expiration',
      '2020-01-01T00:00',
    );

    submit(fixture);

    expect(urlApi.create).not.toHaveBeenCalled();

    expect(pageText(fixture)).toContain(
      'Expiration must be a valid future date and time.',
    );
  });

  it('submits a valid request and renders the returned URL', () => {
    const result: CreateUrlResult = {
      url: urlFixture(),
      replayed: false,
    };

    urlApi.create.and.returnValue(of(result));

    setInput(
      fixture,
      '#original-url',
      'https://example.com/resource',
    );

    setInput(
      fixture,
      '#custom-alias',
      'release-notes',
    );

    submit(fixture);
    fixture.detectChanges();

    expect(urlApi.create).toHaveBeenCalledTimes(1);

    expect(
      urlApi.create.calls.mostRecent().args[0],
    ).toEqual({
      originalUrl:
        'https://example.com/resource',
      customAlias: 'release-notes',
    });

    expect(
      urlApi.create.calls.mostRecent().args[1],
    ).toMatch(/^[0-9a-f-]{36}$/);

    expect(pageText(fixture)).toContain(
      'URL created',
    );

    expect(pageText(fixture)).toContain(
      'Ab3xYz901Q',
    );
  });

  it('shows an alias-specific conflict without clearing the form', () => {
    urlApi.create.and.returnValue(
      throwError(
        () =>
          new FrontendApiError(
            409,
            'ALIAS_CONFLICT',
            'The custom alias is already reserved.',
            'correlation-alias',
            [],
            null,
          ),
      ),
    );

    setInput(
      fixture,
      '#original-url',
      'https://example.com/resource',
    );

    setInput(
      fixture,
      '#custom-alias',
      'release-notes',
    );

    submit(fixture);
    fixture.detectChanges();

    expect(pageText(fixture)).toContain(
      'That alias is already reserved.',
    );

    expect(
      inputValue(
        fixture,
        '#original-url',
      ),
    ).toBe(
      'https://example.com/resource',
    );

    expect(pageText(fixture)).toContain(
      'correlation-alias',
    );
  });

  it('renders rate-limit retry timing without retrying automatically', () => {
    urlApi.create.and.returnValue(
      throwError(
        () =>
          new FrontendApiError(
            429,
            'RATE_LIMIT_EXCEEDED',
            'Too many create requests.',
            'rate-correlation',
            [],
            12,
          ),
      ),
    );

    setInput(
      fixture,
      '#original-url',
      'https://example.com/resource',
    );

    submit(fixture);
    fixture.detectChanges();

    expect(urlApi.create).toHaveBeenCalledTimes(1);

    expect(pageText(fixture)).toContain(
      'RATE_LIMIT_EXCEEDED',
    );

    expect(pageText(fixture)).toContain(
      'approximately 12 seconds',
    );
  });

  it('maps backend field validation to the original URL field', () => {
    urlApi.create.and.returnValue(
      throwError(
        () =>
          new FrontendApiError(
            400,
            'INVALID_URL',
            'The destination URL is invalid.',
            'validation-correlation',
            [
              {
                field: 'originalUrl',
                message: 'host is not allowed',
              },
            ],
            null,
          ),
      ),
    );

    setInput(
      fixture,
      '#original-url',
      'https://example.com/resource',
    );

    submit(fixture);
    fixture.detectChanges();

    expect(pageText(fixture)).toContain(
      'host is not allowed',
    );
  });

  it('shows a safe network failure and preserves the form', () => {
    urlApi.create.and.returnValue(
      throwError(
        () => new Error('socket detail'),
      ),
    );

    setInput(
      fixture,
      '#original-url',
      'https://example.com/resource',
    );

    submit(fixture);
    fixture.detectChanges();

    expect(pageText(fixture)).toContain(
      'NETWORK_ERROR',
    );

    expect(pageText(fixture)).toContain(
      'The URL could not be created.',
    );

    expect(pageText(fixture)).not.toContain(
      'socket detail',
    );

    expect(
      inputValue(
        fixture,
        '#original-url',
      ),
    ).toBe(
      'https://example.com/resource',
    );
  });

  it('reuses the idempotency key when the same request is retried', () => {
    urlApi.create.and.returnValues(
      throwError(
        () =>
          new FrontendApiError(
            503,
            'SERVICE_UNAVAILABLE',
            'Try later.',
            null,
            [],
            null,
          ),
      ),
      of({
        url: urlFixture(),
        replayed: true,
      }),
    );

    setInput(
      fixture,
      '#original-url',
      'https://example.com/resource',
    );

    submit(fixture);
    submit(fixture);

    const keys = urlApi.create.calls
      .allArgs()
      .map((arguments_) => arguments_[1]);

    expect(keys.length).toBe(2);
    expect(keys[0]).toBe(keys[1]);
  });

  it('creates a new idempotency key after Create another', () => {
    urlApi.create.and.returnValues(
      of({
        url: urlFixture(),
        replayed: false,
      }),
      of({
        url: urlFixture({
          shortCode: 'SecondCode1',
        }),
        replayed: false,
      }),
    );

    setInput(
      fixture,
      '#original-url',
      'https://example.com/first',
    );

    submit(fixture);

    clickButton(
      fixture,
      'Create another',
    );

    setInput(
      fixture,
      '#original-url',
      'https://example.com/second',
    );

    submit(fixture);

    const keys = urlApi.create.calls
      .allArgs()
      .map((arguments_) => arguments_[1]);

    expect(keys[0]).not.toBe(keys[1]);
  });

  it('copies the short URL through ClipboardService', async () => {
    urlApi.create.and.returnValue(
      of({
        url: urlFixture(),
        replayed: false,
      }),
    );

    setInput(
      fixture,
      '#original-url',
      'https://example.com/resource',
    );

    submit(fixture);

    clickButton(fixture, 'Copy');

    await fixture.whenStable();

    expect(
      clipboard.writeText,
    ).toHaveBeenCalledWith(
      urlFixture().shortUrl,
    );
  });

  it('exposes the returned URL details route', () => {
    urlApi.create.and.returnValue(
      of({
        url: urlFixture(),
        replayed: false,
      }),
    );

    setInput(
      fixture,
      '#original-url',
      'https://example.com/resource',
    );

    submit(fixture);
    fixture.detectChanges();

    const detailsLink = Array.from(
      (
        fixture.nativeElement as HTMLElement
      ).querySelectorAll<HTMLAnchorElement>(
        'a',
      ),
    ).find(
      (link) =>
        link.textContent
          ?.trim()
          .includes('View details'),
    );

    expect(
      detailsLink?.getAttribute('href'),
    ).toBe(
      `/urls/${urlFixture().id}`,
    );
  });

  it('prevents duplicate submission while a request is active', () => {
    const response =
      new Subject<CreateUrlResult>();

    urlApi.create.and.returnValue(response);

    setInput(
      fixture,
      '#original-url',
      'https://example.com/resource',
    );

    submit(fixture);
    fixture.detectChanges();

    submit(fixture);

    expect(urlApi.create).toHaveBeenCalledTimes(1);

    expect(
      (
        fixture.nativeElement as HTMLElement
      ).querySelector<HTMLButtonElement>(
        'button[type="submit"]',
      )?.disabled,
    ).toBeTrue();

    response.next({
      url: urlFixture(),
      replayed: false,
    });
  });
});

function setInput(
  fixture: ComponentFixture<CreateUrlPageComponent>,
  selector: string,
  value: string,
): void {
  const input =
    fixture.nativeElement.querySelector(
      selector,
    ) as HTMLInputElement | null;

  if (input === null) {
    throw new Error(
      `Missing input ${selector}`,
    );
  }

  input.value = value;
  input.dispatchEvent(
    new Event('input'),
  );

  fixture.detectChanges();
}

function inputValue(
  fixture: ComponentFixture<CreateUrlPageComponent>,
  selector: string,
): string {
  const input =
    fixture.nativeElement.querySelector(
      selector,
    ) as HTMLInputElement | null;

  if (input === null) {
    throw new Error(
      `Missing input ${selector}`,
    );
  }

  return input.value;
}

function submit(
  fixture: ComponentFixture<CreateUrlPageComponent>,
): void {
  const form =
    (
      fixture.nativeElement as HTMLElement
    ).querySelector<HTMLFormElement>(
      'form',
    );

  if (form === null) {
    throw new Error(
      'Missing create form',
    );
  }

  form.dispatchEvent(
    new Event('submit'),
  );

  fixture.detectChanges();
}

function clickButton(
  fixture: ComponentFixture<CreateUrlPageComponent>,
  label: string,
): void {
  const buttons = Array.from(
    (
      fixture.nativeElement as HTMLElement
    ).querySelectorAll<HTMLButtonElement>(
      'button',
    ),
  );

  const button = buttons.find(
    (candidate) =>
      candidate.textContent
        ?.trim()
        .includes(label),
  );

  if (!button) {
    throw new Error(
      `Missing button ${label}`,
    );
  }

  button.click();
  fixture.detectChanges();
}

function pageText(
  fixture: ComponentFixture<CreateUrlPageComponent>,
): string {
  return (
    (
      fixture.nativeElement as HTMLElement
    ).textContent ?? ''
  );
}