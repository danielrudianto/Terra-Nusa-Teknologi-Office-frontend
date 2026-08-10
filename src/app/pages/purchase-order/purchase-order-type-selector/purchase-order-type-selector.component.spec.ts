import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchaseOrderTypeSelectorComponent } from './purchase-order-type-selector.component';

describe('PurchaseOrderTypeSelectorComponent', () => {
  let component: PurchaseOrderTypeSelectorComponent;
  let fixture: ComponentFixture<PurchaseOrderTypeSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchaseOrderTypeSelectorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PurchaseOrderTypeSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
