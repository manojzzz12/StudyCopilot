require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const connectDB = require("./config/db");
const chatRoutes = require("./routes/chatRoutes");
const documentRoutes = require("./routes/documentRoutes");
const Document = require("./models/Document");
const { extractText } = require("./services/pdfService");
const { chunkText } = require("./services/chunkService");
const { generateEmbeddings } = require("./services/embeddingService");

const app = express();
const PORT = process.env.PORT || 5000;

// ------------------------------
// MongoDB
// ------------------------------
connectDB();

// ------------------------------
// Middleware
// ------------------------------
app.use(express.json());

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://study-copilot-sigma.vercel.app",
    ],
    credentials: true,
  })
);

// ------------------------------
// Ensure uploads folder exists
// ------------------------------
const uploadsDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ------------------------------
// Multer Storage
// ------------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// ------------------------------
// Health Check
// ------------------------------
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "connected",
    service: "StudyCopilot Backend",
  });
});

// ------------------------------
// Test Route
// ------------------------------
app.get("/api/message", (req, res) => {
  res.json({
    message: "Hello from StudyCopilot Backend!",
  });
});

// ------------------------------
// API Routes
// ------------------------------
app.use("/api/chat", chatRoutes);
app.use("/api/documents", documentRoutes);

app.post("/api/upload", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No PDF uploaded",
      });
    }

    const text = await extractText(req.file.path);
    const chunks = chunkText(text);
    const embeddings = await generateEmbeddings(chunks);

    const document = await Document.create({
      filename: req.file.filename,
      text,
      chunks,
      embeddings,
    });

    res.status(201).json({
      success: true,
      message: "PDF uploaded successfully",
      documentId: document._id,
      filename: document.filename,
    });
  } catch (error) {
    console.error("Upload failed:", error);

    res.status(500).json({
      success: false,
      message: "Failed to process PDF",
      error: error.message,
    });
  }
});

// ------------------------------
// Root Route
// ------------------------------
app.get("/", (req, res) => {
  res.send("StudyCopilot Backend is running.");
});

// ------------------------------
// Error Handler
// ------------------------------
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err);

  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// ------------------------------
// Start Server
// ------------------------------
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
