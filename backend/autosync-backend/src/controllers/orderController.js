const mongoose = require("mongoose");
const Order = require("../models/Order");
const Cart = require("../models/Cart");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const ORDER_POPULATE = [
  { path: "user", select: "name email" },
  { path: "items.product", select: "name imageUrl" }, // display info only; prices come from the snapshot
];

const REQUIRED_ADDRESS_FIELDS = ["street", "city", "state", "postalCode", "country"];

// POST /api/orders — checkout
// Pulls the user's cart, snapshots prices, saves the order, clears the cart.
const createOrder = async (req, res) => {
  try {
    const { shippingAddress } = req.body;

    if (!shippingAddress || typeof shippingAddress !== "object") {
      return res.status(400).json({
        message: "shippingAddress is required with street, city, state, postalCode and country",
      });
    }

    const missing = REQUIRED_ADDRESS_FIELDS.filter(
      (field) => !shippingAddress[field] || !String(shippingAddress[field]).trim()
    );
    if (missing.length > 0) {
      return res.status(400).json({ message: `Missing shipping address fields: ${missing.join(", ")}` });
    }

    const cart = await Cart.findOne({ user: req.user.id }).populate("items.product");
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Your cart is empty. Add products before checkout." });
    }

    // If a product was deleted after being added to the cart, refuse checkout
    // instead of saving an order with a broken reference
    if (cart.items.some((item) => !item.product)) {
      return res.status(400).json({
        message: "A product in your cart no longer exists. Remove it and try again.",
      });
    }

    // Snapshot: product reference + quantity + exact per-unit price at this moment
    const items = cart.items.map((item) => ({
      product: item.product._id,
      productName: item.product.name,
      quantity: item.quantity,
      priceAtPurchase: item.product.finalPrice,
    }));

    const totalPrice = items.reduce((sum, item) => sum + item.priceAtPurchase * item.quantity, 0);

    const order = await Order.create({
      user: req.user.id,
      items,
      shippingAddress,
      totalPrice, // status defaults to "Pending"
    });

    // Checkout completed — empty the cart (spec requirement)
    cart.items = [];
    await cart.save();

    await order.populate(ORDER_POPULATE);
    res.status(201).json({ message: "Order placed successfully", order });
  } catch (err) {
    res.status(500).json({ message: "Failed to place order", error: err.message });
  }
};

// GET /api/orders/my-orders — current user's order history, newest first
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate(ORDER_POPULATE)
      .sort({ createdAt: -1 });

    res.status(200).json({ count: orders.length, orders });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch orders", error: err.message });
  }
};

// GET /api/orders — admin only: system-wide order list for reporting
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate(ORDER_POPULATE).sort({ createdAt: -1 });
    res.status(200).json({ count: orders.length, orders });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch orders", error: err.message });
  }
};

// GET /api/orders/:id — the order's owner, or any admin
const getOrderById = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid order ID format" });
    }

    const order = await Order.findById(req.params.id).populate(ORDER_POPULATE);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (req.user.role !== "admin" && order.user._id.toString() !== req.user.id) {
      return res.status(403).json({ message: "You can only view your own orders" });
    }

    res.status(200).json({ order });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch order", error: err.message });
  }
};

// PUT /api/orders/:id/status — admin only: move an order through its lifecycle
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["Pending", "Processing", "Shipped", "Delivered"];

    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ message: `status must be one of: ${allowed.join(", ")}` });
    }

    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid order ID format" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.status = status;
    await order.save();
    await order.populate(ORDER_POPULATE);

    res.status(200).json({ message: `Order status updated to ${status}`, order });
  } catch (err) {
    res.status(500).json({ message: "Failed to update order status", error: err.message });
  }
};

module.exports = { createOrder, getMyOrders, getAllOrders, getOrderById, updateOrderStatus };
