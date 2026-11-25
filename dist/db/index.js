import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error('Chybí proměnná prostředí DATABASE_URL');
}
export const database = drizzle(databaseUrl);
database.$client.on('error', (error) => {
    console.error('Spojení s databází selhalo:', error.message);
});
