import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssetListPurchaseOrderSelectorComponent } from './asset-list-purchase-order-selector.component';

describe('AssetListPurchaseOrderSelectorComponent', () => {
  let component: AssetListPurchaseOrderSelectorComponent;
  let fixture: ComponentFixture<AssetListPurchaseOrderSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetListPurchaseOrderSelectorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssetListPurchaseOrderSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
