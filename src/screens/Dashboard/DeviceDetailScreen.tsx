import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, TYPOGRAPHY } from '../../theme';

export const DeviceDetailScreen = () => (
  <View style={styles.container}>
    <Text style={styles.text}>DeviceDetailScreen</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  text: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.sizes.xl, fontWeight: TYPOGRAPHY.weights.bold }
});
