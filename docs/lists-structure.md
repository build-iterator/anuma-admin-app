# Lists — business control center structure

Status 2026-07-14 (pass 2): the shell now mirrors the merchant app's **v1 skeleton
frame** (dark #1b1b1b base, 76px icon rail with the Morse-A mark, white rounded-[16px]
sheet, breadcrumb header with ⌘K pill, amber "Admin App" banner + user thumbnail).
Lists gained: a #fafafa sub-nav column with a dashed **"+ New list"** affordance
(runtime lists persist to localStorage, core schema + generic stage ladder),
**segments** (registry-defined tabs with counts), **saved views** (star chips that
freeze segment+filters+search+view), **filters**, a **board view** (kanban by the
list's stage field), and a **condensed signal table** (entity + fit-score meter +
tier/stage pills + reach icons + trust facts + next action + owner dot — the full
enriched record stays behind the row in the peek panel). A design-only **sign-in
page** lives at /login on the same dark frame (Google button awaiting teamOS SSO;
email+code mocked with 000000). AG Grid remains only on Merchants. Import wizard
still open. Frontend-only: no APIs, no business logic; persistence is seeds + a
localStorage overlay behind `pages/lists/lib/store.js`.

Status 2026-07-14 (pass 3 — the write path): every state change goes through
`lib/actions.js` (patch + timeline event, always together). Cockpit edits stage /
owner / next action in place; temperature can be overruled (override wins over the
derived read, "Auto" restores it). "Done → next stage" advances one rung and books a
+3d follow-up (also on row hover in the table); Snooze pushes the date. Due dates are
live: overdue red / today amber in table, cockpit and sort. "+ Add" quick-creates a
record (opens its cockpit); checkbox selection drives a bulk bar (assign owner / set
stage across N rows). Still single-player (localStorage) — multiplayer is the first
backend feature.

Status 2026-07-14 (pass 4 — three-tier IA + generated CRMs): after testing Attio
against Neil's real inbox (connection strength "Very weak" everywhere), the decision
is to build, not buy — our drivers are generated (fit / size / category / sellable-to),
not interaction-derived, and the CRM is generated on the fly. New IA:
**Leads** (`/leads/:listId` — the generated, disposable outbound lists; everything from
passes 1–3 lives here) ≠ **Records** (`/records/companies|contacts` — the durable graph,
DERIVED live from all lead lists, deduped by domain/name and email/phone, each record
linking back to its leads with temperature) ≠ **Tenants** (`/tenants` — merchants with
Anuma infra). CSV loading is real: "Load list" in the Leads sub-nav creates a list from
a generated CSV (hand-rolled parser in `lib/csv.js`, header auto-mapping onto the field
vocabulary, unknown columns become ad-hoc fields); "Import CSV" on a list appends.
Legacy /lists and /merchants paths redirect. Iterator context: Sales Nav + Instantly +
Apollo haven't worked; outbound here runs on loaded fit-scored lists instead.

Identity note: teamOS already does Google SSO and knows the active teammates. Plan is
to extract that as a shared identity service later (SSO + team roster consumed by both
apps); the sidebar/topbar user block and the `owner` select options are the surfaces it
will replace. Needs OAuth/backend wiring, so explicitly out of the frontend-only scope.

Sparring doc. This defines the skeleton for the CRM-lists layer of the
admin app ("business control center"): the simplest Airtable/Attio we can ship frontend-only,
covering **import + view**. Outreach comes later and is deliberately out of scope.

## What we're building (one paragraph)

A new **Lists** section in the admin app, sitting beside the existing tenant pages
(Dashboard, Merchants). Each list is a self-contained table of companies with its own
schema, seeded/extended by CSV import, viewed through a filterable table with a record
peek panel. Three lists to start: **JBX Shopify App**, **Anuma**, **Iterator**.

## What we take from JoyBox CRM (structure, not code)

Janardhan's overnight build gets the shape right for a v0:

- One entity per list (companies), no linked-records graph — that's the Airtable trap we skip.
- Filter bar of a few high-signal dropdowns (type / category / stage / owner / plan) + add button.
- Table and Board as views over the same records.
- Feels alive: inline edit, saved indicator.

What we do differently:

- **Three lists, not one** — lists are first-class, each with its own schema and seed.
- Import is a real flow (CSV → map → preview → commit), not hand-entered rows.
- Built inside the admin app shell, on the conventions we already have (AG Grid, shadcn sidebar).

## Navigation

```
Dashboard
Management
  Merchants            ← existing, untouched
Lists                  ← new sidebar group
  JBX Shopify App
  Anuma
  Iterator
```

The sidebar group is rendered from the lists registry, not hardcoded — adding a fourth list
is a data change, not a nav change.

## Routes

```
/lists                      → overview: one card per list (record count, last import)
/lists/:listId              → table view (default)
/lists/:listId?view=board   → board view, grouped by the list's stage field (phase 2)
/lists/:listId/import       → import wizard
```

Record detail is a **peek panel** (Attio-style right drawer over the table), not a route page.
Keeps you in the list context; a route page adds nothing at this stage.

## Data model

Three concepts, all plain JS objects:

```
List    { id, name, slug, description, fields: Field[], defaultVisibleFields: [key] }
Field   { key, label, type, options?, width? }
Record  { id, listId, values: { [fieldKey]: value }, source, createdAt, updatedAt }
```

Field types for v0: `text`, `url`, `email`, `phone`, `number`, `date`,
`select` (single, with options + colors → renders as badge), `notes` (long text).
No formulas, no linked records, no attachments.

**Schemas are per-list** (true to Airtable — each list owns its fields), but all three share
a conventional core so cross-list muscle memory works:

| Core field | Type | Notes |
|---|---|---|
| `company_name` | text | primary column, always pinned left |
| `website` | url | |
| `contact_name` / `contact_role` | text | |
| `email` / `phone` / `whatsapp` | email / phone | |
| `city` / `state` | text | |
| `type` or `category` | select | the JoyBox "All types" filter |
| `stage` | select | pipeline stage — drives filters and future board view |
| `owner` | select | Janardhan / Anu / Neil |
| `source` | text | where the row came from |
| `next_action` / `next_action_date` | text / date | |
| `notes` | notes | |

Everything beyond the core is list-specific (see seeds below).

## Persistence (frontend-only)

**Seed files + localStorage overlay.**

- Each list ships a seed: `pages/lists/data/<list>.seed.js` (checked in, like `merchants/data.js`).
- All mutations (imports, inline edits) write to a localStorage overlay keyed by list id.
- A single `listsStore` module is the only thing that touches storage — pages call
  `getRecords(listId)` / `importRecords(listId, rows)` / `updateRecord(...)`.
  When the backend arrives, we swap this module's internals for API calls and nothing
  above it changes.

Accepted tradeoff: data is per-browser and not shared between the three of us. That's fine
for import-and-view v0; sharing is exactly when the backend enters.

## The three lists

### 1. Anuma — corp-gifting sellers (supply side)

Seeded from `anuma-corp-gifting-onboarding-sellers.csv` (48 rows, 40 columns of IndiaMART
factsheet scrape). All 40 columns import into `values` and show in the peek panel; the
**table shows ~10 by default**:

> Company Name · City · Category · Account Tier · Fit Score · Pipeline Stage ·
> Phone/WhatsApp · TrustSEAL · Next Action · Notes

List-specific fields worth keeping as real selects (not just text): `account_tier` (A/B/C),
`pipeline_stage` (Signal → Contacted → Demo → Onboarding → Live — confirm the ladder),
`wave`, `indiamart_tier`.

### 2. JBX Shopify App — DTC brands (JoyBox demand side)

No seed data yet — starts empty, populated by import. Proposed extras beyond core:
`shopify_domain` (url), `app_status` (select: Prospect / Installed / Active / Churned),
`plan` (select), `monthly_orders` (number).

### 3. Iterator — brand & agency pipeline

The successor to what JoyBox CRM holds today (structure only; we're not migrating its data
for now). Extras beyond core: `type` (select: DTC / Brand / Agency), `plan` (select),
`deal_size` (number, later).

## Import flow

Mirrors the merchant app's import-files wizard, cut down to what a CSV needs:

```
source  → drop/pick a .csv (parse in-browser, papaparse)
map     → CSV column → list field; auto-match by header similarity;
          unmapped columns become ad-hoc text fields (import everything, hide by default)
review  → preview first N rows, dedupe warning on company_name + phone collisions
done    → commit to store, land on the table filtered to "just imported"
```

## Directory skeleton (in this repo)

Follows the existing `pages/<domain>/` convention; everything new stays under
`pages/lists/` — no additions to shared `components/ui`.

```
src/pages/lists/
  index.jsx               // /lists overview cards
  list.jsx                // /lists/:listId table view
  registry.js             // the 3 list definitions (schemas, visible columns)
  data/
    anuma.seed.js         // generated from the CSV
    jbx-shopify.seed.js   // empty
    iterator.seed.js      // empty
  lib/
    store.js              // seed + localStorage overlay, swap-for-API later
    csv.js                // parse + header auto-matching
  components/
    list-table.jsx        // AG Grid wrapper (reuse merchants-page patterns)
    filter-bar.jsx        // search + select-field dropdowns, derived from schema
    record-panel.jsx      // peek drawer, grouped field display, inline edit
    field-cell.jsx        // per-type renderers (badge, url, phone, date)
  import/
    index.jsx             // wizard shell  (/lists/:listId/import)
    steps/{source,map,review,done}.jsx
```

New dependency: `papaparse`. Everything else (AG Grid, shadcn, router) is already here.

## Explicitly out of scope for v0

Outreach/sequences, board view (stub the switcher or omit), linked records, saved views,
multi-select fields, auth, backend persistence, migrating JoyBox CRM's existing data.

## Open questions to spar on

1. **Stage ladders** — one shared stage vocabulary across all three lists, or per-list?
   (Doc assumes per-list; the CSV's "Signal" suggests Anuma has its own ladder already.)
2. **Anuma default columns** — is the ~10-column pick above right, or do you want
   Wave / GST signals visible by default?
3. **localStorage tradeoff** — OK that edits/imports are per-browser until a backend, or
   is shared-across-three-people a v0 requirement (which changes the plan materially)?
4. **JBX Shopify App list** — is the row a *brand considering/using the app*, and is
   `app_status` the stage that matters? Or is this closer to an installs table?
5. **Board view** — omit entirely in v0, or ship the Table/Board switcher with Board stubbed?
6. **Sidebar placement** — `Lists` as its own group (as drawn), or nested under a broader
   "CRM" label to leave room for Outreach later?
