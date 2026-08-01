const express = require("express");
const Document = require("../models/Document");

const router = express.Router();

// Get all documents
router.get("/", async (req, res) => {
  try {
    const documents = await Document.find()
      .select("filename createdAt")
      .sort({ createdAt: -1 });

    res.json(documents);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch documents",
    });
  }
});

// Get one document by ID
router.get("/:id", async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        message: "Document not found",
      });
    }

    res.json(document);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch document",
    });
  }
});

module.exports = router;