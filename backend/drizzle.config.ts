
import dotenv from 'dotenv';
import type { Config } from 'drizzle-kit';
import 'dotenv/config';
import { parse } from 'pg-connection-string';

const config = parse(process.env.DATABASE_URL || 'postgresql://postgres:Harish%409360461148@localhost:5432/crud_system');

export default {
  schema: './src/database/schemas/*.ts',
  out: './src/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    host: config.host || 'localhost',
    port: config.port ? Number(config.port) : 5432,
    user: config.user,
    password: config.password,
    database: config.database || 'crud_system',
    ssl: config.ssl === 'true' ? { rejectUnauthorized: false } : false,
  },
} satisfies Config;
