import {
  ComponentFixture,
  TestBed,
} from '@angular/core/testing';

import { StatusBadgeComponent } from './status-badge.component';

describe('StatusBadgeComponent', () => {
  let fixture: ComponentFixture<StatusBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusBadgeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(
      StatusBadgeComponent,
    );
  });

  it('renders active status', () => {
    fixture.componentRef.setInput(
      'status',
      'ACTIVE',
    );

    fixture.componentRef.setInput(
      'expired',
      false,
    );

    fixture.detectChanges();

    expect(pageText(fixture)).toContain(
      'Active',
    );
  });

  it('shows expired instead of active when the URL is expired', () => {
    fixture.componentRef.setInput(
      'status',
      'ACTIVE',
    );

    fixture.componentRef.setInput(
      'expired',
      true,
    );

    fixture.detectChanges();

    expect(pageText(fixture)).toContain(
      'Expired',
    );
  });

  it('keeps deleted status authoritative', () => {
    fixture.componentRef.setInput(
      'status',
      'DELETED',
    );

    fixture.componentRef.setInput(
      'expired',
      true,
    );

    fixture.detectChanges();

    expect(pageText(fixture)).toContain(
      'Deleted',
    );
  });
});

function pageText(
  fixture: ComponentFixture<StatusBadgeComponent>,
): string {
  return (
    (
      fixture.nativeElement as HTMLElement
    ).textContent ?? ''
  );
}