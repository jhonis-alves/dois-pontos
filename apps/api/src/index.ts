import { config } from './config.js';
import { buildServer } from './server.js';

const app = buildServer({ logger: true });

try {
  await app.listen({ port: config.port, host: config.host });
  app.log.info(
    `Dois Pontos API disponível em http://${config.host}:${config.port}`,
  );
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    app.log.info(`Recebido ${signal}. Encerrando...`);
    await app.close();
    process.exit(0);
  });
}
