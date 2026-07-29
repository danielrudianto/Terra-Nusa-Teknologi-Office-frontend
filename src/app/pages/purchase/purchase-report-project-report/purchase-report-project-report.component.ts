import { Component, OnInit, ViewChild } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from 'src/app/services/api.service';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTreeModule } from '@angular/material/tree';
import { BaseChartDirective } from 'ng2-charts';
import {
  Chart,
  ChartConfiguration,
  ChartData,
  ChartType,
  registerables,
} from 'chart.js';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { HeaderTitleComponent } from 'src/app/components/header-title/header-title.component';
import {
  FormControl,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatGridListModule } from '@angular/material/grid-list';
import { PURCHASE_TYPE_LABELS } from 'src/app/constants/purchase-type-label';
import { FlatTreeControl } from '@angular/cdk/tree';
import {
  MatTreeFlatDataSource,
  MatTreeFlattener,
} from '@angular/material/tree';

interface TreeNode {
  label: string;
  type: 'header' | 'supplier' | 'invoice';
  value?: number; // for header/supplier total
  purchaseType?: string; // only for header
  supplierName?: string; // only for supplier
  invoiceData?: {
    date: string;
    invoiceNumber: string;
    value: number;
  }; // only for invoice
  children?: TreeNode[];
  level: number;
  expandable: boolean;
}

Chart.register(...registerables);

@Component({
  selector: 'app-purchase-report-project-report',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    MatCardModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTreeModule,
    BaseChartDirective,
    MatButtonModule,
    MatIconModule,
    HeaderTitleComponent,
    MatGridListModule,
  ],
  templateUrl: './purchase-report-project-report.component.html',
  styleUrls: ['./purchase-report-project-report.component.scss'],
})
export class PurchaseReportProjectReportComponent implements OnInit {
  @ViewChild(BaseChartDirective) chart: BaseChartDirective | undefined;

  public pieChartOptions: ChartConfiguration['options'] = {
    plugins: {
      legend: {
        display: false,
      },
    },
  };

  public pieChartData: ChartData<'pie', number[], string | string[]> = {
    labels: [['Download', 'Sales'], ['In', 'Store', 'Sales'], 'Mail Sales'],
    datasets: [
      {
        data: [300, 500, 100],
      },
    ],
  };

  public pieChartType: ChartType = 'pie';

  /* ===== Cashflow per minggu ===== */
  public barChartType: 'bar' = 'bar';
  public barChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  public barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          label: (ctx) =>
            `${ctx.dataset.label}: ${Number(ctx.parsed.y).toLocaleString(
              'id-ID',
              { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 },
            )}`,
        },
      },
    },
    scales: {
      y: {
        ticks: {
          callback: (v) =>
            'Rp ' + Number(v).toLocaleString('id-ID', { notation: 'compact' }),
        },
      },
    },
  };
  cashflowRows: {
    week: string;
    expense: number;
    incoming: number;
    projected: number;
  }[] = [];

  /** Kunci minggu ISO (tahun-Wnn) dari sebuah tanggal. */
  private weekKey(d: Date): string {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    const week = Math.ceil(
      ((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
    );
    return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
  }

  private buildCashflow(): void {
    if (!this.data) return;
    // map minggu -> {expense, incoming, projected}
    const map = new Map<
      string,
      { expense: number; incoming: number; projected: number }
    >();
    const get = (k: string) => {
      if (!map.has(k)) map.set(k, { expense: 0, incoming: 0, projected: 0 });
      return map.get(k)!;
    };

    // Pengeluaran (keluar): purchase + reimbursement + draft
    const addExpense = (items: any[], kind: 'p' | 'r' | 'd') => {
      (items || []).forEach((it: any) => {
        const raw = it.date || it.invoiceDate;
        if (!raw) return;
        const val =
          kind === 'r'
            ? it.amount || 0
            : it.dpp +
              (it.ppn * it.dpp) / 100 +
              it.pbbkb +
              (kind === 'p' ? it.otherValue || 0 : 0);
        get(this.weekKey(new Date(raw))).expense += val;
      });
    };
    addExpense(this.data.purchases, 'p');
    addExpense(this.data.reimbursements, 'r');
    addExpense(this.data.purchase_drafts, 'd');

    // Sales invoice: nilai invoice = dpp + ppn - pph + bpjs
    (this.data.sales_invoices || []).forEach((inv: any) => {
      if (!inv.date) return;
      const invoiceValue =
        inv.dpp +
        (inv.ppn * inv.dpp) / 100 -
        (inv.pphPercentage * inv.dpp) / 100 +
        (inv.bpjs || 0);
      const paid = inv.total_paid || 0;
      const projected = Math.max(invoiceValue - paid, 0);
      const bucket = get(this.weekKey(new Date(inv.date)));
      // uang masuk (yang sudah dibayar) dicatat di minggu invoice
      bucket.incoming += paid;
      // projected = sisa yang belum dibayar
      bucket.projected += projected;
    });

    // urutkan minggu
    const keys = Array.from(map.keys()).sort();
    this.cashflowRows = keys.map((k) => ({
      week: k,
      expense: map.get(k)!.expense,
      incoming: map.get(k)!.incoming,
      projected: map.get(k)!.projected,
    }));

    this.barChartData = {
      labels: keys,
      datasets: [
        {
          label: 'Pengeluaran',
          data: keys.map((k) => map.get(k)!.expense),
          backgroundColor: '#e2504a',
          borderRadius: 4,
        },
        {
          label: 'Uang masuk',
          data: keys.map((k) => map.get(k)!.incoming),
          backgroundColor: '#1d9e75',
          borderRadius: 4,
        },
        {
          label: 'Projected (belum masuk)',
          data: keys.map((k) => map.get(k)!.projected),
          backgroundColor: '#ef9f27',
          borderRadius: 4,
        },
      ],
    };
  }

  formControl: FormControl = new FormControl('type', Validators.required);

  treeControl = new FlatTreeControl<TreeNode>(
    (node) => node.level,
    (node) => node.expandable,
  );

  treeFlattener = new MatTreeFlattener(
    (node: TreeNode, level: number) => {
      return {
        ...node,
        level,
        expandable: !!node.children && node.children.length > 0,
      };
    },
    (node) => node.level,
    (node) => node.expandable,
    (node) => node.children,
  );

  dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);

  constructor(
    private apiService: ApiService,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loadReport();
  }

  data: any = null;

  loadReport() {
    const projectName = this.route.snapshot.params['projectName'];
    this.apiService
      .get(`purchases/report/project/${projectName}`, {})
      .subscribe({
        next: (data: any) => {
          this.data = data;
          this.loadPie();
          this.buildTypeTree(); // 👈 add this
          this.buildCashflow(); // cashflow per minggu
        },
        error: (err) => {
          console.error('Failed to load report', err);
          this.snackBar.open('Failed to load project report', 'Close', {
            duration: 3000,
          });
        },
      });
  }

  loadPie() {
    const aggregates = new Map<string, number>();

    const addToMap = (type: string, amount: number) => {
      aggregates.set(type, (aggregates.get(type) || 0) + amount);
    };

    this.data.purchases.forEach((p: any) => {
      const total = p.dpp + (p.ppn * p.dpp) / 100 + p.pbbkb + p.otherValue;
      addToMap(p.purchaseType, total);
    });

    this.data.reimbursements.forEach((r: any) => {
      addToMap(r.purchaseType, r.amount);
    });

    this.data.purchase_drafts.forEach((d: any) => {
      const total = d.dpp + (d.ppn * d.dpp) / 100 + d.pbbkb;
      addToMap(d.purchaseType, total);
    });

    const items = Array.from(aggregates, ([code, value]) => ({ code, value }));
    const total = items.reduce((sum, item) => sum + item.value, 0);

    if (total === 0) {
      this.pieChartData = { labels: [], datasets: [{ data: [] }] };
      this.chart?.update();
      return;
    }

    const threshold = total * 0.03; // 3%
    const majorItems: { code: string; value: number }[] = [];
    let otherTotal = 0;

    items.forEach((item) => {
      if (item.value < threshold) {
        otherTotal += item.value;
      } else {
        majorItems.push(item);
      }
    });

    // Sort major items by value (descending)
    majorItems.sort((a, b) => b.value - a.value);

    // Convert codes to human-readable labels
    const finalItems = majorItems.map((item) => ({
      label: PURCHASE_TYPE_LABELS[item.code] || item.code, // fallback to code if missing
      value: item.value,
    }));

    // Add "Other Purchases" at the END if exists
    if (otherTotal > 0) {
      finalItems.push({ label: 'Other Purchases', value: otherTotal });
    }

    const sortedLabels = finalItems.map((item) => item.label);
    const sortedDatasets = finalItems.map((item) => item.value);

    // Blue shades palette
    const blueShades = [
      '#001F4D',
      '#003380',
      '#0047B3',
      '#005CFF',
      '#007BFF',
      '#1A8CFF',
      '#339DFF',
      '#4DB0FF',
      '#66C2FF',
      '#80D4FF',
      '#99E6FF',
      '#B3F8FF',
      '#CCFBFF',
      '#E6FDFF',
      '#F2FEFF',
    ];

    const backgroundColors = sortedLabels.map(
      (_, i) => blueShades[i % blueShades.length],
    );

    this.pieChartData = {
      labels: sortedLabels,
      datasets: [
        {
          data: sortedDatasets,
          backgroundColor: backgroundColors,
          borderColor: '#FFFFFF',
          borderWidth: 2,
        },
      ],
    };

    this.chart?.update();
  }

  buildTypeTree() {
    if (!this.data) return;

    const treeNodes: TreeNode[] = [];

    // Group all items by purchaseType → supplier
    const typeMap = new Map<string, Map<string, any[]>>();

    const processItems = (
      items: any[],
      type: 'purchase' | 'reimbursement' | 'draft',
    ) => {
      items.forEach((item) => {
        const pType = item.purchaseType;
        const supplier = item.supplierName || 'Unknown Supplier';

        if (!typeMap.has(pType)) typeMap.set(pType, new Map());
        const supplierMap = typeMap.get(pType)!;
        if (!supplierMap.has(supplier)) supplierMap.set(supplier, []);

        const dateStr = item.invoiceDate
          ? new Date(item.invoiceDate).toLocaleDateString('id-ID')
          : 'Unknown Date';

        let totalValue = 0;
        if (type === 'purchase') {
          totalValue =
            item.dpp +
            (item.ppn * item.dpp) / 100 +
            item.pbbkb +
            item.otherValue;
        } else if (type === 'reimbursement') {
          totalValue = item.amount;
        } else if (type === 'draft') {
          totalValue = item.dpp + (item.ppn * item.dpp) / 100 + item.pbbkb;
        }

        supplierMap.get(supplier)!.push({
          date: dateStr,
          invoiceNumber: item.invoiceNumber || '—',
          value: totalValue,
          rawData: item,
        });
      });
    };

    processItems(this.data.purchases, 'purchase');
    processItems(this.data.reimbursements, 'reimbursement');
    processItems(this.data.purchase_drafts, 'draft');

    // Build tree nodes
    for (const [pType, supplierMap] of typeMap.entries()) {
      const headerLabel = PURCHASE_TYPE_LABELS[pType] || pType; // e.g., "Material"
      const supplierNodes: TreeNode[] = [];

      let typeTotal = 0;

      for (const [supplier, invoices] of supplierMap.entries()) {
        const supplierTotal = invoices.reduce((sum, inv) => sum + inv.value, 0);
        typeTotal += supplierTotal;

        const invoiceNodes: TreeNode[] = invoices.map((inv) => ({
          label: `${inv.date}  ${inv.invoiceNumber}  ${inv.value.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}`,
          type: 'invoice',
          invoiceData: inv,
          level: 2,
          expandable: false,
        }));

        supplierNodes.push({
          label: supplier,
          type: 'supplier',
          value: supplierTotal,
          supplierName: supplier,
          children: invoiceNodes,
          level: 1, // 👈 This ensures indentation under header
          expandable: true,
        });
      }

      treeNodes.push({
        label: headerLabel, // 👈 No value here — clean!
        type: 'header',
        purchaseType: pType,
        value: typeTotal,
        children: supplierNodes,
        level: 0,
        expandable: true,
      });
    }

    // Sort by total value (descending)
    treeNodes.sort((a, b) => (b.value || 0) - (a.value || 0));

    this.dataSource.data = treeNodes;
    this.treeControl.collapseAll();
  }

  hasChild = (_: number, node: TreeNode) => node.expandable;
  isInvoice = (_: number, node: TreeNode) => node.type === 'invoice';

  get totalPurchase(): number {
    if (this.data == null) return 0;
    else
      return this.data.purchases.reduce((a: any, b: any) => {
        return a + b.dpp + b.otherValue + (b.dpp * b.ppn) / 100 + b.pbbkb;
      }, 0);
  }

  get totalReimbursements(): number {
    if (this.data == null) return 0;
    else
      return this.data.reimbursements.reduce((a: any, b: any) => {
        return a + b.amount;
      }, 0);
  }

  get totalDrafts(): number {
    if (this.data == null) return 0;
    else
      return this.data.purchase_drafts.reduce((a: any, b: any) => {
        return a + b.dpp + (b.dpp * b.ppn) / 100 + b.pbbkb;
      }, 0);
  }

  get dpp(): number {
    if (this.data == null) return 0;
    else {
      const purchases = this.data.purchases.reduce((a: any, b: any) => {
        return a + b.dpp + b.otherValue;
      }, 0);

      const reimbursements = this.data.reimbursements.reduce(
        (a: any, b: any) => {
          return a + b.amount;
        },
        0,
      );

      const purchaseDrafts = this.data.purchase_drafts.reduce(
        (a: any, b: any) => {
          return a + b.dpp;
        },
        0,
      );

      return purchases + reimbursements + purchaseDrafts;
    }
  }

  get ppn() {
    if (this.data == null) return 0;
    else {
      const purchases = this.data.purchases.reduce((a: any, b: any) => {
        return a + (b.ppn * b.dpp) / 100;
      }, 0);

      const purchaseDrafts = this.data.purchase_drafts.reduce(
        (a: any, b: any) => {
          return a + (b.ppn * b.dpp) / 100;
        },
        0,
      );

      return purchases + purchaseDrafts;
    }
  }

  get pph() {
    if (this.data == null) return 0;
    else {
      return this.data.purchases.reduce((a: any, b: any) => {
        return a + (b.pphPercentage * b.dpp) / 100;
      }, 0);
    }
  }

  get pbbkb() {
    if (this.data == null) return 0;
    else {
      const purchases = this.data.purchases.reduce((a: any, b: any) => {
        return a + b.pbbkb;
      }, 0);

      const purchaseDrafts = this.data.purchase_drafts.reduce(
        (a: any, b: any) => {
          return a + b.pbbkb;
        },
        0,
      );

      return purchases + purchaseDrafts;
    }
  }
}
