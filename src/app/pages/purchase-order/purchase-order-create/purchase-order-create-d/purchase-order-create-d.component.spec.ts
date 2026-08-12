import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchaseOrderCreateDComponent } from './purchase-order-create-d.component';

describe('PurchaseOrderCreateDComponent', () => {
  let component: PurchaseOrderCreateDComponent;
  let fixture: ComponentFixture<PurchaseOrderCreateDComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchaseOrderCreateDComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PurchaseOrderCreateDComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
