# For MCP directories (Glama) that inspect servers in Linux containers.
# ScreenPost itself is a macOS app; in this container the server answers the
# MCP handshake and lists its tools, and each tool call returns setup instructions.
FROM node:22-alpine
WORKDIR /app
COPY server ./server
CMD ["node", "server/index.js"]
