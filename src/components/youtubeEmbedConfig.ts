export interface YouTubeEmbedProps {
  videoId: string;
  /** Reproduce sin sonido (necesario para la reproducción automática). */
  muted?: boolean;
  /** Muestra los controles de YouTube. */
  controls?: boolean;
  /** Repite el vídeo al terminar. */
  loop?: boolean;
  /** El vídeo no se puede reproducir (embed deshabilitado, error de red). */
  onError?: () => void;
  /** El vídeo empezó a reproducirse. */
  onPlaying?: () => void;
}

export const youtubeWatchUrl = (videoId: string) => `https://www.youtube.com/watch?v=${videoId}`;
