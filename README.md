# OneElixir Fragrances

A full-stack e-commerce platform for premium perfumes — built with React and Node.js.

**Live:** [oneelixir.vercel.app](https://oneelixir.vercel.app)

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, React Router 7, Tailwind CSS 4, Vite 7, Recharts |
| **Backend** | Node.js, Express 5, MongoDB, Mongoose 9 |
| **Auth** | JWT (access + refresh tokens), Google OAuth |
| **Services** | Cloudinary (images), Resend (emails), Firebase |
| **Deployment** | Vercel (client), MongoDB Atlas (database) |

---

## Features

### Storefront
- Product catalog with search, scent-profile filtering, and price range slider
- Flash sale countdown timers on product cards and dedicated homepage section
- Product detail pages with image gallery, reviews, and live flash sale banners
- Shopping cart with quantity management and coupon validation
- Wishlist with persistent storage
- Checkout flow with address management
- Order tracking by order ID
- Curated product bundles at discounted prices
- User accounts with Google sign-in, password reset via email
- SEO — dynamic meta tags (react-helmet-async), auto-generated sitemap

### Admin Panel
- **Dashboard** — Revenue/order charts, KPI cards, top products, profit margins, active flash sales panel, payment status breakdown, stock alerts
- **Inventory** — Full product CRUD, image uploads (Cloudinary), inline stock editing, flash sale activation with date/time picker, featured product toggle
- **Orders** — Order list with status/payment management, manual order creation, payment proof upload
- **Financials** — Expense tracking, investment/capital management, cost calculator with profit margins
- **Marketing** — Coupon management (percentage/fixed discounts), homepage banner management, bundle creation
- **Team** — Multi-admin support with role-based access (admin/superadmin), activity logs
- **Customers** — Customer list with order history
- **Exports** — PDF (jsPDF) and Excel (xlsx) export support

### Security
- JWT access tokens (15-min expiry) with automatic refresh via axios interceptors
- Refresh token rotation with bcrypt hashing
- Rate limiting — 200 req/15min general, 15 req/15min for auth endpoints
- Admin route protection with `verifyAdmin` / `verifySuperadmin` middleware
- CORS whitelisting

---

## Project Structure

```
client/
├── src/
│   ├── components/       # Shared components (Navbar, Cart sidebar, Skeleton, ProtectedRoute)
│   ├── context/          # React Context (User, Cart, Wishlist, Toast)
│   ├── pages/            # All page components (30+ pages)
│   ├── utils/            # adminAxios with auto token refresh
│   └── styles/           # Additional styles
└── public/               # Static assets, logos

server/
├── middleware/            # JWT auth middleware (verifyAdmin, verifySuperadmin, verifyUser)
├── models/               # Mongoose schemas (12 models)
├── routes/               # Express route handlers (14 route files)
└── utils/                # Email sender, sitemap generator
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB instance (local or Atlas)
- Cloudinary account
- Google OAuth client ID
- Resend API key

### Environment Variables

**Server** (`.env`):
```env
PORT=5000
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
REFRESH_SECRET=your_refresh_secret
RESEND_API_KEY=your_resend_key
```

**Client** (`.env`):
```env
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

### Installation

```bash
# Clone the repo
git clone https://github.com/hasanxmeherab/One-Elixir.git
cd One-Elixir

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### Running Locally

```bash
# Start the server (from /server)
npm start

# Start the client dev server (from /client)
npm run dev
```

The client runs on `http://localhost:5173` and the server on `http://localhost:5000`.

---

## Database Models

| Model | Purpose |
|-------|---------|
| User | Customer accounts, addresses, wishlist |
| Admin | Admin accounts with roles |
| Perfume | Products with variants, flash sales, scent profiles |
| Order | Orders with items, status, payment tracking |
| Review | Product reviews and ratings |
| Coupon | Discount codes (percentage/fixed) |
| Banner | Homepage banner images |
| Bundle | Curated product bundles |
| Expense | Business expense records |
| Investment | Capital/investment tracking |
| CostRecord | Product cost and profit margin data |
| Log | Admin activity audit trail |

---

## API Endpoints

| Route | Description |
|-------|-------------|
| `/api/auth/*` | User signup, signin, Google OAuth, token refresh, password reset |
| `/api/admins/*` | Admin auth, registration, management |
| `/api/perfumes/*` | Product CRUD, search, best-sellers, flash sales |
| `/api/orders/*` | Order management, manual orders, customer history |
| `/api/reviews/*` | Product reviews |
| `/api/coupons/*` | Coupon CRUD and validation |
| `/api/banners/*` | Banner management |
| `/api/bundles/*` | Bundle CRUD |
| `/api/expenses/*` | Expense tracking |
| `/api/investments/*` | Investment management |
| `/api/costs/*` | Cost/profit records |
| `/api/logs/*` | Activity logs |
| `/api/wishlist/*` | Wishlist management |
| `/api/address/*` | Address management |

---

## License

© 2026 OneElixir Fragrances. All rights reserved.
