# TA Search Test

A simple browser-based tool for testing ThinkAnalytics (TA) Search API locally.

## Requirements

- **Python 3.7+** or **Node.js 14+**
- Modern web browser (Chrome, Firefox, Safari, Edge)

No additional dependencies required - uses only standard library (Python) or built-in modules (Node.js).

## Usage

1. Start the proxy server:

   **Python:**
   ```bash
   python3 server.py
   ```

   **Node.js:**
   ```bash
   node server.js
   ```

2. Open http://localhost:8080 in your browser

3. Enter a search term and click **Search**

## Configuration

The Environment Configuration panel allows you to modify:

| Field | Description |
|-------|-------------|
| Host | ThinkAnalytics API host |
| Port | API port |
| Rocket Item Query | Rocket API endpoint for fetching item details |
| Search Use Case | TA use case path |

The Request Body textarea lets you customize the JSON payload sent to the search API.

## Batch Testing

Run automated searches from a text file and capture screenshots.

**Setup (one-time):**
```bash
npm install playwright
npx playwright install chromium
```

**Usage:**
1. Create a text file with search terms (one per line)
2. Start the proxy server (`python3 server.py` or `node server.js`)
3. Run the batch test:
   ```bash
   node batch-test.js terms.txt
   ```

Screenshots are saved to the `screenshots/` directory.

## How It Works

The app consists of:

- `index.html` - Single-file frontend (HTML + CSS + JS)
- `server.py` - Python proxy server
- `server.js` - Node.js proxy server (alternative)
- `batch-test.js` - Playwright script for automated batch testing

The proxy server serves the HTML file and forwards API requests to the ThinkAnalytics and Rocket APIs, adding the necessary CORS headers for browser compatibility.
