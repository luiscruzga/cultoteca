import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { LinkEmbed } from '../utils/linkEmbeds';
import { YouTubeEmbed } from './YouTubeEmbed';
import type { SocialEmbedProps } from './SocialEmbed';

export type { SocialEmbedProps };

export const computeEmbedHeight = (embed: LinkEmbed, width: number): number => {
  if (embed.fixedHeight) return embed.fixedHeight;
  const natural = width / embed.aspectRatio;
  return embed.maxHeight ? Math.min(natural, embed.maxHeight) : natural;
};

/** Reproductor/widget oficial de la plataforma embebido con iframe (web). */
export const SocialEmbed: React.FC<SocialEmbedProps> = ({ embed, onError, style }) => {
  const [width, setWidth] = useState(0);
  const height = width > 0 ? computeEmbedHeight(embed, width) : 0;
  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));

  return (
    <View style={[styles.container, style, height > 0 ? { height } : null]} onLayout={onLayout}>
      {width > 0 && embed.kind === 'youtube' && embed.videoId ? (
        <YouTubeEmbed videoId={embed.videoId} muted controls onError={onError} />
      ) : width > 0
        ? React.createElement('iframe', {
            src: embed.embedUrl,
            title: 'Publicación embebida',
            allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen; clipboard-write',
            allowFullScreen: true,
            scrolling: embed.fixedHeight ? 'yes' : 'no',
            onError,
            style: { border: 0, width: '100%', height: '100%', display: 'block', background: '#000' },
          })
        : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
});
