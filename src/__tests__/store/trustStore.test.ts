import { useTrustStore } from '../../store/trustStore';

describe('trustStore', () => {
  beforeEach(() => {
    useTrustStore.setState({
      trustScore: 100,
      lastVerified: null,
      activeMethod: null,
      isVerifying: false,
    });
  });

  it('should update trust score correctly', () => {
    const { updateTrustScore } = useTrustStore.getState();
    updateTrustScore(85);
    
    const state = useTrustStore.getState();
    expect(state.trustScore).toBe(85);
    expect(state.lastVerified).not.toBeNull();
  });

  it('should set verifying state', () => {
    const { setVerifying } = useTrustStore.getState();
    setVerifying(true);
    expect(useTrustStore.getState().isVerifying).toBe(true);
  });

  it('should set active method', () => {
    const { setActiveMethod } = useTrustStore.getState();
    setActiveMethod('FACE');
    expect(useTrustStore.getState().activeMethod).toBe('FACE');
  });
});
