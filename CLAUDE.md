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
│   │   │   ├── users.py         User CRUD, role management
│   │   │   ├── catalog.py       Legacy benefits: categories, items, trending
│   │   │   ├── products.py      Multi-vertical product CRUD + listing with promotions
│   │   │   ├── promotions.py    Promotion CRUD + product assignment
│   │   │   ├── leads.py         Appointment / contact-request tracking
│   │   │   ├── surveys.py       Poll creation, voting, admin
│   │   │   └── distributions.py Email/WhatsApp campaign creation & sending
│   │   └── services/
│   │       ├── email_resend.py    Resend.com email provider
│   │       ├── whatsapp_meta.py   Meta WhatsApp Business API
│   │       └── notifications.py   Generic dispatcher
│   ├── alembic/           Migrations (Alembic)
│   │   └── versions/
│   │       ├── 1fcde320168b_initial_schema.py   All base tables
│   │       └── d71018332029_add_promotions_tables.py  promotions + product_promotions
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
    │   │           ├── page.tsx         Home/dashboard
    │   │           ├── diamonds/        Vertical listing
    │   │           ├── cars/
    │   │           ├── insurance/
    │   │           ├── survey/[id]/     Survey voting
    │   │           └── admin/
    │   │               ├── layout.tsx   Nav tabs (Products, Users, Surveys, Distribution, Promotions)
    │   │               ├── products/    Product CRUD
    │   │               ├── users/       User + role management
    │   │               ├── surveys/     Survey creation + vote stats
    │   │               ├── distribution/ Email/WhatsApp campaigns
    │   │               └── promotions/  Promotion CRUD + product assignment
    │   ├── components/
    │   │   ├── ProductTile.tsx          Product card (shows promotion badge if active)
    │   │   ├── VerticalListingClient.tsx Product grid with sort sidebar
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
| `leads` | Appointment requests and contact requests from product pages |
| `surveys` | Polls shown to users |
| `survey_options` | Options within a survey (each links to a product) |
| `survey_votes` | One vote per user per survey |
| `distributions` | Broadcast campaigns (survey or daily_deal); channels: email, whatsapp |
| `distribution_send_logs` | Per-user send status for each campaign |

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

## Key Design Decisions

- **Products vs Items**: `items` table = legacy benefits club catalog. `products` table = new multi-vertical site (diamonds/cars/insurance). They are intentionally separate.
- **Soft deletes**: `is_active = False` instead of hard deletes, everywhere.
- **Multilingual**: All user-facing text has 4 language variants in the DB. Admin UI is Hebrew-only.
- **Static export constraint**: `output: 'export'` means no server-side rendering, no API routes, no dynamic server features. All data fetching is client-side after hydration.
- **Promotions JSON config**: Chosen over fixed columns for flexibility — new promotion types require zero schema changes.
- **Many-to-many via Table object**: `product_promotions_table` is defined as a SQLAlchemy `Table` (not a mapped class) to enable clean `secondary=` relationships on both `Product` and `Promotion`. Direct junction row management uses `promotion.products.append/remove`.
