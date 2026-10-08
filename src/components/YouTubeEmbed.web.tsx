import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { YouTubeEmbedProps } from './youtubeEmbedConfig';

/** Reproductor de YouTube embebido (web) mediante iframe. */
export const YouTubeEmbed: React.FC<YouTubeEmbedProps & { style?: StyleProp<ViewStyle> }> = ({
  videoId,
  muted = false,
  controls = true,
  loop = false,
  onError,
  onPlaying,
  style,
}) => {
  const params = new URLSearchParams({
    autoplay: '1',
    mute: muted ? '1' : '0',
    controls: controls ? '1' : '0',
    playsinline: '1',
    loop: loop ? '1' : '0',
    playlist: videoId,
    rel: '0',
    modestbranding: '1',
    iv_load_policy: '3',
    fs: controls ? '1' : '0',
    disablekb: controls ? '0' : '1',
  });

  return (
    <View style={[styles.container, style]}>
      {React.createElement('iframe', {
        src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`,
        title: 'Trailer',
        allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen',
        allowFullScreen: controls,
        onError,
        // El iframe no expone el estado del reproductor; al cargar se considera listo
        onLoad: onPlaying,
        style: { border: 0, width: '100%', height: '100%', display: 'block' },
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
