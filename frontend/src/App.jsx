import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [message, setMessage] = useState("Checking backend...");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [pdfFile, setPdfFile] = useState(null);

  useEffect(() => {
    fetch("http://localhost:5000/api/message")
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch(() => setMessage("Backend not connected"));
  }, []);

  const handleSend = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question,
        }),
      });

      const data = await response.json();

      setAnswer(data.answer);
    } catch (error) {
      console.error(error);
      setAnswer("Failed to contact backend");
    }
  };

  const handleUpload = async () => {
    try {
      if (!pdfFile) {
        alert("Please select a PDF first");
        return;
      }

      const formData = new FormData();

      formData.append("pdf", pdfFile);

      const response = await fetch(
        "http://localhost:5000/api/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      alert(data.message);
    } catch (error) {
      console.error(error);
      alert("Upload failed");
    }
  };

  return (
    <div className="container">
      <h1>📚 StudyCopilot</h1>

      <div className="card">
        <h3>Upload Study Material</h3>

        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setPdfFile(e.target.files[0])}
        />

        <button onClick={handleUpload}>
          Upload PDF
        </button>

        <hr />

        <input
          type="text"
          placeholder="Ask a question..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />

        <button onClick={handleSend}>
          Send
        </button>

        <p>
          <strong>Backend Status:</strong> {message}
        </p>

        <p>
          <strong>Answer:</strong> {answer}
        </p>
      </div>
    </div>
  );
}

export default App;