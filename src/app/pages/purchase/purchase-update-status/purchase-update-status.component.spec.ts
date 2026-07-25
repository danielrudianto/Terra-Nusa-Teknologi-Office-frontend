import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchaseUpdateStatusComponent } from './purchase-update-status.component';

describe('PurchaseUpdateStatusComponent', () => {
  let component: PurchaseUpdateStatusComponent;
  let fixture: ComponentFixture<PurchaseUpdateStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchaseUpdateStatusComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PurchaseUpdateStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
