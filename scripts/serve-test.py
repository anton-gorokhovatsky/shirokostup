"""Static browser-test server with room for concurrent browser connections."""

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class BrowserTestServer(ThreadingHTTPServer):
    # Each browser may preconnect and request several assets at once. The
    # standard server's queue of five can reset navigation under that burst.
    request_queue_size = 128


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--port", type=int, required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
handler = partial(SimpleHTTPRequestHandler, directory=str(root))

with BrowserTestServer(("127.0.0.1", args.port), handler) as server:
    server.serve_forever()
