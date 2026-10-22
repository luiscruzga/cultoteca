import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  describeEventLocation,
  EVENT_RADIUS_OPTIONS_KM,
  EventSearchLocation,
  isDeviceLocation,
} from '../services/api/eventSearchService';

export type EventLocationStatus = 'idle' | 'locating' | 'denied' | 'unavailable';

interface EventLocationBarProps {
  location: EventSearchLocation | null;
  status: EventLocationStatus;
  radiusKm: number;
  onChangeRadius: (radiusKm: number) => void;
  onUseDeviceLocation: () => void;
  onSubmitCity: (city: string) => void;
  onClear: () => void;
}

/**
 * Dónde buscar eventos: la ubicación del dispositivo o una ciudad escrita. El campo de ciudad
 * guarda su propio texto para que el modal no se re-renderice con cada tecla (ver SearchInputField).
 */
export const EventLocationBar: React.FC<EventLocationBarProps> = ({
  location,
  status,
  radiusKm,
  onChangeRadius,
  onUseDeviceLocation,
  onSubmitCity,
  onClear,
}) => {
  const [city, setCity] = useState('');
  const usingDevice = Boolean(location && isDeviceLocation(location));

  const submitCity = () => {
    const trimmed = city.trim();
    if (trimmed.length < 2) return;
    onSubmitCity(trimmed);
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.nearBtn, usingDevice && styles.nearBtnActive]}
          onPress={onUseDeviceLocation}
          disabled={status === 'locating'}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Buscar eventos cerca de mi ubicación"
        >
          {status === 'locating' ? (
            <ActivityIndicator size="small" color={usingDevice ? '#0F172A' : '#38BDF8'} />
          ) : (
            <Ionicons name="navigate" size={15} color={usingDevice ? '#0F172A' : '#38BDF8'} />
          )}
          <Text style={[styles.nearBtnText, usingDevice && styles.nearBtnTextActive]}>Cerca de mí</Text>
        </TouchableOpacity>
        <View style={styles.cityField}>
          <Ionicons name="location-outline" size={16} color="#64748B" />
          <TextInput
            style={styles.cityInput}
            placeholder="o escribe una ciudad o comuna"
            placeholderTextColor="#64748B"
            value={city}
            onChangeText={setCity}
            onSubmitEditing={submitCity}
            returnKeyType="search"
            autoCapitalize="words"
            autoCorrect={false}
            accessibilityLabel="Ciudad donde buscar eventos"
          />
          {city.trim().length >= 2 ? (
            <TouchableOpacity onPress={submitCity} accessibilityLabel="Buscar en esa ciudad" style={styles.cityGoBtn}>
              <Ionicons name="arrow-forward-circle" size={22} color="#38BDF8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {location ? (
        <View style={styles.statusRow}>
          <Ionicons name="pin" size={13} color="#FB7185" />
          <Text style={styles.statusText} numberOfLines={1}>
            Buscando cerca de {describeEventLocation(location)}
          </Text>
          <TouchableOpacity onPress={onClear} accessibilityLabel="Quitar ubicación" style={styles.clearBtn}>
            <Ionicons name="close-circle" size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      ) : null}
      {location ? (
        <View style={styles.radiusRow}>
          <Text style={styles.radiusLabel}>Radio</Text>
          {EVENT_RADIUS_OPTIONS_KM.map(option => {
            const active = option === radiusKm;
            return (
              <TouchableOpacity
                key={option}
                style={[styles.radiusChip, active && styles.radiusChipActive]}
                onPress={() => onChangeRadius(option)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Buscar en un radio de ${option} kilómetros`}
              >
                <Text style={[styles.radiusChipText, active && styles.radiusChipTextActive]}>{option} km</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : status === 'denied' ? (
        <Text style={styles.warningText}>
          Sin permiso de ubicación. Actívalo en los ajustes del sistema o escribe una ciudad.
        </Text>
      ) : status === 'unavailable' ? (
        <Text style={styles.warningText}>No se pudo obtener tu ubicación. Prueba de nuevo o escribe una ciudad.</Text>
      ) : (
        <Text style={styles.hintText}>
          Con una ubicación y sin texto verás los próximos eventos a tu alrededor (Puntoticket, Ticketpro, Ticketplus y más).
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  nearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  nearBtnActive: {
    backgroundColor: '#38BDF8',
  },
  nearBtnText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
  nearBtnTextActive: {
    color: '#0F172A',
  },
  cityField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  cityInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
    paddingVertical: 10,
    outlineStyle: 'none',
  } as any,
  cityGoBtn: {
    padding: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    flex: 1,
    color: '#CBD5E1',
    fontSize: 12,
  },
  clearBtn: {
    padding: 2,
  },
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  radiusLabel: {
    color: '#64748B',
    fontSize: 12,
    marginRight: 2,
  },
  radiusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1E293B',
  },
  radiusChipActive: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  radiusChipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  radiusChipTextActive: {
    color: '#38BDF8',
  },
  warningText: {
    color: '#FBBF24',
    fontSize: 12,
  },
  hintText: {
    color: '#64748B',
    fontSize: 12,
  },
});
