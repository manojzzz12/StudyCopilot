import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Document as PdfDocument, Page, pdfjs } from "react-pdf";
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Search,
  Send,
  Upload,
  Trash2,
  Menu,
  X,
} from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

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

const normalizePdfText = (text = "") =>
  text.replace(/\s+/g, " ").trim().toLowerCase();

async function findCitationPage(pdf, preview) {
  const words = normalizePdfText(preview).split(" ").filter(Boolean);
  const phrases = [8, 5]
    .map((wordCount) => words.slice(0, wordCount).join(" "))
    .filter(Boolean);

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const pageText = normalizePdfText(
      textContent.items.map((item) => item.str).join(" ")
    );

    if (phrases.some((phrase) => pageText.includes(phrase))) {
      return pageNumber;
    }
  }

  return 1;
}

export default function App() {
  const fileInputRef = useRef(null);
  const uploadProgressTimerRef = useRef(null);

  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [question, setQuestion] = useState("");
  const [search, setSearch] = useState("");

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState("");
  const [asking, setAsking] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState(null);

  const [apiStatus, setApiStatus] = useState("checking");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [error, setError] = useState("");
  const [pdfViewer, setPdfViewer] = useState(null);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [isLocatingCitation, setIsLocatingCitation] = useState(false);
  const [pdfError, setPdfError] = useState("");

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

  useEffect(() => {
    return () => {
      if (uploadProgressTimerRef.current) {
        clearInterval(uploadProgressTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isUploading || uploadProgress <= 35 || uploadProgress >= 100) return;

    if (uploadProgress < 55) {
      setUploadStage("Extracting text...");
    } else if (uploadProgress < 75) {
      setUploadStage("Generating embeddings...");
    } else {
      setUploadStage("Saving document...");
    }
  }, [isUploading, uploadProgress]);

  // ------------------------
  // Upload (FIXED)
  // ------------------------

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(10);
    setUploadStage("Uploading PDF...");
    setError("");

    try {
      const formData = new FormData();
      formData.append("pdf", file);

      await new Promise((resolve) => requestAnimationFrame(resolve));

      const uploadRequest = fetch(`${BACKEND_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });

      setUploadProgress(35);
      setUploadStage("Extracting text...");

      uploadProgressTimerRef.current = setInterval(() => {
        setUploadProgress((current) => {
          const increment = current < 55 ? 4 : current < 75 ? 2 : 1;
          return Math.min(current + increment, 90);
        });
      }, 700);

      const res = await uploadRequest;

      if (!res.ok) throw new Error(`Upload failed (${res.status})`);

      const data = await res.json();

      clearInterval(uploadProgressTimerRef.current);
      uploadProgressTimerRef.current = null;
      setUploadProgress(100);
      setUploadStage("Completed");

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

      await new Promise((resolve) => setTimeout(resolve, 800));
    } catch (err) {
      console.error(err);
      setError(err.message || "Upload failed.");
    } finally {
      if (uploadProgressTimerRef.current) {
        clearInterval(uploadProgressTimerRef.current);
        uploadProgressTimerRef.current = null;
      }

      setIsUploading(false);
      setUploadProgress(0);
      setUploadStage("");
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
          sources: data.sources || [],
          filename: data.filename || selectedDocument.name,
          documentId: data.documentId || selectedDocument.id,
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
    const documentToDelete = documents.find((document) => document.id === id);

    if (
      !documentToDelete ||
      !window.confirm(`Delete "${documentToDelete.name}"? This cannot be undone.`)
    ) {
      return;
    }

    setDeletingDocumentId(id);
    setError("");

    try {
      const res = await fetch(`${BACKEND_URL}/api/documents/${id}`, {
        method: "DELETE",
      });

      const responseText = await res.text();
      let data = {};

      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch {
          const responseSnippet = responseText
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 160);

          throw new Error(
            `Delete failed (${res.status} ${res.statusText}): ${
              responseSnippet || "Non-JSON response"
            }`
          );
        }
      }

      if (!res.ok) {
        throw new Error(data.message || "Failed to delete document.");
      }

      const deletedIndex = documents.findIndex((document) => document.id === id);
      const remainingDocuments = documents.filter((document) => document.id !== id);

      setDocuments(remainingDocuments);

      if (selectedDocId === id) {
        const nextDocument =
          remainingDocuments[deletedIndex] ||
          remainingDocuments[deletedIndex - 1] ||
          null;

        setSelectedDocId(nextDocument?.id || null);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to delete document.");
    } finally {
      setDeletingDocumentId(null);
    }
  };

  const openSource = (message, source) => {
    const documentId = message.documentId || selectedDocument?.id;

    if (!documentId) return;

    setPdfViewer({
      documentId,
      filename: message.filename || "Uploaded document",
      preview: source.preview,
      chunk: source.chunk,
    });
    setPdfPage(1);
    setPdfPageCount(0);
    setPdfError("");
    setIsLocatingCitation(true);
  };

  const handlePdfLoadSuccess = async (pdf) => {
    setPdfPageCount(pdf.numPages);

    try {
      const citedPage = await findCitationPage(pdf, pdfViewer?.preview || "");
      setPdfPage(citedPage);
    } catch (err) {
      console.error("Unable to locate cited text:", err);
    } finally {
      setIsLocatingCitation(false);
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
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full flex items-center justify-center gap-2 bg-black text-white rounded-lg py-3 transition-opacity disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isUploading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Upload size={18} />
            )}
            {isUploading ? uploadStage : "Upload PDF"}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            hidden
            onChange={handleFileUpload}
          />
        </div>

        <div className="min-h-16 px-4 pb-3" aria-live="polite">
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{uploadStage}</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-black transition-all duration-500 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                  role="progressbar"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  aria-valuenow={uploadProgress}
                  aria-label={uploadStage}
                />
              </div>
            </div>
          )}
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
                    disabled={deletingDocumentId === doc.id}
                    className={`rounded p-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      selectedDocId === doc.id
                        ? "hover:bg-white/20"
                        : "hover:bg-gray-200 hover:text-red-600"
                    }`}
                    aria-label={`Delete ${doc.name}`}
                  >
                    {deletingDocumentId === doc.id ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <Trash2 size={16} />
                    )}
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
                <>
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
                  {msg.sources?.length > 0 && (
                    <div className="mt-5 border-t border-gray-200 pt-4">
                      <h4 className="mb-2 text-sm font-semibold text-gray-700">
                        Sources
                      </h4>
                      <div className="space-y-2">
                        {msg.sources.map((source) => {
                          const score = Number(source.score);

                          return (
                            <button
                              type="button"
                              key={`${msg.id}-${source.chunk}`}
                              onClick={() => openSource(msg, source)}
                              className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-left transition-colors hover:border-gray-300 hover:bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
                            >
                              <div className="flex gap-3">
                                <FileText
                                  size={18}
                                  className="mt-0.5 shrink-0 text-gray-500"
                                />
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-x-2 text-sm font-medium text-gray-800">
                                    <span className="break-all">
                                      {msg.filename || "Uploaded document"}
                                    </span>
                                    <span className="text-gray-500">
                                      — Chunk {source.chunk} ({score.toFixed(2)})
                                    </span>
                                  </div>
                                  <p className="mt-1 text-sm leading-6 text-gray-600">
                                    {source.preview}
                                  </p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
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

      {pdfViewer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`PDF viewer for ${pdfViewer.filename}`}
        >
          <div className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 font-semibold">
                  <FileText size={18} />
                  <span className="truncate">{pdfViewer.filename}</span>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Chunk {pdfViewer.chunk}
                  {isLocatingCitation && " · Finding cited text..."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPdfViewer(null)}
                className="rounded-md p-2 transition-colors hover:bg-gray-100"
                aria-label="Close PDF viewer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="border-b bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <span className="font-semibold">Cited text: </span>
              {pdfViewer.preview}
            </div>

            <div className="flex items-center justify-between border-b px-4 py-2 text-sm">
              <button
                type="button"
                onClick={() => setPdfPage((page) => Math.max(1, page - 1))}
                disabled={pdfPage <= 1}
                className="rounded-md p-2 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft size={18} />
              </button>
              <span>
                Page {pdfPage}{pdfPageCount ? ` of ${pdfPageCount}` : ""}
              </span>
              <button
                type="button"
                onClick={() => setPdfPage((page) => Math.min(pdfPageCount, page + 1))}
                disabled={!pdfPageCount || pdfPage >= pdfPageCount}
                className="rounded-md p-2 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-gray-100 p-3 sm:p-6">
              <div className="mx-auto w-fit max-w-full shadow-sm">
                <PdfDocument
                  file={`${BACKEND_URL}/api/documents/${pdfViewer.documentId}/file`}
                  loading={<div className="p-8 text-sm text-gray-500">Loading PDF...</div>}
                  onLoadSuccess={handlePdfLoadSuccess}
                  onLoadError={(err) => {
                    console.error(err);
                    setPdfError("Unable to load this uploaded PDF.");
                    setIsLocatingCitation(false);
                  }}
                >
                  <Page
                    pageNumber={pdfPage}
                    width={Math.min(window.innerWidth - 48, 820)}
                    renderAnnotationLayer
                    renderTextLayer
                  />
                </PdfDocument>
                {pdfError && (
                  <div className="bg-white p-6 text-sm text-red-600">{pdfError}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
