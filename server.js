#!/usr/bin/env node
/**
 * Local proxy server for TA Search Test.
 * Serves static files and proxies API requests to avoid CORS issues.
 *
 * Usage: node server.js
 * Then open: http://localhost:8080
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon',
};

function log(message) {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    console.log(`[${now}] ${message}`);
}

function serveStatic(req, res) {
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = path.join(__dirname, filePath);

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('File not found');
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

function proxyRequest(req, res, method) {
    // Extract target URL: /proxy/https://example.com/path -> https://example.com/path
    const targetUrl = req.url.substring(7);

    // Collect request body
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
        const body = chunks.length > 0 ? Buffer.concat(chunks) : null;

        // Parse target URL
        let parsedUrl;
        try {
            parsedUrl = new URL(targetUrl);
        } catch (e) {
            res.writeHead(400, corsHeaders({ 'Content-Type': 'application/json' }));
            res.end(JSON.stringify({ error: 'Invalid URL' }));
            return;
        }

        const isHttps = parsedUrl.protocol === 'https:';
        const client = isHttps ? https : http;

        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (isHttps ? 443 : 80),
            path: parsedUrl.pathname + parsedUrl.search,
            method: method,
            headers: {
                'Accept': req.headers['accept'] || 'application/json',
                'Content-Type': req.headers['content-type'] || 'application/json',
            },
            rejectUnauthorized: false, // Skip SSL verification for testing
        };

        if (body) {
            options.headers['Content-Length'] = body.length;
        }

        const proxyReq = client.request(options, (proxyRes) => {
            const responseChunks = [];
            proxyRes.on('data', chunk => responseChunks.push(chunk));
            proxyRes.on('end', () => {
                const responseBody = Buffer.concat(responseChunks);
                res.writeHead(proxyRes.statusCode, corsHeaders({
                    'Content-Type': proxyRes.headers['content-type'] || 'application/json',
                    'Content-Length': responseBody.length,
                }));
                res.end(responseBody);
            });
        });

        proxyReq.on('error', (err) => {
            const errorBody = JSON.stringify({ error: err.message });
            res.writeHead(502, corsHeaders({
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(errorBody),
            }));
            res.end(errorBody);
        });

        proxyReq.setTimeout(30000, () => {
            proxyReq.destroy();
            const errorBody = JSON.stringify({ error: 'Request timeout' });
            res.writeHead(504, corsHeaders({
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(errorBody),
            }));
            res.end(errorBody);
        });

        if (body) {
            proxyReq.write(body);
        }
        proxyReq.end();
    });
}

function corsHeaders(headers = {}) {
    return {
        'Access-Control-Allow-Origin': '*',
        ...headers,
    };
}

function handleOptions(req, res) {
    res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept',
        'Content-Length': '0',
    });
    res.end();
}

const server = http.createServer((req, res) => {
    log(`${req.method} ${req.url}`);

    if (req.method === 'OPTIONS') {
        handleOptions(req, res);
    } else if (req.url.startsWith('/proxy/')) {
        proxyRequest(req, res, req.method);
    } else if (req.method === 'GET') {
        serveStatic(req, res);
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`Starting server at http://localhost:${PORT}`);
    console.log('Press Ctrl+C to stop\n');
});
