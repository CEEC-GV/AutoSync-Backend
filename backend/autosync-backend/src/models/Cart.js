const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // enforces one active cart per user at the DB level
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: { type: Number, default: 1, min: 1 },
        addedAt: { type: Date, default: Date.now }, // when THIS product was added/re-added
      },
    ],
  },
  { timestamps: true } // overall cart creation and last update
);

module.exports = mongoose.model("Cart", cartSchema);
