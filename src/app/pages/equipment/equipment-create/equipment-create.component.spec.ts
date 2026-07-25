import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EquipmentCreateComponent } from './equipment-create.component';

describe('EquipmentCreateComponent', () => {
  let component: EquipmentCreateComponent;
  let fixture: ComponentFixture<EquipmentCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EquipmentCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EquipmentCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
