import {
  ComponentFixture,
  TestBed,
} from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { urlFixture } from '../../testing/api-fixtures';
import {
  UrlTableAction,
  UrlTableComponent,
} from './url-table.component';

describe('UrlTableComponent', () => {
  let fixture: ComponentFixture<UrlTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UrlTableComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture =
      TestBed.createComponent(
        UrlTableComponent,
      );
  });

  it('renders supplied URLs', () => {
    fixture.componentRef.setInput(
      'urls',
      [
        urlFixture({
          shortCode: 'first-link',
        }),
        urlFixture({
          id: '22222222-2222-2222-2222-222222222222',
          shortCode: 'second-link',
        }),
      ],
    );

    fixture.detectChanges();

    const text = pageText(fixture);

    expect(text).toContain('first-link');
    expect(text).toContain('second-link');
  });

  it('links each URL to its details page', () => {
    const url = urlFixture();

    fixture.componentRef.setInput(
      'urls',
      [url],
    );

    fixture.detectChanges();

    const links = Array.from(
      (
        fixture.nativeElement as HTMLElement
      ).querySelectorAll<HTMLAnchorElement>(
        'a',
      ),
    );

    expect(
      links.some(
        (link) =>
          link.getAttribute('href') ===
          `/urls/${url.id}`,
      ),
    ).toBeTrue();
  });

  it('links each URL to analytics', () => {
    const url = urlFixture();

    fixture.componentRef.setInput(
      'urls',
      [url],
    );

    fixture.detectChanges();

    const links = Array.from(
      (
        fixture.nativeElement as HTMLElement
      ).querySelectorAll<HTMLAnchorElement>(
        'a',
      ),
    );

    expect(
      links.some(
        (link) =>
          link.getAttribute('href') ===
          `/urls/${url.id}/analytics`,
      ),
    ).toBeTrue();
  });

  it('emits copy action', () => {
    const url = urlFixture();
    const actions: UrlTableAction[] = [];

    fixture.componentRef.setInput(
      'urls',
      [url],
    );

    fixture.componentInstance.actionRequested.subscribe(
      (action) => actions.push(action),
    );

    fixture.detectChanges();

    const copyButton = findButton(
      fixture,
      'Copy short URL',
    );

    copyButton.click();

    expect(actions).toEqual([
      {
        type: 'copy',
        url,
      },
    ]);
  });

  it('offers disable for an active URL', () => {
    const url = urlFixture({
      status: 'ACTIVE',
      expired: false,
    });

    fixture.componentRef.setInput(
      'urls',
      [url],
    );

    fixture.detectChanges();

    openMenu(fixture);

    expect(
      findButtonByText(
        fixture,
        'Disable',
      ),
    ).not.toBeNull();

    expect(
      findButtonByText(
        fixture,
        'Enable',
      ),
    ).toBeNull();
  });

  it('offers enable for a disabled non-expired URL', () => {
    const url = urlFixture({
      status: 'DISABLED',
      expired: false,
    });

    fixture.componentRef.setInput(
      'urls',
      [url],
    );

    fixture.detectChanges();

    openMenu(fixture);

    expect(
      findButtonByText(
        fixture,
        'Enable',
      ),
    ).not.toBeNull();

    expect(
      findButtonByText(
        fixture,
        'Disable',
      ),
    ).toBeNull();
  });

  it('does not offer delete for an already deleted URL', () => {
    fixture.componentRef.setInput(
      'urls',
      [
        urlFixture({
          status: 'DELETED',
        }),
      ],
    );

    fixture.detectChanges();

    openMenu(fixture);

    expect(
      findButtonByText(
        fixture,
        'Delete',
      ),
    ).toBeNull();
  });

  it('disables mutation controls while another URL is busy', () => {
    const url = urlFixture();

    fixture.componentRef.setInput(
      'urls',
      [url],
    );

    fixture.componentRef.setInput(
      'busyId',
      'different-url',
    );

    fixture.detectChanges();

    const moreButton = findButton(
      fixture,
      'More actions',
    );

    expect(moreButton.disabled).toBeTrue();
  });
});

function openMenu(
  fixture: ComponentFixture<UrlTableComponent>,
): void {
  findButton(
    fixture,
    'More actions',
  ).click();

  fixture.detectChanges();
}

function findButton(
  fixture: ComponentFixture<UrlTableComponent>,
  ariaLabel: string,
): HTMLButtonElement {
  const button =
    (
      fixture.nativeElement as HTMLElement
    ).querySelector<HTMLButtonElement>(
      `button[aria-label*="${ariaLabel}"]`,
    );

  if (button === null) {
    throw new Error(
      `Missing button: ${ariaLabel}`,
    );
  }

  return button;
}

function findButtonByText(
  fixture: ComponentFixture<UrlTableComponent>,
  text: string,
): HTMLButtonElement | null {
  return Array.from(
    (
      fixture.nativeElement as HTMLElement
    ).querySelectorAll<HTMLButtonElement>(
      'button',
    ),
  ).find(
    (button) =>
      button.textContent
        ?.trim()
        .includes(text),
  ) ?? null;
}

function pageText(
  fixture: ComponentFixture<UrlTableComponent>,
): string {
  return (
    (
      fixture.nativeElement as HTMLElement
    ).textContent ?? ''
  );
}