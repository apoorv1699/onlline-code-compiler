import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import { io } from 'socket.io-client';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import 'xterm/css/xterm.css';

const BOILERPLATES = {
  javascript: { filename: 'index.js', code: '// Online JavaScript Compiler\n// Use this editor to write, compile and run your JavaScript code online\n\nconsole.log("Hello, World!");' },
  python: { filename: 'main.py', code: '# Online Python compiler (interpreter) to run Python online.\n# Write Python 3 code in this online editor and run it.\nprint("Hello, World!")' },
  cpp: { filename: 'main.cpp', code: '// Online C++ Compiler\n// Use this editor to write, compile and run your C++ code online\n\n#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}' },
  java: { filename: 'Main.java', code: '// Online Java Compiler\n// Use this editor to write, compile and run your Java code online\nimport java.util.Scanner;\n\nclass Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n        Scanner sc = new Scanner(System.in);\n        System.out.print("Enter your name: ");\n        String name = sc.nextLine();\n        System.out.println("Welcome, " + name + "!");\n    }\n}' }
};

const generateGuestName = () => `Guest-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
const generateRoomId = () => `room-${Math.random().toString(36).slice(2, 8)}`;

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('isDarkMode');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [language, setLanguage] = useState(() => localStorage.getItem('language') || 'javascript');
  const [files, setFiles] = useState(() => {
    const lang = localStorage.getItem('language') || 'javascript';
    return [{ name: BOILERPLATES[lang].filename, content: BOILERPLATES[lang].code }];
  });
  const [activeFile, setActiveFile] = useState(() => BOILERPLATES[localStorage.getItem('language') || 'javascript'].filename);
  
  const [loading, setLoading] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [activeTab, setActiveTab] = useState('terminal');
  
  // Chat
  const [chatText, setChatText] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  
  // Auth & Cloud
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '' });
  
  const [userName, setUserName] = useState(() => localStorage.getItem('userName') || (user ? user.username : generateGuestName()));

  const ydocRef = useRef(null);
  const providerRef = useRef(null);
  const bindingRef = useRef(null);
  const editorRef = useRef(null);
  const socketRef = useRef(null);
  
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const isRunningRef = useRef(false);

  useEffect(() => {
    localStorage.setItem('isDarkMode', JSON.stringify(isDarkMode));
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('userName', userName);
  }, [userName]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);
      if (user.username !== userName) setUserName(user.username);
    } else {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
  }, [user, token]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    let room = searchParams.get('roomId');
    if (!room) {
      room = generateRoomId();
      searchParams.set('roomId', room);
      window.history.replaceState(null, '', `?${searchParams.toString()}`);
    }
    setRoomId(room);
  }, []);

  // Xterm.js initialization
  useEffect(() => {
    if (activeTab === 'terminal' && terminalRef.current && !xtermRef.current) {
      const term = new Terminal({
        theme: {
          background: '#0d1117',
          foreground: '#c9d1d9',
          cursor: '#58a6ff'
        },
        fontFamily: "'Fira Code', 'Inter', monospace",
        fontSize: 14,
        cursorBlink: true,
        disableStdin: false
      });
      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(terminalRef.current);
      fitAddon.fit();
      
      term.writeln('Welcome to CodeSphere Interactive Terminal.');
      term.writeln('Click "Run Code" to start your program.');

      term.onData(data => {
        if (isRunningRef.current && socketRef.current) {
          socketRef.current.emit('terminal-input', data);
        }
      });
      xtermRef.current = term;

      const handleResize = () => fitAddon.fit();
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        term.dispose();
        xtermRef.current = null;
      };
    }
  }, [activeTab]);

  // Yjs setup
  useEffect(() => {
    if (!roomId) return;

    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider('ws://localhost:5000', roomId, ydoc);
    
    provider.awareness.setLocalStateField('user', {
      name: userName,
      color: `hsl(${Math.floor(Math.random() * 360)} 80% 70%)`
    });

    provider.on('status', ({ status }) => {
      setConnectionStatus(status === 'connected' ? 'Connected to room' : 'Reconnecting...');
    });

    const yfiles = ydoc.getMap('files');
    
    const handleSync = (isSynced) => {
      if (!isSynced) return;
      if (Array.from(yfiles.keys()).length === 0) {
        // Init room with boilerplate
        const defaultFile = BOILERPLATES[language];
        const ytext = new Y.Text(defaultFile.code);
        yfiles.set(defaultFile.filename, ytext);
        
        const currentFiles = [];
        yfiles.forEach((text, name) => currentFiles.push({ name, content: text.toString() }));
        setFiles(currentFiles);
      } else {
        const currentFiles = [];
        yfiles.forEach((text, name) => currentFiles.push({ name, content: text.toString() }));
        setFiles(currentFiles);
        if (!currentFiles.find(f => f.name === activeFile)) {
          setActiveFile(currentFiles[0]?.name || '');
        }
      }
    };

    yfiles.observe(() => {
      const currentFiles = [];
      yfiles.forEach((text, name) => currentFiles.push({ name, content: text.toString() }));
      setFiles(currentFiles);
    });

    provider.on('sync', handleSync);

    ydocRef.current = ydoc;
    providerRef.current = provider;

    return () => {
      provider.off('sync', handleSync);
      provider.destroy();
      ydoc.destroy();
    };
  }, [roomId]);

  // Handle active file change / editor binding
  useEffect(() => {
    if (!editorRef.current || !ydocRef.current || !providerRef.current || !activeFile) return;

    const yfiles = ydocRef.current.getMap('files');
    if (!yfiles.has(activeFile)) {
      yfiles.set(activeFile, new Y.Text(''));
    }
    const ytext = yfiles.get(activeFile);

    if (bindingRef.current) {
      bindingRef.current.destroy();
    }

    editorRef.current.setValue(ytext.toString());

    bindingRef.current = new MonacoBinding(
      ytext,
      editorRef.current.getModel(),
      new Set([editorRef.current]),
      providerRef.current.awareness
    );
  }, [activeFile, files.length]);

  // Socket for Chat & Terminal
  useEffect(() => {
    if (!roomId) return;
    const socket = io('http://localhost:5000');
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-room', { roomId, userName });
    });

    socket.on('chatMessage', (message) => {
      setChatMessages((prev) => [...prev, message]);
    });

    socket.on('terminal-output', (data) => {
      if (xtermRef.current) {
        xtermRef.current.write(data);
      }
    });

    socket.on('execution-finished', () => {
      setLoading(false);
      isRunningRef.current = false;
    });

    return () => socket.disconnect();
  }, [roomId, userName]);

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    const boilerplate = BOILERPLATES[newLang];

    if (ydocRef.current) {
      const yfiles = ydocRef.current.getMap('files');
      yfiles.forEach((val, key) => yfiles.delete(key)); // clear map
      yfiles.set(boilerplate.filename, new Y.Text(boilerplate.code));
    }
    setActiveFile(boilerplate.filename);
  };

  const handleEditorMount = (editor) => {
    editorRef.current = editor;
    
    // Force binding initialization
    if (ydocRef.current && activeFile) {
      const yfiles = ydocRef.current.getMap('files');
      if (yfiles.has(activeFile)) {
        bindingRef.current = new MonacoBinding(
          yfiles.get(activeFile),
          editor.getModel(),
          new Set([editor]),
          providerRef.current.awareness
        );
      }
    }
  };

  const handleRun = () => {
    if (loading) return;
    setActiveTab('terminal');
    setLoading(true);
    isRunningRef.current = true;
    
    if (xtermRef.current) {
      xtermRef.current.clear();
      xtermRef.current.reset();
    }
    
    const executionFiles = [];
    if (ydocRef.current) {
       ydocRef.current.getMap('files').forEach((ytext, name) => {
         executionFiles.push({ name, content: ytext.toString() });
       });
    } else {
       executionFiles.push(...files);
    }

    socketRef.current.emit('execute-interactive', { language, files: executionFiles });
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const res = await axios.post(`http://localhost:5000${endpoint}`, authForm);
      setUser(res.data.user);
      setToken(res.data.token);
      setShowAuth(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Authentication error');
    }
  };

  const saveProject = async () => {
    if (!user) return setShowAuth(true);
    
    const projectFiles = [];
    ydocRef.current.getMap('files').forEach((ytext, name) => {
       projectFiles.push({ name, content: ytext.toString() });
    });

    const projectName = prompt("Enter project name:", "My Project");
    if (!projectName) return;

    try {
      await axios.post('http://localhost:5000/api/projects', {
        name: projectName,
        language,
        files: projectFiles
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Project saved successfully!');
    } catch (err) {
      alert('Error saving project');
    }
  };

  const createNewFile = () => {
    const filename = prompt("Enter new filename (e.g. utils.js):");
    if (!filename || files.find(f => f.name === filename)) return;
    
    if (ydocRef.current) {
      ydocRef.current.getMap('files').set(filename, new Y.Text(''));
    }
    setActiveFile(filename);
  };

  const sendChatMessage = () => {
    if (!chatText.trim() || !socketRef.current) return;
    socketRef.current.emit('send-chat', { roomId, userName, text: chatText.trim() });
    setChatText('');
  };

  return (
    <div className="app-container">
      {/* Auth Modal */}
      {showAuth && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{authMode === 'login' ? 'Log In' : 'Sign Up'}</h2>
            <form onSubmit={handleAuth}>
              {authMode === 'register' && (
                <input placeholder="Username" value={authForm.username} onChange={e => setAuthForm({...authForm, username: e.target.value})} required />
              )}
              <input type="email" placeholder="Email" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} required />
              <input type="password" placeholder="Password" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} required />
              <button type="submit">{authMode === 'login' ? 'Log In' : 'Sign Up'}</button>
            </form>
            <button className="close-btn" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
              Switch to {authMode === 'login' ? 'Sign Up' : 'Log In'}
            </button>
            <button className="close-btn" onClick={() => setShowAuth(false)} style={{marginTop: '10px'}}>Cancel</button>
          </div>
        </div>
      )}

      <header className="app-header">
        <div className="branding">
          <img src="/logo.jpg" alt="Logo" className="logo" />
          <div>
            <h1>CodeSphere</h1>
            <p className="room-info">Room: <strong>{roomId}</strong></p>
          </div>
        </div>

        <div className="controls">
          <select value={language} onChange={handleLanguageChange}>
            <option value="javascript">JavaScript (Node.js)</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
          </select>

          <button className="theme-toggle" onClick={() => setIsDarkMode(!isDarkMode)}>
            {isDarkMode ? '☀️' : '🌙'}
          </button>
          
          <button onClick={saveProject} className="reset-button" style={{background: 'rgba(99, 102, 241, 0.2)', color: 'var(--primary)', borderColor: 'var(--primary)'}}>
            ☁️ Save
          </button>
          
          {!user ? (
            <button onClick={() => setShowAuth(true)} className="reset-button" style={{color: 'white', background: 'var(--primary)'}}>Login</button>
          ) : (
            <button onClick={() => setUser(null)} className="reset-button">Logout ({user.username})</button>
          )}

          <button onClick={handleRun} disabled={loading} className={`run-button ${loading ? 'loading' : ''}`}>
            {loading ? <span className="spinner"></span> : 'Run Code'}
          </button>
        </div>
      </header>

      <div className="main-content">
        {/* Multi-file Explorer */}
        <div className="editor-container" style={{ padding: 0 }}>
          <div className="file-tree">
            <div className="file-tree-header">
              <span>EXPLORER</span>
              <button onClick={createNewFile} style={{background:'transparent', color:'var(--primary)', border:'none', cursor:'pointer', fontSize:'1.2rem'}}>+</button>
            </div>
            {files.map(file => (
              <div 
                key={file.name} 
                className={`file-item ${activeFile === file.name ? 'active' : ''}`}
                onClick={() => setActiveFile(file.name)}
              >
                📄 {file.name}
              </div>
            ))}
          </div>
          <div className="editor-wrapper">
            <Editor
              height="100%"
              language={language === 'cpp' ? 'cpp' : language}
              theme={isDarkMode ? 'vs-dark' : 'light'}
              onMount={handleEditorMount}
              options={{ fontSize: 14, minimap: { enabled: false } }}
            />
          </div>
        </div>

        <div className="side-panel">
          <div className="room-status-panel">
            <div className="connection-pill">{connectionStatus}</div>
            <button className="copy-room-button" onClick={() => navigator.clipboard.writeText(`${window.location.origin}?roomId=${roomId}`)}>
              Copy Room Link
            </button>
          </div>

          <div className="tab-controls">
            <button className={activeTab === 'terminal' ? 'tab active' : 'tab'} onClick={() => setActiveTab('terminal')}>Terminal</button>
            <button className={activeTab === 'chat' ? 'tab active' : 'tab'} onClick={() => setActiveTab('chat')}>Chat</button>
          </div>

          {activeTab === 'terminal' ? (
            <div className="xterm-wrapper" ref={terminalRef} style={{ flex: 1, padding: '10px', overflow: 'hidden', backgroundColor: '#0d1117', borderRadius: '8px', margin: '0 10px 10px' }}></div>
          ) : (
            <div className="chat-panel">
              <div className="chat-header">
                <div>
                  <div className="chat-title">Live Chat</div>
                  <div className="chat-subtitle">Logged in as <strong>{userName}</strong></div>
                </div>
              </div>
              <div className="chat-messages">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={msg.system ? 'chat-message system' : 'chat-message'}>
                    {msg.system ? <span>{msg.text}</span> : <><span className="chat-author">{msg.userName}</span><span className="chat-text">{msg.text}</span></>}
                  </div>
                ))}
              </div>
              <div className="chat-input-row">
                <input className="chat-input" value={chatText} onChange={e => setChatText(e.target.value)} placeholder="Type a message..." />
                <button className="send-button" onClick={sendChatMessage}>Send</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
