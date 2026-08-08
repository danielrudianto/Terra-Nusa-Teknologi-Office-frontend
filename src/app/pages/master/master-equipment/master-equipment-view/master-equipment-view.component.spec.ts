import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MasterEquipmentViewComponent } from './master-equipment-view.component';

describe('MasterEquipmentViewComponent', () => {
  let component: MasterEquipmentViewComponent;
  let fixture: ComponentFixture<MasterEquipmentViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MasterEquipmentViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MasterEquipmentViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
