import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReimbursementPaymentCreateComponent } from './reimbursement-payment-create.component';

describe('ReimbursementPaymentCreateComponent', () => {
  let component: ReimbursementPaymentCreateComponent;
  let fixture: ComponentFixture<ReimbursementPaymentCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ReimbursementPaymentCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReimbursementPaymentCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
