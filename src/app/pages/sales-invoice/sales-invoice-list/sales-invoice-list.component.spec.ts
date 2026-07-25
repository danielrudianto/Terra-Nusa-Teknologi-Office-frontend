import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SalesInvoiceListComponent } from './sales-invoice-list.component';

describe('SalesInvoiceListComponent', () => {
  let component: SalesInvoiceListComponent;
  let fixture: ComponentFixture<SalesInvoiceListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SalesInvoiceListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SalesInvoiceListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
