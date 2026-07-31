const express = require("express");
const cors = require("cors");
const multer = require("multer");

const connectDB = require("./config/db");
const Document = require("./models/Document");

const { extractText } = require("./services/pdfService");
const { chunkText } = require("./services/chunkService");
const { generateEmbeddings } = require("./services/embeddingService");

const app = express();

// Connect to MongoDB
connectDB();

app.use(cors());
app.use(express.json());

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// Test Route
app.get("/api/message", (req, res) => {
  res.json({
    message: "Hello from StudyCopilot Backend!",
  });
});

// Ask Question Route
app.post("/api/ask", (req, res) => {
  const question = req.body.question;

  res.json({
    answer: `You asked: ${question}`,
  });
});

// Upload PDF Route
app.post("/api/upload", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No PDF uploaded",
      });
    }

    const filePath = req.file.path;

    // Extract text
    const text = await extractText(filePath);

    // Create chunks
    const chunks = chunkText(text);

    // Generate placeholder embeddings
    const embeddings = await generateEmbeddings(chunks);

    // Save document to MongoDB
    const savedDocument = await Document.create({
      filename: req.file.filename,
      text,
      chunks,
      embeddings,
    });

    // Count total documents in database
    const totalDocuments = await Document.countDocuments();

    res.json({
      message: "PDF uploaded successfully",
      documentId: savedDocument._id,
      filename: savedDocument.filename,
      totalDocuments,
      totalChunks: chunks.length,
      totalEmbeddings: embeddings.length,
      firstChunk: chunks[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to process PDF",
    });
  }
});

// Start Server
app.listen(5000, () => {
  console.log("🚀 Server running on port 5000");
});