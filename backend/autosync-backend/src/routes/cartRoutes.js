const express = require("express");

const router = express.Router();

const { getCart, addToCart, removeFromCart, clearCart } = require("../controllers/cartController");
const { protect } = require("../middleware/auth");

// Every cart route belongs to the logged-in user — no admin concept here
router.get("/", protect, getCart);
router.post("/add", protect, addToCart);
router.delete("/remove/:productId", protect, removeFromCart);
router.delete("/clear", protect, clearCart);

module.exports = router;
