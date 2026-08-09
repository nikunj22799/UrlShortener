import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'destinationSummary', standalone: true })
export class DestinationSummaryPipe implements PipeTransform {
  transform(value: string): string {
    try {
      const url = new URL(value);
      const display = `${url.hostname}${url.pathname === '/' ? '' : url.pathname}`;
      return display.length > 72 ? `${display.slice(0, 69)}…` : display;
    } catch {
      return 'Stored destination';
    }
  }
}
