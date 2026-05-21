import { TrustScoreService } from '../services/TrustScoreService';

describe('TrustScoreService', () => {
  const defaultSignals = {
    faceConfidence: 1.0,
    fingerprintBound: true,
    behaviouralMatch: 1.0,
    iotContext: 1.0,
  };

  const noAnomalies = {};

  it('should return 100 for perfect signals and no anomalies', () => {
    const score = TrustScoreService.computeScore(defaultSignals, noAnomalies, 100, new Date());
    expect(score).toBe(100);
  });

  it('should apply face confidence weight (50%)', () => {
    const signals = { ...defaultSignals, faceConfidence: 0.5 };
    const score = TrustScoreService.computeScore(signals, noAnomalies, 100, new Date());
    // 0.5*50 + 20 + 20 + 10 = 25 + 50 = 75
    expect(score).toBe(75);
  });

  it('should apply time decay (2pts per minute)', () => {
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
    const score = TrustScoreService.computeScore(defaultSignals, noAnomalies, 100, fiveMinsAgo);
    // 100 - (5 * 2) = 90
    expect(score).toBe(90);
  });

  it('should apply location anomaly penalty (-20pts)', () => {
    const anomalies = { locationAnomaly: true };
    const score = TrustScoreService.computeScore(defaultSignals, anomalies, 100, new Date());
    expect(score).toBe(80);
  });

  it('should accumulate multiple penalties', () => {
    const anomalies = { locationAnomaly: true, newDevice: true };
    const score = TrustScoreService.computeScore(defaultSignals, anomalies, 100, new Date());
    // 100 - 20 - 15 = 65
    expect(score).toBe(65);
  });

  it('should not go below 0', () => {
    const signals = { faceConfidence: 0, fingerprintBound: false, behaviouralMatch: 0, iotContext: 0 };
    const anomalies = { locationAnomaly: true, newDevice: true, unusualTime: true };
    const score = TrustScoreService.computeScore(signals, anomalies, 0, new Date());
    expect(score).toBe(0);
  });
});
