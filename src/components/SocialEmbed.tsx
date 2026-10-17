import React, { useState } from 'react';
import { LayoutChangeEvent, Linking, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';
import { LinkEmbed } from '../utils/linkEmbeds';
import { YouTubeEmbed } from './YouTubeEmbed';

export interface SocialEmbedProps {
  embed: LinkEmbed;
  /** El embed no se puede cargar (bloqueado, privado, error de red). */
  onError?: () => void;
  style?: StyleProp<ViewStyle>;
}

// Instagram y Facebook sirven una pantalla de login a los WebView que no se identifican como navegador.
const BROWSER_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

// Instagram no expone parámetro de autoplay: se pulsa el botón de reproducción y se arranca el <video> en silencio.
const INSTAGRAM_AUTOPLAY_JS = `(function () {
  function tryPlay() {
    var video = document.querySelector('video');
    if (video) {
      video.muted = true;
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
      var p = video.play();
      if (p && p.catch) { p.catch(function () {}); }
      return true;
    }
    var button = document.querySelector('[class*="PlayButton"], [class*="playButton"], [aria-label*="Play"], [aria-label*="Reproducir"]');
    if (button) { button.click(); }
    return false;
  }
  var attempts = 0;
  var timer = setInterval(function () { if (tryPlay() || ++attempts > 40) { clearInterval(timer); } }, 500);
})(); true;`;

/** Rutas de los documentos embebibles; cualquier otra navegación del frame principal se abre fuera de la app. */
const EMBED_PATH_MARKERS = ['/embed', '/plugins/', '/player/'];

const hostMatches = (hostname: string, allowedHosts: string[]) => {
  const host = hostname.toLowerCase();
  return allowedHosts.some(allowed => host === allowed || host.endsWith(`.${allowed}`));
};

export const computeEmbedHeight = (embed: LinkEmbed, width: number): number => {
  if (embed.fixedHeight) return embed.fixedHeight;
  const natural = width / embed.aspectRatio;
  return embed.maxHeight ? Math.min(natural, embed.maxHeight) : natural;
};

/**
 * Reproductor/widget oficial de la plataforma (TikTok, Instagram, X, Facebook, YouTube) dentro de un WebView,
 * con reproducción automática silenciada cuando la plataforma lo permite.
 */
export const SocialEmbed: React.FC<SocialEmbedProps> = ({ embed, onError, style }) => {
  const [width, setWidth] = useState(0);
  const height = width > 0 ? computeEmbedHeight(embed, width) : 0;

  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));

  const openOutside = (url: string) => {
    Linking.openURL(url).catch(() => undefined);
  };

  return (
    <View style={[styles.container, style, height > 0 ? { height } : null]} onLayout={onLayout}>
      {width > 0 && embed.kind === 'youtube' && embed.videoId ? (
        <YouTubeEmbed videoId={embed.videoId} muted controls onError={onError} />
      ) : width > 0 ? (
        <WebView
          key={embed.embedUrl}
          source={{ uri: embed.embedUrl }}
          style={styles.webview}
          userAgent={BROWSER_UA}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          allowsFullscreenVideo
          scrollEnabled={Boolean(embed.fixedHeight)}
          nestedScrollEnabled={Boolean(embed.fixedHeight)}
          bounces={false}
          setSupportMultipleWindows={false}
          injectedJavaScript={embed.kind === 'instagram' ? INSTAGRAM_AUTOPLAY_JS : undefined}
          onError={() => onError?.()}
          onHttpError={event => {
            if (event.nativeEvent.statusCode >= 400) onError?.();
          }}
          onShouldStartLoadWithRequest={request => {
            if (request.url.startsWith('about:') || request.isTopFrame === false) return true;
            try {
              const parsed = new URL(request.url);
              const isEmbedDocument =
                hostMatches(parsed.hostname, embed.allowedHosts) &&
                EMBED_PATH_MARKERS.some(marker => parsed.pathname.includes(marker));
              if (isEmbedDocument) return true;
            } catch {
              return false;
            }
            // "Ver en TikTok/Instagram/X…" o enlaces de la publicación: app nativa o navegador
            openOutside(request.url);
            return false;
          }}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
});
