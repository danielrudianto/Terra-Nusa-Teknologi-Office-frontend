import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarDateSelectorComponent } from './calendar-date-selector.component';

describe('CalendarDateSelectorComponent', () => {
  let component: CalendarDateSelectorComponent;
  let fixture: ComponentFixture<CalendarDateSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarDateSelectorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendarDateSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
