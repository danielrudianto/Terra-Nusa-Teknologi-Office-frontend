# Salary Slips

Building an employee's monthly salary slip, from base pay through to Article 21
withholding.

Salary slips hold the most sensitive data in TerraBot. Access is restricted,
and it's better not to open them on a screen other people can see.

## The flow

The form is a series of sections on one page:

**Employee → Earnings → Other Allowances → Deductions → Bank & Payment →
Summary & Tax**

## Employee and period

Choose the employee and the period (month and year). Name, ID number, position,
and department fill in from the employee record — if any of it is wrong, fix it
in Master Data → Employees, not here.

### Tax category

This determines the non-taxable threshold, and choosing wrong changes the
Article 21 withholding immediately:

| Code | Meaning |
|---|---|
| TK/0 – TK/3 | Unmarried, with 0–3 dependants |
| K/0 – K/3 | Married, with 0–3 dependants |

The category follows the employee's situation **at the start of the tax year**,
not their situation today. An employee who marries in June keeps their
start-of-year status until the next tax year.

## Earnings

Base salary, then three components calculated as quantity times rate:

| Component | Quantity | Rate |
|---|---|---|
| Meal allowance | How many days | Per day |
| Transport | How many days | Per day |
| Overtime | How many hours | Per hour |

Enter quantity and rate separately, not the product. The breakdown is printed
on the slip, and employees usually check the arithmetic themselves.

## Allowances and deductions

Other allowances are added one at a time — performance bonus, position
allowance, holiday allowance, health allowance, and so on. Deductions likewise:
BPJS, lateness, written warnings, leave.

### The "Counted for withholding" switch

Every allowance and deduction has this switch, and **this is the part most
often got wrong**.

Not every allowance increases the Article 21 tax base, and not every deduction
reduces it. A wrong switch makes the withholding wrong too — and the figure
still looks plausible, so the error usually only surfaces at the annual
reconciliation.

If you're unsure about one component, ask accounting before saving. Guessing
here is more expensive than asking.

## Bank and payment

The employee's destination account: bank name, number, and account name. Plus
the payment method.

Make sure the account name matches what the bank has registered. A salary
transfer rejected for a name mismatch means the employee waits longer.

## Summary and tax

The last section shows **Total salary (gross)**, **Article 21 withholding**,
and **Net salary**. All three are calculated automatically from the entries
above.

Check all three before saving. Once a slip has been created and paid,
correcting it means cancelling the payment — not simply changing a number.

## After the slip is created

The three-dot menu in the list holds:

- **View salary slip** — the full breakdown
- **Create payment** — prepares the salary payment
- **Reprint salary slip** — if it needs printing again
- **Send salary slip** — sends it to the employee

An Article 21 summary across every slip in a period can be pulled from
**Taxation → WHT (Salary)**.
