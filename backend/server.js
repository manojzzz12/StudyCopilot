const express = require("express");
const cors = require("cors");
const multer = require("multer");

const { extractText } = require("./services/pdfService");
const { chunkText } = require("./services/chunkService");
const { generateEmbeddings } = require("./services/embeddingService");
const documents = require("./data/documents");

const app = express();

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

    // Split into chunks
    const chunks = chunkText(text);

    // Generate placeholder embeddings
    const embeddings = await generateEmbeddings(chunks);

    // Store document in memory
    documents.push({
      id: Date.now(),
      filename: req.file.filename,
      text,
      chunks,
      embeddings,
    });

    res.json({
      message: "PDF uploaded successfully",
      filename: req.file.filename,
      totalDocuments: documents.length,
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
  console.log("Server running on port 5000");
});