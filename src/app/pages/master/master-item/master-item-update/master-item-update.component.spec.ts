import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MasterItemUpdateComponent } from './master-item-update.component';

describe('MasterItemUpdateComponent', () => {
  let component: MasterItemUpdateComponent;
  let fixture: ComponentFixture<MasterItemUpdateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MasterItemUpdateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MasterItemUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
