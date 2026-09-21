const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true }, // e.g. "Home Charging", "Fast Charging"
    description: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", categorySchema);
