import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchaseOrderCreateHComponent } from './purchase-order-create-h.component';

describe('PurchaseOrderCreateHComponent', () => {
  let component: PurchaseOrderCreateHComponent;
  let fixture: ComponentFixture<PurchaseOrderCreateHComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchaseOrderCreateHComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PurchaseOrderCreateHComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
