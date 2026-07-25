import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchaseOrderCreateCComponent } from './purchase-order-create-c.component';

describe('PurchaseOrderCreateCComponent', () => {
  let component: PurchaseOrderCreateCComponent;
  let fixture: ComponentFixture<PurchaseOrderCreateCComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchaseOrderCreateCComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PurchaseOrderCreateCComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
