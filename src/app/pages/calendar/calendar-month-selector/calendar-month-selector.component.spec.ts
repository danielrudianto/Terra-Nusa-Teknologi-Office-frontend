import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarMonthSelectorComponent } from './calendar-month-selector.component';

describe('CalendarMonthSelectorComponent', () => {
  let component: CalendarMonthSelectorComponent;
  let fixture: ComponentFixture<CalendarMonthSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CalendarMonthSelectorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendarMonthSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
