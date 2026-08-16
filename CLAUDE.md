# Tivuta — Project Knowledge Base

> This file is the canonical reference for future Claude conversations on this project.
> Update it whenever significant architecture or feature decisions are made.

---

## What is Tivuta?

A full-stack platform for the Haredi (Ultra-Orthodox Jewish) community in Israel. It combines:
- A **multi-vertical marketplace** — admin-configurable "worlds" (diamonds, cars, insurance out of
  the box; more can be added from the admin panel, see "Worlds / Verticals" below) — with
  appointment/contact-request flows
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
│   │       ├── 15f5ddaec4a5_add_loyalty_points_system.py
│   │       ├── 655114dc8ce0_add_product_popularity_score.py
│   │       ├── 20b196d5ff3e_add_lead_shipping_address.py
│   │       ├── 7d2a4f6c1e83_add_verticals_table.py               (branches from 20b196d5ff3e)
│   │       ├── c7794c6bcb54_add_cart_quantity_and_cart_group_id_to_....py  (branches from 20b196d5ff3e)
│   │       ├── dcf603bb12f3_merge_cart_and_verticals_branches.py  (merges the two branches above)
│   │       ├── 91c9b7fe9361_survey_max_choices_multiselect.py
│   │       ├── c2f8a4e1b6d0_fix_diamonds_shape_typo.py
│   │       ├── 861a4db9d155_add_customer_orders.py
│   │       ├── bbcdc94e0e14_add_vendor_purchase_batches.py
│   │       ├── 50da6b936e9b_add_vendor_specialty_contact_fields.py
│   │       ├── 1d4d53ad9e19_add_login_lockout_fields.py
│   │       ├── 1093f7288549_add_lead_subject_message.py
│   │       └── 4edae04e4800_add_page_views.py                      ← newest (head)
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
    │   │               ├── layout.tsx   Nav tabs (Dashboard, Products, Users, Surveys, Distribution, Promotions, Orders, Leads, ...)
    │   │               ├── page.tsx     Dashboard: stats, 14-day leads chart, conversion panel, follow-up trigger
    │   │               ├── products/    Product CRUD + duplicate + CSV import
    │   │               ├── users/       User + role management
    │   │               ├── surveys/     Survey creation + vote stats
    │   │               ├── orders/      Orders table — CustomerOrder-grouped, per-vertical/vendor breakdown (see "Back-Office Orders" below)
    │   │               ├── leads/       Leads/Inquiries table — now only appointments/club-signups/card-orders end up here; empty until a general "contact us" feature exists (see "Back-Office Orders" below)
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
| `users` | Auth accounts; `role`: `member` \| `admin`; `failed_login_attempts`/`locked_until` drive per-account login lockout (see "Per-Account Login Lockout" below) |
| `categories` | Top-level benefits categories (slug-based routing) |
| `sub_categories` | Nested under categories |
| `items` | Legacy benefits catalog (linked to sub_categories) |
| `orders` | Legacy user transaction history for dashboard (`GET /orders/me`) — **unrelated to and predates** the `customer_orders` table below; do not confuse the two |
| `verticals` | Admin-managed "worlds" (diamonds/cars/insurance by default); `Product.vertical`/`Vendor.vertical` store its `slug` |
| `products` | Multi-vertical catalog; has `attributes JSON` for vertical-specific fields (schema defined per-vertical in `verticals.attribute_fields`) |
| `promotions` | Promotion definitions: type, channel, config JSON, dates |
| `product_promotions` | Junction table linking products ↔ promotions (many-to-many) |
| `customer_orders` | One row per checkout/appointment/card-order — the customer-facing order; `order_number` is computed from `id` (`ORD-{id:06d}`), not stored (see "Back-Office Orders" below) |
| `leads` | Line items within a `customer_order` (appointment/contact-request/club-signup/card-order), **plus** `general_inquiry` leads which deliberately have `customer_order_id = NULL` (see "General Contact Us Feature" below); `assigned_to FK→users.id` for admin assignment; `customer_order_id FK→customer_orders.id`; `quantity`/`cart_group_id` populated when created via cart checkout (see "Back-Office Orders" below); `subject`/`message` populated only on `general_inquiry` leads — kept separate from the admin-editable `notes` field so an admin's follow-up remarks never overwrite the customer's original message |
| `surveys` | Polls shown to users |
| `survey_options` | Options within a survey (each links to a product) |
| `survey_votes` | One vote per user per survey |
| `distributions` | Broadcast campaigns (survey or daily_deal); channels: email, whatsapp |
| `distribution_send_logs` | Per-user send status for each campaign |
| `favorites` | User wishlist; `UniqueConstraint(user_id, product_id)`; CASCADE deletes |
| `notifications` | In-app notifications per user; `type`: `lead_status` \| `appointment_reminder` \| `system` \| `followup` \| `points_earned`; `is_read`, `link` fields |
| `reviews` | Product rating (1–5) + comment; `UniqueConstraint(user_id, product_id)` — upsert semantics |
| `vendors` | Physical store/supplier per vertical; products optionally belong to one via `Product.vendor_id`; also carries loyalty-program fields (see below); `vendor_code` is a computed property (`{id:03d}`), not a column; `specialty`/`contact_phone`/`contact_email` are separate from `login_email` (portal auth); `failed_login_attempts`/`locked_until` mirror the same lockout fields on `users` |
| `system_settings` | Flat key/value config (e.g. `point_value_ils`) — see Loyalty Program section |
| `sale_transactions` | Ledger of in-store sales reported for a vendor+customer(+product); drives points + commission |
| `points_ledger_entries` | Append-only per-user points history (accrual/redemption/adjustment/clawback) |
| `commission_settlement_periods` | Admin-driven periodic reconciliation of vendor commission owed |
| `vendor_purchase_batches` | Consolidates `Lead` line items from many different `customer_orders` that share a vendor into one procurement action; `batch_number` computed from `id`, not stored (see "Back-Office Orders Phase 2") |
| `page_views` | First-party, anonymous pageview log — `visitor_id` is a client-generated random UUID (localStorage, not a cookie), no IP address stored (see "Self-Hosted Analytics" below) |

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

### E2E tests (Playwright — see "E2E Test Automation" session below for full design)
```powershell
cd backend
$env:DATABASE_URL = "sqlite:///./e2e_tivuta.db"; $env:JWT_SECRET_KEY = "<any-value>"
.venv\Scripts\alembic upgrade head
.venv\Scripts\python -m scripts.seed_e2e
cd ..\frontend
npx playwright test           # reuses already-running dev servers if present, else launches fresh ones (needs $env:CI="1" + the same DATABASE_URL/JWT_SECRET_KEY still set in this shell if nothing's already running, since `uvicorn` must resolve to this project's venv, not any other global install)
```
Always seed a **fresh** `e2e_tivuta.db` before a run — `auth.spec.ts` locks a test account for 15
real minutes, and reusing a DB within that window changes the spec's starting state.

### Environment variables
- Backend: `JWT_SECRET_KEY`, `CORS_ORIGINS`, `DATABASE_URL` (defaults to SQLite `./tivuta.db`),
  `LOGIN_RATE_LIMIT` (defaults to `"5/minute"` — only ever overridden by the E2E test run),
  `REDIS_URL` (optional — unset means in-memory rate-limit storage, exactly as before; see
  "Redis-Backed Rate Limiter" below)
- Frontend: `NEXT_PUBLIC_API_URL` (defaults to `http://127.0.0.1:8000`), `NEXT_PUBLIC_BASE_PATH`

---

## Deployment & Infrastructure (confirmed 2026-07-19)

| Layer | Provider | Notes |
|---|---|---|
| Frontend | **GitHub Pages** via GitHub Actions (`/.github/workflows/`) | Static export (`output: 'export'` in `next.config.ts`). CNAME configured for custom domain. |
| Backend (FastAPI) | **Render** | Not on GitHub Pages — hosted as its own service. All backend env vars (`RESEND_API_KEY`, `EMAIL_PROVIDER`, `EMAIL_FROM`, `ADMIN_NOTIFICATION_EMAIL`, `DATABASE_URL`, `JWT_SECRET_KEY`, `APP_BASE_URL`, `WHATSAPP_*`, `CORS_ORIGINS`, `GITHUB_REPO`, `GITHUB_DEPLOY_PAT`, `GITHUB_DEPLOY_WORKFLOW`) live in **Render's dashboard → service → Environment**, not in a repo `.env` file. Note: `backend/.env` in the working tree is an empty directory (not a file) and the app never calls `load_dotenv()` anywhere — so a local `.env` file would be ignored even if one existed; env vars must be real OS/platform environment variables.
| Database | **Supabase** (PostgreSQL) | Production `DATABASE_URL` points here. Falls back to local SQLite (`./tivuta.db`) only when `DATABASE_URL` is unset (local dev). |
| Outbound email | **Resend.com** | `EMAIL_PROVIDER=resend` selects `ResendEmailSender` (backend/app/services/email_resend.py) over the no-op `ConsoleEmailSender` fallback. Confirmed set up on Render as of 2026-07-19. |
| Outbound WhatsApp | Meta WhatsApp Business API | `WHATSAPP_PROVIDER=meta_cloud` + `WHATSAPP_CLOUD_API_TOKEN`/`WHATSAPP_CLOUD_PHONE_NUMBER_ID`, same pattern as email (console fallback otherwise). |
| Auto-redeploy trigger | GitHub Actions REST API | `services/deploy_trigger.py` fires `workflow_dispatch` on `deploy.yml` when an admin saves a vertical — see "Worlds / Verticals" below. No-op until `GITHUB_REPO`/`GITHUB_DEPLOY_PAT` are set on Render. |

### Real email addresses in use (confirmed set up 2026-07-19)
- **`support@tivuta.co.il`** — dual purpose: (1) customer-facing support address shown in `SiteFooter.tsx`/`BenefitsFooter.tsx`/accessibility-statement/Benefits contact page; (2) default value of `ADMIN_NOTIFICATION_EMAIL` (`backend/app/routers/leads.py`) — receives internal notifications when a new lead/appointment/card-order comes in.
- **`no-reply@tivuta.co.il`** — default `EMAIL_FROM` outgoing sender address (`backend/app/services/email_resend.py`). Requires the `tivuta.co.il` domain to be verified in the Resend dashboard (SPF/DKIM) for sending to actually succeed — this is configured on Resend's side, not in this repo.
- All other `@example.com`-style addresses in the frontend are form placeholders only; `test@example.com`/`sara@tivuta.com` in `backend/app/seed.py` are dev seed data — none of these are real.

### To verify current env var values
Since none of these live in the repo, check them directly in each provider's dashboard:
- **Render** → the backend service → **Environment** tab: confirms `EMAIL_PROVIDER`, `RESEND_API_KEY` (presence, not the value), `EMAIL_FROM`, `ADMIN_NOTIFICATION_EMAIL`, `DATABASE_URL`, `CORS_ORIGINS`, `APP_BASE_URL`, `WHATSAPP_*`.
- **Resend dashboard** (resend.com) → API Keys: confirms the key referenced by `RESEND_API_KEY` is active. → Domains: confirms `tivuta.co.il` shows as "Verified" (not "Pending"/failed DNS).
- **Supabase dashboard** → Project Settings → Database: confirms the connection string matches what's set as `DATABASE_URL` on Render.
- **GitHub repo** → Settings → Pages / Actions secrets: confirms `NEXT_PUBLIC_API_URL` (should point at the Render backend URL) and `NEXT_PUBLIC_BASE_PATH` used by the frontend build.

### Which services actually use a GitHub token (audited 2026-07-29)
Checked the real code/workflow files rather than assuming, since a local dev-machine credential
incident (see below) raised the question of blast radius:
- **GitHub Pages deploy (`.github/workflows/deploy.yml`) does NOT use any PAT.** It deploys via
  `actions/deploy-pages@v4` under `permissions: pages: write, id-token: write` — GitHub's own
  automatic per-run token, no `secrets.*` reference anywhere in the workflow. Revoking/rotating a
  personal PAT has zero effect on this.
- **Render is the only service with a real GitHub-PAT dependency**, and only for one feature:
  `services/deploy_trigger.py`'s `trigger_frontend_redeploy()` reads `GITHUB_DEPLOY_PAT` from
  Render's own environment (Worlds/Verticals auto-redeploy-on-save, see that section above). This
  is a fine-grained PAT stored only in Render's dashboard — structurally unrelated to whatever
  token a developer's local machine uses to `git push`, unless someone manually reused the same
  token value in both places. Even if it does go stale, the call is wrapped in try/except
  (`deploy_trigger.py:6-9`), so a bad/revoked token here degrades silently (admin's save still
  works, it just stops auto-triggering a rebuild) — never a hard failure.
- **Supabase and Resend are both unrelated to GitHub entirely** — `SUPABASE_SERVICE_ROLE_KEY` and
  `RESEND_API_KEY` respectively, no token overlap with GitHub in either direction.

### Local git credential setup on the primary dev machine (2026-07-29)
Found and fixed a real exposure: `origin`'s remote URL had a classic GitHub PAT embedded in
plaintext (`https://ghp_...@github.com/...`) directly in `.git/config`. Confirmed via `git grep`/
`git log -S` that it was never committed/never in history — purely a local `.git/config` issue —
but treated as compromised anyway since printing `git remote -v` for diagnosis put it in an AI
conversation transcript.

**The dev machine has two separate GitHub accounts in play**: `Tomer613` (owner of this repo) and
`Tomer-lt` (used for other, unrelated repos/tools on the same machine, incl. `gh` CLI's logged-in
account). This matters for any future credential change here — a fix that's global (e.g. `gh auth
setup-git`, which sets `credential.helper` in `~/.gitconfig`) will silently swap *every* repo on
the machine over to whichever account `gh` is currently logged into, which broke push access here
on the first attempt (`gh` = `Tomer-lt`, who has no write access to `Tomer613/tivuta` → GitHub
offered "create a fork" instead of pushing).

**Correct fix, now in place**: the machine already has Git Credential Manager configured
system-wide (`credential.helper=manager` in `C:\Program Files\Git\etc\gitconfig`) with two
already-cached Windows-Credential-Manager entries — `git:https://github.com` → `Tomer-lt` (the
default, used by other repos) and `git:https://Tomer613@github.com` → `Tomer613`. Setting this
repo's remote to include the username (`git remote set-url origin
https://Tomer613@github.com/Tomer613/tivuta.git`) makes GCM match the `Tomer613`-specific cached
credential for this repo only, with **no local or global `credential.helper` override needed** —
this repo just falls through to the same system-level GCM every other repo already uses, GCM's own
per-username matching does the account isolation. Verified live: `git fetch` and `git push
--dry-run origin main` both succeed with no prompt, no token in `.git/config`, and zero change to
any other repo's credentials on the machine.

**Takeaway for future sessions**: never re-introduce a raw token in this repo's remote URL, and
never run a *global* credential/auth reconfiguration (`gh auth setup-git`, changing
`~/.gitconfig`) to fix a tivuta-specific git problem — this machine has another account depending
on the current global state. Any git-auth fix here should stay scoped to this repo's own
`.git/config` (or, as ended up being unnecessary here, an explicit `Tomer613@` username in the
remote URL matched against the already-system-wide GCM helper).

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

## Shopping Cart (session 2026-07-21)

Lets a member add multiple products to a cart across verticals and submit one "contact me" request for all of them at once, instead of one contact/appointment click per product. Payment is out of scope for now — checkout still just produces leads for an admin to follow up on, same as the existing per-product contact button.

- **Client-side cart, no login required to build one**: `frontend/src/context/CartContext.tsx` (`CartProvider`, `useCart()`) persists to `localStorage` key `tivuta_cart_v1` — same pattern as `tivuta_recent_v2`. Each item is a product snapshot (id, vertical, titles, image, price) + `quantity` (1–99, capped client-side). `CartProvider` wraps `RootHeader`/`children` in `frontend/src/app/[locale]/layout.tsx`, inside `AuthProvider`.
- **`CartIcon`** (`frontend/src/components/CartIcon.tsx`) sits in `RootHeader` next to `NotificationBell`, always visible (not gated on login, since adding to cart doesn't require it). Badge shows `totalCount` (sum of quantities), mirrors `NotificationBell`'s badge styling. Links to `/{locale}/cart`.
- **"Add to Cart" button**: added alongside the existing contact/appointment button in `ProductTile.tsx` (card + detail modal) and `ProductDetailClient.tsx` (the `/products/[id]` promo detail page) — `btn-secondary` style, calls `useCart().addToCart()`, shows a transient "Added ✓" state for 1.8s. Independent of the existing `status`/`leadStatus` state — adding to cart never disables or replaces the contact/appointment flow.
- **Cart page**: `frontend/src/app/[locale]/cart/page.tsx` — a **top-level route, not under `(protected)`**, so it's viewable without login (matches the "no login to add to cart" decision). Lists items with quantity steppers (±) and remove, shows a running total. If not logged in, the checkout button becomes a link to `/{locale}/login?redirect=/{locale}/cart` (the login page already supports `?redirect=`).
- **Checkout is one consolidated backend call, not N**: `POST /leads/cart-checkout` (`backend/app/routers/leads.py`) takes `{items: [{product_id, quantity}], locale}`, creates one `Lead` per product (`lead_type="contact_request"`, `quantity` stored on the row) sharing a generated `cart_group_id` (uuid hex) — but sends **a single consolidated email** to the user and a single consolidated email to admin listing every product + quantity, instead of the N separate emails the old per-product loop would have produced. This was a deliberate choice over looping the existing single-item `POST /leads` endpoint (which the user considered and rejected, precisely to avoid spamming the admin inbox on a 5-item cart checkout).
- **`Lead.quantity`** (Integer, default 1) and **`Lead.cart_group_id`** (String(40), indexed, nullable) — new columns, `backend/alembic/versions/c7794c6bcb54_add_cart_quantity_and_cart_group_id_to_.py`. `quantity` is populated on every lead now (default 1 for the pre-existing single-item `/leads` flow too, via the model default), `cart_group_id` is only set on cart-checkout leads — `NULL` means "not part of a cart checkout."
- **Admin leads table** (`admin/leads/page.tsx`) shows a gold `×N` next to the product title when `quantity > 1`, so an admin reviewing a cart-originated lead sees at a glance it wasn't a single-unit request.
- **Not built (deliberately out of scope for this pass)**: quantity does exist (per the user's explicit choice — unlike a typical "one lead = one product" contact request, a cart item can represent "3 of this ring", though quantity is not tied to any real stock/inventory system since none exists); no cart merge/sync across devices (it's `localStorage`-only, same trade-off as recently-viewed); no payment — checkout still ends at "an admin will contact you," matching every other lead in the system. Direct on-site payment is planned as a later phase per the user.

---

## Worlds / Verticals (session 2026-07-21)

Admins can now add a new "world" (vertical) — e.g. watches, real estate — from the admin panel,
without a developer touching code. Before this, "diamonds/cars/insurance" were hardcoded in 7+
places across the backend and frontend; a new `verticals` table is now the single source of
truth, and every one of those places reads from it instead.

- **`Vertical` model** (`backend/app/models.py`) — `slug` (unique, matches `Product.vertical`/
  `Vendor.vertical`, both widened from `String(20)` to `String(50)`), `label_he/en/fr/yi`,
  `subtitle_he/en/fr/yi`, `icon` (a key into a fixed frontend icon map — see below),
  `supports_appointments` (bool — replaces the old `vertical == "diamonds"` special case),
  `attribute_fields` (JSON array of `{key, label_he, label_en?, type: text|number|select,
  options?}` — the per-vertical custom fields, e.g. diamonds' carat/cut/color), `display_order`,
  `is_active` (soft deactivate — hides the world from public nav/build output on the next
  rebuild, but never touches existing products/vendors already using that slug).
- **`backend/app/routers/verticals.py`** — `GET /verticals` (public, active-only, used by the
  frontend's nav/build), `GET/POST/PATCH /admin/verticals`. Slug is immutable after creation
  (same rule as `Vendor.vertical`). Exports `validate_vertical_slug(db, slug)`, now shared by
  `products.py`/`vendors.py` instead of each keeping its own hardcoded tuple.
  `leads.py`'s `product.vertical == "diamonds"` check and its conversion-stats loop's hardcoded
  `["diamonds","cars","insurance"]` list both now query `Vertical` instead.
- **Auto-redeploy on save**: `admin_create_vertical`/`admin_update_vertical` call
  `services/deploy_trigger.py`'s `trigger_frontend_redeploy()`, which fires a `workflow_dispatch`
  on the GitHub Actions deploy workflow (added to `.github/workflows/deploy.yml` alongside its
  existing `push` trigger) via the GitHub REST API — then emails `ADMIN_NOTIFICATION_EMAIL` a
  confirmation. Both are best-effort (wrapped in try/except — a GitHub API hiccup never fails
  the admin's save) and silently no-op if the new `GITHUB_REPO`/`GITHUB_DEPLOY_PAT` env vars
  aren't set on Render yet (same "skip until configured" philosophy as the email/WhatsApp
  console fallbacks). `GITHUB_DEPLOY_WORKFLOW` optionally overrides the workflow filename
  (defaults to `deploy.yml`).
- **Frontend data-driven everywhere a vertical used to be hardcoded**: `lib/api.ts`'s
  `getVerticals()` (public fetch, used both at build time in `generateStaticParams` and at
  runtime — same pattern as the pre-existing `getAllProductIds()`) and
  `lib/useVerticals.ts`'s `useVerticals()`/`useAttrLabels()` hooks (module-level fetch cache) are
  now the only way any component reads vertical data. Consumers: the dynamic
  `(protected)/[vertical]/page.tsx` route (replaced the old static `diamonds/`, `cars/`,
  `insurance/` folders — `generateStaticParams` fetches the live vertical list at build time,
  same proven pattern as `products/[id]/page.tsx`), `VerticalListingClient.tsx` (title/subtitle/
  `supports_appointments` per vertical, replacing its old hardcoded `COPY` dict),
  `ComparisonBar.tsx` (attribute labels, via `useAttrLabels()`, replacing its own hardcoded
  `ATTR_LABELS` dict), the homepage's vertical tiles, `SiteFooter`, `GlobalSearch`, and the admin
  products/vendors forms' vertical dropdowns + attribute-field forms.
- **Icon allow-list** (`frontend/src/lib/verticalIcons.tsx`) — lucide-react icons must be
  statically imported, so a vertical's `icon` string is a key into a fixed ~10-icon map
  (`Gem, Car, ShieldCheck, Home, Watch, Briefcase, Store, Sparkles, Heart, Building2`), not an
  arbitrary dynamic import. The same fixed list is validated server-side in `schemas.py`'s
  `VALID_VERTICAL_ICONS` — the two lists must be kept in sync manually if the icon set changes.
- **New admin page** `admin/verticals/page.tsx` (nav tab "עולמות" in `admin/layout.tsx`) — create/
  edit a world: slug (locked after creation), label/subtitle × 4 languages, icon picker,
  "supports appointments" checkbox, display order, active toggle, and a repeatable
  attribute-field builder (key + label_he/label_en + type + comma-separated options for
  `select` fields) modeling what used to be the hardcoded `VERTICAL_ATTRS` in
  `admin/products/page.tsx`.
- **Deliberately not validated**: `Product.attributes` stays free-form JSON, never checked
  against the owning vertical's `attribute_fields` — keeps this change low-risk (no chance of
  rejecting an existing product) and matches `attributes`' pre-existing unvalidated behavior.
- **New Render env vars** (add to the deployment table): `GITHUB_REPO` (`owner/repo`),
  `GITHUB_DEPLOY_PAT` (fine-grained PAT scoped to this repo, "Actions: read and write"),
  `GITHUB_DEPLOY_WORKFLOW` (optional, defaults to `deploy.yml`).

### Instant-loading worlds (session 2026-07-26) — superseded the "wait for rebuild" constraint above, then simplified to a single route per resource
The original `(protected)/[vertical]/page.tsx` dynamic route required every slug to be known at
build time via `generateStaticParams` — a brand-new world had no HTML file to serve until the
auto-triggered rebuild above actually finished (a few minutes, and only if `GITHUB_DEPLOY_PAT`/
`GITHUB_REPO` were configured). Fixed by applying the same query-param technique the codebase
already used for individual products (`(protected)/products/page.tsx` + `ProductQueryPage.tsx`
reading `?id=`, so a brand-new product needs no rebuild either) to worlds:
- **`(protected)/world/page.tsx`** + **`components/VerticalQueryPage.tsx`** — a single fixed
  static page (not a dynamic segment, so nothing to enumerate at build time) that reads `?slug=`
  via `useSearchParams()` and renders `<VerticalListingClient vertical={slug} />`. Since
  `VerticalListingClient` already does all of its data-fetching client-side at runtime (it was
  never actually build-time-bound — only the route's *existence* was), a slug created seconds ago
  renders correctly with zero rebuild wait.
- **The old `[vertical]/page.tsx` and `products/[id]/page.tsx` dynamic routes were deleted
  outright**, not kept for backward compatibility — this is a pre-launch site with no real
  audience holding bookmarked/shared links yet, so there was nothing to preserve. `/world?slug=X`
  and `/products?id=X` are the only routes for a world/product, full stop. If external links ever
  need preserving after a real launch, that's a "add a redirect" problem to revisit then, not a
  reason to carry two parallel URL schemes now.
- **`VerticalListingClient.tsx`** gained a guard: if `vertical` is empty or doesn't match any
  fetched world (once loading has actually finished — not before, since `verticalMeta` is
  legitimately still `null` while a real fetch is in flight), it shows the empty-state message
  instead of falling through to `GET /products?vertical=` with a blank filter, which used to
  return every product across every world unfiltered.
- **Links that pointed at a specific product no longer route through the world page at all** —
  `GlobalSearch.tsx`, `ProfileClient.tsx`'s "Recently Viewed", `admin/leads/page.tsx`'s product
  link, and `admin/distribution/page.tsx`'s WhatsApp campaign text now link straight to
  `/products?id=X`, since that's exactly what `VerticalListingClient`'s legacy `?product=`
  redirect used to forward them to anyway — one fewer redirect hop, and it fixed a small
  pre-existing bug where "Recently Viewed" tiles linked to the whole world instead of the specific
  product.

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

## Back-Office Orders (Phase 1 — session 2026-07-28)

Before this, every fulfillable request (product interest, appointments, card requests) landed
flat in the admin "פניות" (Leads/Inquiries) tab as individual `Lead` rows — a 5-item cart checkout
looked like 5 unrelated inquiries, there was no order number, and there was no way to see a
customer's other open requests. This phase covers order numbering and per-order vendor/vertical
breakdown; **Phase 2** (cross-customer vendor consolidation batches + picking/packing documents,
shipped the same session — see the section right below this one) builds directly on it.

- **New model `CustomerOrder`** (table `customer_orders`, `backend/app/models.py`) wraps one or
  more `Lead` rows created together under one customer-facing order. `order_number` is a computed
  property (`f"ORD-{self.id:06d}"`), not a stored column — avoids a flush-then-update dance.
  **Not to be confused with the pre-existing, unrelated `Order` model** (table `orders`, used only
  by `GET /orders/me` / the profile page's legacy "My Orders" section) — the name was deliberately
  chosen to avoid colliding with it.
- **Every current lead-creating path now wraps its lead(s) in a `CustomerOrder`** — not just cart
  checkouts. This was a deliberate, explicit correction from the user during planning: appointments
  and card-order requests are "orders" too, same as a product purchase; only a true general
  "contact us" inquiry belongs in the "פניות" tab. **Update (session 2026-08-12): that inquiry type
  was built — see "General Contact Us Feature" below** (`lead_type="general_inquiry"`,
  `customer_order_id=NULL`). `club_signup` remains a documented but never-created `lead_type`.
- **Product-purchase creation is unified into a single code path**: `POST /leads/cart-checkout`
  (`routers/leads.py`) is now the *only* way a `contact_request` lead gets created — both "add to
  cart" (do it later) and the single-product "contact me now" button now call it (the latter with
  a one-item, ad-hoc array, bypassing `CartContext` entirely so it never touches the customer's
  persisted "for later" cart). `POST /leads` (`create_lead`) now 400s if it would have resolved to
  `contact_request` — it only creates `appointment` leads. This was the user's explicit
  instruction: "all orders should walk through shopping cart," so there's exactly one place that
  can drift on quantity/order-number logic instead of two.
- **Found and fixed a real bug while wiring this up**: `cart_checkout`'s per-product loop closed
  over a stale `item` from an earlier merge loop (`quantity=item.quantity` instead of the
  per-product `quantity` from the loop it was actually in) — every line item in a cart checkout was
  silently getting tagged with the *last* cart item's quantity. Fixed as part of this change since
  Orders now surfaces quantity prominently.
- **`GET /admin/orders`** returns every `CustomerOrder` with nested line items (any `lead_type`),
  each including `vendor_id`/`vendor_name_he` (joined via `product.vendor`). **`GET /admin/leads`
  now filters to `customer_order_id IS NULL`** — intentionally empty today, reserved for a future
  general "contact us" feature; the existing `admin/leads/page.tsx` needed zero code changes.
  `PATCH /admin/orders/{id}/notes` adds order-level notes, mirroring the existing per-lead notes
  pattern. Per-line-item actions (status/notes/assign) reuse the existing `PATCH
  /admin/leads/{id}/...` endpoints unchanged — a `Lead`'s id doesn't care which tab surfaces it.
- **New admin page `admin/orders/page.tsx`** (new "הזמנות" nav tab in `admin/layout.tsx`, placed
  before "פניות") — adapts `admin/leads/page.tsx`'s existing Table/Calendar/Kanban machinery to
  render order-grouped: each order is a card showing `order_number`, customer info, an "X other
  active orders from this customer" badge (computed client-side from the already-loaded full order
  list — no extra request), and its line items grouped first by vertical, then by vendor within
  each vertical. The vendor grouping shows a **display-only** computed sub-order suffix (e.g.
  `ORD-000123-A`, `-B`, ...) assigned by sorting distinct vendor ids present in that order — not a
  persisted field; promote it to a stored column only if a future need requires handing that
  exact string to a vendor externally (e.g. on a printed PO).
- **Migration** (`861a4db9d155_add_customer_orders.py`) backfills every pre-existing `Lead` (all
  types) into a `CustomerOrder`: leads sharing a `cart_group_id` are grouped into one order (same
  grouping cart-checkout uses going forward); every other lead gets its own one-line order. Same
  backfill-in-migration shape as the `customer_number` backfill in
  `15f5ddaec4a5_add_loyalty_points_system.py`.
- **`cart/page.tsx`** shows the resulting order number on the post-checkout success screen,
  formatted client-side from `customer_order_id` (added to `LeadRead`) — `ORD-{id:06d}`.
- **Verified end-to-end** with a real browser session (Playwright, tokens injected into
  `localStorage` since the seeded admin/member passwords in `seed.py` no longer match what's in the
  dev DB): cart checkout with mixed quantities produced one order with correct per-item quantities;
  the single-product "contact me now" button on a non-appointment vertical created a one-line
  order via the same endpoint; `/admin/orders` rendered vertical/vendor grouping and the
  "other active orders" badge correctly; `/admin/leads` rendered its empty state as expected.

---

## Back-Office Orders Phase 2: Vendor Purchase Batches (session 2026-07-28)

Builds on Phase 1 above. Phase 1 gave every checkout an order number and a per-order
vertical/vendor breakdown; still missing was the **cross-customer** procurement workflow the user
originally asked for — e.g. 50 different customers each order "Jerusalem kugel" from the same
vendor, and the admin wants to combine all of those into one consolidated purchase, then get
organized picking/packing documents once the pallet physically arrives.

- **New model `VendorPurchaseBatch`** (table `vendor_purchase_batches`, `backend/app/models.py`)
  groups `Lead` line items from many different `CustomerOrder`s that share a vendor under one
  procurement action. `batch_number` is a computed property (`f"PB-{self.vendor_id:03d}-
  {self.id:06d}"` — vendor code + sequential id, see "Vendor Identity" below for why), same
  "computed, not stored" pattern as `CustomerOrder.order_number`. `Lead.vendor_batch_id` is
  **deliberately separate from `Lead.status`**: `status` tracks customer-contact progress,
  `vendor_batch_id`/the batch's own `status` (`open → ordered → received`) tracks procurement
  progress — a line item can be `contacted` and still unbatched, or batched-and-received while
  still `new`. Migration `bbcdc94e0e14_add_vendor_purchase_batches.py` has no backfill — every
  pre-existing lead simply gets `vendor_batch_id = NULL`, correctly meaning "not yet procured."
- **Claiming reuses the exact atomic-update shape** the loyalty program already established for
  `CommissionSettlementPeriod` (`vendors.py:106-150`, session 2026-07-18/19): `POST
  /admin/vendors/{vendor_id}/purchase-batches` (body `{lead_ids}`) creates the batch, flushes for
  its id, then runs a single `UPDATE leads SET vendor_batch_id = :id WHERE id IN (:lead_ids) AND
  vendor_batch_id IS NULL AND lead_type = 'contact_request' AND status NOT IN ('closed',
  'cancelled') AND product_id IN (vendor's products)` — a double-submit can't double-claim a row,
  verified live (submitting the same lead_ids twice claims 0 the second time). The `lead_type =
  'contact_request'` guard specifically prevents an appointment or card-order lead from ever being
  claimed into a procurement batch, even though such a lead could share the same vendor's product
  — appointments aren't things you buy inventory for.
- **`PATCH /admin/vendors/{vendor_id}/purchase-batches/{batch_id}/status`** enforces forward-only
  transitions (`open→ordered→received` only) — verified live that `received` before `ordered` is
  rejected (400).
- **New "אצוות רכש" (Purchase Batches) modal** in `admin/vendors/page.tsx` — a `Boxes`-icon button
  per vendor row (next to the existing `Wallet` settlements icon), structured identically to that
  settlements modal (`settlementsVendor`/`settlements` state → `batchesVendor`/`batches`). The page
  additionally fetches `adminListOrders()` (Phase 1's endpoint) once and computes, client-side,
  each vendor's unbatched+active `contact_request` line items — no new "list unbatched items"
  backend endpoint, since the frontend can already see everything it needs from that call (same
  "load everything, filter in JS" convention every other admin page in this codebase follows).
  Admin selects items (or "select all"), opens a batch, and advances it through
  ordered/received via the history list.
- **Picking list and packing list documents are computed entirely client-side** from a batch's
  already-fetched `items` — no HTML-string-building backend endpoints. Picking list aggregates by
  product (total quantity to expect on the pallet); packing list groups by `order_number` (which
  customer gets which items, with phone/email — **there is no shipping address for regular
  product orders**, only `card_order` leads have one, so contact info is the only "how to reach
  them" data available, noted directly in the UI). Each has its own print + CSV button.
- **`frontend/src/lib/printDocument.ts`** (new shared utility) — `openPrintableTable()` builds a
  minimal RTL HTML table and opens it via `URL.createObjectURL(new Blob(...))` in a new tab (no
  `document.write`, no new Next.js route — this is a static-export site, so a dynamically
  generated page can't be a build-time route anyway); the opened tab has its own "הדפס" button
  (hidden via `@media print`) rather than auto-triggering `window.print()`. `downloadCsv()` is the
  same client-side CSV-blob pattern already used in `admin/orders/page.tsx`/`admin/leads/page.tsx`,
  extracted here for reuse. A 3rd "PDF" document option is planned for later, not built now.
- **`admin/orders/page.tsx`** shows a small green "אצווה PB-000001" badge next to a line item's
  type badge once it's been claimed into a batch (`CustomerOrderLineRead.vendor_batch_id`, added
  to the Phase 1 schema) — so an admin browsing Orders can see at a glance that procurement is
  already in motion for that item, without needing to open the vendor's batch modal.
- **Verified end-to-end** with a real browser session (Playwright): consolidated 3 different
  customers' orders for the same vendor/product into one batch, advanced it open→ordered→received,
  opened the documents panel, printed the picking list (new tab rendered a correct aggregated
  table), and confirmed the batch badge appeared on all 3 orders back on `/admin/orders`. Hit and
  fixed one unrelated environment issue along the way: a stale Turbopack `.next` cache caused every
  nested route under `[locale]/(protected)/...` to 404 after several rapid edits to
  `admin/vendors/page.tsx` — deleting `frontend/.next` and restarting `next dev` resolved it; not
  a code bug, just something to try first if admin routes start 404ing mid-session after heavy
  editing.

### Post-review fixes (same session, after a multi-angle code review of both phases)
- **`admin_create_vendor_batch` no longer leaves a phantom empty batch** on a raced/duplicate
  claim: the atomic `UPDATE`'s claimed-row count is now checked before committing — if it's 0,
  the batch insert is rolled back and a 400 is raised instead of committing a real, empty,
  permanently-visible batch with a misleading success toast. The frontend toast also now says
  "X of Y items" if a claim comes back partial, not just a blanket success message.
- **Bulk multi-select (status/assign) was restored on `admin/orders/page.tsx`**: the review found
  that filtering `GET /admin/leads` to unwrapped leads only (Phase 1) had an undiscussed side
  effect — `admin/leads/page.tsx`'s bulk-select toolbar had nothing left to select, and Orders had
  no equivalent, silently losing the "select many, act once" workflow. Orders now has the same
  checkbox/select-all/bulk-action toolbar the Leads page always had, calling the same pre-existing
  `PATCH /admin/leads/bulk` (`adminBulkLeadAction`) — no backend change needed, since a `Lead`'s id
  doesn't care which admin tab it's acted on from.

### Second review pass fixes (after Vendor Identity — reviewed the whole Orders+Vendors system, not just the delta)
- **The batch badge on `admin/orders/page.tsx` now matches the real `batch_number` format.** The
  Vendor Identity commit changed `VendorPurchaseBatch.batch_number` to include the vendor code
  (`PB-007-000042`) everywhere except one spot: the small green badge on an order line that's
  already been claimed into a batch still hardcoded the old `PB-{id:06d}` reconstruction. Fixed to
  build the same string from `vendorCode(line.vendor_id)` + the padded batch id — found
  independently by 3 of 8 review angles, a good example of why "grep for every consumer of a
  format you're changing" matters more than it seems.
- **Bulk-selected ids no longer survive a filter change.** `admin/orders/page.tsx`'s bulk-select
  toolbar (added in the previous fix round) never cleared `selectedIds` when the admin changed
  `search`/`filterStatus`/`filterVertical`/`filterType` — so selecting items, changing a filter,
  and clicking "בצע" could silently bulk-act on now-invisible leads. Fixed via a new shared
  `frontend/src/lib/useBulkSelection.ts` hook that clears the selection whenever a `resetKey`
  (the joined filter values) changes — used by both `admin/orders/page.tsx` and
  `admin/leads/page.tsx` (which had the exact same latent bug, just never exercised by a diff a
  reviewer was looking at, since that file wasn't touched by the commits under review).
- **The bulk-action toolbar UI itself was extracted** into
  `frontend/src/components/admin/BulkActionToolbar.tsx` — it had been copy-pasted verbatim into
  `admin/orders/page.tsx` and had *already* drifted from `admin/leads/page.tsx`'s copy (different
  toast wording) after only one edit cycle. Both pages now render the same component and only
  keep their own `bulkAction`/`bulkValue`/`bulkLoading` state and `handleBulkAction` (which
  legitimately differ — different refresh/patch strategy per page, see next point).
- **`admin/orders/page.tsx`'s bulk action patches state locally instead of refetching everything.**
  `handleBulkAction` used to call `adminListOrders()` (a full, unpaginated, eager-loaded dataset)
  after every bulk action, even though it already knows exactly which ids changed and to what —
  the same information `handleStatusChange`/`handleAssign` already use with the existing
  `updateLineInState` helper. Bulk actions now loop `selectedIds` through the same helper.
- **The zero-claim vs. partial-claim UX asymmetry was unified.** Claiming 0 of N selected items
  used to hard-error (400 → thrown `Error` → scary red toast); claiming 1+ of N always succeeded
  (200 → calm "X of Y" info toast) — the *same* underlying race (some/all selected leads already
  claimed elsewhere) surfaced with two different severities depending only on how many leads lost
  the race. `admin_create_vendor_batch` now returns `null` (200) instead of raising when nothing
  was claimable — no error, no phantom batch either way — and `handleOpenBatch` shows the same
  calm, specific messaging for the 0-of-N case as it already did for the partial case.
- **Two small defensive hardenings, neither currently reachable but cheap to close:**
  `admin_create_vendor_batch`/`admin_update_vendor_batch_status` now check `_load_batch`'s result
  for `None` before dereferencing it (previously would have raised an unhandled `AttributeError`
  instead of a clean 500, if ever reached — there's no delete endpoint for `VendorPurchaseBatch`,
  so this was purely theoretical); the `861a4db9d155` migration's cart-group backfill loop now
  skips a `None` `user_id` the same way its sibling loop already did (unreachable given every
  current code path that sets `cart_group_id` also always sets `user_id` on the same `Lead`, but
  asymmetric defensive checks in twin loops are exactly the kind of thing worth matching anyway).
- **Deliberately NOT fixed**: `admin_open_settlement_period` (pre-existing loyalty-program code,
  not part of this session's Orders/Vendors work) has no equivalent zero-claim guard, despite
  `admin_create_vendor_batch`'s docstring calling it "same shape." Concluded this is a different
  case, not the same bug: a purchase batch with zero items is never meaningful (nothing to order),
  but a settlement period covering a genuinely slow/quiet date range with zero transactions is a
  legitimate business record ("$0 owed this period"), so blocking it the same way could turn a
  real "nothing owed" record into a confusing error. Left as-is rather than porting a fix that
  might not actually be correct for that endpoint's semantics.

---

## Vendor Identity: Stable Codes + Specialty + Contact Info (session 2026-07-29)

Phase 2's per-order vendor suffix (`ORD-000123-A`) was explicitly a placeholder — computed by
sorting the distinct vendor ids *within one order* and assigning letters, so the same vendor could
be "A" in one order and "C" in another. Discussing that limitation with the user led to a real
per-vendor identity:

- **`Vendor.vendor_code`** — computed property (`f"{self.id:03d}"`, e.g. vendor #7 → `"007"`),
  same "computed, not stored" convention as `CustomerOrder.order_number`/`VendorPurchaseBatch.
  batch_number`. Deliberately **not** admin-editable — no uniqueness validation needed, zero data
  entry, and it's the option the user explicitly chose over a custom/free-typed code.
- **`Vendor.specialty`** (new nullable column) — free text for what the vendor actually supplies
  (e.g. "קוגלים", "תכשיטי יהלומים") — distinct from and finer-grained than the existing coarse
  `vertical` field (diamonds/cars/insurance). Admin-UI-only, so no per-language variants needed
  (unlike `name_he/en/fr/yi`) — matches "Admin UI is Hebrew-only" already established elsewhere.
- **`Vendor.contact_phone`/`contact_email`** (new nullable columns) — who to actually call/email to
  place an order. Deliberately separate from `login_email` (the vendor portal's login credential,
  Phase 3 of the loyalty program) — conflating a business contact with an auth credential would
  have been wrong.
- **The per-order vendor suffix now uses `vendor_code` directly** (`admin/orders/page.tsx`'s
  `groupOrderItems`) instead of sorting/assigning letters — `ORD-000123-007` means vendor #7 in
  *every* order it appears in, not just that one. This deleted the `vendorIds`/`indexOf` logic
  entirely — `vendorCode()` is a pure function of the id, no per-order context needed.
- **`VendorPurchaseBatch.batch_number` also folds in the vendor code**: `f"PB-{self.vendor_id:03d}-
  {self.id:06d}"` (was `f"PB-{self.id:06d}"`) — since a batch already belongs to exactly one
  vendor, this makes a batch number self-identifying on a printed document without needing the
  app open next to it.
- **`frontend/src/lib/api.ts`** exports a shared `vendorCode(vendorId: number): string` helper —
  used both in `admin/vendors/page.tsx` (table) and `admin/orders/page.tsx` (order suffix), since
  a `CustomerOrderLine` only carries a bare `vendor_id`, not a nested vendor object.
- **`admin/vendors/page.tsx`** table gained קוד/תחום אחריות/טלפון/מייל columns (table wrapper
  changed from `overflow-hidden` to `overflow-x-auto` to accommodate); the Purchase Batches modal
  header now shows the vendor code and a "צור קשר: {phone} · {email}" line — directly useful at
  the exact moment an admin is about to place a consolidated order.
- **Migration** (`50da6b936e9b_add_vendor_specialty_contact_fields.py`) — three plain nullable
  `op.add_column`s on `vendors`, no FK/index so no `batch_alter_table` needed (unlike Phase 1/2's
  FK-carrying columns on `leads`, which required SQLite's batch-mode table-copy dance).
- **Verified end-to-end** live: `vendor_code`/`specialty`/contact fields round-trip through
  `PATCH /admin/vendors/{id}`; a new batch for vendor #1 correctly produced `PB-001-000001`; the
  vendors table, edit form, and Purchase Batches modal all render the new fields; `/admin/orders`
  shows a stable `-001` suffix for that vendor.
- **Not built** (noted as an easy future option, not requested now): a human-chosen memorable code
  (e.g. "D-01") instead of the sequential id-based one — would only require changing the one
  `vendor_code` property/`vendorCode()` helper, since every consumer (order suffix, batch number,
  documents, CSV) already goes through it.

---

## User-Facing Order Lookup (session 2026-07-29)

A robustness/clarity audit of the whole Orders+Vendors system (done right after Vendor Identity)
found that a member had **no durable way to find an order again** after checking out. The cart
success screen computed `order_number` client-side into local React state only — refresh or leave
the page and it was gone. The profile page's existing "ההזמנות שלי" section looked like it should
help but doesn't: it reads `GET /orders/me`, the legacy/unrelated `Order` table (a simple
amount/title/status ledger that predates `CustomerOrder` and has nothing to do with the
marketplace checkout flow — CLAUDE.md already warned not to confuse the two). "Activity history"
shows flat `Lead` rows grouped by vertical, with no order number and no order-level grouping.

- **`GET /users/me/orders`** (`routers/leads.py`) — new customer-scoped endpoint returning every
  `CustomerOrder` belonging to the current user (cart checkouts, single-item "contact me now"
  orders, appointments, card requests — anything wrapped in a `CustomerOrder`), newest first. Uses
  a **separate, customer-safe schema** (`MyOrderRead`/`MyOrderLineRead`, modeled on the existing
  `LeadHistoryRead` pattern already used for `/users/me/activity`) that deliberately omits
  admin-internal fields present on the admin equivalent (`CustomerOrderRead`/
  `CustomerOrderLineRead`): no `notes`, `history`, `assigned_to`/`assigned_to_name`, or
  `vendor_id`/`vendor_name_he`/`vendor_batch_id` — none of that is the customer's business. A new
  `_my_order_line_from_lead()` helper sits next to the existing admin `_order_line_from_lead()` in
  `leads.py`, same shape, leaner output.
- **Profile page gained a new "מעקב הזמנות" (Order Tracking) section** (`ProfileClient.tsx`),
  placed **before** "Activity history" since orders are now the primary customer-facing concept.
  Each order card shows `order_number` (bold gold, `dir="ltr"`) + date, a client-side-computed
  rollup line for multi-item orders (e.g. "0 / 2 הושלמו" — counts `status === 'closed'` items, no
  new backend field needed), and each line item's product/quantity/status — reusing the existing
  `leadTypeLabel`/`statusLabel`/`statusColor` helpers so status vocabulary/colors match every other
  section on the page. `leadTypeLabel` was extended to handle `card_order` (previously fell through
  to a generic "בקשה" label — harmless before since the Activity section explicitly filters
  `card_order` out via `marketplaceActivity`, but the new section doesn't filter, so it needed a
  real label). The section has `id="my-orders"` so it can be deep-linked.
- **This is purely additive** — the pre-existing legacy "ההזמנות שלי" section (`orders` state,
  `GET /orders/me`) was deliberately left untouched, same data, same place, still unrelated to
  `CustomerOrder`.
- **Cart success screen** (`cart/page.tsx`) now links the order-number line to
  `/${locale}/profile#my-orders`, so checkout naturally teaches the user where to find the order
  again later instead of the number being a one-time-only display.
- **Verified end-to-end** live: `GET /users/me/orders` returns the right orders/items for a member
  with 3 single-item orders and confirmed a *different* member's token only sees their own
  (separately confirmed multi-item order with correct per-item quantities and rollup); Playwright
  screenshots confirmed the new section renders correctly in RTL Hebrew with the dark navy/gold
  theme, the rollup/quantity line renders on a real 2-item order, the `#my-orders` anchor exists
  and is deep-linkable, the legacy "ההזמנות שלי" section is unaffected, and there were zero console
  errors.

---

## In-Place Quantity Stepper on Product Cards (session 2026-07-30)

Before this, "Add to Cart" and "Contact Me" on a product tile were one-shot buttons — to change a
quantity you had to leave the page and go to `/cart`, which only had a stepper for items already
added. The user wanted the button itself to become the quantity control, in place, the instant
it's pressed.

- **"Add to Cart"** → clicking it swaps the button, in the same slot, for a live +/- stepper bound
  directly to the real `CartContext` quantity for that product (`items.find(i => i.id ===
  product.id)?.quantity ?? 0` — fully derived, no separate local state). Decrementing to 0 calls
  the existing `updateQuantity()`, which already auto-removes the item
  (`CartContext.tsx:63-69`) — the slot reverting back to the plain "Add to Cart" button is a free
  side effect of that derived state, not extra code. No more transient "Added ✓" 1800ms timeout —
  the persistent stepper itself is the confirmation, which also incidentally fixed a small
  pre-existing bug (that timeout had no cleanup on unmount in either of the two files it lived in).
- **"Contact Me"** (`actionType === 'contact'`) fires an immediate one-shot order
  (`POST /leads/cart-checkout`) with no backend support for editing quantity after the fact — so
  unlike Add to Cart, quantity has to be set *before* sending, not after. **Per explicit user
  choice** (offered a simpler single-click alternative, user picked this one) it's now a two-tap
  flow: first click swaps the button for a stepper (starts at 1, nothing sent yet) + a compact
  "שלח" send button, in the same slot; adjusting the stepper is free; tapping send fires the
  request with whatever quantity was dialed in. **Decrementing the contact stepper below 1 cancels
  back to the plain "Contact Me" button** — a deliberate refinement beyond what was originally
  planned (the plan only specified clamping at 1), added because it gives a free, discoverable
  "change my mind" exit using the same control, mirroring exactly how the cart stepper bottoms out
  back to its own originating button — no separate cancel button needed on either flow.
- **"Schedule Viewing"** (`actionType === 'appointment'`) is untouched — an appointment is a single
  visit, not a quantity, and the user's request named "contact me"/"add to cart" specifically.
- **Extracted into a new shared component, `frontend/src/components/ProductActionButtons.tsx`**,
  used by both `ProductTile.tsx` (the grid card, `compact` sizing) and `ProductDetailClient.tsx`
  (the `/products?id=` detail page, full sizing) — previously these two files carried fully
  independent copies of this button block (same handlers, same JSX, same unfixed timeout-cleanup
  gap). Given this session's own precedent for extracting shared logic once duplication starts
  drifting (`useBulkSelection`/`BulkActionToolbar`, from the Orders+Vendors work), adding a
  meaningfully more complex stepper state machine to both copies instead of one shared component
  would have doubled an already-duplicated block. Each caller keeps owning its own per-locale
  translation strings (`ProductTile`'s `translations`, `ProductDetailClient`'s `T`) and just passes
  the handful of needed ones through as a `labels` prop — the shared component doesn't own a third
  translation object, only the couple of new strings the stepper itself needed (send button, +/-
  aria-labels), which follow the **existing precedent** already shipped on the cart page
  (`cart/page.tsx:126/136`) of hardcoded Hebrew-only aria-labels, not a new inconsistency.
- **Visual language matches the cart page's stepper exactly** (`cart/page.tsx:123-142` — circular
  `w-7/8 h-7/8` +/- buttons, lucide `Minus`/`Plus`, centered count), wrapped in a
  `rounded-2xl border border-[#f0e6d3]/30` pill sized like `.btn-secondary` so the swap reads as
  "the same button, now interactive" rather than a layout jump. Both the stepper's appearance and
  a button reverting back use the pre-existing `.animate-fade-in` utility (`globals.css:177-182`)
  for a soft transition — no new CSS added.
- **Verified end-to-end** live via Playwright on both `ProductTile` (listing grid) and
  `ProductDetailClient` (detail page): Add to Cart → stepper appears, `CartIcon` badge updates live
  on increment, decrementing to 0 reverts to the plain button (confirmed via screenshot after an
  initial test-script locator bug gave a false negative — the revert itself works correctly);
  Contact Me → stepper + send appears with zero network calls until send is pressed, sending with a
  dialed-in quantity of 3 produced a real order with `quantity: 3` confirmed via `GET
  /users/me/orders`; Schedule Viewing (diamonds, appointment vertical) confirmed completely
  unchanged, opens `AppointmentModal` directly. Zero console errors throughout; test data cleaned
  up afterward to restore the dev DB baseline (4 `customer_orders`, 5 `leads`).

### Post-implementation review fixes (same session, after an 8-angle code review)
A code review of the diff above (5 independent finder angles, all converging on the same root
cause for the top finding) surfaced real bugs; all were fixed:
- **The cart snapshot bug** (found independently by all 5 review angles): `addOneToCart` was
  calling `addToCart(product)` with whatever `product` prop the caller passed — the *full* listing
  `Product` (attributes, promotions, ratings, vendor) or the *full* raw `any`-typed detail-page API
  response — instead of the deliberate 8-field snapshot the pre-refactor code always built by hand.
  Every cart item was silently persisting several KB of stale, undeclared metadata into
  `localStorage['tivuta_cart_v1']`. Fixed by having `ProductActionButtons` build its own narrow
  `cartSnapshot` (the same 8 `CartItem` fields, nothing else) before ever calling `addToCart()` —
  the narrowing now happens once, inside the component that owns the cart interaction, regardless
  of how much extra data a caller's `product` prop actually carries.
- **Cart-tile stepper decrement no longer deletes on a single click**: it previously had no floor
  guard, so decrementing from 1 called `updateQuantity(id, 0)`, which `CartContext` treats as a
  remove — a full, silent, unconfirmed cart-line deletion reachable by one click on a
  listing/detail page, a much higher accidental-click surface than the dedicated cart page (which
  already floors its own stepper at 1 and requires a separate trash-icon click to actually
  remove). Fixed by flooring the cart-tile stepper the same way (`decDisabled={cartQty <= 1}`) —
  **this is a deliberate behavior change from the original stepper plan**, which had explicitly
  designed decrement-to-zero-removes as a feature ("no dead/orphan state"). The review correctly
  identified that feature as the actual source of the accidental-deletion risk; once added to a
  tile's cart, an item can now only be fully removed via the cart page, matching how removal has
  always worked everywhere else in the app. The Contact-Me stepper's decrement-to-cancel behavior
  (reverting to the plain "Contact Me" button) was **not** changed — that one is fully reversible
  pre-send state, not a real deletion, so the original risk doesn't apply there.
- **Restored the `if (!token) return;` guard** in `handleContactSend`/`handleScheduled` that the
  extraction had dropped — low real-world risk today since both call sites sit behind `AuthGate`,
  but worth keeping on a component now explicitly meant to be reusable/shared.
- **Fixed an impure React state updater**: `onDec` for the contact stepper used to call
  `setStatus('idle')` as a side effect from inside `setContactQty`'s functional updater (would
  double-fire under React 18 StrictMode's intentional double-invocation). Rewritten to read
  `contactQty` directly and branch before calling either setter — no updater impurity.
- **Extracted `frontend/src/components/QuantityStepper.tsx`**, a real shared +/- control now used
  by `ProductActionButtons.tsx` *and* `cart/page.tsx` (which previously had its own separate,
  already-drifting inline copy — e.g. no 99-cap disable on its increment button). One component,
  one place to fix a future visual or behavioral tweak.
- **Removed the hardcoded `SEND_LABEL`/Hebrew-only aria-label inconsistency**: the "Send" button
  text and the stepper's `decLabel`/`incLabel` now flow through the same per-caller `labels` prop
  every other button string already used (`ProductTile`'s `translations`, `ProductDetailClient`'s
  `T`, and `cart/page.tsx`'s own `translations` all gained `send`/`dec_qty`/`inc_qty` keys across
  all 4 locales) — fully localized everywhere the stepper now appears, including the cart page's
  aria-labels, which had been Hebrew-only since before this whole feature existed.
- **Removed the now-dead `added_to_cart` translation key** (8 entries across `ProductTile.tsx` and
  `ProductDetailClient.tsx`, one per locale) — unused since the transient "Added ✓" confirmation
  was replaced by the persistent stepper itself.
- **Verified end-to-end** live via Playwright: a fresh cart-add's `localStorage` entry has exactly
  the 9 expected keys (8 `CartItem` fields + `quantity`) and nothing else; the cart-tile stepper's
  minus button is disabled at qty 1 and the item survives a click on it; the Contact-Me flow still
  shows the Send button and its decrement-to-cancel still works; the appointment flow (diamonds) is
  untouched; the English locale renders the localized "Decrease quantity" aria-label. Zero console
  errors, dev DB confirmed still at baseline (no test data needed cleanup this round). Hit the
  documented stale-Turbopack-cache gotcha again mid-verification (routes 404ing after the batch of
  edits) — same fix as before, delete `frontend/.next` and restart.

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
- **Admin issues/resets vendor portal credentials**: `PATCH /admin/vendors/{id}/portal-access` (`routers/vendors.py`) sets `login_email`+`hashed_password`. Cross-checks that the email isn't already a member's `User.email` or another vendor's `login_email` — keeps the two principal types' emails disjoint even though the `typ` claim already prevents any auth confusion. **Update (session 2026-08-13): self-service signup (invite-based) and password-reset were built — see "Vendor Portal Self-Service Signup/Password-Reset" below.** Vendors are still exclusively admin-curated (no open registration) — this endpoint remains the only way a `Vendor` row ever gets portal credentials at all.
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

## Public Product-Sharing: view-only product page + WhatsApp preview (session 2026-08-11)

Tivuta stays members-only by deliberate choice (see the AuthGate limitation note above) — this
session did **not** open up `/world` or home. It resolved a narrower, real problem: sharing a
product link on WhatsApp showed a generic preview card (never the actual product photo, since a
static export can't vary `og:image` per `?id=`) and landed the recipient on a bare login wall
instead of the product they were sent. Both are fixed for the **product detail page specifically**;
browsing the rest of the catalog still requires login exactly as before.

- **`/products?id=` is now viewable without login** — `frontend/src/app/[locale]/products/page.tsx`
  was moved out of `(protected)/` to a top-level route (the same location `cart/page.tsx` already
  established for "public page, gated actions"). Zero changes were needed to `world/page.tsx` or
  home — `(protected)/layout.tsx` is the only place `AuthGate` gets applied, and route groups don't
  create URL segments, so moving one page out doesn't touch the others.
- **A real, previously-latent bug had to be fixed for this to work**:
  `ProductDetailClient.tsx`'s fetch `useEffect` used to start with `if (!token) return;` — since
  `setLoading(false)` only ran inside that same effect's `.finally()`, a logged-out visitor would
  have seen the loading spinner **forever**, never reaching the product. Fixed by always calling
  `getProduct()`/`getVerticals()` (both already public-tolerant — `getProduct`'s own code comment
  already documented "Reads (products/surveys) are public at the API level") and only calling
  `getFavoriteIds()` when a token exists. Verified live with Playwright (see below) — this was not
  a theoretical fix, the infinite-spinner bug was real and reproducible before it.
- **A related UX gap was fixed too**: `ProductActionButtons.tsx`'s contact/schedule handlers
  already guarded with `if (!token) return` but did nothing else — invisible before because those
  buttons only ever rendered for a logged-in user (the whole page was gated). Once the page went
  public, that would have been a silent dead click. New shared `frontend/src/lib/requireLogin.ts`
  (a TypeScript type-predicate — `token is string` — so callers get real type-narrowing, not just a
  boolean) now redirects to `/login?redirect=<path>` instead, applied to contact/schedule (both the
  initial button click, not just final submit — so a logged-out user isn't led through the whole
  quantity-picker/date-picker before being told to log in) and to `ProductDetailClient.tsx`'s
  favorite-heart `toggleFav`. "Add to Cart" is deliberately unguarded — it's local-only, matching
  how the cart page itself has always worked without requiring login.
- **A build-time-only regression surfaced during verification, unrelated to the auth logic**:
  moving the page out of `(protected)` made Next.js's static-export prerendering newly enforce
  "`useSearchParams()` must be wrapped in Suspense" for `ProductQueryPage` — a requirement that had
  apparently been masked the whole time by `AuthGate`'s own client-only rendering swallowing the
  page's effective render path. Fixed with the standard Next.js pattern: wrapped
  `<ProductQueryPage />` in `<Suspense>` with the same navy/gold spinner `AuthGate` already uses as
  the fallback. Confirmed the exact route/page count (242) is unchanged after the fix.
- **New backend endpoint, `GET /share/products/{id}`** (`backend/app/routers/share.py`) — since a
  static frontend genuinely cannot serve correct per-product `og:image` tags, this server-rendered
  HTML page (the first use of `fastapi.responses.HTMLResponse` in this codebase) does it instead:
  `html.escape()`-d title/description (product text is admin-entered and now interpolated directly
  into raw HTML for the first time — escaping is the load-bearing XSS guard, not a nicety),
  `og:image` pointing at the real product photo, and a `<meta http-equiv="refresh">` sending a real
  browser on to `https://www.tivuta.co.il/{locale}/products?id={id}` instantly (link-preview bots
  don't execute meta-refresh, they just scrape the static tags — exactly the split in behavior
  needed). `Product.image_url` is already a full Supabase URL in production, used as-is; the
  local-dev-only bare-filename case is resolved via `request.base_url` rather than a hardcoded
  domain, so it stays correct regardless of which hostname reaches the service.
- **Domain choice was deliberate, not incidental**: the backend has no custom domain today (it's
  reached at the raw `tivuta.onrender.com`, confirmed via the two workflow files that reference it —
  `CLAUDE.md` itself never states this domain). Pointing shared links directly at that would put an
  unfamiliar third-party hosting domain in the human-facing click path — exactly the kind of
  unrecognized-domain hop the "Haredi Internet Filter Compatibility" section above warns could be
  flagged or blocked by a kosher filter's categorization, which would have defeated the entire
  point. Instead, share links use a new **`share.tivuta.co.il` custom domain** (DNS CNAME → the
  same existing Render service) — the link a human actually clicks reads as part of the
  already-trusted `tivuta.co.il` domain. **This requires manual setup that hasn't happened yet**:
  Render dashboard → the backend service → Custom Domains → add `share.tivuta.co.il`, plus the DNS
  CNAME record wherever `tivuta.co.il` is managed. Unlike this session's other "ships dark until
  configured" work, this one isn't fully inert in the meantime — the frontend immediately starts
  generating `share.tivuta.co.il` links once deployed, so they won't resolve until that DNS step is
  done.
- **CSP handling for the new route**: the global CSP middleware (`main.py`) applies
  `default-src 'none'` to every response except a fixed exempt-path set. The share page needs a
  small inline `<style>` block for its branded look (Tivuta wordmark, navy/gold, "מעביר אותך
  למוצר..." message, a real fallback `<a href>` link) — rather than widen the blanket exemption,
  `main.py` now also skips the strict CSP for any path starting with `/share/`, and the route sets
  its own tailored one directly (`default-src 'self'; style-src 'unsafe-inline'`). No product image
  is ever loaded by the page itself (only referenced in the `og:image` *tag*, which bots fetch
  independently) — keeps its own resource footprint at zero. Also sets `X-Robots-Tag: noindex`,
  since this is a redirect shim, not content worth a search engine indexing separately.
- **`frontend/src/lib/share.ts`** (new) replaces two verbatim-duplicated WhatsApp-share
  implementations in `ProductTile.tsx` and `ProductDetailClient.tsx` — both had hardcoded
  `https://tivuta.co.il/...` (missing the `www.` the real CNAME actually uses, confirmed in the SEO
  session) — now both call one `shareProductOnWhatsApp()` building the `share.tivuta.co.il` link.
- **`backend/tests/test_share.py`** (new, 4 tests) — correct title/image/escaping for a real
  product, an HTML-special-characters-in-title case as an explicit XSS regression guard, a
  nonexistent product still returning a valid redirect page, and invalid-locale fallback to Hebrew.
- **Verified end-to-end with a real headless browser (Playwright), not just curl** — curl can only
  ever see the pre-hydration static shell for this page (the product itself loads via
  client-side `useEffect`, invisible to curl regardless of dev vs. build mode), so confirming the
  actual fix required real JS execution. No project-level run skill existed yet for this repo, so a
  scratch Playwright install (not added to the project's own dependencies) drove real Chromium
  against the local dev server: confirmed the product page renders full real content (title,
  attributes, ₪38,000 price, action buttons) for a logged-out session with zero console errors and
  no spinner; confirmed clicking "Schedule Viewing" and the favorite heart both correctly redirect
  to `/login?redirect=...`; confirmed `/world` and home are completely unaffected, still redirecting
  to login exactly as before. Screenshots reviewed directly, not just asserted from DOM queries.
- **Explicitly out of scope, deferred**: `/products` was not added to `sitemap.xml` — the reasoning
  in the AuthGate note above no longer fully applies now that the page is public, but proactively
  pursuing search-engine discovery of the catalog is a separate, bigger decision this session didn't
  make; no rate limiting on the new share endpoint (read-only, no PII beyond what the existing
  public `/products/{id}` JSON endpoint already exposes); no product image rendered directly on the
  interstitial page itself, only referenced in its `og:image` meta tag.

---

## Dependency Security Audit — Next.js Upgrade (session 2026-08-11)

`npm audit` (first surfaced during the tests/CI session, deliberately deferred there) showed 6
vulnerabilities: `next@16.2.4` itself plus its own bundled `postcss`/`sharp`, and 3 unrelated
dev-tooling-only transitive deps (`@babel/core`, `brace-expansion`, `js-yaml`). Resolved to 0.

- **`next`/`eslint-config-next` bumped 16.2.4 → 16.3.0** (kept in lockstep, matching the existing
  exact-pin convention). `npm audit`'s own JSON output flagged this fix as `isSemVerMajor: false`
  — a minor bump within the same major, not the risky major-version jump the tests/CI session
  cautiously deferred. Checked Next's actual 16.3.0 changelog directly rather than assuming: none
  of its listed deprecations (edge runtime, `experimental.useCache`, custom server middleware,
  `moduleResolution: "node"`) apply to this app — no edge runtime, no `useCache`, no custom server
  (this is `output: 'export'`, no Node server exists at runtime at all), and `tsconfig.json`
  already used `"moduleResolution": "bundler"`. Peer deps (`react`/`react-dom` `^19.0.0`, `eslint
  >=9.0.0`) were already satisfied. This single bump resolved `next`/`postcss`/`sharp` (3 of 6).
- **The remaining 3 (`@babel/core`, `brace-expansion`, `js-yaml`) resolved via plain
  `npm audit fix`** (no `--force` needed this time — confirmed via a dry pre-check that each said
  "fix available via `npm audit fix`", not "...`--force`") — all dev/lint/test tooling only, never
  shipped to a real visitor, so lower stakes than `next` itself but cleared for free regardless.
  `git diff package.json` confirmed only the two intended lines (`next`, `eslint-config-next`)
  changed — `npm audit fix` only touched the lockfile's transitive resolutions, no other direct
  dependency drifted unexpectedly.
- **A real, disclosed side effect surfaced during verification, not swept under the rug**: running
  `npm run dev` under 16.3.0 regenerated `frontend/AGENTS.md` with expanded content — confirmed
  this is genuine, intentional Next.js framework behavior (the regenerated file's own text now
  says "This block is written and re-added by `next dev` — verify at
  `node_modules/next/dist/server/lib/generate-agent-files.js`... committing it with your work
  keeps the tree clean"), not a stray edit or (as an earlier session's subagent had speculated
  without this context) a prompt injection — it's auto-generated tooling output that Next itself
  expects to be committed. Left as-is rather than reverted, since `next dev` would just regenerate
  the same content again on the next run.
- **Verified end-to-end using the exact CI infrastructure the last two sessions built** (the whole
  point of having built it): `npm run lint` unchanged (184 pre-existing problems, none new,
  confirmed by diffing against the pre-upgrade baseline count); full Vitest suite green (7 tests);
  a clean `npm run build` produced **exactly 242 static pages, matching the pre-upgrade baseline
  count precisely**; spot-checked `sitemap.xml` (44 URLs, unchanged), `robots.txt`, and the
  homepage `<title>` all byte-identical to before; `npm run dev` booted and served a real page
  (`/he/login/`) with zero console/server errors; `pytest` still green (backend untouched, sanity
  check only). `npm audit` now reports 0 vulnerabilities, down from 6.
- **Not done, deliberately**: no Next 16.3 features were adopted (instant-navigation helpers, root
  params, Turbopack filesystem build cache) — they're on by default per the changelog, so the app
  gets any safe, zero-code-change performance benefit without this session deliberately opting
  into anything new. This was a security/dependency pass, not a feature-adoption one.

---

## Error Monitoring (Sentry) (session 2026-08-11)

Every session since the SEO pass flagged the same gap: production failures were completely
silent — no error monitoring on either side. Added Sentry to both, following this codebase's
existing "skip until configured" provider pattern (`get_email_sender()`, `get_image_storage()`,
`deploy_trigger.py`) — the code ships fully inert until real DSNs are set.

- **Deliberately used `@sentry/browser`, not `@sentry/nextjs`.** Confirmed via Sentry's own
  GitHub issue tracker that `@sentry/nextjs`'s webpack plugin has real, still-open compatibility
  friction with `output: 'export'` specifically (uploads irrelevant Node/Edge artifact bundles,
  history of build errors under static-export configs) — friction that exists because that
  package is built around instrumenting a Next.js *server* (SSR, API routes, middleware, edge
  functions), none of which this app has or can have under static export. Since only browser-side
  error capture is possible here anyway, `@sentry/browser` avoids that friction entirely: no
  webpack plugin, no `sentry.server.config.ts`/`sentry.edge.config.ts` for a server that doesn't
  exist at runtime.
- **`backend/app/main.py`** — `SENTRY_DSN = os.environ.get("SENTRY_DSN", "")`; if set,
  `sentry_sdk.init(dsn=..., environment=...)` before `app = FastAPI(...)` is constructed. The
  FastAPI integration auto-enables from `fastapi` already being installed — no explicit
  `integrations=[...]` needed. `environment` reuses the same "does `DATABASE_URL` exist" signal
  already established for the JWT fail-fast check (security-hardening session) to separate local
  dev noise from real production errors, no new env var needed for that. `traces_sample_rate` is
  deliberately left unset (errors only, no APM/performance tracing — keeps this focused and
  avoids burning Sentry's free-tier quota on non-error telemetry). `send_default_pii` is left at
  its default `False` (Sentry already excludes user ids/emails/IPs/cookies/auth headers).
- **`frontend/src/lib/sentry.ts`** (new) — `initSentry()`/`reportError()`, both funneling through
  one memoized `loadSentry()` that dynamically `import()`s `@sentry/browser` only if
  `NEXT_PUBLIC_SENTRY_DSN` is set. The dynamic import means the SDK is its own lazy-loaded chunk —
  zero added bytes to the main bundle when unconfigured, and it never blocks initial paint even
  when configured. Memoizing the init promise (not just a boolean flag) means whichever caller
  reaches it first — `SentryInit`'s mount effect (the normal case) or an error boundary reporting
  before that effect has had a chance to fire (an edge case) — both correctly share one real
  `Sentry.init()` call instead of racing or double-initializing.
- **`frontend/src/components/SentryInit.tsx`** (new) — a non-rendering client component, mounted
  once in `[locale]/layout.tsx` alongside `<AccessibilityWidget />`, that calls `initSentry()` in
  a `useEffect` (guaranteed browser-only, never runs during static-export prerendering — a
  browser-only SDK executing during the Node.js build step would be a real bug this pattern
  avoids entirely).
- **Filter-compatibility reasoning, checked against CLAUDE.md's own documented rule** (see "Haredi
  Internet Filter Compatibility" above): the rule as written — "No external CDN scripts — All
  JS/CSS comes from the Next.js bundle" — is about where JS/CSS is *served from* (own bundle vs.
  an external `<script src>` tag), not about outbound runtime network calls made by same-bundle
  code. `@sentry/browser` is npm-installed and bundled into the app's own output, so it doesn't
  violate that rule. It does make outbound calls to Sentry's ingestion domain to report errors; if
  a kosher filter blocks that specific domain, the practical effect is just that one error report
  silently fails to send (Sentry's transport swallows the failure) — nothing about the app's
  actual functionality depends on it either way. This is a materially different risk profile than
  Google Analytics (declined in the SEO session), where the entire feature's value depends on a
  script successfully loading from Google's domain.
- **Added `error.tsx`/`global-error.tsx` — necessary for real coverage, not scope creep.** Zero
  error boundaries existed anywhere in the app before this. Without one, a React rendering error
  never reaches `window.onerror` at all (React's default behavior swallows it into a blank tree),
  so `@sentry/browser`'s automatic instrumentation alone would miss that entire class of real
  errors. `frontend/src/app/[locale]/error.tsx` (new) is a locale-aware, on-brand fallback
  (reusing `.btn-primary`, matching the rest of the site) covering the vast majority of routes;
  `frontend/src/app/global-error.tsx` (new) is Next's required fallback for an error in the root
  layout itself — per Next.js convention it must render its own `<html>`/`<body>` and explicitly
  imports `./globals.css` itself (a layout-replacing file doesn't inherit CSS from the layout it's
  replacing), kept deliberately simple/Hebrew-only since it's the last-resort path for when
  something above it — potentially the locale routing/layout machinery itself — has failed.
- **`.github/workflows/deploy.yml`** — `NEXT_PUBLIC_SENTRY_DSN: ${{ vars.NEXT_PUBLIC_SENTRY_DSN }}`
  added to the `build` job's env, alongside the existing `NEXT_PUBLIC_API_URL`, since
  `NEXT_PUBLIC_*` values are inlined at build time and the DSN needs to reach the GitHub Actions
  build step, not just Render (which only runs the backend). Uses a repository **variable**, not a
  secret — `NEXT_PUBLIC_*` values end up in client-visible bundled JS regardless, so `vars.` is
  the honest designation, matching how `NEXT_PUBLIC_API_URL` itself is already set up.
- **Verified**: backend imports cleanly both with `SENTRY_DSN` unset and with a syntactically
  valid fake DSN set (confirms `sentry_sdk.init()` never blocks/crashes startup); full `pytest`
  suite still green; `npm run lint` clean on every new/touched file; `npm run build` succeeds with
  `@sentry/browser` installed and the DSN unset (the exact failure mode `@sentry/nextjs` would
  have risked, and the reason it wasn't used); `npm run dev` boots and serves a normal page with
  zero console/server errors; full Vitest suite still green. Actual error delivery to a real
  Sentry project, and a live browser render of the `error.tsx` fallback UI, were **not** verified
  end-to-end — the former needs a real Sentry DSN this session doesn't have (same limitation as
  the SEO session's Search Console token), the latter would need interactive browser tooling not
  available in this session; both rest on the code review + successful build/lint/test/dev-boot
  checks above instead.
- **Manual steps still needed, outside the repo**: create a Sentry account/org, create two
  projects (frontend, backend — separate DSNs, standard practice), set `SENTRY_DSN` in Render's
  dashboard and `NEXT_PUBLIC_SENTRY_DSN` as a GitHub Actions repository variable, then redeploy.
  Until then this entire feature is inert, same as every other "ships dark until configured"
  integration in this codebase.
- **Explicitly out of scope, deferred**: performance/APM tracing, Session Replay, source map
  upload (would give fully-readable non-minified stack traces, but needs a Sentry auth token as a
  CI secret plus a build-step plugin — the exact complexity avoided by using `@sentry/browser`
  directly; stack traces are still usable, just against minified code), and release tracking
  (tagging errors with a git SHA).

---

## Automated Tests + CI Gate (session 2026-08-11)

Follow-up to the SEO and security-hardening sessions' audits, both of which flagged zero test
coverage anywhere and no lint/test step in the GitHub Actions deploy workflow. This session added
a starter (not exhaustive) test suite on both sides plus a real CI gate — a failing test or lint
error now blocks the GitHub Pages deploy, where previously every push to `main` deployed
unconditionally. This was a deliberate, explicitly-confirmed scope decision, not an accidental
side effect.

- **`backend/tests/conftest.py`** — a single shared in-memory SQLite engine (`StaticPool`,
  FastAPI's own documented testing pattern) with `Base.metadata.create_all()`/`drop_all()` per
  test (isolation over speed; the suite is small enough that this costs nothing meaningful),
  `get_db` overridden via `app.dependency_overrides`, and `make_user`/`make_vendor` factory
  fixtures. **A real interaction with the security-hardening session's work**: the `slowapi`
  limiter is process-global state, and `TestClient` has no real IP, so every test request shares
  one rate-limit bucket unless reset — the `client` fixture calls `limiter.reset()` before every
  test for exactly this reason. `pytest` runs with no `DATABASE_URL` set, so the JWT fail-fast
  guard from that same session doesn't fire in CI (correct — a throwaway test run isn't
  "production" by that check's own definition).
- **Three backend test files**, chosen for being the two things CLAUDE.md itself calls
  highest-stakes: `test_auth.py` (signup/login success+failure, and the exact rate-limit behavior
  manually `curl`-verified last session, now automated), `test_loyalty.py` (exercises
  `services/loyalty.py`'s `create_sale_transaction()` directly: normal sale credits
  points/commission/popularity, a duplicate `idempotency_key` doesn't double-credit, a
  velocity-flagged sale defers its effects until confirmed), and `test_cart_checkout.py` — a direct
  regression test for the real historical stale-quantity bug documented in the Back-Office Orders
  Phase 1 section above (every cart line item once silently got tagged with the *last* item's
  quantity); checks out 3 products at 3 different quantities and asserts each `Lead.quantity`
  matches its own product.
- **`frontend/vitest.config.mts`** — Next 16's own bundled docs recommend Vitest for the App
  Router but are explicit that it **cannot** unit-test `async` Server Components (e.g.
  `world/page.tsx`'s `generateMetadata`) — E2E is their own recommendation there instead. Given
  most of this codebase is `'use client'` components tightly coupled to routing/auth-context/live
  API calls, this pass targets pure/isolated logic rather than full component trees. Uses Vitest's
  native `resolve.tsconfigPaths: true` (not the separate `vite-tsconfig-paths` plugin the Next docs
  show — Vitest 4 now supports this directly, one fewer dependency, confirmed working identically).
- **Two frontend test files**: `getErrorMessage.test.ts` (the shared API-error-extraction helper
  used across ~20 call sites, previously completely unverified) and `useBulkSelection.test.ts` —
  the latter specifically pins down the exact bug this hook was built to fix (documented in the
  Back-Office Orders Phase 2 post-review section above): selection must clear when `resetKey`
  changes, so a bulk action can never silently fire against now-invisible, filtered-out rows.
- **`.github/workflows/deploy.yml`** — added `backend-tests` (Python 3.10, matching the committed
  `.venv`, `pip install -r requirements.txt` + `pytest`) and `frontend-checks` (`npm run lint` +
  `npm run test`) jobs; the existing `build` job now has `needs: [backend-tests, frontend-checks]`.
  Verified the YAML directly (via `js-yaml`, already present as a transitive dependency) rather
  than assuming the edit was correct — confirmed `build.needs` resolves to both new jobs and
  `deploy.needs` still correctly points at `build`.
- **Verified end-to-end**: full pytest suite green (9 tests); deliberately broke one assertion,
  confirmed 2 tests correctly failed, reverted; the rate-limit test passes identically run alone vs.
  as part of the full suite (proves no cross-test rate-limit bleed); full Vitest suite green (7
  tests); `npm run lint` and `npm run build` both still pass unchanged.
- **Explicitly out of scope, deferred**: Playwright/Cypress E2E (would need a live backend +
  frontend + seeded DB running inside CI — every verification this session and the prior two did
  with Playwright was manual, not automated); testing async Server Components; full coverage of
  either codebase (this is a foundation plus a small number of genuinely high-value tests, not a
  completeness attempt); GitHub branch-protection/required-status-check settings (a repo-settings
  change, not something committable — gating `deploy.yml` itself already achieves "broken code
  doesn't auto-deploy" without needing this).
- **Found incidentally, NOT fixed (out of scope for this session)**: `npm audit` shows pre-existing
  high-severity transitive vulnerabilities unrelated to anything added here — most notably the
  pinned `next@16.2.4` itself has several known advisories with a fix only available via
  `npm audit fix --force` (which would bump to `next@16.3.0`, outside the currently pinned range).
  Given `frontend/AGENTS.md`'s explicit warning that this Next major version has breaking changes
  vs. typical assumptions, upgrading it is a real, separate decision that needs its own session —
  not something to do as a side effect of adding a test runner.

---

## Backend Security Hardening (session 2026-08-10)

Follow-up to the SEO session's audit, which flagged (but deferred) two backend gaps: no rate
limiting on auth endpoints, and no security response headers. Fixed both, plus one closely-related
issue found along the way.

- **`backend/app/rate_limit.py`** (new, tiny module) — `limiter = Limiter(key_func=get_remote_address)`,
  the shared `slowapi` limiter instance. Kept in its own module rather than defined in `main.py`
  because `main.py` imports every router at module load time — a router importing `limiter` back
  from `main.py` would be a circular import. `main.py` and any router needing `@limiter.limit(...)`
  both import from `rate_limit.py` instead.
- **`backend/app/main.py`** — registers the limiter (`app.state.limiter`, `RateLimitExceeded`
  exception handler, `SlowAPIMiddleware`) and a custom `security_headers` HTTP middleware adding
  `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Strict-Transport-Security`, and
  `Content-Security-Policy: default-src 'none'` to every response. **`/docs`, `/redoc`, and
  `/openapi.json` are exempted from the CSP header** (checked by path inside the middleware) —
  FastAPI's built-in Swagger/ReDoc UI loads CDN-hosted JS/CSS and would break under
  `default-src 'none'`; verified live that Swagger UI still renders correctly there while every
  other route gets the full header set.
- **Rate limits applied** (`@limiter.limit(...)`, each endpoint needed a `request: Request` param
  added — slowapi's decorator requires it): `POST /auth/login` and `POST /vendor-auth/login` at
  `5/minute` (primary brute-force targets, two separate principals — see the vendor-auth
  architecture note above), `POST /auth/signup` at `10/hour`, `POST /auth/forgot-password` at
  `3/hour` (prevents email-bombing a victim via repeated reset requests), `POST /auth/reset-password`
  at `5/minute`, `PATCH /users/me/password` at `5/minute` (protects the current-password check from
  being brute-forced via a leaked/stolen JWT). All keyed per-IP (`get_remote_address`) — the
  standard first line of defense; per-account lockout (locking a specific email regardless of IP)
  would need a new DB column + migration and was left as a possible future enhancement.
- **In-memory rate-limit storage is correct here specifically because `backend/Procfile` runs
  plain `uvicorn` with no `--workers` flag** (single process per Render instance) — confirmed by
  reading the Procfile. If Render is ever scaled to multiple instances/replicas, an in-memory
  limiter would under-count (each instance tracks separately); Render's instance count isn't
  visible from the repo, so this was a known, documented limitation rather than a verified
  non-issue. **Update (session 2026-08-12): a Redis-backed alternative now exists, opt-in via
  `REDIS_URL` — see "Redis-Backed Rate Limiter" below.** Still defaults to in-memory everywhere
  the env var isn't set, so nothing changes until it's deliberately turned on.
- **`backend/app/security.py`** — found during this audit: `SECRET_KEY` had a hardcoded, publicly-
  known fallback (`"tivuta_secret_key_change_in_production"`) used whenever `JWT_SECRET_KEY` was
  unset, with nothing to stop a real deployment from silently running on it. Fixed by raising a
  `RuntimeError` at import time if `DATABASE_URL` is set (this codebase's existing convention for
  "this is a real Postgres/Supabase deployment, not local SQLite dev" — see the Deployment section
  above) but `JWT_SECRET_KEY` is not — verified live that `DATABASE_URL` set without
  `JWT_SECRET_KEY` now fails to start with a clear error, `DATABASE_URL`+`JWT_SECRET_KEY` both set
  starts fine, and plain local dev (neither set) is completely unaffected. This can't currently
  fire on Render (the env var is already set there) — it's a guardrail against a future
  misconfiguration (e.g. a new staging environment), not a fix for a currently-broken deployment.
- **Verified end-to-end** locally: 6 rapid bad-credential attempts against `/auth/login` and
  `/vendor-auth/login` each returned five `401`s then a `429`; 4 rapid `/auth/forgot-password`
  calls returned three `200`s then a `429`; all 5 security headers confirmed present via `curl -i`
  on a normal route and absent-CSP-only on `/docs`; a real signup+login at normal (non-abusive)
  request rates still succeeded end-to-end; test data cleaned up afterward.
- **Explicitly out of scope, noted for a future session**: frontend security headers (GitHub
  Pages static hosting has no server-side config to set custom HTTP headers at all — a
  `<meta http-equiv="Content-Security-Policy">` tag is technically possible but can't carry
  `frame-ancestors`/HSTS and risks breaking existing inline styles across the app for uncertain
  benefit), per-account lockout counters, and a CORS policy review (`allow_methods=["*"]`/
  `allow_headers=["*"]` — not part of what was flagged, left untouched). **Both of the latter two
  were completed in the Per-Account Login Lockout + CORS Review session below.**

---

## Technical SEO Foundation (session 2026-08-10)

An audit found the site had **zero SEO infrastructure**: no `robots.txt`, no sitemap, no
structured data, one identical static `<title>`/description across all 4 locales, and no
canonical/hreflang tags. Fixed with quick, non-architectural wins (deliberately no change to the
query-param routing decision — see "Query-param routes" below — so individual products still
don't get their own indexed search-result page; that was an explicit, discussed trade-off).

- **`frontend/src/app/robots.ts`** and **`frontend/src/app/sitemap.ts`** — Next's file-convention
  metadata routes (`MetadataRoute.Robots`/`MetadataRoute.Sitemap`). Both need
  `export const dynamic = 'force-static'` or the `output: 'export'` build fails — same requirement
  applies to any file-based image/OG/icon route. `sitemap.ts` lists home/login/register/cart ×4
  locales and the legacy `/benefits` tree ×4 locales (44 URLs today). `/world` and `/products` are
  deliberately **not** listed — see the AuthGate finding below.
- **`frontend/src/lib/locales.ts`** gained `LOCALES` (the canonical `['he','en','fr','yi']` array)
  and `normalizeLocale(raw)` (validates + falls back to `'he'`) — `[locale]/layout.tsx`,
  `world/page.tsx`, `products/page.tsx`, and `sitemap.ts` all import these instead of each
  re-declaring their own copy of the same locale list/fallback logic, so adding a 5th locale later
  is a one-file change instead of a "did I remember every copy" risk.
- **`frontend/src/app/[locale]/layout.tsx`** — the old static `export const metadata` (identical
  English string for all 4 locales) was replaced with `generateMetadata({params})` reading
  `locale` and returning a per-locale `LOCALE_META` entry (title/description/OG-locale), each
  written to actually mention the verticals (diamonds/cars/insurance) in that language — this is
  what targets "rank for terms we deal with," since before this every locale showed the identical
  generic sentence regardless of language. Also added: `title: {template: '%s | Tivuta', default:
  ...}` and `openGraph`/`twitter` blocks. `verification.google` is only included when
  `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` is set in the build environment — **a first draft of this
  shipped a hardcoded placeholder string unconditionally to production HTML, caught in
  post-implementation review and fixed**; set that env var (once the domain is verified in Search
  Console — DNS TXT method recommended, see below) to actually enable the tag, or leave it unset
  to omit it entirely rather than ship dead markup.
- **Organization JSON-LD** (`@type: Organization`, name/url/logo/contactPoint) added as a
  `<script type="application/ld+json">` directly in `[locale]/layout.tsx`'s `<head>` — the
  highest-leverage single addition for a bare "tivuta" brand-name query.
- **Important limitation found in post-implementation review, not fixed here because it's a
  product decision, not a bug**: the homepage (`(protected)/page.tsx`), `/world`, and `/products`
  are all wrapped in `AuthGate` (`components/AuthGate.tsx`), which checks `AuthContext`'s `user`/
  `isLoading` — both of which start `null`/`true` for any visitor with no stored
  `tivuta_token`, Googlebot included. That means an anonymous crawler hitting `/he`, `/he/world`,
  or `/he/products` sees **only a loading spinner that client-redirects to `/login`** — no actual
  marketplace content is reachable without an account. This was true before this session and is
  unrelated to the SEO changes themselves, but it caps what any SEO work on those routes can
  achieve: the raw HTML `<head>` (title/description/OG/JSON-LD/canonical) IS real and IS seen by a
  first-pass crawl regardless of the login wall, which is why that metadata work still has value
  for a bare brand-name query — but Google's JS-rendering pass will likely see the client redirect
  to `/login` and treat the page accordingly (at best ignoring it, at worst indexing `/login`
  instead of the real page). **This is why `sitemap.ts` does not list `/world`/`/products`**:
  advertising `changefreq: daily`/high-priority URLs that are 100% empty shells for anonymous
  visitors would waste crawl budget and risks a "soft redirect" flag in Search Console. If public
  (no-login) browsing of the catalog is ever wanted — e.g. to let search traffic actually land on
  real product/vertical content — that's a real product decision (loosening `AuthGate` on those
  three routes) that needs to be made deliberately, not a "quick SEO win."
  **Update (session 2026-08-11, see "Public Product-Sharing" below): this decision was made for
  `/products` specifically** (not `/world`, not home) — the product detail page is now viewable
  without login, driven by a WhatsApp-sharing need rather than a general SEO push.
  `sitemap.ts` was deliberately **not** updated to list it — see that section for why.
- **Found and fixed a real, pre-existing bug while doing this**: `frontend/src/app/icon.svg` — a
  proper, on-brand, square navy "T" monogram — has existed since the very first commit of the
  frontend, in exactly the right Next.js file-convention location to be auto-detected as the
  site's favicon. It was being silently shadowed the entire time by a manually hardcoded
  `<link rel="icon" href="data:;base64,iVBORw0KGgo=">` (a literal blank 1×1 image) directly in
  `layout.tsx`'s `<head>` JSX. Deleting that dead manual tag was enough to make the real icon take
  effect — **do not re-add a manual favicon `<link>` here**; the file-convention `icon.svg` (or a
  future `icon.tsx`/`apple-icon.tsx`) is auto-wired by Next and takes priority.
- **`frontend/src/app/apple-icon.tsx`** and **`frontend/src/app/opengraph-image.tsx`** — code-generated
  via `next/og`'s `ImageResponse` (navy `#111a2f` background, gold `#d4af37` text, matching the
  site's existing theme) rather than hand-made image assets — no designer/asset needed, stays
  in-repo, and (per the point above) works alongside the pre-existing `icon.svg` without conflict
  since they're different route conventions (`icon` vs `apple-icon` vs `opengraph-image`).
- **Canonical + hreflang tags were deliberately NOT added to the shared `[locale]/layout.tsx`**,
  even though the approved plan for this session originally called for that. Reasoning found
  during implementation: a layout wraps every route under `[locale]/*`, so a single
  `alternates.canonical` value there would be **wrong** for every page except the one it happens
  to match — e.g. if set to `/{locale}`, then `/he/login`, `/he/cart`, `/he/world`, etc. would all
  falsely declare themselves duplicates of the homepage, which risks Google actually dropping
  those pages from its index in favor of consolidating everything into `/`. That's actively
  harmful, not just imprecise, so it was skipped at the layout level entirely.
- **Where canonical/hreflang WAS added**: only on the two pages where it's both correct and
  already low-risk to add — `(protected)/world/page.tsx` and `(protected)/products/page.tsx`.
  Both were already thin server-component wrappers (`export default function WorldPage() { return
  <VerticalQueryPage /> }` — same established pattern as `ProductQueryPage`), so adding
  `generateMetadata` with a fixed, correct `alternates.canonical`/`languages` pointing at their own
  base path (ignoring the `?slug=`/`?id=` query string, which is standard practice for
  query-param-driven pages) required no refactor and no new risk. **Home (`(protected)/page.tsx`)
  and `login`/`register` were NOT similarly wrapped** — their `page.tsx` files are `'use client'`
  directly (not a thin server wrapper like `world`/`products`), so adding page-specific metadata
  to them would require the same client/server split refactor those two already have — a
  meaningfully bigger, unreviewed change that was intentionally left out of this session's scope.
  If per-page metadata on those is wanted later, that split is the established pattern to copy.
- **`document.title` effects added to `VerticalListingClient.tsx` and `ProductDetailClient.tsx`**
  — since these pages are 100% client-rendered (the actual vertical/product comes from a runtime
  `?slug=`/`?id=` fetch, not build-time data), the static HTML title can never be
  vertical/product-specific. Each component now sets `document.title` once its data loads, and
  restores whatever the previous title was on unmount. This is **not equivalent to real per-page
  metadata** — it only helps Googlebot's JS-execution rendering pass (which Google does perform,
  but treats as a materially weaker signal than metadata present in the initial HTML) and
  improves the browser tab / share-preview UX. It does nothing for the sitemap, canonical tags, or
  OG image per item.
- **Google Analytics/GTM was deliberately NOT added.** `googletagmanager.com` is an external CDN
  domain, and the "Haredi Internet Filter Compatibility" principle above explicitly calls out
  Google's domains as commonly blocked by kosher filters, with a standing rule against introducing
  external CDN scripts. Recommendation instead: verify the Search Console property via a **DNS TXT
  record** (no script ever loads, filter-safe) rather than the meta-tag method — this is a manual
  step in the domain registrar, not something this repo can do. If traffic analytics are wanted
  later, that's a separate, deliberately-deferred decision (e.g. a self-hosted/privacy-respecting
  option), not bundled into this SEO work. **Update (session 2026-08-12): built — see "Self-Hosted
  Analytics" below.**
- **Not done, and explicitly out of scope for this session** (found in the same audit, kept as a
  backlog item): zero automated tests, no rate limiting on `/auth/login`/password-reset, no
  CSP/HSTS/X-Frame-Options headers, no error monitoring (Sentry or similar), no lint/test step in
  the GitHub Actions CI workflow. None of these affect search ranking, which is why they were left
  out of this pass — worth a dedicated future session.

---

## Per-Account Login Lockout + CORS Review (session 2026-08-11)

The last remaining item from the Backend Security Hardening session's deferred backlog: rate
limiting there was **per-IP only** (`5/minute` via `slowapi`, see that section above) — an attacker
spreading login attempts across multiple IPs/proxies was never slowed down for a *specific*
account — and CORS still allowed every method/header (`allow_methods=["*"]`,
`allow_headers=["*"]`, `allow_credentials=True`).

- **`failed_login_attempts`/`locked_until` columns on both `User` and `Vendor`**
  (`backend/app/models.py`, migration `1d4d53ad9e19_add_login_lockout_fields.py`, `batch_alter_table`
  since these are NOT-NULL-with-default columns — same shape as the one prior precedent,
  `655114dc8ce0_add_product_popularity_score.py`) — mirrors the existing `reset_token`/
  `reset_token_expires` pattern already on `User`. Two fully separate login principals (`User` via
  `/auth/login`, `Vendor` via `/vendor-auth/login` — see the Loyalty Program's Phase 3 vendor-auth
  architecture note) each get their own lockout state.
- **Two new tunable settings reuse the existing generic `SystemSetting` mechanism** (originally
  built for the loyalty program's fraud thresholds) instead of a new settings system:
  `max_failed_login_attempts` (default `"5"`), `lockout_duration_minutes` (default `"15"`) —
  `services/loyalty.py`'s `DEFAULT_SETTINGS`/`NON_NEGATIVE_FLOAT_SETTINGS` (0 is a legitimate, if
  aggressive, policy value for both — same reasoning as the Phase 5 loyalty thresholds). Both are
  editable for free in the existing `admin/loyalty` settings editor — no new admin UI needed just to
  tune them.
- **Three shared helper functions in `backend/app/security.py`** — `check_account_lock()`,
  `record_failed_login()`, `record_successful_login()` — operate identically on both `User` and
  `Vendor` via duck-typing (both declare the same `hashed_password`/`failed_login_attempts`/
  `locked_until` column names), used by both `auth.py`'s `login` and `vendor_portal.py`'s
  `vendor_login`. A locked account gets **HTTP 423** (distinct from 401 wrong-password and 429
  rate-limited) before the password is even checked — skips a wasted bcrypt comparison and lets the
  frontend show a specific message. Wrong password increments the counter and locks on threshold
  (counter resets to 0 once locked); correct password clears both fields.
- **Any successful password change also clears lockout state**, not just a correct login:
  `auth.py`'s `reset_password` (forgotten-password flow) and `vendors.py`'s existing `PATCH
  /admin/vendors/{id}/portal-access` (admin-issued vendor credential reset) both now clear
  `failed_login_attempts`/`locked_until` — a fresh password can't stay stuck behind an old lockout.
- **Deliberate email-enumeration trade-off**: an explicit 423 message ("Too many failed login
  attempts...") is distinguishable from a generic wrong-password 401, which could in principle leak
  whether an email is registered. Judged acceptable because `POST /auth/signup` **already** leaks
  this — it returns a distinct "Email already registered" response on a duplicate — so this app
  already had a cheaper, faster enumeration oracle than anything the lockout message adds.
  `forgot_password`'s existing anti-enumeration behavior itself was left untouched.
- **Admin unlock — users only, not a separate vendor UI**: `PATCH /admin/users/{id}/unlock`
  (`users.py`) clears both fields immediately, for when an admin wants to skip the (short, tunable)
  wait rather than block someone asking for help. `admin/users/page.tsx` gained a red "נעול" (locked)
  badge + "בטל נעילה" unlock button, shown only while `isLocked(u)` is true. **Vendors deliberately
  don't get a separate unlock control** — the admin's existing portal-access reset action already
  clears vendor lockout as a side effect (see above), which was judged sufficient for a small,
  admin-curated set of vendor accounts.
- **Frontend: two of three login surfaces needed a fix to actually show the new message.**
  `vendorLogin()` in `api.ts` already propagated `err.detail` correctly — zero change needed there.
  But `(public)/login/page.tsx` and the legacy `benefits/[locale]/login/page.tsx` both did a raw
  inline `fetch()` with a hardcoded generic error string regardless of the real response status;
  both now check `response.status === 423` and show the backend's specific message, falling back to
  the existing generic message for anything else — a narrow, additive fix, not a rewrite.
- **CORS narrowed in `main.py`**: `allow_methods` → `["GET", "POST", "PATCH", "PUT", "DELETE"]` and
  `allow_headers` → `["Authorization", "Content-Type"]` (both confirmed, by an exhaustive grep of
  every frontend fetch call site, to be the complete set actually used — multipart file-upload calls
  never set a custom `Content-Type`, letting the browser set its own boundary, so narrowing this was
  confirmed safe). `allow_credentials` → `False` (confirmed no fetch call anywhere in the frontend
  sets `credentials: 'include'` — this app authenticates via a Bearer token in `localStorage`, never
  cookies, so the old `True` was unused permissiveness, not load-bearing).
- **A real timezone bug found during manual browser verification, fixed same session**: the new
  `isLocked()` helper on `admin/users/page.tsx` initially did `new Date(u.locked_until).getTime() >
  Date.now()` directly. `locked_until` comes from the backend as a **naive-UTC** ISO string with no
  `Z`/offset suffix (e.g. `"2026-08-11T12:35:46.381768"`, from Python's `datetime.utcnow()`) —
  JavaScript's `Date` parses a date-*time* string with no timezone designator as **local time**, not
  UTC (unlike a bare date string, which JS does treat as UTC — an easy-to-miss asymmetry). On a
  browser whose local timezone is ahead of UTC, this silently shifted the parsed instant earlier
  than the real deadline, making an actually-still-locked account appear already-unlocked (reachable
  live: the admin-users locked badge and unlock button didn't render for a confirmed-still-locked
  test account). Fixed by appending `Z` before parsing whenever the string lacks its own timezone
  designator, isolated entirely to `isLocked()` in `admin/users/page.tsx` — no other frontend code
  reads `locked_until`. This doesn't contradict this codebase's general "naive-UTC timestamps,
  displayed as-is, no timezone conversion" convention (see `confirmed_at`'s handling in the Loyalty
  Program section) — that convention is safe for *display*, but `isLocked()` does a numeric
  comparison against `Date.now()` (a true universal instant), which is a fundamentally different
  operation that the naive-string convention doesn't cover.
- **Verified end-to-end**: backend `pytest` 18/18 (13 pre-existing + 5 new lockout tests covering
  lock-after-threshold, lockout rejecting even the correct password, successful-login resetting the
  counter, expired-lockout allowing login again, `reset_password` clearing lockout, and admin unlock);
  Alembic migration applied cleanly to the local dev DB; manual `curl` confirmed the exact 423
  response body and narrowed CORS preflight headers (`Access-Control-Allow-Credentials` header
  confirmed absent); `npm run build` (242 routes, matching baseline) and `npm run test` (Vitest, 7/7)
  both green. Real-browser (Playwright) verification confirmed, after the timezone fix: the specific
  lockout message renders on the real login form once actually locked; the admin/users page shows
  the locked badge and unlock button for a genuinely-locked account and not otherwise; clicking
  unlock clears the badge server-side; the previously-locked member can log in again immediately
  after an admin unlock. Test accounts and dev-server processes used for verification were cleaned
  up afterward (dev DB confirmed back at baseline: 4 users, 4 `customer_orders`, 5 `leads`).
- **Explicitly out of scope, deferred**: a dedicated vendor unlock button (folded into the existing
  portal-access reset instead, see above — **update (session 2026-08-13): built as a real,
  separate control once the portal-access reset stopped clearing lockout as a side effect — see
  "Dedicated Vendor Unlock Button" below**), a live countdown in the lockout message (it names the
  configured static duration, not an exact remaining-time string — **update (session 2026-08-13):
  built, see "Live Countdown in the Lockout Message" below**), per-account rate limiting via
  `slowapi` (this uses a separate DB-column mechanism that stacks with, not replaces, the existing
  per-IP `slowapi` limiter), and further restricting `signup`/`forgot_password`'s existing
  anti-enumeration behavior.

---

## General Contact Us Feature (session 2026-08-12)

The Back-Office Orders (Phase 1) session narrowed `GET /admin/leads` to `customer_order_id IS
NULL` and left its own docstring noting the "פניות" (Leads/Inquiries) tab was "reserved for a
future general 'contact us' inquiry that isn't tied to any order" — that inquiry type had never
actually been built, so the tab had shown zero rows since that session shipped. This closes the
gap: a small in-app contact form for logged-in members.

- **New `lead_type="general_inquiry"`, deliberately NOT wrapped in a `CustomerOrder`** — the one
  exception to every other lead-creating path in the app. `POST /leads/contact`
  (`backend/app/routers/leads.py`) creates the `Lead` directly with `customer_order_id=None`,
  `product_id=None`, `user_id=current_user.id`. Requires login (`get_current_user`), matching every
  other lead-creation endpoint — **a deliberate scope decision, confirmed with the user**: an
  anonymous/logged-out contact path would have needed new name/email/phone form fields, an
  optional-auth dependency (no such pattern exists anywhere else in `security.py`), and
  spam/rate-limiting design this pass didn't take on. Anonymous visitors keep using the
  pre-existing footer `tel:`/`mailto:` links, unchanged.
- **`Lead.subject`/`Lead.message`** (both `nullable`, new columns, `general_inquiry`-only) —
  deliberately **not** stored in the existing `Lead.notes` field, even though `notes` was already
  free-text and already gets set from customer input on the *appointment* creation path
  (`payload.notes` → `Lead.notes` in `create_lead`). The reason: `notes` is also the field an admin
  overwrites via the pre-existing `PATCH /admin/leads/{lead_id}/notes` with no history/audit kept
  on overwrite — reusing it for the customer's original message would risk an admin's first
  follow-up note silently destroying the inquiry that started the whole thread. Same reasoning as
  why `shipping_address` (customer-submitted structured data) has always been kept separate from
  `notes` (admin remarks) for `card_order` leads.
- **Confirmation + admin-notification emails, wrapped in try/except** — `create_contact_us_lead`
  sends both (new `CONTACT_CONFIRMATION_BODY`/`_contact_admin_notification_body()` helpers,
  `backend/app/routers/leads.py`, same HTML-snippet style as the existing
  `_confirmation_body`/`_admin_notification_body`). The try/except follows `create_card_order`'s
  defensive convention (an email-provider hiccup never fails lead creation) rather than
  `create_lead`'s/`cart_checkout`'s unguarded sends — those two pre-existing inconsistencies were
  left alone, not retroactively "fixed" as a side effect of this feature.
- **New page `frontend/src/app/[locale]/(protected)/contact/page.tsx`** — subject + message form,
  modeled directly on `(public)/forgot-password/page.tsx`'s centered-card layout (same classes,
  same icon-in-rounded-square header, same success-state pattern) rather than inventing a new
  visual style. Being under `(protected)/`, it's automatically login-gated by the existing
  `AuthGate` — no new auth plumbing needed; verified live that a logged-out visit redirects to
  `/login?redirect=/contact`.
- **`SiteFooter.tsx`'s "שלח פנייה" CTA** repointed from a plain `mailto:support@tivuta.co.il` link
  to `<Link href={`/${locale}/contact`}>` — the `tel:`/`mailto:` info lines elsewhere in that footer
  column are untouched, still an always-available fallback for anyone who prefers email/phone
  directly (or who isn't logged in, since the CTA now routes them through the login wall like any
  other protected link).
- **Admin `admin/leads/page.tsx`**: `TYPE_LABEL` gained `general_inquiry: 'פנייה כללית'`; the
  product column gained a third branch (alongside the existing product-title and `card_order`
  shipping-address branches) rendering `subject` (bold) + a truncated `message` line for
  `general_inquiry` leads instead of falling through to the `—` placeholder. The free-text search
  box's haystack and the CSV export's "מוצר" column were both extended to include
  `subject`/`message` too — a small, necessary addition beyond the original plan's scope, since a
  general inquiry that couldn't be found via search or seen in an export would have undermined the
  point of surfacing it in the admin queue at all. No other admin-page changes were needed — status
  transitions, assignment, notes-editing, bulk actions, and the calendar/kanban views all already
  work generically off `lead_type`/`status` and don't special-case product-bearing leads.
- **Verified end-to-end** with a real browser session (Playwright): a logged-out visit to
  `/he/contact` redirected to `/login?redirect=/he/contact`; a logged-in member clicking the
  footer's "שלח פנייה" CTA landed on the new form, submitted a subject+message, and saw the inline
  success state; logging in as admin and opening `/admin/leads` — previously always empty — showed
  the new inquiry with the correct subject/message/type-label; the same inquiry correctly did
  **not** appear on `/admin/orders`, confirming it stayed order-less as designed. Zero console
  errors throughout. Backend: 19/19 tests pass (1 new, asserting the order-less-ness end-to-end
  via both `/admin/leads` and `/admin/orders`). Frontend: build (new `/contact` route confirmed
  built for all 4 locales), lint (184 pre-existing problems, unchanged — zero new issues), and
  Vitest (7/7) all green. Test data cleaned up afterward (dev DB confirmed back at baseline: 4
  users, 4 `customer_orders`, 5 `leads`).
- **Explicitly out of scope, deferred**: anonymous/logged-out submission (confirmed with the user
  as a deliberate scope decision, not an oversight); touching the legacy, decorative
  `benefits/[locale]/contact/page.tsx` form (different sub-app, different footer/theme, its
  `handleSubmit` still doesn't call any API — left as-is); a `Notification` row at creation time
  (no existing lead-creation path creates one at creation, only on admin status-change, so this
  follows the same convention rather than introducing a new one); fixing the pre-existing
  `if user and product` skip in `admin_update_lead_status`'s status-change email (already silently
  skips for product-less `card_order` leads today — `general_inquiry` leads inherit the same
  limitation, not a new gap introduced here).

---

## E2E Test Automation (session 2026-08-12)

Every feature session up to this point ended with real, valuable manual browser verification via
a scratch (never committed) Playwright install — and it repeatedly caught regressions unit tests
structurally cannot: the `isLocked()` timezone bug (Per-Account Lockout session, only visible by
rendering a real DOM against a real server clock) and the cart-checkout stale-quantity bug
(Back-Office Orders Phase 1 — its pytest regression test posts a JSON body directly, so it can't
catch a regression in the actual quantity-stepper UI that builds that payload). This session turns
three of those into a permanent, CI-gated suite. **Starter set, not exhaustive** — three specs,
each chosen because it maps to a real historical bug or a just-shipped feature, Chromium only.

- **`@playwright/test` added as a `frontend/` devDependency**, `frontend/playwright.config.ts`
  (new). Uses Playwright's **`webServer` array** (it supports launching multiple processes) so
  `npx playwright test` alone brings up both `uvicorn` and `next dev` and tears them down —
  `reuseExistingServer: !process.env.CI` (Playwright's own default) means a developer's
  already-running local servers are reused unchanged, and only CI launches fresh ones.
- **`workers: 1` and a 15s `expect.timeout`, not defaults** — found live, not assumed: an initial
  run with default parallelism showed 2 of 3 specs failing at "still on `/he/login/`" after
  successful backend logins (confirmed via a scratch debug spec with console/network logging — the
  login itself always succeeded). Root cause: `next dev` compiles each route on first visit, and
  multiple spec files hitting different not-yet-compiled routes **concurrently** exceeded the
  default 5s assertion timeout. Serializing execution (`workers: 1`) also removes a second,
  separate class of flakiness for free — all 3 specs share one real backend process, so its
  rate-limiter state and DB are genuinely shared across files, not just within one.
- **`LOGIN_RATE_LIMIT` env var added to `backend/app/routers/auth.py`** (defaults to the unchanged
  `"5/minute"`), overridden to `100/minute` only in `playwright.config.ts`'s `webServer` env for
  the backend process it launches. Necessary because `slowapi`'s per-IP limit on `/auth/login`
  counts **every** request regardless of which account, and the 3 specs collectively make ~7 login
  requests across different accounts within one run — comfortably past 5/minute even after the
  per-account isolation below. Every real deployment (Render, local dev) is unaffected by leaving
  it unset.
- **A dedicated `E2E_LOCKOUT_EMAIL`, separate from `E2E_MEMBER_EMAIL`** — `auth.spec.ts` locks its
  test account for real; using the same account the other two specs log in as would break them
  whenever they happen to run after it (spec files have no guaranteed order).
- **Unique-per-run subject text in `contact-us.spec.ts`** (`` `שאלה בדיקת E2E ${Date.now()}` ``),
  found live via the plan's own "deliberately break one assertion" sanity check: a CI retry
  re-submits the whole test from scratch, and a fixed subject string would create a second lead
  with identical text, turning the final `getByText(SUBJECT)` assertion into a **strict-mode
  "multiple elements matched" failure** instead of a clean pass on the retry that was supposed to
  recover — a retry that couldn't actually recover.
- **`data-testid={`product-tile-${product.title_he}`}`** added to `ProductTile.tsx`'s root
  element — the only production-code change purely for testability. Needed because the card is an
  unstyled/unlabeled `<div>`, and scoping "the Add to Cart button *for this specific product*"
  without it would require fragile DOM-ancestor traversal across a page that can render several
  product cards at once.
- **`backend/scripts/seed_e2e.py`** (new) — idempotent (query by natural key before insert, same
  shape as `seed.py`'s own idempotency check), creates exactly what the 3 specs need: one active
  `Vertical`, 2 `Product`s, three `User`s (member, admin, dedicated lockout account), and lowers
  `max_failed_login_attempts` to `3` via `SystemSetting` so the lockout spec's 4-request sequence
  stays under the rate limit even before the `LOGIN_RATE_LIMIT` fix above. Run via `python -m
  scripts.seed_e2e` after a **real** `alembic upgrade head` (not `conftest.py`'s
  `metadata.create_all()`) against a dedicated `DATABASE_URL` — this also means every E2E run is
  incidental extra confidence that the full migration chain applies cleanly. `backend/app/seed.py`
  (the pre-existing legacy seed script) was confirmed to only cover the benefits catalog — no
  `Vertical`/`Product`/`Vendor` rows — so it wasn't reusable here.
- **`security.py`'s `JWT_SECRET_KEY`-required-when-`DATABASE_URL`-is-set fail-fast guard
  (Backend Security Hardening session) fires for the E2E DB too** — found live the first time the
  seed script was run (`DATABASE_URL` set, `JWT_SECRET_KEY` not), since the guard's "is this a real
  deployment" signal is exactly `DATABASE_URL` being set, regardless of whether the DB is actually
  a throwaway local SQLite file. Both env vars are set together everywhere the E2E DB is touched
  (CI job env, the "How to Run" commands above).
- **New `e2e-tests` job in `.github/workflows/deploy.yml`**, `needs: [backend-tests,
  frontend-checks]` (don't spend E2E time on a branch that fails cheaper checks first); `build`'s
  `needs:` extended to include it, so a broken E2E flow blocks deploy with the same power unit
  tests already have. Steps: install backend+frontend deps, `playwright install --with-deps
  chromium`, `alembic upgrade head` + `seed_e2e.py` against a job-scoped `DATABASE_URL`, `npx
  playwright test` (its `webServer` launches both processes fresh since nothing's already
  listening in a clean runner), Playwright HTML report uploaded as a build artifact on failure.
- **`frontend/vitest.config.mts`** gained `test.exclude: [...configDefaults.exclude, 'e2e/**']` —
  without it, Vitest's default glob would also try to collect and run the new Playwright specs
  (different `test`/`expect` globals, would fail immediately).
- **Verified end-to-end, three separate ways**: (1) against already-running local dev servers
  pointed at a freshly seeded `e2e_tivuta.db` — 3/3 pass; (2) a full CI-style dry run letting
  Playwright's own `webServer` launch both processes fresh (`CI=1`, venv's `uvicorn` prepended onto
  `PATH` to avoid a stale, unrelated global `uvicorn` 0.16.0/Python 3.6 install shadowing this
  project's — a real, documented local-only caveat, irrelevant in CI's clean venv-less `pip
  install`) — 3/3 pass, and confirmed Playwright tears down both spawned processes cleanly
  afterward; (3) the plan's own "deliberately break one assertion" check — broke
  `contact-us.spec.ts`'s final assertion, confirmed a real failure (which is what surfaced the
  strict-mode retry bug above), reverted, confirmed green again. `npm run test` (Vitest) still 2
  files/7 tests, unaffected. `pytest` still 19/19 (the `LOGIN_RATE_LIMIT` env var defaults to the
  unchanged `"5/minute"` when unset, which it is in the pytest environment). `js-yaml` confirmed
  `build.needs` includes `e2e-tests` and `e2e-tests.needs` includes both existing jobs.
  `frontend/.gitignore` gained `test-results/`, `playwright-report/`, `blob-report/`,
  `playwright/.cache/` — Playwright's own generated-artifact directories.
- **Explicitly out of scope, deferred**: testing against the real static export (`next build` +
  serving `/out`) rather than `next dev` — matches every manual verification already done in this
  project, a reasonable future upgrade rather than a blocker for this starter pass; Firefox/WebKit
  projects; exhaustive flow coverage (loyalty/sales beyond a single sale report, distributions) —
  3 specs chosen for mapping to real bugs/features, not full coverage (**update: admin bulk
  actions and the vendor portal were added in a later pass — see "Broader E2E Coverage" below**);
  a `webServer` command that resolves `.venv`'s `uvicorn` automatically on a developer's machine
  (documented caveat instead, falls back correctly via `reuseExistingServer` in the common case of
  an already-running local backend).

### Post-implementation review fixes (same session, after an 8-angle code review)
- **`retries` set to `0` unconditionally, not `process.env.CI ? 1 : 0` as originally shipped.**
  Every spec mutates real, shared backend state (locks an account, creates a real lead/order)
  with no reset between attempts — a CI retry doesn't get a clean slate, it replays the same steps
  against already-mutated state. This was caught concretely, not just in theory: the review found
  `auth.spec.ts`'s own retry would hit an *already-locked* account and fail on the wrong assertion
  (masking the real failure), and `contact-us.spec.ts`'s retry-safety fix below had a real bug that
  a retry would have exposed.
- **Found and fixed a real bug in the retry-safety fix itself**: `contact-us.spec.ts`'s unique
  `SUBJECT` (`` `שאלה בדיקת E2E ${Date.now()}` ``) was computed at **module scope**, which
  JS/Playwright evaluates once per worker process, not once per test invocation — so a retry would
  have reused the exact same subject and reproduced the identical strict-mode "multiple elements
  matched" failure the fix was written to prevent. Moved inside the `test()` callback; correct
  regardless of the `retries: 0` fix above, since a future change re-enabling retries shouldn't
  silently reintroduce this.
- **`data-testid` switched from `product.title_he` to `product.id`** (`ProductTile.tsx`) — two
  independent review angles flagged that `title_he` has no uniqueness constraint anywhere
  (`admin_create_product`/CSV import only require non-empty, and the existing "Duplicate Product"
  admin feature deliberately creates a near-identical title). `cart-checkout.spec.ts` now looks up
  each seeded product's real `id` via an unauthenticated `GET /products?vertical=` call (new
  `frontend/e2e/helpers.ts`) instead of depending on title uniqueness.
- **Extracted `frontend/e2e/helpers.ts`** (`login()`, `getProductId()`) — the same 5-line
  goto/fill/fill/click/assert login sequence was duplicated 3 times across `cart-checkout.spec.ts`
  and `contact-us.spec.ts` (member + admin); `auth.spec.ts`'s failed-login loop is a genuinely
  different flow and wasn't forced into the same helper.
- **`backend/scripts/seed_e2e.py`'s three near-identical `get_or_create_user`/`_vertical`/
  `_product` functions collapsed into one generic `get_or_create(db, model, lookup, defaults)`** —
  flagged independently by two review angles as the same copy-pasted query/construct/flush shape
  three times in one file. `set_setting()` also now runs `loyalty.validate_setting_value()` before
  writing, matching the real admin settings endpoint's validation instead of silently bypassing it.
- **`auth.py`'s `LOGIN_RATE_LIMIT` comment now documents a real, narrow footgun**: since slowapi
  decorator args are evaluated once at module import time, no pytest fixture can reset it the way
  `conftest.py` already resets the limiter's bucket state — a developer who exports
  `LOGIN_RATE_LIMIT` in a shell to start the backend for local E2E work and then runs `pytest` in
  that *same* shell would get a confusingly-wrong result from
  `test_login_rate_limit_blocks_after_five_attempts`. Not fixable via a fixture (too late by the
  time it runs); documented instead — use a separate terminal.
- **CLAUDE.md's own E2E "How to Run" snippet was wrong** — written in bash inline-env-var syntax
  (`VAR="x" command`) despite sitting next to Windows `.venv\Scripts\...` paths in a project whose
  primary shell is PowerShell (confirmed: every other command in this section already uses plain
  Windows syntax). `VAR="x"` isn't valid PowerShell — pasted literally, it fails to set anything
  and can trip `security.py`'s fail-fast guard or silently target the real dev DB. Fixed to
  `$env:VAR = "x"`.
- **Deliberately not changed at the time**: `.github/workflows/deploy.yml`'s `e2e-tests` job
  staying fully serialized behind `backend-tests`/`frontend-checks` — a wall-clock-vs-CI-minutes
  trade-off made deliberately in the original design (don't spend E2E time/browser-download on a
  branch that fails cheaper checks first), not an oversight; left as-is.

### Follow-up: vendor rate-limit override + CI caching (same session)
Two of the three "deliberately not changed" items above were small enough to just do:
- **`VENDOR_LOGIN_RATE_LIMIT` added to `backend/app/routers/vendor_portal.py`**, mirroring
  `auth.py`'s `LOGIN_RATE_LIMIT` exactly (env var, defaults to the unchanged `"5/minute"`, applied
  to `/vendor-auth/login`'s `@limiter.limit(...)`). Not wired into `playwright.config.ts` or the
  CI job — no vendor-portal E2E spec exists yet, so there's nothing to configure it for today; this
  just means the *next* vendor-portal spec won't need another production-code change to avoid the
  same per-IP collision `LOGIN_RATE_LIMIT` was built to fix.
- **`backend-tests` and `e2e-tests` jobs gained `cache: "pip"`** on their `actions/setup-python`
  step (`cache-dependency-path: backend/requirements.txt`), matching the `cache: "npm"` pattern
  already used on every Node setup step in this workflow.
- **`e2e-tests` gained Playwright browser caching** — `actions/cache@v4` keyed on
  `${{ runner.os }}-playwright-<installed @playwright/test version>` for `~/.cache/ms-playwright`.
  A cache hit skips the browser *download* (`playwright install --with-deps`) but still runs
  `playwright install-deps` (OS-level apt packages only, not part of the cached path, cheap
  either way) — a cache miss falls back to the original full `--with-deps` install. Version
  extracted via `node -e "console.log(require('@playwright/test/package.json').version)"` from
  the already-`npm install`-ed `frontend/`, so the cache key auto-invalidates whenever the pinned
  Playwright version changes, no manual bump needed.
- **Verified**: `pytest` 19/19 (confirms `vendor_portal.py` still imports and runs cleanly, and
  the existing vendor rate-limit test still exercises the unchanged `"5/minute"` default); the
  Playwright-version lookup command confirmed working standalone (`1.62.1`); `js-yaml` confirmed
  the job graph and new step names resolve as intended. The caching behavior itself (actual
  cache-hit speedup) can only be observed on a real GitHub Actions run, not locally — expected to
  show up as a faster `e2e-tests` job on the *second* run after this change ships, not the first.

### Broader E2E Coverage: Vendor Portal + Admin Bulk Actions (same session, later pass)
Two more specs, chosen for the same "maps to something real" reasoning as the original 3: the
vendor portal because `VENDOR_LOGIN_RATE_LIMIT` was added specifically for a future spec that
never arrived until now; admin bulk actions because `useBulkSelection`'s `resetKey` bug (Back-
Office Orders Phase 2 review) only had a unit test for the hook in isolation, never the real
toolbar wired to the real table.
- **`vendor-portal.spec.ts`** — vendor logs in (a separate principal/localStorage key,
  `tivuta_vendor_token`, from member/admin — not forced into the shared `login()` helper, which
  asserts a member/admin-specific post-login URL), reports a sale against the seeded member's
  `customer_number` (looked up live via `GET /users/me`, not hardcoded — `generate_customer_number()`
  produces a random value per fresh seed), confirms it appears in the vendor's own dashboard with
  the right amount and `אושרה` (confirmed) status.
- **`admin-bulk-actions.spec.ts`** — creates 3 `general_inquiry` leads via a direct authenticated
  `POST /leads/contact` call (not the UI — that submission flow is already covered by
  `contact-us.spec.ts`), searches `/admin/leads` by a unique-per-run subject prefix to isolate
  exactly those 3 rows, bulk-selects and bulk-status-changes them, confirms all 3 updated.
- **`seed_e2e.py`**: the seeded member now gets a real `customer_number` via
  `loyalty.generate_customer_number(db)` — every real production user has one from signup, but the
  original E2E seed didn't, since nothing needed it until this pass. New seeded `Vendor`
  (`e2e_vendor@tivuta.test`) with portal credentials set directly (mirrors what
  `PATCH /admin/vendors/{id}/portal-access` does, without needing a live API call at seed time).
- **`data-testid` added to two more places**, same minimal pattern as `ProductTile.tsx`'s earlier
  fix: `admin/leads/page.tsx`'s select-all and per-row checkbox toggles (plain unlabeled
  `<button>`s wrapping lucide icons — no accessible name existed before), and
  `BulkActionToolbar.tsx`'s two `<select>`s and execute button. The toolbar is shared with
  `admin/orders/page.tsx`, which gets the same testability for free without being in this pass's
  spec scope.
- **`playwright.config.ts`** — `VENDOR_LOGIN_RATE_LIMIT: '100/minute'` added alongside the
  existing `LOGIN_RATE_LIMIT` override in the backend `webServer` entry's `env`.
- **Found and fixed a real cross-spec bug while running the full suite together**:
  `contact-us.spec.ts`'s final assertion, `getByText('פנייה כללית')`, was an unscoped page-wide
  text match — safe when it was the only spec creating `general_inquiry` leads, but a strict-mode
  "4 elements matched" failure once `admin-bulk-actions.spec.ts` (which runs first alphabetically)
  started leaving its own 3 leads of the same type in the shared DB. This was a latent fragility
  in the *original* spec, only exposed by adding a second spec of the same lead type — fixed by
  scoping the assertion to the specific table row containing that test's own unique subject
  (`page.locator('tr', { has: page.getByText(SUBJECT) })`), the same "don't blanket-match text
  that could appear more than once" lesson `ProductTile`'s `data-testid` fix already established.
- **Proactively avoided a repeat of the earlier login-sequence duplication finding**: rather than
  inline a raw `fetch('/auth/login', ...)` in each new spec (which a prior review round flagged as
  duplicated 3x across the original specs), both new specs use a new shared `apiLogin()` helper
  (`frontend/e2e/helpers.ts`, alongside the existing `login()`/`getProductId()`) — an
  HTTP-API-only login for specs that need a bearer token to set up fixture data, not to test the
  login form itself.
- **Verified end-to-end**: all 5 specs pass together, twice — once against already-running local
  dev servers, once via a fresh CI-style run where Playwright's own `webServer` launches both
  processes (confirming `VENDOR_LOGIN_RATE_LIMIT` actually takes effect, not just that it's wired
  up). `pytest` 22/22, Vitest 7/7, lint unchanged from the post-analytics baseline (185 — no new
  problems from any file touched this pass).

### Broader E2E Coverage: Distribution Scheduling (session 2026-08-13)
A 6th spec, closing the last gap explicitly noted when the original suite shipped: the scheduled-
distribution cron path (`POST /api/distributions/process-scheduled`) and its audience segmentation
filters (`filter_city`/`filter_membership_track`) had real, shipped logic in `_send_distribution`
with zero test coverage — only ever manually curl-verified.
- **`distribution-scheduling.spec.ts`** — creates two `daily_deal` distributions via a direct
  authenticated `POST /admin/distributions` call (the admin create-form's own field-wiring isn't
  the risk here; the cron trigger and segmentation logic are), one filtered by `filter_city`, one
  by `filter_membership_track`, both `scheduled_at` ~5 minutes in the past. Calls
  `POST /api/distributions/process-scheduled` directly with the same `Authorization: Bearer
  <CRON_SECRET>` header GitHub Actions sends every 15 minutes, then polls `GET
  /admin/distributions` (`expect(...).toPass({timeout})`, since `_send_distribution` runs as a
  background task) until both distributions show `status: 'sent'` — asserting `sent_count === 1`
  on **each** is the real proof segmentation worked (a filter bug would show `2`, not `1`), not
  just that *a* send happened. Finishes by logging into the real admin UI and confirming both
  distribution titles render on `/admin/distribution`.
- **`seed_e2e.py`** gained two more dedicated members, matching the established
  "dedicated account per spec need" pattern (`E2E_LOCKOUT_EMAIL`'s own precedent): one with
  `city="ירושלים"` and nothing else, one with `membership_tracks=["gold_track"]` and nothing
  else — no other seeded user has either field set, so each filter is guaranteed to isolate
  exactly its own member.
- **`playwright.config.ts`** — `CRON_SECRET: 'e2e-test-cron-secret'` added to the backend
  `webServer`'s `env`, same "only takes effect when Playwright itself launches the backend"
  caveat already documented for `LOGIN_RATE_LIMIT`/`VENDOR_LOGIN_RATE_LIMIT` — a separately-started
  local backend needs this exported manually before it starts, or this spec's cron call 500s
  immediately (`verify_cron_secret` in `security.py`).
- **Verified end-to-end, three ways**: all 6 specs pass together against already-running local dev
  servers (after clearing a stale `.next` cache and pre-warming every route via `curl -L` first —
  the documented cold-compile gotcha, worse than usual here since this was a fresh `next dev`
  process hitting 6 different route trees back-to-back); all 6 pass again via a fresh CI-style run
  (`CI=1`, Playwright's own `webServer` launching both processes, confirming `CRON_SECRET` actually
  takes effect through that path and not just when manually exported); and the plan's own "prove
  the test can catch the bug it claims to catch" check — temporarily asserted `sent_count === 2`
  on the city-filtered distribution, confirmed a real failure (`Expected: 2, Received: 1`), then
  reverted and confirmed green again. `pytest` 25/25 unaffected (no backend production code changed
  this pass, only the seed script); Vitest 7/7; `tsc`/lint/build all clean. Throwaway `e2e_tivuta.db`
  and dev-server processes cleaned up afterward.
- **Post-implementation review fixes (same session)**: (1) the two independent
  `POST /admin/distributions` fixture-setup calls were sequential `await`s for no reason — now run
  via `Promise.all`, which also visibly sped up the spec (3.8s vs 7-9s in earlier runs). (2) the
  `filter_city`/`filter_membership_track` literal values duplicated `seed_e2e.py`'s
  `E2E_DIST_CITY`/`E2E_DIST_TRACK` constants with no link between the two files — a future rename
  on one side would silently break the other; added a cross-referencing comment and named local
  constants (`DIST_CITY`/`DIST_TRACK`) instead of inline string literals. (3) `ADMIN_EMAIL`/
  `ADMIN_PASSWORD` were being declared a **third** time (already duplicated verbatim in
  `admin-bulk-actions.spec.ts`/`contact-us.spec.ts`) — past this codebase's own established
  extraction threshold (see `useBulkSelection`/`BulkActionToolbar`'s precedent). Extracted
  `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` into `helpers.ts`, updated all three specs to import them
  instead of re-declaring. (4) `playwright.config.ts`'s `workers: 1` comment still said "all 3
  specs" — updated to not hardcode a count that's already been outgrown twice. All 6 specs
  re-verified green after the refactor (34s total, down from ~70s — the parallelized fixture setup
  wasn't just cleaner, it was measurably faster); `tsc`/lint unchanged from baseline.

---

## Self-Hosted Analytics (session 2026-08-12)

The SEO session explicitly rejected Google Analytics: `googletagmanager.com` is an external CDN
domain, and this project's own "Haredi Internet Filter Compatibility" principle warns that kosher
content filters commonly block exactly that class of external script/domain. The result was zero
traffic visibility into the live site since launch. Built a minimal **first-party** analytics
feature entirely inside the existing stack instead of standing up a separate self-hosted tool
(Plausible, Umami, etc.) — those would need their own hosting + database, a bigger infra lift
than this single-Render-service architecture currently supports. Every piece deliberately reuses
an already-established pattern rather than introducing a new one:

- **`page_views` table** (`backend/app/models.py`) — `path`, `locale`, `visitor_id` (a
  client-generated random UUID stored in `localStorage`, not a cookie, never sent cross-site — no
  IP address is ever stored), `referrer`, `created_at`. New migration
  (`4edae04e4800_add_page_views.py`), plain `op.create_table`, no backfill.
- **`POST /analytics/pageview`** (`backend/app/routers/analytics.py`) — no auth, mirrors
  `POST /products/{id}/view` exactly (plain insert, no validation beyond the schema, never fails
  loudly). `trackPageview()` (`frontend/src/lib/api.ts`) mirrors `trackProductView()`'s exact
  fire-and-forget shape: `fetch(...).catch(() => {})`, never awaited.
- **`GET /admin/analytics/summary?days=N`** — one query, one response: loads every `PageView` row
  in the window once and aggregates trend/totals/top-pages/locale-breakdown from that same result
  set in Python, matching `GET /admin/leads/stats`'s exact "load everything, bucket in code, no
  SQL `GROUP BY`" shape (chosen there originally for cross-DB portability between SQLite dev and
  Postgres prod). No `response_model` either, matching that endpoint's convention of returning a
  plain dict for stats-shaped responses.
- **`top_pages` groups on the path with its query string stripped** (`path.split("?")[0]`) — the
  full path (with query) is still stored per-row for fidelity, but an ungrouped top-pages list
  would otherwise fragment into one row per individual `?id=`/`?slug=` value and be useless as a
  "top pages" view. Verified live: two `/he/products?id=1` hits correctly collapsed into one
  `/he/products` entry with count 2.
- **`PageviewTracker`** (`frontend/src/components/PageviewTracker.tsx`) — `'use client'`,
  `usePathname()`/`useSearchParams()`, fires on mount and every client-side route change (there's
  no server-side request log to instrument under `output: 'export'`, so every real pageview is
  necessarily a client-side event — and, as a free side effect, classic non-JS crawlers/bots never
  trigger anything, since nothing server-side observes their hits at all). Mounted in
  `[locale]/layout.tsx` alongside `<SentryInit />`, wrapped in `<Suspense>` — the same requirement
  `ProductQueryPage` already hit for `useSearchParams()` under static export (Public
  Product-Sharing session).
- **`getOrCreateVisitorId()`** (`frontend/src/lib/visitorId.ts`) — `crypto.randomUUID()` under
  `localStorage['tivuta_visitor_id']`, the same client-side-UUID pattern already established by
  the vendor portal's idempotency-key generation (Loyalty Phase 3). Verified live: the same id
  persists across a page reload.
- **New admin page `admin/analytics/page.tsx`** (new "תנועה" nav tab in `admin/layout.tsx`) — stat
  cards (pageviews + unique visitors, today/7d/30d), a 14/30/90-day trend chart reusing
  `LeadsChart`'s exact hand-rolled `<div>` flex-bar visual (not `recharts` — confirmed that
  dependency is only actually used by the unrelated legacy `benefits/[locale]/dashboard`, so
  introducing it here would've meant maintaining two charting approaches for no reason), a
  top-pages table, and a locale breakdown. Single `adminGetAnalyticsSummary(token, days)` call per
  page load, matching `admin/loyalty/page.tsx`'s established self-contained single-file shape.
- **Verified end-to-end** with a real browser session (Playwright): a logged-out visit to the
  public `/products?id=` page correctly tracked a pageview; `visitor_id` confirmed stable across a
  reload; browsing across `he`/`en` locales and multiple routes while logged in produced a
  dashboard that correctly showed matching pageview/unique-visitor totals, a trend bar on the
  right day, top pages grouped and counted correctly, and a locale breakdown matching the actual
  mix of pages visited — zero console errors throughout. Backend: 21/21 tests pass (2 new,
  covering pageview creation and every aggregation bucket — today/7d/30d totals, unique-visitor
  dedup, top-pages grouping, locale breakdown — against directly-seeded rows with controlled
  `created_at` values). Frontend: build (new `/admin/analytics` route confirmed built for all 4
  locales), Vitest (7/7) both green; lint added exactly one new instance of this codebase's
  pre-existing `setLoading(true)`-inside-`useEffect` pattern (already present, unfixed, in 9+
  other admin pages — matching that established convention was the deliberate choice here, not an
  oversight of a new problem).
- **Post-implementation review found and fixed a real bug**: the row-loading window used
  `since = now - timedelta(days=days)`, so the admin page's default `days=14` request silently
  excluded any row 15–30 days old from the "30-day" stat cards — invisible in the original test,
  which only ever called the endpoint with `?days=30`. Fixed to
  `since = now - timedelta(days=max(days, 30))` (the totals always cover fixed 7d/30d windows
  regardless of the trend chart's own length) and added a regression test that calls the endpoint
  with the actual frontend default (`days=14`) and asserts a 20-day-old row is still counted —
  confirmed it fails without the fix and passes with it.
- **Explicitly out of scope, deferred**: no `user_id` attribution (v1 stays purely anonymous — an
  optional-auth dependency doesn't exist anywhere in `security.py` today, confirmed absent during
  the Public Product-Sharing session too; adding one just for this would be more new surface than
  a traffic-visibility MVP needs); no admin/internal-traffic exclusion (would need the same
  user-attribution mechanism); the legacy `benefits/[locale]/*` sub-app is not instrumented,
  consistent with every recent session treating it as frozen. **Update (session 2026-08-12): the
  data-retention/pruning gap was closed — see "Data Retention / Pruning for page_views" below.**

---

## Redis-Backed Rate Limiter (session 2026-08-12)

The Backend Security Hardening session's `slowapi` rate limiter used in-memory storage with an
explicit, documented caveat: correct only because `backend/Procfile` runs a single Uvicorn
process (no `--workers`); if Render is ever scaled to multiple instances, each would track its
own separate counters and under-count the real total. This adds the opt-in fix — capability only,
not turning anything on.

- **`backend/app/rate_limit.py`** — `REDIS_URL = os.environ.get("REDIS_URL", "")`, then
  `Limiter(key_func=get_remote_address, storage_uri=REDIS_URL or None)`. Same "ships dark until
  configured" presence-check shape as `main.py`'s `SENTRY_DSN` (one alternative, not a named-
  provider switch like `get_email_sender()`/`get_image_storage()`) — `slowapi.Limiter` already
  accepts `storage_uri` and defaults internally to `"memory://"` when not given, so this is the
  entire change; nothing else in `main.py`'s limiter registration (`app.state.limiter`, the
  exception handler, `SlowAPIMiddleware`) needed to change.
- **`backend/requirements.txt`** — added `redis<8.0.0`. Confirmed live during implementation that
  a bare, unpinned `pip install redis` pulls `redis==8.1.0`, which violates `limits==5.8.0`'s
  (slowapi's own pinned dependency) own compatibility constraint (`redis!=4.5.2,!=4.5.3,<8.0.0,>3`)
  — installed `7.4.1` instead and pinned the same ceiling in `requirements.txt` so a fresh install
  anywhere else (Render included) can't silently repeat the same mismatch.
- **`conftest.py`'s `limiter.reset()` needed no changes** — confirmed both `MemoryStorage.reset()`
  and `RedisStorage.reset()` exist and are called through the same `Limiter.reset()` method, and
  `REDIS_URL` is never set in the pytest/CI environment, so tests keep exercising in-memory
  storage exactly as before.
- **Verified end-to-end with a real, temporary Redis** (Docker was available on this machine;
  Docker Desktop wasn't running and was started first) — started the backend with
  `REDIS_URL=redis://localhost:6379`, confirmed it connects cleanly, fired 6 rapid bad-credential
  requests at `/auth/login` and got five `401`s then a `429` exactly as with in-memory storage,
  then inspected Redis directly (`redis-cli keys '*'`) and found a real
  `LIMITS:LIMITER/127.0.0.1//auth/login/5/1/minute` key, confirming the counters are genuinely
  stored there and not in the process's memory. **Went further and proved the actual motivating
  scenario**: started a *second*, fully independent backend process on a different port against
  the same Redis — its very first request came back `429` immediately, because it shares the same
  Redis-backed counter the first process had already exhausted. This is exactly the multi-instance
  under-counting problem the feature exists to fix, confirmed working, not just wired up.
  `pytest` 22/22 with `REDIS_URL` unset (zero regression); `pip install -r requirements.txt`
  installs cleanly with the new pin. Docker container and both verification backend processes
  torn down afterward.
- **Explicitly out of scope, deferred**: actually provisioning Redis on Render (creating a Render
  Redis instance or an external provider like Upstash, setting `REDIS_URL` in Render's dashboard)
  — an infra/ops step outside this repo, matching every other "ships dark until configured"
  integration here (Sentry, Resend, Supabase image storage); a dedicated automated test (the
  change is a one-line presence-check with no branching logic worth a regression test in
  isolation, and a real Redis-in-CI setup is a bigger, separate decision not currently justified
  by this small a change — the Docker-based manual verification above was judged sufficient);
  `--workers`/multi-process Uvicorn on Render itself (this only removes the blocker for doing that
  safely later, doesn't do it).

---

## PDF Export for Vendor Purchase-Batch Documents (session 2026-08-12)

The Vendor Purchase Batches session (Back-Office Orders Phase 2) built print + CSV export for the
picking/packing-list documents an admin uses when a consolidated vendor order arrives, explicitly
noting "a 3rd 'PDF' document option is planned for later, not built now." This session built it —
one-click direct `.pdf` download, no browser print dialog, alongside the existing print/CSV
buttons.

- **New dependencies**: `jspdf` + `jspdf-autotable`, dynamically imported inside `exportPdf()`
  (`await import('jspdf')`/`await import('jspdf-autotable')`) rather than a top-level static
  import — same lazy-load pattern as `lib/sentry.ts`'s `loadSentry()`, so the library only enters
  the bundle when an admin actually clicks a PDF button.
- **`frontend/src/lib/printDocument.ts`'s new `exportPdf(title, filename, headers, rows)`** —
  same signature shape as the pre-existing `openPrintableTable()`/`downloadCsv()`, so all three
  buttons share one already-computed `{headers, rows}` per document. Embeds the site's existing
  self-hosted `Heebo-Regular.ttf` (fetched from `/fonts/`, base64-encoded, registered via jsPDF's
  `addFileToVFS`/`addFont`) since jsPDF's built-in fonts have no Hebrew glyphs.
- **`admin/vendors/page.tsx`** — factored each document type's row computation into
  `getPickingListData(batch)`/`getPackingListData(batch)` (each returning `{headers, rows}`),
  reused by that type's print, CSV, *and* new PDF handler instead of each button recomputing an
  identical array independently (previously duplicated once per button; a 3rd button was the
  natural point to stop tripling it). Added a `FileText`-icon "PDF" button next to the existing
  print/CSV buttons for both the picking list and packing list.

### The RTL rendering bug — full account, so a future session doesn't re-tread this
Getting this to actually *look* correct in Hebrew took several wrong turns, each disproven only by
rendering real output and looking at it — **PDF text-extraction order does not reliably reflect
visual rendering for RTL content**, so the `Read` tool run directly on a `.pdf` file is not a valid
way to check this; a downloaded PDF was rasterized to PNG via a throwaway
`ubuntu:22.04` + `poppler-utils`(`pdftoppm`) Docker container and inspected as an image instead
(Playwright can't help here either — `page.goto('file://*.pdf')` triggers a browser download, not
a render, confirmed via `Error: page.goto: Download is starting`).

- **Font-fallback garbage glyphs**: `jspdf-autotable`'s `headStyles.fontStyle` defaults to
  `'bold'`; only the `'normal'` Heebo weight was ever registered via `addFont`, so a bold header
  cell silently fell back to a built-in font with no Hebrew glyphs at all (visual garbage, not
  just wrong order). Fixed by forcing `fontStyle: 'normal'` everywhere text uses the Heebo font.
- **`doc.setR2L(true)` reverses *any* string passed to `doc.text()`, but `jspdf-autotable`'s own
  per-cell rendering only needs that reversal for cells that actually contain Hebrew** — a cell
  mixing Hebrew and Latin (a product name like "טבעת PDF בדיקה") renders correctly on its own once
  `setR2L(true)` is active (some internal run-aware handling kicks in once Hebrew is detected), but
  a cell that's *purely* Latin/digit (an order number, a phone number) gets no such handling and is
  reversed character-by-character as one blob — confirmed via a rasterized screenshot showing
  `ORD-000005` rendered as `500000-DRO` and `0501112222` as `2222111050`. **Fix**: `fixRtlCell()`
  in `printDocument.ts` pre-reverses any cell whose content contains no Hebrew Unicode-range
  character (`/[֐-׿]/`) before handing it to `autoTable` — its own reversal then lands
  it back in correct reading order. A Hebrew-containing cell passes through untouched.
  - **Column order is still reversed separately** (`[...headers].reverse()`) to match RTL reading
    order — `jspdf-autotable` lays columns out left-to-right positionally with no RTL table option
    of its own; this is independent of, and composes with, `fixRtlCell`.
- **The title/timestamp lines (drawn via direct `doc.text()`, not through the table) needed a
  different fix for the same root cause**: a title like `"רשימת ליקוט — PB-002-000001"` mixes a
  Hebrew phrase with a Latin/digit identifier in one string, but unlike a table cell there's no
  per-string Hebrew-detection happening for direct `doc.text()` — the whole string gets reversed
  as one blob regardless. `drawLabelledLine(label, value, y)` splits the two into separate
  `doc.text()` calls: the Hebrew `label` is drawn normally (benefits from `setR2L(true)`'s
  reversal, same as a Hebrew-containing cell would), while the Latin/digit `value` is drawn with
  `setR2L(false)` toggled just for that one call (then immediately restored to `true`) so it's
  never reversed in the first place — positioned immediately left of the label via
  `doc.getTextWidth(label)`.
- **False leads ruled out along the way, kept here so they aren't retried**: a hand-rolled
  bidi/run-splitting reversal function (abandoned — reinvented a worse version of what `setR2L`
  already does for the cases it does handle); routing the title through `autoTable` as its own
  single-cell/colSpan header row instead of direct `doc.text()` (inconsistent — still reversed the
  identifier in some content shapes); removing `setR2L` entirely and routing title+timestamp+table
  all through one `autoTable` call (this *regressed* the previously-correct table rendering too —
  disproving the theory that `autoTable`'s per-cell handling is bidi-safe independent of `setR2L`;
  it turned out to depend on `setR2L(true)` being active, just handling Hebrew-containing cells
  more gracefully than direct `doc.text()` does under the same setting).
- **Verified end-to-end** via the Docker/poppler rasterization method above: a real picking-list
  PDF (title with embedded batch number, timestamp, 2-row table mixing Hebrew product names with
  "PDF" substrings) and a real packing-list PDF (5-column table including pure-digit order numbers
  and phone numbers) both confirmed pixel-correct after the `fixRtlCell` fix — Hebrew right-to-left
  throughout, embedded Latin/digit identifiers left-to-right and unreversed, correct RTL column
  order, zero console errors during generation. Existing print/CSV buttons re-confirmed unaffected
  by the row-computation refactor (same `{headers, rows}` feeds all three). `npx tsc --noEmit`,
  `npm run lint` (no new issues in touched files), and `npm run build` all clean.
- **Explicitly out of scope, deferred**: backend-generated PDFs (stays entirely client-side,
  consistent with this codebase's existing "no HTML-string-building backend endpoints" decision for
  these documents); PDF export anywhere else in the app (scoped to the two vendor purchase-batch
  documents this was explicitly deferred for); custom page headers/footers/logos/branding inside
  the PDF (a plain title + table, matching the existing print/CSV documents' own plainness).

---

## Data Retention / Pruning for page_views (session 2026-08-12)

The Self-Hosted Analytics session shipped `page_views` with an explicitly noted gap: no
data-retention/pruning job, so the table grows unbounded. This closes it with a configurable
retention window, an automatic daily cron, and a manual admin "prune now" button.

- **New `SystemSetting`, `page_view_retention_days` (default `"180"`)** — reuses the existing
  generic settings mechanism (`services/loyalty.py`'s `DEFAULT_SETTINGS`/
  `NON_NEGATIVE_FLOAT_SETTINGS`/`validate_setting_value`) rather than inventing a new one. `0` is
  accepted as a legitimate (if extreme) policy value — "keep nothing" — same reasoning already
  applied to `unsettled_grace_days=0`. It's editable for free via the existing generic settings
  editor on `admin/loyalty/page.tsx` (just a new `SETTING_LABELS` entry) — no new settings UI.
- **One shared pruning helper, two entry points** — `routers/analytics.py`'s
  `_prune_old_pageviews(db)` computes the cutoff from the setting and does a single atomic bulk
  delete (`db.query(PageView).filter(created_at < cutoff).delete(synchronize_session=False)`, no
  ORM per-row loop), returning `(deleted_count, retention_days)`. Both callers share it, matching
  this codebase's established "shared core, multiple callers" convention (e.g.
  `loyalty.create_sale_transaction` behind both admin and vendor sale-reporting):
  - `POST /admin/analytics/prune` (`get_current_admin`) — the manual trigger.
  - `POST /api/analytics/prune-old-pageviews` — no admin dependency; copies
    `process_scheduled_distributions`'s inline `Authorization: Bearer <CRON_SECRET>` check verbatim
    (500 if `CRON_SECRET` isn't configured on the server, 401 if missing/wrong), since a cron run
    has no admin JWT to present.
- **`.github/workflows/prune-analytics.yml`** (new) — a daily cron (`17 3 * * *`, deliberately not
  piggybacked onto `schedule.yml`'s every-15-minutes distributions job, since pruning is a
  once-a-day housekeeping concern, not a time-sensitive one) with one `curl` step, reusing the
  already-configured `CRON_SECRET` repo secret `schedule.yml` already uses — no new secret to
  provision.
- **`admin/analytics/page.tsx`** gained a "ניקוי נתונים ישנים" card (prune-now button + its own
  local `Toast`, matching the established per-admin-page pattern — 11 other admin pages already
  keep their own `Toast` copy rather than sharing one, since no review has ever found that specific
  duplication actually drifting) showing the result via toast (e.g. "נמחקו 2 רשומות (ישנות מ-180
  יום)") and refreshing the summary afterward.
- **Verified end-to-end**: `pytest` 25/25 (3 new — admin-triggered prune deletes only rows past the
  retention cutoff and is idempotent on a second call with nothing left to prune, non-admin gets
  403, the cron endpoint's 500/401/200 CRON_SECRET behavior); `tsc`/`lint`/`build` all clean. Real
  browser session (Playwright): seeded old/recent `PageView` rows directly in the dev DB, confirmed
  the new setting is visible and editable on `/admin/loyalty`, clicked "מחק נתונים ישנים כעת" on
  `/admin/analytics` and got the correct toast + DB state (both old rows gone, the recent one
  survived), zero console errors. Manual `curl` against the cron endpoint confirmed all three
  states (unconfigured → 500, wrong/missing secret → 401, correct secret → 200 with a real
  `{deleted, retention_days}` body). Test rows/users and dev-server processes cleaned up
  afterward, DB confirmed back at documented baseline (4 users, 4 `customer_orders`, 5 `leads`).
- **Explicitly out of scope, deferred**: no automated test for the CRON_SECRET-protected endpoint's
  actual GitHub Actions trigger (matches `process-scheduled`'s own precedent — verified manually,
  same as that endpoint always was); no admin-configurable cron *frequency* (only the retention
  *window* is tunable — a fixed daily schedule is enough); provisioning nothing new is required on
  Render (`CRON_SECRET` already exists there for `schedule.yml`'s job).
- **Post-implementation review found two real issues, both fixed the same session**: (1) the new
  cron endpoint's `Authorization: Bearer <CRON_SECRET>` check was first written as a second
  verbatim copy of `process_scheduled_distributions`'s inline check — extracted into a shared
  `security.py`'s `verify_cron_secret(request)` instead, and `distributions.py`'s cron endpoint was
  updated to call it too, so there's now exactly one implementation of this check for any future
  cron endpoint to reuse, not two that could drift. (2) `adminPruneAnalytics()` in `api.ts` first
  discarded the backend's real error detail on failure (`throw new Error('Failed to prune...')`
  with no response-body parsing) — inconsistent with the majority of this file's admin mutation
  helpers (e.g. `adminOpenSettlementPeriod`/`adminSettlePeriod`, which parse `err.detail`). Fixed
  to match. Both fixes verified: `pytest` 25/25 unchanged, `tsc`/lint clean, and a live curl check
  of all four cases (unconfigured/wrong-secret/correct-secret on both cron endpoints) confirmed
  identical behavior to before the refactor.

---

## Live Countdown in the Lockout Message (session 2026-08-13)

The Per-Account Login Lockout session shipped a static 423 message naming the *configured*
lockout duration ("Try again in 15 minute(s).") rather than the actual remaining time, explicitly
deferring a live countdown as future polish. The static message was also literally wrong the
moment a locked-out user refreshed the page mid-lockout — it always showed the full configured
duration, never how much time was actually left. This session replaces it with a real countdown
to the exact unlock instant.

- **`security.py`'s new `AccountLockedError`** carries the real `locked_until` timestamp, not just
  a duration string. `check_account_lock` raises it instead of a plain `HTTPException`; a new
  `account_locked_handler` (registered in `main.py` via `app.add_exception_handler`, same pattern
  already used for `RateLimitExceeded`) returns the 423 response with **both** the existing
  `detail` string (unchanged shape, so every existing string-only consumer of `err.detail` keeps
  working) **and** a new sibling `locked_until` field the frontend uses to compute the countdown.
- **New shared `frontend/src/lib/useCountdown.ts`**, extracted from `ProductTile.tsx`'s
  previously-private `useCountdown` hook — now also used by the new lockout countdown. Along the
  way it gained a `Z`-append normalization step (same regex already proven in `admin/users/page.tsx`'s
  `isLocked()`) for naive-UTC input, since backend timestamps have no timezone designator and JS's
  `Date` otherwise parses them as local time, not UTC.
- **Found and fixed two real, independent copies of the same latent timezone bug while extracting
  this hook** — not just the one being replaced. `ProductTile.tsx`'s flash-sale countdown and
  `ProductDetailClient.tsx`'s raffle/first-n "closes in" countdown (`CountdownDisplay`, a third,
  separately-written `useCountdown` nobody had connected to the first one) both fed a naive-UTC
  `Promotion.end_date` straight into `new Date(endDate).getTime() - Date.now()` with no `Z`-append —
  silently mis-displaying remaining time by the browser's local UTC offset on every non-UTC
  timezone. Both now import the one shared, `Z`-safe hook; `ProductDetailClient.tsx`'s local copy
  was deleted outright. Confirmed live on this dev machine (UTC+3): a flash-sale promo seeded to
  end in ~2 hours showed `01:55:13` (correct) before the fix would have shown something in the
  `04:5x:xx` range.
- **`frontend/src/components/LockoutCountdown.tsx`** (new) — the shared "too many attempts, try
  again in mm:ss" widget, switching to "you can try again now" once the countdown hits zero
  (mirrors `FlashCountdown`'s own expired-state handling). Built-in 4-locale strings, matching this
  codebase's no-shared-i18n-library convention.
- **All three login surfaces updated**: `(public)/login/page.tsx` and
  `benefits/[locale]/login/page.tsx` both already special-cased `response.status === 423` from a
  raw inline `fetch()` — they now read `data.locked_until` into a new `lockedUntil` state and
  render `<LockoutCountdown>` instead of the plain error string when set.
  `vendor/login/page.tsx` goes through `vendorLogin()` in `lib/api.ts`, which previously only ever
  threw a plain `Error(err.detail)` — a new exported `LockedAccountError` subclass (carrying
  `lockedUntil`) is thrown instead when the 423 body has `locked_until`, and the page's `catch`
  block checks `err instanceof LockedAccountError` before falling back to the existing
  `getErrorMessage` path for every other failure.
- **Verified end-to-end**: `pytest` 25/25 (the existing lockout test now also asserts
  `locked_until` parses as a real near-future timestamp, not just checking the 423 status code);
  `tsc`/lint/build all clean. Real browser session (Playwright): locked a member account and a
  vendor account (5 wrong passwords each, simulated via direct DB seed for speed), confirmed both
  login pages show a live, ticking countdown (two readings 2.5s apart differed, proving it's not a
  static string); confirmed the flash-sale and raffle countdown fixes above with real seeded
  promotions. Test accounts/promotions and dev-server processes cleaned up afterward, DB confirmed
  back at documented baseline (4 users, 1 vendor, 4 `customer_orders`, 5 `leads`, 0 promotions).
- **Explicitly out of scope, deferred**: a dedicated vendor-side backend lockout test
  (`check_account_lock` is shared and already covered by the member-side test).
- **Post-implementation review fix (same session)**: `lib/useCountdown.ts`'s `toUtcIso()` helper
  was written with a comment noting it matched "the fix already established in
  `admin/users/page.tsx`'s `isLocked()`" — but left that page's own inline copy of the same regex
  in place instead of consolidating. A review caught the duplication risk (the two copies could
  silently drift if either ever needed a fix). `toUtcIso` is now exported and `isLocked()` imports
  it instead of re-declaring its own copy. Re-verified live: the admin users page's locked badge
  and unlock button still render correctly for a genuinely-locked test account.

---

## Vendor Portal Self-Service Signup/Password-Reset (session 2026-08-13)

Loyalty Phase 3 deliberately shipped admin-issued-only vendor portal credentials — an admin had to
pick and type a password on the vendor's behalf, with no vendor-facing self-service, explicitly
noted as a v1 scope cut for "a small, known set of vendors."

**Scope decision, confirmed with the user before building**: vendors stay admin-curated — this is
a B2B portal tied to a fraud-sensitive commission/points ledger (see the Loyalty Program's fraud-
resistance design decisions), and open self-registration would let anyone create a "vendor" and
start reporting fake sales. "Self-service" here means two things, both reusing one token-based
"set your password" mechanism, neither opening account creation to the public: (1) a vendor who
already has portal access can reset a forgotten password themselves via an emailed link, and (2)
an admin can invite a *new* vendor by setting just their login email — the vendor then chooses
their own first password via the same link, instead of the admin inventing and manually sharing
one.

- **`Vendor.reset_token`/`reset_token_expires`** (new columns, migration
  `14eafd54db52_add_vendor_reset_token.py`, plain nullable `op.add_column`s, no batch mode needed
  — same shape as `50da6b936e9b`'s vendor-column precedent) mirror `User`'s existing reset-token
  fields exactly.
- **`POST /vendor-auth/forgot-password`/`POST /vendor-auth/reset-password`** (`vendor_portal.py`)
  are near-verbatim ports of `auth.py`'s member `forgot_password`/`reset_password` — same
  `secrets.token_urlsafe(32)` + 60-minute expiry, same anti-enumeration "always return success"
  response, same rate limits (`3/hour`/`5/minute`), same lockout-clearing on a successful reset.
  Both reuse the existing generic `schemas.ForgotPasswordRequest`/`ResetPasswordRequest` — no new
  schemas needed, since neither is principal-specific in shape.
- **`PATCH /admin/vendors/{id}/portal-access`'s `password` field is now `Optional`** — this single
  change *is* the invite mechanism. Password given → unchanged existing behavior (admin sets it
  directly, any pending reset token is cleared). Password omitted → the endpoint generates a reset
  token/expiry (the same fields the self-service flow uses) and emails an invite to the same
  `/vendor/reset-password?token=...` link. Works identically whether the vendor is brand new
  (`hashed_password` was never set — they literally cannot log in until they complete the link) or
  already active (this becomes an admin-triggered alternative to the vendor resetting it
  themselves — useful if a vendor is locked out and can't receive email, for instance).
  `RESET_TOKEN_EXPIRE_MINUTES` is defined once in `vendor_portal.py` and imported into
  `vendors.py` rather than duplicated as a second magic number.
- **New frontend pages** `vendor/forgot-password/page.tsx` and `vendor/reset-password/page.tsx` —
  structural copies of the member `(public)/forgot-password`/`reset-password` pages (same card
  layout, same `<Suspense>` wrapper on the reset page for `useSearchParams()` under static export)
  restyled with the vendor portal's existing gold/`Store` visual language instead of the member
  pages' navy/`LogIn` styling, linking back to `/vendor/login`. `vendor/login/page.tsx` gained a
  "שכחתי סיסמה" link (it never had one before — the member login page did, vendor login didn't).
- **`admin/vendors/page.tsx`'s portal-access modal**: the password field is now optional with
  updated hint text ("leave blank to email an invite instead"), and both the submit button label
  and the success toast branch on whether a password was actually typed.
- **Verified end-to-end**: `pytest` 32/32 (7 new — forgot-password creates a token and the
  anti-enumeration response holds for a nonexistent email, reset-password updates the hash/clears
  lockout/rejects an invalid token and the vendor can then log in with the new password, the admin
  endpoint's two branches — invite-sends-email-no-password-set vs. direct-password-set — both
  produce the expected `Vendor` state, non-admin gets 403); `tsc`/lint/build all clean (both new
  routes confirmed built for all 4 locales). Real browser session (Playwright), full loop both
  ways: admin invited a brand-new vendor (email only) → real invite email captured from the
  console email sender's log, containing a working reset link → vendor completed the link, chose
  their own first password, and logged into the vendor dashboard successfully; separately, that
  same now-active vendor clicked "שכחתי סיסמה" on the login page → completed a fresh self-service
  reset with a newly-generated token (confirmed distinct from the invite token) → logged in with
  the self-chosen replacement password. Zero console errors throughout. Test admin/vendor and
  dev-server processes cleaned up afterward, DB confirmed back at documented baseline (4 users, 1
  vendor).
- **Explicitly out of scope, deferred**: open public vendor self-registration (confirmed with the
  user as a deliberate scope decision — vendors stay admin-curated); a dedicated vendor unlock
  button (separate, already-identified deferred item — per the post-review fixes below, admin-set
  password is the one path that both replaces credentials and clears lockout for an active
  vendor); automated E2E coverage for the new flow (no `VENDOR_FORGOT_PASSWORD_RATE_LIMIT`-style
  env override added preemptively, matching `VENDOR_LOGIN_RATE_LIMIT`'s own precedent of only
  adding that override once a real spec needed it).

### Post-implementation review fixes (same session, after a 5-angle code review)
All five review angles converged on the same root problem, from different symptoms: the first
version of `admin_set_vendor_portal_access` treated "password omitted" as a single case, when it
actually needed to distinguish three.
- **The core fix**: omitting the password now only triggers the invite-email branch when
  `vendor.hashed_password` is `None` (a genuinely new vendor). If the vendor already has a working
  password and the admin submits with the field blank — e.g. to fix a typo in the email — it's now
  a pure no-op on credentials: no surprise "you've been granted access" email to an already-active
  vendor, and (the sharper finding) no more silent non-reset — the old version generated a fresh
  invite token for an active vendor **without ever invalidating their existing password**, so an
  admin trying to revoke a compromised vendor's access via this path would have left the old
  password fully working the entire time. To force-reset an active vendor now, an admin sets a new
  password directly (the existing first branch), which already fully replaces the hash and clears
  lockout — no separate "revoke" action needed.
- **Reset-token issuance was duplicated three ways** (`auth.py`, `vendor_portal.py`, and the
  vendors.py invite branch) — three independent review angles flagged this. Extracted
  `issue_reset_token`/`consume_reset_token` into `security.py` alongside the existing
  `check_account_lock`/`record_failed_login` duck-typed helpers (same User/Vendor polymorphism,
  same reasoning: a security-sensitive flow with near-identical copies is exactly what drifts).
  `RESET_TOKEN_EXPIRE_MINUTES` now lives in one place instead of being manually kept in sync
  across two files via a comment.
- **`ResetPasswordRequest.new_password` had no `min_length`**, unlike `VendorPortalAccessUpdate`'s
  `min_length=8` — meaning anyone holding a valid (or leaked) reset token could set a one-character
  password on either principal, bypassing the frontend's `minLength=8` HTML attribute entirely.
  Added `Field(min_length=8)` to the shared schema, closing the gap for both principals at once.
- **The admin-invite email hardcoded `/he/vendor/reset-password`**, ignoring locale entirely, while
  the sibling self-service `vendor_forgot_password` correctly used the caller's `locale`. Added an
  optional `locale` field to `VendorPortalAccessUpdate` and a small language dropdown in the admin
  invite modal (shown only for the genuine new-vendor-invite case) so an admin can pick the
  vendor's language — verified live that selecting English produced a `/en/vendor/reset-password`
  link instead of always `/he/`.
- **`VendorRead` never exposed `login_email`**, even though the frontend `Vendor` TS type declared
  it and `admin/vendors/page.tsx` read it to prefill the modal and choose the button's title
  ("update" vs. "activate"). Harmless before (an admin was always retyping a password anyway) but
  load-bearing now that a blank submission's behavior depends on whether the vendor already has
  access — added `login_email: Optional[str]` to `VendorRead`; verified live that the button now
  correctly reads "עדכון פרטי כניסה לפורטל" (not "הפעלת פורטל ספק") for an already-active vendor,
  and the email field prefills correctly.
- **`vendorForgotPassword()`/`forgotPassword()` discarded their response's failure signal
  entirely** (`return res.ok` with no throw) — a vendor who tripped the `3/hour` rate limit saw a
  false "reset link has been sent" success message, and a genuine network failure left an
  unhandled rejection with the submit button stuck spinning forever (`setIsLoading(false)` never
  ran). Both now throw on a non-ok response, matching `resetPassword()`'s existing pattern; both
  forgot-password pages gained a `try`/`catch`/`finally` and an error box (the member page never
  had one before). A same-session follow-up fix: since slowapi's own 429 body has no `detail`
  field (`{"error": "Rate limit exceeded..."}`, not FastAPI's usual shape), the thrown error's
  `.message` was always api.ts's unlocalized English fallback string — both pages now show their
  translated `t.error` unconditionally on any catch, since neither realistic failure mode here
  (rate limit, network, 5xx) ever carries a single-string detail worth surfacing individually.
- **Verified end-to-end after all fixes**: `pytest` 35/35 (3 new regression tests — editing an
  active vendor's email leaves their password working and sends no invite; `VendorRead`/`GET
  /admin/vendors` both return `login_email`; a sub-8-character `new_password` is rejected with
  422); `tsc`/lint (185, unchanged baseline)/build all clean. Real browser session (Playwright):
  confirmed editing an active vendor's email no longer sends an invite and the old password still
  logs in afterward; confirmed a brand-new-vendor invite still works with the locale dropdown
  correctly changing the emailed link's locale segment; confirmed the rate-limit path now shows
  the real, localized error message instead of a false success state. Test data and dev-server
  processes cleaned up afterward, DB confirmed back at baseline (4 users, 1 vendor).

---

## Dedicated Vendor Unlock Button (session 2026-08-13)

The Per-Account Login Lockout session gave admins a one-click unlock for locked-out *member*
accounts but skipped an equivalent for vendors, reasoning that the existing portal-access-reset
action "already clears vendor lockout as a side effect." The Vendor Portal Self-Service review
(same day) correctly fixed that action so a plain email edit on an already-active vendor no longer
touches lockout state at all — which was the right fix for that bug, but it also quietly removed
the *only* way an admin had to unlock a vendor without also resetting their password. This session
closes that gap with a real, dedicated control, mirroring the member one exactly.

- **`PATCH /admin/vendors/{vendor_id}/unlock`** (`routers/vendors.py`) is a straight port of
  `admin_unlock_user` (`users.py`): clears `failed_login_attempts`/`locked_until`, 404 if the
  vendor doesn't exist, harmless no-op if it wasn't locked. `VendorRead` gained a `locked_until`
  field (it already had `login_email` from the review session) so the frontend can know a vendor
  is locked at all.
- **`admin/vendors/page.tsx`** gained the same `isLocked()`/badge/button trio as
  `admin/users/page.tsx` — a red "נעול" badge in the status column, an `Unlock`-icon button in the
  actions column (both shown only while actually locked), and `handleUnlockVendor` calling the new
  `adminUnlockVendor` API helper. `isLocked()` imports the shared `toUtcIso` from
  `lib/useCountdown.ts` (the Live Countdown session's dedup fix) rather than re-inlining the
  naive-UTC-to-Z regex a third time.
- **Verified end-to-end**: `pytest` 38/38 (3 new — unlock clears lockout and the vendor can log in
  immediately afterward, non-admin gets 403, unknown vendor id gets 404); `tsc`/lint (185,
  unchanged baseline)/build all clean. Real browser session (Playwright): confirmed the badge and
  unlock button appear only for a genuinely-locked vendor, clicking unlock clears both and shows
  the correct toast, the vendor can log in again immediately after, and a non-locked vendor shows
  neither control. Test data and dev-server processes cleaned up afterward, DB confirmed back at
  baseline (4 users, 1 vendor).

### Post-implementation review fixes (same session)
- **`admin_unlock_vendor`'s docstring overstated what changed**: it claimed portal-access edits
  "no longer clear lockout as a side effect" without scoping that to the password-*omitted* case —
  `admin_set_vendor_portal_access` still (correctly, unchanged) clears lockout whenever an admin
  sets a new password directly. Reworded to state both cases precisely, so a future reader auditing
  lockout-clearing paths doesn't miss that a direct password reset is a second existing way to
  unlock a vendor.
- **`isLocked()` and the badge/unlock-button JSX were copy-pasted into `admin/vendors/page.tsx`
  from `admin/users/page.tsx`** (same logic, slightly diverged padding/icon sizing) — the review
  flagged this against this session's own precedent (`BulkActionToolbar`, Back-Office Orders
  Phase 2: two copies drifted on toast wording after a single edit cycle before being extracted).
  Extracted `isAccountLocked(lockedUntil)` into `lib/useCountdown.ts` (alongside the `toUtcIso` it
  depends on) and a new `frontend/src/components/admin/LockoutControls.tsx`
  (`LockedBadge`/`UnlockButton`, each taking a `compact`/`showLabel` prop so the two pages' already
  slightly different sizing is an explicit, intentional parameter rather than two silently
  diverging inline copies). Both admin pages now import the shared pair instead of defining their
  own.
- **Re-verified live after the extraction**: full `pytest` (38/38), `tsc`/lint (185, unchanged)/
  build all clean; a real browser session confirmed both pages' lockout badge and unlock button
  still work correctly through the shared component — the member page's labeled button and the
  vendor page's icon-only compact button both render and behave exactly as before.

---

## Product Categories per World (session 2026-08-13)

Admins can now define sub-categories scoped to a single world (e.g. "Rings"/"Necklaces" under
diamonds), tag a product with one via the product form, bulk-tag many selected products at once,
and members can filter a world's listing by category in the sidebar. No categories are seeded —
the feature is fully inert (no filter UI renders at all) until an admin creates the first one for
a given world.

- **Naming collision found and avoided**: `backend/app/models.py` already has a `Category`/
  `SubCategory`/`Item` trio (unrelated legacy `/benefits` catalog) with routes already at
  `GET /categories`, `GET /categories/{slug}`, `GET /categories/{slug}/items`
  (`routers/catalog.py`). The new feature uses **`ProductCategory`** (table `product_categories`)
  and route prefix **`/product-categories`** throughout, to avoid colliding with either.
- **`ProductCategory` model** (`backend/app/models.py`) — `vertical` (plain indexed `String(50)`,
  matches `Vertical.slug`, same loose-string convention as `Vendor.vertical`/`Product.vertical` —
  not a real FK, validated at the app layer), `label_he` (required) + `label_en/fr/yi`,
  `display_order`, `is_active`. Deliberately minimal — no icon/subtitle/attribute_fields (that's
  `Vertical`-level complexity) and no slug (referenced only by numeric `id`).
- **`Product.category_id`** — nullable FK to `product_categories.id`, mirrors `Product.vendor_id`
  exactly (same "optional FK to an admin-managed per-vertical entity" shape). Migration
  `9b1e2c4f6a83_add_product_categories.py` mirrors `c6d4e5f3a0b2_add_vendors.py`'s pattern
  (`op.create_table` plain for the new table, `batch_alter_table` for the new FK column on the
  existing `products` table — SQLite needs batch mode for `add_column`+`create_foreign_key`
  together, not for a plain nullable `add_column` alone).
- **`backend/app/routers/product_categories.py`** (new, mirrors `verticals.py`) —
  `validate_category(category_id, vertical, db)` shared helper (400 if not found/inactive/
  vertical-mismatched, imported into `products.py` next to the existing `_validate_vendor`);
  `GET /product-categories?vertical=` (public, active-only); `GET/POST/PATCH
  /admin/product-categories`; `DELETE /admin/product-categories/{id}` is a **soft-deactivate only**
  (`is_active = False`) — matches `Vertical`'s own no-hard-delete choice and `Vendor`'s "delete"
  endpoint, which is *also* secretly a soft toggle under the hood. A deactivated category's
  already-assigned products keep their `category_id` untouched; it just drops out of the active
  public list and the admin dropdown's active options.
- **`POST/PUT /admin/products`** now call `validate_category()` alongside the existing
  `_validate_vendor()` call whenever `category_id` is present in the payload; `selectinload(
  models.Product.category)` added next to every existing `selectinload(models.Product.vendor)` in
  `products.py` (list/get/search/admin-list); `admin_duplicate_product` copies `category_id` too.
- **`PATCH /admin/products/bulk-category`** (new) — body `{product_ids: [...], category_id: int |
  null}`, validates every selected product shares the target category's vertical (400 listing
  offending ids on mismatch), then a single loop + one `db.commit()`. `category_id: null` bulk-
  clears the category from every selected product. Deliberately a dedicated single-purpose
  endpoint rather than reusing `leads.py`'s generic `action`/`value` bulk pattern — `Product` has
  no audit-history field to append to, so the extra indirection wasn't warranted.
- **New admin page `admin/categories/page.tsx`** (new "קטגוריות" nav tab, next to "עולמות") —
  standalone rather than embedded inside the Worlds page, since a category needs a stable numeric
  id (referenced by `Product.category_id` and bulk-assign) the same way `Vendor` needed its own
  page despite also being vertical-scoped. Near-copy of `admin/verticals/page.tsx`'s modal-based
  create/edit + active-toggle table pattern, simplified (single `label` field only, no attribute-
  field builder/icon picker), plus a required world `<select>` that's **locked after creation**
  (same "immutable after creation" rule as `Vertical.slug`/`Vendor.vertical`) — prevents a category
  silently drifting into a different world than the products already assigned to it.
- **`admin/products/page.tsx`** — a category `<select>` sits right below the vendor `<select>` in
  the create/edit form, filtered by `form.vertical` the same way the vendor dropdown is; resets to
  `''` on vertical change alongside `vendor_id`. **Bulk-select** uses the existing
  `useBulkSelection(resetKey)` hook (checkbox column, header select-all — same markup as
  `admin/leads/page.tsx`) plus a small **dedicated** bulk-apply-category bar (category `<select>` +
  "החל קטגוריה" button), shown only while `selectedIds.size > 0`. Deliberately **not** routed
  through the shared `BulkActionToolbar` component — that component is hardcoded to lead
  status/assign actions; forcing a third, structurally different action type through it would have
  meant a bigger, riskier refactor for a one-page need. The bulk dropdown is restricted to
  categories matching the vertical shared by every currently-selected product (a mixed-vertical
  selection shows an explanatory message instead, and the apply button disables) — mirrors the
  backend's own mismatch guard, just surfaced earlier as a UX hint. A "קטגוריה" table column and
  optional `filterCategory` dropdown were added for admin visibility/convenience.
- **`frontend/src/lib/useCategories.ts`** (new) — mirrors `useVerticals.ts`'s module-level
  fetch-once cache, but keyed **per-vertical** (`Map<string, Promise<ProductCategory[]>>`) since a
  category list is meaningless without a vertical scope, unlike the flat global vertical list.
- **`FilterSortSidebar.tsx`** gained `categories`/`category`/`onCategoryChange` props and a
  chip-style filter block (same visual pattern as the existing promotion-type filter), rendered
  **only when `categories.length > 0`** — the mechanism by which a world with zero categories shows
  no category filter UI at all, keeping the feature invisible until an admin actually uses it.
- **`VerticalListingClient.tsx`** — category filtering follows the exact same client-side pattern
  already used for price/search/attribute filters (`GET /products` has no `category_id` query
  param; everything except `vertical` itself is filtered in-memory over the already-fetched
  array). `category` state resets to `null` in the same `useEffect` that already resets
  `attrFilters` on vertical change, so a filter selected in one world never leaks into another.
- **Verified end-to-end** with a real browser session (Playwright, admin/member JWTs minted
  directly via `security.create_access_token` and injected into `localStorage` — the seeded
  passwords don't match the dev DB, same limitation prior sessions hit): created a "טבעות" category
  under diamonds; assigned it to one product via the edit form; bulk-selected 2 more diamonds
  products and bulk-applied the same category (confirmed both product rows updated); confirmed
  selecting 2 cars-vertical products showed the correctly-empty bulk-category dropdown (no
  categories exist for cars); on the storefront, the diamonds world showed a "טבעות" filter chip
  that correctly narrowed the grid from 4 products to the 2 tagged ones ("2 תוצאות"), while the
  cars world (zero categories) rendered no category filter block at all. Zero console errors
  throughout. Backend: `pytest` 43/43 (5 new — create+assign+read-back, cross-vertical mismatch
  rejected on both single-update and bulk-assign, bulk-assign updates all selected products and
  bulk-clear un-assigns them, a deactivated category disappears from the public list while
  already-tagged products keep their `category_id`). Migration applied and downgraded cleanly
  against a scratch SQLite DB. Frontend: `tsc --noEmit` clean; `npm run build` succeeded (new
  `/admin/categories` route built for all 4 locales); `npm run lint` only added instances of
  patterns already present elsewhere in the codebase (verified by isolated-lint diffing against
  `admin/verticals/page.tsx`, which has the identical `useEffect(load, [token])` +
  `(form as any)[...]` language-tab pattern this new page's `admin/categories/page.tsx`
  deliberately mirrors); Vitest 7/7 unaffected. Test category/assignments and dev-server processes
  cleaned up afterward, dev DB confirmed back at baseline (0 `product_categories` rows, every
  product's `category_id` NULL).

---

## Sale Price + Quantity-Discount Bundles + Order Price Snapshotting (session 2026-08-16)

Two pricing features requested for the product tile and cart: a per-product "מחיר מבצע" (sale
price) shown struck-through against the regular price, and admin-defined "מבצעי כמות" (quantity-
discount bundles) — a named group of products where the *combined* quantity of a customer's cart
items drawn from the bundle crosses a tier threshold and every item in the bundle gets that tier's
percentage off. Mid-plan, the user raised a real gap in the original (display-only) design: once an
order is actually placed, it must permanently record what was charged, not keep re-deriving it from
the live `Product` row forever — a later price/sale/bundle edit would otherwise silently rewrite
every past order. That became a third piece, **order price snapshotting**, built the same session.

- **`Product.sale_price`** (`Float`, default `0.0`, migration `71938ad2ba93`) — `0` is the explicit
  "no sale" sentinel. **Only one value is ever stored** — no separate discount-percent column exists
  anywhere in the DB. The admin form's "אחוז הנחה" field is pure UI convenience: typing in either
  the sale-price or percent input recomputes the *other* fresh from `form.price` every keystroke
  (never chained from one derived value to the next), so there's nothing that can drift or race —
  this is the direct answer to the user's explicit "avoid race condition" ask. Validated
  server-side (`_validate_sale_price()`, `routers/products.py`) against the **effective post-update
  state** (`update_data.get("price", product.price)`), not just whatever keys happen to be in a
  given PATCH payload — a PUT that only sends `sale_price` is still checked against the product's
  existing `price`, and vice versa.
- **`QuantityDiscountBundle`/`QuantityDiscountTier`** (new tables, migration `d1def6807a27`) +
  **`Product.quantity_discount_bundle_id`** (nullable FK) — reuses the exact `Vendor.vendor_id`/
  `ProductCategory.category_id`-on-`Product` shape (a product belongs to at most one bundle at a
  time, keeping "which bundle applies" unambiguous) rather than a many-to-many, per the pattern
  CLAUDE.md already flags as the one to copy for a new world-scoped-or-global taggable entity. The
  bundle's own code is a computed property, not a column (`bundle_code` = `f"QD-{id:06d}"`, same
  convention as `Vendor.vendor_code`/`CustomerOrder.order_number`). Multiple tiers per bundle
  (confirmed with the user over a single-tier alternative), validated (`routers/quantity_discounts.
  py`) to be non-empty, have unique `min_quantity` values, and have **non-decreasing
  `discount_percent` as `min_quantity` increases** — rejects a "buy more, pay a higher rate"
  misconfiguration. New `PATCH /admin/products/bulk-quantity-discount` mirrors the existing
  `bulk-category` endpoint exactly (no vertical-mismatch check needed — bundles aren't
  vertical-scoped, unlike categories).
- **Order price snapshotting**: three new nullable `Lead` columns (migration `671716ab86a4`) —
  `unit_price_snapshot`, `list_price_snapshot`, `quantity_discount_percent_snapshot` — populated
  only for `contact_request` leads (`NULL` elsewhere, same "type-specific optional column on the
  shared `Lead` row" precedent as `shipping_address`/`subject`/`message`). One shared function,
  **`services/pricing.py`'s `compute_effective_unit_price()`**, is the single server-side source of
  truth: base price = `sale_price` if set else `price`; the quantity-discount tier applies **on top
  of** that (stacks multiplicatively — a deliberate choice, documented at the call site). Called
  from `leads.py`'s `cart_checkout()`, which groups the checkout's own items by
  `quantity_discount_bundle_id` and sums quantities per bundle **within that one call only** — two
  separate single-item "contact me now" checkouts don't combine, matching how quantity deals
  conventionally require being in the same order. The client **never supplies a price** —
  `CartCheckoutItem` is unchanged (`{product_id, quantity}`); the server independently derives the
  snapshot from the authoritative `Product`/bundle rows at that instant. Verified live against a
  real running server (not just the pytest in-memory suite): checked out a sale-priced product
  crossing a bundle tier, confirmed the snapshot reflected both discounts stacked correctly, then
  changed the product's price/sale_price afterward and confirmed `GET /users/me/orders` still
  returned the original, unchanged snapshot — the actual scenario the user raised, proven working.
- **Frontend**: `ProductTile.tsx`/`ProductDetailClient.tsx` show the struck-through regular price +
  sale price + a "‑X%" badge, and a `QuantityDiscountNote` (exported from `ProductTile.tsx`, shared
  by both) reading "קנה {lowest tier's min}+ וחסוך עד {highest tier's %}" whenever a product carries
  an active bundle. New admin page `admin/quantity-discounts/page.tsx` (nav tab "מבצעי כמות") with a
  repeatable tier-row builder, mirroring the existing `attribute_fields` builder pattern from
  `admin/verticals/page.tsx`. `admin/products/page.tsx` gained the two-way sale-price/percent inputs,
  a bundle `<select>`, and a second bulk-apply bar (reusing `useBulkSelection`) alongside the
  existing bulk-category one. **`frontend/src/lib/pricing.ts`** is a TypeScript port of the exact
  same formula as `services/pricing.py`, used only for `cart/page.tsx`'s **pre-checkout preview**
  (struck-through subtotal + "חיסכון" savings line, plus a per-item "✓ מבצע כמות הופעל" /
  "עוד N יח' ותקבלו הנחה" hint) — the post-checkout success screen and `admin/orders`/profile's
  "מעקב הזמנות" instead render the real numbers returned by `POST /leads/cart-checkout`/
  `GET /users/me/orders`, never the client's own estimate, so what's displayed is guaranteed to
  match what got persisted.
- **Verified end-to-end**: backend `pytest` 58/58 (13 new — sale-price validation including the
  effective-post-update-state case, bundle CRUD + tier-ordering validation, bulk assign/clear, a
  deactivated bundle disappearing from `ProductRead` while the FK is preserved, and the full
  checkout-snapshotting scenario including the immutability-after-price-change case); all 3
  migrations applied and downgraded cleanly against a scratch SQLite DB; `tsc --noEmit` and
  `npm run build` both clean (new `/admin/quantity-discounts` route built for all 4 locales);
  `npm run lint` 0 errors (40 warnings, all pre-existing patterns, e.g. the same missing-`load`-
  dependency warning already present on every other admin page). Real browser session (Playwright,
  admin/member JWTs minted via a live signup+DB-role-promote, not the seeded dev accounts) against
  a live `uvicorn`+`next dev` pair confirmed: the storefront tile renders the strikethrough+badge
  for a real sale-priced product and the quantity-discount note on bundle-tagged products; the admin
  products table shows the same strikethrough+badge; the admin edit form's discount-percent input
  live-recomputes the sale-price input (typed `50` against a ₪2,000 base → sale price field updated
  to `1,000` with no page reload); the new admin quantity-discounts page lists a real bundle with
  its tiers and product count. Test data and dev-server processes cleaned up afterward.

---

## Product Delete Fix + Home Page Layout + CSV Import Extension + E2E Coverage (session 2026-08-16)

Follow-up bug-fix/hardening pass after the sale-price/quantity-discount session above.

- **Admin "delete product" now actually deletes.** `DELETE /admin/products/{id}` (`routers/
  products.py`) used to just set `is_active = False` — identical to the separate status-pill
  toggle already on that page, so the trash-can-with-confirm control silently did nothing extra
  despite promising permanent deletion. Checked every `ForeignKey("products.id")` in `models.py`
  first: an unconditional hard delete isn't safe (Postgres would reject it outright for a product
  ever entered into a promotion or survey, since those FKs have no `ondelete=`). Fixed with a
  **conditional real delete**: removes the row for real when nothing historical
  (`Lead`/`PromotionEntry`/`SurveyOption`/`Distribution`/`SaleTransaction`) references it,
  explicitly cleaning up `Favorite` rows (no ORM relationship declared on the `Product` side, so
  neither the ORM cascade nor SQLite's inert `ondelete="CASCADE"` — never enforced, no `PRAGMA
  foreign_keys=ON` anywhere — would catch it), and returns a clear 409 otherwise, leaving the
  product completely untouched (not silently hidden as a fallback). `Review` rows and
  `product_promotions` association rows are cleaned up automatically (verified live with a
  dedicated test, not just assumed — `Product.reviews` has `cascade="all, delete-orphan"`, and
  SQLAlchemy auto-manages `secondary=` association-table rows on delete of either side; the
  `Promotion` itself correctly survives, only the membership row and the product go). Frontend
  (`admin/products/page.tsx`) branches on the real outcome: 200 removes the row from local state
  with an honest "נמחק לצמיתות" toast; 409 shows the backend's explanation and leaves the row in
  place. Also found and fixed a real stale-selection bug while reviewing this: deleting a
  checkbox-selected row didn't clear it from `useBulkSelection`'s `selectedIds`, so a "N נבחרו"
  bulk-action count could keep counting a row no longer in the table.
- **A related, independently-found bug**: the product edit form's submit payload hardcoded
  `is_active: true` unconditionally (shared between the create and edit branches), so editing
  *any* field of a hidden product — fixing a typo, adjusting price, anything — silently
  re-published it. Confirmed live (hide → edit unrelated field → `is_active` flips back to `true`
  with no indication anything changed). Fixed by carrying the product's actual current `is_active`
  into the form on open (`openEditForm`) and submitting that instead of a literal `true`; new
  products still default to active via `EMPTY_FORM`.
- **Home page world tiles are 2-per-row on desktop.** `(protected)/page.tsx`'s tile container had
  `flex flex-col gap-8` with zero responsive variants, so every tile stretched to the full
  `max-w-5xl` (1024px) content width at every screen size — fine on mobile, oversized on desktop.
  Changed to `grid grid-cols-1 sm:grid-cols-2 gap-8`, the same 1→2-column pattern already used
  elsewhere in this codebase (`register/page.tsx`, `admin/loyalty/page.tsx`) — `VerticalTile.tsx`
  itself needed no changes, since it has no fixed width and already scales its padding/icon/text
  responsively. Verified via real screenshots at 1280px (2-per-row, normal size) and 390px
  (unchanged single column).
- **CSV product import/export gained the newer fields**: `sale_price`, `vendor_id`, `category_id`,
  `quantity_discount_bundle_id` — all optional, by numeric ID (matching how the admin form already
  stores/sends these as bare integers, no fuzzy name-matching). `admin_import_csv` reuses the exact
  same validation helpers as the single-product endpoints (`_validate_sale_price`, `_validate_vendor`,
  `validate_category`, `validate_quantity_discount_bundle`) rather than duplicating the rules,
  wrapped to fit the existing per-row "collect errors, skip the row, keep going" pattern instead of
  aborting the whole batch on one bad row. A malformed numeric cell (e.g. non-numeric `vendor_id`)
  is now also caught and skipped per-row — previously would have thrown an unhandled `ValueError`
  and 500'd the entire import. `exportCsv()` (`admin/products/page.tsx`) and the CSV-modal help text
  were updated to match, keeping export/import column-symmetric as CLAUDE.md's own convention notes.
- **New E2E spec `frontend/e2e/product-pricing.spec.ts`** (3 tests): storefront tile strikethrough +
  discount badge for a seeded sale-price product; a quantity-discount bundle created and assigned
  via the API, checked out through the real cart UI, and its stacked-discount math (sale price ×
  tier percent) confirmed to survive into `/profile#my-orders` — proving the discount was actually
  persisted server-side, not just a client preview; and the admin delete flow both ways (real
  delete for an unused product, blocked-with-explanation for one with real order history, product
  untouched). `backend/scripts/seed_e2e.py` gained one new stable seeded product (price 2000,
  sale_price 1500) for the first test; the bundle in the second test is a throwaway per-run fixture
  created by the test itself (matching `admin-bulk-actions.spec.ts`'s existing precedent for
  single-spec-owned fixtures), unassigned again at the end so it doesn't linger discounting the two
  shared seeded products for any spec running after it.
- **Found and fixed an unrelated, pre-existing E2E drift while running the full suite**: `auth.
  spec.ts`'s lockout assertion checked for the English string `'Too many failed login attempts'`,
  but the "Live Countdown in the Lockout Message" session (see above) had replaced that static
  423 `detail` text with a live, Hebrew-localized `<LockoutCountdown>` component weeks earlier —
  the spec was never updated to match and had been silently broken since. Not caused by this
  session's changes (confirmed: nothing here touches auth/lockout code), just never caught because
  the full E2E suite hadn't been run end-to-end since that countdown session shipped. Fixed the
  assertion to check the actual Hebrew string.
- **A verification false-start worth recording**: an earlier explore pass (this session's own
  agent output) claimed `adminListVendors`/`adminListProductCategories` (`lib/api.ts`) built their
  fetch URLs with literal backslashes (`` `${BASE_URL}\admin\vendors` ``) instead of forward
  slashes — which would be a real, severe bug (`\v` is a genuine JS escape sequence, vertical tab,
  so `\vendors` would silently mangle into a control character). Investigated with a live network
  capture (Playwright) before reporting it, found the actual request hit the correct URL, then
  resolved the contradiction with a raw `od -c` byte dump of the file — the source has always had
  real forward slashes; the backslash claim was a transcription artifact somewhere in how the
  content had been relayed, not a bug in the file. **Lesson for future sessions**: don't trust an
  agent's (or your own) quoted "verbatim" code snippet for a claim this specific without checking
  the raw bytes directly first, especially when a live behavioral test already contradicts it —
  trust the live result over the quoted text.
- **Verified end-to-end**: backend `pytest` 69/69 (4 new CSV-import tests: new columns round-trip
  correctly, an invalid `sale_price` row is skipped while other rows still import, a nonexistent
  `vendor_id` row is skipped with a clear error, a non-numeric id column is skipped instead of
  crashing the batch); `tsc --noEmit`, `npm run lint` (0 errors, same 40 pre-existing warnings),
  and `npm run build` all clean; full Playwright E2E suite green (9/9, all specs including the
  3 new ones and the fixed `auth.spec.ts`), run twice against a freshly-seeded DB each time
  (CLAUDE.md's own documented rule — `auth.spec.ts` locks an account for 15 real minutes, so a
  reused DB changes the spec's starting state and was confirmed live to cause a spurious failure
  on the first, accidental reused-DB run). Dev DB/E2E DB and server processes cleaned up
  afterward.

---

## Polls/Surveys: Fixed Broken Share Links + Text-Answer Polls + Admin-Set Images (session 2026-08-17)

Three real gaps in the polls/surveys feature: shared poll links 404'd, every poll had to compare
real products (no plain "which answer do you agree with" poll existed), and there was no way for
an admin to set a poll image at all — the only image that ever appeared anywhere was the campaign
email silently inheriting the first option's *product* photo.

- **Root cause of the 404, and the fix**: `survey/[id]/page.tsx` was a build-time-static dynamic
  route (`generateStaticParams()` calling `getAllSurveysStatic()`) — the exact same class of bug
  already diagnosed and fixed for products/worlds (see "Query-param routes" in Key Design
  Decisions below), just never applied to surveys. A survey created after the last GitHub Pages
  build had no static HTML file to serve. Fixed the same way: the old dynamic route was deleted
  outright (no parallel route kept) and replaced with a top-level, query-param page —
  **`frontend/src/app/[locale]/survey/page.tsx`** + **`components/SurveyQueryPage.tsx`**, mirroring
  `products/page.tsx`/`ProductQueryPage.tsx` exactly (`generateStaticParams` from `lib/locales.ts`,
  a `<Suspense>`-wrapped `useSearchParams()` read, canonical/hreflang metadata). The now-dead
  `getAllSurveysStatic()`/`FALLBACK_SURVEY_IDS` in `lib/api.ts` (which existed solely to feed the
  old dynamic route's `generateStaticParams`) were deleted, not left as unused code.
- **The poll page is now public-viewable; only voting is login-gated** — a deliberate, explicitly
  confirmed UX decision, and a **different** pattern from the existing product-sharing precedent
  (Public Product-Sharing session): rather than gating the contact/schedule button's *first click*
  (as `ProductActionButtons.tsx` does via `requireLogin`), a poll lets a logged-out visitor pick an
  option freely, and only requires login at the moment they click vote. **`SurveyCard.tsx`** now
  accepts `token: string | null` (was `string`) and, on a logged-out vote attempt, persists the
  selection to `localStorage['tivuta_pending_vote_' + survey.id]` before calling the existing
  `requireLogin()` helper to redirect to `/login?redirect=...`. A mount effect (guarded by a ref
  against React's dev-mode double-invoke) checks for a pending vote once `token` becomes truthy and
  auto-submits it via the existing `voteSurvey()`, showing a one-time "🎉 thanks for voting"
  transition (`justVoted` state + the existing `.animate-fade-in` utility — no new library) before
  settling into the normal quiet results view a plain revisit shows. `SurveyVoteClient.tsx`'s old
  `{token && <SurveyCard .../>}` guard was removed — the card (and the poll image) render for
  everyone; the vote button itself is what's gated, exactly as confirmed with the user.
- **Second poll type: `Survey.poll_type` (`"product"` | `"text"`, default `"product"`, immutable
  after creation — same convention as `Vertical.slug`/`Vendor.vertical`)**. `SurveyOption.product_id`
  is now nullable; a `"text"` poll's options carry only `label_override_he` (the same field that
  already existed as an optional product-title override now does double duty as the actual answer
  text — no new column needed). `schemas.SurveyCreate` gained a `@model_validator` enforcing
  at-least-2-options and the right shape per `poll_type` (closing a pre-existing gap: the server
  never actually enforced "≥2 options," only the admin form's `disabled` attribute did).
  `admin/surveys/page.tsx` gained a poll-type toggle in the create form; when `"text"`, the product
  checkbox list is replaced by a repeatable free-text option-row builder (same add/remove-row
  pattern as `admin/verticals/page.tsx`'s attribute-field builder).
- **Admin-settable poll image, `Survey.image_url`** — reuses the existing generic
  `POST /admin/upload-image` endpoint (no new backend upload endpoint needed), same
  upload-button-with-preview UI already used on `admin/products/page.tsx`. New
  **`backend/app/services/surveys.py`**'s `resolve_survey_image_url()` is the single shared
  fallback rule (admin's `image_url` if set, else the first option's product photo, else nothing) —
  used by both the campaign-email builder and the new share/unfurl page below, so the two can't
  silently drift on what image a poll "has."
- **New `GET /share/surveys/{id}`** (`backend/app/routers/share.py`), a near-verbatim copy of the
  existing `share_product` — confirmed with the user as the preferred fix over showing the image
  only after the page opens. Reuses the same `_redirect_page`/`_resolve_image_url` helpers (no
  `main.py` CSP change needed — `/share/` is already exempted from the blanket CSP). The shared
  `_TEXT` redirect copy ("מעביר אותך למוצר..." / "Taking you to the product...") was generalized to
  drop the product-specific wording ("מעביר אותך הלאה..." / "Taking you there...") now that the same
  page serves two resource types.
- **`frontend/src/lib/share.ts`** gained `buildSurveyShareUrl()` alongside the existing
  `buildProductShareUrl()` (both now build off one `SHARE_BASE_URL` root constant). Every place that
  used to hardcode a raw `https://tivuta.co.il/he/survey/{id}` link — `distributions.py`'s campaign
  email (both the live send and the admin preview endpoint), and `admin/distribution/page.tsx`'s
  WhatsApp text builder + on-screen link preview — now goes through this one function, so a shared
  poll link correctly unfurls with the real image/title wherever it's forwarded, not just when the
  email client itself renders the inline image. `admin/surveys/page.tsx` also gained a per-survey
  "העתק קישור" (copy link) button using the same helper, the natural place to grab a working link
  without going through a distribution campaign at all.
- **Found and fixed a real, unrelated latent bug while touching the email image code**: the
  pre-existing `f"{APP_BASE_URL}/images/products/{p.image_url}"` construction (both in the survey
  email and `_build_deal_email`) never checked whether `image_url` was already a full Supabase URL
  — on production (Supabase image storage, the documented deployment default) the campaign email's
  inline image has been broken this whole time. Fixed via a small `_absolute_image_url()` helper in
  `distributions.py` (same http(s)-prefix check `share.py`'s `_resolve_image_url` already does),
  applied to both call sites.
- **Migration** (`a2f4c8e19d3b_add_survey_poll_types_and_image.py`) adds `surveys.poll_type`
  (`server_default='product'`) and `surveys.image_url`, and relaxes `survey_options.product_id` to
  nullable via `batch_alter_table` (SQLite). No backfill needed — every pre-existing survey already
  has `poll_type="product"` by default and every option already has `product_id` set.
- **Verified end-to-end**: migration applied/downgraded/re-applied cleanly against a scratch SQLite
  DB; backend `pytest` 83/83 (16 new — product/text poll creation, per-type option-shape rejection,
  minimum-2-options rejection, anonymous read, vote flow, `image_url` update, and 3 new
  `/share/surveys/{id}` tests covering a custom image, the product-photo fallback, and a
  nonexistent survey); `tsc --noEmit`, `npm run lint` (0 errors, 39 warnings — one fewer than the
  prior 40-warning baseline, since the deleted `getAllSurveysStatic()` also removed one of the
  pre-existing unused-`catch`-variable warnings), and `npm run build` all clean (`/survey` route
  confirmed built for all 4 locales, `/survey/[id]` confirmed gone). Hit the documented stale-Next-
  cache gotcha immediately after deleting the old route (`tsc` failed on a phantom reference to the
  deleted `survey/[id]/page.tsx` until `frontend/.next` was removed) — same known fix as prior
  sessions, not a new bug.

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
- **Order numbers are computed, not stored**: `CustomerOrder.order_number` is a Python `@property` (`f"ORD-{self.id:06d}"`), derived from the auto-increment `id` at read time rather than written on insert — avoids the flush-then-update-then-commit dance a stored, id-derived column would need.
- **Printable documents are Blob URLs opened in a new tab, not a route or a backend template**: `printDocument.ts`'s `openPrintableTable()` builds the HTML string client-side from data the page already has and opens it via `URL.createObjectURL` — consistent with the static-export constraint above (a dynamically generated printable page genuinely cannot be a build-time route) and avoiding a second HTML-templating system alongside the existing email-body builders in `services/`.
- **Procurement claiming reuses the settlement-period atomic-update pattern verbatim**: `VendorPurchaseBatch`'s claim (`vendors.py`, Phase 2) is the same "flush for id, then single `UPDATE ... WHERE ... IS NULL`" shape as `CommissionSettlementPeriod`'s claim — proven correct under double-submit once already, no reason to invent a second way to safely claim a batch of rows.
- **One code path creates product orders**: both "add to cart" and single-product "contact me now" call `POST /leads/cart-checkout` (the latter with a one-item array) rather than each having its own creation logic — `POST /leads` now rejects a plain contact request outright, forcing every product-order to go through the same quantity/order-number logic instead of two implementations that could drift.
- **Query-param routes for anything that can't be known at build time**: `output: 'export'` requires `generateStaticParams` to enumerate every value of a dynamic route segment at build time — infeasible for a live database whose rows (products, worlds, surveys) can change between deploys. The fix used three times now: a single fixed static page reads an identifier from a query string (`?id=` for `/products`, `?slug=` for `/world`, `?id=` for `/survey`) via `useSearchParams()` and fetches/renders entirely client-side at runtime, so a brand-new row needs zero rebuild. There is deliberately no parallel per-item dynamic route (`/products/[id]`, `/[vertical]`, `/survey/[id]`) kept alongside these — pre-launch, with no real external links to preserve, one canonical URL per resource beats carrying a second scheme "just in case." A dynamic route that skips this pattern is a live bug, not a stylistic choice: the surveys session found `/survey/[id]` had been silently 404ing for every survey created since the last GitHub Pages build.
- **View count fire-and-forget**: `POST /products/{id}/view` is called with `fetch().catch(() => {})` — no auth, no await. A failed view-count increment should never block the user.
- **Distribution segmentation mix**: `filter_city` uses a SQL WHERE clause (efficient); `filter_membership_track` uses Python in-memory filtering since `membership_tracks` is a JSON array column (not indexable with simple SQL). Trade-off accepted: segment sizes are small.
- **Email preview in iframe**: HTML is rendered in a sandboxed `<iframe srcdoc>` in the admin preview modal. `sandbox="allow-same-origin"` prevents script execution while allowing CSS rendering.
- **Product image storage is pluggable (`services/image_storage.py`), same factory pattern as `get_email_sender()`**: `get_image_storage()` reads `IMAGE_STORAGE_PROVIDER` (`local` default, `supabase` in prod). `LocalDiskImageStorage` is the original dev-only behavior — writes to `IMAGES_DIR` (default `frontend/public/images/products/`), served by FastAPI's `/images/products/` StaticFiles mount, returns just the filename. **This was found to silently lose every uploaded image in production** (discovered 2026-07-21: every product's image 404'd on the live Render backend) — Render's filesystem is ephemeral and is wiped on every deploy, so any image uploaded through the admin only survives until the next `git push`. `SupabaseImageStorage` (prod) uploads via the Supabase Storage REST API (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` — default `product-images`, must be a **public** bucket) and returns the full public URL, which is stored directly in `Product.image_url` instead of a bare filename. Frontend's `productImageUrl()` (`api.ts`) handles both shapes: a `http(s)://`-prefixed value (Supabase) is returned as-is; anything else falls back to `${NEXT_PUBLIC_API_URL}/images/products/${filename}` (local dev). **Setup required in each environment before this works**: create a public `product-images` bucket in the Supabase dashboard (Storage → New bucket → toggle Public — free tier: 1GB storage / 2GB egress/month), then set `IMAGE_STORAGE_PROVIDER=supabase` + `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API → service_role key, keep secret) on Render. All product images uploaded before this fix are unrecoverable (never existed anywhere but the wiped local disk) and must be re-uploaded once the bucket is live.
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
- **Naive-UTC timestamps are safe to display as-is, but never safe to compare against `Date.now()` without converting first**: this codebase stores/serializes datetimes as naive UTC everywhere (no timezone offset in the ISO string — same convention `confirmed_at`'s timezone-naive `datetime-local` admin inputs already rely on). That's fine for *display*. But JS's `Date` parses a date-*time* string with no timezone designator as **local time**, not UTC — a real bug this way was found and fixed in `isLocked()` (`admin/users/page.tsx`, Per-Account Login Lockout session): comparing a naive `locked_until` string directly against `Date.now()` silently mis-evaluated lock state depending on the browser's local timezone offset. The same bug was independently found a second and third time (the Live Countdown session) in two separate hand-rolled `useCountdown` implementations (`ProductTile.tsx`'s flash-sale timer, `ProductDetailClient.tsx`'s raffle timer) — both silently mis-displayed remaining time by the browser's UTC offset. **`frontend/src/lib/useCountdown.ts` is now the one shared, `Z`-safe countdown hook** — any future countdown/remaining-time UI should use it rather than writing a fourth copy of this same bug.
- **Per-account lockout is a separate, stacking layer from per-IP rate limiting, not a replacement**: `slowapi`'s `5/minute` per-IP limit (Backend Security Hardening session) and the DB-column-based per-account lockout (Per-Account Login Lockout session) both guard `/auth/login`/`/vendor-auth/login` simultaneously — the first throttles bursts from one IP regardless of account, the second locks one specific account regardless of IP. Both defaulting to the same threshold (5) is coincidental, not a shared setting; they're tuned independently (`SystemSetting` for lockout, in-code decorator args for rate limiting).
- **An explicit lockout message is an acceptable, deliberate email-enumeration trade-off**: HTTP 423 with a specific "too many attempts" message is distinguishable from a generic wrong-password 401, which could in principle confirm an email is registered. Accepted because `POST /auth/signup` already discloses this via "Email already registered" on a duplicate — a cheaper, faster oracle than anything the lockout message adds. Don't use this same reasoning to justify *new* enumeration surfaces elsewhere without re-checking whether an equivalent cheaper leak already exists there too.
- **A lead's `customer_order_id` is the switch between two admin tabs, not just a nullable FK**: `NULL` means "surface in `/admin/leads`" (today, exclusively `general_inquiry`), non-`NULL` means "surface in `/admin/orders`." Any future new `lead_type` needs a deliberate choice of which tab it belongs in, not just a schema addition — get it wrong and the lead either vanishes from both tabs or double-counts logic that assumes one or the other.
- **Customer-submitted free text and admin-authored free text are never the same column, even when both are just strings**: `Lead.subject`/`Lead.message` (customer's original inquiry) are kept separate from `Lead.notes` (admin's follow-up remarks, overwritten via `PATCH /admin/leads/{id}/notes` with no audit trail on overwrite) for the same reason `shipping_address` was already kept separate from `notes` for `card_order` leads — an admin's edit to "their" field should never be able to silently destroy the customer's original words.
- **jsPDF's `setR2L(true)` only handles RTL reversal correctly for strings that actually contain a Hebrew character** — a table cell or line mixing Hebrew and Latin/digits (a product name with an embedded "PDF") is fine on its own once `setR2L(true)` is active, but a *purely* Latin/digit string (an order number, a phone number) gets blindly reversed character-by-character with no Hebrew-detection safety net. `printDocument.ts`'s `fixRtlCell()` pre-reverses any Hebrew-free table cell before it reaches `jspdf-autotable` so the library's own reversal cancels back out; direct `doc.text()` calls (the title/timestamp lines) instead toggle `setR2L(false)` off just long enough to draw a pure-Latin/digit value, then restore it to `true`. Any future PDF export in this codebase mixing Hebrew and Latin/digit content needs one of these two techniques, not a fresh assumption that `setR2L(true)` "just works."
- **A world-scoped lookup entity that products get tagged with reuses the `Vendor.vendor_id`-on-`Product` shape, not a new pattern**: `ProductCategory`/`Product.category_id` is a nullable FK + a dropdown filtered by `form.vertical`, validated cross-vertical at both single-update and bulk-assign time — the same shape as `Vendor`. Any *future* "admin-managed, world-scoped, taggable-on-products" entity should copy this pair (`Vertical`→`Vendor`/`ProductCategory`→`Product`), not invent a fourth variant.
- **A lookup entity's public-facing filter UI should render conditionally on having any rows, not unconditionally with an empty state**: `FilterSortSidebar`'s category chip block only renders `if (categories.length > 0)` — a world with zero categories shows no filter section at all, rather than an empty "Category: [All]" block. This is what makes a not-yet-configured admin feature genuinely invisible instead of a confusing dead control, and is the same instinct behind promotions only showing a badge `if (promotions.length > 0)` on a product tile.
- **Two fields that must always agree shouldn't both be stored — store one, derive the other**: `Product.sale_price` is the only persisted pricing field; the admin form's discount-percent input is pure UI convenience, recomputed fresh from `price` on every keystroke rather than chained from the other field's previous derived value. This is what makes a two-way-synced pair of inputs race-free by construction instead of needing reconciliation logic — prefer this shape over a stored, mutually-derived pair whenever one field is always mechanically computable from the other.
- **An order must snapshot its price at checkout time, not keep re-deriving it from the live row forever**: `Lead.unit_price_snapshot`/`list_price_snapshot`/`quantity_discount_percent_snapshot` are computed once by `services/pricing.py`'s `compute_effective_unit_price()` at `cart_checkout()` time and never touched again — the same principle as `SaleTransaction.commission_rate_percent_snapshot`. A later price edit, a sale ending, or a bundle being deactivated must never silently rewrite what an already-placed order shows; verified live that changing a product's price after checkout left the stored order snapshot untouched. Any future "what did this cost" field on an order-like row should snapshot at write time, not join to a live, mutable source.

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
