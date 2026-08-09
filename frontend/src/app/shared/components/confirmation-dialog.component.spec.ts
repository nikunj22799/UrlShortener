import {
  ComponentFixture,
  TestBed,
} from '@angular/core/testing';

import { ConfirmationDialogComponent } from './confirmation-dialog.component';

describe('ConfirmationDialogComponent', () => {
  let fixture: ComponentFixture<ConfirmationDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmationDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(
      ConfirmationDialogComponent,
    );

    fixture.componentRef.setInput(
      'dialogId',
      'test-dialog',
    );

    fixture.componentRef.setInput(
      'title',
      'Delete URL?',
    );

    fixture.componentRef.setInput(
      'message',
      'This action will soft-delete the URL.',
    );

    fixture.detectChanges();
  });

  it('renders title and message', () => {
    const text = pageText(fixture);

    expect(text).toContain(
      'Delete URL?',
    );

    expect(text).toContain(
      'This action will soft-delete the URL.',
    );
  });

  it('emits accepted when confirmed', () => {
    let accepted = false;

    fixture.componentInstance.accepted.subscribe(
      () => {
        accepted = true;
      },
    );

    findButton(
      fixture,
      'Confirm',
    ).click();

    expect(accepted).toBeTrue();
  });

  it('emits dismissed when cancelled', () => {
    let dismissed = false;

    fixture.componentInstance.dismissed.subscribe(
      () => {
        dismissed = true;
      },
    );

    findButton(
      fixture,
      'Cancel',
    ).click();

    expect(dismissed).toBeTrue();
  });

  it('dismisses when Escape is pressed', () => {
    let dismissed = false;

    fixture.componentInstance.dismissed.subscribe(
      () => {
        dismissed = true;
      },
    );

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape' }),
    );

    expect(dismissed).toBeTrue();
  });

  it('focuses the dialog when opened', () => {
    const dialog = (
      fixture.nativeElement as HTMLElement
    ).querySelector<HTMLElement>('[role="dialog"]');

    expect(document.activeElement).toBe(dialog);
  });

  it('blocks actions while busy', () => {
    fixture.componentRef.setInput(
      'busy',
      true,
    );

    fixture.detectChanges();

    const buttons = Array.from(
      (
        fixture.nativeElement as HTMLElement
      ).querySelectorAll<HTMLButtonElement>(
        'button',
      ),
    );

    expect(
      buttons.every((button) => button.disabled),
    ).toBeTrue();

    expect(pageText(fixture)).toContain(
      'Processing...',
    );
  });
});

function findButton(
  fixture: ComponentFixture<ConfirmationDialogComponent>,
  label: string,
): HTMLButtonElement {
  const button = Array.from(
    (
      fixture.nativeElement as HTMLElement
    ).querySelectorAll<HTMLButtonElement>(
      'button',
    ),
  ).find(
    (candidate) =>
      candidate.textContent
        ?.trim()
        .includes(label),
  );

  if (!button) {
    throw new Error(
      `Missing button: ${label}`,
    );
  }

  return button;
}

function pageText(
  fixture: ComponentFixture<ConfirmationDialogComponent>,
): string {
  return (
    (
      fixture.nativeElement as HTMLElement
    ).textContent ?? ''
  );
}