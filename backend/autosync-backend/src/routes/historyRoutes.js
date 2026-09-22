const express = require("express");

const router = express.Router();

const {
  createHistory,
  getHistory,
  getHistoryById,
  deleteHistory,
} = require("../controllers/historyController");

const { protect, adminOnly } = require("../middleware/auth");

// All history routes require a logged-in user; visibility is filtered by role in the controller
router.post("/", protect, createHistory);
router.get("/", protect, getHistory);
router.get("/:id", protect, getHistoryById);

// Only admins may remove erroneous records
router.delete("/:id", protect, adminOnly, deleteHistory);

module.exports = router;
