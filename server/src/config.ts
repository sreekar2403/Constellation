export function getConfig() {
  return {
    port: parseInt(process.env.PORT ?? '3001', 10),
    wsPort: parseInt(process.env.WS_PORT ?? '3002', 10),
    ollamaUrl: process.env.OLLAMA_URL ?? 'http://localhost:11434',
    logLevel: process.env.LOG_LEVEL ?? 'info',
  };
}
