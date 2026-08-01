import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [message, setMessage] = useState("Checking backend...");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const [pdfFile, setPdfFile] = useState(null);

  const [totalDocuments, setTotalDocuments] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [totalEmbeddings, setTotalEmbeddings] = useState(0);
  const [firstChunk, setFirstChunk] = useState("");

  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5000/api/message")
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch(() => setMessage("Backend not connected"));

    fetchDocuments();
  }, []);

  async function fetchDocuments() {
    try {
      const response = await fetch("http://localhost:5000/api/documents");
      const data = await response.json();
      setDocuments(data);
    } catch (error) {
      console.error(error);
    }
  }

  const handleUpload = async () => {
    try {
      if (!pdfFile) {
        alert("Please select a PDF first.");
        return;
      }

      const formData = new FormData();
      formData.append("pdf", pdfFile);

      const response = await fetch("http://localhost:5000/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message);

        setTotalDocuments(data.totalDocuments);
        setTotalChunks(data.totalChunks);
        setTotalEmbeddings(data.totalEmbeddings);
        setFirstChunk(data.firstChunk);

        fetchDocuments();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error(error);
      alert("Upload failed.");
    }
  };

  const handleSend = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setAnswer(data.answer);
      } else {
        setAnswer(data.message);
      }
    } catch (error) {
      console.error(error);
      setAnswer("Failed to contact backend");
    }
  };

  return (
    <div className="container">
      <h1>📚 StudyCopilot</h1>

      <div className="card">
        <h2>Upload Study Material</h2>

        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setPdfFile(e.target.files[0])}
        />

        <button onClick={handleUpload}>Upload PDF</button>

        <hr />

        <h3>Total Documents: {totalDocuments}</h3>
        <h3>Total Chunks: {totalChunks}</h3>
        <h3>Total Embeddings: {totalEmbeddings}</h3>

        <h3>First Chunk</h3>

        <textarea
          value={firstChunk}
          readOnly
          rows={10}
          style={{
            width: "100%",
            padding: "10px",
            resize: "vertical",
          }}
        />

        <hr />

        <h2>Uploaded Documents</h2>

        {documents.length === 0 ? (
          <p>No documents uploaded yet.</p>
        ) : (
          <ul>
            {documents.map((doc) => (
              <li key={doc._id}>📄 {doc.filename}</li>
            ))}
          </ul>
        )}

        <hr />

        <h2>Ask a Question</h2>

        <input
          type="text"
          placeholder="Ask a question..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />

        <button onClick={handleSend}>Send</button>

        <hr />

        <p>
          <strong>Backend Status:</strong> {message}
        </p>

        <h3>AI Answer</h3>

        <textarea
          value={answer}
          readOnly
          rows={8}
          style={{
            width: "100%",
            padding: "10px",
            resize: "vertical",
          }}
        />
      </div>
    </div>
  );
}

export default App;