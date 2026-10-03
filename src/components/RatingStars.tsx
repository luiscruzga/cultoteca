import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RatingStarsProps {
  rating: number; // 0 to 5 (supports decimals e.g. 3.5, 4.5)
  maxRating?: number;
  size?: number;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  showText?: boolean;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  maxRating = 5,
  size = 16,
  interactive = false,
  onRatingChange,
  showText = false,
}) => {
  const handleStarPress = (target: number) => {
    if (!onRatingChange) return;
    const clamped = Math.max(0.5, Math.min(maxRating, Math.round(target * 2) / 2));
    onRatingChange(clamped);
  };

  const handleStep = (delta: number) => {
    if (!onRatingChange) return;
    const nextVal = Math.max(0.5, Math.min(maxRating, Math.round((rating + delta) * 2) / 2));
    onRatingChange(nextVal);
  };

  const stars = [];

  for (let i = 1; i <= maxRating; i++) {
    const isFilled = rating >= i;
    const isHalf = !isFilled && rating >= i - 0.5;

    if (interactive) {
      stars.push(
        <View key={i} style={[styles.interactiveStarContainer, { width: size + 4, height: size + 6 }]}>
          <Ionicons
            name={isFilled ? 'star' : isHalf ? 'star-half' : 'star-outline'}
            size={size}
            color="#F5A623"
            style={styles.starIconBehind}
          />
          {/* Left half touch area: i - 0.5 */}
          <TouchableOpacity
            style={styles.halfTouchLeft}
            onPress={() => handleStarPress(i - 0.5)}
            activeOpacity={0.6}
            accessibilityLabel={`${i - 0.5} estrellas`}
          />
          {/* Right half touch area: i */}
          <TouchableOpacity
            style={styles.halfTouchRight}
            onPress={() => handleStarPress(i)}
            activeOpacity={0.6}
            accessibilityLabel={`${i} estrellas`}
          />
        </View>
      );
    } else {
      stars.push(
        <Ionicons
          key={i}
          name={isFilled ? 'star' : isHalf ? 'star-half' : 'star-outline'}
          size={size}
          color="#F5A623"
          style={[styles.star, { marginRight: 2 }]}
        />
      );
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.starsRow}>{stars}</View>
      {showText && <Text style={styles.text}>{rating.toFixed(1)}</Text>}
      {interactive && onRatingChange && (
        <View style={styles.stepperContainer}>
          <TouchableOpacity
            style={[styles.stepBtn, rating <= 0.5 && styles.stepBtnDisabled]}
            onPress={() => handleStep(-0.5)}
            disabled={rating <= 0.5}
            activeOpacity={0.7}
          >
            <Ionicons name="remove" size={12} color={rating <= 0.5 ? '#475569' : '#F5A623'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.stepBtn, rating >= maxRating && styles.stepBtnDisabled]}
            onPress={() => handleStep(0.5)}
            disabled={rating >= maxRating}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={12} color={rating >= maxRating ? '#475569' : '#F5A623'} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    marginRight: 2,
  },
  interactiveStarContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 2,
  },
  starIconBehind: {
    position: 'absolute',
  },
  halfTouchLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '50%',
    zIndex: 2,
  },
  halfTouchRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '50%',
    zIndex: 2,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    gap: 4,
  },
  stepBtn: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 6,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBtnDisabled: {
    opacity: 0.4,
  },
  text: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '700',
    color: '#F5A623',
  },
});
