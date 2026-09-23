const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    }, // which catalog category this belongs to: Fastag, Air purifier, GPS, EV charger, Auto IOT devices, Number plate frame
    category: {
      type: String,
      enum: ["", "AC", "DC", "Electronics"], // "" = not tagged (default) — enum must include it or validation rejects the empty string
      default: "",
    }, // LEGACY: old charger-type tag, kept optional so existing records still validate on save
    powerRating: { type: Number }, // kW — only meaningful for chargers and powered devices
    basePrice: { type: Number, required: true },
    gst: { type: Number, required: true },
    finalPrice: { type: Number, required: true }, // the billed price — what cart and orders use
    guns: { type: Number, default: 1 }, // charger-specific, optional for other categories
    details: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    }, // category-specific attributes, e.g. Fastag: { vehicleClass, issuerName }, GPS: { screenSize, connectivity }
    stock: { type: Number, default: 0, min: 0 }, // inventory count
    imageUrl: { type: String, default: "" }, // GCS public URL
    inStock: { type: Boolean, default: true }, // quick flag the cart checks
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
