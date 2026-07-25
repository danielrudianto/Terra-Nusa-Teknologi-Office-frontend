import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MasterEquipmentCreateComponent } from './master-equipment-create.component';

describe('MasterEquipmentCreateComponent', () => {
  let component: MasterEquipmentCreateComponent;
  let fixture: ComponentFixture<MasterEquipmentCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MasterEquipmentCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MasterEquipmentCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
