import { betterAuth } from 'better-auth';
import Database from 'better-sqlite3';
import { Pool } from 'pg';

let dbConfig;
if (process.env.DATABASE_URL) {
    dbConfig = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
} else {
    dbConfig = new Database('./auth.db');
}

export const auth = betterAuth({
    database: dbConfig,
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3001',
    trustedOrigins: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
    ],
    emailAndPassword: {
        enabled: true,
    },
    socialProviders: {
        google: {
            clientId: process.env.AUTH_GOOGLE_ID || '',
            clientSecret: process.env.AUTH_GOOGLE_SECRET || '',
        },
    },
    session: {
        cookieCache: {
            enabled: true,
            maxAge: 5 * 60,
        },
    },
});
