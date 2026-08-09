import {
  ComponentFixture,
  TestBed,
} from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { NotFoundPageComponent } from './not-found-page.component';

describe('NotFoundPageComponent', () => {
  let fixture: ComponentFixture<NotFoundPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotFoundPageComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(
      NotFoundPageComponent,
    );

    fixture.detectChanges();
  });

  it('renders the not-found message', () => {
    expect(pageText(fixture)).toContain(
      'Page not found',
    );

    expect(pageText(fixture)).toContain(
      '404',
    );
  });

  it('provides navigation back to the application', () => {
    const links = Array.from(
      (
        fixture.nativeElement as HTMLElement
      ).querySelectorAll<HTMLAnchorElement>(
        'a',
      ),
    );

    expect(
      links.some(
        (link) =>
          link.getAttribute('href') ===
          '/dashboard',
      ),
    ).toBeTrue();

    expect(
      links.some(
        (link) =>
          link.getAttribute('href') ===
          '/urls',
      ),
    ).toBeTrue();
  });
});

function pageText(
  fixture: ComponentFixture<NotFoundPageComponent>,
): string {
  return (
    (
      fixture.nativeElement as HTMLElement
    ).textContent ?? ''
  );
}