import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [message, setMessage] = useState("Checking backend...");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

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

  return (
    <div className="container">
      <h1>📚 StudyCopilot</h1>

      <div className="card">
        <button>Upload PDF</button>

        <input
          type="text"
          placeholder="Ask a question..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />

        <button onClick={handleSend}>Send</button>

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