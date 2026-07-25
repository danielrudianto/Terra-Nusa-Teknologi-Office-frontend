import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchaseOrderCreate63Component } from './purchase-order-create-63.component';

describe('PurchaseOrderCreate63Component', () => {
  let component: PurchaseOrderCreate63Component;
  let fixture: ComponentFixture<PurchaseOrderCreate63Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchaseOrderCreate63Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PurchaseOrderCreate63Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
