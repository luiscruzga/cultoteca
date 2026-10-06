import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { UpdateService } from '../services/updateService';

const AUTHOR_HANDLE = 'luiscruzga';
const AUTHOR_URL = `https://github.com/${AUTHOR_HANDLE}`;

export const AppFooter: React.FC = () => (
  <View style={styles.footer}>
    <Text style={styles.text}>
      Cultoteca v{UpdateService.getCurrentVersion()} · por{' '}
      <Text
        style={styles.link}
        onPress={() => Linking.openURL(AUTHOR_URL).catch(() => undefined)}
        accessibilityRole="link"
        accessibilityLabel={`Perfil de GitHub de ${AUTHOR_HANDLE}`}
      >
        @{AUTHOR_HANDLE}
      </Text>
    </Text>
  </View>
);

const styles = StyleSheet.create({
  footer: {
    alignItems: 'center',
    paddingVertical: 5,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  text: {
    fontSize: 10.5,
    color: '#475569',
  },
  link: {
    color: '#64748B',
    fontWeight: '600',
  },
});
