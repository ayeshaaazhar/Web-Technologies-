const express  = require("express");
const mongoose = require("mongoose");
const Product  = require("./models/Product");

const app = express();

// DB 
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/adoreheaven";
mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB error:", err));

//  Config 
app.set("view engine", "ejs");
app.use(express.static("public"));

// Routes 

// Home
app.get("/", (req, res) => {
  res.render("index");
});

// Products catalog
app.get("/products", async (req, res) => {
  try {
    const PAGE_SIZE = 8;

    // Query params 
    const page     = Math.max(1, parseInt(req.query.page)    || 1);
    const search   = (req.query.search   || "").trim();
    const category = (req.query.category || "").trim();
    const minPrice = parseFloat(req.query.minPrice) || 0;
    const maxPrice = parseFloat(req.query.maxPrice) || Infinity;
    const sort     = req.query.sort || "default";          // price_asc | price_desc | rating | default

    // Build filter 
    const filter = {};

    if (search)   filter.name     = { $regex: search, $options: "i" };
    if (category) filter.category = category;

    // Price range
    filter.price = {};
    if (minPrice)              filter.price.$gte = minPrice;
    if (maxPrice !== Infinity) filter.price.$lte = maxPrice;
    if (!Object.keys(filter.price).length) delete filter.price;

    // Sort 
    const sortMap = {
      price_asc:  { price:  1 },
      price_desc: { price: -1 },
      rating:     { rating: -1 },
      default:    { _id: 1 },
    };
    const sortObj = sortMap[sort] || sortMap.default;

    //  Pagination 
    const total      = await Product.countDocuments(filter);
    const totalPages = Math.ceil(total / PAGE_SIZE);
    const safePage   = Math.min(page, totalPages || 1);

    console.log("Filter:", JSON.stringify(filter));
    console.log("Sort:", JSON.stringify(sortObj));

    const products = await Product
      .find(filter)
      .sort(sortObj)
      .skip((safePage - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE);

    //  Categories for filter dropdown 
    const categories = await Product.distinct("category");

    res.render("products", {
      products,
      categories,
      currentPage: safePage,
      totalPages,
      total,
      // pass query params back so form stays filled
      query: { search, category, minPrice: req.query.minPrice || "", maxPrice: req.query.maxPrice || "", sort },
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Start 
app.listen(3000, () => console.log("Server running on http://localhost:3000"));