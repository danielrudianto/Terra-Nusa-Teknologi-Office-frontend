import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TodayPaymentDialogComponent } from './today-payment-dialog.component';

describe('TodayPaymentDialogComponent', () => {
  let component: TodayPaymentDialogComponent;
  let fixture: ComponentFixture<TodayPaymentDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TodayPaymentDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TodayPaymentDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
