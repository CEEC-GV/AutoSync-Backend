const mongoose = require("mongoose");
const Product = require("../models/Product");
const Category = require("../models/Category");
const { uploadToGCS, deleteFromGCS } = require("../config/gcs");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// form-data sends every field as a string, so a nested `details` object
// travels as a JSON string — parse it here.
const parseDetails = (raw) => {
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (typeof raw === "object") return raw; // JSON body already parsed
  try {
    return JSON.parse(raw);
  } catch {
    return { __parseFailed: true };
  }
};

// CREATE — POST /api/products (admin, form-data)
const createProduct = async (req, res) => {
  try {
    const { name, description, categoryId, category, powerRating, basePrice, gst, finalPrice, guns, stock, details } = req.body;

    if (!name || !description || !categoryId || basePrice === undefined || gst === undefined || finalPrice === undefined) {
      return res.status(400).json({
        message: "name, description, categoryId, basePrice, gst and finalPrice are all required",
      });
    }

    if (!isValidId(categoryId)) {
      return res.status(400).json({ message: "Invalid categoryId format" });
    }
    const categoryDoc = await Category.findById(categoryId);
    if (!categoryDoc) {
      return res.status(400).json({ message: "Category not found with the given categoryId" });
    }

    const parsedDetails = parseDetails(details);
    if (parsedDetails && parsedDetails.__parseFailed) {
      return res.status(400).json({ message: "details must be valid JSON, e.g. {\"vehicleClass\":\"Car\",\"issuerName\":\"Paytm\"}" });
    }

    const base = Number(basePrice);
    const gstAmount = Number(gst);
    const final = Number(finalPrice);
    if (isNaN(base) || isNaN(gstAmount) || isNaN(final)) {
      return res.status(400).json({ message: "basePrice, gst and finalPrice must be numbers" });
    }

    let imageUrl = "";
    if (req.file) {
      imageUrl = await uploadToGCS(req.file.buffer, req.file.originalname, req.file.mimetype);
    }

    const product = await Product.create({
      name,
      description,
      categoryId,
      category: category || "", // legacy charger-type tag, optional
      powerRating: powerRating !== undefined ? Number(powerRating) : undefined,
      basePrice: base,
      gst: gstAmount,
      finalPrice: final,
      guns: guns ? Number(guns) : 1,
      details: parsedDetails || {},
      stock: stock !== undefined ? Number(stock) : 0,
      imageUrl,
      createdBy: req.user.id,
    });

    res.status(201).json({ message: "Product created", product });
  } catch (err) {
    res.status(500).json({ message: "Failed to create product", error: err.message });
  }
};

// READ ALL — GET /api/products (public)
// Supports ?categoryId=... to filter by category
const getProducts = async (req, res) => {
  try {
    const filter = {};
    if (req.query.categoryId) {
      if (!isValidId(req.query.categoryId)) {
        return res.status(400).json({ message: "Invalid categoryId format" });
      }
      filter.categoryId = req.query.categoryId;
    }

    const products = await Product.find(filter)
      .populate("categoryId", "name description")
      .sort({ createdAt: -1 });

    res.status(200).json({ count: products.length, products });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch products", error: err.message });
  }
};

// READ ONE — GET /api/products/:id (public, category populated)
const getProductById = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid product ID format" });
    }

    const product = await Product.findById(req.params.id).populate("categoryId", "name description");
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(200).json({ product });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch product", error: err.message });
  }
};

// UPDATE — PUT /api/products/:id (admin, form-data)
const updateProduct = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid product ID format" });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Products that predate categories have no categoryId — force assigning one
    // on the first edit, otherwise the save would fail validation with a cryptic error
    if (!product.categoryId && req.body.categoryId === undefined) {
      return res.status(400).json({
        message: "This product has no category assigned yet. Send a categoryId with this update.",
      });
    }

    // If the category is being changed, the new one must exist
    if (req.body.categoryId !== undefined) {
      if (!isValidId(req.body.categoryId)) {
        return res.status(400).json({ message: "Invalid categoryId format" });
      }
      const categoryDoc = await Category.findById(req.body.categoryId);
      if (!categoryDoc) {
        return res.status(400).json({ message: "Category not found with the given categoryId" });
      }
      product.categoryId = req.body.categoryId;
    }

    const fields = ["name", "description", "category", "powerRating", "basePrice", "gst", "finalPrice", "guns", "stock", "inStock"];
    const numericFields = ["powerRating", "basePrice", "gst", "finalPrice", "guns", "stock"];
    fields.forEach((field) => {
      if (req.body[field] === undefined) return;
      product[field] = numericFields.includes(field) ? Number(req.body[field]) : req.body[field];
    });

    // details is replaced as a whole object when provided
    const parsedDetails = parseDetails(req.body.details);
    if (parsedDetails && parsedDetails.__parseFailed) {
      return res.status(400).json({ message: "details must be valid JSON" });
    }
    if (parsedDetails) {
      product.details = parsedDetails;
    }

    // If a new image was uploaded, replace the old one
    if (req.file) {
      if (product.imageUrl) await deleteFromGCS(product.imageUrl);
      product.imageUrl = await uploadToGCS(req.file.buffer, req.file.originalname, req.file.mimetype);
    }

    await product.save();
    await product.populate("categoryId", "name description");
    res.status(200).json({ message: "Product updated", product });
  } catch (err) {
    res.status(500).json({ message: "Failed to update product", error: err.message });
  }
};

// DELETE — DELETE /api/products/:id (admin)
const deleteProduct = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid product ID format" });
    }

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
