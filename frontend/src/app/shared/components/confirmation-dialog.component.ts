import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  input,
  output,
} from '@angular/core';

@Component({
  selector: 'app-confirmation-dialog',
  imports: [],
  templateUrl: './confirmation-dialog.component.html',
  styleUrl: './confirmation-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmationDialogComponent
  implements AfterViewInit, OnDestroy
{
  readonly dialogId = input.required<string>();
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input('Confirm');
  readonly cancelLabel = input('Cancel');
  readonly destructive = input(false);
  readonly busy = input(false);

  readonly accepted = output<void>();
  readonly dismissed = output<void>();

  @ViewChild('dialog')
  private dialog?: ElementRef<HTMLElement>;

  private readonly previouslyFocused =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

  ngAfterViewInit(): void {
    this.dialog?.nativeElement.focus();
  }

  ngOnDestroy(): void {
    this.previouslyFocused?.focus();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.dismiss();
  }

  protected confirm(): void {
    if (!this.busy()) {
      this.accepted.emit();
    }
  }

  protected dismiss(): void {
    if (!this.busy()) {
      this.dismissed.emit();
    }
  }
}
