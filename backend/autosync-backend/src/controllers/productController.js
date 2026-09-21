const Product = require("../models/Product");
const { uploadToGCS, deleteFromGCS } = require("../config/gcs");

// CREATE — POST /api/products
const createProduct = async (req, res) => {
  try {
    const { name, description, category, categoryId, powerRating, basePrice, gst, finalPrice, guns } = req.body;

    if (!name || !category || !powerRating || !basePrice || !gst || !finalPrice) {
      return res.status(400).json({ message: "Missing required product fields" });
    }

    let imageUrl = "";
    if (req.file) {
      imageUrl = await uploadToGCS(req.file.buffer, req.file.originalname, req.file.mimetype);
    }

    const product = await Product.create({
      name,
      description: description || "",
      category, // AC / DC
      categoryId: categoryId || null, // links to a Category document
      powerRating: Number(powerRating),
      basePrice: Number(basePrice),
      gst: Number(gst),
      finalPrice: Number(finalPrice),
      guns: guns ? Number(guns) : 1,
      imageUrl,
      createdBy: req.user.id,
    });

    res.status(201).json({ message: "Product created", product });
  } catch (err) {
    res.status(500).json({ message: "Failed to create product", error: err.message });
  }
};

// READ ALL — GET /api/products
// Supports optional ?categoryId=... to filter by category
const getProducts = async (req, res) => {
  try {
    const filter = {};
    if (req.query.categoryId) filter.categoryId = req.query.categoryId;

    const products = await Product.find(filter)
      .populate("categoryId", "name description")
      .sort({ createdAt: -1 });

    res.status(200).json({ count: products.length, products });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch products", error: err.message });
  }
};

// READ ONE — GET /api/products/:id
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("categoryId", "name description");
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(200).json({ product });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch product", error: err.message });
  }
};

// UPDATE — PUT /api/products/:id
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const fields = ["name", "description", "category", "categoryId", "powerRating", "basePrice", "gst", "finalPrice", "guns", "inStock"];
    fields.forEach((field) => {
      if (req.body[field] !== undefined) product[field] = req.body[field];
    });

    if (req.file) {
      if (product.imageUrl) await deleteFromGCS(product.imageUrl);
      product.imageUrl = await uploadToGCS(req.file.buffer, req.file.originalname, req.file.mimetype);
    }

    await product.save();
    res.status(200).json({ message: "Product updated", product });
  } catch (err) {
    res.status(500).json({ message: "Failed to update product", error: err.message });
  }
};

// DELETE — DELETE /api/products/:id
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.imageUrl) await deleteFromGCS(product.imageUrl);
    await product.deleteOne();

    res.status(200).json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete product", error: err.message });
  }
};

module.exports = { createProduct, getProducts, getProductById, updateProduct, deleteProduct };
