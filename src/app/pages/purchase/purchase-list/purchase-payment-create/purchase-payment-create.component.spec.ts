import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchasePaymentCreateComponent } from './purchase-payment-create.component';

describe('PurchasePaymentCreateComponent', () => {
  let component: PurchasePaymentCreateComponent;
  let fixture: ComponentFixture<PurchasePaymentCreateComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PurchasePaymentCreateComponent]
    });
    fixture = TestBed.createComponent(PurchasePaymentCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
