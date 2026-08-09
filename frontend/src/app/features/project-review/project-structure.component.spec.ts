import {
  ComponentFixture,
  TestBed,
} from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { ProjectStructureComponent } from './project-structure.component';

describe('ProjectStructureComponent', () => {
  let fixture: ComponentFixture<ProjectStructureComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectStructureComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(
      ProjectStructureComponent,
    );

    http = TestBed.inject(
      HttpTestingController,
    );

    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  it('loads and renders the project structure', () => {
    const request = http.expectOne(
      '/assets/engineering/project-structure.json',
    );

    request.flush({
      scope: 'frontend and backend',
      exclusions: ['node_modules'],
      nodes: [
        {
          name: 'frontend',
          type: 'directory',
          children: [
            {
              name: 'src',
              type: 'directory',
              children: [],
            },
          ],
        },
      ],
    });

    fixture.detectChanges();

    expect(pageText(fixture)).toContain('frontend');
    expect(pageText(fixture)).toContain('src');
  });

  it('collapses an expanded directory', () => {
    const request = http.expectOne(
      '/assets/engineering/project-structure.json',
    );

    request.flush({
      nodes: [
        {
          name: 'frontend',
          type: 'directory',
          children: [
            {
              name: 'src',
              type: 'directory',
              children: [],
            },
          ],
        },
      ],
    });

    fixture.detectChanges();

    expect(pageText(fixture)).toContain('src');

    const folderButton =
      (
        fixture.nativeElement as HTMLElement
      ).querySelector<HTMLButtonElement>(
        '.tree-item--directory',
      );

    expect(folderButton).not.toBeNull();

    folderButton?.click();
    fixture.detectChanges();

    expect(pageText(fixture)).not.toContain('src');
  });

  it('shows retry UI when loading fails', () => {
    const request = http.expectOne(
      '/assets/engineering/project-structure.json',
    );

    request.flush(
      {},
      {
        status: 500,
        statusText: 'Server Error',
      },
    );

    fixture.detectChanges();

    expect(pageText(fixture)).toContain(
      'Project structure unavailable',
    );
  });
});

function pageText(
  fixture: ComponentFixture<ProjectStructureComponent>,
): string {
  return (
    (
      fixture.nativeElement as HTMLElement
    ).textContent ?? ''
  );
}