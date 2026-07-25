import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SalesInvoicePaymentCreateComponent } from './sales-invoice-payment-create.component';

describe('SalesInvoicePaymentCreateComponent', () => {
  let component: SalesInvoicePaymentCreateComponent;
  let fixture: ComponentFixture<SalesInvoicePaymentCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SalesInvoicePaymentCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SalesInvoicePaymentCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
