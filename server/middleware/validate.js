const { z } = require('zod');

// ── Auth ──────────────────────────────────────────────────────
const signupSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(200),
  password: z.string().min(6).max(128),
});

const signinSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const adminRegisterSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(200),
  password: z.string().min(6).max(128),
  role: z.enum(['admin', 'superadmin']).optional(),
});

// ── Perfume ───────────────────────────────────────────────────
const createPerfumeSchema = z.object({
  name: z.string().min(1).max(200),
  price: z.number().positive(),
  description: z.string().max(5000).optional(),
  scentProfile: z.array(z.string().max(50)).max(20).optional(),
  image: z.string().url().optional().or(z.literal('')),
  images: z.array(z.string().url().or(z.literal(''))).max(10).optional(),
  stock: z.number().int().min(0).optional(),
  featured: z.boolean().optional(),
  variants: z.array(z.object({
    label: z.string().min(1).max(50),
    price: z.number().positive(),
    stock: z.number().int().min(0).default(0),
    image: z.string().optional().default(''),
  })).optional(),
  flashSale: z.object({
    active: z.boolean().optional(),
    salePrice: z.number().positive().optional().nullable(),
    endsAt: z.string().or(z.date()).optional().nullable(),
  }).optional(),
});

const updatePerfumeSchema = createPerfumeSchema.partial();

// ── Order ─────────────────────────────────────────────────────
const createOrderSchema = z.object({
  customerName: z.string().min(1).max(200),
  customerEmail: z.string().email().optional(),
  phone: z.string().min(1).max(30),
  address: z.string().max(500).optional(),
  items: z.array(z.object({
    perfumeId: z.string().optional(),
    name: z.string().min(1),
    price: z.number().min(0),
    quantity: z.number().int().positive().default(1),
    discountType: z.enum(['fixed', 'percentage', 'none']).optional(),
    discountValue: z.number().min(0).optional(),
    finalItemPrice: z.number().min(0).optional(),
  })).min(1),
  totalAmount: z.number().min(0),
  shippingCost: z.number().min(0).optional(),
  discountApplied: z.number().min(0).optional(),
  paymentMethod: z.string().max(50).optional(),
  paymentStatus: z.string().max(30).optional(),
  paymentDetails: z.object({
    senderNumber: z.string().optional(),
    transactionId: z.string().optional(),
    platform: z.string().optional(),
    screenshot: z.string().optional(),
    amountPaid: z.number().optional(),
  }).optional(),
  isManual: z.boolean().optional(),
  createdBy: z.string().max(200).optional(),
  createdAt: z.string().optional(),
  freeDelivery: z.boolean().optional(),
});

const updateOrderSchema = z.object({
  status: z.string().max(30).optional(),
  paymentStatus: z.string().max(30).optional(),
  paymentDetails: z.object({
    senderNumber: z.string().optional(),
    transactionId: z.string().optional(),
    platform: z.string().optional(),
    screenshot: z.string().optional(),
    amountPaid: z.number().optional(),
  }).optional(),
});

// ── Review ────────────────────────────────────────────────────
const createReviewSchema = z.object({
  perfumeId: z.string().min(1),
  userId: z.string().optional().nullable(),
  userName: z.string().min(1).max(100),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1).max(2000),
  images: z.array(z.string().url()).max(3).optional(),
});

// ── Coupon ────────────────────────────────────────────────────
const createCouponSchema = z.object({
  code: z.string().min(1).max(30),
  discountValue: z.number().positive(),
  discountType: z.enum(['percentage', 'fixed']),
});

// ── Banner ────────────────────────────────────────────────────
const createBannerSchema = z.object({
  imageUrl: z.string().url(),
  title: z.string().max(200).optional(),
  subtitle: z.string().max(500).optional(),
  link: z.string().max(200).optional(),
});

// ── Bundle ────────────────────────────────────────────────────
const createBundleSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  image: z.string().optional(),
  products: z.array(z.string()).min(1),
  bundlePrice: z.number().positive(),
  active: z.boolean().optional(),
});

// ── Expense ───────────────────────────────────────────────────
const createExpenseSchema = z.object({
  title: z.string().min(1).max(200),
  amount: z.number().positive(),
  category: z.enum(['Packaging', 'Ingredients', 'Marketing', 'Tools', 'Other']).optional(),
  date: z.string().or(z.date()).optional(),
  quantity: z.number().positive().optional(),
  unitPrice: z.number().positive().optional(),
  unit: z.string().max(20).optional(),
});

// ── Investment ────────────────────────────────────────────────
const addInvestmentSchema = z.object({
  investorName: z.string().min(1).max(100),
  amount: z.number(),
  note: z.string().max(500).optional(),
  date: z.string().or(z.date()).optional(),
});

// ── Cost Record ───────────────────────────────────────────────
const createCostRecordSchema = z.object({
  perfumeId: z.string().min(1),
  ingredients: z.array(z.object({
    name: z.string(),
    qty: z.number(),
    unit: z.string(),
    cost: z.number(),
  })).min(1),
  packaging: z.array(z.object({
    name: z.string(),
    qty: z.number(),
    unit: z.string(),
    cost: z.number(),
  })).optional(),
  bottlesProduced: z.number().int().positive(),
  notes: z.string().max(1000).optional(),
});

// ── Validation middleware factory ─────────────────────────────
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
    console.error('❌ Validation failed:', {
      endpoint: req.path,
      method: req.method,
      errors,
      receivedBody: JSON.stringify(req.body, null, 2)
    });
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }
  req.body = result.data;
  next();
};

module.exports = {
  validate,
  signupSchema,
  signinSchema,
  adminLoginSchema,
  adminRegisterSchema,
  createPerfumeSchema,
  updatePerfumeSchema,
  createOrderSchema,
  updateOrderSchema,
  createReviewSchema,
  createCouponSchema,
  createBannerSchema,
  createBundleSchema,
  createExpenseSchema,
  addInvestmentSchema,
  createCostRecordSchema,
};
