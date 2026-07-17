import { useState, useRef, useEffect, useCallback } from "react";
import { postJson, isAccepted } from "./api.js";

const LANGUAGES = [
  { id: "java", label: "Java" },
  { id: "python", label: "Python" },
  { id: "javascript", label: "JavaScript" },
  { id: "c", label: "C" },
  { id: "cpp", label: "C++" },
];

function newSessionId() {
  return "session-" + Math.random().toString(36).slice(2, 10);
}

function makeChat(initialMessage) {
  return {
    id: "chat-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
    sessionId: newSessionId(),
    selection: null,
    lastErrorContext: null,
    pendingAiReply: null,
    messages: [
      { role: "system", text: initialMessage || "Run your code — if something breaks, I'll explain it here automatically. Select lines in the editor to ask about them." },
    ],
  };
}

function makeTab() {
  const chat = makeChat();
  return {
    id: "tab-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
    language: "java",
    code: "",
    result: null,
    execState: "idle",
    autoExplain: true,
    chats: [chat],
    activeChatId: chat.id,
  };
}

/* ---------- Icons ---------- */

const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const SendIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const CloseIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const PinIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="17" x2="12" y2="22" />
    <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a1 1 0 0 0 0-2H8a1 1 0 0 0 0 2h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
  </svg>
);

const QuestionIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const PlusIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

/* ---------- Status bar ---------- */

function StatusDot({ state }) {
  const color =
    state === "running" ? "var(--warning)" :
      state === "error" ? "var(--error)" :
        state === "ok" ? "var(--success)" :
          "var(--accent)";
  return <span className="status-dot" style={{ background: color }} />;
}

function StatusBar({ language, execState }) {
  return (
    <div className="status-bar">
      <div className="status-left">
        <StatusDot state={execState} />
        <span className="brand">compiler.ai_</span>
      </div>
      <div className="status-right">
        <span className="lang-tag">{language}</span>
      </div>
    </div>
  );
}

/* ---------- Compiler tab bar ---------- */

function TabBar({ tabs, activeId, onSelect, onClose, onNew }) {
  return (
    <div className="tab-bar">
      <div className="tab-list">
        {tabs.map((t, i) => (
          <div key={t.id} className={"tab-item" + (t.id === activeId ? " active" : "")} onClick={() => onSelect(t.id)}>
            <span className="tab-label">Compiler {i + 1}</span>
            {tabs.length > 1 && (
              <button className="tab-close" onClick={(e) => { e.stopPropagation(); onClose(t.id); }} aria-label="Close tab">
                <CloseIcon />
              </button>
            )}
          </div>
        ))}
      </div>
      <button className="tab-new" onClick={onNew} title="New compiler tab" aria-label="New compiler tab">
        <PlusIcon />
      </button>
    </div>
  );
}

/* ---------- AI Help chat tab bar ---------- */

function ChatTabBar({ chats, activeId, onSelect, onClose, onNew }) {
  return (
    <div className="chat-tab-bar">
      <div className="chat-tab-list">
        {chats.map((c, i) => (
          <div key={c.id} className={"chat-tab-item" + (c.id === activeId ? " active" : "")} onClick={() => onSelect(c.id)}>
            <span className="chat-tab-label">Chat {i + 1}</span>
            {chats.length > 1 && (
              <button className="chat-tab-close" onClick={(e) => { e.stopPropagation(); onClose(c.id); }} aria-label="Close chat">
                <CloseIcon />
              </button>
            )}
          </div>
        ))}
      </div>
      <button className="chat-tab-new" onClick={onNew} title="New chat" aria-label="New chat">
        <PlusIcon />
      </button>
    </div>
  );
}

/* ---------- Code block + chat message ---------- */

function CodeBlock({ language, content }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };
  return (
    <div className="code-block">
      <div className="code-block-header">
        <span className="code-block-lang">{language || "code"}</span>
        <button className="code-block-copy" onClick={handleCopy} title="Copy code" aria-label="Copy code">
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
      </div>
      <pre className="code-block-body"><code>{content}</code></pre>
    </div>
  );
}

function parseMessageSegments(text) {
  const segments = [];
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0, match;
  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) segments.push({ type: "text", content: text.slice(lastIndex, match.index) });
    segments.push({ type: "code", language: match[1], content: match[2].replace(/\n$/, "") });
    lastIndex = codeBlockRegex.lastIndex;
  }
  if (lastIndex < text.length) segments.push({ type: "text", content: text.slice(lastIndex) });
  return segments;
}

// Renders **bold** and `inline code` markdown within a plain-text segment as
// real elements instead of showing the literal asterisks/backticks.
function renderInlineMarkdown(text, keyPrefix) {
  const parts = [];
  const inlineRegex = /\*\*(.+?)\*\*|`([^`]+)`/g;
  let lastIndex = 0, match, i = 0;
  while ((match = inlineRegex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    if (match[1] !== undefined) {
      parts.push(<strong key={`${keyPrefix}-b-${i}`}>{match[1]}</strong>);
    } else {
      parts.push(<code key={`${keyPrefix}-c-${i}`} className="inline-code">{match[2]}</code>);
    }
    lastIndex = inlineRegex.lastIndex;
    i++;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

// Strips markdown syntax (bold, inline code, code fences) so copied text
// reads as plain text instead of raw markdown source.
function stripMarkdown(text) {
  return String(text || "")
    .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, _lang, code) => code.replace(/\n$/, ""))
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
}

function MessageActions({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(stripMarkdown(text));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };
  return (
    <div className="msg-actions">
      <button className="msg-action-btn" onClick={handleCopy} title="Copy message" aria-label="Copy message">
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
    </div>
  );
}

function ChatMessage({ role, text, thinking, showExplainButton, onExplain, lineContext }) {
  if (thinking) {
    return (
      <div className="chat-msg ai thinking">
        <span className="thinking-dot" /><span className="thinking-dot" /><span className="thinking-dot" />
      </div>
    );
  }
  if (role === "system" && showExplainButton) {
    return (
      <div className="chat-msg system-with-action">
        <span>{text}</span>
        <button className="explain-btn" onClick={onExplain}>Show AI explanation</button>
      </div>
    );
  }
  if (role !== "ai") {
    return (
      <div className={"chat-msg-group " + role}>
        {lineContext && (
          <div className="msg-line-context">
            <PinIcon />
            <span>{lineContext}</span>
          </div>
        )}
        <div className={"chat-msg " + role}>{text}</div>
      </div>
    );
  }
  const segments = parseMessageSegments(text);
  return (
    <div className="chat-msg-group ai">
      <div className="chat-msg ai">
        {segments.map((seg, i) =>
          seg.type === "code"
            ? <CodeBlock key={i} language={seg.language} content={seg.content} />
            : <span key={i} className="chat-text-segment">{renderInlineMarkdown(seg.content, `seg-${i}`)}</span>
        )}
      </div>
      <MessageActions text={text} />
    </div>
  );
}

/* ---------- Line-numbered code editor ---------- */

function CodeEditor({ code, onChange, onSelectionChange }) {
  const textareaRef = useRef(null);
  const gutterRef = useRef(null);
  const lines = (code || "").split("\n");

  const syncScroll = () => {
    if (gutterRef.current && textareaRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleSelect = () => {
    const el = textareaRef.current;
    if (!el) return;
    const { selectionStart, selectionEnd } = el;
    if (selectionStart === selectionEnd) {
      onSelectionChange(null);
      return;
    }
    const before = code.slice(0, selectionStart);
    const startLine = before.split("\n").length;
    const selectedText = code.slice(selectionStart, selectionEnd);
    const endLine = startLine + selectedText.split("\n").length - 1;
    onSelectionChange({ startLine, endLine, text: selectedText });
  };

  return (
    <div className="code-editor-wrap">
      <div className="code-gutter" ref={gutterRef}>
        {lines.map((_, i) => <div key={i} className="gutter-line">{i + 1}</div>)}
      </div>
      <textarea
        ref={textareaRef}
        className="code-editor"
        placeholder="write your code here…"
        value={code}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        onSelect={handleSelect}
        onKeyUp={handleSelect}
        onMouseUp={handleSelect}
        spellCheck={false}
      />
    </div>
  );
}

/* ---------- Questions sidebar ---------- */

function QuestionsSidebar({ questions, onSelect, onAdd, onRemove }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);

  const startAdding = () => {
    setAdding(true);
    setDraft("");
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const commit = () => {
    const text = draft.trim();
    if (text) onAdd(text);
    setAdding(false);
    setDraft("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") { setAdding(false); setDraft(""); }
  };

  return (
    <aside className="questions-sidebar">
      <div className="sidebar-header">
        <span>Questions</span>
        <button className="sidebar-add" onClick={startAdding} title="Add a question" aria-label="Add a question">+</button>
      </div>

      {adding && (
        <div className="sidebar-add-row">
          <input
            ref={inputRef}
            className="sidebar-add-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={commit}
            placeholder="Type a question, press Enter…"
          />
        </div>
      )}

      {questions.length === 0 && !adding ? (
        <div className="sidebar-empty">
          <QuestionIcon />
          <div className="sidebar-empty-title">No questions yet</div>
          <div className="sidebar-empty-sub">Add a prompt to get started.</div>
        </div>
      ) : (
        <div className="sidebar-list">
          {questions.map((q, i) => (
            <div key={i} className="sidebar-item-row">
              <button className="sidebar-item" onClick={() => onSelect(q)} title="Opens in a new compiler tab">
                {q.length > 60 ? q.slice(0, 60) + "…" : q}
              </button>
              <button className="sidebar-item-remove" onClick={() => onRemove(i)} aria-label="Remove" title="Remove">
                <CloseIcon />
              </button>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}

/* ---------- Output panel ---------- */

function OutputPanel({ result, running }) {
  if (running) {
    return <div className="output-panel"><div className="output-status running"><span className="spinner" /> executing&hellip;</div></div>;
  }
  if (!result) {
    return <div className="output-panel"><div className="output-empty">run your code to see output here</div></div>;
  }
  const ok = isAccepted(result.status);
  const body = ok ? (result.stdout || "(no stdout)") : (result.stderr || result.compileOutput || "(no error detail)");
  return (
    <div className="output-panel">
      <div className={"output-status " + (ok ? "ok" : "error")}>{ok ? "✓ " : "✕ "}{result.status}</div>
      <pre className="output-body">{body}</pre>
    </div>
  );
}

/* ---------- App ---------- */

export default function App() {
  const [tabs, setTabs] = useState(() => [makeTab()]);
  const [activeTabId, setActiveTabId] = useState(() => tabs[0].id);
  const [questions, setQuestions] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const chatInputRef = useRef(null);
  const chipRef = useRef(null);
  const [chipPadding, setChipPadding] = useState(0);

  useEffect(() => {
    const el = chatInputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 220) + "px";
  }, [chatInput]);
  const [chatBusy, setChatBusy] = useState(false);
  const chatEndRef = useRef(null);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const activeChat = activeTab.chats.find((c) => c.id === activeTab.activeChatId) || activeTab.chats[0];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat.messages]);

  useEffect(() => {
    if (chipRef.current) {
      setChipPadding(chipRef.current.offsetWidth + 14);
    } else {
      setChipPadding(0);
    }
  }, [activeChat.selection]);

  // Generic helper to patch fields on the currently active tab only.
  const patchActiveTab = useCallback((patch) => {
    setTabs((prev) => prev.map((t) => (t.id === activeTabId ? { ...t, ...(typeof patch === "function" ? patch(t) : patch) } : t)));
  }, [activeTabId]);

  const handleLanguageChange = useCallback((e) => {
    const language = e.target.value;
    setTabs((prev) => prev.map((t) => (t.id === activeTabId
      ? { ...t, language, code: "", chats: t.chats.map((c) => (c.id === t.activeChatId ? { ...c, selection: null } : c)) }
      : t)));
  }, [activeTabId]);

  const handleNewTab = useCallback(() => {
    const t = makeTab();
    setTabs((prev) => [...prev, t]);
    setActiveTabId(t.id);
  }, []);

  const handleCloseTab = useCallback((id) => {
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (id === activeTabId && next.length > 0) {
        setActiveTabId(next[next.length - 1].id);
      }
      return next.length > 0 ? next : [makeTab()];
    });
  }, [activeTabId]);

  const runCode = useCallback(async () => {
    const tab = tabs.find((t) => t.id === activeTabId);
    if (!tab) return;

    patchActiveTab({ result: null, execState: "running" });

    try {
      const data = await postJson("/api/compiler/run", { sourceCode: tab.code, language: tab.language, stdin: "" });
      const ok = isAccepted(data.status);

      setTabs((prev) => prev.map((t) => {
        if (t.id !== activeTabId) return t;
        const updates = { result: data, execState: ok ? "ok" : "error" };
        if (!ok) {
          updates.chats = t.chats.map((c) => {
            if (c.id !== t.activeChatId) return c;
            const chatUpdates = {
              lastErrorContext: { code: t.code, language: t.language, compilerOutput: data.compileOutput || data.stderr || "" },
            };
            if (t.autoExplain) {
              chatUpdates.messages = [
                ...c.messages,
                { role: "system", text: `Detected: ${data.status}` },
                { role: "ai", text: data.aiReply || "No explanation available." },
              ];
            } else {
              chatUpdates.pendingAiReply = data.aiReply || "No explanation available.";
              chatUpdates.messages = [...c.messages, { role: "system", text: `Detected: ${data.status}`, showExplainButton: true }];
            }
            return { ...c, ...chatUpdates };
          });
        }
        return { ...t, ...updates };
      }));
    } catch (err) {
      patchActiveTab({ execState: "error", result: { status: "Request Failed", stderr: String(err.message || err) } });
    }
  }, [tabs, activeTabId, patchActiveTab]);

  const revealExplanation = useCallback(() => {
    setTabs((prev) => prev.map((t) => {
      if (t.id !== activeTabId) return t;
      return {
        ...t,
        chats: t.chats.map((c) => {
          if (c.id !== t.activeChatId || !c.pendingAiReply) return c;
          return { ...c, messages: [...c.messages, { role: "ai", text: c.pendingAiReply }], pendingAiReply: null };
        }),
      };
    }));
  }, [activeTabId]);

  const setSelection = useCallback((sel) => {
    setTabs((prev) => prev.map((t) => (t.id === activeTabId
      ? { ...t, chats: t.chats.map((c) => (c.id === t.activeChatId ? { ...c, selection: sel } : c)) }
      : t)));
  }, [activeTabId]);

  // Opens a brand-new chat tab within the current compiler tab, leaving all
  // earlier chats intact and switchable via the chat tab bar.
  const handleNewChat = useCallback(() => {
    setTabs((prev) => prev.map((t) => {
      if (t.id !== activeTabId) return t;
      const chat = makeChat("New chat started. Run your code or ask a question to begin.");
      return { ...t, chats: [...t.chats, chat], activeChatId: chat.id };
    }));
  }, [activeTabId]);

  const handleSelectChat = useCallback((chatId) => {
    setTabs((prev) => prev.map((t) => (t.id === activeTabId ? { ...t, activeChatId: chatId } : t)));
  }, [activeTabId]);

  const handleCloseChat = useCallback((chatId) => {
    setTabs((prev) => prev.map((t) => {
      if (t.id !== activeTabId || t.chats.length <= 1) return t;
      const next = t.chats.filter((c) => c.id !== chatId);
      const activeChatId = chatId === t.activeChatId ? next[next.length - 1].id : t.activeChatId;
      return { ...t, chats: next, activeChatId };
    }));
  }, [activeTabId]);

  const sendChatInTab = useCallback(async (tabId, chatId, text) => {
    const t = tabs.find((x) => x.id === tabId);
    const c = t?.chats.find((x) => x.id === chatId);
    if (!t || !c || !text.trim() || chatBusy) return;

    const lineContext = c.selection
      ? (c.selection.startLine === c.selection.endLine
        ? `Line ${c.selection.startLine}`
        : `Lines ${c.selection.startLine}-${c.selection.endLine}`)
      : null;

    const thinkingId = "thinking-" + Date.now();
    setTabs((prev) => prev.map((x) => (x.id === tabId
      ? { ...x, chats: x.chats.map((ch) => (ch.id === chatId ? { ...ch, messages: [...ch.messages, { role: "user", text, lineContext }, { role: "ai", text: "", thinking: true, id: thinkingId }] } : ch)) }
      : x)));
    setChatBusy(true);

    const ctx = c.selection
      ? { code: c.selection.text, language: t.language, compilerOutput: "" }
      : c.lastErrorContext || { code: "", language: "", compilerOutput: "" };

    try {
      const data = await postJson("/api/chatbot/chat", {
        sessionId: c.sessionId, code: ctx.code, language: ctx.language, compilerOutput: ctx.compilerOutput, userMessage: text,
      });
      setTabs((prev) => prev.map((x) => (x.id === tabId
        ? { ...x, chats: x.chats.map((ch) => (ch.id === chatId ? { ...ch, messages: ch.messages.map((m) => (m.id === thinkingId ? { role: "ai", text: data.reply || "No response." } : m)) } : ch)) }
        : x)));
    } catch (err) {
      setTabs((prev) => prev.map((x) => (x.id === tabId
        ? { ...x, chats: x.chats.map((ch) => (ch.id === chatId ? { ...ch, messages: ch.messages.map((m) => (m.id === thinkingId ? { role: "ai", text: "Failed to reach AI: " + (err.message || err) } : m)) } : ch)) }
        : x)));
    } finally {
      setChatBusy(false);
    }
  }, [tabs, chatBusy]);

  const sendChat = useCallback((overrideText) => {
    const text = (overrideText ?? chatInput).trim();
    if (!text) return;
    setChatInput("");
    if (chatInputRef.current) chatInputRef.current.style.height = "auto";
    sendChatInTab(activeTabId, activeTab.activeChatId, text);
  }, [chatInput, activeTabId, activeTab.activeChatId, sendChatInTab]);

  const handleChatKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChat();
    }
  }, [sendChat]);

  const addQuestion = useCallback((text) => {
    setQuestions((q) => [text, ...q].slice(0, 50));
  }, []);

  const removeQuestion = useCallback((index) => {
    setQuestions((q) => q.filter((_, i) => i !== index));
  }, []);

  // Selecting a saved question opens a brand-new compiler tab and immediately
  // asks that question there, instead of posting into the current tab's chat.
  const handleSelectQuestion = useCallback((q) => {
    const t = makeTab();
    setTabs((prev) => [...prev, t]);
    setActiveTabId(t.id);
    setTimeout(() => sendChatInTab(t.id, t.activeChatId, q), 0);
  }, [sendChatInTab]);

  return (
    <div className="app">
      <StatusBar language={activeTab.language} execState={activeTab.execState} />

      <div className="main-grid three-col">
        <QuestionsSidebar questions={questions} onSelect={handleSelectQuestion} onAdd={addQuestion} onRemove={removeQuestion} />

        <section className="editor-pane">
          <TabBar tabs={tabs} activeId={activeTabId} onSelect={setActiveTabId} onClose={handleCloseTab} onNew={handleNewTab} />

          <div className="pane-header">
            <div className="mac-dots">
              <span className="mac-dot red" /><span className="mac-dot yellow" /><span className="mac-dot green" />
            </div>
            <select className="lang-select" value={activeTab.language} onChange={handleLanguageChange}>
              {LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
            <label className="auto-explain-toggle" title="Automatically show AI explanation when an error is detected">
              <input
                type="checkbox"
                checked={activeTab.autoExplain}
                onChange={(e) => patchActiveTab({ autoExplain: e.target.checked })}
              />
              <span className="toggle-track"><span className="toggle-thumb" /></span>
              <span className="toggle-label">auto-explain</span>
            </label>
            <button className="run-btn" onClick={runCode} disabled={activeTab.execState === "running"}>
              {activeTab.execState === "running" ? "Running…" : "▶ Run"}
            </button>
          </div>

          <CodeEditor code={activeTab.code} onChange={(v) => patchActiveTab({ code: v })} onSelectionChange={setSelection} />

          <div className="output-section-inline">
            <div className="section-label">output</div>
            <OutputPanel result={activeTab.result} running={activeTab.execState === "running"} />
          </div>
        </section>

        <section className="ai-help-pane">
          <div className="ai-help-header">
            <span className="ai-help-title">AI Help</span>
            <span className="online-badge">online</span>
          </div>

          <ChatTabBar
            chats={activeTab.chats}
            activeId={activeTab.activeChatId}
            onSelect={handleSelectChat}
            onClose={handleCloseChat}
            onNew={handleNewChat}
          />

          <div className="chat-messages">
            {activeChat.messages.map((m, i) => (
              <ChatMessage
                key={m.id || i}
                role={m.role}
                text={m.text}
                thinking={m.thinking}
                showExplainButton={m.showExplainButton}
                onExplain={revealExplanation}
                lineContext={m.lineContext}
              />
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="chat-input-area">
            <div className="chat-input-row">
              <div className={"chat-input-wrap" + (activeChat.selection ? " has-chip" : "")}>
                {activeChat.selection && (
                  <div className="selection-chip" ref={chipRef}>
                    <PinIcon />
                    <span className="selection-chip-label">
                      {activeChat.selection.startLine === activeChat.selection.endLine
                        ? `Line ${activeChat.selection.startLine}`
                        : `Lines ${activeChat.selection.startLine}-${activeChat.selection.endLine}`}
                    </span>
                    <button className="selection-chip-close" onClick={() => setSelection(null)} aria-label="Dismiss">
                      <CloseIcon />
                    </button>
                  </div>
                )}
                <textarea
                  ref={chatInputRef}
                  className="chat-input"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleChatKeyDown}
                  placeholder="ask about the selected lines…"
                  disabled={chatBusy}
                  rows={1}
                  style={activeChat.selection ? { paddingLeft: chipPadding || 118 } : undefined}
                />
              </div>
              <button className="chat-send" onClick={() => sendChat()} disabled={chatBusy} aria-label="Send">
                <SendIcon />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}