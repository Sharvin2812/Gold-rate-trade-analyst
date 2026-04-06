# 🇲🇾 Malaysian Retail Gold Pricing & Analytics System

Developed a full-stack gold pricing and analytics system tailored for the Malaysian jewellery (kedai emas) market, transforming raw gold spot prices into real-world retail pricing models.
This project bridges the gap between **financial market data (gold + FX)** and **retail business logic**, enabling accurate pricing, margin simulation, and decision-making for gold traders and jewellery businesses.

## Key Achievements
-  Built a **real-time pricing engine** converting gold spot (USD/oz) → MYR/gram
-  Implemented **retail pricing logic (916 / 999 / 750)** with industry-standard spread and premiums
-  Designed **profit margin simulator** for business decision support
-  Reduced API dependency using **TTL caching + snapshot persistence**
-  Developed **scalable API architecture** with validation and error handling
-  Created **data-driven UI (rate card + calculator)** for end users
-  Ensured **compliance with external API attribution requirements**

##  Business Value
- Enables jewellery shops to generate **accurate daily pricing**
- Supports **profit optimization through simulation tools**
- Improves **pricing transparency for customers**
- Reduces operational dependency on manual calculations
- Provides a foundation for **retail analytics and forecasting**

## ⚙️ Core Features

### 💰 Retail Pricing Engine
- Converts:
  - Gold price (USD/oz)
  - FX rate (USD → MYR)
- Outputs:
  - MYR per gram pricing
  - 999 / 916 / 750 purity rates
- Applies:
  - Premium per gram
  - Buy/Sell spread
  - Purity factors

### 📊 Rate Card System
- Real-time “Kedai Emas” pricing display
- Buy vs Sell rates per gram
- Timestamped for daily updates
- Shareable (WhatsApp-ready format)

### 🧮 Price Calculator
- Input:
  - Weight (grams)
  - Purity level
- Output:
  - Subtotal
  - Making charges
  - Final total price

### 📈 Profit Margin Simulator
- Custom inputs:
  - Premium
  - Spread %
  - Making charge
- Outputs:
  - Profit per item
  - Margin insights

### ⚡ Data Reliability Layer
- TTL-based in-memory caching (reduces API calls)
- Snapshot persistence every 5–10 minutes
- Hybrid data mode:
  - Live API fallback
  - Cached snapshot usage

### 🗄️ Data & Audit Layer
- Retail pricing profiles (configurable business rules)
- Historical pricing snapshots
- Audit-ready pricing records


## 🏗️ System Architecture

External APIs
│
├── Gold API (USD/oz)
└── FX API (USD → MYR)
↓
Data Provider Layer
↓
Pricing Engine (Core Logic)
↓
API Layer (Next.js Routes)
↓
Caching + Snapshot Storage (DB)
↓
Frontend UI (Rate Card + Calculator)


## 🛠️ Tech Stack

### Backend
- Node.js (JavaScript)
- Next.js API Routes

### Database
- PostgreSQL
- Drizzle ORM

### Runtime & Tooling
- Bun
- REST API design
- Modular service architecture

### External Integrations
- Gold Price API (real-time market data)
- ExchangeRate API (currency conversion)


## Key Components

- `retailPricing.js` → Core pricing & margin logic
- `freeProvider.js` → External API integration layer
- `config.js` → Runtime configuration & environment control
- `schema.js` → Database schema (profiles + snapshots)
- `/api/retail/quote` → Pricing endpoint
- `/api/retail/simulate` → Margin simulation endpoint
- `poll-retail-snapshot.js` → Scheduled data persistence
- `seed-retail.js` → Default business configuration

## Robustness & Engineering Practices
- Input validation (purity, weight constraints)
- Structured API error handling
- Configurable runtime behavior via environment variables
- Modular separation of concerns (provider, logic, API)
- Scalable design for future feature expansion

## 📊 Example API Usage
### Get Retail Quote
```bash
GET /api/retail/quote?purity=916&weight_g=10
Profit Simulation
POST /api/retail/simulate
