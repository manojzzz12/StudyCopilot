const express = require("express");
const router = express.Router();

const Document = require("../models/Document");
const { chatWithDocument } = require("../services/chatService");

router.post("/", async (req, res) => {
  try {
    const { question, documentId, history = [] } = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        message: "Question is required",
      });
    }

    let document;

    if (documentId) {
      document = await Document.findById(documentId);
    } else {
      document = await Document.findOne().sort({
        createdAt: -1,
      });
    }

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "No document found. Please upload a PDF first.",
      });
    }

    // Pass the ENTIRE document
    const { answer, sources } = await chatWithDocument(
      question,
      document,
      history
    );

    res.json({
      success: true,
      answer,
      sources,
      filename: document.filename,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to generate answer",
      error: error.message,
    });
  }
});

module.exports = router;
