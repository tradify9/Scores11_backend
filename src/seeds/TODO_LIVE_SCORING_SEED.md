# Live Match Scoring Seeder Plan

**Goal**: Create proper ball-by-ball seeder with 240+ realistic balls, scorecards, wickets for testing live scoring APIs.

**Files**:
- Enhance `backend/src/seeds/completeMatchSeeder.js` 
- Uses MI vs CSK teams/players from sampleTeamsPlayers.js
- Populates Ball model fully

**Features**:
- 2 full T20 innings (MI 168/6, CSK 172/4)
- Realistic outcomes: dots(40%), 1s(35%), 2s(10%), 4s(10%), 6s(5%), wickets(7%), wides/no-balls/extras
- Proper scorecard, fall of wickets, bowling figures
- Comments for key moments
- Test endpoints ready

**Run**:
```
cd backend/src/seeds
node sampleTeamsPlayers.js  # First (creates teams/players)
node completeMatchSeeder.js # Then (creates match + balls)
```

**Status**:
- [ ] Create plan
- [ ] Implement realistic generateInningsData()
- [ ] Add multiple matches (3-5)
- [ ] Test
- [ ] Complete ✓

