import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchaseOrderCreateFComponent } from './purchase-order-create-f.component';

describe('PurchaseOrderCreateFComponent', () => {
  let component: PurchaseOrderCreateFComponent;
  let fixture: ComponentFixture<PurchaseOrderCreateFComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchaseOrderCreateFComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PurchaseOrderCreateFComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
