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
| **Validation** | Zod (server-side schema validation) |
| **Services** | Cloudinary (images), Resend (emails) |
| **Security** | Helmet, CORS, express-rate-limit, bcryptjs |
| **Export** | jsPDF + jspdf-autotable (PDF), XLSX (Excel) |
| **SEO** | react-helmet-async, auto-generated sitemap |
| **Deployment** | Vercel (client + analytics), MongoDB Atlas (database) |

---

## Features

### Storefront
- Product catalog with full-text search, autocomplete suggestions, scent-profile filtering, and price range slider
- Flash sale countdown timers on product cards and a dedicated homepage section
- Product detail pages with image gallery, scent profile tags, variant selection, reviews, and live flash sale banners
- Shopping cart with quantity management (stock-limited), coupon validation, and guest/user cart merge on login
- Wishlist with per-user persistent storage and cross-tab sync via localStorage events
- Multi-step checkout — shipping address (with saved addresses & location-based shipping: Dhaka 80 TK / Outside 120 TK) → payment method → order confirmation
- Order tracking by order ID
- Curated product bundles at discounted prices
- User accounts with Google sign-in, password reset via email, avatar uploads, and address book management
- SEO — dynamic meta tags (react-helmet-async), auto-generated sitemap from product catalog
- Mobile-optimized bottom tab navigation
- Toast notification system (success / error / warning / info)
- Lazy-loaded admin routes for faster initial page load

### Admin Panel
- **Dashboard** — Revenue/order charts, KPI cards, top products, profit margins, active flash sales panel, payment status breakdown, low-stock alerts
- **Inventory** — Full product CRUD with slug auto-generation and soft delete, image uploads (Cloudinary with auto optimization), inline stock editing, flash sale activation with date/time picker, featured product toggle, variant management (sizes/volumes with separate pricing & stock)
- **Orders** — Paginated order list with status/payment management, bulk status updates, manual order creation with item search, payment proof upload (bKash / Nagad / Bank Transfer / CoD), email notifications on status change, PDF & Excel export
- **Financials** — Expense tracking with category breakdown (Packaging / Ingredients / Marketing / Tools / Other), investment & capital management with per-investor transaction history, cost calculator with ingredient/packaging cost breakdown and auto-calculated profit margins using Weighted Average Cost (WAC)
- **Marketing** — Coupon management (percentage / fixed discounts with expiry), homepage banner management, product bundle creation
- **Team** — Multi-admin support with role-based access (admin / superadmin), activity audit logs (every action logged with IP & timestamp)
- **Customers** — Customer list with order history, wishlist restock/sale email notifications
- **Exports** — PDF (jsPDF + jspdf-autotable) and Excel (XLSX) export for orders and reports

### Security
- JWT access tokens (15-min expiry) with automatic refresh via axios interceptors and pending request queue
- Refresh token rotation with bcrypt hashing (7-day expiry)
- Rate limiting — 200 req/15min general, 15 req/15min for auth endpoints
- Zod schema validation on all API inputs with detailed error messages
- Helmet security headers (CSP, X-Frame-Options, etc.)
- Google OAuth with verified ID tokens via Google API
- Admin route protection with `verifyAdmin` / `verifySuperadmin` / `verifyUser` middleware
- CORS whitelisting for specific domains only
- Soft deletes for products (data preservation)
- Admin activity audit trail with IP logging
- 10MB JSON payload limit
- Server-side in-memory cache (60s TTL) with prefix-based invalidation

### Payment Methods
- **Cash on Delivery (CoD)** — No payment proof required
- **bKash** — Mobile payment with transaction ID & screenshot
- **Nagad** — Mobile payment with transaction ID & screenshot
- **Bank Transfer** — Admin manual orders with transaction ID & screenshot

---

## Project Structure

```
client/
├── src/
│   ├── components/       # Navbar, AdminNavbar, MobileTabBar, ProtectedRoute, Skeleton
│   ├── context/          # React Context — User, Cart, Wishlist, Toast
│   ├── pages/            # 29 page components (14 public + 15 admin)
│   ├── data/             # Static data (location/division/district lists)
│   ├── utils/            # adminAxios with auto token refresh, image optimizer
│   └── styles/           # Additional CSS
└── public/               # Static assets, logos

server/
├── server.js             # Express app, middleware, rate limiting, cache, sitemap
├── middleware/            # JWT auth (verifyAdmin, verifySuperadmin, verifyUser), Zod validation
├── models/               # 12 Mongoose schemas
├── routes/               # 14 Express route files
└── utils/                # Email sender (Resend), sitemap generator
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
JWT_REFRESH_SECRET=your_refresh_secret
RESEND_API_KEY=your_resend_key
FRONTEND_URL=http://localhost:5173
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

| Model | Purpose | Key Fields |
|-------|---------|------------|
| **User** | Customer accounts | name, email, password, googleId, avatar, wishlist, addresses, refreshToken |
| **Admin** | Admin accounts | name, email, password, role (admin/superadmin), refreshToken |
| **Perfume** | Products | name, slug, price, variants, scentProfile[], flashSale, stock, featured, isDeleted |
| **Order** | Orders | items, totalAmount, status, paymentMethod, paymentStatus, paymentDetails, isManual |
| **Review** | Product reviews | perfumeId, userId, rating (1–5), comment, images[] |
| **Coupon** | Discount codes | code, discountType (percentage/fixed), discountValue, expiryDate |
| **Banner** | Homepage banners | imageUrl, title, subtitle, link, isActive |
| **Bundle** | Product bundles | name, products[], bundlePrice, active |
| **Expense** | Business expenses | title, amount, category, quantity, unitPrice |
| **Investment** | Capital tracking | investorName, totalAmount, transactions[] |
| **CostRecord** | Cost & profit data | ingredients[], packaging[], costPerBottle, profitMargin, WAC |
| **Log** | Audit trail | adminId, action, target, detail, ip |

---

## API Endpoints

### Authentication (`/api/auth`)
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/signup` | User registration with Zod validation |
| POST | `/signin` | Email/password login (returns access + refresh tokens) |
| POST | `/google` | Google OAuth sign-in (verifies ID token) |
| POST | `/refresh` | Refresh access token |
| POST | `/logout` | Clear refresh token |
| GET | `/me` | Get current user profile |
| PUT | `/profile` | Update name, password, or avatar |
| POST | `/forgot-password` | Send password reset email |

### Admin (`/api/admins`)
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/login` | Admin login |
| POST | `/register` | Create admin account (admin only) |
| POST | `/refresh` | Refresh admin token |
| POST | `/logout` | Clear admin refresh token |
| GET | `/list` | List all admins |
| DELETE | `/:id` | Delete admin (superadmin only) |

### Products (`/api/perfumes`)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | All products (paginated, searchable, cached 60s) |
| GET | `/slug/:slug` | Product by slug |
| GET | `/:id` | Product by ID |
| GET | `/search?q=` | Search autocomplete (full-text + regex fallback) |
| GET | `/best-sellers` | Top 4 by units sold |
| GET | `/ratings` | Aggregated ratings (cached 60s) |
| GET | `/low-stock` | Low stock alerts (admin only) |
| POST | `/` | Create product (admin only) |
| PUT | `/:id` | Update product (admin only) |
| PUT | `/restore-stock` | Restore stock quantity (admin only) |
| DELETE | `/:id` | Soft delete product (admin only) |

### Orders (`/api/orders`)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | All orders with pagination (admin only) |
| GET | `/customer/:email` | Order history by customer email |
| POST | `/` | Create order (website checkout) |
| POST | `/manual` | Create manual order (admin only) |
| PUT | `/:id` | Update order status/payment (admin only) |
| PUT | `/:id/cancel` | Cancel pending order (user) |
| PUT | `/bulk-update` | Bulk status update (admin only) |

### Reviews (`/api/reviews`)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/:perfumeId` | Reviews for a product |
| POST | `/` | Create review (optional auth, prevents duplicates) |
| DELETE | `/:id` | Delete review (admin only) |

### Coupons (`/api/coupons`)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | All coupons (admin only) |
| POST | `/` | Create coupon (admin only) |
| POST | `/validate` | Validate coupon code (public) |
| DELETE | `/:id` | Delete coupon (admin only) |

### Banners (`/api/banners`)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | Active banners (cached 60s) |
| POST | `/` | Create banner (admin only) |
| DELETE | `/:id` | Delete banner (admin only) |

### Bundles (`/api/bundles`)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | Active bundles (all if `?admin=true`) |
| GET | `/:id` | Single bundle with products |
| POST | `/` | Create bundle (admin only) |
| PUT | `/:id` | Update bundle (admin only) |
| DELETE | `/:id` | Delete bundle (admin only) |

### Expenses (`/api/expenses`)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | All expenses, paginated (admin only) |
| POST | `/` | Create expense (admin only) |
| DELETE | `/:id` | Delete expense (admin only) |

### Investments (`/api/investments`)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | All investors, paginated (admin only) |
| GET | `/names` | Investor names for dropdown (admin only) |
| POST | `/add` | Add investment transaction (admin only) |
| DELETE | `/:investorId/transaction/:transactionId` | Remove transaction (admin only) |

### Cost Records (`/api/costs`)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | All records, filterable by perfumeId (admin only) |
| GET | `/summary/wac` | WAC summary per product (admin only) |
| GET | `/:id` | Single cost record (admin only) |
| POST | `/` | Create cost record with auto profit calc (admin only) |
| PATCH | `/:id/stock` | Update remaining bottles (admin only) |
| DELETE | `/:id` | Delete record (admin only) |

### Activity Logs (`/api/logs`)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | All logs, newest first (admin only) |
| GET | `/admin/:adminId` | Logs by specific admin (admin only) |
| DELETE | `/` | Clear all logs (admin only) |

### Wishlist (`/api/wishlist`)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/:userId` | Get user's wishlist (populated) |
| POST | `/:userId/add` | Add to wishlist |
| DELETE | `/:userId/remove/:perfumeId` | Remove from wishlist |
| POST | `/notify-restock` | Email wishlist users on restock/sale |

### Addresses (`/api/addresses`)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | Get user's addresses (auth required) |
| POST | `/` | Add address (first is auto-default) |
| PUT | `/:addressId/default` | Set default address |
| DELETE | `/:addressId` | Remove address |

---

## State Management

| Context | Purpose |
|---------|---------|
| **CartContext** | Guest cart (localStorage) + user cart per userId, auto-merge on login, stock-limited quantities |
| **UserContext** | Auth state, token storage, Google OAuth, auto token refresh on 401 |
| **WishlistContext** | Per-user wishlist with localStorage sync and cross-tab updates |
| **ToastContext** | Global toast notifications (success / error / warning / info), 3.5s auto-dismiss |

---

## License

© 2026 OneElixir Fragrances. All rights reserved.
