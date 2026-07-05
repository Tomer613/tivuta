# Product Management Workflow

How to organize product data on your computer and upload it to Tivuta.

---

## Folder Structure (on your computer)

Keep one folder per vertical, each containing a CSV file and an images subfolder:

```
products/
├── diamonds/
│   ├── products.csv
│   └── images/
│       ├── D001.jpg
│       └── D002.jpg
├── cars/
│   ├── products.csv
│   └── images/
│       ├── C001.jpg
│       └── C002.jpg
└── insurance/
    ├── products.csv
    └── images/
        ├── I001.jpg
        └── I002.jpg
```

---

## Image Naming Convention

Name each image file after the product's SKU:

```
{SKU}.jpg
```

Examples: `D001.jpg`, `C045.jpg`, `I012.jpg`

The SKU is used as the `image_url` value in the database (filename only, no path).

---

## CSV Column Reference

Edit `products.csv` in Excel or Google Sheets. Each row is one product.

| Column | Required | Notes |
|---|---|---|
| `sku` | Yes | Your internal product code (e.g. `D001`) — not stored in DB, used only for image matching |
| `vertical` | Yes | `diamonds`, `cars`, or `insurance` |
| `title_he` | Yes | Hebrew title (primary language) |
| `title_en` | No | English title |
| `title_fr` | No | French title |
| `title_yi` | No | Yiddish title |
| `description_he` | Yes | Hebrew description |
| `description_en` | No | English description |
| `description_fr` | No | French description |
| `description_yi` | No | Yiddish description |
| `price` | No | Numeric price in ILS (e.g. `45000`) |
| `image` | No | Filename only (e.g. `D001.jpg`) → maps to `image_url` |
| `attributes` | No | JSON string for vertical-specific fields (see below) |
| `is_active` | No | `true` or `false` — defaults to `true` |

### Example CSV row

```
sku,vertical,title_he,title_en,price,description_he,image,attributes,is_active
D001,diamonds,יהלום 1 קרט,1 Carat Diamond,45000,יהלום עגול מושלם...,D001.jpg,"{""carat"":1,""cut"":""excellent"",""color"":""D"",""clarity"":""VS1""}",true
```

---

## Attributes by Vertical

Use these keys inside the `attributes` JSON column:

### Diamonds
```json
{
  "carat": 1.0,
  "cut": "excellent",
  "color": "D",
  "clarity": "VS1",
  "certificate": "GIA"
}
```

### Cars
```json
{
  "make": "Toyota",
  "model": "Corolla",
  "year": 2023,
  "km": 15000,
  "fuel": "hybrid",
  "hand": 1
}
```

### Insurance
```json
{
  "type": "life",
  "coverage": 500000,
  "monthly_premium": 250
}
```

---

## Description Strategy

Choose the approach that fits your products:

**Option A — Write per-product** (recommended for varied inventory):
Fill in `description_he` directly in the CSV for each row.

**Option B — Template from attributes** (recommended for uniform inventory like diamonds):
Use a fixed template and only vary the attribute values:
> `יהלום {carat} קרט, חיתוך {cut}, צבע {color}, ניקיון {clarity}`

---

## Upload Workflow

### Step 1 — Prepare images
Place all product images in the `images/` folder, named by SKU (`D001.jpg`).
Copy them to:
```
frontend/public/images/products/
```

### Step 2 — Fill the CSV
Open `products.csv` in Excel or Google Sheets and fill in all rows.

### Step 3 — Convert CSV to JSON
Use any online CSV→JSON converter, or run:
```bash
python -c "
import csv, json, sys
rows = list(csv.DictReader(open('products.csv', encoding='utf-8')))
print(json.dumps(rows, ensure_ascii=False, indent=2))
" > products.json
```

### Step 4 — Upload via admin panel
1. Go to **Admin → Products**
2. Click **הוסף מקבץ מוצרים (JSON)**
3. Paste the JSON content
4. Click **העלה מקבץ**

---

## Notes

- `description_he` is the only required description field. The other languages are optional.
- `is_active: false` hides the product from the site without deleting it.
- The `sku` column is for your own reference only — it is not stored in the database.
- Images must be placed in `frontend/public/images/products/` before they appear on the site.
