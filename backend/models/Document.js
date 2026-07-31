const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    chunks: [
      {
        type: String,
      },
    ],
    embeddings: [
      {
        id: Number,
        text: String,
        embedding: [Number],
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Document", documentSchema);