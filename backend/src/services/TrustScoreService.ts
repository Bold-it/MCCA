export interface ScoreSignals {
  faceConfidence: number;
  fingerprintBound: boolean;
  behaviouralMatch: number;
  iotContext: number;
}

export interface Anomalies {
  locationAnomaly?: boolean;
  newDevice?: boolean;
  unusualTime?: boolean;
}

export class TrustScoreService {
  /**
   * Computes the weighted trust score based on multiple biometric and contextual signals.
   * Face (50%) + Fingerprint (20%) + Behaviour (20%) + IoT (10%)
   */
  static computeScore(signals: ScoreSignals, anomalies: Anomalies, previousScore: number, lastCheckTime: Date): number {
    // 1. Weighted base calculation
    let baseScore = 
      (signals.faceConfidence * 50) + 
      (signals.fingerprintBound ? 20 : 0) + 
      (signals.behaviouralMatch * 20) + 
      (signals.iotContext * 10);

    // 2. Time decay (2pts per minute)
    const minutesSinceLastCheck = Math.floor((Date.now() - lastCheckTime.getTime()) / 60000);
    const decay = minutesSinceLastCheck * 2;
    baseScore -= decay;

    // 3. Anomaly Penalties
    if (anomalies.locationAnomaly) baseScore -= 20;
    if (anomalies.newDevice) baseScore -= 15;
    if (anomalies.unusualTime) baseScore -= 10;

    // 4. Clamp between 0 and 100
    return Math.max(0, Math.min(100, Math.round(baseScore)));
  }
}
