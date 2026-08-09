import {
  ChangeDetectionStrategy,
  Component,
  input,
} from '@angular/core';

import { NamedCount } from '../../core/api/api.models';

@Component({
  selector: 'app-analytics-count-table',
  standalone: true,
  templateUrl: './analytics-count-table.component.html',
  styleUrl: './analytics-count-table.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsCountTableComponent {
  readonly title = input.required<string>();
  readonly description = input<string>('');
  readonly rows = input.required<readonly NamedCount[]>();

  protected percentage(
    count: number,
    rows: readonly NamedCount[],
  ): number {
    const maximum = Math.max(
      ...rows.map((row) => row.clicks),
    );

    if (maximum <= 0) {
      return 0;
    }

    return (count / maximum) * 100;
  }
}