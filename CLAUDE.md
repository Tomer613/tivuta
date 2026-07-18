# Tivuta — Project Knowledge Base

> This file is the canonical reference for future Claude conversations on this project.
> Update it whenever significant architecture or feature decisions are made.

---

## What is Tivuta?

A full-stack platform for the Haredi (Ultra-Orthodox Jewish) community in Israel. It combines:
- A **multi-vertical marketplace** (diamonds, cars, insurance) with appointment/contact-request flows
- A **benefits club** (legacy `/benefits` section) with categories, items, and monthly featured deals
- A **back-office admin panel** for managing products, promotions, users, surveys, and distribution campaigns
- A **multilingual UI** supporting Hebrew (primary), English, French, and Yiddish

---

## Repository Structure

```
tivuta/
├── backend/          FastAPI + SQLAlchemy backend
│   ├── app/
│   │   ├── main.py           FastAPI app, CORS, router registration
│   │   ├── database.py       SQLAlchemy engine + SessionLocal
│   │   ├── models.py         All ORM models
│   │   ├── schemas.py        All Pydantic schemas
│   │   ├── security.py       JWT auth, get_current_user, get_current_admin, get_db
│   │   ├── routers/
│   │   │   ├── auth.py          Login, register, forgot/reset password
│   │   │   ├── users.py         User CRUD, role management, password change, admin stats
│   │   │   ├── catalog.py       Legacy benefits: categories, items, trending
│   │   │   ├── products.py      Multi-vertical product CRUD + listing + duplicate + CSV import
│   │   │   ├── promotions.py    Promotion CRUD + product assignment
│   │   │   ├── leads.py         Leads + assignment + conversion stats + follow-up reminders + appointment reminders
│   │   │   ├── surveys.py       Poll creation, voting, admin
│   │   │   ├── distributions.py Email/WhatsApp campaign creation & sending
│   │   │   ├── favorites.py     User favorites (wishlist) — GET/POST/DELETE
│   │   │   ├── notifications.py In-app notifications — list, unread-count, mark-read
│   │   │   ├── reviews.py       Product rating & review upsert + admin approval
│   │   │   ├── vendors.py       Admin CRUD for vendors (physical stores/suppliers per vertical)
│   │   │   └── sales.py         Loyalty program: admin-manual sale reporting, system settings (Phase 1)
│   │   └── services/
│   │       ├── email_resend.py    Resend.com email provider
│   │       ├── whatsapp_meta.py   Meta WhatsApp Business API
│   │       ├── notifications.py   Generic dispatcher
│   │       └── loyalty.py         Customer-number generation, system-setting lookup, points/commission math
│   ├── alembic/           Migrations (Alembic)
│   │   └── versions/
│   │       ├── 1fcde320168b_initial_schema.py
│   │       ├── d71018332029_add_promotions_tables.py
│   │       ├── 13b4eb6e945d_add_promotion_entries.py
│   │       ├── b0ede4d6750e_add_user_profile_fields.py
│   │       ├── 94565c01c960_add_id_number_club_membership.py
│   │       ├── 99977981cac4_membership_tracks_json.py
│   │       ├── a3f1c2d8e9b0_add_favorites_notifications_lead_assign.py
│   │       ├── a4b2c3d1e8f0_add_reviews_lead_history_scheduled_dist.py
│   │       ├── b5c3d4e2f9a1_add_view_count_notif_prefs_dist_filters.py
│   │       ├── c6d4e5f3a0b2_add_vendors.py
│   │       └── 15f5ddaec4a5_add_loyalty_points_system.py  ← newest
│   ├── alembic.ini
│   └── .venv/             Python virtual environment
│
└── frontend/         Next.js 16 App Router frontend
    ├── src/
    │   ├── app/
    │   │   ├── benefits/[locale]/   Legacy benefits club pages
    │   │   └── [locale]/
    │   │       ├── (public)/        login, register, forgot/reset password
    │   │       └── (protected)/
    │   │           ├── page.tsx         Home/dashboard (has NotificationBell + SurveyWidget)
    │   │           ├── profile/         User profile, activity history, favorites, password change
    │   │           ├── diamonds/        Vertical listing (comparison bar, wishlist)
    │   │           ├── cars/
    │   │           ├── insurance/
    │   │           ├── survey/[id]/     Survey voting
    │   │           └── admin/
    │   │               ├── layout.tsx   Nav tabs (Dashboard, Products, Users, Surveys, Distribution, Promotions)
    │   │               ├── page.tsx     Dashboard: stats, 14-day leads chart, conversion panel, follow-up trigger
    │   │               ├── products/    Product CRUD + duplicate + CSV import
    │   │               ├── users/       User + role management
    │   │               ├── surveys/     Survey creation + vote stats
    │   │               ├── leads/       Leads table (notes, assignment, appointment reminder) + calendar view
    │   │               ├── distribution/ Email/WhatsApp campaigns
    │   │               └── promotions/  Promotion CRUD + product assignment
    │   ├── components/
    │   │   ├── ProductTile.tsx          Product card (promotion badge, wishlist heart, WhatsApp share, detail modal)
    │   │   ├── VerticalListingClient.tsx Product grid with filter sidebar + comparison bar
    │   │   ├── ComparisonBar.tsx        Fixed bottom bar comparing up to 3 products side-by-side
    │   │   ├── NotificationBell.tsx     Dropdown bell — polls /notifications every 60s, mark-read support
    │   │   ├── FilterSortSidebar.tsx    Search + price range + sort + promotion filter
    │   │   ├── AppointmentModal.tsx     Date picker for appointments
    │   │   ├── AdminGuard.tsx           Blocks non-admin users
    │   │   └── AuthGate.tsx             Blocks unauthenticated users
    │   ├── context/
    │   │   └── AuthContext.tsx          JWT in localStorage ('tivuta_token'), /users/me fetch
    │   └── lib/
    │       └── api.ts                   All API calls (BASE_URL from NEXT_PUBLIC_API_URL)
    ├── next.config.ts    output: 'export' (static site for GitHub Pages)
    └── public/images/products/   Product images (referenced by filename only)
```

---

## Database Schema

All tables live in SQLite (dev) / PostgreSQL via Supabase (prod).

| Table | Purpose |
|---|---|
| `users` | Auth accounts; `role`: `member` \| `admin` |
| `categories` | Top-level benefits categories (slug-based routing) |
| `sub_categories` | Nested under categories |
| `items` | Legacy benefits catalog (linked to sub_categories) |
| `orders` | User transaction history for dashboard |
| `products` | Multi-vertical catalog (diamonds/cars/insurance); has `attributes JSON` for vertical-specific fields |
| `promotions` | Promotion definitions: type, channel, config JSON, dates |
| `product_promotions` | Junction table linking products ↔ promotions (many-to-many) |
| `leads` | Appointment/contact requests; `assigned_to FK→users.id` for admin assignment |
| `surveys` | Polls shown to users |
| `survey_options` | Options within a survey (each links to a product) |
| `survey_votes` | One vote per user per survey |
| `distributions` | Broadcast campaigns (survey or daily_deal); channels: email, whatsapp |
| `distribution_send_logs` | Per-user send status for each campaign |
| `favorites` | User wishlist; `UniqueConstraint(user_id, product_id)`; CASCADE deletes |
| `notifications` | In-app notifications per user; `type`: `lead_status` \| `appointment_reminder` \| `system` \| `followup` \| `points_earned`; `is_read`, `link` fields |
| `reviews` | Product rating (1–5) + comment; `UniqueConstraint(user_id, product_id)` — upsert semantics |
| `vendors` | Physical store/supplier per vertical; products optionally belong to one via `Product.vendor_id`; also carries loyalty-program fields (see below) |
| `system_settings` | Flat key/value config (e.g. `point_value_ils`) — see Loyalty Program section |
| `sale_transactions` | Ledger of in-store sales reported for a vendor+customer(+product); drives points + commission |
| `points_ledger_entries` | Append-only per-user points history (accrual/redemption/adjustment/clawback) |
| `commission_settlement_periods` | Admin-driven periodic reconciliation of vendor commission owed |

---

## Promotions System

Built in session 2026-07-03. Architecture: **separate `promotions` table + Many-to-Many via `product_promotions`**.

### Promotion types (`type` field)
| Type | Config keys | Display label |
|---|---|---|
| `first_n` | `limit`, `participants_count` | "500 ראשונים" |
| `raffle` | `winner_count`, `participants_count` | "הגרלה" |
| `percentage_discount` | `percentage` | "20% הנחה" |
| `fixed_discount` | `amount` | "₪50 הנחה" |
| `flash_sale` | `discount_percentage` | "פלאש סייל" |

### Channels
`online` | `physical` | `both`

### How it flows
1. Admin creates a promotion via `POST /admin/promotions`
2. Admin assigns products via `POST /admin/promotions/{id}/products` (body: `{product_ids: [...]}`)
3. `GET /products` returns each product with its `promotions: [PromotionBrief]` array (only `is_active=true` and non-expired)
4. `ProductTile` renders a gold badge (top-right) if `promotions.length > 0`

### Backend files
- `backend/app/models.py` — `Promotion` class, `product_promotions_table` (Table object for secondary M2M)
- `backend/app/schemas.py` — `PromotionBrief`, `PromotionCreate`, `PromotionUpdate`, `PromotionRead`, `ProductAssignRequest`
- `backend/app/routers/promotions.py` — 7 admin endpoints
- `backend/app/routers/products.py` — `selectinload(models.Product.promotions)` + in-memory expiry filter

---

## Auth Flow

1. User POSTs to `/auth/login` → receives JWT token
2. Token stored in `localStorage` as `tivuta_token`
3. `AuthContext` loads token, calls `/users/me`, stores `user` object
4. All protected pages wrapped in `AuthGate` (checks token exists)
5. All admin pages wrapped in `AdminGuard` (checks `user.role === 'admin'`)
6. API calls include `Authorization: Bearer <token>` header via `authHeaders()` helper in `api.ts`

---

## Localization

4 supported locales: `he` (Hebrew, RTL, default), `en`, `fr`, `yi` (Yiddish).

- URL segment: `/[locale]/...`
- No i18n library — translations are `Record<string, T>` objects baked into each component
- `generateStaticParams()` in `locales.ts` lists all 4 locales for static export
- All DB text fields have `_he`, `_en`, `_fr`, `_yi` variants

---

## How to Run

### Backend
```bash
cd backend
.venv\Scripts\uvicorn app.main:app --reload
# → http://127.0.0.1:8000
# API docs: http://127.0.0.1:8000/docs
```

### Alembic migrations
```bash
cd backend
.venv\Scripts\alembic upgrade head                              # apply all
.venv\Scripts\alembic revision --autogenerate -m "description"  # create new
```

### Frontend
```bash
cd frontend
npm run dev    # → http://localhost:3000
npm run build  # static export to /out
```

### Environment variables
- Backend: `JWT_SECRET_KEY`, `CORS_ORIGINS`, `DATABASE_URL` (defaults to SQLite `./tivuta.db`)
- Frontend: `NEXT_PUBLIC_API_URL` (defaults to `http://127.0.0.1:8000`), `NEXT_PUBLIC_BASE_PATH`

---

## Deployment

- Frontend: GitHub Pages via GitHub Actions (`/.github/workflows/`). Static export (`output: 'export'` in next.config.ts).
- Backend: Supabase PostgreSQL in production. Backend hosted separately (not GitHub Pages).
- CNAME configured for custom domain.

---

## User-Facing Features (session 2026-07-05)

### Wishlist (Favorites)
- Heart button on `ProductTile` — toggled per-product, stored server-side in `favorites` table
- `GET /favorites/ids` returns just IDs (used by listing page for efficient state init)
- `POST /favorites/{product_id}` — idempotent add; `DELETE /favorites/{product_id}` — 204 remove
- Profile page shows full wishlist with image, title, price, remove button
- `VerticalListingClient` pre-fetches `getFavoriteIds` alongside products via `Promise.all`

### Product Comparison
- `ComparisonBar` — fixed bottom bar, up to 3 products side-by-side with attribute rows
- Compare toggle per `ProductTile` in `VerticalListingClient`
- `ATTR_LABELS` map provides Hebrew/English labels for JSON attribute keys

### WhatsApp Share
- Share button on `ProductTile` opens `wa.me` with pre-filled product title + price message
- No backend needed — pure client-side `window.open`

### Recently Viewed
- Tracked in `localStorage` key `tivuta_recent_v2` (last 8 **full product snapshots** — id, title_he, image_url, price, vertical)
- Written on `ProductTile` modal open via `useEffect`; no backend needed
- Profile page reads this key and renders a 2×4 thumbnail grid with links to the vertical page
- Key `tivuta_recent` (old, IDs only) is deprecated — ignore it

### Notification Bell
- `NotificationBell` component on home page top bar; receives `token` as prop
- Polls `GET /notifications/unread-count` every 60 seconds
- Dropdown shows last 50 notifications; type emoji map: `lead_status→📋`, `appointment_reminder→📅`, `system→🔔`, `followup→⏰`
- Gold badge when `unread > 0`; supports mark-one and mark-all-read
- Notifications are created server-side (in `leads.py`) when lead status changes to `confirmed` or `contacted`

### Flash Sale Countdown Timer
- `useCountdown(endDate)` custom hook in `ProductTile.tsx` uses `setInterval` (1s) to compute `d:h:m:s` remaining
- `FlashCountdown` component renders inside the promotion badge when `type === 'flash_sale'` and `end_date` exists
- No backend changes needed — `end_date` already exists on `Promotion`

### Rating & Review System
- `Review` model: `users` × `products` unique constraint (`uq_user_product_review`); rating 1–5, optional comment
- `POST /reviews/{product_id}` — upsert (idempotent); `GET /products/{product_id}/reviews` — approved reviews
- Admin endpoints: `GET /admin/reviews`, `PATCH /admin/reviews/{id}/approve`
- Reviews section appears inside `ProductTile` detail modal: display `StarRating` + submit form
- `StarRating` component is interactive when `onChange` provided, display-only otherwise

### My Appointments in Profile
- Reads `GET /leads/me` (filtered for `lead_type=appointment`) and displays upcoming with date + status badge
- No new backend endpoint — reuses existing `/leads/me`

### Global Search
- `GlobalSearch` component (full-screen modal) in home page top bar
- `GET /search?q=<term>` — searches `title_he`, `title_en`, `description_he` with ILIKE; min 2 chars, max 20 results
- Debounced 300ms; each result shows thumbnail, title, vertical icon, price, avg_rating
- Clicking a result navigates to `/${locale}/${vertical}?product=${id}` (opens product modal directly)

### Shareable Product URL
- `?product=ID` query param on vertical listing pages (e.g. `/he/diamonds?product=42`)
- `VerticalListingClient` reads `useSearchParams().get('product')` and passes `autoOpen={true}` to matching `ProductTile`
- `ProductTile` initializes `showDetail` from `autoOpen` prop — no `generateStaticParams` needed (works with static export)
- WhatsApp share button now includes the shareable URL in the message text

### Average Rating on Product Cards
- `avg_rating` and `review_count` computed in `_product_read()` from already-loaded `product.reviews` (no extra query)
- Star display + numeric rating below product description on `ProductTile` card (only when `avg_rating` is set)

### View Count Tracking
- `view_count` column on `products` table; incremented by `POST /products/{id}/view` (no auth required)
- Called fire-and-forget via `trackProductView(id)` in `ProductTile` modal open `useEffect`
- Exposed in admin product analytics

### Order Tracking in Profile
- `GET /orders/me` — returns user's orders from `orders` table, ordered by date desc
- Profile "My Orders" section shows title, amount (₪), date, and color-coded status badge

### Notification Preferences
- `notification_prefs: JSON` column on `users` table (nullable, merged on PATCH)
- `PATCH /users/me/notification-prefs` — partial update; merges into existing prefs dict
- Profile "Notification Preferences" collapsible section — 4 toggles: lead_status, appointment_reminder, system, promotions
- `AuthContext.User` interface includes `notification_prefs?: Record<string, boolean> | null`

---

## Admin Features (session 2026-07-05 – 2026-07-06)

### Duplicate Product
- `POST /admin/products/{id}/duplicate` clones all fields; appends " (עותק)" to `title_he`, sets `is_active=False`
- Button in products table row

### Lead Assignment
- `assigned_to` column added to `leads` table (FK → `users.id`)
- `PATCH /admin/leads/{id}/assign` — body `{assigned_to: userId | null}`
- Admin leads page loads all admin-role users once; shows `<select>` per row

### Calendar View for Appointments
- Toggle in leads page: Table view | Calendar view
- Month navigation with Hebrew weekday labels `['א','ב','ג','ד','ה','ו','ש']`
- Groups leads by `appointment_date` day in current month
- Hover on lead card reveals appointment reminder button

### Appointment Reminders
- `POST /admin/leads/{id}/send-appointment-reminder` — sends email to user, creates in-app `Notification`
- Bell icon button per lead row / calendar card

### CSV Import
- `POST /admin/products/import-csv` — multipart upload; handles `utf-8-sig` and `windows-1255` encodings
- Required columns: `vertical`, `title_he`; optional: all other product fields + `attributes` as JSON string
- "ייבוא CSV" button in products page header opens modal with column spec + file picker
- Export CSV produces importable format (matching column names)

### Conversion Panel
- `GET /admin/leads/conversion` — per-vertical stats: `total`, `confirmed`, `contacted`, `closed`, `conversion_rate %`
- Rendered as `ConversionPanel` in admin dashboard below the leads chart
- Progress bar + breakdown counts per vertical

### Follow-up Reminders
- `POST /admin/leads/send-followup-reminders?stale_days=3` — finds `status=new` leads older than N days, sends admin email per lead
- Trigger button in admin dashboard header; shows result count inline

### Admin Dashboard
- Stats cards → 14-day SVG bar chart (`LeadsChart`) → `ConversionPanel` → quick-links grid
- All data fetched in parallel via `Promise.all([adminGetStats, adminGetLeadStats, adminGetConversionStats])`

### Bulk Actions on Leads
- `PATCH /admin/leads/bulk` — body: `{lead_ids: [...], action: "set_status"|"assign", value?: "..."}`
- Checkbox column added to leads table; bulk toolbar appears when any row is selected
- Bulk status change + agent assignment; history entry appended for each affected lead

### Audit Trail on Leads
- `history: JSON` column on `Lead` model — array of `{ts, action, from_val, to_val}` entries
- Appended on every status change (`admin_update_lead_status`) and assignment (`admin_assign_lead`)
- Leads page shows history toggle button per row; expands inline expansion row with timeline

### Distribution Scheduling
- `scheduled_at: DateTime` nullable column on `Distribution` model
- UI: datetime-local picker in create form; `scheduled_at` column in distributions table
- Cron endpoint: `POST /api/distributions/process-scheduled` — called by GitHub Actions every 15 min; validates `Authorization: Bearer <CRON_SECRET>`; finds `draft` distributions where `scheduled_at <= now`, pre-marks them `sending` (prevents double-trigger on overlapping runs), then fires `_send_distribution` as a background task for each

### Audience Segmentation for Distributions
- `filter_membership_track: String(100)` and `filter_city: String(100)` nullable columns on `Distribution` model
- Backend `_send_distribution` applies: SQL WHERE on `city`; Python in-memory filter on `membership_tracks` JSON array
- UI: collapsible "פילוח קהל" section in distribution create form with city + membership track text inputs
- Shows "ההפצה תישלח רק לחברים המתאימים לסינון" hint when either filter is set

### Email Preview Modal
- `GET /admin/distributions/{id}/preview` — returns `{html: str, subject: str, recipient_count: int}`
- Eye icon button on every distribution row opens a full-screen modal with the rendered HTML in a sandboxed iframe
- Shows subject line and recipient count in modal header

### Product Performance Analytics
- `GET /admin/products/analytics` — per-product stats: view_count, favorite_count (from favorites table), review_count, avg_rating, lead_count
- "אנליטיקס" toggle button in admin products page header; panel shows above the product table when active
- Sortable by: views / favorites / reviews / leads; refresh button to re-fetch on demand

### Kanban Board for Leads
- Third view mode in admin leads page (alongside Table and Calendar)
- 4 columns matching lead statuses; cards are HTML5 draggable — drop triggers `handleStatusChange`
- SLA breach: `lead.status === 'new' && age > 24h` → red left border + "ממתין מעל 24 שעות" label
- SLA also highlighted in table view as a red-left-border on the row

---

## Loyalty & Vendor Commission Program (Phases 1–5 — session 2026-07-18/19) — COMPLETE

Full design plan: see `.claude/plans` history or ask for the "sparkling-swimming-puffin" plan — this section documents what's actually **built**. All 5 planned phases are done.

**Goal**: reward a member with points when they buy at a physical store referred by Tivuta, reward the store with higher **per-product** popularity ranking the more it reports, and Tivuta earns a commission on every reported sale. Full design (data model rationale, fraud-resistance reasoning, phased rollout) lives in the plan this was built from — ask the user if you need the original brainstorm/rationale reproduced.

### What Phase 1 built
- **`User.customer_number`** — unique, non-sequential ~50-bit random serial (`TVT-XXXXXXXXXX`, format in `services/loyalty.py`). Generated at signup (`routers/auth.py`); backfilled for pre-existing users in the `15f5ddaec4a5` migration. Lookup is case/whitespace-normalized (`.strip().upper()` in `schemas.SaleCreateBase`, shared by both the admin and vendor reporting schemas). This is the loyalty-card identifier — displayed digitally in the profile (Phase 4); no QR/physical card printing happens on the website itself.
- **`User.points_balance`** — denormalized running total, kept in sync via an atomic SQL-level increment (`db.query(User).filter(...).update({"points_balance": User.points_balance + n})`, same pattern as `Product.view_count`) — not a Python read-modify-write, to stay race-safe under concurrent sales.
- **`Vendor.commission_rate_percent` / `points_rate_percent` / `commission_owed_total`** — per-vendor loyalty config, editable via the existing `PATCH /admin/vendors/{id}` (schema extended, `commission_rate_percent`/`points_rate_percent` bounded `0–100` via Pydantic `Field(ge=0, le=100)`). `points_rate_percent` falls back to the global `SystemSetting` default when null. `Vendor.login_email`/`hashed_password` columns exist for the future vendor self-service portal (Phase 3) but are unused/nullable for now.
- **`SystemSetting`** (`system_settings` table) — flat key/value config for `point_value_ils`, `default_points_rate_percent`, `default_commission_rate_percent`, `min_transaction_ils`, `max_transaction_ils`. `services/loyalty.py`'s `get_setting()`/`get_setting_float()` fall back to in-code `DEFAULT_SETTINGS` if a row doesn't exist yet. `PATCH /admin/settings` validates known numeric keys parse as a positive float before writing (`validate_setting_value`) — prevents a bad admin edit (e.g. `point_value_ils="0"`) from causing a `ZeroDivisionError` on every subsequent sale report.
- **`SaleTransaction`** (`sale_transactions` table) — the ledger record. Sales are auto-confirmed synchronously (`status="confirmed"` immediately) — no `reported`→`confirmed` waiting window. If `product_id` is given, it must belong to the reporting vendor (or have no vendor assigned) — rejects a store taking popularity/commission credit for another store's product.
- **`PointsLedgerEntry`** — one row created per confirmed sale (`reason="sale"`), with `balance_after` snapshotted (re-fetched via `db.refresh(customer)` after the atomic balance update, so the snapshot reflects the real DB value, not a stale Python one).
- **`CommissionSettlementPeriod`** — periodic manual reconciliation (built in Phase 3, see below).
- **Idempotency**: `SaleTransaction.idempotency_key` is unique (max 64 chars, enforced in the Pydantic schema too); a duplicate key returns the existing row instead of erroring or double-counting. Also race-safe: a concurrent double-submit that both pass the initial existence check will have one `INSERT` fail on the unique constraint at `db.flush()` — that path is caught, rolled back, and re-resolved to the winning row instead of 500ing. Both the admin and vendor reporting endpoints additionally reject (409) a key reused with a *different* vendor_id — prevents the response accidentally leaking a different vendor's sale.
- **Core sale-writing logic lives in `services/loyalty.py`**: `validate_and_resolve_sale_inputs()` (customer/product/amount checks) and `create_sale_transaction()` (economics + ledger writes) are shared by both `POST /admin/sales` and `POST /vendor/sales` — the two reporting paths cannot silently drift apart on a fraud-sensitive ledger.
- **Amount plausibility bounds**: `amount_ils` must be `> 0` (Pydantic `Field(gt=0)`) and within the configurable `min_transaction_ils`/`max_transaction_ils` settings (400 if out of range).
- A `Notification` (`type="points_earned"`) is created for the customer on every confirmed sale, surfaced via the existing `NotificationBell`.

### What Phase 2 built
- **`Product.popularity_score`** (Integer, default 0) — a plain counter, incremented by 1 (atomic SQL update) every time a confirmed `SaleTransaction` carries that `product_id`. Deliberately counts *transactions*, not ₪ volume, so one expensive sale doesn't dwarf a boutique's steady repeat business. No decay/recency weighting.
- **`GET /products?sort=popularity`** — new sort mode, `Product.popularity_score.desc()` with `created_at.desc()` as a tiebreaker. **This is now the default** when `sort` is omitted or unrecognized (previously defaulted to `newest`) — `routers/products.py`'s `list_products`.
- **Frontend default sort flipped to `'popularity'`**: `VerticalListingClient.tsx`'s initial `useState<SortOption>` and a new `'popularity'` entry (placed first, `Flame` icon) in `FilterSortSidebar.tsx`'s `SortOption` union/`sortOptions`/translations. Both sides changed together — the frontend always sends an explicit `sort` value, so a backend-only default change would have had no visible effect.

### What Phase 3 built — vendor self-service portal
- **Vendor is a fully separate auth principal from `User`/`role`**, not a third role value. Rationale: a vendor is a store, not a person — it has no favorites/orders/dashboard, and giving it a `User` row would risk it satisfying `role != 'admin'` checks meant for real members. `Vendor.login_email`/`hashed_password` (added in Phase 1, unused until now) are the vendor's own credential.
- **JWT `typ` claim separates the two token types**: member/admin tokens now carry `{"sub": user.email, "typ": "user"}` (`routers/auth.py`); vendor tokens carry `{"sub": vendor.login_email, "typ": "vendor"}` (`routers/vendor_portal.py`). `security.get_current_user` explicitly rejects `typ="vendor"` tokens (but still accepts tokens with no `typ` at all, so pre-existing member sessions issued before this change aren't force-logged-out); `security.get_current_vendor` requires `typ="vendor"` strictly and additionally checks `Vendor.is_active`. Verified end-to-end that a vendor token 401s against `/users/me` and a member/admin token 401s against `/vendor/me`.
- **`backend/app/routers/vendor_portal.py`** (new router): `POST /vendor-auth/login` (separate token endpoint from `/auth/login`), `GET /vendor/me`, `GET/POST /vendor/sales`, `GET /vendor/settlements`. `POST /vendor/sales` takes **no `vendor_id` in the body at all** — the vendor's identity comes only from `get_current_vendor`, so a vendor can never report a sale as a different vendor.
- **Admin issues/resets vendor portal credentials**: `PATCH /admin/vendors/{id}/portal-access` (`routers/vendors.py`) sets `login_email`+`hashed_password`. Cross-checks that the email isn't already a member's `User.email` or another vendor's `login_email` — keeps the two principal types' emails disjoint even though the `typ` claim already prevents any auth confusion. No vendor self-service signup/password-reset yet (small, known set of vendors; admin-issued is enough for v1).
- **Commission settlement lifecycle, now fully wired**: `POST /admin/vendors/{id}/settlements` opens a period by running a single atomic `UPDATE ... WHERE settlement_period_id IS NULL` to claim unsettled confirmed transactions within `[period_start, period_end]` (by `confirmed_at`), then sums whatever actually got claimed — deliberately *not* "SELECT rows in Python, then set attributes," because that read-then-write shape would let two concurrent opens (e.g. an admin double-clicking) both read the same unclaimed rows and double-count them before either commits. Verified live: opening two overlapping periods back-to-back gives the second period `total_amount_ils=0`, not a duplicate of the first. `PATCH /admin/vendors/{id}/settlements/{period_id}/settle` marks it paid, decrements `Vendor.commission_owed_total` by the period total (atomic update), and rejects settling an already-settled period. Vendors see their own history read-only via `GET /vendor/settlements`.
- **Admin vendors page** (`frontend/.../admin/vendors/page.tsx`) gained: commission/points rate % inputs in the create/edit form, a commission-owed column in the table, a key-icon modal to issue/reset portal login credentials, and a wallet-icon modal for the full settlement workflow (open a period via `datetime-local` inputs — deliberately timezone-naive to match `confirmed_at`'s naive-UTC storage — list history, mark open periods settled).
- **New vendor-facing route tree** at `frontend/src/app/[locale]/vendor/`: `layout.tsx` mounts `VendorAuthProvider` (separate localStorage key `tivuta_vendor_token` — a vendor and member session must never collide in the same browser); `login/page.tsx` is unguarded; a `(portal)` route group (mirrors the existing `(protected)/admin` two-tier pattern) wraps `dashboard/`, `report/`, `settlements/` in `VendorGuard` + a nav bar. `report/page.tsx` generates a client-side `idempotency_key` (via `crypto.randomUUID()`) once per logical submission and **reuses it across retries** of the same attempt, only rotating to a fresh key after a confirmed success — this is what makes the backend's idempotency guarantee actually reachable from a flaky connection, not just a server-side nicety.
- **Camera-based QR scanning is still deferred** — `report/page.tsx` is manual serial-number entry only, as planned for v1.

### What Phase 4 built — customer card + physical card requests
- **`GET /users/me/points-history`** (`routers/users.py`) — returns the user's `PointsLedgerEntry` rows newest-first, each annotated with the vendor name (via `sale_transaction.vendor`) for a human-readable "earned N points at Vendor X" line.
- **`Lead.shipping_address`** (JSON, nullable) — new column, `card_order` added as a valid `lead_type` value (still just a free string column, not a DB enum — validity is enforced at the router/schema layer like the other lead types already were).
- **`POST /leads/card-order`** (`routers/leads.py`) — creates a `card_order` lead from `schemas.CardOrderCreate` (`shipping_address: {full_name, street, city, zip_code?, phone}`). **Idempotent-ish by design**: if the user already has an open (`new`/`confirmed`/`contacted`) card-order lead, that existing lead is returned as-is instead of creating a duplicate — prevents a re-clicked button from spamming the admin queue. No QR generation or printing happens here at all; this only creates a fulfillable request, exactly per the plan's "physical card production is out of scope for the website" decision.
- **Admin leads queue** (`admin/leads/page.tsx`) already renders every lead type through the same table; `card_order` leads show the shipping address (name/street/city/zip/phone) in the "Product" column in place of a product, and a new `TYPE_LABEL` entry ("הזמנת כרטיס"). Fulfillment (producing the card, mailing it) is a manual admin process outside the app — same as before, just marking the lead `closed` once mailed.
- **Profile page "Tivuta Card" section** (`ProfileClient.tsx`) — points balance + a copy-to-clipboard customer-number chip, a collapsible points-history list, and an inline shipping-address form to request a physical card (hidden once a request already exists, replaced by a status chip). The existing "Activity history" section now filters out `card_order` leads (`marketplaceActivity`) so a card request doesn't show up oddly grouped among product inquiries — it's surfaced only in the dedicated card section, derived from the same `GET /users/me/activity` call (no extra request needed, since that endpoint already returns every lead type including `lead_type`).
- **`AuthContext.tsx`'s `User` interface** extended with `customer_number`/`points_balance` so the profile page (and anything else reading `useAuth().user`) can read them directly — `GET /users/me` was already returning these fields since Phase 1's `UserRead` schema extension, just nothing on the frontend typed or displayed them until now.
- **Found and fixed two pre-existing bugs unrelated to this feature, discovered incidentally while working in the same files**: (1) `routers/leads.py`'s `admin_list_leads` builds `AdminLeadRead` field-by-field and never passed `shipping_address` through — caught immediately by testing, one-line fix. (2) `routers/users.py`'s `change_my_password` called `verify_password()` without it ever being imported — a latent `NameError` that would have fired on every password-change attempt; fixed by adding the import while touching this file's import block for unrelated reasons. Verified both fixes live (shipping address now appears in the admin listing; password change + re-login with the new password both succeed).

### What Phase 5 built — fraud controls + admin audit tooling
- **Deferred-effects sale flow**: `SaleTransaction.status` is now genuinely tri-state in practice, not just in schema. `services/loyalty.py`'s `determine_sale_status()` runs two cheap velocity checks at report time — more than `max_vendor_sales_per_hour` transactions for that vendor in the last hour, or more than `max_customer_vendor_sales_per_day` transactions for that specific (vendor, customer) pair in the last day — and returns `"flagged"` instead of `"confirmed"` if either trips. **A flagged sale's points/commission/popularity effects are NOT applied at report time** — `create_sale_transaction()` only calls the (new, extracted) `_apply_realized_sale_effects()` helper when status is `"confirmed"`. Verified live: a flagged sale left the customer's `points_balance` and vendor's `commission_owed_total` completely unchanged until an admin acted on it.
- **`PATCH /admin/sales/{id}/review`** (`routers/sales.py`, logic in `loyalty.review_sale()`) — the admin decision point:
  - `action: "confirm"` — only valid on a `flagged` sale; releases its deferred effects via the same `_apply_realized_sale_effects()` helper used at report time (one code path realizes a sale's effects, regardless of whether it happened immediately or after review).
  - `action: "reverse"` — valid on `flagged` (no-op clawback, since nothing was ever applied) or `confirmed` (full clawback: negative `PointsLedgerEntry` with `reason="clawback"`, `Product.popularity_score` decrement, and a `Vendor.commission_owed_total` decrement — **but only if the sale hasn't already been swept into a `settled` `CommissionSettlementPeriod`**, since that money already changed hands outside the app; reversing it there would silently misstate the vendor's running balance. Verified live: reversing an already-settled sale correctly left `commission_owed_total` untouched instead of going negative). Already-reversed sales are rejected (400).
  - Both actions append a timestamped entry to `SaleTransaction.history` (same append-only-JSON pattern as `Lead.history`), and an optional `note` is recorded the same way before the action executes.
- **`GET /admin/sales` gained a `status` filter** (`?status=flagged`) — used by the new admin page to list exactly what needs review.
- **`POST /admin/vendors/check-unsettled-deactivation`** (`routers/vendors.py`) — the "if you don't pay, you stop benefiting" backstop: for every active vendor whose `commission_owed_total` is at/over `max_unsettled_ils_before_deactivate`, finds their oldest still-unsettled confirmed transaction; if it's older than `unsettled_grace_days`, sets `Vendor.is_active=False`. This immediately locks the vendor out of `get_current_vendor` (self-service reporting) and stops further popularity accrual, with no payment gateway required. Admin-triggered for now (same pattern as the existing follow-up-reminders button in the main admin dashboard) — wiring it to a cron is a drop-in follow-up, same shape as `distributions.py`'s `process-scheduled`.
- **`GET /admin/vendors/at-risk`** — lightweight visibility list (not a full dashboard) of every vendor with `commission_owed_total > 0`, their oldest-unsettled age in days, and whether they're currently over the deactivation threshold — lets an admin open a settlement period proactively before a vendor gets auto-deactivated.
- **New admin page** `frontend/.../admin/loyalty/page.tsx` (new "נאמנות והונאות" / "Loyalty & Fraud" nav tab in `admin/layout.tsx`) — three sections: a generic system-settings editor (**this was the first UI ever built for `GET/PATCH /admin/settings`, which existed since Phase 1 but had only ever been exercised via curl**), the flagged-sales review queue (confirm/reverse buttons), and the at-risk vendors list with the deactivation-check trigger button.
- **Two-sided customer confirmation was deliberately NOT built**, per the plan's explicit recommendation — the customer's own incentive to want the vendor to report is already load-bearing, and requiring active confirmation adds checkout friction for a threat that's still theoretical. Revisit only if flagged-sale volume shows collusion is a real observed problem, not before.
- **Found and fixed a real bug while testing this phase**: `unsettled_grace_days` (and the other three new Phase 5 threshold settings) were validated by the same `POSITIVE_FLOAT_SETTINGS` rule as `point_value_ils` — rejecting `0`. But `0` is a legitimate policy value for these (e.g. "no grace period, deactivate immediately"), unlike `point_value_ils` where `0` causes a real `ZeroDivisionError`. Split into `POSITIVE_FLOAT_SETTINGS` (must be `> 0`) and a new `NON_NEGATIVE_FLOAT_SETTINGS` (must be `>= 0`) in `services/loyalty.py`. Caught because a `PATCH /admin/settings` call silently 400'd during testing (its response had been piped to `/dev/null`) and the deactivation check consequently — correctly, given the stale setting — reported zero deactivations; re-ran after the fix and confirmed the full loop (set `grace_days=0` → trigger check → vendor deactivated → vendor login rejected).

### Post-implementation full-system review (found after re-reading every file fresh, not just per-phase diffs)
- **The Phase 1 admin-manual "record a sale" UI was never actually built** — only the backend endpoint existed, exercised solely via curl across four phases of testing. Added a "רישום עסקה ידני" (manual sale entry) form to `admin/loyalty/page.tsx` (vendor dropdown + customer number + amount + optional product), backed by a new `adminCreateSale()` in `lib/api.ts`. This is the admin-as-vendor-proxy fallback for a vendor without portal access yet.
- **Misleading success messaging on a flagged sale**: both the vendor portal's `report/page.tsx` and would-be admin form always said "X points credited to the customer" on any successful `POST .../sales`, even when the sale came back `status="flagged"` — meaning the points were explicitly *not* yet credited, pending review. Both now check `sale.status` and show a "sent for review, points pending" message instead when flagged.
- **No status visibility on the vendor's own transaction list**: `vendor/(portal)/dashboard/page.tsx`'s recent-sales table showed `points_awarded`/`commission_owed_ils` with no indication of whether a row was `confirmed`, `flagged` (not yet real), or `reversed` (no longer real) — a vendor could easily believe a flagged or reversed sale's numbers were live. Added a color-coded status column.
- Also updated the `Vendor` TypeScript interface in `lib/api.ts`, which had drifted out of date since Phase 1 (missing `commission_rate_percent`/`points_rate_percent`/`commission_owed_total` — harmless today only because the admin vendors page bypasses it with `any[]`, but worth keeping accurate).

### Key files
- `backend/app/models.py` — `SystemSetting`, `SaleTransaction`, `PointsLedgerEntry`, `CommissionSettlementPeriod`; loyalty columns on `User`/`Vendor`; `Product.popularity_score`; `Lead.shipping_address`
- `backend/app/services/loyalty.py` — customer-number generation, setting lookup/validation (`POSITIVE_FLOAT_SETTINGS` vs `NON_NEGATIVE_FLOAT_SETTINGS`), points/commission computation, `determine_sale_status()`, `_apply_realized_sale_effects()`, `review_sale()`, and the shared `validate_and_resolve_sale_inputs()`/`create_sale_transaction()` used by both reporting paths
- `backend/app/routers/sales.py` — `GET/PATCH /admin/settings`, `GET/POST /admin/sales`, `PATCH /admin/sales/{id}/review`
- `backend/app/routers/vendor_portal.py` — vendor-facing auth + self-service sale reporting
- `backend/app/routers/vendors.py` — vendor CRUD, `portal-access`, settlement open/settle, `at-risk`, `check-unsettled-deactivation`
- `backend/app/routers/leads.py` — `POST /leads/card-order`, `admin_list_leads`
- `backend/app/routers/users.py` — `GET /users/me/points-history`
- `backend/app/security.py` — `get_current_vendor`, `typ`-claim separation in `get_current_user`
- `backend/app/routers/products.py` — `sort=popularity` + new default in `list_products`
- `frontend/src/context/VendorAuthContext.tsx`, `frontend/src/components/VendorGuard.tsx` — vendor auth, fully parallel to (not sharing state with) `AuthContext`/`AdminGuard`
- `frontend/src/app/[locale]/vendor/` — vendor portal route tree
- `frontend/src/app/[locale]/(protected)/profile/ProfileClient.tsx` — "Tivuta Card" section (points, customer number, card-order form)
- `frontend/src/app/[locale]/(protected)/admin/leads/page.tsx` — `card_order` display in the leads table
- `frontend/src/app/[locale]/(protected)/admin/loyalty/page.tsx` — settings editor, flagged-sale review, at-risk vendors
- `frontend/src/app/[locale]/(protected)/admin/vendors/page.tsx` — commission/points rates, portal-access modal, settlement modal
- `frontend/src/components/FilterSortSidebar.tsx`, `VerticalListingClient.tsx` — popularity sort option + new default
- `backend/alembic/versions/15f5ddaec4a5_add_loyalty_points_system.py` — Phase 1 schema + customer_number backfill
- `backend/alembic/versions/655114dc8ce0_add_product_popularity_score.py` — Phase 2 schema
- `backend/alembic/versions/20b196d5ff3e_add_lead_shipping_address.py` — Phase 4 schema

---

## Key Design Decisions

- **Products vs Items**: `items` table = legacy benefits club catalog. `products` table = new multi-vertical site (diamonds/cars/insurance). They are intentionally separate.
- **Soft deletes**: `is_active = False` instead of hard deletes, everywhere.
- **Multilingual**: All user-facing text has 4 language variants in the DB. Admin UI is Hebrew-only.
- **Static export constraint**: `output: 'export'` means no server-side rendering, no API routes, no dynamic server features. All data fetching is client-side after hydration.
- **Promotions JSON config**: Chosen over fixed columns for flexibility — new promotion types require zero schema changes.
- **Many-to-many via Table object**: `product_promotions_table` is defined as a SQLAlchemy `Table` (not a mapped class) to enable clean `secondary=` relationships on both `Product` and `Promotion`. Direct junction row management uses `promotion.products.append/remove`.
- **Favorites IDs endpoint**: Separate `GET /favorites/ids` returns only IDs (not full products) — used by listing pages to efficiently mark favorited tiles without loading full product objects twice.
- **Notifications created server-side**: `leads.py` creates `Notification` rows when lead status changes, so the polling bell picks them up without any extra client work.
- **Recently viewed in localStorage**: No backend needed; 8-item LRU list keyed `tivuta_recent_v2` (full snapshots); written on `ProductTile` modal open.
- **Review upsert**: `POST /reviews/{product_id}` checks `(user_id, product_id)` unique constraint — updates existing if present, creates otherwise. Single endpoint for add/edit.
- **Audit history as JSON array**: Lead `history` field is an append-only JSON array on the model; no separate table needed. Trade-off: cannot query history fields with SQL, but history is only ever displayed per-lead, never queried across leads.
- **Distribution scheduling is storage-only**: `scheduled_at` is stored on the `Distribution` row. Actual auto-send at the scheduled time requires an external cron job / background worker (not yet built). Admin still sends manually; the field is UI infrastructure for when scheduling is wired up.
- **Shareable URL via query param**: `?product=ID` on vertical pages auto-opens the product modal. Cannot use `/[vertical]/[id]` dynamic routes because `output: 'export'` requires `generateStaticParams` to enumerate all possible IDs at build time — not feasible for a dynamic database.
- **View count fire-and-forget**: `POST /products/{id}/view` is called with `fetch().catch(() => {})` — no auth, no await. A failed view-count increment should never block the user.
- **Distribution segmentation mix**: `filter_city` uses a SQL WHERE clause (efficient); `filter_membership_track` uses Python in-memory filtering since `membership_tracks` is a JSON array column (not indexable with simple SQL). Trade-off accepted: segment sizes are small.
- **Email preview in iframe**: HTML is rendered in a sandboxed `<iframe srcdoc>` in the admin preview modal. `sandbox="allow-same-origin"` prevents script execution while allowing CSS rendering.
- **Product image serving via FastAPI StaticFiles**: Images uploaded through the admin are saved to `IMAGES_DIR` and served by FastAPI at `/images/products/`. Frontend uses `productImageUrl(filename)` helper from `api.ts` which prepends `NEXT_PUBLIC_API_URL`. In dev, `IMAGES_DIR` defaults to `frontend/public/images/products/` (same dir Next.js serves). In prod, set `IMAGES_DIR` to any writable path — FastAPI serves it directly. No static rebuild needed after upload.
- **Loyalty points auto-confirm, not settlement-gated**: `SaleTransaction.status` goes straight to `"confirmed"` on report (no payment gateway in v1 anyway) rather than waiting for the vendor to actually pay Tivuta's commission. Points/ranking benefit is the trust hook that makes the *customer* want the vendor to report — delaying it by weeks (until manual settlement) would break that loop. Non-paying vendors are handled by deactivating them (Phase 5), not by holding customer points hostage.
- **Loyalty rate snapshotting**: `SaleTransaction.commission_rate_percent_snapshot` and `points_awarded` are computed and stored at report time, not recomputed from the vendor's *current* rate later — a vendor's rate can change going forward without silently repricing historical transactions.
- **Customer number is a plain (not signed/rotating) token**: `services/loyalty.py`'s `generate_customer_number()` produces a random ~50-bit serial with no cryptographic signing. The vendor is a semi-trusted, identified counterparty (has its own commission ledger), not an anonymous adversary — a signed/rotating QR token was judged disproportionate complexity for that threat model. Revisit only if manual-entry fraud is actually observed.
- **Popularity counts transactions, not ₪ volume**: `Product.popularity_score` increments by 1 per confirmed sale regardless of `amount_ils`, so a single expensive diamond sale can't outrank a boutique's many smaller repeat sales. Chosen as the fairer and less easily-gamed proxy for "genuinely selling."
- **Balance/counter increments use atomic SQL updates, not ORM read-modify-write**: `Vendor.commission_owed_total`, `User.points_balance`, and `Product.popularity_score` are all incremented via `db.query(Model).filter(...).update({col: col + n})` — the same pattern already established for `Product.view_count` — rather than `obj.field += n` on an already-loaded ORM object, so concurrent sales against the same vendor/customer/product can't silently lose an update.
- **Vendor auth is a separate JWT principal, not a `User.role` value**: a vendor is a store, not a person, and giving it a `User` row risked it accidentally satisfying `role != 'admin'` checks meant for real members. Tokens carry a `typ` claim (`"user"` vs `"vendor"`) so `get_current_user`/`get_current_vendor` each reject the other's tokens outright — verified live that cross-using a token 401s in both directions.
- **Sale-reporting logic is shared, not duplicated, between admin and vendor**: `services/loyalty.py`'s `validate_and_resolve_sale_inputs()`/`create_sale_transaction()` back both `POST /admin/sales` and `POST /vendor/sales`. A fraud-sensitive ledger is exactly the kind of code where two similar-but-not-identical implementations would eventually drift and create an exploitable gap between what an admin can enter vs. what a vendor can get away with.
- **Flag, don't block, on velocity limits**: exceeding `max_vendor_sales_per_hour`/`max_customer_vendor_sales_per_day` routes a sale to `status="flagged"` (effects deferred, pending admin review) rather than rejecting the request outright — a genuinely busy store shouldn't be punished with a hard error, but the pattern still needs a human to look at it before it earns anyone anything.
- **A sale's effects are realized through exactly one code path**: `_apply_realized_sale_effects()` in `services/loyalty.py` is the only place that increments `points_balance`/`commission_owed_total`/`popularity_score` and writes the `PointsLedgerEntry`+`Notification`. Both the synchronous-confirm path (`create_sale_transaction`) and the admin flagged-review confirm path (`review_sale`) call into it, rather than each having their own copy — the alternative (duplicate the increment logic in two places) is exactly the kind of drift a fraud-sensitive ledger can't afford.
- **Clawback respects settlement, doesn't fight it**: reversing an already-`confirmed` sale claws back points and popularity unconditionally, but only touches `Vendor.commission_owed_total` if the sale hasn't already been linked to a `settled` `CommissionSettlementPeriod`. Once money has changed hands outside the app, silently adjusting the in-app running balance would misstate reality rather than correct it — that case is left for manual admin reconciliation instead.

---

## Haredi (Ultra-Orthodox) Internet Filter Compatibility

The primary audience uses internet access through community-approved **kosher filters** (e.g. Rimon, Netspark, Genigram). These filters have specific technical characteristics that affect web development decisions.

### What kosher filters do

| Filter type | Behavior |
|---|---|
| **Text/dynamic content filter** | Scans page text and URLs; may block specific words or patterns |
| **Image filter** | Blocks inline images (not page background CSS). Some filters block all `<img>` tags on certain domains |
| **CDN blocking** | May block external CDN domains (Google, jsDelivr, cdnjs, fonts.googleapis.com, etc.) |
| **Heavy media** | Video, WebRTC, WebSockets may be blocked or rate-limited on stricter filter profiles |

### Architecture decisions made for filter compatibility

1. **Self-hosted fonts** — Heebo TTF is served from `/public/fonts/` (not Google Fonts CDN). `globals.css` uses local `@font-face`. **Do not introduce external font CDN links.**
2. **No external CDN scripts** — All JS/CSS comes from the Next.js bundle. `next.config.ts` has no `externals` pointing to CDNs. Keep it this way.
3. **Image fallback CSS** — `globals.css` includes a `.product-img-wrap` gradient background so product tiles degrade gracefully when `<img>` tags are blocked. The gold/navy gradient matches the site theme.
4. **No heavy animations in core flows** — Login, register, and checkout-equivalent forms avoid CSS animations/keyframes that might trigger filter heuristics.
5. **Local image storage** — Product images live in `/public/images/products/` (served from same domain). Do not link to external image hosts.

### The balance principle
> "אל תסרס את האתר רק בגלל המסננים. בא נמצא את דרך המלך."
> — Don't mutilate the site for the filters; find the right path.

The design, fonts, animations, and UX remain fully intact. Filter compatibility is achieved through **infrastructure choices** (where assets are hosted), not visual compromises. Only add a compatibility workaround when there is a concrete reason to believe a specific feature is blocked — not preemptively.
