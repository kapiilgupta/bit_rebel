# Factory Brain

A production planning and scheduling web app built for small-to-mid-size manufacturing teams. The idea started from a real frustration — most planning tools are either massive ERP systems no one actually understands, or just spreadsheets that break the moment two people edit at once.

Factory Brain sits somewhere in the middle: a clean, fast dashboard where you can manage your product catalog, track inventory, run demand forecasts, generate production orders, and schedule jobs across your machines — all in one place.

---

## What it does

- **Products** — maintain your SKU catalog with daily targets, lead times, and machine time estimates
- **Inventory** — track stock levels and get alerts when anything drops below the reorder point
- **Forecast** — auto-generate 7-day demand forecasts using a rolling 30-day average (with a 10% growth bump)
- **Orders** — create production orders manually or let the system generate them from the forecast-vs-stock gap
- **Scheduling** — round-robin scheduler assigns pending orders to operational machines and builds a Gantt view
- **Dashboard** — live summary of demand, planned units, machine utilisation, and low-stock alerts

---

## Tech stack

| Layer      | What I used                          |
|------------|--------------------------------------|
| Backend    | Node.js + Express                    |
| Database   | MongoDB Atlas via Mongoose           |
| Auth       | JWT stored in an httpOnly cookie     |
| Frontend   | EJS templates + vanilla JS + CSS     |
| Icons      | Lucide                               |
| Charts     | Chart.js (forecast page)             |

No React, no build step — wanted to keep it simple and fast to iterate on.

---

## Getting started

### Prerequisites
- Node.js 18+
- A MongoDB Atlas cluster (free tier works fine)

### Setup

```bash
git clone https://github.com/your-username/factory-brain.git
cd factory-brain
npm install
```

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

The only things you really need to set are `MONGODB_URI` and `JWT_SECRET`. Everything else has sensible defaults.

### Seed the database

This creates three starter accounts so you can log in straight away:

```bash
node scripts/seed.js
```

| Username       | Email                        | Password     | Role    |
|----------------|------------------------------|--------------|---------|
| demo_manager   | demo@factorybrain.io         | Demo@1234    | manager |
| admin_user     | admin@factorybrain.io        | Admin@1234   | admin   |
| viewer_user    | viewer@factorybrain.io       | Viewer@1234  | viewer  |

### Run it

```bash
npm run dev
```

Starts on `http://localhost:3000` (or the next free port if 3000 is taken).

---

## Project structure

```
factory-brain/
├── app.js                  # entry point, middleware setup
├── config/
│   └── db.js               # mongoose connection
├── controllers/            # route handlers
├── middleware/
│   ├── auth.js             # JWT protect + optionalAuth
│   ├── errorHandler.js     # global error catcher
│   └── validate.js         # lightweight field validators
├── models/                 # mongoose schemas
├── routes/                 # express routers
├── public/
│   ├── css/                # global.css, pages.css, etc.
│   └── js/                 # pages.js (all page logic), auth.js
├── views/                  # EJS templates
└── scripts/
    └── seed.js             # DB seeder
```

---

## API overview

All API routes sit under `/api/`. Auth is handled via the `fb_token` cookie — log in first.

| Method | Route                     | What it does                              |
|--------|---------------------------|-------------------------------------------|
| POST   | /api/auth/login           | Log in, sets cookie                       |
| POST   | /api/auth/register        | Create account                            |
| POST   | /api/auth/logout          | Clear cookie                              |
| GET    | /api/products             | List your products                        |
| POST   | /api/products             | Add a product                             |
| PUT    | /api/products/:id         | Update a product                          |
| DELETE | /api/products/:id         | Delete (also removes inventory record)    |
| GET    | /api/inventory            | List inventory                            |
| PUT    | /api/inventory/:id        | Update stock levels                       |
| GET    | /api/machines             | List machines                             |
| POST   | /api/machines             | Add a machine                             |
| GET    | /api/forecast             | Get forecasts for a date range            |
| POST   | /api/forecast/generate    | Auto-generate 7-day forecast              |
| GET    | /api/orders               | List production orders                    |
| POST   | /api/orders/generate      | Generate orders from forecast gap         |
| GET    | /api/schedule             | Get schedule for a date                   |
| POST   | /api/schedule/generate    | Run the scheduler                         |
| GET    | /api/dashboard/summary    | KPI summary numbers                       |

---

## Environment variables

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=your_atlas_connection_string
JWT_SECRET=something_long_and_random
JWT_EXPIRES_IN=7d
COOKIE_MAX_AGE=604800000
```

---

## Known limitations / things I'd improve

- The scheduler is a simple round-robin — works but isn't optimal for complex constraint problems
- Forecast model is heuristic-based (30-day avg × 1.1), not actual ML
- OTP codes are stored in-memory, so they reset on server restart
- No pagination on list endpoints yet — fine for small datasets, would need it at scale

---

## License

MIT
