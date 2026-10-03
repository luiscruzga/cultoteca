import React from 'react';
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UpdateService } from '../services/updateService';

interface WelcomeLandingScreenProps {
  onOpenSignIn: () => void;
  onOpenSignUp: () => void;
  onExplorePublic?: () => void;
}

export const WelcomeLandingScreen: React.FC<WelcomeLandingScreenProps> = ({
  onOpenSignIn,
  onOpenSignUp,
  onExplorePublic,
}) => {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.logoBadgeContainer}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.heroLogo}
            resizeMode="contain"
            accessible={true}
            accessibilityLabel="Cultoteca Logo"
          />
        </View>

        <Image
          source={require('../../assets/logo-text.svg')}
          style={styles.brandTitleImage}
          resizeMode="contain"
          accessible={true}
          accessibilityLabel="Cultoteca"
        />

        <Text style={styles.heroTagline}>
          Tu santuario para descubrir, registrar y compartir cine, series, anime, libros y videojuegos de culto.
        </Text>
      </View>

      {/* CTA Buttons */}
      <View style={styles.ctaButtonGroup}>
        <TouchableOpacity
          style={styles.primaryCtaBtn}
          onPress={onOpenSignUp}
          activeOpacity={0.85}
          accessibilityLabel="Crear cuenta nueva"
        >
          <Ionicons name="sparkles" size={18} color="#0F172A" />
          <Text style={styles.primaryCtaText}>Crear mi Cuenta de Culto</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryCtaBtn}
          onPress={onOpenSignIn}
          activeOpacity={0.85}
          accessibilityLabel="Iniciar sesión con cuenta existente"
        >
          <Ionicons name="log-in-outline" size={18} color="#38BDF8" />
          <Text style={styles.secondaryCtaText}>Ya tengo cuenta — Iniciar Sesión</Text>
        </TouchableOpacity>

        {onExplorePublic && (
          <TouchableOpacity
            style={styles.ghostCtaBtn}
            onPress={onExplorePublic}
            activeOpacity={0.8}
            accessibilityLabel="Explorar listas públicas como invitado"
          >
            <Ionicons name="compass-outline" size={17} color="#94A3B8" />
            <Text style={styles.ghostCtaText}>Explorar Listas Públicas</Text>
          </TouchableOpacity>
        )}

        {Platform.OS === 'web' && (
          <TouchableOpacity
            style={styles.webApkBtn}
            onPress={() => UpdateService.openApkDownload()}
            activeOpacity={0.85}
            accessibilityLabel="Descargar APK para Android"
          >
            <Ionicons name="logo-android" size={18} color="#10B981" />
            <Text style={styles.webApkBtnText}>Descargar APK para Android</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Feature Highlights Grid */}
      <View style={styles.featuresSection}>
        <Text style={styles.featuresSectionTitle}>¿POR QUÉ CULTOTECA?</Text>

        <View style={styles.featureCard}>
          <View style={[styles.featureIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.12)' }]}>
            <Ionicons name="albums" size={22} color="#38BDF8" />
          </View>
          <View style={styles.featureTextBox}>
            <Text style={styles.featureTitle}>Listas Colaborativas</Text>
            <Text style={styles.featureDescription}>
              Crea colecciones compartidas con tus amigos, asigna roles de edición y descubran obras juntos sin perder el rastro.
            </Text>
          </View>
        </View>

        <View style={styles.featureCard}>
          <View style={[styles.featureIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
            <Ionicons name="radio" size={22} color="#F59E0B" />
          </View>
          <View style={styles.featureTextBox}>
            <Text style={styles.featureTitle}>Radar Streaming & Estrenos</Text>
            <Text style={styles.featureDescription}>
              Sincroniza tus suscripciones activas (Netflix, Prime, Max, Crunchyroll) y activa recordatorios para próximos episodios.
            </Text>
          </View>
        </View>

        <View style={styles.featureCard}>
          <View style={[styles.featureIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
            <Ionicons name="heart" size={22} color="#EF4444" />
          </View>
          <View style={styles.featureTextBox}>
            <Text style={styles.featureTitle}>Recomendaciones Directas</Text>
            <Text style={styles.featureDescription}>
              Envía sugerencias personalizadas a tus amigos con notas privadas y agrégalas directamente a tus listas con un toque.
            </Text>
          </View>
        </View>

        <View style={styles.featureCard}>
          <View style={[styles.featureIconBox, { backgroundColor: 'rgba(168, 85, 247, 0.12)' }]}>
            <Ionicons name="dice" size={22} color="#A855F7" />
          </View>
          <View style={styles.featureTextBox}>
            <Text style={styles.featureTitle}>Ruleta Cultural & Medallas</Text>
            <Text style={styles.featureDescription}>
              ¿Indeciso? Gira la ruleta cultural para elegir tu próxima película o serie y desbloquea rangos y medallas cinéfilas.
            </Text>
          </View>
        </View>
      </View>

      {/* Footer Info */}
      <View style={styles.footerSection}>
        <Text style={styles.footerText}>
          Cultoteca · Curaduría comunitaria libre de algoritmos invasivos
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 48,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadgeContainer: {
    width: 104,
    height: 104,
    borderRadius: 28,
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 16,
  },
  heroLogo: {
    width: 80,
    height: 80,
  },
  brandTitleImage: {
    width: 210,
    height: 48,
    marginBottom: 12,
  },
  heroTagline: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 340,
  },
  ctaButtonGroup: {
    gap: 12,
    marginBottom: 36,
  },
  primaryCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#38BDF8',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryCtaText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  secondaryCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 14,
    gap: 8,
  },
  secondaryCtaText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#38BDF8',
  },
  ghostCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  ghostCtaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  webApkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1.5,
    borderColor: '#10B981',
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 14,
    gap: 8,
  },
  webApkBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
  featuresSection: {
    gap: 12,
    marginBottom: 24,
  },
  featuresSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 14,
  },
  featureIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextBox: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 12.5,
    color: '#94A3B8',
    lineHeight: 18,
  },
  footerSection: {
    alignItems: 'center',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
  },
});
