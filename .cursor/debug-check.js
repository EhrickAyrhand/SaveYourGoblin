// Debug check script - tests module resolution and dependencies
const fs = require('fs');
const path = require('path');

const logPath = path.join(__dirname, 'debug.log');

function logDebug(data) {
  const logEntry = JSON.stringify({
    ...data,
    timestamp: Date.now(),
    sessionId: 'debug-session'
  }) + '\n';
  fs.appendFileSync(logPath, logEntry, 'utf8');
}

// Test 1: Check if @ path alias works (Hypothesis A, C)
logDebug({
  location: 'debug-check.js:15',
  message: 'Starting module resolution test',
  data: { test: 'path-alias-check' },
  hypothesisId: 'A'
});

// Test 2: Check process.env access (Hypothesis D)
logDebug({
  location: 'debug-check.js:22',
  message: 'Testing process.env access',
  data: { 
    hasProcess: typeof process !== 'undefined',
    hasEnv: typeof process !== 'undefined' && typeof process.env !== 'undefined',
    nodeEnv: typeof process !== 'undefined' ? process.env.NODE_ENV : 'undefined'
  },
  hypothesisId: 'D'
});

// Test 3: Check if dependencies exist (Hypothesis B)
const nodeModulesPath = path.join(__dirname, '..', 'node_modules');

logDebug({
  location: 'debug-check.js:35',
  message: 'Checking node_modules existence',
  data: { 
    exists: fs.existsSync(nodeModulesPath),
    path: nodeModulesPath
  },
  hypothesisId: 'B'
});

// Test 4: Check specific packages (Hypothesis B)
const packages = ['@radix-ui/react-label', '@radix-ui/react-slot', 'react-hook-form', 'zod'];
const packageChecks = packages.map(pkg => {
  const pkgPath = path.join(nodeModulesPath, pkg);
  return { package: pkg, exists: fs.existsSync(pkgPath) };
});

logDebug({
  location: 'debug-check.js:47',
  message: 'Checking specific package installations',
  data: { packages: packageChecks },
  hypothesisId: 'B'
});

console.log('Debug check completed. Check .cursor/debug.log for results.');
