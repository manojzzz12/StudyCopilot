const axios = require("axios");

const EMBEDDING_API = process.env.EMBEDDING_API_URL;

async function generateEmbeddings(chunks) {
  console.log("\n========================================");
  console.log("🚀 Starting Embedding Generation");
  console.log(`Total Chunks: ${chunks.length}`);
  console.log(`Embedding API: ${EMBEDDING_API}`);
  console.log("========================================\n");

  const embeddings = [];

  for (let i = 0; i < chunks.length; i++) {
    console.log(`📤 Sending Chunk ${i + 1}/${chunks.length}`);

    try {
      const response = await axios.post(
        EMBEDDING_API,
        {
          text: chunks[i],
        },
        {
          timeout: 60000,
        }
      );

      embeddings.push({
        id: i + 1,
        text: chunks[i],
        embedding: response.data.embedding,
      });

      console.log(
        `✅ Chunk ${i + 1} Embedded (${response.data.embedding.length} dimensions)`
      );
    } catch (error) {
      console.log("\n========================================");
      console.log(`❌ ERROR ON CHUNK ${i + 1}`);

      if (error.response) {
        console.log("Status:", error.response.status);
        console.log("Response:", error.response.data);
      } else if (error.request) {
        console.log("No response received from Python service.");
      } else {
        console.log(error.message);
      }

      console.log("========================================\n");

      throw error;
    }
  }

  console.log("\n========================================");
  console.log("✅ Embedding Generation Finished");
  console.log(`Generated: ${embeddings.length}`);
  console.log("========================================\n");

  return embeddings;
}

module.exports = {
  generateEmbeddings,
};