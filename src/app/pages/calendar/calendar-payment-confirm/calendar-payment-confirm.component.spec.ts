import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarPaymentConfirmComponent } from './calendar-payment-confirm.component';

describe('CalendarPaymentConfirmComponent', () => {
  let component: CalendarPaymentConfirmComponent;
  let fixture: ComponentFixture<CalendarPaymentConfirmComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarPaymentConfirmComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendarPaymentConfirmComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
