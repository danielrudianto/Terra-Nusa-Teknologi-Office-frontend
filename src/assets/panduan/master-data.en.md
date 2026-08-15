# Master Data

The reference data used over and over across every document.

Master Data is the single source for suppliers, clients, employees, items, and
equipment. Every document picks from here rather than retyping — so one
correction here applies everywhere.

Because it's shared, a mistake here spreads. A misspelt supplier name will
appear on every PO, purchase, and report that mentions it.

## Before adding anything new

**Search first.** This is the most important rule in this whole menu.

Duplicate entries are the most common problem in master data, and the
consequences aren't immediately visible. "PT Fuji Bolt" and "PT. Fuji Bolt
Indonesia" will count as two different suppliers in every report, and their
transaction history splits in two without anyone noticing.

The search box in each sub-menu searches across columns. Spend ten seconds
making sure the record really isn't there yet.

## Suppliers

Anyone who bills the company: companies and individuals alike.

| Field | Notes |
|---|---|
| Prefix | PT, CV, UD, Personal, and so on |
| Name | Without the prefix; the prefix has its own field |
| Address, City, Province | Printed on PO documents |
| Tax ID | Needed where withholding applies |
| Phone, Email | For contact |
| Goods sold | Helps searching when creating a PO |
| Service area | The area they cover |

Put the **prefix** in its own field, not merged into the name. The system
reassembles it for display, and if the prefix is typed into the name as well,
the result reads "PT PT Fuji Bolt".

## Clients

The parties the company bills. The fields mirror suppliers, without goods and
service area.

**A client's tax ID is required** for clients billed with a tax invoice.
Without it the tax invoice can't be issued and the billing stalls.

## Employees

Data for the people who receive salary slips.

| Field | Notes |
|---|---|
| Name, ID number | The ID number is used on salary slips |
| Date of birth | |
| Position, Department | Printed on the slip |
| Tax category | TK/0 through K/3, sets the non-taxable threshold |
| Start date | |
| Address, Phone, Email | |

The **tax category** here carries into the salary slip and determines the
Article 21 withholding. The category follows the employee's situation at the
start of the tax year, not today.

## Items

The goods catalogue for purchase orders. Used by the PO types that pick goods
from a list — C, F, G, 5.1.1, and 5.1.6.

There's a **CSV import** for loading many items at once. Check the result
afterwards: rows whose format deviates can come in as new items instead of
updating existing ones.

### Favourite items

The **Favourite** column marks frequently used items. The star is pressed
directly from the list, without opening a menu.

Items marked favourite are **listed first** in the item picker when composing a
purchase order. The catalogue is long, and a small part of it is used almost
daily — this moves those to the top instead of requiring the same typing over
and over.

Marking a favourite changes nothing but display order.

## Equipment

The heavy-equipment catalogue for equipment-rental POs (type B): name,
category, capacity, and brand.

This is a catalogue of **equipment types available to rent**, different from
the **Assets** menu which records units the company owns. Rented equipment is
not registered as an asset.

## Counterparties

The parties receiving payment in the **Expenses** menu — the electricity
company, the tax office, or a landlord, for example. Kept separate from
suppliers because they don't issue POs and don't supply goods.

## Deleting master data

Don't delete records that documents have already used. Old documents lose their
reference, and reports that group by supplier or employee come out incomplete.

Delete only entries created by mistake and never used. For problematic
suppliers there's a blacklist flag — better than deleting, because the history
stays intact.
