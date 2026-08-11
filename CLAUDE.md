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
│   │       └── 50da6b936e9b_add_vendor_specialty_contact_fields.py  ← newest (head)
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
| `users` | Auth accounts; `role`: `member` \| `admin` |
| `categories` | Top-level benefits categories (slug-based routing) |
| `sub_categories` | Nested under categories |
| `items` | Legacy benefits catalog (linked to sub_categories) |
| `orders` | Legacy user transaction history for dashboard (`GET /orders/me`) — **unrelated to and predates** the `customer_orders` table below; do not confuse the two |
| `verticals` | Admin-managed "worlds" (diamonds/cars/insurance by default); `Product.vertical`/`Vendor.vertical` store its `slug` |
| `products` | Multi-vertical catalog; has `attributes JSON` for vertical-specific fields (schema defined per-vertical in `verticals.attribute_fields`) |
| `promotions` | Promotion definitions: type, channel, config JSON, dates |
| `product_promotions` | Junction table linking products ↔ promotions (many-to-many) |
| `customer_orders` | One row per checkout/appointment/card-order — the customer-facing order; `order_number` is computed from `id` (`ORD-{id:06d}`), not stored (see "Back-Office Orders" below) |
| `leads` | Line items within a `customer_order` (appointment/contact-request/club-signup/card-order); `assigned_to FK→users.id` for admin assignment; `customer_order_id FK→customer_orders.id`; `quantity`/`cart_group_id` populated when created via cart checkout (see "Back-Office Orders" below) |
| `surveys` | Polls shown to users |
| `survey_options` | Options within a survey (each links to a product) |
| `survey_votes` | One vote per user per survey |
| `distributions` | Broadcast campaigns (survey or daily_deal); channels: email, whatsapp |
| `distribution_send_logs` | Per-user send status for each campaign |
| `favorites` | User wishlist; `UniqueConstraint(user_id, product_id)`; CASCADE deletes |
| `notifications` | In-app notifications per user; `type`: `lead_status` \| `appointment_reminder` \| `system` \| `followup` \| `points_earned`; `is_read`, `link` fields |
| `reviews` | Product rating (1–5) + comment; `UniqueConstraint(user_id, product_id)` — upsert semantics |
| `vendors` | Physical store/supplier per vertical; products optionally belong to one via `Product.vendor_id`; also carries loyalty-program fields (see below); `vendor_code` is a computed property (`{id:03d}`), not a column; `specialty`/`contact_phone`/`contact_email` are separate from `login_email` (portal auth) |
| `system_settings` | Flat key/value config (e.g. `point_value_ils`) — see Loyalty Program section |
| `sale_transactions` | Ledger of in-store sales reported for a vendor+customer(+product); drives points + commission |
| `points_ledger_entries` | Append-only per-user points history (accrual/redemption/adjustment/clawback) |
| `commission_settlement_periods` | Admin-driven periodic reconciliation of vendor commission owed |
| `vendor_purchase_batches` | Consolidates `Lead` line items from many different `customer_orders` that share a vendor into one procurement action; `batch_number` computed from `id`, not stored (see "Back-Office Orders Phase 2") |

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
  "contact us" inquiry (which doesn't exist anywhere in the code yet — confirmed by search, and
  `club_signup` is a documented `lead_type` that's never actually created) belongs in the
  now-mostly-empty "פניות" tab going forward.
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
  visible from the repo, so this is a known, documented limitation rather than a verified non-issue.
  A Redis-backed limiter would fix it but was judged unnecessary complexity/cost for a
  single-instance pre-launch app.
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
  `allow_headers=["*"]` — not part of what was flagged, left untouched).

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
  option), not bundled into this SEO work.
- **Not done, and explicitly out of scope for this session** (found in the same audit, kept as a
  backlog item): zero automated tests, no rate limiting on `/auth/login`/password-reset, no
  CSP/HSTS/X-Frame-Options headers, no error monitoring (Sentry or similar), no lint/test step in
  the GitHub Actions CI workflow. None of these affect search ranking, which is why they were left
  out of this pass — worth a dedicated future session.

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
- **Query-param routes for anything that can't be known at build time**: `output: 'export'` requires `generateStaticParams` to enumerate every value of a dynamic route segment at build time — infeasible for a live database whose rows (products, worlds) can change between deploys. The fix used twice now: a single fixed static page reads an identifier from a query string (`?id=` for `/products`, `?slug=` for `/world`) via `useSearchParams()` and fetches/renders entirely client-side at runtime, so a brand-new row needs zero rebuild. There is deliberately no parallel per-item dynamic route (`/products/[id]`, `/[vertical]`) kept alongside these — pre-launch, with no real external links to preserve, one canonical URL per resource beats carrying a second scheme "just in case."
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
