import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-supplier-update',
  templateUrl: './supplier-update.component.html',
  styleUrl: './supplier-update.component.scss',
  standalone: false,
})
export class SupplierUpdateComponent {
  constructor(private apiService: ApiService, private route: ActivatedRoute) {}

  isLoading: boolean = false;
  formGroup: FormGroup = new FormGroup({
    id: new FormControl('', Validators.required),
    name: new FormControl('', Validators.required),
    address: new FormControl('', Validators.required),
    city: new FormControl('', Validators.required),
    province: new FormControl('', Validators.required),
    phoneNumber: new FormControl('', Validators.required),
    email: new FormControl('', Validators.email),
  });

  fetchData() {
    this.apiService
      .get('suppliers/' + this.route.snapshot.params['id'], {})
      .subscribe({
        next: (data: any) => {
          console.log(data);
        },
        error: (error) => {
          console.error(error);
        },
      });
  }
}
