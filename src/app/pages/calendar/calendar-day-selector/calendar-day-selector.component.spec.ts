import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarDaySelectorComponent } from './calendar-day-selector.component';

describe('CalendarDaySelectorComponent', () => {
  let component: CalendarDaySelectorComponent;
  let fixture: ComponentFixture<CalendarDaySelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CalendarDaySelectorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendarDaySelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
