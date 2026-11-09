import mongoose from 'mongoose';
import { app } from './app.js';
import { env } from './config/env.js';
import { connectRedis, disconnectRedis } from './config/redis.js';

try {
  await mongoose.connect(env.MONGODB_URI);
  void connectRedis();
  const server = app.listen(env.PORT, () => {
    console.info(`RoomOnRent API listening on http://localhost:${env.PORT}`);
  });

  async function shutdown(signal: string) {
    console.info(`${signal} received; closing server`);
    server.close(async () => {
      disconnectRedis();
      await mongoose.disconnect();
      process.exit(0);
    });
  }

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
} catch (error) {
  console.error('Unable to connect to MongoDB', error);
  process.exit(1);
}
