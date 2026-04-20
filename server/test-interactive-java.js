const io = require('socket.io-client');
const socket = io('http://localhost:5000');

socket.on('connect', () => {
  console.log('Connected, sending execute-interactive');
  socket.emit('execute-interactive', {
    language: 'java',
    files: [
      {
        name: 'Main.java',
        content: `
import java.util.Scanner;
class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
        Scanner sc = new Scanner(System.in);
        System.out.print("Enter your name: ");
        String name = sc.nextLine();
        System.out.println("Welcome, " + name + "!");
    }
}`
      }
    ]
  });
});

socket.on('terminal-output', (data) => {
  process.stdout.write(data);
  if (data.includes('Enter your name: ')) {
    socket.emit('terminal-input', 'TestUser\n');
  }
});

socket.on('execution-finished', () => {
  console.log('\nFinished');
  process.exit(0);
});
