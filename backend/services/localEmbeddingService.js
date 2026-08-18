const { pipeline } = require("@xenova/transformers");

let extractor = null;

async function getExtractor() {
  if (!extractor) {
    console.log("Loading embedding model...");
    extractor = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    );
    console.log("Embedding model loaded.");
  }
  return extractor;
}

async function generateEmbedding(text) {
  const model = await getExtractor();

  const output = await model(text, {
    pooling: "mean",
    normalize: true,
  });

  return Array.from(output.data);
}

async function generateEmbeddings(chunks) {
  const embeddings = [];

  for (let i = 0; i < chunks.length; i++) {
    console.log(`Embedding chunk ${i + 1}/${chunks.length}`);

    embeddings.push({
      id: i + 1,
      text: chunks[i],
      embedding: await generateEmbedding(chunks[i]),
    });
  }

  return embeddings;
}

module.exports = {
  generateEmbeddings,
};