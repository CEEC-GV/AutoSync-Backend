const mongoose = require("mongoose");

const chargingHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }, // whose session this was
    station: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChargingStation",
      required: true,
    }, // where it happened
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    energyKwh: { type: Number, required: true, min: 0.1 }, // total power delivered
    price: { type: Number, required: true, min: 0 }, // final billed cost
  },
  {
    timestamps: true,
    toJSON: { virtuals: true }, // include durationMinutes in JSON responses
  }
);

// Session length in minutes, derived from the timestamps — never stored, can't go stale
chargingHistorySchema.virtual("durationMinutes").get(function () {
  if (!this.startTime || !this.endTime) return null;
  return Math.round((this.endTime - this.startTime) / 60000);
});

module.exports = mongoose.model("ChargingHistory", chargingHistorySchema);
