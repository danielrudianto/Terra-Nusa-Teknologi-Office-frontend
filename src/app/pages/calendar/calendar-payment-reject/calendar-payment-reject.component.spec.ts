import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarPaymentRejectComponent } from './calendar-payment-reject.component';

describe('CalendarPaymentRejectComponent', () => {
  let component: CalendarPaymentRejectComponent;
  let fixture: ComponentFixture<CalendarPaymentRejectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarPaymentRejectComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendarPaymentRejectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
