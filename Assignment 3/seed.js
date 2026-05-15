// seed.js  –  run once:  node seed.js
const mongoose = require("mongoose");
const Product  = require("./models/Product");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/adoreheaven";

const products = [
  // Necklaces
  { name: "Violet Crescent Necklace",   price: 1945, prevPrice: 3100, category: "Necklaces",  rating: 5, stock: 12, image: "/Assests/img7.jpeg"  },
  { name: "Serene Glow Necklace",       price: 1945, prevPrice: 3100, category: "Necklaces",  rating: 5, stock: 8,  image: "/Assests/18.jpeg"    },
  { name: "Evelyn Bow Necklace",        price: 2150, prevPrice: 2650, category: "Necklaces",  rating: 4, stock: 15, image: "/Assests/19.jpeg"    },
  { name: "Dainty Love Heart Necklace", price: 2550, prevPrice: 2750, category: "Necklaces",  rating: 5, stock: 6,  image: "/Assests/20.jpeg"    },
  { name: "Mini Flower Necklace",       price: 2450, prevPrice: 2600, category: "Necklaces",  rating: 4, stock: 20, image: "/Assests/21.jpeg"    },
  { name: "Skyflower Necklace",         price: 1945, prevPrice: 3100, category: "Necklaces",  rating: 5, stock: 10, image: "/Assests/22.jpeg"    },
  { name: "Pearl Drop Necklace",        price: 2800, prevPrice: 3500, category: "Necklaces",  rating: 4, stock: 5,  image: "/Assests/img7.jpeg"  },
  { name: "Gold Chain Necklace",        price: 3200, prevPrice: null, category: "Necklaces",  rating: 5, stock: 9,  image: "/Assests/18.jpeg"    },

  // Earrings
  { name: "Crystal Huggie Earrings",    price: 1200, prevPrice: 1800, category: "Earrings",   rating: 5, stock: 25, image: "/Assests/img6.jpeg"  },
  { name: "Pearl Stud Earrings",        price: 950,  prevPrice: 1400, category: "Earrings",   rating: 4, stock: 30, image: "/Assests/img6.jpeg"  },
  { name: "Butterfly Drop Earrings",    price: 1650, prevPrice: 2200, category: "Earrings",   rating: 5, stock: 18, image: "/Assests/img6.jpeg"  },
  { name: "Gold Hoop Earrings",         price: 1800, prevPrice: null, category: "Earrings",   rating: 4, stock: 14, image: "/Assests/img6.jpeg"  },
  { name: "Daisy Stud Earrings",        price: 850,  prevPrice: 1200, category: "Earrings",   rating: 3, stock: 40, image: "/Assests/img6.jpeg"  },
  { name: "Rose Gold Dangle Earrings",  price: 2100, prevPrice: 2800, category: "Earrings",   rating: 5, stock: 7,  image: "/Assests/img6.jpeg"  },

  // Rings
  { name: "Twisted Band Ring",          price: 1500, prevPrice: 2000, category: "Rings",      rating: 4, stock: 22, image: "/Assests/img3.jpeg"  },
  { name: "Gemstone Solitaire Ring",    price: 3500, prevPrice: 4500, category: "Rings",      rating: 5, stock: 4,  image: "/Assests/img5.jpeg"  },
  { name: "Stacking Rings Set",         price: 2200, prevPrice: 2900, category: "Rings",      rating: 5, stock: 11, image: "/Assests/img3.jpeg"  },
  { name: "Floral Midi Ring",           price: 950,  prevPrice: null, category: "Rings",      rating: 4, stock: 35, image: "/Assests/img5.jpeg"  },

  // Bracelets
  { name: "Charm Bracelet",             price: 2400, prevPrice: 3200, category: "Bracelets",  rating: 5, stock: 16, image: "/Assests/img4.jpeg"  },
  { name: "Pearl Bangle",               price: 1750, prevPrice: 2400, category: "Bracelets",  rating: 4, stock: 9,  image: "/Assests/img14.jpeg" },
  { name: "Gold Tennis Bracelet",       price: 4200, prevPrice: 5500, category: "Bracelets",  rating: 5, stock: 3,  image: "/Assests/img13.jpeg" },
  { name: "Beaded Friendship Bracelet", price: 750,  prevPrice: null, category: "Bracelets",  rating: 3, stock: 50, image: "/Assests/img4.jpeg"  },

  // Pandora Inspired
  { name: "Pandora Heart Charm",        price: 1600, prevPrice: 2100, category: "Pandora Inspired", rating: 5, stock: 20, image: "/Assests/img5.jpeg"  },
  { name: "Pandora Floral Bangle",      price: 3200, prevPrice: 4000, category: "Pandora Inspired", rating: 5, stock: 8,  image: "/Assests/img4.jpeg"  },
  { name: "Pandora Star Necklace",      price: 2600, prevPrice: 3400, category: "Pandora Inspired", rating: 4, stock: 12, image: "/Assests/22.jpeg"    },

  // Accessories
  { name: "Jewelry Gift Box",           price: 199,  prevPrice: null, category: "Accessories", rating: 4, stock: 100, image: "/Assests/17.jpeg" },
  { name: "Jewelry Cleaning Kit",       price: 499,  prevPrice: 699,  category: "Accessories", rating: 4, stock: 60,  image: "/Assests/careins.jpeg" },
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  await Product.deleteMany({});
  await Product.insertMany(products);
  console.log(` Seeded ${products.length} products`);
  await mongoose.disconnect();
}

seed().catch(console.error);
