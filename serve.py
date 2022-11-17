import http.server
import socketserver

HOST = "127.0.0.1"
PORT = 8000

Handler = http.server.SimpleHTTPRequestHandler
Handler.extensions_map = {
    '': 'text/plain',
    '.css': 'text/css',
    '.html': 'text/html',
    '.js': 'text/javascript',
    }

with socketserver.TCPServer((HOST, PORT), Handler) as httpd:
    print(f"serving at {HOST}:{PORT}")
    httpd.serve_forever()
