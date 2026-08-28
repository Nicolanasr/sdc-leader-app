# Scouts des Cèdres Leader App — Master Roadmap & System Status

**Single Source of Truth (SSOT)** for completed features, active modules, and prioritized roadmap specifications.

---

## 🏛️ System Architecture & Roles

```
Commissariat (e.g. Commissariat de Beyrouth)
 └── Scout Group (e.g. Groupe St. Jean)
      ├── Group Leadership (Adult Leaders / Council)
      │    ├── Chef de Groupe (Group Leader)
      │    ├── Assistant Chef de Groupe
      │    ├── Amin Serr (Group Secretary)
      │    ├── Amin Sandou2 (Group Treasurer)
      │    ├── Amin Tejhizet (Quartermaster / Logistics)
      │    ├── Mas2oul Mounet (Food & Camp Provisions)
      │    ├── Mas2oul Toswir (Media / Photography)
      │    └── Ka2ed Idare (Administrative Council Leader)
      │
      └── Troops / Units (Fera2: Jaramiz, Zaharat, Kechefe, Mourchidet, Jouwele, Mounjidet)
           ├── Troop Leadership
           │    ├── Ka2ed Fer2a (Troop Leader)
           │    └── Mouse3ed Ka2ed Fer2a (Assistant Troop Leader)
           │
           └── Patrols / Sizaines (Youth Units)
                ├── Youth Ranks (3arif Awwal, 3arif, Mse3ed 3arif, Sadous, Ra2ed, etc.)
                └── Youth Roles (Amin Serr, Sandou2, Tejhizet)
```

---

## ✅ Completed Modules

| Module | Route | Status | Key Features Delivered |
| :--- | :--- | :---: | :--- |
| **Finances & Treasury** | `/group/dashboard/finances` | **Complete** | • **Troop Dues**: Mobile single-month stepper, progress metric, quick-jump pills, 1-tap quick pay, full-year matrix toggle.<br>• **Troop Vaults & Handovers**: Virtual balance per troop, handover submission & approval flow.<br>• **Troop Disbursements**: Fund request & cash advance flow.<br>• **Annual Cotisations**: Sibling discounts (100%, 20% off 2nd, 50% off 3rd+), restricted to Treasurer.<br>• **Group Treasury Ledger**: Mobile cards, search, category presets & custom free-text.<br>• **Monthly Statement (*Kashf Hisab*)**: USD/LBP multi-currency, Group Leader approval workflow, clean print/PDF layout. |
| **Youth Members** | `/group/dashboard/members` | **Complete** | • Youth scout roster with troop & patrol filters.<br>• Section-specific ranks (Jaramiz, Zaharat, Kechefe, Mourchidet, Jouwele).<br>• Multiple emergency contacts, medical records, blood types, parent jobs & phones.<br>• Sibling linking for multi-child discounts.<br>• Member audit history & advancement logs. |
| **Attendance** | `/group/dashboard/attendance` | **Complete** | • Weekly troop meeting roll-calls and leadership meetings.<br>• 1-tap status toggling (Present, Absent, Late, Excused with reason dropdown).<br>• Patrol (*Taliaa*) filtering and session management. |
| **Events & Camps** | `/group/dashboard/events` | **Complete** | • Calendar & event listings with iCal mobile subscription feed.<br>• Dedicated **Event Workspace** (`/events/[id]`): Leader staffing roles, scout participant consents & fee tracking, event budget & categorized expenses, tagged document uploads. |
| **Leader Onboarding** | `/group/dashboard/leaders` | **Complete** | • Leader directory with assigned roles and permission scopes.<br>• Multi-role assignments and automatic credential generation. |
| **Troop Setup** | `/group/dashboard/troops` | **Complete** | • Troop creation, unit naming, and dynamic section type associations. |
| **Quartermaster & Inventory** | `/group/dashboard/inventory` | **Complete** | • **Per-Condition Quantity Status Breakdown**: Items track explicit counts per condition tier (`🟢 Good`, `🟡 Fair`, `🟠 Needs Repair`, `🔴 Damaged`). Total stock and usable available loan stock (`Good + Fair`) are automatically maintained across all workflows.<br>• **Equipment Catalog**: 14 category presets + custom categories, search, multi-select category/location/condition filters, multi-badge condition display, storage locations, unit assignments. Restricted to Group Leader & Quartermaster.<br>• **Mobile-First Activity Folders**: Lending list grouped by Camp/Event or Troop Unit folders with collapsible accordions, status breakdown badges, and item drill-downs.<br>• **Quick Stock Count (*Jard El Tejhizet*)**: Rapid mobile audit mode walking depot shelf-by-shelf, live verification progress bar, 4-tier condition steppers, 1-tap "✓ Match" buttons, discrepancy flags (`⚠️ Missing` / `➕ Extra`), and batch audit saving.<br>• **Batch Actions & Fast Approval**: 1-tap `Approve All Pending`, `Return All`, and `Check-In All Returned` with action sheet confirmation dialogs and live spinners.<br>• **Mobile Item Basket**: Swipeable category chips, instant live search, inline quantity steppers on item cards, and automatic event dates prefill.<br>• **Permission Scopes**: Troop leaders locked to their assigned troop; unassigned leaders restricted to leading events; Catalog tab hidden from regular leaders.<br>• **2-Step Return Verification Flow**: Requester marks items as `return_pending` $\rightarrow$ Quartermaster inspects physical return condition breakdown, logs notes, and confirms stock replenishment across tiers.<br>• **Event Workspace Integration**: Dedicated `Equipment & Logistics` tab (`/events/[id]`) to view, request, and manage gear directly for camps.<br>• **Decommission / Write-Off Workflow**: Partial quantity write-off requests prioritizing damaged stock with `Pending Write-Off` badge, Group Leader (*Chef de Groupe*) approval/rejection, and permanent archived audit log (*Sijill El Itlaf*). |
| **Camp Provisions & Meal Planning** | `/group/dashboard/events/[id]` & `/group/dashboard/inventory` | **Complete** | • **Group Central Pantry (*Mounet El Fawj*)**: Bulk non-perishable consumables inventory (Grains, Pasta, Canned Goods, Spices & Oils, Beverages, Kitchen Consumables, Hygiene) with minimum stock alerts, quick stock counters, and category pills.<br>• **Sub-Tab 1: Daily Menu Planner**: Multi-day camp switcher with default 4 meal slots per day (*Breakfast*, *Lunch*, *Dinner*, *Campfire Sahra & Snacks*), + Add Day stepper, and + Add Custom Meal dialog.<br>• **Authentic Lebanese Scout Recipe Library**: 15 built-in camp recipe templates with per-person portion multipliers auto-scaled to confirmed camp attendees ($Portion \times Headcount$).<br>• **Sub-Tab 2: Master Ingredients & Dual Sourcing**: Cross-camp aggregated ingredients calculator comparing total needed items against Group Central Pantry stock with 1-tap "Request from Pantry" and 1-tap "Auto-Generate Shopping List".<br>• **Sub-Tab 3: Mobile Grocery Shopping Checklist**: Grocery items grouped by store sections (*Bakery*, *Butchery & Meat*, *Produce & Vegetables*, *Supermarket & Dairy*, *Supplies*), 1-touch `[✓] Purchased` toggle with strikethrough animation, live completion progress bar, filter chips (*All*, *Pending*, *Purchased*), and ad-hoc item creator.<br>• **Role Scoping**: Access granted to Group Leader (`chef_groupe`, `assistant_chef_groupe`), Group Provisions Leader (`amin_mounet_group`), Camp Leader (`ka2ed_mouskhayyam`), and Camp Provisions Leader (`mas2oul_mounet`, `amin_mounet`, `mas2oul_matbakh`). |
| **Configurator** | `/configurator` | **Complete** | • System administration for commissariats, groups, roles, and ranks. |

---

## 📋 Prioritized Pending Roadmap Specifications

### 1. 📸 Media & Photography Portal (*Mas2oul Toswir*)
* **Event Workspace Integration**: Dedicated **"Photos & Media"** tab inside each event workspace linking directly to high-res Google Drive folders, public photo albums, and media coverage notes.

---

### 2. 📄 Receipt & Invoice Uploads (Google Drive)
* **Direct Google Drive Uploads**: Direct camera snapshot / file upload to Google Drive for Treasury transactions, Troop Disbursements, and Event Expenses via the Google Drive API integration.

---

### 3. 📊 Advancement & Reports
* **Attendance Percentage**: Auto-computed yearly attendance rate per scout for badge & rank advancement eligibility.
* **1-Click Spreadsheet Exports**: CSV/Excel export for the Scout Dues Matrix and Treasury General Ledger.
