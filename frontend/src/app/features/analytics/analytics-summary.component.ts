import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
} from '@angular/core';

import { AnalyticsSummary } from '../../core/api/api.models';

@Component({
  selector: 'app-analytics-summary',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './analytics-summary.component.html',
  styleUrl: './analytics-summary.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsSummaryComponent {
  readonly summary =
    input.required<AnalyticsSummary>();
}