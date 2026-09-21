const express = require("express");

const router = express.Router();

const {
  createStation,
  getStations,
  getStationById,
  updateStation,
  deleteStation,
} = require("../controllers/stationController");

const { protect, adminOnly } = require("../middleware/auth");

// Anyone logged in can view stations
router.get("/", protect, getStations);
router.get("/:id", protect, getStationById);

// Only admins can add/edit/remove stations
router.post("/", protect, adminOnly, createStation);
router.put("/:id", protect, adminOnly, updateStation);
router.delete("/:id", protect, adminOnly, deleteStation);

module.exports = router;
