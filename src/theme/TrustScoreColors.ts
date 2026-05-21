export const TrustScoreColors = {
  TRUSTED: '#10B981', // 80-100
  CAUTION: '#F59E0B', // 60-79
  RISK: '#EF4444',    // 0-59
};

export const getTrustColor = (score: number): string => {
  if (score >= 80) return TrustScoreColors.TRUSTED;
  if (score >= 60) return TrustScoreColors.CAUTION;
  return TrustScoreColors.RISK;
};
