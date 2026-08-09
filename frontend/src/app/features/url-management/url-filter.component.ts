import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output,
} from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
} from '@angular/forms';

import {
  LifecycleStatus,
  SortDirection,
  UrlSortField,
} from '../../core/api/api.models';

export interface UrlFilterQuery {
  readonly page: number;
  readonly size: number;
  readonly status?: LifecycleStatus;
  readonly search?: string;
  readonly sort: UrlSortField;
  readonly direction: SortDirection;
  readonly expired?: boolean;
}

export interface UrlFilterValue {
  readonly search: string;
  readonly status: string;
  readonly expired: string;
  readonly sort: string;
  readonly direction: string;
  readonly size: string;
}

@Component({
  selector: 'app-url-filter',
  imports: [
    ReactiveFormsModule,
  ],
  templateUrl: './url-filter.component.html',
  styleUrl: './url-filter.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UrlFilterComponent {
  readonly query = input.required<UrlFilterQuery>();

  readonly filtersApplied = output<UrlFilterValue>();
  readonly filtersReset = output<void>();

  protected readonly form;

  constructor(
    formBuilder: NonNullableFormBuilder,
  ) {
    this.form = formBuilder.group({
      search: '',
      status: '',
      expired: '',
      sort: 'createdAt',
      direction: 'desc',
      size: '20',
    });

    effect(() => {
      const query = this.query();

      this.form.patchValue(
        {
          search: query.search ?? '',
          status: query.status ?? '',
          expired:
            query.expired === undefined
              ? ''
              : String(query.expired),
          sort: query.sort,
          direction: query.direction,
          size: String(query.size),
        },
        {
          emitEvent: false,
        },
      );
    });
  }

  protected apply(): void {
    this.filtersApplied.emit(
      this.form.getRawValue(),
    );
  }

  protected reset(): void {
    this.form.reset({
      search: '',
      status: '',
      expired: '',
      sort: 'createdAt',
      direction: 'desc',
      size: '20',
    });

    this.filtersReset.emit();
  }

  protected clearSearch(): void {
    this.form.controls.search.setValue('');
  }
}