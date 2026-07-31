async function generateEmbeddings(chunks) {
  const embeddings = chunks.map((chunk, index) => ({
    id: index + 1,
    text: chunk,
    embedding: []
  }));

  return embeddings;
}

module.exports = { generateEmbeddings };