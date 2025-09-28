import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import {
  Alignment,
  Margins,
  PageOrientation,
  PageSize,
} from 'pdfmake/interfaces';
import { v4 } from 'uuid';

pdfMake.vfs = pdfFonts.vfs;

export interface ISalarySlip {
  name: string;
  nik: string;
  department: string;
  position: string;
  address: string;
  taxCategory: string;
  taxAmount: number;
  basicSalary: number;
  transportationAllowanceQuantity: number;
  transportationAllowanceRate: number;
  mealAllowanceQuantity: number;
  mealAllowanceRate: number;
  overtimeQuantity: number;
  overtimeRate: number;
  paymentMethod: string;
  year: number;
  month: number;
  monthName: string;
  otherAllowances: {
    name: string;
    description: string;
    amount: number;
  }[];
  deductions: {
    name: string;
    description: string;
    amount: number;
  }[];
  bankAccountName: string;
  bankAccountNumber: string;
  bankName: string;
}

export class SalarySlipHelper {
  static createProxyPaymentPDF(data: ISalarySlip) {
    const tableBody: any[] = [
      [
        {
          text: 'Gaji pokok',
        },
        {
          text: '1',
        },
        {
          text: 'LS',
        },
        {
          text: data.basicSalary.toLocaleString('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
        },
        {
          text: data.basicSalary.toLocaleString('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
        },
      ],
      [
        {
          text: 'Tunjangan uang makan',
        },
        {
          text: data.mealAllowanceQuantity.toLocaleString('id-ID'),
        },
        {
          text: 'hari',
        },
        {
          text: data.mealAllowanceRate.toLocaleString('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
        },
        {
          text: (
            data.mealAllowanceRate * data.mealAllowanceQuantity
          ).toLocaleString('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
        },
      ],
      [
        {
          text: 'Tunjangan transportasi',
        },
        {
          text: data.transportationAllowanceQuantity.toLocaleString('id-ID'),
        },
        {
          text: 'hari',
        },
        {
          text: data.transportationAllowanceRate.toLocaleString('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
        },
        {
          text: (
            data.transportationAllowanceQuantity *
            data.transportationAllowanceRate
          ).toLocaleString('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
        },
      ],
      [
        {
          text: 'Uang makan lembur',
        },
        {
          text: data.overtimeQuantity.toLocaleString('id-ID'),
        },
        {
          text: 'hari',
        },
        {
          text: data.overtimeRate.toLocaleString('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
        },
        {
          text: (data.overtimeRate * data.overtimeQuantity).toLocaleString(
            'id-ID',
            {
              style: 'currency',
              currency: 'IDR',
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }
          ),
        },
      ],
      [
        {
          text: 'Pendapatan lain',
          bold: true,
          colSpan: 5,
        },
        {},
        {},
        {},
        {},
      ],
    ];

    if (data.otherAllowances.length == 0) {
      tableBody.push([
        {
          text: 'Tidak ada pendapatan lain',
          colSpan: 5,
        },
        {},
        {},
        {},
        {},
      ]);
    } else {
      data.otherAllowances.forEach((x) => {
        tableBody.push([
          {
            text: `${x.name}\n${x.description}`,
            colSpan: 3,
          },
          {},
          {},
          {
            text: x.amount.toLocaleString('id-ID', {
              style: 'currency',
              currency: 'IDR',
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
          },
          {
            text: x.amount.toLocaleString('id-ID', {
              style: 'currency',
              currency: 'IDR',
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
          },
        ]);
      });
    }

    tableBody.push([
      {
        text: 'Jumlah pendapatan',
        bold: true,
        colSpan: 4,
      },
      {},
      {},
      {},
      {
        text: (
          data.basicSalary +
          data.mealAllowanceQuantity * data.mealAllowanceRate +
          data.transportationAllowanceQuantity *
            data.transportationAllowanceRate +
          data.overtimeQuantity * data.overtimeRate +
          data.otherAllowances.reduce((a, b) => {
            return a + b.amount;
          }, 0)
        ).toLocaleString('id-ID', {
          style: 'currency',
          currency: 'IDR',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      },
    ]);

    const tableDeductionBody = [];

    if (data.deductions.length == 0) {
      tableDeductionBody.push([
        {
          text: 'Tidak ada pengurangan',
          colSpan: 5,
        },
        {},
        {},
        {},
        {},
      ]);
    } else {
      data.deductions.forEach((x) => {
        tableDeductionBody.push([
          {
            text: `${x.name}\n${x.description}`,
            colSpan: 3,
          },
          {},
          {},
          {
            text: x.amount.toLocaleString('id-ID', {
              style: 'currency',
              currency: 'IDR',
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
          },
          {
            text: x.amount.toLocaleString('id-ID', {
              style: 'currency',
              currency: 'IDR',
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
          },
        ]);
      });
    }

    tableDeductionBody.push([
      {
        text: 'Jumlah pengurangan',
        bold: true,
        colSpan: 4,
      },
      {},
      {},
      {},
      {
        text: data.deductions
          .reduce((a, b) => {
            return a + b.amount;
          }, 0)
          .toLocaleString('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
      },
    ]);

    const summaryTableBody = [
      [
        {
          text: 'Jumlah gaji sebelum pajak',
          bold: true,
          colSpan: 4,
        },
        {},
        {},
        {},
        {
          text: (
            data.basicSalary +
            data.mealAllowanceQuantity * data.mealAllowanceRate +
            data.transportationAllowanceQuantity *
              data.transportationAllowanceRate +
            data.overtimeQuantity * data.overtimeRate +
            data.otherAllowances.reduce((a, b) => {
              return a + b.amount;
            }, 0) -
            data.deductions.reduce((a, b) => {
              return a + b.amount;
            }, 0)
          ).toLocaleString('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
        },
      ],
      [
        {
          text: 'PPh21',
          bold: true,
          colSpan: 4,
        },
        {},
        {},
        {},
        {
          text: data.taxAmount.toLocaleString('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
        },
      ],
      [
        {
          text: 'Jumlah Gaji dibayarkan',
          bold: true,
          colSpan: 4,
        },
        {},
        {},
        {},
        {
          text: (
            data.basicSalary +
            data.mealAllowanceQuantity * data.mealAllowanceRate +
            data.transportationAllowanceQuantity *
              data.transportationAllowanceRate +
            data.overtimeQuantity * data.overtimeRate +
            data.otherAllowances.reduce((a, b) => {
              return a + b.amount;
            }, 0) -
            data.deductions.reduce((a, b) => {
              return a + b.amount;
            }, 0) -
            data.taxAmount
          ).toLocaleString('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
        },
      ],
    ];

    var dd = {
      pageSize: 'A4' as PageSize,
      pageOrientatation: 'portrait' as PageOrientation,
      pageMargins: [40, 20, 40, 20] as Margins,
      fontSize: 12,
      content: [
        {
          text: 'SLIP GAJI',
          bold: true,
          alignment: 'center' as Alignment,
        },
        {
          text: `Periode ${data.monthName} ${data.year}`,
          alignment: 'center' as Alignment,
          margin: [0, 5, 0, 20] as Margins,
        },
        // Create table
        {
          table: {
            headerRows: 0,
            widths: [200, '*'],
            body: [
              [{ text: 'Nama' }, { text: `: ${data.name}` }],
              [
                { text: 'Jabatan' },
                { text: `: ${data.position} ${data.department}` },
              ],
              [{ text: 'Status TK' }, { text: `: ${data.taxCategory}` }],
              [{ text: 'NIK' }, { text: `: ${data.nik}` }],
            ],
          },
          layout: {
            hLineColor: function (i: any, x: any) {
              return 'gray';
            },
            hLineWidth: function (i: any, x: any) {
              return 0.5;
            },
            vLineWidth: function (i: any, x: any) {
              return 0;
            },
          },
        },
        {
          text: 'Pendapatan',
          bold: true,
          margin: [0, 20, 0, 15] as Margins,
        },
        {
          table: {
            headerRows: 0,
            widths: ['*', 20, 30, 100, 100],
            body: tableBody,
          },
          layout: {
            hLineColor: function (i: any, x: any) {
              return 'gray';
            },
            hLineWidth: function (i: any, x: any) {
              return 0.5;
            },
            vLineWidth: function (i: any, x: any) {
              return 0;
            },
          },
        },
        {
          text: 'Pengurangan',
          bold: true,
          margin: [0, 20, 0, 15] as Margins,
        },
        {
          table: {
            headerRows: 0,
            widths: ['*', 20, 30, 100, 100],
            body: tableDeductionBody,
          },
          layout: {
            hLineColor: function (i: any, x: any) {
              return 'gray';
            },
            hLineWidth: function (i: any, x: any) {
              return 0.5;
            },
            vLineWidth: function (i: any, x: any) {
              return 0;
            },
          },
        },
        {
          text: 'Rekapitulasi Data',
          bold: true,
          margin: [0, 20, 0, 15] as Margins,
        },
        {
          table: {
            headerRows: 0,
            widths: ['*', 20, 30, 100, 100],
            body: summaryTableBody,
          },
          layout: {
            hLineColor: function (i: any, x: any) {
              return 'gray';
            },
            hLineWidth: function (i: any, x: any) {
              return 0.5;
            },
            vLineWidth: function (i: any, x: any) {
              return 0;
            },
          },
        },
        {
          text: 'Dibayarkan melalui',
          bold: true,
          margin: [0, 20, 0, 15] as Margins,
        },
        {
          table: {
            widths: ['*', 250],
            body: [
              [
                {
                  text: 'Dibayarkan melalui:',
                  colSpan: 2,
                },
                {},
              ],
              [
                {
                  text: 'Bank',
                },
                {
                  text: `: ${data.bankName}`,
                },
              ],
              [
                {
                  text: 'Nomor Rekening',
                },
                {
                  text: `: ${data.bankAccountNumber}`,
                },
              ],
              [
                {
                  text: 'Nama Akun',
                },
                {
                  text: `: ${data.bankAccountName}`,
                },
              ],
            ],
          },
          layout: {
            hLineColor: function (i: any, x: any) {
              return 'gray';
            },
            hLineWidth: function (i: any, x: any) {
              return 0.5;
            },
            vLineWidth: function (i: any, x: any) {
              return 0;
            },
          },
        },
        {
          text: ' ',
          bold: true,
          margin: [0, 20, 0, 15] as Margins,
        },
        {
          table: {
            headerRows: 0,
            widths: ['*', '*', '*'],
            body: [
              [
                {
                  text: 'Dibuat oleh\n\n\n\n\n\n\n\n',
                },
                {
                  text: 'Diperiksa oleh\n\n\n\n\n\n\n\n',
                },
                {
                  text: 'Disetujui oleh\n\n\n\n\n\n\n\n',
                },
              ],
            ],
          },
          layout: {
            hLineColor: function (i: any, x: any) {
              return 'gray';
            },
            hLineWidth: function (i: any, x: any) {
              return 0.5;
            },
            vLineWidth: function (i: any, x: any) {
              return 0;
            },
          },
        },
      ],
    };

    return pdfMake.createPdf(dd).open();
  }
}
