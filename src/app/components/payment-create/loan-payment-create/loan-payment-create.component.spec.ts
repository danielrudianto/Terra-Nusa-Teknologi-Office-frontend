import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoanPaymentCreateComponent } from './loan-payment-create.component';

describe('LoanPaymentCreateComponent', () => {
  let component: LoanPaymentCreateComponent;
  let fixture: ComponentFixture<LoanPaymentCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoanPaymentCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoanPaymentCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
