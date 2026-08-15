import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
    redact: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'token',
      'accessToken',
      'refreshToken',
      'secret',
    ],
  },
});

await app.register(helmet);
await app.register(cors, { origin: false });
await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });

app.get('/health/live', async () => ({
  status: 'ok',
  service: 'novatis-api',
}));

app.get('/health/ready', async (_request, reply) => {
  // Database/queue/provider readiness checks will be added before production use.
  return reply.send({
    status: 'ok',
    service: 'novatis-api',
    dependencies: {
      database: 'not-configured',
      queue: 'not-configured',
      providers: 'not-configured',
    },
  });
});

app.get('/api/v1', async () => ({
  name: 'Novatis API',
  version: 'v1',
  status: 'foundation',
}));

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
