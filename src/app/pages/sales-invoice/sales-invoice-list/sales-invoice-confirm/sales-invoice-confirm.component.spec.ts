import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SalesInvoiceConfirmComponent } from './sales-invoice-confirm.component';

describe('SalesInvoiceConfirmComponent', () => {
  let component: SalesInvoiceConfirmComponent;
  let fixture: ComponentFixture<SalesInvoiceConfirmComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalesInvoiceConfirmComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SalesInvoiceConfirmComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
