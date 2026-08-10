import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { UrlResponse } from '../../core/api/api.models';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { DestinationSummaryPipe } from '../../shared/pipes/destination-summary.pipe';

export type UrlTableActionType =
  | 'copy'
  | 'enable'
  | 'disable'
  | 'delete';

export interface UrlTableAction {
  readonly type: UrlTableActionType;
  readonly url: UrlResponse;
}

@Component({
  selector: 'app-url-table',
  imports: [
    DatePipe,
    RouterLink,
    StatusBadgeComponent,
    DestinationSummaryPipe,
  ],
  templateUrl: './url-table.component.html',
  styleUrl: './url-table.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UrlTableComponent {
  readonly urls = input.required<readonly UrlResponse[]>();
  readonly busyId = input<string | null>(null);

  readonly actionRequested = output<UrlTableAction>();

  protected readonly openMenuId = signal<string | null>(null);

  protected toggleMenu(urlId: string): void {
    this.openMenuId.update((current) =>
      current === urlId
        ? null
        : urlId,
    );
  }

  protected closeMenu(): void {
    this.openMenuId.set(null);
  }

  protected requestAction(
    type: UrlTableActionType,
    url: UrlResponse,
  ): void {
    if (this.busyId() !== null) {
      return;
    }

    this.openMenuId.set(null);
    this.actionRequested.emit({ type, url });
  }

  protected isBusy(url: UrlResponse): boolean {
    return this.busyId() === url.id;
  }

  protected canEnable(url: UrlResponse): boolean {
    return (
      url.status === 'DISABLED' &&
      !url.expired
    );
  }

  protected canDisable(url: UrlResponse): boolean {
     return url.status === 'ACTIVE' && !url.expired;
  }

  protected canDelete(url: UrlResponse): boolean {
    return url.status !== 'DELETED';
  }
}