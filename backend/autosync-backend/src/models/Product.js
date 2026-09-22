const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    category: {
      type: String,
      enum: ["AC", "DC", "Electronics"],
      required: true,
    }, // AC/DC = charger type; Electronics = non-charger products (e.g. air purifiers)
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    }, // NEW: links to a real Category (e.g. "Home Charging", "Fast Charging")
    powerRating: { type: Number, required: true },
    basePrice: { type: Number, required: true },
    gst: { type: Number, required: true },
    finalPrice: { type: Number, required: true },
    guns: { type: Number, default: 1 },
    imageUrl: { type: String, default: "" },
    inStock: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
