/**
 * Seed default HACKSU bingo tiles.
 * Run with: bun run db:seed
 * Bun auto-loads `.env` for local runs; in Docker the vars come from Compose.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import * as schema from './schema';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL not set');

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });

// 5x5 default board. Replace freely. Position 12 (center) is the free space.
const TILES: { label: string; isFreeSpace?: boolean }[] = [
  { label: 'Unique Lesson Challenge' },
  { label: 'Attend KHE' },
  { label: 'Completed a mock interview' },
  { label: 'Attended the first meeting' },
  { label: 'Joined the CS Discord' },

  { label: 'Asked a question during a lesson' },
  { label: 'Is wearing a KHE shirt' },
  { label: 'Help debug during a lesson' },
  { label: 'Attended 4 meetings' },
  { label: 'Follow us on Facebook' },

  { label: 'Share HacKSU with a friend' },
  { label: 'Demo Personal Website / Project' },
  { label: 'FREE SPACE', isFreeSpace: true },
  { label: '"Hello World" in 4 languages' },
  { label: 'Join the mailing list' },

  { label: 'Demo at a lesson' },
  { label: 'Staff at KHE' },
  { label: 'Write or teach a HacKSU lesson' },
  { label: 'Complete 3 GitHub pull requests' },
  { label: 'Mentor a peer' },

  { label: 'Create a CS project' },
  { label: 'Attend a guest speaker event' },
  { label: 'Complete a coding challenge' },
  { label: 'Contribute to open source' },
  { label: 'Help organize an event' }
];

async function main() {
  console.log('Clearing existing bingo tiles…');
  await db.execute(sql`TRUNCATE TABLE bingo_tile RESTART IDENTITY CASCADE`);

  console.log(`Inserting ${TILES.length} tiles…`);
  await db.insert(schema.bingoTile).values(
    TILES.map((t, idx) => ({
      id: randomUUID(),
      label: t.label,
      position: idx,
      isFreeSpace: t.isFreeSpace ?? false
    }))
  );

  console.log('Done.');
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
