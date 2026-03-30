import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { DATABASE_URL } from '$env/static/private';
import * as schema from './schema';

const client = postgres(DATABASE_URL, { max: 20, idle_timeout: 30, connect_timeout: 10 });
export const db = drizzle(client, { schema });
