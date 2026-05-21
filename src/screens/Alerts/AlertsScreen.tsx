import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import Animated, { FadeInRight, FadeOutLeft, Layout } from 'react-native-reanimated';
import { Svg, Path, Circle, Rect, Line, Polyline } from 'react-native-svg';
import { useAlertStore } from '../../store/alertStore';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../theme';
import { MMCAAlert } from '../../types';

const FaceMismatchIcon = ({ color, size = 22 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <Circle cx="9" cy="7" r="4" />
    <Line x1="17" y1="8" x2="22" y2="13" stroke={COLORS.danger} />
    <Line x1="22" y1="8" x2="17" y2="13" stroke={COLORS.danger} />
  </Svg>
);

const NewDeviceIcon = ({ color, size = 22 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    <Line x1="12" y1="18" x2="12.01" y2="18" />
    <Path d="M12 6v6m-3-3h6" />
  </Svg>
);

const LocationAnomalyIcon = ({ color, size = 22 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <Circle cx="12" cy="10" r="3" />
  </Svg>
);

const TrustDropIcon = ({ color, size = 22 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
    <Polyline points="17 18 23 18 23 12" />
  </Svg>
);

const IoTAlertIcon = ({ color, size = 22 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M23 7l-7 5 7 5V7z" />
    <Rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </Svg>
);

const ShieldIcon = ({ color, size = 22 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </Svg>
);

export const AlertsScreen = () => {
  const { alerts, markAsRead, markAllRead, clearAlerts } = useAlertStore();
  const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'INFO'>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredAlerts = useMemo(() => {
    if (filter === 'ALL') return alerts;
    return alerts.filter((a) => a.severity === filter);
  }, [alerts, filter]);

  const onRefresh = () => {
    setIsRefreshing(true);
    // Simulate API fetch
    setTimeout(() => setIsRefreshing(false), 1500);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Security Alerts</Text>
        {alerts.length > 0 && (
          <Pressable onPress={markAllRead}>
            <Text style={styles.markRead}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <FilterTab label="All" active={filter === 'ALL'} onPress={() => setFilter('ALL')} />
        <FilterTab label="Critical" active={filter === 'CRITICAL'} onPress={() => setFilter('CRITICAL')} />
        <FilterTab label="Warning" active={filter === 'WARNING'} onPress={() => setFilter('WARNING')} />
        <FilterTab label="Info" active={filter === 'INFO'} onPress={() => setFilter('INFO')} />
      </View>

      {/* Alert List */}
      <FlatList
        data={filteredAlerts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AlertItem 
            alert={item} 
            onPress={() => markAsRead(item.id)} 
          />
        )}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<EmptyState />}
      />
    </View>
  );
};

const FilterTab = ({ label, active, onPress }: any) => (
  <Pressable 
    style={[styles.tab, active && styles.tabActive]} 
    onPress={onPress}
  >
    <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
  </Pressable>
);

const AlertItem = ({ alert, onPress }: { alert: MMCAAlert, onPress: () => void }) => {
  const severityColor = 
    alert.severity === 'CRITICAL' ? COLORS.danger : 
    alert.severity === 'WARNING' ? COLORS.warning : 
    COLORS.primary;

  const getIcon = (type: string) => {
    switch (type) {
      case 'FACE_MISMATCH': return FaceMismatchIcon;
      case 'NEW_DEVICE': return NewDeviceIcon;
      case 'LOCATION_ANOMALY': return LocationAnomalyIcon;
      case 'TRUST_DROP': return TrustDropIcon;
      case 'IOT_ALERT': return IoTAlertIcon;
      default: return ShieldIcon;
    }
  };

  const IconComponent = getIcon(alert.type);

  return (
    <Animated.View 
      entering={FadeInRight} 
      layout={Layout.springify()}
      style={[
        styles.alertItem, 
        { borderLeftColor: severityColor },
        !alert.read && styles.unreadItem
      ]}
    >
      <Pressable style={styles.alertPressable} onPress={onPress}>
        <View style={styles.alertIcon}>
          <IconComponent color={severityColor} size={22} />
        </View>
        <View style={styles.alertBody}>
          <Text style={styles.alertTitle}>{alert.type.replace('_', ' ')}</Text>
          <Text style={styles.alertMsg}>{alert.message}</Text>
          <Text style={styles.alertTime}>{formatRelativeTime(alert.timestamp)}</Text>
        </View>
        {!alert.read && <View style={styles.unreadDot} />}
      </Pressable>
    </Animated.View>
  );
};

const EmptyState = () => (
  <View style={styles.emptyContainer}>
    <View style={{ marginBottom: 20 }}>
      <ShieldIcon color={COLORS.success} size={64} />
    </View>
    <Text style={styles.emptyTitle}>No alerts — you're all clear</Text>
    <Text style={styles.emptySub}>Your system is running normally.</Text>
  </View>
);

const formatRelativeTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
  return date.toLocaleDateString();
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingTop: SPACING[64], 
    paddingHorizontal: SPACING[24],
    marginBottom: SPACING[16]
  },
  title: { 
    fontFamily: TYPOGRAPHY.families.heading, 
    fontSize: TYPOGRAPHY.sizes.xl, 
    color: COLORS.textPrimary,
    fontWeight: 'bold'
  },
  markRead: { color: COLORS.primary, fontSize: TYPOGRAPHY.sizes.sm },
  filterBar: { 
    flexDirection: 'row', 
    paddingHorizontal: SPACING[24], 
    gap: SPACING[8],
    marginBottom: SPACING[24]
  },
  tab: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: RADIUS.full, 
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { color: COLORS.textSecondary, fontSize: TYPOGRAPHY.sizes.xs, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  listContent: { paddingHorizontal: SPACING[24], paddingBottom: 100, flexGrow: 1 },
  alertItem: { 
    backgroundColor: COLORS.surface, 
    borderRadius: RADIUS.md, 
    marginBottom: SPACING[12], 
    borderLeftWidth: 4,
    overflow: 'hidden'
  },
  unreadItem: { backgroundColor: COLORS.elevated },
  alertPressable: { flexDirection: 'row', padding: SPACING[16], alignItems: 'center' },
  alertIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', marginRight: SPACING[16] },
  alertBody: { flex: 1 },
  alertTitle: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.sizes.sm, fontWeight: 'bold', textTransform: 'capitalize' },
  alertMsg: { color: COLORS.textSecondary, fontSize: TYPOGRAPHY.sizes.xs, marginTop: 2 },
  alertTime: { color: COLORS.textMuted, fontSize: 10, marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginLeft: 8 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyTitle: { color: COLORS.success, fontSize: TYPOGRAPHY.sizes.md, fontWeight: 'bold' },
  emptySub: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.sizes.sm, marginTop: 8 }
});
