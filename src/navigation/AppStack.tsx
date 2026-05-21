import React from 'react';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { AppStackParamList } from './types';
import { BottomTabNavigator } from './BottomTabNavigator';
import { StepUpAuthScreen } from '../screens/Auth/StepUpAuthScreen';
import { DeviceDetailScreen } from '../screens/Dashboard/DeviceDetailScreen';
import { COLORS } from '../theme';

const Stack = createStackNavigator<AppStackParamList>();

export const AppStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: COLORS.background },
        ...TransitionPresets.SlideFromRightIOS,
      }}
    >
      <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
      
      {/* Modals */}
      <Stack.Group screenOptions={{ presentation: 'modal', gestureEnabled: false }}>
        <Stack.Screen 
          name="StepUpAuth" 
          component={StepUpAuthScreen} 
          options={{
            // Prevent back gesture for critical auth
            gestureEnabled: false,
          }}
        />
        <Stack.Screen name="DeviceDetail" component={DeviceDetailScreen} />
      </Stack.Group>
    </Stack.Navigator>
  );
};
