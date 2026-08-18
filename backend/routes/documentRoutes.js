const express = require("express");
const fs = require("fs");
const mongoose = require("mongoose");
const path = require("path");
const Document = require("../models/Document");

const router = express.Router();
const uploadsDir = path.resolve(__dirname, "..", "uploads");

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

// Serve the PDF associated with a stored document only.
router.get("/:id/file", async (req, res) => {
  try {
    const document = await Document.findById(req.params.id).select("filename");

    if (!document) {
      return res.status(404).json({
        message: "Document not found",
      });
    }

    const filename = path.basename(document.filename);
    const filePath = path.resolve(uploadsDir, filename);

    if (
      filename !== document.filename ||
      !filePath.startsWith(`${uploadsDir}${path.sep}`) ||
      !fs.existsSync(filePath)
    ) {
      return res.status(404).json({
        message: "Uploaded PDF file not found",
      });
    }

    res.type("application/pdf");
    res.sendFile(filePath);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to open document file",
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

// Delete a document and its associated uploaded PDF.
router.delete("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({
      message: "Invalid document ID",
    });
  }

  try {
    const document = await Document.findById(req.params.id).select("filename");

    if (!document) {
      return res.status(404).json({
        message: "Document not found",
      });
    }

    const filename = path.basename(document.filename);
    const filePath = path.resolve(uploadsDir, filename);

    if (
      filename !== document.filename ||
      !filePath.startsWith(`${uploadsDir}${path.sep}`)
    ) {
      return res.status(400).json({
        message: "Invalid document file path",
      });
    }

    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }

    await document.deleteOne();

    res.json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to delete document",
    });
  }
});

module.exports = router;
