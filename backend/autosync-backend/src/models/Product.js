const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g. "AC001", "Type2 22kW"
    description: { type: String, default: "" },
    category: {
      type: String,
      enum: ["AC", "DC"],
      required: true,
    },
    powerRating: { type: Number, required: true }, // in kW, e.g. 3.3, 7.4, 22, 60
    basePrice: { type: Number, required: true },
    gst: { type: Number, required: true },
    finalPrice: { type: Number, required: true },
    guns: { type: Number, default: 1 }, // single/dual gun
    imageUrl: { type: String, default: "" }, // GCS public URL
    inStock: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
