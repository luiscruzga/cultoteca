import React, { useState } from 'react';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  PLATFORM_GROUP_LABELS,
  PlatformGroup,
  SUBSCRIPTION_PLATFORMS,
  canonicalPlatformName,
  isSamePlatform,
  resolvePlatformBranding,
} from '../utils/platformLogos';

interface PlatformSubscriptionsEditorProps {
  value: string[];
  onChange: (platforms: string[]) => void;
}

const GROUP_ORDER: PlatformGroup[] = ['video', 'music', 'reading', 'games'];

const PlatformTile: React.FC<{ name: string; selected: boolean; onPress: () => void; removable?: boolean }> = ({
  name,
  selected,
  onPress,
  removable = false,
}) => {
  const [imageError, setImageError] = useState(false);
  const branding = resolvePlatformBranding(name);
  const accent = branding.color || '#38BDF8';

  return (
    <TouchableOpacity
      style={[styles.tile, selected && { borderColor: accent, backgroundColor: `${accent}22` }]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={removable ? `Quitar ${name}` : name}
    >
      {branding.logoUrl && !imageError ? (
        <Image
          source={{ uri: branding.logoUrl }}
          style={[styles.tileLogo, !selected && styles.tileLogoInactive]}
          onError={() => setImageError(true)}
        />
      ) : (
        <View style={[styles.tileLogo, styles.tileIconFallback, { backgroundColor: `${accent}33` }]}>
          <Ionicons name={branding.fallbackIcon as any} size={13} color={accent} />
        </View>
      )}
      <Text style={[styles.tileText, selected && styles.tileTextSelected]} numberOfLines={1}>
        {branding.shortName}
      </Text>
      {selected && (
        <Ionicons name={removable ? 'close-circle' : 'checkmark-circle'} size={14} color={removable ? '#94A3B8' : '#10B981'} />
      )}
    </TouchableOpacity>
  );
};

export const PlatformSubscriptionsEditor: React.FC<PlatformSubscriptionsEditorProps> = ({ value, onChange }) => {
  const [customName, setCustomName] = useState('');

  const isSelected = (name: string) => value.some(sub => isSamePlatform(sub, name));
  const toggle = (name: string) =>
    onChange(isSelected(name) ? value.filter(sub => !isSamePlatform(sub, name)) : [...value, name]);

  // Selected platforms that are not offered in the catalog (typed by the user).
  const customPlatforms = value.filter(sub => !SUBSCRIPTION_PLATFORMS.some(p => isSamePlatform(p.name, sub)));

  const handleAddCustom = () => {
    const name = canonicalPlatformName(customName);
    if (!name) return;
    if (!isSelected(name)) onChange([...value, name]);
    setCustomName('');
  };

  return (
    <View>
      {GROUP_ORDER.map(group => (
        <View key={group} style={styles.group}>
          <Text style={styles.groupLabel}>{PLATFORM_GROUP_LABELS[group]}</Text>
          <View style={styles.tilesRow}>
            {SUBSCRIPTION_PLATFORMS.filter(p => p.group === group).map(p => (
              <PlatformTile key={p.name} name={p.name} selected={isSelected(p.name)} onPress={() => toggle(p.name)} />
            ))}
          </View>
        </View>
      ))}

      <View style={styles.group}>
        <Text style={styles.groupLabel}>Otra plataforma</Text>
        {customPlatforms.length > 0 && (
          <View style={styles.tilesRow}>
            {customPlatforms.map(name => (
              <PlatformTile key={name} name={name} selected removable onPress={() => toggle(name)} />
            ))}
          </View>
        )}
        <View style={styles.customRow}>
          <TextInput
            style={styles.customInput}
            value={customName}
            onChangeText={setCustomName}
            placeholder="Escribe una plataforma (ej. Shudder)"
            placeholderTextColor="#64748B"
            returnKeyType="done"
            onSubmitEditing={handleAddCustom}
            maxLength={40}
          />
          <TouchableOpacity
            style={[styles.customAddBtn, !customName.trim() && styles.customAddBtnDisabled]}
            onPress={handleAddCustom}
            disabled={!customName.trim()}
            accessibilityLabel="Añadir plataforma"
          >
            <Ionicons name="add" size={18} color="#0F172A" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  group: {
    marginBottom: 12,
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  tilesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0F172A',
    maxWidth: '100%',
  },
  tileLogo: {
    width: 20,
    height: 20,
    borderRadius: 5,
    backgroundColor: '#1E293B',
  },
  tileLogoInactive: {
    opacity: 0.55,
  },
  tileIconFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    flexShrink: 1,
  },
  tileTextSelected: {
    color: '#F8FAFC',
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  customInput: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#F8FAFC',
    fontSize: 13,
  },
  customAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#38BDF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customAddBtnDisabled: {
    opacity: 0.4,
  },
});
