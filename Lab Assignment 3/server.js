const express      = require("express");
const mongoose     = require("mongoose");
const path         = require("path");
const fs           = require("fs");
const multer       = require("multer");
const session      = require("express-session");
const MongoStore   = require("connect-mongo");
const flash        = require("connect-flash");

const Product      = require("./models/Product");
const User         = require("./models/User");
const { isLoggedIn, isAdmin } = require("./middleware/auth");

const app = express();

//  DB 
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/adoreheaven";
mongoose.connect(MONGO_URI)
  .then(() => console.log(" MongoDB connected"))
  .catch(err => console.error(" MongoDB error:", err));

// ── Config ──
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ── Method override ──
app.use((req, res, next) => {
  const method = (req.query._method || "").toUpperCase();
  if (method === "PUT" || method === "DELETE") req.method = method;
  next();
});

//  Sessions 
app.use(session({
  secret: process.env.SESSION_SECRET || "adoreheaven-secret-key-change-in-prod",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGO_URI }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 },
}));

// ── Flash ──
app.use(flash());

//  Global locals (currentUser + flash msgs in every template) 
app.use(async (req, res, next) => {
  res.locals.currentUser = null;
  if (req.session.userId) {
    try {
      res.locals.currentUser = await User.findById(req.session.userId).select("-password");
    } catch (e) {}
  }
  res.locals.messages = {
    success: req.flash("success"),
    error:   req.flash("error"),
    info:    req.flash("info"),
  };
  next();
});

//  Multer 
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "public/uploads")),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + "-" + Math.round(Math.random() * 1e6) + ext);
  },
});
const fileFilter = (req, file, cb) => {
  ["image/jpeg","image/png","image/webp","image/gif"].includes(file.mimetype)
    ? cb(null, true) : cb(new Error("Only image files are allowed."), false);
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

const uploadsDir = path.join(__dirname, "public/uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

//   AUTH ROUTES


app.get("/register", (req, res) => {
  if (req.session.userId) return res.redirect("/");
  res.render("register", { formData: {} });
});

app.post("/register", async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;

  if (!name?.trim() || !email?.trim() || !password) {
    req.flash("error", "All fields are required.");
    return res.render("register", { formData: { name, email } });
  }
  if (password.length < 6) {
    req.flash("error", "Password must be at least 6 characters.");
    return res.render("register", { formData: { name, email } });
  }
  if (password !== confirmPassword) {
    req.flash("error", "Passwords do not match.");
    return res.render("register", { formData: { name, email } });
  }

  try {
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      req.flash("error", "An account with that email already exists.");
      return res.render("register", { formData: { name, email } });
    }
    const user = await User.create({ name: name.trim(), email, password });
    req.session.userId   = user._id;
    req.session.userRole = user.role;
    req.flash("success", `Welcome to Adore Heaven, ${user.name.split(" ")[0]}! 💎`);
    res.redirect("/");
  } catch (err) {
    console.error(err);
    req.flash("error", "Registration failed. Please try again.");
    res.render("register", { formData: { name, email } });
  }
});

app.get("/login", (req, res) => {
  if (req.session.userId) return res.redirect("/");
  res.render("login", { formData: {} });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email?.trim() || !password) {
    req.flash("error", "Please enter your email and password.");
    return res.render("login", { formData: { email } });
  }
  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !(await user.comparePassword(password))) {
      req.flash("error", "Invalid email or password.");
      return res.render("login", { formData: { email } });
    }
    req.session.userId   = user._id;
    req.session.userRole = user.role;
    req.flash("success", `Welcome back, ${user.name.split(" ")[0]}! 💎`);
    res.redirect(user.role === "admin" ? "/admin" : "/");
  } catch (err) {
    console.error(err);
    req.flash("error", "Login failed. Please try again.");
    res.render("login", { formData: { email } });
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});


//   PUBLIC ROUTES


app.get("/", (req, res) => {
  res.render("index");
});

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
      price_asc: {price:1}, price_desc: {price:-1}, rating: {rating:-1}, default: {_id:1}
    };
    const total      = await Product.countDocuments(filter);
    const totalPages = Math.ceil(total / PAGE_SIZE);
    const safePage   = Math.min(page, totalPages || 1);
    const products   = await Product.find(filter)
      .sort(sortMap[sort] || sortMap.default)
      .skip((safePage - 1) * PAGE_SIZE).limit(PAGE_SIZE);
    const categories = await Product.distinct("category");

    res.render("products", {
      products, categories, currentPage: safePage, totalPages, total,
      query: { search, category, minPrice: req.query.minPrice || "", maxPrice: req.query.maxPrice || "", sort },
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Checkout (must be logged in)
app.get("/checkout", isLoggedIn, (req, res) => {
  res.send("Checkout page — coming soon!");
});


//   ADMIN ROUTES  (isAdmin middleware on every route)


app.get("/admin", isAdmin, async (req, res) => {
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
      .sort({ _id: -1 }).skip((safePage - 1) * PAGE_SIZE).limit(PAGE_SIZE);
    const categories = await Product.distinct("category");
    const lowStock   = await Product.countDocuments({ stock: { $lte: 5, $gt: 0 } });
    const onSale     = await Product.countDocuments({ prevPrice: { $ne: null, $exists: true } });

    const flashSuccess = req.flash("success");
    const flashError   = req.flash("error");

    res.render("admin/dashboard", {
      products, categories, currentPage: safePage, totalPages, total,
      lowStock, onSale, query: { search, category },
      success: flashSuccess.length ? flashSuccess[0] : (req.query.success || null),
      error:   flashError.length   ? flashError[0]   : (req.query.error   || null),
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

app.get("/admin/products/new", isAdmin, async (req, res) => {
  const categories = await Product.distinct("category");
  res.render("admin/product-form", { isEdit: false, product: {}, categories, errors: [] });
});

app.post("/admin/products", isAdmin, upload.single("image"), async (req, res) => {
  const categories = await Product.distinct("category");
  const { name, category, price, prevPrice, stock, rating } = req.body;
  const errors = [];
  if (!name?.trim())     errors.push("Product name is required.");
  if (!category?.trim()) errors.push("Category is required.");
  if (!price || isNaN(price) || Number(price) < 0) errors.push("A valid price is required.");
  if (stock === undefined || isNaN(stock) || Number(stock) < 0) errors.push("A valid stock quantity is required.");
  if (errors.length > 0) return res.render("admin/product-form", { isEdit: false, product: req.body, categories, errors });

  try {
    await Product.create({
      name: name.trim(), category: category.trim(),
      price: Number(price),
      prevPrice: prevPrice && !isNaN(prevPrice) ? Number(prevPrice) : null,
      stock: Number(stock), rating: Number(rating) || 4,
      image: req.file ? "/uploads/" + req.file.filename : "",
    });
    req.flash("success", "Product added successfully.");
    res.redirect("/admin");
  } catch (err) {
    console.error(err);
    res.render("admin/product-form", { isEdit: false, product: req.body, categories, errors: ["Failed to save product."] });
  }
});

app.get("/admin/products/:id/edit", isAdmin, async (req, res) => {
  try {
    const product    = await Product.findById(req.params.id);
    const categories = await Product.distinct("category");
    if (!product) { req.flash("error", "Product not found."); return res.redirect("/admin"); }
    res.render("admin/product-form", { isEdit: true, product, categories, errors: [] });
  } catch (err) {
    req.flash("error", "Invalid product ID.");
    res.redirect("/admin");
  }
});

app.put("/admin/products/:id", isAdmin, upload.single("image"), async (req, res) => {
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
      name: name.trim(), category: category.trim(), price: Number(price),
      prevPrice: prevPrice && !isNaN(prevPrice) ? Number(prevPrice) : null,
      stock: Number(stock), rating: Number(rating) || 4,
    };
    if (req.file) update.image = "/uploads/" + req.file.filename;
    await Product.findByIdAndUpdate(req.params.id, update, { new: true });
    req.flash("success", "Product updated successfully.");
    res.redirect("/admin");
  } catch (err) {
    console.error(err);
    req.flash("error", "Update failed.");
    res.redirect(`/admin/products/${req.params.id}/edit`);
  }
});

app.delete("/admin/products/:id", isAdmin, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    req.flash("success", "Product deleted.");
    res.redirect("/admin");
  } catch (err) {
    console.error(err);
    req.flash("error", "Delete failed.");
    res.redirect("/admin");
  }
});

app.listen(3000, () => console.log(" Server running on http://localhost:3000"));