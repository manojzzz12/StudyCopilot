import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  ChevronDown,
  ChevronRight,
  FileText,
  FolderOpen,
  GripVertical,
  Loader2,
  MessageSquare,
  Paperclip,
  Plus,
  Search,
  Send,
  Sparkles,
  Upload,
  BarChart3,
  LayoutGrid,
  Clock3,
  CheckCircle2,
  AlertCircle,
  FileUp,
  LibraryBig,
  Menu,
  X,
} from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const uid = () => Math.random().toString(36).slice(2, 10);

const formatBytes = (bytes = 0) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** idx).toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
};

const normalizeDocument = (doc, index = 0) => ({
  id: doc._id,
  name: doc.filename,
  size: doc.size || 0,
  pages: doc.pages || 0,
  uploadedAt: doc.createdAt || new Date().toISOString(),
  status: "ready",
  source: "uploaded",
  raw: doc,
});

const initialStats = {
  documents: 0,
  totalPages: 0,
  chats: 0,
  processed: 0,
};

function App() {
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [query, setQuery] = useState('');
  const [question, setQuestion] = useState('');
  const [chatMessages, setChatMessages] = useState([
    {
      id: uid(),
      role: 'assistant',
      content: 'Upload a PDF, select a document, and ask a question to begin.',
    },
  ]);
  const [stats, setStats] = useState(initialStats);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [asking, setAsking] = useState(false);
  const [apiStatus, setApiStatus] = useState('checking');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [error, setError] = useState('');
  const [selectedTab, setSelectedTab] = useState('overview');
  const fileInputRef = useRef(null);

  const selectedDocument = useMemo(
    () => documents.find((doc) => doc.id === selectedDocId) || documents[0] || null,
    [documents, selectedDocId]
  );
  

  const refreshStats = useCallback((docs, messages = chatMessages) => {
    const totalPages = docs.reduce((sum, doc) => sum + Number(doc.pages || 0), 0);
    setStats({
      documents: docs.length,
      totalPages,
      chats: messages.filter((m) => m.role === 'user').length,
      processed: docs.filter((d) => d.status === 'ready').length,
    });
  }, [chatMessages]);

  const fetchDocuments = useCallback(async () => {
    setLoadingDocs(true);
    setError('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/documents`);
      if (!res.ok) throw new Error(`Document load failed (${res.status})`);
      const data = await res.json();
      const docs = Array.isArray(data) ? data : (data.documents || data.items || data.data || []);
      const list = docs.map((doc) => ({
        id: doc._id,
        name: doc.filename,
        size: doc.size || 0,
        pages: doc.pages || 0,
        uploadedAt: doc.createdAt || new Date().toISOString(),
        status: 'ready',
        source: 'uploaded',
        raw: doc,
      }));
      setDocuments(list);
      setSelectedDocId((prev) => prev || list[0]?.id || null);
    } catch (err) {
      setError(err.message || 'Unable to load documents.');
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  const checkBackend = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/health`);
      if (!res.ok) throw new Error('Backend unavailable');
      setApiStatus('connected');
    } catch {
      setApiStatus('offline');
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
    checkBackend();
  }, [fetchDocuments, checkBackend]);

  useEffect(() => {
    refreshStats(documents, chatMessages);
  }, [documents, chatMessages, refreshStats]);

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append("pdf", file);
      const res = await fetch(`${BACKEND_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      const data = await res.json();
      await fetchDocuments();
      if (data.documentId) setSelectedDocId(data.documentId);
      setChatMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: 'assistant',
          content: `Document "${data.filename || file.name}" uploaded successfully. You can now ask questions about it.`,
        },
      ]);
    } catch (err) {
      setError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleAsk = async (event) => {
  event.preventDefault();

  const trimmed = question.trim();

  if (!trimmed) {
    setError("Please enter a question.");
    return;
  }

  if (!selectedDocument) {
    setError("Please select a document first.");
    return;
  }

  setError("");

  // Add user message immediately
  setChatMessages((prev) => [
    ...prev,
    {
      id: uid(),
      role: "user",
      content: trimmed,
    },
  ]);

  setQuestion("");
  setAsking(true);

  try {
    console.log("Sending to backend:", {
      question: trimmed,
      documentId: selectedDocument.id,
    });

    const response = await fetch(`${BACKEND_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question: trimmed,
        documentId: selectedDocument.id,
      }),
    });

    const data = await response.json();

    console.log("Backend Response:", data);

    if (!response.ok) {
      throw new Error(data.message || "Chat request failed");
    }

    setChatMessages((prev) => [
      ...prev,
      {
        id: uid(),
        role: "assistant",
        content: data.answer,
      },
    ]);

  } catch (error) {
    console.error(error);

    setError(error.message);

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

  const filteredDocuments = documents.filter((doc) =>
    `${doc.name} ${doc.source} ${doc.status}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex min-h-screen">
        <aside className={`${sidebarOpen ? 'w-80' : 'w-0 lg:w-20'} transition-all duration-300 border-r border-white/10 bg-slate-950/95 backdrop-blur-xl overflow-hidden`}>
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/15 ring-1 ring-inset ring-indigo-400/30">
                  <Sparkles className="h-5 w-5 text-indigo-300" />
                </div>
                <div className={`${sidebarOpen ? 'block' : 'hidden lg:block'} min-w-0`}>
                  <div className="truncate text-sm font-semibold tracking-wide text-white">StudyCopilot</div>
                  <div className="truncate text-xs text-slate-400">Document intelligence workspace</div>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen((v) => !v)}
                className="rounded-xl border border-white/10 p-2 text-slate-300 hover:bg-white/5 lg:hidden"
                aria-label="Toggle sidebar"
              >
                {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>

            <div className="flex-1 space-y-6 px-4 py-5">
              <button
                onClick={handleUploadClick}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400"
              >
                <Upload className="h-4 w-4" />
                Upload PDF
              </button>
              <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} />

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-400">
                  <span>Documents</span>
                  <span>{documents.length}</span>
                </div>
                <div className="space-y-2">
                  {loadingDocs ? (
                    <div className="rounded-2xl border border-white/10 p-4 text-sm text-slate-400">Loading documents...</div>
                  ) : filteredDocuments.length ? (
                    filteredDocuments.map((doc) => {
                      const active = doc.id === selectedDocId;
                      return (
                        <button
                          key={doc.id}
                          onClick={() => setSelectedDocId(doc.id)}
                          className={`group flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition ${active ? 'border-indigo-400/40 bg-indigo-500/10' : 'border-white/10 bg-white/0 hover:bg-white/5'}`}
                        >
                          <div className="mt-0.5 rounded-xl bg-white/5 p-2 text-slate-300 group-hover:text-white">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-white">{doc.name}</div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                              <span>{formatBytes(doc.size)}</span>
                              <span>•</span>
                              <span>{doc.pages || '—'} pages</span>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-400">
                      No documents yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
            <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSidebarOpen((v) => !v)}
                  className="rounded-xl border border-white/10 p-2 text-slate-300 hover:bg-white/5 lg:hidden"
                  aria-label="Toggle sidebar"
                >
                  <Menu className="h-4 w-4" />
                </button>
                <div>
                  <h1 className="text-xl font-semibold text-white sm:text-2xl">StudyCopilot Dashboard</h1>
                  <p className="mt-1 text-sm text-slate-400">Upload documents, switch between files, and chat with Groq-powered answers.</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">
                  {apiStatus === 'connected' ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : apiStatus === 'offline' ? <AlertCircle className="h-4 w-4 text-rose-400" /> : <Loader2 className="h-4 w-4 animate-spin" />}
                  Backend {apiStatus}
                </div>
                <button onClick={fetchDocuments} className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 hover:bg-white/5">
                  Refresh
                </button>
              </div>
            </div>
          </header>

          <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
            {error ? (
              <div className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
                <span>{error}</span>
              </div>
            ) : null}

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Documents', value: stats.documents, icon: LibraryBig, hint: 'Uploaded files' },
                { label: 'Pages', value: stats.totalPages, icon: LayoutGrid, hint: 'Across all PDFs' },
                { label: 'Questions', value: stats.chats, icon: MessageSquare, hint: 'User prompts' },
                { label: 'Ready', value: stats.processed, icon: CheckCircle2, hint: 'Processed files' },
              ].map((item) => (
                <div key={item.label} className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/10">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-slate-400">{item.label}</p>
                      <div className="mt-2 text-3xl font-semibold tracking-tight text-white">{item.value}</div>
                      <p className="mt-2 text-xs text-slate-500">{item.hint}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-3 text-slate-200">
                      <item.icon className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              ))}
            </section>

            <section className="grid flex-1 gap-6 xl:grid-cols-[1.35fr_0.95fr]">
              <div className="space-y-6">
                <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-xl shadow-black/10">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-white">Workspace overview</h2>
                      <p className="mt-1 text-sm text-slate-400">Manage PDFs, inspect stats, and keep focus on the active document.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setSelectedTab('overview')} className={`rounded-full px-4 py-2 text-sm ${selectedTab === 'overview' ? 'bg-white text-slate-950' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>
                        Overview
                      </button>
                      <button onClick={() => setSelectedTab('documents')} className={`rounded-full px-4 py-2 text-sm ${selectedTab === 'documents' ? 'bg-white text-slate-950' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>
                        Documents
                      </button>
                      <button onClick={() => setSelectedTab('insights')} className={`rounded-full px-4 py-2 text-sm ${selectedTab === 'insights' ? 'bg-white text-slate-950' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>
                        Insights
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 lg:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 lg:col-span-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-white">
                        <FolderOpen className="h-4 w-4 text-indigo-300" />
                        Active document
                      </div>
                      {selectedDocument ? (
                        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-lg font-semibold text-white">{selectedDocument.name}</div>
                              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-400">
                                <span>{formatBytes(selectedDocument.size)}</span>
                                <span>•</span>
                                <span>{selectedDocument.pages || '—'} pages</span>
                                <span>•</span>
                                <span>{selectedDocument.status}</span>
                              </div>
                            </div>                          </div>
                          <div className="mt-4 grid gap-3 sm:grid-cols-3">
                            {[
                              ['Source', selectedDocument.source],
                              ['Uploaded', new Date(selectedDocument.uploadedAt).toLocaleDateString()],
                              ['Status', selectedDocument.status],
                            ].map(([label, value]) => (
                              <div key={label} className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div>
                                <div className="mt-1 text-sm text-slate-200">{value}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-6 text-sm text-slate-400">
                          No document selected. Upload a PDF to start.
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-white">
                        <BarChart3 className="h-4 w-4 text-indigo-300" />
                        Quick metrics
                      </div>
                      <div className="mt-4 space-y-3">
                        <div className="rounded-xl bg-slate-950/60 p-4">
                          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500"><Clock3 className="h-3.5 w-3.5" />Recent action</div>
                          <div className="mt-2 text-sm text-slate-200">Upload, select, and ask without leaving the page.</div>
                        </div>
                        <div className="rounded-xl bg-slate-950/60 p-4">
                          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500"><GripVertical className="h-3.5 w-3.5" />Layout</div>
                          <div className="mt-2 text-sm text-slate-200">Responsive two-panel SaaS dashboard.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-xl shadow-black/10">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-white">Document list</h2>
                      <p className="mt-1 text-sm text-slate-400">Select any document to focus the chat context.</p>
                    </div>
                    <div className="relative w-full max-w-xs">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search documents"
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/60 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 outline-none ring-0 focus:border-indigo-400/40"
                      />
                    </div>
                  </div>

                  <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
                    <div className="grid grid-cols-[1.6fr_0.7fr_0.5fr_0.5fr_auto] gap-3 border-b border-white/10 bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.16em] text-slate-500">
                      <div>Name</div>
                      <div>Size</div>
                      <div>Pages</div>
                      <div>Status</div>
                      <div className="text-right">Action</div>
                    </div>
                    <div className="divide-y divide-white/10 bg-slate-950/40">
                      {filteredDocuments.length ? filteredDocuments.map((doc) => {
                        const active = doc.id === selectedDocument?.id;
                        return (
                          <div key={doc.id} className={`grid grid-cols-[1.6fr_0.7fr_0.5fr_0.5fr_auto] items-center gap-3 px-4 py-4 ${active ? 'bg-indigo-500/5' : ''}`}>
                            <button onClick={() => setSelectedDocId(doc.id)} className="flex items-center gap-3 text-left">
                              <div className={`rounded-xl p-2 ${active ? 'bg-indigo-500/15 text-indigo-200' : 'bg-white/5 text-slate-300'}`}>
                                <FileText className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium text-white">{doc.name}</div>
                                <div className="mt-1 text-xs text-slate-500">{new Date(doc.uploadedAt).toLocaleString()}</div>
                              </div>
                            </button>
                            <div className="text-sm text-slate-300">{formatBytes(doc.size)}</div>
                            <div className="text-sm text-slate-300">{doc.pages || '—'}</div>
                            <div className="text-sm text-slate-300">{doc.status}</div>                          </div>
                        );
                      }) : (
                        <div className="px-4 py-10 text-center text-sm text-slate-400">No matching documents found.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex min-w-0 flex-col gap-6">
                <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-xl shadow-black/10">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-white">Groq chat</h2>
                      <p className="mt-1 text-sm text-slate-400">Ask questions grounded in the selected document.</p>
                    </div>
                    <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">Context aware</div>
                  </div>

                  <div className="mt-5 flex h-[34rem] flex-col rounded-3xl border border-white/10 bg-slate-950/60">
                    <div className="flex-1 space-y-4 overflow-y-auto p-4">
                      {chatMessages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 ${msg.role === 'user' ? 'bg-indigo-500 text-white' : 'border border-white/10 bg-white/5 text-slate-100'}`}>
                            <div className="mb-1 text-[11px] uppercase tracking-[0.16em] opacity-70">{msg.role === 'user' ? 'You' : 'Assistant'}</div>
                            {msg.content}
                          </div>
                        </div>
                      ))}
                      {asking && (
                        <div className="flex justify-start">
                          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Thinking...
                          </div>
                        </div>
                      )}
                    </div>

                    <form onSubmit={handleAsk} className="border-t border-white/10 p-4">
                      <div className="flex gap-3">
                        <div className="relative flex-1">
                          <Paperclip className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                          <input
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder={selectedDocument ? `Ask about ${selectedDocument.name}` : 'Select a document first'}
                            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-400/40"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={asking || !question.trim() || !selectedDocument}
                          className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {asking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          Send
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-xl shadow-black/10">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Backend pipeline</h3>
                  <div className="mt-4 space-y-3">
                    {[
                      ['PDF upload', uploading ? 'processing' : 'ready', FileUp],
                      ['Document list', documents.length ? 'synced' : 'empty', LibraryBig],
                      ['Groq chat', apiStatus, Bot],
                    ].map(([label, state, Icon]) => (
                      <div key={label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl bg-slate-950/60 p-2 text-slate-300"><Icon className="h-4 w-4" /></div>
                          <div>
                            <div className="text-sm text-white">{label}</div>
                            <div className="text-xs text-slate-500">Backend API integration</div>
                          </div>
                        </div>
                        <div className="text-sm text-slate-300 capitalize">{state}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;