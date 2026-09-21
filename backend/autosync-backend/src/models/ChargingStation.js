const mongoose = require("mongoose");

const chargingStationSchema = new mongoose.Schema(
  {
    locationName: { type: String, required: true, trim: true }, // e.g. "AutoSync Hub - Hitech City"
    address: { type: String, required: true, trim: true },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    chargerType: {
      type: String,
      enum: ["AC", "DC", "AC/DC"],
      required: true,
    },
    numberOfUnits: { type: Number, required: true, min: 1 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChargingStation", chargingStationSchema);
