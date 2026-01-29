import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import Editor from "@monaco-editor/react";
import "./App.css";

const socket = io("http://localhost:5000");

// Language options for the dropdown (with Judge0 language IDs)
const LANGUAGES = [
  { id: 63, name: "JavaScript", value: "javascript" },
  { id: 71, name: "Python", value: "python" },
  { id: 54, name: "C++", value: "cpp" },
  { id: 62, name: "Java", value: "java" },
  { id: 51, name: "C#", value: "csharp" },
];

function App() {
  const [room, setRoom] = useState("");
  const [joined, setJoined] = useState(false);
  const [code, setCode] = useState("// Start coding here...\n");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [activeFile, setActiveFile] = useState("main.js");
  const editorRef = useRef(null);

  // Files mock (for demo purposes)
  const [files] = useState([
    { name: "main.js", content: "// Start coding here...\n" },
    { name: "utils.js", content: "// Utility functions\n" },
    { name: "README.md", content: "# My Project\n" },
  ]);

  useEffect(() => {
    // Listen for code updates from other users
    socket.on("code-update", (newCode) => {
      setCode(newCode);
    });

    // Listen for initial code when joining a room
    socket.on("init-code", (initialCode) => {
      setCode(initialCode);
    });

    return () => {
      socket.off("code-update");
      socket.off("init-code");
    };
  }, []);

  const joinRoom = () => {
    if (room.trim() !== "") {
      socket.emit("join-room", room);
      setJoined(true);
    }
  };

  const handleEditorChange = (value) => {
    setCode(value || "");
    socket.emit("code-change", { roomId: room, code: value });
  };

  const handleEditorMount = (editor) => {
    editorRef.current = editor;
  };

  const runCode = async () => {
    setIsRunning(true);
    setOutput("⏳ Running...\n");
    setTerminalOpen(true);

    try {
      const response = await fetch("http://localhost:5000/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code,
          languageId: language.id,
        }),
      });

      const result = await response.json();

      if (result.error) {
        setOutput(`❌ Error:\n${result.error}`);
      } else if (result.stderr) {
        setOutput(`⚠️ Stderr:\n${result.stderr}`);
      } else {
        setOutput(`✅ Output:\n${result.stdout || "(No output)"}`);
      }
    } catch (err) {
      setOutput(`❌ Connection Error:\n${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleFileClick = (fileName) => {
    setActiveFile(fileName);
    const file = files.find((f) => f.name === fileName);
    if (file) {
      setCode(file.content);
    }
  };

  // Get file extension icon
  const getFileIcon = (fileName) => {
    if (fileName.endsWith(".js")) return "📜";
    if (fileName.endsWith(".py")) return "🐍";
    if (fileName.endsWith(".md")) return "📝";
    if (fileName.endsWith(".json")) return "📋";
    return "📄";
  };

  return (
    <div className="app-container">
      {!joined ? (
        /* ========== LOGIN SCREEN ========== */
        <div className="login-screen">
          <div className="glass-panel">
            <div className="logo-container">
              <span className="logo-icon">🚀</span>
              <h1>Antigravity IDE</h1>
            </div>
            <p className="tagline">Collaborative coding in real-time</p>
            <input
              placeholder="Enter Room ID..."
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && joinRoom()}
            />
            <button className="primary-btn" onClick={joinRoom}>
              Enter Workspace
            </button>
          </div>
        </div>
      ) : (
        /* ========== IDE LAYOUT ========== */
        <div
          className="ide-layout"
          style={{
            gridTemplateColumns: sidebarOpen ? "48px 240px 1fr" : "48px 0px 1fr",
          }}
        >
          {/* 1. Activity Bar */}
          <div className="activity-bar">
            <div
              className={`activity-icon ${sidebarOpen ? "active" : ""}`}
              title="Explorer"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.5 0h-9L7 1.5V6H2.5L1 7.5v15.07L2.5 24h12.07L16 22.57V18h4.7l1.3-1.43V4.5L17.5 0zm0 2.12l2.38 2.38H17.5V2.12zm-3 20.38h-12v-15H7v9.07L8.5 18h6v4.5zm6-6h-12v-15H16v4.5h4.5v10.5z" />
              </svg>
            </div>
            <div className="activity-icon" title="Search">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.25 0a8.25 8.25 0 0 0-6.18 13.72L1 22.88l1.12 1.12 8.05-9.12A8.251 8.251 0 1 0 15.25.01V0zm0 15a6.75 6.75 0 1 1 0-13.5 6.75 6.75 0 0 1 0 13.5z" />
              </svg>
            </div>
            <div className="activity-icon" title="Source Control">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21.007 8.222A3.738 3.738 0 0 0 17.5 5.5a3.7 3.7 0 0 0-1.166.189 4.988 4.988 0 0 0-9.477 1.059A4.49 4.49 0 0 0 2 11.25a4.49 4.49 0 0 0 4.5 4.5h9.508a4.49 4.49 0 0 0 4.5-4.5 4.51 4.51 0 0 0-.501-2.028zM16.008 14.25H6.5a3 3 0 0 1 0-6 3.38 3.38 0 0 1 .344.019l1.115.112.053-1.119a3.5 3.5 0 0 1 6.958-.319l.188.831.814-.25a2.252 2.252 0 0 1 .719-.122 2.25 2.25 0 0 1 1.317 4.097v.001a2.25 2.25 0 0 1-2 .75z" />
              </svg>
            </div>
            <div className="activity-spacer"></div>
            <div className="activity-icon" title="Settings">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.85 8.75l4.15.83v4.84l-4.15.83 2.35 3.52-3.43 3.43-3.52-2.35-.83 4.15H9.58l-.83-4.15-3.52 2.35-3.43-3.43 2.35-3.52L0 11.42V6.58l4.15-.83L1.8 2.23 5.23-1.2l3.52 2.35L9.58-3h4.84l.83 4.15 3.52-2.35 3.43 3.43-2.35 3.52zM12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
              </svg>
            </div>
          </div>

          {/* 2. Sidebar */}
          <div className="sidebar">
            <div className="sidebar-header">
              <span>EXPLORER</span>
            </div>

            <div className="sidebar-section">
              <div className="sidebar-title">
                <span className="arrow">▼</span> WORKSPACE
              </div>
              <div className="file-tree">
                {files.map((file) => (
                  <div
                    key={file.name}
                    className={`file-item ${activeFile === file.name ? "active" : ""}`}
                    onClick={() => handleFileClick(file.name)}
                  >
                    <span className="file-icon">{getFileIcon(file.name)}</span>
                    <span className="file-name">{file.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="room-display">
              <div className="room-label">ROOM</div>
              <div className="room-id">#{room}</div>
              <div className="connection-status">
                <span className="status-dot"></span>
                Connected
              </div>
            </div>
          </div>

          {/* 3. Main Content Area */}
          <div className="main-content">
            {/* Editor Area */}
            <div className="editor-area">
              {/* Tabs and Toolbar */}
              <div className="editor-header">
                <div className="editor-tabs">
                  <div className="tab active">
                    <span>{getFileIcon(activeFile)}</span>
                    <span>{activeFile}</span>
                    <span className="tab-close">×</span>
                  </div>
                </div>
                <div className="toolbar">
                  <select
                    className="language-select"
                    value={language.value}
                    onChange={(e) => {
                      const lang = LANGUAGES.find((l) => l.value === e.target.value);
                      setLanguage(lang);
                    }}
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.id} value={lang.value}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                  <button
                    className="run-btn"
                    onClick={runCode}
                    disabled={isRunning}
                  >
                    {isRunning ? "⏳ Running..." : "▶ Run"}
                  </button>
                </div>
              </div>

              {/* Monaco Editor */}
              <div className="editor-container">
                <Editor
                  height="100%"
                  language={language.value}
                  value={code}
                  theme="vs-dark"
                  onChange={handleEditorChange}
                  onMount={handleEditorMount}
                  options={{
                    fontSize: 14,
                    fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
                    minimap: { enabled: true },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    padding: { top: 16 },
                    lineNumbers: "on",
                    renderLineHighlight: "all",
                    cursorBlinking: "smooth",
                    cursorSmoothCaretAnimation: "on",
                  }}
                />
              </div>
            </div>

            {/* Terminal Panel */}
            <div className={`terminal-panel ${terminalOpen ? "open" : ""}`}>
              <div className="terminal-header">
                <div className="terminal-tabs">
                  <span className="terminal-tab active">OUTPUT</span>
                  <span className="terminal-tab">TERMINAL</span>
                  <span className="terminal-tab">PROBLEMS</span>
                </div>
                <div className="terminal-actions">
                  <button
                    className="terminal-btn"
                    onClick={() => setOutput("")}
                    title="Clear"
                  >
                    🗑️
                  </button>
                  <button
                    className="terminal-btn"
                    onClick={() => setTerminalOpen(!terminalOpen)}
                    title={terminalOpen ? "Minimize" : "Maximize"}
                  >
                    {terminalOpen ? "▼" : "▲"}
                  </button>
                </div>
              </div>
              <div className="terminal-content">
                <pre>{output || "Ready to run code..."}</pre>
              </div>
            </div>
          </div>

          {/* 4. Status Bar */}
          <div className="status-bar">
            <div className="status-left">
              <span className="status-item branch">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M14 3.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm-6.5 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM6 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm1-4.5a2.5 2.5 0 1 0-2-1 2.5 2.5 0 0 0 2 1zM4.5 6h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1 0-1zm6 2a.5.5 0 0 0-.5.5v2a.5.5 0 0 0 1 0v-2a.5.5 0 0 0-.5-.5z" />
                </svg>
                main
              </span>
              <span className="status-item">✓ 0 Problems</span>
            </div>
            <div className="status-right">
              <span className="status-item">Ln {code.split("\n").length}</span>
              <span className="status-item">UTF-8</span>
              <span className="status-item">{language.name}</span>
              <span className="status-item">
                <span className="status-dot"></span>
                Room: {room}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
