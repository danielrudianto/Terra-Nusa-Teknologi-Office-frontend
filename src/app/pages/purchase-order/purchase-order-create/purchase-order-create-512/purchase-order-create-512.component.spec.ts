import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchaseOrderCreate512Component } from './purchase-order-create-512.component';

describe('PurchaseOrderCreate512Component', () => {
  let component: PurchaseOrderCreate512Component;
  let fixture: ComponentFixture<PurchaseOrderCreate512Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchaseOrderCreate512Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PurchaseOrderCreate512Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
