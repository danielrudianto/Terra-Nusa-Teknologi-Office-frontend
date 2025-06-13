import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarAccountSelectorComponent } from './calendar-account-selector.component';

describe('CalendarAccountSelectorComponent', () => {
  let component: CalendarAccountSelectorComponent;
  let fixture: ComponentFixture<CalendarAccountSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarAccountSelectorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendarAccountSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
