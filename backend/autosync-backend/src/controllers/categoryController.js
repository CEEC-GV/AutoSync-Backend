const Category = require("../models/Category");

// CREATE — POST /api/categories
const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const existing = await Category.findOne({ name });
    if (existing) {
      return res.status(400).json({ message: "A category with this name already exists" });
    }

    const category = await Category.create({ name, description });
    res.status(201).json({ message: "Category created", category });
  } catch (err) {
    res.status(500).json({ message: "Failed to create category", error: err.message });
  }
};

// READ ALL — GET /api/categories
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.status(200).json({ count: categories.length, categories });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch categories", error: err.message });
  }
};

// READ ONE — GET /api/categories/:id
const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    res.status(200).json({ category });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch category", error: err.message });
  }
};

// UPDATE — PUT /api/categories/:id
const updateCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (name !== undefined) category.name = name;
    if (description !== undefined) category.description = description;

    await category.save();
    res.status(200).json({ message: "Category updated", category });
  } catch (err) {
    res.status(500).json({ message: "Failed to update category", error: err.message });
  }
};

// DELETE — DELETE /api/categories/:id
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    await category.deleteOne();
    res.status(200).json({ message: "Category deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete category", error: err.message });
  }
};

module.exports = { createCategory, getCategories, getCategoryById, updateCategory, deleteCategory };
