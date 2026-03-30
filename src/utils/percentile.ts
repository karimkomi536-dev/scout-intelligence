export function getPercentile(score: number, allScores: number[]): number {
  if (!allScores.length) return 50
  const sorted = [...allScores].sort((a, b) => a - b)
  const below = sorted.filter(s => s < score).length
  return Math.round((below / sorted.length) * 100)
}

export function getPercentileLabel(percentile: number): string {
  if (percentile >= 90) return 'Top 10%'
  if (percentile >= 75) return 'Top 25%'
  if (percentile >= 50) return 'Top 50%'
  return `Top ${100 - percentile}%`
}

export function getPercentileColor(percentile: number): string {
  if (percentile >= 75) return '#00C896' // vert
  if (percentile >= 50) return '#4D7FFF' // bleu
  return '#64748B'                       // gris
}
