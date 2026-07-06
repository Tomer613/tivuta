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
│   │   │   └── notifications.py In-app notifications — list, unread-count, mark-read
│   │   └── services/
│   │       ├── email_resend.py    Resend.com email provider
│   │       ├── whatsapp_meta.py   Meta WhatsApp Business API
│   │       └── notifications.py   Generic dispatcher
│   ├── alembic/           Migrations (Alembic)
│   │   └── versions/
│   │       ├── 1fcde320168b_initial_schema.py
│   │       ├── d71018332029_add_promotions_tables.py
│   │       ├── 13b4eb6e945d_add_promotion_entries.py
│   │       ├── b0ede4d6750e_add_user_profile_fields.py
│   │       ├── 94565c01c960_add_id_number_club_membership.py
│   │       ├── 99977981cac4_membership_tracks_json.py
│   │       └── a3f1c2d8e9b0_add_favorites_notifications_lead_assign.py  ← newest
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
| `notifications` | In-app notifications per user; `type`: `lead_status` \| `appointment_reminder` \| `system` \| `followup`; `is_read`, `link` fields |

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

---

## Admin Features (session 2026-07-05)

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
- Note: automatic sending at scheduled time requires a cron job / background task (not yet implemented — field is stored, manual send still required)

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
