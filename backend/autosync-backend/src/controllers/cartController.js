const mongoose = require("mongoose");
const Cart = require("../models/Cart");
const Product = require("../models/Product");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Product fields worth sending back to a cart UI
const CART_POPULATE = { path: "items.product", select: "name category powerRating finalPrice imageUrl inStock" };

// One active cart per user — created lazily on first use, so users
// who never shop never get a cart document.
const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
};

// Convenience totals computed from the populated cart
const cartTotals = (cart) => {
  const itemCount = cart.items.length;
  const cartTotal = cart.items.reduce(
    (sum, item) => sum + (item.product?.finalPrice || 0) * item.quantity,
    0
  );
  return { itemCount, cartTotal };
};

// GET /api/cart — current user's cart with real product details
const getCart = async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user.id);
    await cart.populate(CART_POPULATE);
    res.status(200).json({ cart, ...cartTotals(cart) });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch cart", error: err.message });
  }
};

// POST /api/cart/add — body: { productId, quantity? }
// Already in cart → increment quantity and refresh addedAt (per spec).
const addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId || !isValidId(productId)) {
      return res.status(400).json({ message: "A valid productId is required" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    if (product.inStock === false) {
      return res.status(400).json({ message: "This product is out of stock" });
    }

    let qty = 1;
    if (quantity !== undefined) {
      qty = Number(quantity);
      if (isNaN(qty) || qty < 1) {
        return res.status(400).json({ message: "quantity must be a number of at least 1" });
      }
    }

    const cart = await getOrCreateCart(req.user.id);
    const existing = cart.items.find((item) => item.product.toString() === productId);

    if (existing) {
      existing.quantity += qty;
      existing.addedAt = new Date(); // explicitly track the re-add time
    } else {
      cart.items.push({ product: productId, quantity: qty, addedAt: new Date() });
    }

    await cart.save();
    await cart.populate(CART_POPULATE);

    res.status(200).json({
      message: existing ? "Product quantity updated in cart" : "Product added to cart",
      cart,
      ...cartTotals(cart),
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to add to cart", error: err.message });
  }
};

// DELETE /api/cart/remove/:productId — removes that product from the cart completely
const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!isValidId(productId)) {
      return res.status(400).json({ message: "Invalid product ID format" });
    }

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart || !cart.items.some((item) => item.product.toString() === productId)) {
      return res.status(404).json({ message: "This product is not in your cart" });
    }

    cart.items = cart.items.filter((item) => item.product.toString() !== productId);
    await cart.save();
    await cart.populate(CART_POPULATE);

    res.status(200).json({ message: "Product removed from cart", cart, ...cartTotals(cart) });
  } catch (err) {
    res.status(500).json({ message: "Failed to remove from cart", error: err.message });
  }
};

// DELETE /api/cart/clear — empties the cart entirely
const clearCart = async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user.id);
    cart.items = [];
    await cart.save();

    res.status(200).json({ message: "Cart cleared", cart, itemCount: 0, cartTotal: 0 });
  } catch (err) {
    res.status(500).json({ message: "Failed to clear cart", error: err.message });
  }
};

module.exports = { getCart, addToCart, removeFromCart, clearCart };
