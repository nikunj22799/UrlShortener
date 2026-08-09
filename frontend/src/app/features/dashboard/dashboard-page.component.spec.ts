import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { UrlApiService } from '../../core/api/url-api.service';
import { FrontendApiError } from '../../core/errors/frontend-api-error';
import { pageFixture, urlFixture } from '../../testing/api-fixtures';
import { DashboardPageComponent } from './dashboard-page.component';

describe('DashboardPageComponent', () => {
  let api: jasmine.SpyObj<UrlApiService>;

  beforeEach(async () => {
    api = jasmine.createSpyObj<UrlApiService>('UrlApiService', ['list']);
    await TestBed.configureTestingModule({
      imports: [DashboardPageComponent],
      providers: [{ provide: UrlApiService, useValue: api }, provideRouter([])],
    }).compileComponents();
  });

  it('keeps loading distinct from successful empty data', () => {
    api.list.and.returnValue(new Subject());
    const fixture = create();
    expect(text(fixture)).toContain('Loading dashboard');
    expect(text(fixture)).not.toContain('No URLs yet');
  });

  it('renders bounded counts and recent records from four server queries', () => {
    api.list.and.callFake((query) => {
      if (query?.status === 'ACTIVE') return of({ ...pageFixture(), totalElements: 7 });
      if (query?.status === 'DISABLED') return of({ ...pageFixture(), totalElements: 2 });
      if (query?.expired === true) return of({ ...pageFixture(), totalElements: 1 });
      return of({ ...pageFixture([urlFixture({ shortCode: 'RecentCode1' })]), totalElements: 9 });
    });
    const fixture = create();

    expect(api.list).toHaveBeenCalledTimes(4);
    expect(api.list).toHaveBeenCalledWith({ page: 0, size: 5, sort: 'createdAt', direction: 'desc' });
    expect(text(fixture)).toContain('RecentCode1');
    expect(metricValues(fixture)).toEqual(['9', '7', '2', '1']);
  });

  it('renders a successful empty state with zero metrics', () => {
    api.list.and.returnValue(of(pageFixture([])));
    const fixture = create();
    expect(text(fixture)).toContain('No URLs yet');
    expect(metricValues(fixture)).toEqual(['0', '0', '0', '0']);
  });

  it('renders a supportable error and retries all bounded queries', () => {
    api.list.and.returnValue(
      throwError(
        () => new FrontendApiError(503, 'SERVICE_UNAVAILABLE', 'Dashboard unavailable.', 'dashboard-correlation', [], null),
      ),
    );
    const fixture = create();
    expect(text(fixture)).toContain('dashboard-correlation');
    api.list.and.returnValue(of(pageFixture([])));
    findButton(fixture, 'Try again').click();
    fixture.detectChanges();
    expect(api.list).toHaveBeenCalledTimes(8);
    expect(text(fixture)).toContain('No URLs yet');
  });
});

function create(): ComponentFixture<DashboardPageComponent> {
  const fixture = TestBed.createComponent(DashboardPageComponent);
  fixture.detectChanges();
  return fixture;
}

function text(fixture: ComponentFixture<DashboardPageComponent>): string {
  return (fixture.nativeElement as HTMLElement).textContent ?? '';
}

function metricValues(fixture: ComponentFixture<DashboardPageComponent>): readonly string[] {
  return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.metric-value'))
    .map((element) => element.textContent?.trim() ?? '');
}

function findButton(fixture: ComponentFixture<DashboardPageComponent>, label: string): HTMLButtonElement {
  const button = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'))
    .find((candidate) => candidate.textContent?.trim() === label);
  if (button === undefined) throw new Error(`Missing button ${label}`);
  return button;
}
