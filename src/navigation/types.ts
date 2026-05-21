import { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Welcome: undefined;
  Enrolment: { step: number };
  Login: undefined;
};

export type BottomTabParamList = {
  Dashboard: undefined;
  Alerts: undefined;
  Settings: undefined;
};

export type AppStackParamList = {
  MainTabs: NavigatorScreenParams<BottomTabParamList>;
  StepUpAuth: { reason: string };
  DeviceDetail: { deviceId: string };
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  App: NavigatorScreenParams<AppStackParamList>;
};
