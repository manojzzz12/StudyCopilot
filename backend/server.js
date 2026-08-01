require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");

const connectDB = require("./config/db");
const Document = require("./models/Document");
const documentRoutes = require("./routes/documentRoutes");

const groq = require("./services/aiService");

const { extractText } = require("./services/pdfService");
const { chunkText } = require("./services/chunkService");
const { generateEmbeddings } = require("./services/embeddingService");

const app = express();

// Connect to MongoDB
connectDB();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/documents", documentRoutes);

// Multer Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// Backend Test
app.get("/api/message", (req, res) => {
  res.json({
    message: "Hello from StudyCopilot Backend!",
  });
});

// ------------------------
// Groq Test Route
// ------------------------
app.get("/api/test-ai", async (req, res) => {
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: "Say hello in one sentence.",
        },
      ],
    });

    res.json({
      success: true,
      reply: completion.choices[0].message.content,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to connect to Groq",
      error: error.message,
    });
  }
});

// Ask Question
app.post("/api/ask", (req, res) => {
  const { question } = req.body;

  res.json({
    answer: `You asked: ${question}`,
  });
});

// Upload PDF
app.post("/api/upload", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No PDF uploaded",
      });
    }

    const filePath = req.file.path;

    const text = await extractText(filePath);

    const chunks = chunkText(text);

    const embeddings = await generateEmbeddings(chunks);

    const savedDocument = await Document.create({
      filename: req.file.filename,
      text,
      chunks,
      embeddings,
    });

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
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});