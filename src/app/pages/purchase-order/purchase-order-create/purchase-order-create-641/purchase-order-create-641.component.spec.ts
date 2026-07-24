import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchaseOrderCreate641Component } from './purchase-order-create-641.component';

describe('PurchaseOrderCreate641Component', () => {
  let component: PurchaseOrderCreate641Component;
  let fixture: ComponentFixture<PurchaseOrderCreate641Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchaseOrderCreate641Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PurchaseOrderCreate641Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
