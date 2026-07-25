import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchaseOrderCreateAComponent } from './purchase-order-create-a.component';

describe('PurchaseOrderCreateAComponent', () => {
  let component: PurchaseOrderCreateAComponent;
  let fixture: ComponentFixture<PurchaseOrderCreateAComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchaseOrderCreateAComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PurchaseOrderCreateAComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
