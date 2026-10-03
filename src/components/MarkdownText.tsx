import React from 'react';
import {
  Linking,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
} from 'react-native';

interface MarkdownTextProps {
  content: string;
  style?: StyleProp<TextStyle>;
  onLinkPress?: (url: string) => void;
}

interface InlineToken {
  type: 'text' | 'bold' | 'italic' | 'link';
  text: string;
  url?: string;
}

/**
 * Tokeniza texto plano para detectar negritas (**texto** o __texto__),
 * cursivas (*texto* o _texto_) y enlaces markdown ([etiqueta](url)).
 */
const parseInline = (text: string): InlineToken[] => {
  // Coincide con [label](url), **bold**, __bold__, *italic*
  const pattern = /(\[[^\]]+\]\([^\s)]+\)|\*\*[^*]+\*\*|__[^_]+__|(?<!\*)\*[^*]+\*(?!\*))/g;
  const tokens: InlineToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        type: 'text',
        text: text.slice(lastIndex, match.index),
      });
    }

    const matchedStr = match[0];

    if (matchedStr.startsWith('[') && matchedStr.includes('](')) {
      const linkMatch = matchedStr.match(/^\[(.*)\]\((.*)\)$/);
      if (linkMatch) {
        tokens.push({
          type: 'link',
          text: linkMatch[1].replace(/^\*\*|\*\*$/g, ''), // limpia negritas internas si las hubiera
          url: linkMatch[2],
        });
      } else {
        tokens.push({ type: 'text', text: matchedStr });
      }
    } else if (
      (matchedStr.startsWith('**') && matchedStr.endsWith('**')) ||
      (matchedStr.startsWith('__') && matchedStr.endsWith('__'))
    ) {
      tokens.push({
        type: 'bold',
        text: matchedStr.slice(2, -2),
      });
    } else if (matchedStr.startsWith('*') && matchedStr.endsWith('*')) {
      tokens.push({
        type: 'italic',
        text: matchedStr.slice(1, -1),
      });
    } else {
      tokens.push({ type: 'text', text: matchedStr });
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push({
      type: 'text',
      text: text.slice(lastIndex),
    });
  }

  return tokens;
};

export const MarkdownText: React.FC<MarkdownTextProps> = ({
  content,
  style,
  onLinkPress,
}) => {
  if (!content) return null;

  const handleOpenUrl = (rawUrl: string) => {
    let cleanUrl = rawUrl.trim();
    if (!/^https?:\/\//i.test(cleanUrl) && !/^mailto:/i.test(cleanUrl)) {
      cleanUrl = `https://${cleanUrl}`;
    }

    if (onLinkPress) {
      onLinkPress(cleanUrl);
      return;
    }

    Linking.openURL(cleanUrl).catch(err => {
      console.warn('No se pudo abrir el enlace:', err);
    });
  };

  const renderInlineTokens = (tokens: InlineToken[], baseKey: string) => {
    return tokens.map((token, index) => {
      const key = `${baseKey}-${index}`;

      if (token.type === 'bold') {
        return (
          <Text key={key} style={styles.boldText}>
            {token.text}
          </Text>
        );
      }

      if (token.type === 'italic') {
        return (
          <Text key={key} style={styles.italicText}>
            {token.text}
          </Text>
        );
      }

      if (token.type === 'link' && token.url) {
        return (
          <Text
            key={key}
            style={styles.linkText}
            onPress={() => handleOpenUrl(token.url!)}
            accessibilityRole="link"
          >
            {token.text}
          </Text>
        );
      }

      return (
        <Text key={key} style={style || styles.defaultText}>
          {token.text}
        </Text>
      );
    });
  };

  // Dividir en líneas respetando saltos
  const rawLines = content.split(/\r?\n/);
  const elements: React.ReactNode[] = [];
  let isPreviousLineEmpty = false;

  rawLines.forEach((line, lineIdx) => {
    const trimmed = line.trim();

    // Líneas vacías -> separación entre párrafos
    if (!trimmed) {
      if (!isPreviousLineEmpty) {
        elements.push(<View key={`empty-${lineIdx}`} style={styles.paragraphSpacer} />);
        isPreviousLineEmpty = true;
      }
      return;
    }

    isPreviousLineEmpty = false;

    // Regla horizontal (--- o ***)
    if (/^([-*_]){3,}$/.test(trimmed)) {
      elements.push(<View key={`hr-${lineIdx}`} style={styles.horizontalRule} />);
      return;
    }

    // Encabezados (# Titulo)
    const headerMatch = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const headerText = headerMatch[2];
      const inlineTokens = parseInline(headerText);

      elements.push(
        <Text
          key={`h-${lineIdx}`}
          style={[
            styles.headerText,
            level === 1 ? styles.h1 : level === 2 ? styles.h2 : styles.h3,
          ]}
        >
          {renderInlineTokens(inlineTokens, `h-${lineIdx}`)}
        </Text>
      );
      return;
    }

    // Elementos de lista (- item, * item, 1. item)
    const listMatch = line.match(/^(\s*)([-*•]|\d+\.)\s+(.*)$/);
    if (listMatch) {
      const indentSpaces = listMatch[1].length;
      const bulletChar = listMatch[2];
      const itemContent = listMatch[3];
      const indentLevel = Math.min(Math.floor(indentSpaces / 2), 3);
      const isNumbered = /^\d+\.$/.test(bulletChar);

      const inlineTokens = parseInline(itemContent);

      elements.push(
        <View
          key={`li-${lineIdx}`}
          style={[
            styles.listItemRow,
            { paddingLeft: indentLevel * 14 },
          ]}
        >
          <Text style={[styles.bulletPoint, isNumbered && styles.numberedBullet]}>
            {isNumbered ? bulletChar : '•'}
          </Text>
          <Text style={[style || styles.defaultText, styles.listItemText]}>
            {renderInlineTokens(inlineTokens, `li-${lineIdx}`)}
          </Text>
        </View>
      );
      return;
    }

    // Párrafo normal o línea de texto
    const inlineTokens = parseInline(trimmed);
    const isFullLineBold =
      inlineTokens.length === 1 && inlineTokens[0].type === 'bold';

    elements.push(
      <Text
        key={`p-${lineIdx}`}
        style={[
          style || styles.defaultText,
          styles.paragraph,
          isFullLineBold && styles.subheadingBlock,
        ]}
      >
        {renderInlineTokens(inlineTokens, `p-${lineIdx}`)}
      </Text>
    );
  });

  return <View style={styles.container}>{elements}</View>;
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  defaultText: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 22,
  },
  paragraph: {
    marginBottom: 3,
  },
  paragraphSpacer: {
    height: 8,
  },
  subheadingBlock: {
    marginTop: 8,
    marginBottom: 4,
  },
  horizontalRule: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 12,
    width: '100%',
  },
  headerText: {
    color: '#F8FAFC',
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 6,
  },
  h1: {
    fontSize: 18,
    lineHeight: 24,
  },
  h2: {
    fontSize: 16,
    lineHeight: 22,
  },
  h3: {
    fontSize: 15,
    lineHeight: 20,
  },
  boldText: {
    fontWeight: '700',
    color: '#F1F5F9',
  },
  italicText: {
    fontStyle: 'italic',
    color: '#CBD5E1',
  },
  linkText: {
    color: '#38BDF8',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 2,
  },
  bulletPoint: {
    width: 14,
    fontSize: 14,
    lineHeight: 22,
    color: '#38BDF8',
    fontWeight: 'bold',
  },
  numberedBullet: {
    width: 20,
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
  listItemText: {
    flex: 1,
    lineHeight: 22,
  },
});
