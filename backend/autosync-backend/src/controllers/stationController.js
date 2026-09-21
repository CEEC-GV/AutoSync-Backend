const mongoose = require("mongoose");
const ChargingStation = require("../models/ChargingStation");

// Malformed ObjectIds would otherwise crash findById as a 500 — catch them early
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// CREATE — POST /api/stations
const createStation = async (req, res) => {
  try {
    const { locationName, address, latitude, longitude, chargerType, numberOfUnits } = req.body;

    // latitude/longitude of 0 are valid values, so check for undefined, not falsiness
    if (
      !locationName ||
      !address ||
      latitude === undefined ||
      longitude === undefined ||
      !chargerType ||
      numberOfUnits === undefined
    ) {
      return res.status(400).json({
        message:
          "locationName, address, latitude, longitude, chargerType and numberOfUnits are all required",
      });
    }

    const station = await ChargingStation.create({
      locationName,
      address,
      latitude: Number(latitude),
      longitude: Number(longitude),
      chargerType,
      numberOfUnits: Number(numberOfUnits),
    });

    res.status(201).json({ message: "Charging station created", station });
  } catch (err) {
    if (err.name === "ValidationError") {
      // schema-level rules: chargerType enum, lat/long ranges, numberOfUnits >= 1
      return res.status(400).json({ message: "Invalid station data", error: err.message });
    }
    res.status(500).json({ message: "Failed to create station", error: err.message });
  }
};

// READ ALL — GET /api/stations
const getStations = async (req, res) => {
  try {
    const stations = await ChargingStation.find().sort({ createdAt: -1 });
    res.status(200).json({ count: stations.length, stations });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch stations", error: err.message });
  }
};

// READ ONE — GET /api/stations/:id
const getStationById = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid station ID format" });
    }

    const station = await ChargingStation.findById(req.params.id);
    if (!station) {
      return res.status(404).json({ message: "Charging station not found" });
    }
    res.status(200).json({ station });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch station", error: err.message });
  }
};

// UPDATE — PUT /api/stations/:id
const updateStation = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid station ID format" });
    }

    const station = await ChargingStation.findById(req.params.id);
    if (!station) {
      return res.status(404).json({ message: "Charging station not found" });
    }

    const fields = ["locationName", "address", "latitude", "longitude", "chargerType", "numberOfUnits"];
    const numericFields = ["latitude", "longitude", "numberOfUnits"];
    fields.forEach((field) => {
      if (req.body[field] === undefined) return;
      station[field] = numericFields.includes(field) ? Number(req.body[field]) : req.body[field];
    });

    await station.save();
    res.status(200).json({ message: "Charging station updated", station });
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: "Invalid station data", error: err.message });
    }
    res.status(500).json({ message: "Failed to update station", error: err.message });
  }
};

// DELETE — DELETE /api/stations/:id
const deleteStation = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid station ID format" });
    }

    const station = await ChargingStation.findById(req.params.id);
    if (!station) {
      return res.status(404).json({ message: "Charging station not found" });
    }

    await station.deleteOne();
    res.status(200).json({ message: "Charging station deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete station", error: err.message });
  }
};

module.exports = { createStation, getStations, getStationById, updateStation, deleteStation };
