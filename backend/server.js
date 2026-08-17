require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");

const connectDB = require("./config/db");
const Document = require("./models/Document");

const documentRoutes = require("./routes/documentRoutes");
const chatRoutes = require("./routes/chatRoutes");

const { extractText } = require("./services/pdfService");
const { chunkText } = require("./services/chunkService");
const { generateEmbeddings } = require("./services/embeddingService");

const groq = require("./services/aiService");

const app = express();

// ----------------------
// Connect MongoDB
// ----------------------

connectDB();

app.use(cors());
app.use(express.json());

// ----------------------
// Routes
// ----------------------

app.use("/api/documents", documentRoutes);
app.use("/api/chat", chatRoutes);

// ----------------------
// Multer Configuration
// ----------------------

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// ----------------------
// Backend Test
// ----------------------

app.get("/api/message", (req, res) => {
  res.json({
    message: "Hello from StudyCopilot Backend!",
  });
});

// ----------------------
// Health Check
// ----------------------

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "connected",
  });
});

// ----------------------
// AI Test
// ----------------------

app.get("/api/test-ai", async (req, res) => {
  try {
    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
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

// ----------------------
// Upload PDF
// ----------------------

app.post("/api/upload", upload.single("pdf"), async (req, res) => {
  try {
    console.log("\n==============================");
    console.log("📄 New Upload Request");
    console.log("==============================");

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No PDF uploaded",
      });
    }

    console.log("📁 File:", req.file.filename);

    const filePath = req.file.path;

    console.log("📖 Extracting text...");
    const text = await extractText(filePath);
    console.log("✅ Text Length:", text.length);

    console.log("✂ Chunking...");
    const chunks = chunkText(text);
    console.log("✅ Chunks:", chunks.length);

    console.log("🧠 Generating Embeddings...");
    const embeddings = await generateEmbeddings(chunks);

    console.log("✅ Embeddings Generated:", embeddings.length);
    console.log(
      "First Embedding Length:",
      embeddings[0]?.embedding?.length
    );

    console.log("💾 Saving document to MongoDB...");

    const savedDocument = await Document.create({
      filename: req.file.filename,
      text,
      chunks,
      embeddings,
    });

    console.log("✅ Document Saved Successfully!");
    console.log("MongoDB ID:", savedDocument._id);

    const totalDocuments = await Document.countDocuments();

    console.log("📚 Total Documents:", totalDocuments);
    console.log("==============================\n");

    res.json({
      success: true,
      message: "PDF uploaded successfully",
      document: savedDocument,
      totalDocuments,
    });

  } catch (error) {
    console.log("\n==============================");
    console.log("❌ UPLOAD FAILED");
    console.error(error);
    console.log("==============================\n");

    res.status(500).json({
      success: false,
      message: "Failed to process PDF",
      error: error.message,
    });
  }
});

// ----------------------
// Start Server
// ----------------------

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});