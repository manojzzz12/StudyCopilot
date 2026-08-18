import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bot,
  FileText,
  Loader2,
  Search,
  Send,
  Upload,
  Trash2,
  Menu,
  X,
} from "lucide-react";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  "https://studycopilot-backend-9vp0.onrender.com";

const uid = () => Math.random().toString(36).slice(2, 10);

const formatDate = (date) =>
  new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export default function App() {
  const fileInputRef = useRef(null);

  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [question, setQuestion] = useState("");
  const [search, setSearch] = useState("");

  const [uploading, setUploading] = useState(false);
  const [asking, setAsking] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const [apiStatus, setApiStatus] = useState("checking");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [error, setError] = useState("");

  const [chatMessages, setChatMessages] = useState([
    {
      id: uid(),
      role: "assistant",
      content:
        "Upload a PDF, select it, and ask a question to start studying.",
    },
  ]);

  const selectedDocument = useMemo(
    () =>
      documents.find((doc) => doc.id === selectedDocId) ||
      documents[0] ||
      null,
    [documents, selectedDocId]
  );

  // ------------------------
  // Fetch Documents
  // ------------------------

  const fetchDocuments = useCallback(async () => {
    setLoadingDocs(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/documents`);
      const data = await res.json();

      const docs = data.map((doc) => ({
        id: doc._id,
        name: doc.filename,
        uploadedAt: doc.createdAt,
        size: 0,
        pages: doc.chunks?.length || 0,
      }));

      setDocuments(docs);
      setSelectedDocId((prev) => prev || docs[0]?.id || null);
    } catch (err) {
      console.error(err);
      setError("Unable to load documents.");
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  // ------------------------
  // Backend Health
  // ------------------------

  const checkBackend = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/health`);

      if (!res.ok) throw new Error();

      setApiStatus("connected");
    } catch {
      setApiStatus("offline");
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
    checkBackend();
  }, [fetchDocuments, checkBackend]);

  // ------------------------
  // Upload (FIXED)
  // ------------------------

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("pdf", file);

      const res = await fetch(`${BACKEND_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`Upload failed (${res.status})`);

      const data = await res.json();

      console.log("Upload Response:", data);

      // Reload documents from MongoDB
      await fetchDocuments();

      // Select uploaded document if backend returns an ID
      if (data.documentId) {
        setSelectedDocId(data.documentId);
      }

      // Never show "undefined"
      const uploadedName =
        data.filename ||
        data.document?.filename ||
        file.name;

      setChatMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "assistant",
          content: `Document "${uploadedName}" uploaded successfully.`,
        },
      ]);
    } catch (err) {
      console.error(err);
      setError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  // ------------------------
  // Chat
  // ------------------------

  const handleAsk = async (e) => {
    e.preventDefault();

    const q = question.trim();

    if (!q || !selectedDocument) return;

    setChatMessages((prev) => [
      ...prev,
      {
        id: uid(),
        role: "user",
        content: q,
      },
    ]);

    setQuestion("");
    setAsking(true);

    const history = chatMessages.map(({ role, content }) => ({
      role,
      content,
    }));

    try {
      console.log("Sending to backend:", {
        question: q,
        documentId: selectedDocument.id,
        history,
      });

      const res = await fetch(`${BACKEND_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: q,
          documentId: selectedDocument.id,
          history,
        }),
      });

      const data = await res.json();

      console.log("Backend Response:", data);

      setChatMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "assistant",
          content:
            data.answer ||
            data.message ||
            "Failed to get response from StudyCopilot.",
        },
      ]);
    } catch (err) {
      console.error(err);

      setChatMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "assistant",
          content: "❌ Failed to get response from StudyCopilot.",
        },
      ]);
    } finally {
      setAsking(false);
    }
  };

  // ------------------------
  // Delete
  // ------------------------

  const deleteDocument = async (id) => {
    try {
      await fetch(`${BACKEND_URL}/api/documents/${id}`, {
        method: "DELETE",
      });

      await fetchDocuments();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredDocs = documents.filter((doc) =>
    doc.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}

      <div
        className={`${sidebarOpen ? "w-80" : "w-0"} transition-all bg-white border-r overflow-hidden`}
      >
        <div className="p-5 border-b">
          <div className="flex items-center justify-between">
            <h1 className="font-bold text-xl">StudyCopilot</h1>

            <button onClick={() => setSidebarOpen(false)}>
              <X size={18} />
            </button>
          </div>

          <p className="text-sm text-gray-500 mt-1">
            {apiStatus === "connected"
              ? "Backend Connected"
              : apiStatus === "offline"
              ? "Backend Offline"
              : "Checking..."}
          </p>
        </div>

        <div className="p-4">
          <button
            onClick={() => fileInputRef.current.click()}
            className="w-full flex items-center justify-center gap-2 bg-black text-white rounded-lg py-3"
          >
            {uploading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Upload size={18} />
            )}
            Upload PDF
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            hidden
            onChange={handleFileUpload}
          />
        </div>

        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-gray-50">
            <Search size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents..."
              className="bg-transparent outline-none w-full"
            />
          </div>
        </div>

        <div className="overflow-y-auto h-[calc(100%-180px)] px-3">
          {loadingDocs ? (
            <div className="text-center py-8">
              <Loader2 className="animate-spin mx-auto" />
            </div>
          ) : (
            filteredDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => setSelectedDocId(doc.id)}
                className={`p-3 rounded-lg mb-2 cursor-pointer border ${
                  selectedDocId === doc.id
                    ? "bg-black text-white"
                    : "bg-white hover:bg-gray-100"
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex gap-2">
                    <FileText size={18} />
                    <div>
                      <div className="font-medium text-sm break-all">
                        {doc.name}
                      </div>

                      <div
                        className={`text-xs ${
                          selectedDocId === doc.id
                            ? "text-gray-300"
                            : "text-gray-500"
                        }`}
                      >
                        {formatDate(doc.uploadedAt)}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteDocument(doc.id);
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main */}

      <div className="flex-1 flex flex-col">
        <div className="border-b bg-white px-5 py-4 flex items-center gap-3">
          {!sidebarOpen && (
            <button onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
          )}

          <Bot size={22} />

          <div>
            <div className="font-semibold">
              {selectedDocument?.name || "No document selected"}
            </div>

            <div className="text-sm text-gray-500">
              {selectedDocument
                ? `${selectedDocument.pages} chunks`
                : "Upload a PDF to begin"}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 px-4 py-2">{error}</div>
        )}

        {/* Chat */}

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={`max-w-3xl p-4 rounded-xl ${
                msg.role === "user"
                  ? "bg-black text-white ml-auto"
                  : "bg-white border"
              }`}
            >
              {msg.role === "assistant" ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ node, ...props }) => (
                      <h1
                        className="mb-3 mt-6 text-2xl font-bold tracking-tight first:mt-0"
                        {...props}
                      />
                    ),
                    h2: ({ node, ...props }) => (
                      <h2
                        className="mb-3 mt-5 text-xl font-semibold tracking-tight first:mt-0"
                        {...props}
                      />
                    ),
                    h3: ({ node, ...props }) => (
                      <h3
                        className="mb-2 mt-4 text-lg font-semibold first:mt-0"
                        {...props}
                      />
                    ),
                    p: ({ node, ...props }) => (
                      <p className="mb-3 leading-7 last:mb-0" {...props} />
                    ),
                    ul: ({ node, ...props }) => (
                      <ul
                        className="mb-3 list-disc space-y-1 pl-6 last:mb-0"
                        {...props}
                      />
                    ),
                    ol: ({ node, ...props }) => (
                      <ol
                        className="mb-3 list-decimal space-y-1 pl-6 last:mb-0"
                        {...props}
                      />
                    ),
                    li: ({ node, ...props }) => (
                      <li className="pl-1 leading-7" {...props} />
                    ),
                    pre: ({ node, ...props }) => (
                      <pre
                        className="my-4 overflow-x-auto rounded-lg bg-slate-950 p-4 text-sm text-slate-100"
                        {...props}
                      />
                    ),
                    code: ({ node, className, ...props }) => (
                      <code
                        className={
                          className ||
                          "rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.85em] text-slate-800"
                        }
                        {...props}
                      />
                    ),
                    table: ({ node, ...props }) => (
                      <div className="my-4 overflow-x-auto rounded-lg border border-slate-200">
                        <table
                          className="w-full border-collapse text-left text-sm"
                          {...props}
                        />
                      </div>
                    ),
                    th: ({ node, ...props }) => (
                      <th
                        className="border-b border-slate-200 bg-slate-50 px-3 py-2 font-semibold"
                        {...props}
                      />
                    ),
                    td: ({ node, ...props }) => (
                      <td
                        className="border-b border-slate-100 px-3 py-2 align-top last:border-b-0"
                        {...props}
                      />
                    ),
                    input: ({ node, ...props }) => (
                      <input
                        className="mr-2 accent-slate-900"
                        disabled
                        {...props}
                      />
                    ),
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              ) : (
                msg.content
              )}
            </div>
          ))}
        </div>

        {/* Input */}

        <form
          onSubmit={handleAsk}
          className="border-t bg-white p-4 flex gap-3"
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about the selected document..."
            className="flex-1 border rounded-lg px-4 py-3 outline-none"
          />

          <button
            disabled={asking}
            className="bg-black text-white px-5 rounded-lg flex items-center gap-2"
          >
            {asking ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Send size={18} />
            )}
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
