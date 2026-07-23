import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchaseOrderCreateBComponent } from './purchase-order-create-b.component';

describe('PurchaseOrderCreateBComponent', () => {
  let component: PurchaseOrderCreateBComponent;
  let fixture: ComponentFixture<PurchaseOrderCreateBComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchaseOrderCreateBComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PurchaseOrderCreateBComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
