import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import Animated, { FadeInRight, FadeOutLeft, Layout } from 'react-native-reanimated';
import { useAlertStore } from '../../store/alertStore';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../theme';
import { MMCAAlert } from '../../types';

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
        ListEmptyState={<EmptyState />}
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
      case 'FACE_MISMATCH': return '👤';
      case 'NEW_DEVICE': return '📱';
      case 'LOCATION_ANOMALY': return '📍';
      case 'TRUST_DROP': return '📉';
      case 'IOT_ALERT': return '📹';
      default: return '🛡️';
    }
  };

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
          <Text style={{ fontSize: 20 }}>{getIcon(alert.type)}</Text>
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
    <Text style={{ fontSize: 64, marginBottom: 20 }}>🛡️</Text>
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
