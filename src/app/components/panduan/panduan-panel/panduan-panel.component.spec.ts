import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PanduanPanelComponent } from './panduan-panel.component';

describe('PanduanPanelComponent', () => {
  let component: PanduanPanelComponent;
  let fixture: ComponentFixture<PanduanPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PanduanPanelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PanduanPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
