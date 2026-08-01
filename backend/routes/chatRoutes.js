const express = require("express");
const router = express.Router();

const groq = require("../services/aiService");

// Chat with AI
router.post("/", async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        message: "Question is required",
      });
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: question,
        },
      ],
    });

    res.json({
      success: true,
      answer: completion.choices[0].message.content,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to generate response",
      error: error.message,
    });
  }
});

module.exports = router;