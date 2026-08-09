import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { marked } from 'marked';

@Component({
  selector: 'app-readme-viewer',
  imports: [],
  templateUrl: './readme-viewer.component.html',
  styleUrl: './readme-viewer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReadmeViewerComponent {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly loadFailed = signal(false);
  protected readonly renderedReadme = signal('');

  constructor() {
    this.loadReadme();
  }

  protected loadReadme(): void {
    this.loading.set(true);
    this.loadFailed.set(false);

    this.http
      .get('/README.md', {
        responseType: 'text',
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (markdown) => {
          this.renderedReadme.set(
            marked.parse(markdown, {
              gfm: true,
              breaks: false,
            }) as string,
          );

          this.loading.set(false);
        },
        error: () => {
          this.renderedReadme.set('');
          this.loadFailed.set(true);
          this.loading.set(false);
        },
      });
  }
}