import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

import { LifecycleStatus } from '../../core/api/api.models';

@Component({
  selector: 'app-status-badge',
  templateUrl: './status-badge.component.html',
  styleUrl: './status-badge.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadgeComponent {
  readonly status = input.required<LifecycleStatus>();
  readonly expired = input(false);

  protected readonly label = computed(() => {
    if (this.status() === 'DELETED') {
      return 'Deleted';
    }

    if (this.expired()) {
      return 'Expired';
    }

    return this.status() === 'ACTIVE'
      ? 'Active'
      : 'Disabled';
  });

  protected readonly appearance = computed(() => {
    if (this.status() === 'DELETED') {
      return 'deleted';
    }

    if (this.expired()) {
      return 'expired';
    }

    return this.status() === 'ACTIVE'
      ? 'active'
      : 'disabled';
  });
}