import { TranslatePipe } from '@ngx-translate/core';
import { ServerMessageService } from 'src/app/services/server-message.service';
import { TranslateService } from '@ngx-translate/core';
import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { SupplierSelectorComponent } from '../../../components/supplier-selector/supplier-selector.component';
import { ApiService } from 'src/app/services/api.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { MatButtonModule } from '@angular/material/button';
import { ProjectSelectorComponent } from '../../../components/project-selector/project-selector.component';
import { DialogGeserDirective } from '../../../directives/dialog-geser.directive';
import { PurchaseOrderPickerComponent } from '../../../components/purchase-order-picker/purchase-order-picker.component';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-purchase-draft-create',
  providers: [provideNgxMask()],
  imports: [
    ProjectSelectorComponent,
    CommonModule,
    MatButtonModule,
    ReactiveFormsModule,
    FormsModule,
    MatIconModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    NgxMaskDirective,
    TranslatePipe,
    DialogGeserDirective,
    MatTooltipModule,
  ],
  templateUrl: './purchase-draft-create.component.html',
  styleUrl: './purchase-draft-create.component.scss',
  standalone: true,
})
export class PurchaseDraftCreateComponent {
  private readonly serverMessage = inject(ServerMessageService);
  private readonly translate = inject(TranslateService);
  constructor(
    private dialog: MatDialog,
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<PurchaseDraftCreateComponent>,
  ) {}

  @ViewChild('input') input!: ElementRef<HTMLInputElement>;
  isSubmitting: boolean = false;

  ngAfterViewInit() {
    this.metaFormGroup.controls['ppn'].valueChanges.subscribe((value) => {
      if (value) {
        this.metaFormGroup.controls['ppnValue'].setValue(
          ((this.metaFormGroup.controls['dpp'].value * value) / 100).toFixed(2),
        );
      } else {
        this.metaFormGroup.controls['ppnValue'].setValue(0);
      }
    });

    this.metaFormGroup.controls['dpp'].valueChanges.subscribe((value) => {
      if (value) {
        this.metaFormGroup.controls['ppnValue'].setValue(
          ((this.metaFormGroup.controls['ppn'].value * value) / 100).toFixed(2),
        );
      } else {
        this.metaFormGroup.controls['ppnValue'].setValue(0);
      }
    });

    this.metaFormGroup.controls['purchaseOrderName'].valueChanges.subscribe(
      (_) => {
        const purchaseOrderName =
          this.metaFormGroup.controls['purchaseOrderName'].value;
        const regex =
          /^\d{3,4}-(PO|SPK|PKS)-[A-Z0-9]{1,5}-(A|B|C|D|E|F|G|H1|H2|5\.1\.1|5\.1\.2|5\.1\.6|5\.1\.7|6\.3\.1|6\.3\.2|5\.1\.12|6\.4\.1|6\.4\.2)$/;
        const isValid = regex.test(purchaseOrderName);
        if (isValid) {
          // set the project name based on the purchase order name
          const projectName = purchaseOrderName.split('-')[2];
          const expenseType = purchaseOrderName.split('-')[3];
          this.metaFormGroup.controls['projectName'].setValue(projectName);
          this.metaFormGroup.controls['purchaseType'].setValue(expenseType);
        } else {
          // set the project name to empty string if the purchase order name is not valid
          this.metaFormGroup.controls['projectName'].setValue('');
        }
      },
    );
  }

  metaFormGroup: FormGroup = new FormGroup({
    description: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    taxInvoiceName: new FormControl('', Validators.maxLength(17)),
    supplierID: new FormControl('', Validators.required),
    supplierName: new FormControl(''),
    supplierAddress: new FormControl(''),
    date: new FormControl('', Validators.required),
    purchaseOrderName: new FormControl('', [
      Validators.required,
      Validators.pattern(
        /^\d{3,4}-(PO|SPK|PKS)-[A-Z0-9]{4,5}-(A|B|C|D|E|F|G|H1|H2|5\.1\.1|5\.1\.2|5\.1\.6|5\.1\.7|6\.3\.1|6\.3\.2|5\.1\.12|6\.4\.1|6\.4\.2)$/,
      ),
      Validators.maxLength(100),
    ]),
    projectName: new FormControl('', [
      Validators.required,
      Validators.minLength(4),
      Validators.maxLength(5),
    ]),
    purchaseType: new FormControl('', [
      Validators.required,
      Validators.pattern(
        /^\A|B|C|D|E|F|G|H1|H2|5\.1\.1|5\.1\.2|5\.1\.6|5\.1\.7|6\.3\.1|6\.3\.2|5\.1\.12|6\.4\.1|6\.4\.2$/,
      ),
    ]),
    dpp: new FormControl(0, [Validators.required, Validators.min(1)]),
    ppn: new FormControl(0, [Validators.required, Validators.min(0)]),
    ppnValue: new FormControl(0, [Validators.required, Validators.min(0)]),
    pbbkb: new FormControl(0, [Validators.required, Validators.min(0)]),
  });

  onCancel() {
    this.dialogRef.close();
  }

  /**
   * Pilih purchase order, lalu salin datanya ke draf ini.
   *
   * PPh tidak ikut: draf pembelian belum menyimpan bidang pajak penghasilan,
   * dan menambahkannya di sini berarti nilainya hilang saat draf dikonversi.
   *
   * Tanggal juga tidak: `date` purchase order adalah tanggal terbit
   * dokumennya, bukan tanggal faktur pemasok.
   */
  bukaPemilihPO(): void {
    this.dialog
      .open(PurchaseOrderPickerComponent, {
        maxWidth: '96vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((po: any) => {
        if (!po) return;
        this.metaFormGroup.patchValue({
          purchaseOrderName: po.purchaseOrderName,
          supplierID: po.supplierID,
          supplierName: po.supplierName,
          projectName: po.projectName,
          purchaseType: po.purchaseType,
          dpp: po.dpp,
          ppn: po.ppn,
        });
      });
  }

  openSupplierSelector() {
    this.dialog
      .open(SupplierSelectorComponent, {
        minWidth: '400px',
      })
      .afterClosed()
      .subscribe((data) => {
        if (data) {
          this.metaFormGroup.patchValue({
            supplierID: data.id,
            supplierName: data.name,
            supplierAddress: data.address,
          });
        }
      });
  }

  onSubmit() {
    this.isSubmitting = true;
    const date = new Date(this.metaFormGroup.controls['date'].value);
    const dateFormatted = `${date.getFullYear()}-${String(
      date.getMonth() + 1,
    ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const purchaseData = {
      supplierID: this.metaFormGroup.controls['supplierID'].value,
      date: dateFormatted,
      purchaseOrderName: this.metaFormGroup.controls['purchaseOrderName'].value,
      projectName: this.metaFormGroup.controls['projectName'].value,
      dpp: this.metaFormGroup.controls['dpp'].value,
      ppn: this.metaFormGroup.controls['ppn'].value,
      pbbkb: this.metaFormGroup.controls['pbbkb'].value,
      description: this.metaFormGroup.controls['description'].value,
      purchaseType: this.metaFormGroup.controls['purchaseType'].value,
    };

    this.apiService
      .post('purchase-draft', purchaseData)
      .subscribe({
        next: () => {
          this.snackBar.open(
      this.translate.instant('notify.createSuccess'), 'Close', {
            duration: 3000,
          });
          this.metaFormGroup.reset();
          // close and signal the list to refresh
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.snackBar.open(
          this.serverMessage.terjemahkan(error), 'Close', {
            duration: 3000,
          });
        },
      })
      .add(() => {
        this.isSubmitting = false;
      });
  }

  get total(): number {
    return (
      this.metaFormGroup.controls['dpp'].value +
      this.metaFormGroup.controls['ppnValue'].value +
      this.metaFormGroup.controls['pbbkb'].value
    );
  }
}
