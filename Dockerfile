FROM node:18-alpine
RUN npm install -g pnpm
WORKDIR /app
COPY . .
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @workspace/api-server run build
EXPOSE 3000
CMD ["pnpm", "--filter", "@workspace/api-server", "run", "start"]
