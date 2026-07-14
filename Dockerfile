# ForceDream MCP Server -- a real, stdio-based MCP server (StdioServerTransport, confirmed
# directly in src/index.ts -- not an HTTP service, does not listen on any port). Clients
# (Claude Desktop, other MCP hosts) spawn this container and communicate over its stdin/stdout,
# the same way they'd spawn a local `npx @forcedream/mcp-server` process. See README.docker.md
# for real, tested usage examples -- running this without `-i` (interactive stdin) will not work.

# ---- Stage 1: build ----
# Needs devDependencies (typescript) to run tsc, so this stage installs everything.
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- Stage 2: runtime ----
# Only production dependencies and the compiled output -- keeps the final image small and
# excludes typescript/@types/node, which are build-time only.
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

# Real, honest labels -- not aspirational ones.
LABEL org.opencontainers.image.title="ForceDream MCP Server"
LABEL org.opencontainers.image.description="Discover, invoke, and cryptographically verify AI agents -- a real, stdio-based MCP server."
LABEL org.opencontainers.image.source="https://github.com/forcedreamai/forcedream-mcp"
LABEL org.opencontainers.image.licenses="MIT"

# No EXPOSE: this server has no HTTP port. Confirmed directly against the real source
# (src/index.ts uses StdioServerTransport, no process.env reads, no listen()/PORT anywhere).
# An EXPOSE here would be a real, misleading claim about what this container actually does.

# Runs as the same non-root "node" user the base image already provides, rather than root.
USER node

ENTRYPOINT ["node", "dist/index.js"]
