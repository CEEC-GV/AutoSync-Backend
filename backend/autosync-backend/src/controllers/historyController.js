const mongoose = require("mongoose");
const ChargingHistory = require("../models/ChargingHistory");
const ChargingStation = require("../models/ChargingStation");
const User = require("../models/User");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const HISTORY_POPULATE = [
  { path: "station", select: "locationName address chargerType" },
  { path: "user", select: "name email" },
];

// CREATE — POST /api/history
// Records a completed session for the logged-in user.
// Admins may record on behalf of anyone by passing userId in the body.
const createHistory = async (req, res) => {
  try {
    const { station, startTime, endTime, energyKwh, price, userId } = req.body;

    if (!station || !startTime || !endTime || energyKwh === undefined || price === undefined) {
      return res.status(400).json({
        message: "station, startTime, endTime, energyKwh and price are all required",
      });
    }

    // Only admins can log a session for someone else
    if (userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can record sessions for other users" });
    }
    const ownerId = userId || req.user.id;

    // Referenced records must actually exist, so history never points at thin air
    if (!isValidId(station) || !(await ChargingStation.findById(station))) {
      return res.status(400).json({ message: "Station not found with the given ID" });
    }
    if (userId && !isValidId(userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }
    if (userId && !(await User.findById(userId))) {
      return res.status(400).json({ message: "User not found with the given ID" });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: "startTime and endTime must be valid dates (ISO 8601, e.g. 2026-09-22T14:30:00Z)" });
    }
    if (end <= start) {
      return res.status(400).json({ message: "endTime must be after startTime" });
    }

    const energy = Number(energyKwh);
    const billed = Number(price);
    if (isNaN(energy) || energy <= 0) {
      return res.status(400).json({ message: "energyKwh must be a positive number" });
    }
    if (isNaN(billed) || billed < 0) {
      return res.status(400).json({ message: "price must be a number of 0 or more" });
    }

    const history = await ChargingHistory.create({
      user: ownerId,
      station,
      startTime: start,
      endTime: end,
      energyKwh: energy,
      price: billed,
    });

    await history.populate(HISTORY_POPULATE);
    res.status(201).json({ message: "Charging session recorded", history });
  } catch (err) {
    res.status(500).json({ message: "Failed to record charging session", error: err.message });
  }
};

// READ — GET /api/history
// Regular users get only their own logs; admins get the system-wide log.
const getHistory = async (req, res) => {
  try {
    const filter = req.user.role === "admin" ? {} : { user: req.user.id };
    const history = await ChargingHistory.find(filter)
      .populate(HISTORY_POPULATE)
      .sort({ startTime: -1 });

    res.status(200).json({
      count: history.length,
      scope: req.user.role === "admin" ? "all users" : "own sessions",
      history,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch charging history", error: err.message });
  }
};

// READ ONE — GET /api/history/:id (a single receipt)
const getHistoryById = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid history ID format" });
    }

    const history = await ChargingHistory.findById(req.params.id).populate(HISTORY_POPULATE);
    if (!history) {
      return res.status(404).json({ message: "Charging record not found" });
    }

    // Users may only open their own receipts; admins can open any
    if (req.user.role !== "admin" && history.user._id.toString() !== req.user.id) {
      return res.status(403).json({ message: "You can only view your own charging history" });
    }

    res.status(200).json({ history });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch charging record", error: err.message });
  }
};

// DELETE — DELETE /api/history/:id (admin only, for removing erroneous records)
// There is intentionally no PUT: history records are immutable for audit integrity.
const deleteHistory = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid history ID format" });
    }

    const history = await ChargingHistory.findById(req.params.id);
    if (!history) {
      return res.status(404).json({ message: "Charging record not found" });
    }

    await history.deleteOne();
    res.status(200).json({ message: "Charging record deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete charging record", error: err.message });
  }
};

module.exports = { createHistory, getHistory, getHistoryById, deleteHistory };
