export const calculateBattingStats = (innings) => {
  const totalRuns = innings.reduce((sum, inn) => sum + (inn.runs || 0), 0);
  const totalBalls = innings.reduce((sum, inn) => sum + (inn.balls || 0), 0);
  const totalFours = innings.reduce((sum, inn) => sum + (inn.fours || 0), 0);
  const totalSixes = innings.reduce((sum, inn) => sum + (inn.sixes || 0), 0);
  const totalOuts = innings.filter(inn => inn.out).length;

  const strikeRate = totalBalls > 0 ? ((totalRuns / totalBalls) * 100).toFixed(2) : 0;
  const average = totalOuts > 0 ? (totalRuns / totalOuts).toFixed(2) : totalRuns;

  return {
    totalRuns,
    totalBalls,
    totalFours,
    totalSixes,
    totalOuts,
    highestScore: Math.max(...innings.map(inn => inn.runs || 0), 0),
    strikeRate: parseFloat(strikeRate),
    average: parseFloat(average)
  };
};

export const calculateBowlingStats = (overs) => {
  const totalOvers = overs.length;
  const totalRunsConceded = overs.reduce((sum, over) => sum + (over.runs || 0), 0);
  const totalWickets = overs.reduce((sum, over) => sum + (over.wickets || 0), 0);
  
  const totalBalls = overs.reduce((sum, over) => sum + (over.balls || 0), 0);
  const actualOvers = Math.floor(totalBalls / 6) + (totalBalls % 6) / 10;
  
  const economy = actualOvers > 0 ? (totalRunsConceded / actualOvers).toFixed(2) : 0;
  const bowlingAverage = totalWickets > 0 ? (totalRunsConceded / totalWickets).toFixed(2) : totalRunsConceded;
  const strikeRate = totalBalls > 0 ? (totalBalls / totalWickets).toFixed(2) : 0;

  return {
    totalOvers,
    totalRunsConceded,
    totalWickets,
    bestFigures: { wickets: totalWickets, runs: totalRunsConceded },
    economy: parseFloat(economy),
    bowlingAverage: parseFloat(bowlingAverage),
    strikeRate: parseFloat(strikeRate)
  };
};

export const calculateNetRunRate = (runsScored, oversFaced, runsConceded, oversBowled) => {
  const runsScoredOvers = Math.floor(oversFaced / 6) + (oversFaced % 6) / 10;
  const runsConcededOvers = Math.floor(oversBowled / 6) + (oversBowled % 6) / 10;
  
  if (runsScoredOvers === 0 || runsConcededOvers === 0) return 0;
  
  const runRateScored = runsScored / runsScoredOvers;
  const runRateConceded = runsConceded / runsConcededOvers;
  
  return (runRateScored - runRateConceded).toFixed(3);
};

export const calculatePoints = (won, lost, tied, noResult, pointsPerWin = 2, pointsPerTie = 1, pointsPerNoResult = 1) => {
  return (won * pointsPerWin) + (tied * pointsPerTie) + (noResult * pointsPerNoResult);
};

export default {
  calculateBattingStats,
  calculateBowlingStats,
  calculateNetRunRate,
  calculatePoints
};
