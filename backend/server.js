const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Socket.IO setup
const io = new Server(server, {
    cors: {
        origin: "*", // Configure this properly for production
        methods: ["GET", "POST"]
    }
});

// In-memory store for room states
const rooms = new Map();

// Socket.IO Events
io.on('connection', (socket) => {
    console.log('✅ User connected:', socket.id);

    // Join a room
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`👥 User ${socket.id} joined room: ${roomId}`);

        // Send current code state to the new user
        if (rooms.has(roomId)) {
            socket.emit('init-code', rooms.get(roomId));
        } else {
            rooms.set(roomId, '// Start coding here...\n');
        }
    });

    // Handle code changes
    socket.on('code-change', ({ roomId, code }) => {
        // Update room state
        rooms.set(roomId, code);

        // Broadcast to all other users in the room
        socket.to(roomId).emit('code-update', code);
    });

    // Disconnect
    socket.on('disconnect', () => {
        console.log('❌ User disconnected:', socket.id);
    });
});

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        status: 'running',
        message: 'Antigravity IDE Server',
        activeRooms: rooms.size
    });
});

// ========================================
// CODE EXECUTION API (using Judge0)
// ========================================

// Judge0 API configuration
// Using the public RapidAPI hosted version
// You can also self-host Judge0 for production
const JUDGE0_API = 'https://judge0-ce.p.rapidapi.com';

// For demo purposes, we'll use a simple approach
// In production, you'd want to add your RapidAPI key
app.post('/run', async (req, res) => {
    const { code, languageId } = req.body;

    if (!code || !languageId) {
        return res.status(400).json({ error: 'Code and languageId are required' });
    }

    try {
        // For demo/development, we'll simulate code execution
        // In production, replace this with actual Judge0 API calls

        console.log(`🚀 Running code (Language ID: ${languageId})`);
        console.log('Code:', code.substring(0, 100) + '...');

        // Simulate execution for JavaScript (languageId: 63)
        if (languageId === 63) {
            try {
                // Simple JavaScript execution (ONLY for demo - not secure for production!)
                // In production, use Judge0 API or Docker sandbox
                let output = '';
                const originalLog = console.log;
                console.log = (...args) => {
                    output += args.join(' ') + '\n';
                };

                // Execute the code
                const result = eval(code);

                // Restore console.log
                console.log = originalLog;

                // If there's a return value and no console output
                if (output === '' && result !== undefined) {
                    output = String(result);
                }

                return res.json({
                    stdout: output || '(Code executed successfully with no output)',
                    stderr: null,
                    error: null
                });
            } catch (execError) {
                return res.json({
                    stdout: null,
                    stderr: execError.message,
                    error: null
                });
            }
        }

        // For other languages, return a helpful message
        return res.json({
            stdout: `Language ID ${languageId} execution requires Judge0 API setup.\n\nTo enable:\n1. Get a RapidAPI key from https://rapidapi.com/judge0-official/api/judge0-ce\n2. Add the key to the server configuration\n\nFor now, JavaScript execution works out of the box!`,
            stderr: null,
            error: null
        });

    } catch (error) {
        console.error('Execution error:', error);
        res.status(500).json({
            error: 'Server error during code execution',
            details: error.message
        });
    }
});

// ========================================
// JUDGE0 API INTEGRATION (Production Ready)
// ========================================
// Uncomment and configure when you have a RapidAPI key

/*
const RAPIDAPI_KEY = 'your-rapidapi-key-here';

app.post('/run-judge0', async (req, res) => {
    const { code, languageId } = req.body;

    try {
        // Submit code to Judge0
        const submitResponse = await fetch(`${JUDGE0_API}/submissions?base64_encoded=false&wait=true`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-RapidAPI-Key': RAPIDAPI_KEY,
                'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
            },
            body: JSON.stringify({
                source_code: code,
                language_id: languageId,
                stdin: ''
            })
        });

        const result = await submitResponse.json();

        return res.json({
            stdout: result.stdout,
            stderr: result.stderr,
            error: result.compile_output || result.message
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
*/

// Start server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`
    ╔═══════════════════════════════════════════╗
    ║     🚀 Antigravity IDE Server             ║
    ║     Running on http://localhost:${PORT}      ║
    ╚═══════════════════════════════════════════╝
    `);
});
