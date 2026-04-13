import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import axios from 'axios';

const BOILERPLATES = {
  javascript: '// Online JavaScript Compiler\n// Use this editor to write, compile and run your JavaScript code online\n\nconsole.log("Hello, World!");',
  python: '# Online Python compiler (interpreter) to run Python online.\n# Write Python 3 code in this online editor and run it.\nprint("Hello, World!")',
  cpp: '// Online C++ Compiler\n// Use this editor to write, compile and run your C++ code online\n\n#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}',
  java: '// Online Java Compiler\n// Use this editor to write, compile and run your Java code online\n\nclass Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}'
};

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('isDarkMode');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('language') || 'javascript';
  });
  const [code, setCode] = useState(() => {
    const savedCode = localStorage.getItem('code');
    const savedLang = localStorage.getItem('language') || 'javascript';
    return savedCode !== null ? savedCode : BOILERPLATES[savedLang];
  });
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    setCode(BOILERPLATES[newLang]);
  };

  useEffect(() => {
    localStorage.setItem('isDarkMode', JSON.stringify(isDarkMode));
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('code', code);
  }, [code]);

  const handleRun = async () => {
    setLoading(true);
    setOutput('Running...');
    try {
      const response = await axios.post('http://localhost:5000/api/execute', {
        language,
        code
      });
      setOutput(response.data.output || 'No output');
    } catch (error) {
      setOutput(error.response?.data?.error || error.message);
    }
    setLoading(false);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="branding">
          <img src="/logo.jpg" alt="Logo" className="logo" />
          <h1>CodeSphere</h1>
        </div>
        <div className="controls">
          <select value={language} onChange={handleLanguageChange}>
            <option value="javascript">JavaScript (Node.js)</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
          </select>
          <button 
            className="theme-toggle" 
            onClick={() => setIsDarkMode(!isDarkMode)}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
          <button onClick={handleRun} disabled={loading} className={`run-button ${loading ? 'loading' : ''}`}>
            {loading ? <span className="spinner"></span> : 'Run Code'}
          </button>
        </div>
      </header>
      <div className="main-content">
        <div className="editor-container">
          <Editor
            height="100%"
            language={language === 'cpp' ? 'cpp' : language}
            theme={isDarkMode ? 'vs-dark' : 'light'}
            value={code}
            onChange={(value) => setCode(value)}
            options={{ fontSize: 14, minimap: { enabled: false } }}
          />
        </div>
        <div className="output-container">
          <h2>Output Terminal</h2>
          <pre className="output-console">{output}</pre>
        </div>
      </div>
    </div>
  );
}

export default App;
