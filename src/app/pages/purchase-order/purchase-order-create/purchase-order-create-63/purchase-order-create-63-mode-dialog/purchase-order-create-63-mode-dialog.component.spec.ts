import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchaseOrderCreate63ModeDialogComponent } from './purchase-order-create-63-mode-dialog.component';

describe('PurchaseOrderCreate63ModeDialogComponent', () => {
  let component: PurchaseOrderCreate63ModeDialogComponent;
  let fixture: ComponentFixture<PurchaseOrderCreate63ModeDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchaseOrderCreate63ModeDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PurchaseOrderCreate63ModeDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
