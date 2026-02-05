#!/usr/bin/env python3
"""
Local proxy server for TA Search Test.
Serves static files and proxies API requests to avoid CORS issues.

Usage: python3 server.py
Then open: http://localhost:8080
"""

import http.server
import urllib.request
import urllib.error
import json
import ssl

PORT = 8080

class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Proxy GET requests to /proxy/* to the actual API
        if self.path.startswith('/proxy/'):
            self.proxy_request('GET')
        else:
            # Serve static files
            super().do_GET()

    def do_POST(self):
        # Proxy POST requests to /proxy/* to the actual API
        if self.path.startswith('/proxy/'):
            self.proxy_request('POST')
        else:
            self.send_error(404, "Not Found")

    def proxy_request(self, method='POST'):
        # Extract the target URL from the path
        # /proxy/https://example.com/path -> https://example.com/path
        target_url = self.path[7:]  # Remove '/proxy/'

        # Read request body
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length) if content_length > 0 else None

        # Prepare headers for the proxied request
        proxy_headers = {
            'Accept': self.headers.get('Accept', 'application/json'),
            'Content-Type': self.headers.get('Content-Type', 'application/json'),
        }

        try:
            # Create SSL context that doesn't verify certificates (for testing)
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE

            # Make the request
            req = urllib.request.Request(
                target_url,
                data=body,
                headers=proxy_headers,
                method=method
            )

            with urllib.request.urlopen(req, context=ssl_context, timeout=30) as response:
                response_body = response.read()

                # Send response back to client
                self.send_response(response.status)
                self.send_header('Content-Type', response.headers.get('Content-Type', 'application/json'))
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', len(response_body))
                self.end_headers()
                self.wfile.write(response_body)

        except urllib.error.HTTPError as e:
            error_body = e.read()
            self.send_response(e.code)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Length', len(error_body))
            self.end_headers()
            self.wfile.write(error_body)

        except Exception as e:
            error_msg = json.dumps({'error': str(e)}).encode('utf-8')
            self.send_response(502)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Length', len(error_msg))
            self.end_headers()
            self.wfile.write(error_msg)

    def do_OPTIONS(self):
        # Handle CORS preflight requests
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Accept')
        self.send_header('Content-Length', '0')
        self.end_headers()

    def log_message(self, _format, *args):
        # Custom logging format
        print(f"[{self.log_date_time_string()}] {args[0]}")


if __name__ == '__main__':
    print(f"Starting server at http://localhost:{PORT}")
    print("Press Ctrl+C to stop\n")

    with http.server.HTTPServer(('', PORT), ProxyHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
