const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }, // who placed the order
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        // Snapshot of the product name so order history survives product deletion
        productName: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        // Exact per-unit price at purchase time — later price changes never rewrite history
        priceAtPurchase: { type: Number, required: true, min: 0 },
      },
    ],
    shippingAddress: {
      street: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
      postalCode: { type: String, required: true, trim: true },
      country: { type: String, required: true, trim: true },
    },
    totalPrice: { type: Number, required: true, min: 0 }, // calculated at checkout
    status: {
      type: String,
      enum: ["Pending", "Processing", "Shipped", "Delivered"],
      default: "Pending",
    },
  },
  { timestamps: true } // createdAt = when the order was placed
);

module.exports = mongoose.model("Order", orderSchema);
