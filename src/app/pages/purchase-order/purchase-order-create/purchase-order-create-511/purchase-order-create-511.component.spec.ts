import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchaseOrderCreate511Component } from './purchase-order-create-511.component';

describe('PurchaseOrderCreate511Component', () => {
  let component: PurchaseOrderCreate511Component;
  let fixture: ComponentFixture<PurchaseOrderCreate511Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchaseOrderCreate511Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PurchaseOrderCreate511Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
