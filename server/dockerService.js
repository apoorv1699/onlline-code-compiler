const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const crypto = require('crypto');
const pty = require('node-pty');

const TEMP_DIR = path.join(__dirname, 'temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR);
}

const images = {
  python: 'python:3.9-slim',
  javascript: 'node:18-slim',
  cpp: 'gcc:latest',
  java: 'eclipse-temurin:17-jdk-alpine'
};

const extensions = {
  python: 'py',
  javascript: 'js',
  cpp: 'cpp',
  java: 'java'
};

const runCommands = {
  python: (filePath) => `python ${filePath}`,
  javascript: (filePath) => `node ${filePath}`,
  cpp: (filePath) => {
    const outPath = filePath.replace('.cpp', '.out');
    return `g++ ${filePath} -o ${outPath} && ./${outPath}`;
  },
  java: (filePath) => `javac ${filePath} && java Main`
};

// Simple async queue for concurrency limits
const MAX_CONCURRENT_JOBS = 5;
let activeJobs = 0;
const jobQueue = [];

const enqueueJob = () => {
  return new Promise((resolve) => {
    if (activeJobs < MAX_CONCURRENT_JOBS) {
      activeJobs++;
      resolve();
    } else {
      jobQueue.push(resolve);
    }
  });
};

const dequeueJob = () => {
  if (jobQueue.length > 0) {
    const nextResolve = jobQueue.shift();
    nextResolve();
  } else {
    activeJobs--;
  }
};

const executeCode = async (language, code, files = [], input = '') => {
  await enqueueJob();

  return new Promise((resolve, reject) => {
    if (!images[language]) {
      dequeueJob();
      return reject(new Error(`Language ${language} is not supported.`));
    }

    const fileId = crypto.randomBytes(16).toString('hex');
    const ext = extensions[language];
    const execDir = path.join(TEMP_DIR, fileId);
    fs.mkdirSync(execDir, { recursive: true });

    let entryFilename = language === 'java' ? 'Main.java' : `index.${ext}`;

    if (files && files.length > 0) {
      files.forEach(f => {
        // Sanitize path to prevent traversal
        const normalizedName = path.normalize(f.name).replace(/^(\.\.[\/\\])+/, '');
        const filePath = path.join(execDir, normalizedName);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, f.content);
      });
      
      // Determine entry point
      if (language === 'python' && files.some(f => f.name === 'main.py')) entryFilename = 'main.py';
      else if (language === 'javascript' && files.some(f => f.name === 'index.js')) entryFilename = 'index.js';
      else if (language === 'cpp' && files.some(f => f.name === 'main.cpp')) entryFilename = 'main.cpp';
      else if (language === 'java' && files.some(f => f.name === 'Main.java')) entryFilename = 'Main.java';
      else entryFilename = files[0].name;
    } else {
      // Write legacy code string to a temp file
      const filePath = path.join(execDir, entryFilename);
      fs.writeFileSync(filePath, code || '');
    }

    // Write input to a temp file
    fs.writeFileSync(path.join(execDir, 'input.txt'), input || '');

    // Docker command to mount the temp dir and run the code with limits
    const dockerCmd = `docker run --rm --memory="256m" --cpus="0.5" --pids-limit=50 --network none -v "${execDir}:/usr/src/app" -w /usr/src/app ${images[language]} sh -c "${runCommands[language](entryFilename)} < input.txt"`;

    exec(dockerCmd, { timeout: 10000 }, (error, stdout, stderr) => {
      // Cleanup files safely
      try {
        fs.rmSync(execDir, { recursive: true, force: true });
      } catch (err) {
        console.error('Failed to cleanup directory', err);
      }
      
      dequeueJob();

      if (error) {
        if (error.killed) {
          return reject(new Error('Execution timed out or hit resource limits'));
        }
        return reject(new Error(stderr || error.message));
      }
      if (stderr) {
        return reject(new Error(stderr));
      }

      resolve(stdout);
    });
  });
};

const spawnInteractive = async (socket, language, files = []) => {
  await enqueueJob();

  if (!images[language]) {
    dequeueJob();
    socket.emit('terminal-output', `\r\nError: Language ${language} is not supported.\r\n`);
    socket.disconnect();
    return;
  }

  const fileId = crypto.randomBytes(16).toString('hex');
  const ext = extensions[language];
  const execDir = path.join(TEMP_DIR, fileId);
  fs.mkdirSync(execDir, { recursive: true });

  let entryFilename = language === 'java' ? 'Main.java' : `index.${ext}`;

  if (files && files.length > 0) {
    console.log("Interactive files received:", files.map(f => f.name));
    files.forEach(f => {
      const normalizedName = path.normalize(f.name).replace(/^(\.\.[\/\\])+/, '');
      const filePath = path.join(execDir, normalizedName);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, f.content || '');
      console.log(`Wrote ${filePath} with size ${f.content ? f.content.length : 0}`);
    });
    
    if (language === 'python' && files.some(f => f.name === 'main.py')) entryFilename = 'main.py';
    else if (language === 'javascript' && files.some(f => f.name === 'index.js')) entryFilename = 'index.js';
    else if (language === 'cpp' && files.some(f => f.name === 'main.cpp')) entryFilename = 'main.cpp';
    else if (language === 'java' && files.some(f => f.name === 'Main.java')) entryFilename = 'Main.java';
    else entryFilename = files[0].name;
  }

  const dockerArgs = [
    'run', '-i', '--rm',
    '--memory=256m', '--cpus=0.5', '--pids-limit=50', '--network', 'none',
    '-v', `${execDir}:/usr/src/app`,
    '-w', '/usr/src/app',
    images[language],
    'sh', '-c', runCommands[language](entryFilename)
  ];

  // Wait 250ms to allow Windows Docker Desktop volume sync
  await new Promise(resolve => setTimeout(resolve, 250));

  const ptyProcess = pty.spawn('docker', dockerArgs, {
    name: 'xterm-color',
    cols: 80,
    rows: 24,
    cwd: execDir,
    env: process.env
  });

  socket.emit('terminal-output', '\r\n\x1b[36m--- Execution Started ---\x1b[0m\r\n');

  ptyProcess.onData((data) => {
    socket.emit('terminal-output', data);
  });

  const onInput = (data) => {
    ptyProcess.write(data);
  };
  socket.on('terminal-input', onInput);

  let isKilled = false;
  const timeoutId = setTimeout(() => {
    isKilled = true;
    socket.emit('terminal-output', '\r\n\x1b[31m--- Execution Timed Out (60s) ---\x1b[0m\r\n');
    ptyProcess.kill();
  }, 60000);

  ptyProcess.onExit(({ exitCode, signal }) => {
    clearTimeout(timeoutId);
    socket.off('terminal-input', onInput);
    if (!isKilled) {
      socket.emit('terminal-output', `\r\n\x1b[36m--- Execution Finished (Code ${exitCode}) ---\x1b[0m\r\n`);
    }
    
    try {
      fs.rmSync(execDir, { recursive: true, force: true });
    } catch (err) {
      console.error('Failed to cleanup directory', err);
    }
    
    dequeueJob();
    socket.emit('execution-finished');
  });

  socket.on('disconnect', () => {
    clearTimeout(timeoutId);
    ptyProcess.kill();
  });
};

module.exports = { executeCode, spawnInteractive };
