# Alternative registry namespace

server.json uses the DNS namespace `app.screenpost/screenpost` (needs a TXT record or
/.well-known/mcp-registry-auth on screenpost.app, then `mcp-publisher login dns`).

For the zero-setup GitHub namespace, change only the `name` field to
`io.github.lamazzing/screenpost` and log in with `mcp-publisher login github`.
Namespaces are permanent per name, so pick one deliberately before publishing.
