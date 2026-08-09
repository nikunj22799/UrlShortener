import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, Subject, throwError } from 'rxjs';
import { UrlApiService } from '../../core/api/url-api.service';
import { FrontendApiError } from '../../core/errors/frontend-api-error';
import { ClipboardService } from '../../core/services/clipboard.service';
import { pageFixture, urlFixture } from '../../testing/api-fixtures';
import { UrlManagementPageComponent } from './url-management-page.component';

describe('UrlManagementPageComponent', () => {
  let api: jasmine.SpyObj<UrlApiService>;
  let clipboard: jasmine.SpyObj<ClipboardService>;

  beforeEach(async () => {
    api = jasmine.createSpyObj<UrlApiService>('UrlApiService', [
      'list', 'enable', 'disable', 'delete',
    ]);
    clipboard = jasmine.createSpyObj<ClipboardService>('ClipboardService', ['writeText']);
    clipboard.writeText.and.resolveTo(true);
    await TestBed.configureTestingModule({
      imports: [UrlManagementPageComponent],
      providers: [
        { provide: UrlApiService, useValue: api },
        { provide: ClipboardService, useValue: clipboard },
        provideRouter([{ path: 'urls', component: UrlManagementPageComponent }]),
      ],
    }).compileComponents();
  });

  it('loads and renders a server-provided page', () => {
    const fixture = render();
    expect(api.list).toHaveBeenCalledWith(jasmine.objectContaining({ page: 0, size: 20 }));
    expect(text(fixture)).toContain('Ab3xYz901Q');
    expect(text(fixture)).toContain('example.com/resource/path');
    expect(text(fixture)).not.toContain('token=not-shown');
  });

  it('exposes view, analytics, and expiration-edit navigation for a result', () => {
    const fixture = render();
    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('a'));
    const hrefFor = (label: string) => links.find((link) => link.textContent?.trim() === label)?.getAttribute('href');
    expect(hrefFor('View')).toBe(`/urls/${urlFixture().id}`);
    expect(hrefFor('Analytics')).toBe(`/urls/${urlFixture().id}/analytics`);
    expect(hrefFor('Edit expiration')).toBe(`/urls/${urlFixture().id}#expiration`);
  });

  it('shows loading without an overlapping empty state while the page is pending', () => {
    api.list.and.returnValue(new Subject());
    const fixture = TestBed.createComponent(UrlManagementPageComponent);
    fixture.detectChanges();
    expect(text(fixture)).toContain('Loading URLs');
    expect(text(fixture)).not.toContain('No matching URLs');
  });

  it('shows a supportable list failure without an empty-state claim', () => {
    api.list.and.returnValue(
      throwError(
        () => new FrontendApiError(503, 'SERVICE_UNAVAILABLE', 'List unavailable.', 'list-correlation', [], null),
      ),
    );
    const fixture = TestBed.createComponent(UrlManagementPageComponent);
    fixture.detectChanges();
    expect(text(fixture)).toContain('SERVICE_UNAVAILABLE');
    expect(text(fixture)).toContain('list-correlation');
    expect(text(fixture)).not.toContain('No matching URLs');
  });

  it('renders a distinct successful empty state', () => {
    const fixture = render(pageFixture([]));
    expect(text(fixture)).toContain('No matching URLs');
    expect(text(fixture)).not.toContain('Loading URLs');
  });

  it('writes explicit search and filter state to router query parameters', () => {
    const fixture = render();
    const router = TestBed.inject(Router);
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);
    setControl(fixture, '#management-search', ' release ');
    setControl(fixture, '#management-status', 'DISABLED');
    setControl(fixture, '#management-expired', 'true');
    setControl(fixture, '#management-sort', 'shortCode');
    setControl(fixture, '#management-direction', 'asc');
    setControl(fixture, '#management-size', '50');
    submitFilters(fixture);

    expect(navigate).toHaveBeenCalled();
    const extras = navigate.calls.mostRecent().args[1];
    expect(extras?.queryParams).toEqual(jasmine.objectContaining({
      page: 0,
      search: 'release',
      status: 'DISABLED',
      expired: true,
      sort: 'shortCode',
      direction: 'asc',
      size: 50,
    }));
  });

  it('cancels a stale list request when newer route filters arrive', async () => {
    const first = new Subject<ReturnType<typeof pageFixture>>();
    const second = new Subject<ReturnType<typeof pageFixture>>();
    api.list.and.returnValues(first, second);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/urls?search=old', UrlManagementPageComponent);
    await harness.navigateByUrl('/urls?search=new', UrlManagementPageComponent);

    second.next(pageFixture([urlFixture({ shortCode: 'NewResult1' })]));
    harness.fixture.detectChanges();
    first.next(pageFixture([urlFixture({ shortCode: 'OldResult1' })]));
    harness.fixture.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain('NewResult1');
    expect(harness.routeNativeElement?.textContent).not.toContain('OldResult1');
  });

  it('uses server-side pagination navigation', () => {
    const fixture = render({
      ...pageFixture(), totalElements: 25, totalPages: 2,
    });
    const router = TestBed.inject(Router);
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);
    clickButton(fixture, 'Next');
    expect(navigate).toHaveBeenCalledWith([], jasmine.objectContaining({
      queryParams: { page: 1 }, queryParamsHandling: 'merge',
    }));
  });

  it('enables a disabled URL without a full page reload', () => {
    const disabled = urlFixture({ status: 'DISABLED', version: 3 });
    const fixture = render(pageFixture([disabled]));
    api.enable.and.returnValue(of(urlFixture({ status: 'ACTIVE', version: 4 })));

    clickButton(fixture, 'Enable');
    fixture.detectChanges();

    expect(api.enable).toHaveBeenCalledWith(disabled.id, 3);
    expect(text(fixture)).toContain('Active');
  });

  it('requires confirmation before disabling and applies the returned version', () => {
    const active = urlFixture({ version: 5 });
    const fixture = render(pageFixture([active]));
    api.disable.and.returnValue(of(urlFixture({ status: 'DISABLED', version: 6 })));

    clickButton(fixture, 'Disable');
    expect(text(fixture)).toContain('Disable short URL?');
    clickButton(fixture, 'Disable URL');
    fixture.detectChanges();

    expect(api.disable).toHaveBeenCalledWith(active.id, 5);
    expect(text(fixture)).toContain('Disabled');
  });

  it('prevents duplicate lifecycle mutations while the first request is pending', () => {
    const pending = new Subject<ReturnType<typeof urlFixture>>();
    const fixture = render();
    api.disable.and.returnValue(pending);
    clickButton(fixture, 'Disable');
    clickButton(fixture, 'Disable URL');
    const confirmation = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'),
    ).find((button) => button.textContent?.includes('Working'));
    expect(confirmation?.disabled).toBeTrue();
    confirmation?.click();
    expect(api.disable).toHaveBeenCalledTimes(1);
  });

  it('confirms deletion and refreshes the bounded page', () => {
    const fixture = render();
    api.delete.and.returnValue(of(undefined));
    clickButton(fixture, 'Delete');
    expect(text(fixture)).toContain('The code remains reserved');
    clickButton(fixture, 'Delete URL');
    fixture.detectChanges();

    expect(api.delete).toHaveBeenCalledWith(urlFixture().id, 0);
    expect(api.list).toHaveBeenCalledTimes(2);
  });

  it('moves to the previous page after deleting the only result on a later page', () => {
    const fixture = render({ ...pageFixture(), page: 2, totalElements: 21, totalPages: 3 });
    api.delete.and.returnValue(of(undefined));
    const router = TestBed.inject(Router);
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);
    clickButton(fixture, 'Delete');
    clickButton(fixture, 'Delete URL');
    expect(navigate).toHaveBeenCalledWith([], jasmine.objectContaining({
      queryParams: { page: 1 },
      queryParamsHandling: 'merge',
    }));
  });

  it('shows an optimistic-lock conflict instead of overwriting newer state', () => {
    const fixture = render();
    api.disable.and.returnValue(
      throwError(
        () => new FrontendApiError(409, 'OPTIMISTIC_LOCK_CONFLICT', 'The resource changed.', 'correlation-conflict', [], null),
      ),
    );
    clickButton(fixture, 'Disable');
    clickButton(fixture, 'Disable URL');
    fixture.detectChanges();

    expect(text(fixture)).toContain('OPTIMISTIC_LOCK_CONFLICT');
    expect(text(fixture)).toContain('correlation-conflict');
    expect(text(fixture)).toContain('Active');
  });

  it('offers only state-valid lifecycle actions', () => {
    const fixture = render(pageFixture([urlFixture({ status: 'DISABLED' })]));
    expect(buttonLabels(fixture)).toContain('Enable');
    expect(buttonLabels(fixture)).not.toContain('Disable');
  });

  it('copies through the clipboard boundary', async () => {
    const fixture = render();
    clickButton(fixture, 'Copy');
    await fixture.whenStable();
    expect(clipboard.writeText).toHaveBeenCalledWith(urlFixture().shortUrl);
  });
});

function render(page = pageFixture()): ComponentFixture<UrlManagementPageComponent> {
  const api = TestBed.inject(UrlApiService) as jasmine.SpyObj<UrlApiService>;
  api.list.and.returnValue(of(page));
  const fixture = TestBed.createComponent(UrlManagementPageComponent);
  fixture.detectChanges();
  return fixture;
}

function setControl(
  fixture: ComponentFixture<UrlManagementPageComponent>,
  selector: string,
  value: string,
): void {
  const control = fixture.nativeElement.querySelector(selector) as HTMLInputElement | HTMLSelectElement | null;
  if (control === null) throw new Error(`Missing control ${selector}`);
  control.value = value;
  control.dispatchEvent(new Event('input'));
  control.dispatchEvent(new Event('change'));
  fixture.detectChanges();
}

function submitFilters(fixture: ComponentFixture<UrlManagementPageComponent>): void {
  const form = (fixture.nativeElement as HTMLElement).querySelector<HTMLFormElement>('form.filters');
  if (form === null) throw new Error('Missing filters form');
  form.dispatchEvent(new Event('submit'));
  fixture.detectChanges();
}

function clickButton(fixture: ComponentFixture<UrlManagementPageComponent>, label: string): void {
  const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'));
  const button = buttons.find((candidate) => candidate.textContent?.trim() === label);
  if (button === undefined) throw new Error(`Missing button ${label}`);
  button.click();
  fixture.detectChanges();
}

function text(fixture: ComponentFixture<UrlManagementPageComponent>): string {
  return (fixture.nativeElement as HTMLElement).textContent ?? '';
}

function buttonLabels(fixture: ComponentFixture<UrlManagementPageComponent>): readonly string[] {
  return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'))
    .map((button) => button.textContent?.trim() ?? '');
}
