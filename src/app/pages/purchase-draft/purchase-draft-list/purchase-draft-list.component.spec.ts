import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchaseDraftListComponent } from './purchase-draft-list.component';

describe('PurchaseDraftListComponent', () => {
  let component: PurchaseDraftListComponent;
  let fixture: ComponentFixture<PurchaseDraftListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PurchaseDraftListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PurchaseDraftListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
