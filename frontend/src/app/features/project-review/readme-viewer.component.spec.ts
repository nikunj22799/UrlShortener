import {
  ComponentFixture,
  TestBed,
} from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { ReadmeViewerComponent } from './readme-viewer.component';

describe('ReadmeViewerComponent', () => {
  let fixture: ComponentFixture<ReadmeViewerComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReadmeViewerComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(
      ReadmeViewerComponent,
    );

    http = TestBed.inject(
      HttpTestingController,
    );

    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  it('loads and renders the README', () => {
    const request = http.expectOne(
      '/README.md',
    );

    request.flush(`
# URL Shortener

A **Spring Boot** and Angular project.

## Features

- Short URLs
- Analytics
`);

    fixture.detectChanges();

    const element =
      fixture.nativeElement as HTMLElement;

    expect(
      element.querySelector('h1')?.textContent,
    ).toContain('URL Shortener');

    expect(
      element.querySelector('strong')?.textContent,
    ).toContain('Spring Boot');

    expect(pageText(fixture)).toContain(
      'Analytics',
    );
  });

  it('shows retry UI when README loading fails', () => {
    const request = http.expectOne(
      '/README.md',
    );

    request.flush(
      {},
      {
        status: 404,
        statusText: 'Not Found',
      },
    );

    fixture.detectChanges();

    expect(pageText(fixture)).toContain(
      'README unavailable',
    );
  });

  it('does not render unsafe script content', () => {
    const request = http.expectOne(
      '/README.md',
    );

    request.flush(`
# README

<script>alert('unsafe')</script>

Safe content.
`);

    fixture.detectChanges();

    const element =
      fixture.nativeElement as HTMLElement;

    expect(
      element.querySelector('script'),
    ).toBeNull();

    expect(pageText(fixture)).toContain(
      'Safe content',
    );
  });
});

function pageText(
  fixture: ComponentFixture<ReadmeViewerComponent>,
): string {
  return (
    (
      fixture.nativeElement as HTMLElement
    ).textContent ?? ''
  );
}