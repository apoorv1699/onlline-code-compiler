const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const crypto = require('crypto');

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

const executeCode = (language, code, input = '') => {
  return new Promise((resolve, reject) => {
    if (!images[language]) {
      return reject(new Error(`Language ${language} is not supported.`));
    }

    const fileId = crypto.randomBytes(16).toString('hex');
    const ext = extensions[language];
    const execDir = path.join(TEMP_DIR, fileId);
    fs.mkdirSync(execDir, { recursive: true });

    const filename = language === 'java' ? 'Main.java' : `index.${ext}`;
    const filePath = path.join(execDir, filename);

    // Write code to a temp file
    fs.writeFileSync(filePath, code);

    // Write input to a temp file
    fs.writeFileSync(path.join(execDir, 'input.txt'), input || '');

    // Docker command to mount the temp dir and run the code
    const dockerCmd = `docker run --rm -v "${execDir}:/usr/src/app" -w /usr/src/app ${images[language]} sh -c "${runCommands[language](filename)} < input.txt"`;

    exec(dockerCmd, { timeout: 10000 }, (error, stdout, stderr) => {
      // Cleanup files safely
      try {
        fs.rmSync(execDir, { recursive: true, force: true });
      } catch (err) {
        console.error('Failed to cleanup directory', err);
      }

      if (error) {
        if (error.killed) {
          return reject(new Error('Execution timed out'));
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

module.exports = { executeCode };
