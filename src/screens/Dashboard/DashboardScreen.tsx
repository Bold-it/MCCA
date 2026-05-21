import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  useAnimatedProps,
  interpolateColor
} from 'react-native-reanimated';
import { Svg, Circle, Path, Line, Rect } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { useTrustStore } from '../../store/trustStore';
import { useAlertStore } from '../../store/alertStore';
import { useDeviceStore } from '../../store/deviceStore';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, getTrustColor } from '../../theme';
import { TelemetryChart } from '../../components/common/TelemetryChart';
import { BiometricService } from '../../services/BiometricService';

// Vector Icon Components
const BellIcon = ({ color = '#9CA3AF', size = 20 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </Svg>
);

const ShieldIcon = ({ color = '#3B82F6', size = 20 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </Svg>
);

const FaceIcon = ({ color = '#3B82F6', size = 24 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M18 8h.01M6 8h.01" />
    <Path d="M9 16c.3-.5.8-1 1.5-1s1.2.5 1.5 1" />
    <Circle cx="12" cy="12" r="10" />
  </Svg>
);

const FingerprintIcon = ({ color = '#3B82F6', size = 24 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 10a2 2 0 0 0-2 2" />
    <Path d="M14 14a4 4 0 0 0-4-4" />
    <Path d="M8 12a4 4 0 0 1 8 0" />
    <Path d="M12 2a10 10 0 0 0-10 10" />
    <Path d="M12 6a6 6 0 0 0-6 6" />
    <Path d="M20 12a8 8 0 0 0-8-8" />
    <Path d="M12 18a6 6 0 0 0 6-6" />
    <Path d="M12 22a10 10 0 0 0 10-10" />
  </Svg>
);

const VoiceIcon = ({ color = '#3B82F6', size = 24 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 1v11" />
    <Path d="M19 8c0 3.87-3.13 7-7 7s-7-3.13-7-7" />
    <Path d="M12 15v6" />
    <Rect x="9" y="3" width="6" height="8" rx="3" ry="3" />
  </Svg>
);

const BehaviorIcon = ({ color = '#3B82F6', size = 24 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 2v20" />
    <Path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </Svg>
);

const LaptopIcon = ({ color = '#3B82F6', size = 24 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <Line x1="2" y1="20" x2="22" y2="20" />
    <Line x1="12" y1="17" x2="12" y2="20" />
  </Svg>
);

const PhoneIcon = ({ color = '#3B82F6', size = 24 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    <Line x1="12" y1="18" x2="12.01" y2="18" />
  </Svg>
);

const WatchIcon = ({ color = '#3B82F6', size = 24 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Rect x="6" y="4" width="12" height="16" rx="3" />
    <Path d="M9 4V2h6v2M9 20v2h6v-2" />
    <Circle cx="12" cy="12" r="3" />
  </Svg>
);


const { width } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const CIRCLE_LENGTH = 440; // 2 * PI * 70
const R = 70;

export const DashboardScreen = () => {
  const navigation = useNavigation<any>();
  const user = useAuthStore((state) => state.user);
  const { trustScore, updateTrustScore, lastVerified, scoreHistory } = useTrustStore();
  const { unreadCount, alerts } = useAlertStore();
  const { connectedDevices } = useDeviceStore();

  const progress = useSharedValue(0);
  const [touchQueue, setTouchQueue] = useState<any[]>([]);

  useEffect(() => {
    progress.value = withTiming(trustScore / 100, { duration: 1000 });
    
    // Trigger Step-Up Auth if score drops
    if (trustScore < 60) {
      navigation.navigate('StepUpAuth', { reason: 'Significant trust drop detected' });
    }
  }, [trustScore]);

  // Simulated real-time score updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Occasional small fluctuation
      if (Math.random() > 0.8) {
        const drop = Math.floor(Math.random() * 5);
        updateTrustScore(Math.max(40, trustScore - drop));
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [trustScore]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCLE_LENGTH * (1 - progress.value),
    stroke: interpolateColor(
      progress.value,
      [0.5, 0.7, 0.9],
      [COLORS.danger, COLORS.warning, COLORS.success]
    ),
  }));

  const handleTouch = (type: 'press' | 'release' | 'move', event: any) => {
    const { pageX, pageY, locationX, locationY, timestamp } = event.nativeEvent;
    const force = event.nativeEvent.force || 0.5;
    
    const touchEvent = {
      type,
      x: pageX || locationX || 0,
      y: pageY || locationY || 0,
      pressure: force,
      timestamp: timestamp || Date.now(),
    };

    setTouchQueue((prev) => {
      const updated = [...prev, touchEvent];
      if (updated.length >= 15) {
        if (user?.id) {
          // Upload behavioural features to FastAPI ML microservice
          BiometricService.buildBehaviouralProfile(user.id, updated);
        }
        return [];
      }
      return updated;
    });
  };

  return (
    <View 
      style={{ flex: 1 }}
      onTouchStart={(e) => handleTouch('press', e)}
      onTouchMove={(e) => handleTouch('move', e)}
      onTouchEnd={(e) => handleTouch('release', e)}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.shieldIconWrapper}>
              <ShieldIcon color="#fff" size={20} />
            </View>
            <View>
              <Text style={styles.greeting}>{greeting},</Text>
              <Text style={styles.userName}>{user?.name || 'User'}</Text>
            </View>
          </View>
          <Pressable style={styles.bellBtn} onPress={() => navigation.navigate('Alerts')}>
            <BellIcon color={COLORS.textPrimary} size={22} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* SECTION 1: Trust Score Hero */}
        <View style={styles.heroCard}>
          <View style={styles.progressWrapper}>
            <Svg style={styles.svg}>
              <Circle 
                cx="100" cy="100" r={R} 
                stroke={COLORS.border} strokeWidth="15" fill="none" 
              />
              <AnimatedCircle
                cx="100" cy="100" r={R}
                strokeWidth="15"
                fill="none"
                strokeDasharray={CIRCLE_LENGTH}
                animatedProps={animatedCircleProps}
                strokeLinecap="round"
              />
            </Svg>
            <View style={styles.scoreTextContainer}>
              <Text style={[styles.scoreNumber, { color: getTrustColor(trustScore) }]}>{Math.round(trustScore)}</Text>
              <Text style={styles.scoreLabel}>TRUST</Text>
            </View>
          </View>
          <Text style={[styles.statusText, { color: getTrustColor(trustScore) }]}>
            {trustScore >= 80 ? 'Fully Verified' : trustScore >= 60 ? 'Caution' : 'At Risk'}
          </Text>
          <Text style={styles.timestamp}>Last checked {lastVerified ? 'recently' : 'just now'}</Text>
          <Pressable style={styles.verifyBtn} onPress={() => navigation.navigate('StepUpAuth', { reason: 'Manual re-verification' })}>
            <Text style={styles.verifyBtnText}>Verify Now</Text>
          </Pressable>
        </View>

        {/* Telemetry Chart Component */}
        <TelemetryChart history={scoreHistory} />

        {/* SECTION 2: Active Methods */}
        <Text style={styles.sectionTitle}>Active Auth Methods</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          <MethodCard icon={FaceIcon} name="Face" active={true} />
          <MethodCard icon={FingerprintIcon} name="Finger" active={user?.enrolledMethods.includes('FINGERPRINT') || false} />
          <MethodCard icon={VoiceIcon} name="Voice" active={false} />
          <MethodCard icon={BehaviorIcon} name="Behaviour" active={true} />
        </ScrollView>

        {/* SECTION 3: Recent Activity */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <Pressable onPress={() => navigation.navigate('Alerts')}>
            <Text style={styles.viewAll}>View all</Text>
          </Pressable>
        </View>
        <View style={styles.activityFeed}>
          {alerts.slice(0, 3).map((alert) => (
            <ActivityItem key={alert.id} alert={alert} />
          ))}
          {alerts.length === 0 && (
            <Text style={styles.emptyText}>No recent activity</Text>
          )}
        </View>

        {/* SECTION 4: Connected Devices */}
        <Text style={styles.sectionTitle}>Connected Devices</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {connectedDevices.map((device) => (
            <DeviceCard key={device.id} device={device} />
          ))}
          <Pressable style={styles.addDeviceCard}>
            <Text style={{ fontSize: 24, color: COLORS.primary }}>+</Text>
            <Text style={styles.addDeviceText}>Add Device</Text>
          </Pressable>
        </ScrollView>

        {/* SECTION 5: Quick Actions */}
        <View style={styles.quickActions}>
          <ActionButton label="Remote logout all sessions" color={COLORS.danger} />
          <ActionButton label="Download activity report" color={COLORS.primary} />
        </View>
      </ScrollView>
    </View>
  );
};

const MethodCard = ({ icon: Icon, name, active }: { icon: any; name: string; active: boolean }) => (
  <View style={styles.methodCard}>
    <Icon color={active ? COLORS.primary : COLORS.textMuted} size={28} />
    <Text style={styles.methodName}>{name}</Text>
    <View style={[styles.statusDot, { backgroundColor: active ? COLORS.success : COLORS.textMuted }]} />
  </View>
);

const ActivityItem = ({ alert }: { alert: any }) => {
  const severityColor = alert.severity === 'CRITICAL' ? COLORS.danger : alert.severity === 'WARNING' ? COLORS.warning : COLORS.success;
  return (
    <View style={styles.activityItem}>
      <View style={[styles.activityIcon, { backgroundColor: alert.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)' }]}>
        <ShieldIcon color={severityColor} size={18} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.activityMsg}>{alert.message}</Text>
        <Text style={styles.activityTime}>{new Date(alert.timestamp).toLocaleTimeString()}</Text>
      </View>
      <View style={[styles.severityBadge, { backgroundColor: alert.severity === 'CRITICAL' ? COLORS.danger : alert.severity === 'WARNING' ? COLORS.warning : COLORS.primary }]}>
        <Text style={styles.severityText}>{alert.severity}</Text>
      </View>
    </View>
  );
};

const DeviceCard = ({ device }: { device: any }) => {
  const getDeviceIcon = (platform: string, name: string) => {
    const p = platform.toLowerCase();
    const n = name.toLowerCase();
    if (p.includes('watch') || n.includes('watch')) return WatchIcon;
    if (p.includes('phone') || p.includes('android') || p.includes('ios') || n.includes('phone')) return PhoneIcon;
    return LaptopIcon;
  };
  const Icon = getDeviceIcon(device.platform, device.name);
  return (
    <View style={styles.deviceCard}>
      <View style={styles.deviceIconWrapper}>
        <Icon color={COLORS.secondary} size={22} />
      </View>
      <Text style={styles.deviceName}>{device.name}</Text>
      <View style={styles.platformBadge}>
        <Text style={styles.platformText}>{device.platform}</Text>
      </View>
      <Text style={[styles.deviceStatus, { color: device.status === 'ONLINE' ? COLORS.success : COLORS.danger }]}>{device.status}</Text>
    </View>
  );
};

const ActionButton = ({ label, color }: any) => (
  <Pressable style={[styles.actionBtn, { borderColor: color }]}>
    <Text style={[styles.actionBtnText, { color }]}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SPACING[24], paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING[32], paddingTop: SPACING[24] },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING[12] },
  shieldIconWrapper: { width: 40, height: 40, backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center' },
  greeting: { color: COLORS.textSecondary, fontSize: TYPOGRAPHY.sizes.sm },
  userName: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.sizes.lg, fontWeight: 'bold' },
  bellBtn: { width: 44, height: 44, borderRadius: RADIUS.md, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' },
  badge: { position: 'absolute', top: 8, right: 8, backgroundColor: COLORS.danger, borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  heroCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING[24], alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.medium },
  progressWrapper: { width: 200, height: 200, justifyContent: 'center', alignItems: 'center' },
  svg: { position: 'absolute' },
  scoreTextContainer: { alignItems: 'center' },
  scoreNumber: { fontSize: 48, fontWeight: 'bold', fontFamily: TYPOGRAPHY.families.heading },
  scoreLabel: { fontSize: 12, color: COLORS.textSecondary, letterSpacing: 2 },
  statusText: { fontSize: TYPOGRAPHY.sizes.md, fontWeight: 'bold', marginTop: SPACING[16] },
  timestamp: { fontSize: TYPOGRAPHY.sizes.xs, color: COLORS.textMuted, marginTop: 4 },
  verifyBtn: { marginTop: SPACING[24], paddingHorizontal: 32, paddingVertical: 12, backgroundColor: COLORS.elevated, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.primary },
  verifyBtnText: { color: COLORS.primary, fontWeight: 'bold', fontSize: TYPOGRAPHY.sizes.sm },
  sectionTitle: { fontSize: TYPOGRAPHY.sizes.md, fontWeight: 'bold', color: COLORS.textPrimary, marginTop: SPACING[32], marginBottom: SPACING[16] },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  viewAll: { color: COLORS.primary, fontSize: TYPOGRAPHY.sizes.sm },
  row: { gap: SPACING[16] },
  methodCard: { width: 100, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING[16], alignItems: 'center', gap: SPACING[12], borderWidth: 1, borderColor: COLORS.border },
  methodName: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.sizes.xs, fontWeight: '600' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  activityFeed: { gap: SPACING[12] },
  activityItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: SPACING[16], borderRadius: RADIUS.md, gap: SPACING[12], borderWidth: 1, borderColor: COLORS.border },
  activityIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  activityMsg: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.sizes.sm, fontWeight: '500' },
  activityTime: { color: COLORS.textMuted, fontSize: 10, marginTop: 2 },
  severityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  severityText: { color: '#fff', fontSize: 8, fontWeight: 'bold' },
  deviceCard: { width: 130, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING[16], gap: 6, borderWidth: 1, borderColor: COLORS.border },
  deviceName: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.sizes.sm, fontWeight: 'bold' },
  deviceIconWrapper: { width: 36, height: 36, borderRadius: RADIUS.sm, backgroundColor: COLORS.elevated, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING[4] },
  platformBadge: { backgroundColor: COLORS.elevated, alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  platformText: { color: COLORS.textSecondary, fontSize: 8 },
  deviceStatus: { fontSize: 10, fontWeight: 'bold' },
  addDeviceCard: { width: 130, height: 120, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderStyle: 'dashed', borderWidth: 1, borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', gap: 8 },
  addDeviceText: { color: COLORS.primary, fontSize: TYPOGRAPHY.sizes.xs, fontWeight: 'bold' },
  quickActions: { gap: SPACING[12], marginTop: SPACING[32] },
  actionBtn: { height: 50, borderRadius: RADIUS.md, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  actionBtnText: { fontWeight: 'bold', fontSize: TYPOGRAPHY.sizes.sm },
  emptyText: { color: COLORS.textMuted, textAlign: 'center', padding: 20 }
});
