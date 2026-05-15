const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  price:    { type: Number, required: true },
  category: { type: String, required: true },
  rating:   { type: Number, min: 1, max: 5, default: 4 },
  stock:    { type: Number, default: 0 },
  image:    { type: String, default: "" },
  prevPrice:{ type: Number, default: null },
});

module.exports = mongoose.model("Product", productSchema);