import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MediaCategory } from '../types';

interface SearchLoadingSkeletonProps {
  category?: MediaCategory | 'all';
}

const MESSAGES_BY_CATEGORY: Record<MediaCategory | 'all', string[]> = {
  all: [
    'Consultando películas y series en TMDB...',
    'Explorando videojuegos en RAWG...',
    'Explorando mangas en MangaDex...',
    'Buscando anime y temporadas populares...',
    'Revisando libros en catálogos abiertos...',
    'Sincronizando plataformas de streaming y tiendas...',
  ],
  movie: [
    'Buscando en catálogo global de TMDB...',
    'Consultando plataformas de streaming (JustWatch)...',
    'Obteniendo pósters en alta definición y sinopsis...',
  ],
  series: [
    'Buscando series y temporadas en TMDB...',
    'Consultando disponibilidad en Netflix, Prime, HBO y más...',
    'Recuperando calificaciones de la comunidad...',
  ],
  anime: [
    'Buscando series y películas de anime...',
    'Consultando disponibilidad en Crunchyroll y plataformas...',
    'Obteniendo información de temporadas y episodios...',
  ],
  manga: [
    'Buscando títulos en MangaDex v5...',
    'Recuperando portadas originales y autores...',
    'Obteniendo sinopsis y demografía...',
  ],
  book: [
    'Consultando Open Library y catálogos globales...',
    'Buscando autores, años de publicación y portadas...',
    'Verificando información literaria...',
  ],
  game: [
    'Consultando catálogo de videojuegos en RAWG...',
    'Verificando plataformas (Steam, PlayStation, Xbox, Switch)...',
    'Recuperando desarrolladores, calificaciones y capturas...',
  ],
  boardgame: [
    'Buscando juegos de mesa clásicos y modernos...',
    'Consultando diseñadores, mecánicas y años de publicación...',
    'Recuperando información de partidas y portadas...',
  ],
  podcast: [
    'Buscando en Apple Podcasts y directorios globales...',
    'Recuperando episodios, creadores y portadas HD...',
    'Obteniendo información del feed y géneros...',
  ],
  music: [
    'Buscando canciones y álbumes en catálogo global...',
    'Recuperando artistas, carátulas y muestras de audio...',
    'Obteniendo año de lanzamiento y enlaces directos...',
  ],
  recipe: [
    'Consultando recetas gastronómicas en TheMealDB...',
    'Recuperando ingredientes, país de origen y preparación...',
    'Obteniendo fotos de platillos y enlaces a tutoriales...',
  ],
  place: [
    'Explorando lugares históricos y culturales en Wikipedia...',
    'Obteniendo fotografías y sinopsis geográfica...',
    'Recuperando coordenadas y datos de interés turístico...',
  ],
  link: [
    'Obteniendo previsualización del enlace...',
    'Extrayendo título, descripción y portada...',
    'Detectando plataforma y metadatos...',
  ],
};

export const SearchLoadingSkeleton: React.FC<SearchLoadingSkeletonProps> = ({
  category = 'all',
}) => {
  const pulseAnim = useRef(new Animated.Value(0.35)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const [messageIndex, setMessageIndex] = useState(0);

  const messages = MESSAGES_BY_CATEGORY[category] || MESSAGES_BY_CATEGORY.all;

  // Pulse animation for skeleton elements
  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.85,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();

    return () => {
      pulseLoop.stop();
    };
  }, [pulseAnim]);

  // Subtle continuous rotation for radar/compass icon
  useEffect(() => {
    const rotateLoop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    rotateLoop.start();

    return () => {
      rotateLoop.stop();
    };
  }, [rotateAnim]);

  // Cycling contextual messages
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % messages.length);
    }, 1800);

    return () => clearInterval(interval);
  }, [messages.length]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      {/* Contextual animated banner */}
      <View style={styles.banner}>
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Ionicons name="sparkles" size={20} color="#38BDF8" />
        </Animated.View>
        <View style={styles.bannerTextContainer}>
          <Text style={styles.bannerTitle}>Buscando contenido</Text>
          <Text style={styles.bannerSubtitle}>{messages[messageIndex]}</Text>
        </View>
        <View style={styles.liveDotContainer}>
          <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
        </View>
      </View>

      {/* Skeleton cards */}
      {[1, 2, 3].map(itemKey => (
        <View key={itemKey} style={styles.skeletonCard}>
          {/* Poster placeholder */}
          <Animated.View style={[styles.skeletonPoster, { opacity: pulseAnim }]} />

          {/* Info placeholder */}
          <View style={styles.skeletonInfo}>
            {/* Title line */}
            <Animated.View
              style={[
                styles.skeletonLine,
                { width: itemKey % 2 === 0 ? '80%' : '65%', height: 16, marginBottom: 8, opacity: pulseAnim },
              ]}
            />
            {/* Meta line */}
            <Animated.View
              style={[
                styles.skeletonLine,
                { width: '40%', height: 12, marginBottom: 10, opacity: pulseAnim },
              ]}
            />
            {/* Provider pill */}
            <View style={styles.skeletonProviders}>
              <Animated.View
                style={[styles.skeletonPill, { width: 75, opacity: pulseAnim }]}
              />
              <Animated.View
                style={[styles.skeletonPill, { width: 60, opacity: pulseAnim }]}
              />
            </View>
            {/* Rating stars line */}
            <Animated.View
              style={[
                styles.skeletonLine,
                { width: '50%', height: 10, marginTop: 8, opacity: pulseAnim },
              ]}
            />
          </View>

          {/* Add button placeholder */}
          <Animated.View style={[styles.skeletonButton, { opacity: pulseAnim }]} />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 4,
    paddingTop: 8,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  bannerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  bannerTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  bannerSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  liveDotContainer: {
    paddingLeft: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#38BDF8',
  },
  skeletonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  skeletonPoster: {
    width: 60,
    height: 88,
    borderRadius: 8,
    backgroundColor: '#334155',
  },
  skeletonInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  skeletonLine: {
    borderRadius: 4,
    backgroundColor: '#334155',
  },
  skeletonProviders: {
    flexDirection: 'row',
    gap: 6,
  },
  skeletonPill: {
    height: 20,
    borderRadius: 6,
    backgroundColor: '#334155',
  },
  skeletonButton: {
    width: 72,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#334155',
    marginLeft: 10,
  },
});
