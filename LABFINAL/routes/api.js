const express    = require("express");
const jwt        = require("jsonwebtoken");
const router     = express.Router();

const Product    = require("../models/Product");
const User       = require("../models/User");
const Order      = require("../models/Order");
const verifyToken = require("../middleware/verifyToken");


//   PUBLIC ENDPOINTS


//  GET /api/v1/products 
// Returns paginated + filtered product list
router.get("/products", async (req, res) => {
  try {
    const PAGE_SIZE = 8;
    const page      = Math.max(1, parseInt(req.query.page) || 1);
    const search    = (req.query.search   || "").trim();
    const category  = (req.query.category || "").trim();
    const minPrice  = parseFloat(req.query.minPrice) || 0;
    const maxPrice  = parseFloat(req.query.maxPrice) || Infinity;
    const sort      = req.query.sort || "default";

    // Build filter object
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
      default:    { _id:    1 },
    };

    const total      = await Product.countDocuments(filter);
    const totalPages = Math.ceil(total / PAGE_SIZE);
    const safePage   = Math.min(page, totalPages || 1);

    const products = await Product.find(filter)
      .sort(sortMap[sort] || sortMap.default)
      .skip((safePage - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE);

    const categories = await Product.distinct("category");

    return res.status(200).json({
      success: true,
      data: {
        products,
        categories,
        pagination: {
          currentPage: safePage,
          totalPages,
          totalProducts: total,
          pageSize: PAGE_SIZE,
        },
        filters: { search, category, minPrice, maxPrice, sort },
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});


//  GET /api/v1/products/:id 
// Returns a single product by ID
router.get("/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: { product },
    });
  } catch (err) {
    // Invalid MongoDB ObjectId format
    if (err.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format.",
      });
    }
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});


//   AUTH ENDPOINT

//  POST /api/v1/auth/login 
// Verifies credentials and returns a JWT token
router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  // Basic validation
  if (!email?.trim() || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required.",
    });
  }

  try {
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Verify user exists and password matches
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Sign JWT with user_id and role in payload
    const token = jwt.sign(
      {
        user_id: user._id,
        role:    user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
    );

    return res.status(200).json({
      success: true,
      message: `Welcome, ${user.name}!`,
      token,
      user: {
        id:    user._id,
        name:  user.name,
        email: user.email,
        role:  user.role,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});


//   PROTECTED ENDPOINTS (JWT required)


//  GET /api/v1/user/profile 
// Returns the authenticated user's profile
router.get("/user/profile", verifyToken, async (req, res) => {
  try {
    // req.user is set by verifyToken middleware
    const user = await User.findById(req.user.user_id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});


//  POST /api/v1/orders 
// Allows a logged-in user to place an order
router.post("/orders", verifyToken, async (req, res) => {
  const { items } = req.body;

  // Validate request body
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Order must contain at least one item. Format: { items: [{ product: id, quantity: n }] }",
    });
  }

  try {
    let totalAmount = 0;
    const validatedItems = [];

    // Validate each item and calculate total
    for (const item of items) {
      if (!item.product || !item.quantity || item.quantity < 1) {
        return res.status(400).json({
          success: false,
          message: "Each item must have a valid product ID and quantity of at least 1.",
        });
      }

      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product with ID ${item.product} not found.`,
        });
      }

      // Check stock availability
      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}`,
        });
      }

      totalAmount += product.price * item.quantity;
      validatedItems.push({ product: product._id, quantity: item.quantity });
    }

    // Create the order
    const order = await Order.create({
      user:        req.user.user_id,
      items:       validatedItems,
      totalAmount,
    });

    // Populate product details in response
    const populatedOrder = await order.populate("items.product", "name price category image");

    return res.status(201).json({
      success: true,
      message: "Order placed successfully.",
      data: { order: populatedOrder },
    });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format in items.",
      });
    }
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});


module.exports = router;