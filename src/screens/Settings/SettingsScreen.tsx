import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Pressable, Alert, Dimensions } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useDeviceStore } from '../../store/deviceStore';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, getTrustColor } from '../../theme';

const { width } = Dimensions.get('window');

export const SettingsScreen = () => {
  const { user, updateEnrolledMethods, logout } = useAuthStore();
  const { connectedDevices, removeDevice } = useDeviceStore();

  // State for settings
  const [interval, setIntervalVal] = useState('5 min');
  const [threshold, setThreshold] = useState(60);
  const [pushEnabled, setPushEnabled] = useState(true);

  const handleDeleteData = () => {
    Alert.alert(
      'Delete Biometric Data',
      'This will permanently remove your facial and fingerprint signatures. You will be logged out.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => logout() }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.prompt(
      'Delete Account',
      'Type "DELETE" to confirm account deletion.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: (val) => {
          if (val === 'DELETE') logout();
        }}
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.headerTitle}>Settings</Text>

      {/* SECTION: Auth Methods */}
      <Section title="Authentication Methods">
        <SettingToggle 
          label="Face Recognition" 
          active={user?.enrolledMethods.includes('FACE')} 
          disabled={user?.enrolledMethods.length === 1 && user?.enrolledMethods.includes('FACE')}
        />
        <SettingToggle 
          label="Fingerprint" 
          active={user?.enrolledMethods.includes('FINGERPRINT')} 
        />
        <SettingToggle label="Voice Recognition" active={false} badge="Phase 2" />
        <SettingToggle label="Behavioural Biometrics" active={false} badge="Phase 2" />
        <View style={styles.btnRow}>
          <ActionButton label="Re-enrol Face" />
          <ActionButton label="Re-enrol Fingerprint" />
        </View>
      </Section>

      {/* SECTION: Continuous Auth */}
      <Section title="Continuous Authentication">
        <Text style={styles.subLabel}>Check Interval</Text>
        <View style={styles.segmentedControl}>
          {['1 min', '5 min', '10 min', '30 min'].map((val) => (
            <Pressable 
              key={val} 
              style={[styles.segment, interval === val && styles.segmentActive]}
              onPress={() => setIntervalVal(val)}
            >
              <Text style={[styles.segmentText, interval === val && styles.segmentTextActive]}>{val}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.sliderHeader}>
          <Text style={styles.subLabel}>Step-Up Threshold</Text>
          <Text style={[styles.thresholdVal, { color: getTrustColor(threshold) }]}>{threshold}</Text>
        </View>
        <View style={styles.sliderTrack}>
          <View style={[styles.sliderFill, { width: `${(threshold - 40) / 0.5}%`, backgroundColor: getTrustColor(threshold) }]} />
        </View>
        <View style={styles.sliderRange}>
          <Text style={styles.rangeText}>40</Text>
          <Text style={styles.rangeText}>90</Text>
        </View>
      </Section>

      {/* SECTION: IoT Devices */}
      <Section title="IoT Devices">
        {connectedDevices.map((device) => (
          <View key={device.id} style={styles.deviceItem}>
            <View>
              <Text style={styles.deviceName}>{device.name}</Text>
              <View style={styles.platformBadge}>
                <Text style={styles.platformText}>{device.platform}</Text>
              </View>
            </View>
            <Pressable onPress={() => removeDevice(device.id)}>
              <Text style={styles.disconnectBtn}>Disconnect</Text>
            </Pressable>
          </View>
        ))}
        <Pressable style={styles.addDeviceLink}>
          <Text style={styles.addDeviceText}>+ Add new device</Text>
        </Pressable>
      </Section>

      {/* SECTION: Notifications */}
      <Section title="Notifications">
        <SettingToggle label="Push Notifications" active={pushEnabled} onValueChange={setPushEnabled} />
        {pushEnabled && (
          <View style={styles.nestedSettings}>
            <SettingToggle label="Critical Alerts" active={true} mini />
            <SettingToggle label="Warning Alerts" active={true} mini />
            <SettingToggle label="All Activity" active={false} mini />
          </View>
        )}
      </Section>

      {/* SECTION: Privacy & Security */}
      <Section title="Privacy & Security">
        <SettingLink label="Export activity log (CSV)" />
        <SettingLink label="View privacy policy" />
        <Pressable style={styles.dangerLink} onPress={handleDeleteData}>
          <Text style={styles.dangerText}>Delete all my biometric data</Text>
        </Pressable>
        <Pressable style={styles.dangerLink} onPress={handleDeleteAccount}>
          <Text style={styles.dangerText}>Delete account</Text>
        </Pressable>
      </Section>

      {/* SECTION: About */}
      <Section title="About">
        <View style={styles.aboutRow}>
          <Text style={styles.aboutLabel}>Version</Text>
          <Text style={styles.aboutVal}>1.0.4 (Build 82)</Text>
        </View>
        <SettingLink label="Send feedback" />
      </Section>

      <Pressable style={styles.logoutBtn} onPress={() => logout()}>
        <Text style={styles.logoutText}>Log Out</Text>
      </Pressable>
    </ScrollView>
  );
};

const Section = ({ title, children }: any) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionCard}>{children}</View>
  </View>
);

const SettingToggle = ({ label, active, onValueChange, disabled, badge, mini }: any) => (
  <View style={[styles.settingRow, mini && styles.miniRow]}>
    <View style={styles.labelRow}>
      <Text style={[styles.settingLabel, mini && styles.miniLabel]}>{label}</Text>
      {badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </View>
    <Switch 
      value={active} 
      onValueChange={onValueChange} 
      disabled={disabled || !!badge}
      trackColor={{ false: COLORS.border, true: COLORS.primary }}
      thumbColor={active ? '#fff' : '#f4f3f4'}
    />
  </View>
);

const SettingLink = ({ label, onPress }: any) => (
  <Pressable style={styles.settingRow} onPress={onPress}>
    <Text style={styles.settingLabel}>{label}</Text>
    <Text style={{ color: COLORS.textMuted }}>→</Text>
  </Pressable>
);

const ActionButton = ({ label }: any) => (
  <Pressable style={styles.actionBtn}>
    <Text style={styles.actionBtnText}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SPACING[24], paddingBottom: 120 },
  headerTitle: { fontFamily: TYPOGRAPHY.families.heading, fontSize: TYPOGRAPHY.sizes['2xl'], color: COLORS.textPrimary, marginBottom: SPACING[32], paddingTop: SPACING[24] },
  section: { marginBottom: SPACING[32] },
  sectionTitle: { fontSize: TYPOGRAPHY.sizes.xs, color: COLORS.primary, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: SPACING[12], marginLeft: 4 },
  sectionCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING[16], borderBottomWidth: 1, borderBottomColor: COLORS.border },
  miniRow: { paddingVertical: SPACING[12], paddingLeft: SPACING[32] },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  settingLabel: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.sizes.base },
  miniLabel: { fontSize: TYPOGRAPHY.sizes.sm, color: COLORS.textSecondary },
  badge: { backgroundColor: COLORS.elevated, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { color: COLORS.primary, fontSize: 8, fontWeight: 'bold' },
  btnRow: { flexDirection: 'row', gap: 12, padding: SPACING[16] },
  actionBtn: { flex: 1, height: 40, backgroundColor: COLORS.elevated, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  actionBtnText: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '600' },
  subLabel: { color: COLORS.textSecondary, fontSize: TYPOGRAPHY.sizes.xs, marginBottom: 8, marginLeft: SPACING[16], marginTop: SPACING[16] },
  segmentedControl: { flexDirection: 'row', marginHorizontal: SPACING[16], backgroundColor: COLORS.elevated, borderRadius: RADIUS.md, padding: 4, marginBottom: SPACING[16] },
  segment: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: RADIUS.sm },
  segmentActive: { backgroundColor: COLORS.surface, ...SHADOWS.subtle },
  segmentText: { color: COLORS.textSecondary, fontSize: 12 },
  segmentTextActive: { color: COLORS.primary, fontWeight: 'bold' },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: SPACING[16] },
  thresholdVal: { fontSize: 18, fontWeight: 'bold' },
  sliderTrack: { height: 6, backgroundColor: COLORS.elevated, marginHorizontal: SPACING[16], borderRadius: 3, overflow: 'hidden' },
  sliderFill: { height: '100%' },
  sliderRange: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: SPACING[16], marginTop: 8, marginBottom: SPACING[24] },
  rangeText: { color: COLORS.textMuted, fontSize: 10 },
  deviceItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING[16], borderBottomWidth: 1, borderBottomColor: COLORS.border },
  deviceName: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.sizes.sm, fontWeight: 'bold' },
  platformBadge: { backgroundColor: COLORS.elevated, alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  platformText: { color: COLORS.textSecondary, fontSize: 8 },
  disconnectBtn: { color: COLORS.danger, fontSize: TYPOGRAPHY.sizes.xs, fontWeight: '600' },
  addDeviceLink: { padding: SPACING[16], alignItems: 'center' },
  addDeviceText: { color: COLORS.primary, fontSize: TYPOGRAPHY.sizes.sm, fontWeight: 'bold' },
  dangerLink: { padding: SPACING[16], borderBottomWidth: 1, borderBottomColor: COLORS.border },
  dangerText: { color: COLORS.danger, fontSize: TYPOGRAPHY.sizes.sm },
  aboutRow: { flexDirection: 'row', justifyContent: 'space-between', padding: SPACING[16], borderBottomWidth: 1, borderBottomColor: COLORS.border },
  aboutLabel: { color: COLORS.textSecondary, fontSize: TYPOGRAPHY.sizes.sm },
  aboutVal: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.sizes.sm },
  logoutBtn: { marginTop: SPACING[40], height: 56, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.danger },
  logoutText: { color: COLORS.danger, fontWeight: 'bold', fontSize: TYPOGRAPHY.sizes.md },
  nestedSettings: { backgroundColor: 'rgba(255,255,255,0.02)' }
});
