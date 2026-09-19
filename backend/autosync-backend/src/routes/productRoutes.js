const express = require("express");

const router = express.Router();

const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

const { protect, adminOnly } = require("../middleware/auth");

const upload = require("../middleware/upload");

// Anyone can view products
router.get("/", getProducts);
router.get("/:id", getProductById);

// Only admins can add/edit/remove products
router.post(
  "/",
  protect,
  adminOnly,
  upload.single("image"),
  createProduct
);

router.put(
  "/:id",
  protect,
  adminOnly,
  upload.single("image"),
  updateProduct
);

router.delete(
  "/:id",
  protect,
  adminOnly,
  deleteProduct
);

module.exports = router;