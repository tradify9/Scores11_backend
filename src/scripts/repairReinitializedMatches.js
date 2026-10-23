// One-off repair for matches damaged by the old initializeMatch bug: reopening
// the scorer panel after a result pushed an extra empty "innings 1", reset the
// status and appended the playing XI again to the first innings. Those matches
// then showed the second innings as 0/0 and were later auto-abandoned.
//
// For each affected match this script:
//  - removes the empty duplicate innings (no runs, balls or wickets),
//  - removes duplicate untouched batting rows (same batter, 0 balls, not out),
//  - if both real innings were finished, restores the result (completed).
//
// Usage: node src/scripts/repairReinitializedMatches.js [--dry-run]
import mongoose from 'mongoose';
import config from '../config/env.js';
import Match from '../modules/match/match.model.js';
import { finalizeSecondInningsResult } from '../modules/scoring/scoring.service.js';

const dryRun = process.argv.includes('--dry-run');

const isEmptyInnings = (inn) =>
  !inn.isCompleted &&
  (inn.totalRuns || 0) === 0 &&
  (inn.totalWickets || 0) === 0 &&
  (inn.totalBalls || 0) === 0 &&
  (inn.totalOvers || 0) === 0 &&
  !(inn.bowlingScorecard || []).length;

const dedupeBatting = (inn) => {
  const seen = new Set();
  const before = inn.battingScorecard.length;
  // Rows that recorded something always stay; untouched duplicates go.
  const played = inn.battingScorecard.filter((b) => (b.balls || 0) > 0 || (b.runs || 0) > 0 || (b.howOut && b.howOut !== 'not_out'));
  played.forEach((b) => seen.add(b.batsman?.toString()));
  inn.battingScorecard = inn.battingScorecard.filter((b) => {
    const key = b.batsman?.toString();
    if (played.includes(b)) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return before - inn.battingScorecard.length;
};

const run = async () => {
  await mongoose.connect(config.mongodb.uri, {
    dbName: config.mongodb.dbName,
    serverSelectionTimeoutMS: 15000
  });

  const candidates = await Match.find({ 'innings.1': { $exists: true } });
  let repaired = 0;

  for (const match of candidates) {
    const numbers = match.innings.map((i) => i.inningsNumber);
    const hasDuplicateNumber = numbers.length !== new Set(numbers).size;
    if (!hasDuplicateNumber) continue;

    const keep = [];
    const seenNumbers = new Set();
    let removedInnings = 0;
    for (const inn of match.innings) {
      if (seenNumbers.has(inn.inningsNumber) && isEmptyInnings(inn)) {
        removedInnings += 1;
        continue;
      }
      seenNumbers.add(inn.inningsNumber);
      keep.push(inn);
    }
    if (!removedInnings) {
      console.log(`  skip ${match._id}: duplicate innings hold real data, needs manual review`);
      continue;
    }

    match.innings = keep;
    let removedRows = 0;
    match.innings.forEach((inn) => { removedRows += dedupeBatting(inn); });

    const first = match.innings.find((i) => i.inningsNumber === 1);
    const second = match.innings.find((i) => i.inningsNumber === 2);
    const before = match.status;
    match.currentInnings = second ? 2 : 1;
    let restored = false;
    if (first?.isCompleted && second?.isCompleted) {
      restored = finalizeSecondInningsResult(match, { force: true });
    }

    const label = `${match._id} (${before} -> ${match.status})`;
    console.log(`  ${dryRun ? 'would repair' : 'repaired'} ${label}: removed ${removedInnings} empty innings, ` +
      `${removedRows} duplicate batting rows${restored ? `, result: ${match.result?.message}` : ''}`);
    if (!dryRun) await match.save();
    repaired += 1;
  }

  console.log(`${dryRun ? 'Would repair' : 'Repaired'} ${repaired} match(es).`);
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error('Repair failed:', error);
  await mongoose.disconnect();
  process.exit(1);
});
