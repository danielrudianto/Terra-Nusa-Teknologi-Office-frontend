import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MasterItemCreateComponent } from './master-item-create.component';

describe('MasterItemCreateComponent', () => {
  let component: MasterItemCreateComponent;
  let fixture: ComponentFixture<MasterItemCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MasterItemCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MasterItemCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
