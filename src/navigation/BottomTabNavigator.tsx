import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BottomTabParamList } from './types';
import { DashboardScreen } from '../screens/Dashboard/DashboardScreen';
import { AlertsScreen } from '../screens/Alerts/AlertsScreen';
import { SettingsScreen } from '../screens/Settings/SettingsScreen';
import { COLORS, TYPOGRAPHY, SPACING } from '../theme';
import { View, Text, StyleSheet } from 'react-native';

const Tab = createBottomTabNavigator<BottomTabParamList>();

export const BottomTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarLabelStyle: styles.tabLabel,
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{
          tabBarIcon: ({ color }) => <View style={[styles.iconPlaceholder, { backgroundColor: color }]} />
        }}
      />
      <Tab.Screen 
        name="Alerts" 
        component={AlertsScreen} 
        options={{
          tabBarBadge: 3,
          tabBarIcon: ({ color }) => <View style={[styles.iconPlaceholder, { backgroundColor: color }]} />
        }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{
          tabBarIcon: ({ color }) => <View style={[styles.iconPlaceholder, { backgroundColor: color }]} />
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING[8],
    height: 60,
  },
  tabLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontFamily: TYPOGRAPHY.families.medium,
    marginBottom: SPACING[8],
  },
  iconPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: 10,
  }
});
