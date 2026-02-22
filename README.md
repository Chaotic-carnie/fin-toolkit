# ⚡ PEEYUSH LABS | Quantitative Financial Toolkit

![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-black?style=for-the-badge&logo=framer&logoColor=blue)

A high-performance, stateless web application designed for advanced financial modeling, exotic option pricing, macroeconomic stress testing, and portfolio analysis. Built with a focus on clean UI/UX and heavy quantitative computing.

**Built by students at BITS Pilani, Goa Campus.**

---

## ✨ Features

Our toolkit is divided into several specialized quantitative modules:

* **📈 Instrument Pricer:** Compute theoretical prices and Greeks (Delta, Gamma, Vega, Theta, Rho, Vanna, Volga) for Vanilla and Exotic options using Black-Scholes, Binomial Trees (CRR), and Monte Carlo simulations.
* **🏦 Macro Engine:** Run macroeconomic scenario analysis, view historical VaR (Value at Risk) histograms, and model yield curve/rate shocks.
* **🎯 Strategy Builder:** Construct and analyze custom multi-leg option strategies with visual payoff charts.
* **💼 Portfolio Manager:** Build and track portfolios. (Currently runs in a stateless "Demo Mode" using `sessionStorage` for blazing-fast client-side persistence).
* **⚖️ Capital Allocation & Budgeting:** Tools for margin computation, capital exposure, and optimized budgeting.
* **🏛️ Tax Compute:** Algorithmic tax liability and optimization calculations.

---

## 🛠️ Tech Stack

This project was built using the modern React ecosystem, optimized for compute-heavy client/server interactions:

* **Framework:** [Next.js 15.5](https://nextjs.org/) (App Router & Turbopack)
* **Language:** TypeScript
* **Styling:** Tailwind CSS + custom dark-mode quantitative UI components
* **Animations:** Framer Motion
* **State Management:** Zustand / React Hooks
* **Icons:** Lucide React
* **Architecture:** Stateless Edge/Serverless Compute (No database required).

---

## 🚀 Getting Started (Local Development)

Because this application uses a **Stateless Architecture**, there is no need to set up PostgreSQL, Docker, or Prisma. You can get it running locally in less than a minute.

### 1. Clone the repository
```bash
git clone [https://github.com/your-username/peeyush-labs.git](https://github.com/your-username/peeyush-labs.git)
cd peeyush-labs

```

### 2. Install dependencies

```bash
npm install
# or
yarn install
# or
pnpm install

```

### 3. Start the development server

```bash
npm run dev

```

Open [http://localhost:3000]() with your browser to see the application.

---

## 📦 Building & Deploying

This application is ready to be deployed instantly to platforms like **Vercel** or **Render**.

Because database adapters and auth providers have been removed for the public demo, the build process requires **zero environment variables** to compile.

```bash
# Build the production bundle
npm run build

# Start the production server
npm run start

```

*To deploy on Vercel:* Simply import the GitHub repository to your Vercel dashboard and click "Deploy". No configuration needed.

---

## 🔌 API Reference

The application uses Next.js Route Handlers (`src/app/api/`) as mathematical compute endpoints. These are stateless APIs that take inputs, run quantitative models, and return results.

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/price` | `POST` | Calculates theoretical prices and Greeks for financial instruments. |
| `/api/strategy/recommend` | `POST` | Algorithmic strategy recommendations based on market views. |
| `/api/strategy/scenario` | `POST` | Scenario stress testing for multi-leg strategies. |
| `/api/macro/analyze` | `POST` | Macroeconomic simulation engine. |
| `/api/tax/compute` | `POST` | Computes simulated tax liabilities. |
| `/api/margin/compute` | `POST` | Calculates portfolio margin requirements. |
| `/api/capbud/compute` | `POST` | Runs capital budgeting algorithms (NPV, IRR). |
| `/api/allocation/compute` | `POST` | Portfolio allocation optimization. |
| `/api/exposure/compute` | `POST` | Risk exposure analytics. |

---

## 📂 Project Structure

```text
src/
├── app/               # Next.js App Router (Pages, Layouts, API routes)
├── components/        # Global UI Components (Navbar, Buttons, etc.)
├── features/          # Domain-specific logic (Pricing, Macro, Portfolio)
│   ├── macro/         # Macro engine components & compute logic
│   ├── pricing/       # Pricing mathematical engine & UI
│   ├── strategy/      # Option strategy builder
│   └── ...
├── lib/               # Utility functions, constants, and Demo-DB (sessionStorage)
└── styles/            # Global CSS and Tailwind configurations

```

---

## 👥 The Architects

Built by pre-final-year dual-degree students from BITS Pilani, Goa Campus:

* **Peeyush Kumar Jha** (M.Sc. Economics + B.E. Computer Science)
* **Parth Jayanandan** (M.Sc. Mathematics + B.E. Computer Science)
* **Naman Kaushik Shah** (M.Sc. Mathematics + B.E. Computer Science)

Have suggestions? Reach out to [peeyush@peeyush.co.in]().

---

## ⚠️ Disclaimer

*This toolkit is for educational and demonstrative purposes only. It does not constitute financial advice. The models and historical data used may contain inaccuracies. Always consult a certified financial advisor before making real investment decisions.*
