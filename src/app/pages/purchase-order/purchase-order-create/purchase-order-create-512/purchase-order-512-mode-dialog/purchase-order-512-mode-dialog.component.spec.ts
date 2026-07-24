import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchaseOrder512ModeDialogComponent } from './purchase-order-512-mode-dialog.component';

describe('PurchaseOrder512ModeDialogComponent', () => {
  let component: PurchaseOrder512ModeDialogComponent;
  let fixture: ComponentFixture<PurchaseOrder512ModeDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchaseOrder512ModeDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PurchaseOrder512ModeDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
