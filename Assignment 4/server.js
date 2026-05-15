const express  = require("express");
const mongoose = require("mongoose");
const path     = require("path");
const multer   = require("multer");
const Product  = require("./models/Product");

const app = express();

// ── DB ──
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/adoreheaven";
mongoose.connect(MONGO_URI)
  .then(() => console.log(" MongoDB connected"))
  .catch(err => console.error(" MongoDB error:", err));

// ── Config ──
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ── Method override (for PUT/DELETE from HTML forms) ──
// Only reads from query string — body may not be parsed yet at middleware time
app.use((req, res, next) => {
  const method = (req.query._method || "").toUpperCase();
  if (method === "PUT" || method === "DELETE") {
    req.method = method;
  }
  next();
});

// ── Multer: image upload ──
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "public/uploads"));
  },
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const name = Date.now() + "-" + Math.round(Math.random() * 1e6) + ext;
    cb(null, name);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Only image files are allowed (jpeg, png, webp, gif)."), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// ── Ensure /public/uploads directory exists ──
const fs = require("fs");
const uploadsDir = path.join(__dirname, "public/uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });


// ════════════════════════════════════════════
//   PUBLIC ROUTES
// ════════════════════════════════════════════

// Home
app.get("/", (req, res) => {
  res.render("index");
});

// Products catalog
app.get("/products", async (req, res) => {
  try {
    const PAGE_SIZE = 8;

    const page     = Math.max(1, parseInt(req.query.page) || 1);
    const search   = (req.query.search   || "").trim();
    const category = (req.query.category || "").trim();
    const minPrice = parseFloat(req.query.minPrice) || 0;
    const maxPrice = parseFloat(req.query.maxPrice) || Infinity;
    const sort     = req.query.sort || "default";

    const filter = {};
    if (search)   filter.name     = { $regex: search, $options: "i" };
    if (category) filter.category = category;

    filter.price = {};
    if (minPrice)              filter.price.$gte = minPrice;
    if (maxPrice !== Infinity) filter.price.$lte = maxPrice;
    if (!Object.keys(filter.price).length) delete filter.price;

    const sortMap = {
      price_asc:  { price:  1 },
      price_desc: { price: -1 },
      rating:     { rating: -1 },
      default:    { _id: 1 },
    };
    const sortObj = sortMap[sort] || sortMap.default;

    const total      = await Product.countDocuments(filter);
    const totalPages = Math.ceil(total / PAGE_SIZE);
    const safePage   = Math.min(page, totalPages || 1);

    const products   = await Product.find(filter).sort(sortObj)
      .skip((safePage - 1) * PAGE_SIZE).limit(PAGE_SIZE);

    const categories = await Product.distinct("category");

    res.render("products", {
      products, categories,
      currentPage: safePage, totalPages, total,
      query: { search, category, minPrice: req.query.minPrice || "", maxPrice: req.query.maxPrice || "", sort },
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});


// ════════════════════════════════════════════
//   ADMIN ROUTES
// ════════════════════════════════════════════

// Dashboard
app.get("/admin", async (req, res) => {
  try {
    const PAGE_SIZE = 15;
    const page     = Math.max(1, parseInt(req.query.page) || 1);
    const search   = (req.query.search   || "").trim();
    const category = (req.query.category || "").trim();

    const filter = {};
    if (search)   filter.name     = { $regex: search, $options: "i" };
    if (category) filter.category = category;

    const total      = await Product.countDocuments(filter);
    const totalPages = Math.ceil(total / PAGE_SIZE);
    const safePage   = Math.min(page, totalPages || 1);

    const products   = await Product.find(filter)
      .sort({ _id: -1 })
      .skip((safePage - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE);

    const categories = await Product.distinct("category");
    const lowStock   = await Product.countDocuments({ stock: { $lte: 5, $gt: 0 } });
    const onSale     = await Product.countDocuments({ prevPrice: { $ne: null, $exists: true } });

    res.render("admin/dashboard", {
      products, categories,
      currentPage: safePage, totalPages, total,
      lowStock, onSale,
      query: { search, category },
      success: req.query.success || null,
      error:   req.query.error   || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// New product form
app.get("/admin/products/new", async (req, res) => {
  const categories = await Product.distinct("category");
  res.render("admin/product-form", {
    isEdit: false,
    product: {},
    categories,
    errors: [],
  });
});

// Create product
app.post("/admin/products", upload.single("image"), async (req, res) => {
  const categories = await Product.distinct("category");
  const { name, category, price, prevPrice, stock, rating } = req.body;

  // Validation
  const errors = [];
  if (!name?.trim())     errors.push("Product name is required.");
  if (!category?.trim()) errors.push("Category is required.");
  if (!price || isNaN(price) || Number(price) < 0) errors.push("A valid price is required.");
  if (stock === undefined || isNaN(stock) || Number(stock) < 0) errors.push("A valid stock quantity is required.");

  if (errors.length > 0) {
    return res.render("admin/product-form", {
      isEdit: false, product: req.body, categories, errors,
    });
  }

  try {
    const imagePath = req.file ? "/uploads/" + req.file.filename : "";
    await Product.create({
      name:      name.trim(),
      category:  category.trim(),
      price:     Number(price),
      prevPrice: prevPrice && !isNaN(prevPrice) ? Number(prevPrice) : null,
      stock:     Number(stock),
      rating:    Number(rating) || 4,
      image:     imagePath,
    });
    res.redirect("/admin?success=Product added successfully.");
  } catch (err) {
    console.error(err);
    res.render("admin/product-form", {
      isEdit: false, product: req.body, categories,
      errors: ["Failed to save product. Please try again."],
    });
  }
});

// Edit product form
app.get("/admin/products/:id/edit", async (req, res) => {
  try {
    const product    = await Product.findById(req.params.id);
    const categories = await Product.distinct("category");
    if (!product) return res.redirect("/admin?error=Product not found.");
    res.render("admin/product-form", { isEdit: true, product, categories, errors: [] });
  } catch (err) {
    res.redirect("/admin?error=Invalid product ID.");
  }
});

// Update product
app.put("/admin/products/:id", upload.single("image"), async (req, res) => {
  const { name, category, price, prevPrice, stock, rating } = req.body;

  const errors = [];
  if (!name?.trim())     errors.push("Product name is required.");
  if (!category?.trim()) errors.push("Category is required.");
  if (!price || isNaN(price) || Number(price) < 0) errors.push("A valid price is required.");
  if (stock === undefined || isNaN(stock) || Number(stock) < 0) errors.push("A valid stock quantity is required.");

  if (errors.length > 0) {
    const categories = await Product.distinct("category");
    const product    = await Product.findById(req.params.id).catch(() => req.body);
    return res.render("admin/product-form", { isEdit: true, product, categories, errors });
  }

  try {
    const update = {
      name:      name.trim(),
      category:  category.trim(),
      price:     Number(price),
      prevPrice: prevPrice && !isNaN(prevPrice) ? Number(prevPrice) : null,
      stock:     Number(stock),
      rating:    Number(rating) || 4,
    };
    if (req.file) update.image = "/uploads/" + req.file.filename;

    await Product.findByIdAndUpdate(req.params.id, update, { new: true });
    res.redirect("/admin?success=Product updated successfully.");
  } catch (err) {
    console.error(err);
    res.redirect(`/admin/products/${req.params.id}/edit?error=Update failed.`);
  }
});

// Delete product
app.delete("/admin/products/:id", async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.redirect("/admin?success=Product deleted.");
  } catch (err) {
    console.error(err);
    res.redirect("/admin?error=Delete failed.");
  }
});


// ── Start ──
app.listen(3000, () => console.log("Server running on http://localhost:3000"));