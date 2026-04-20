async function runTest(name, payload) {
  console.log(`\n--- Running Test: ${name} ---`);
  try {
    const res = await fetch('http://localhost:5000/api/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      console.log('EXPECTED ERROR/TIMEOUT: ' + data.error);
      return data;
    }
    console.log('OUTPUT:\n' + data.output.trim());
    return data;
  } catch (err) {
    console.error('FETCH ERROR:', err.message);
  }
}

async function main() {
  console.log('Starting Comprehensive Compiler Tests...');

  // 1. Python: Multiple Inputs + Math
  await runTest('Python - Multiple Inputs', {
    language: 'python',
    files: [{ name: 'main.py', content: `
import sys
data = sys.stdin.read().split()
if not data:
    print("No input provided")
else:
    numbers = [int(x) for x in data]
    print(f"Sum: {sum(numbers)}")
    print(f"Max: {max(numbers)}")
` }],
    input: '10 20 30 40 50'
  });

  // 2. JavaScript: Multi-file (require)
  await runTest('JavaScript - Multi-file Execution', {
    language: 'javascript',
    files: [
      { name: 'index.js', content: `
        const helper = require('./helper.js');
        console.log(helper.greet("Alice"));
        console.log("Calculation:", helper.calculate(5, 7));
      `},
      { name: 'helper.js', content: `
        module.exports = {
          greet: (name) => "Hello, " + name + "!",
          calculate: (a, b) => a * b + 10
        };
      `}
    ],
    input: ''
  });

  // 3. C++: Loops & Conditionals
  await runTest('C++ - Standard Algorithms', {
    language: 'cpp',
    files: [{ name: 'main.cpp', content: `
#include <iostream>
#include <vector>
#include <algorithm>

int main() {
    int n;
    std::vector<int> v;
    while(std::cin >> n) {
        v.push_back(n);
    }
    std::sort(v.begin(), v.end());
    std::cout << "Sorted: ";
    for(int x : v) std::cout << x << " ";
    std::cout << std::endl;
    return 0;
}
` }],
    input: '5 2 9 1 5 6'
  });

  // 4. Java: Object Oriented & Input Parsing
  await runTest('Java - Scanner & OOP', {
    language: 'java',
    files: [{ name: 'Main.java', content: `
import java.util.Scanner;

class User {
    String name;
    int age;
    User(String n, int a) { name = n; age = a; }
    void printInfo() { System.out.println("User: " + name + ", Age: " + age); }
}

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int count = sc.nextInt();
        for (int i=0; i<count; i++) {
            String name = sc.next();
            int age = sc.nextInt();
            new User(name, age).printInfo();
        }
    }
}
` }],
    input: '2 Bob 30 Alice 25'
  });

  // 5. Timeout / Resource Limit Test (Python infinite loop)
  await runTest('Python - Infinite Loop (Timeout Test)', {
    language: 'python',
    files: [{ name: 'main.py', content: `
while True:
    pass
` }],
    input: ''
  });

  console.log('\nAll comprehensive tests completed!');
}

main();
