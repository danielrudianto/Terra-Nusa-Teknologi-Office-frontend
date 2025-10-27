import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchaseOrderCreateGComponent } from './purchase-order-create-g.component';

describe('PurchaseOrderCreateGComponent', () => {
  let component: PurchaseOrderCreateGComponent;
  let fixture: ComponentFixture<PurchaseOrderCreateGComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchaseOrderCreateGComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PurchaseOrderCreateGComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
