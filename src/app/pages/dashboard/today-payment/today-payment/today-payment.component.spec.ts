import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TodayPaymentComponent } from './today-payment.component';

describe('TodayPaymentComponent', () => {
  let component: TodayPaymentComponent;
  let fixture: ComponentFixture<TodayPaymentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TodayPaymentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TodayPaymentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
