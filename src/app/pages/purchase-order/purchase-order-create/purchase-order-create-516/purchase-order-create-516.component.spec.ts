import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchaseOrderCreate516Component } from './purchase-order-create-516.component';

describe('PurchaseOrderCreate516Component', () => {
  let component: PurchaseOrderCreate516Component;
  let fixture: ComponentFixture<PurchaseOrderCreate516Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchaseOrderCreate516Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PurchaseOrderCreate516Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
