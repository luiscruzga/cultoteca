import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';
import { YouTubeEmbedProps } from './youtubeEmbedConfig';

// YouTube rechaza embeds sin origen/referer válido (errores 152/153), por eso el HTML se sirve con baseUrl.
const EMBED_ORIGIN = 'https://cultoteca.app';

const buildHtml = (videoId: string, muted: boolean, controls: boolean, loop: boolean) => `<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>html,body{margin:0;padding:0;height:100%;background:#000;overflow:hidden}#player{position:absolute;inset:0;width:100%;height:100%}</style>
</head><body><div id="player"></div>
<script>
  var tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);
  function post(type){ window.ReactNativeWebView && window.ReactNativeWebView.postMessage(type); }
  function onYouTubeIframeAPIReady(){
    new YT.Player('player', {
      videoId: ${JSON.stringify(videoId)},
      playerVars: {
        autoplay: 1, mute: ${muted ? 1 : 0}, controls: ${controls ? 1 : 0}, playsinline: 1,
        loop: ${loop ? 1 : 0}, playlist: ${JSON.stringify(videoId)}, rel: 0, modestbranding: 1,
        iv_load_policy: 3, fs: ${controls ? 1 : 0}, disablekb: ${controls ? 0 : 1}, origin: '${EMBED_ORIGIN}'
      },
      events: {
        onReady: function(e){ ${muted ? 'e.target.mute();' : ''} e.target.playVideo(); },
        onStateChange: function(e){ if (e.data === 1) post('playing'); },
        onError: function(){ post('error'); }
      }
    });
  }
</script></body></html>`;

/** Reproductor de YouTube embebido (Android/iOS) mediante WebView. */
export const YouTubeEmbed: React.FC<YouTubeEmbedProps & { style?: StyleProp<ViewStyle> }> = ({
  videoId,
  muted = false,
  controls = true,
  loop = false,
  onError,
  onPlaying,
  style,
}) => {
  const html = useMemo(() => buildHtml(videoId, muted, controls, loop), [videoId, muted, controls, loop]);

  return (
    <WebView
      source={{ html, baseUrl: EMBED_ORIGIN }}
      style={[styles.webview, style]}
      originWhitelist={['*']}
      javaScriptEnabled
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      allowsFullscreenVideo={controls}
      scrollEnabled={false}
      bounces={false}
      onMessage={event => {
        if (event.nativeEvent.data === 'error') onError?.();
        if (event.nativeEvent.data === 'playing') onPlaying?.();
      }}
      onError={() => onError?.()}
      // Solo se bloquea la navegación del documento principal (p. ej. tocar el logo de YouTube);
      // el iframe del reproductor (isTopFrame false en iOS) carga con normalidad.
      onShouldStartLoadWithRequest={request =>
        request.isTopFrame === false ||
        request.url.startsWith(EMBED_ORIGIN) ||
        request.url.startsWith('about:')
      }
    />
  );
};

const styles = StyleSheet.create({
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
});
