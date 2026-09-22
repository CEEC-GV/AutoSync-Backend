const express = require("express");

const router = express.Router();

const {
  createOrder,
  getMyOrders,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
} = require("../controllers/orderController");
const { protect, adminOnly } = require("../middleware/auth");

// All order routes require a logged-in user
router.post("/", protect, createOrder);
router.get("/my-orders", protect, getMyOrders); // must be registered before /:id

// Admin-only reporting and lifecycle management
router.get("/", protect, adminOnly, getAllOrders);
router.put("/:id/status", protect, adminOnly, updateOrderStatus);

// Owner-or-admin access, enforced in the controller
router.get("/:id", protect, getOrderById);

module.exports = router;
