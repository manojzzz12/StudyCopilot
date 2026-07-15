const express = require("express");
const cors = require("cors");
const multer = require("multer");

const app = express();

app.use(cors());
app.use(express.json());

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

app.get("/api/message", (req, res) => {
  res.json({
    message: "Hello from StudyCopilot Backend!",
  });
});

app.post("/api/ask", (req, res) => {
  const question = req.body.question;

  res.json({
    answer: `You asked: ${question}`,
  });
});

app.post("/api/upload", upload.single("pdf"), (req, res) => {
  res.json({
    message: "PDF uploaded successfully",
    filename: req.file.filename,
  });
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});