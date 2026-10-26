# 🎮 BROCODE GAMING CAFE MANAGEMENT SYSTEM

**BroCode Gaming Cafe** is a full-stack, real-time gaming cafe booking and management system designed for high-efficiency operations during busy cafe hours. Built with a dark cyberpunk aesthetic, touch-first responsive design, and installable Progressive Web App (PWA) support.

---

## 🌟 KEY FEATURES

- **Live 8 Gaming Stations Grid**:
  - Table 1: PS5 (1–4 Controllers)
  - Table 2: PS5 (1–4 Controllers)
  - Table 3: PS4 (1–4 Controllers)
  - Table 4: PS4 (1–4 Controllers)
  - Table 5: Car Simulator (Cockpit Rig)
  - Table 6: Car Simulator (Cockpit Rig)
  - Table 7: Esports Gaming PC
  - Table 8: Esports Gaming PC
- **Critical Next-Available Time Calculation**:
  - Dynamically calculates and displays exactly when an occupied table becomes free (e.g., `Free at 9:00 PM` or `Available until 7:30 PM`).
- **Multi-Station Booking**:
  - Book multiple tables simultaneously in a single customer invoice (e.g., Table 1 PS5 + Table 7 PC).
- **Controller-Based Dynamic Pricing**:
  - PS5 (1P: ₹90/hr, 2P: ₹140/hr, 3P: ₹190/hr, 4P: ₹240/hr)
  - PS4 (1P: ₹70/hr, 2P: ₹110/hr, 3P: ₹150/hr, 4P: ₹190/hr)
  - PC: ₹70/hr | Car Simulator: ₹100/hr
- **Historical Price Protection**:
  - When prices are updated by the Owner, previous booking records and invoices retain their exact historical snapshot rate.
- **Conflict Prevention & Live Session Alarms**:
  - Server-side double-booking prevention.
  - Visual and audio alarms on session completion with Web Audio API synthesis and quick Extend actions.
- **Food & Beverage Management**:
  - Full snack bar catalog (Burgers, Cold Drinks, Water, Fries).
  - Add snacks directly to ongoing sessions with automatic bill updates.
- **Payments & Live Owner Notifications**:
  - Cash, UPI, Card, and Other methods.
  - Immediate real-time push alert to the Owner via Socket.IO whenever an employee marks a payment.
- **Printable Thermal & A4 Receipts**:
  - High-clarity printable receipts with itemized breakdown of gaming, snacks, and taxes.
- **Audit Logs & Analytics**:
  - Immutable audit trail of all staff and owner actions.
  - Daily, weekly, and monthly revenue analytics with CSV export.
- **PWA Installation**:
  - Fast standalone mobile experience on Android, iPhone, iPad, and Windows PC.

---

## 🏗️ ARCHITECTURE & TECH STACK

```
brocode-gaming-cafe/
├── client/                     # React + Vite + Tailwind Frontend (PWA)
│   ├── src/
│   │   ├── components/         # Station cards, Modals, Alarm, Layout, UI
│   │   ├── contexts/           # Auth, Socket.IO, Alarm (Web Audio)
│   │   ├── lib/                # API client, Currency/Time formatting
│   │   ├── pages/              # Owner & Employee Dashboards, Bookings, Pricing, Food, Reports
│   │   ├── types/              # TypeScript interfaces
│   │   ├── App.tsx             # Protected Role-based Routing
│   │   ├── main.tsx            # React Query & Provider Entry
│   │   └── index.css           # Cyberpunk styling & Thermal print CSS
│   ├── public/                 # Favicons & PWA Icons
│   ├── vite.config.ts          # Vite + PWA configuration
│   └── tailwind.config.js      # Dark Cyber theme tokens
│
├── server/                     # Node.js + Express + Prisma Backend
│   ├── prisma/
│   │   ├── schema.prisma       # Prisma ORM schema
│   │   └── seed.ts             # Initial demo database seed
│   ├── src/
│   │   ├── controllers/        # Auth, Station, Booking, Pricing, Food, Payment, Reports
│   │   ├── middlewares/        # JWT Authentication & RBAC
│   │   ├── services/           # Scheduler (session ending/ended, 30m reminders)
│   │   ├── utils/              # Prisma client, SMS providers (Mock & Twilio), Audit logger
│   │   ├── socket.ts           # Real-time Socket.IO manager
│   │   └── index.ts            # Server entrypoint
│   ├── tests/                  # Vitest business logic unit tests
│   └── tsconfig.json
│
├── docker-compose.yml          # Optional PostgreSQL Docker configuration
├── package.json                # Root monorepo scripts
└── README.md
```

---

## 🚀 GETTING STARTED

### 1. Install Dependencies

In the project root directory:

```bash
# Install root, server, and client dependencies
npm install
cd server && npm install
cd ../client && npm install
cd ..
```

### 2. Configure Environment

Server environment (`server/.env`):
```env
PORT=5000
DATABASE_URL="file:./dev.db"
JWT_SECRET="brocode_super_secret_jwt_key_2026_gaming_cafe_prod_key"
CORS_ORIGIN="http://localhost:5173"
NODE_ENV="development"
SMS_PROVIDER="mock"
```

Client environment (`client/.env`):
```env
VITE_API_URL="http://localhost:5000/api"
VITE_SOCKET_URL="http://localhost:5000"
```

### 3. Initialize Database & Seed

```bash
cd server
npm run db:push
npm run db:seed
cd ..
```

### 4. Start Development Servers

Run both Backend and Frontend concurrently from the root directory:

```bash
npm run dev
```

Or run individually:
- **Backend API**: `cd server && npm run dev` (Runs on `http://localhost:5000`)
- **Frontend App**: `cd client && npm run dev` (Runs on `http://localhost:5173`)

---

## 🔑 DEMO LOGIN CREDENTIALS

| Role | Username / Employee ID | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Owner** | `owner` | `owner123` | Full admin, Pricing, Staff, Reports, Audits |
| **Employee 1** | `EMP001` | `emp123` | Bookings, Station Grid, Food, Payments |
| **Employee 2** | `EMP002` | `emp123` | Bookings, Station Grid, Food, Payments |

---

## 📱 PWA INSTALLATION GUIDE

### On Android (Chrome):
1. Open `http://<your-server-ip>:5173` in Google Chrome.
2. Tap the **3-dots menu** in the top right.
3. Tap **"Install app"** or **"Add to Home screen"**.
4. The **BroCode** app icon will appear on your home screen and open in fullscreen mode.

### On iPhone / iPad (Safari):
1. Open `http://<your-server-ip>:5173` in Safari.
2. Tap the **Share button** (square with an arrow pointing up).
3. Scroll down and tap **"Add to Home Screen"**.
4. Tap **"Add"** in the top right.

### On Windows / Mac (Chrome / Edge):
1. Open the app in Chrome or Edge.
2. Click the **Install icon** in the browser address bar.

---

## 💬 SMS & WHATSAPP CONFIGURATION

In development mode, `SMS_PROVIDER="mock"` logs all outgoing SMS and OTPs to the server console and the **Settings** page in the UI.

For production SMS delivery via Twilio:
1. In `server/.env`, set:
   ```env
   SMS_PROVIDER="twilio"
   TWILIO_ACCOUNT_SID="your_account_sid"
   TWILIO_AUTH_TOKEN="your_auth_token"
   TWILIO_PHONE_NUMBER="+1xxxxxxxxxx"
   ```

---

## 🧪 RUNNING TESTS

```bash
# Run automated business logic and pricing tests
npm run test
```

---

## 📦 PRODUCTION BUILD

```bash
# Build both frontend and backend bundles
npm run build

# Start production server
npm start
```
