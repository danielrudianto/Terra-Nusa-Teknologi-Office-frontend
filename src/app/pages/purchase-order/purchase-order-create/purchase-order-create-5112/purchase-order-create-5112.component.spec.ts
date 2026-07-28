import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchaseOrderCreate5112Component } from './purchase-order-create-5112.component';

describe('PurchaseOrderCreate5112Component', () => {
  let component: PurchaseOrderCreate5112Component;
  let fixture: ComponentFixture<PurchaseOrderCreate5112Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchaseOrderCreate5112Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PurchaseOrderCreate5112Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
