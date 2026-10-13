// One-off: publish a "Full replay" highlight for every YouTube live stream that
// ended before the highlights feature existed. Safe to re-run (upsert per stream).
// Usage: node src/scripts/backfillStreamReplays.js [--dry-run]
import mongoose from 'mongoose';
import config from '../config/env.js';
import LiveStream from '../modules/liveStream/liveStream.model.js';
import { createReplayFromStream } from '../modules/highlight/highlight.service.js';

const dryRun = process.argv.includes('--dry-run');

const run = async () => {
  await mongoose.connect(config.mongodb.uri, {
    dbName: config.mongodb.dbName,
    serverSelectionTimeoutMS: 15000
  });

  const streams = await LiveStream.find({
    status: 'ended',
    youtubeVideoId: { $exists: true, $ne: '' }
  });
  console.log(`Found ${streams.length} ended YouTube stream(s)${dryRun ? ' (dry run)' : ''}`);

  let created = 0;
  for (const stream of streams) {
    if (dryRun) {
      console.log(`  would publish: ${stream._id} ${stream.title}`);
      continue;
    }
    await createReplayFromStream(stream);
    created += 1;
  }
  if (!dryRun) console.log(`Replays ensured for ${created} stream(s)`);
};

run()
  .catch((error) => {
    console.error('Backfill failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
