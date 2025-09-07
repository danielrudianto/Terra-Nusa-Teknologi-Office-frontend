import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchaseDraftComponent } from './purchase-draft.component';

describe('PurchaseDraftComponent', () => {
  let component: PurchaseDraftComponent;
  let fixture: ComponentFixture<PurchaseDraftComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PurchaseDraftComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PurchaseDraftComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
