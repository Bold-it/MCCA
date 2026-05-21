import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthStackParamList } from './types';
import { WelcomeScreen } from '../screens/Onboarding/WelcomeScreen';
import { EnrolmentScreen } from '../screens/Onboarding/EnrolmentScreen';
import { LoginScreen } from '../screens/Login/LoginScreen';
import { COLORS } from '../theme';

const Stack = createStackNavigator<AuthStackParamList>();

export const AuthStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Enrolment" component={EnrolmentScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
};
