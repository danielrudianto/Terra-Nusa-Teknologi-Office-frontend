import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchaseDraftViewComponent } from './purchase-draft-view.component';

describe('PurchaseDraftViewComponent', () => {
  let component: PurchaseDraftViewComponent;
  let fixture: ComponentFixture<PurchaseDraftViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PurchaseDraftViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PurchaseDraftViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
