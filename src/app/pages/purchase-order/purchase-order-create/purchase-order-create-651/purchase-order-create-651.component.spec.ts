import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchaseOrderCreate651Component } from './purchase-order-create-651.component';

describe('PurchaseOrderCreate651Component', () => {
  let component: PurchaseOrderCreate651Component;
  let fixture: ComponentFixture<PurchaseOrderCreate651Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchaseOrderCreate651Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PurchaseOrderCreate651Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
