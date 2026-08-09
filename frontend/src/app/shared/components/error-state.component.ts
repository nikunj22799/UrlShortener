import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

import { FrontendApiError } from '../../core/errors/frontend-api-error';

@Component({
  selector: 'app-error-state',
  imports: [],
  templateUrl: './error-state.component.html',
  styleUrl: './error-state.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorStateComponent {
  readonly error = input.required<FrontendApiError>();
  readonly title = input('Something went wrong');
  readonly showRetry = input(true);

  readonly retry = output<void>();
}