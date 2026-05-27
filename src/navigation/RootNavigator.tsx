import React from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { AuthStack } from './AuthStack';
import { AppStack } from './AppStack';
import { useAuthStore } from '../store/authStore';

// Expose the active screen name globally for touch tracking context
export let activeScreenName = 'Login';

export const RootNavigator = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const navigationRef = useNavigationContainerRef();

  return (
    <NavigationContainer
      ref={navigationRef}
      onStateChange={() => {
        const currentRoute = navigationRef.getCurrentRoute() as any;
        const currentRouteName = currentRoute?.name;
        if (currentRouteName) {
          activeScreenName = currentRouteName;
        }
      }}
    >
      {isAuthenticated ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

