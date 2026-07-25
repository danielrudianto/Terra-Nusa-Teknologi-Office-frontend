import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarAccountSelectorDialogComponent } from './calendar-account-selector-dialog.component';

describe('CalendarAccountSelectorDialogComponent', () => {
  let component: CalendarAccountSelectorDialogComponent;
  let fixture: ComponentFixture<CalendarAccountSelectorDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarAccountSelectorDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendarAccountSelectorDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
