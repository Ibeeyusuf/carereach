import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

type SkeletonProps = {
  height: number;
  width?: number | `${number}%`;
  borderRadius?: number;
};

export function FacebookSkeleton({ height, width = '100%', borderRadius = 10 }: SkeletonProps) {
  const translate = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(translate, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [translate]);

  const shimmerTransform = useMemo(
    () => ({
      transform: [
        {
          translateX: translate.interpolate({
            inputRange: [-1, 1],
            outputRange: [-220, 220],
          }),
        },
      ],
    }),
    [translate],
  );

  return (
    <View style={[styles.block, { height, width, borderRadius }]}>
      <Animated.View style={[styles.shimmer, shimmerTransform]} />
    </View>
  );
}

export function FacebookCardSkeleton() {
  return (
    <View style={styles.card}>
      <FacebookSkeleton height={14} width="48%" />
      <View style={{ height: 8 }} />
      <FacebookSkeleton height={12} width="36%" />
      <View style={{ height: 10 }} />
      <FacebookSkeleton height={12} width="72%" />
      <View style={{ height: 6 }} />
      <FacebookSkeleton height={12} width="58%" />
    </View>
  );
}

export function FacebookSavingOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <View pointerEvents="none" style={styles.overlayRoot}>
      <View style={styles.topBarTrack}>
        <View style={styles.topBarFillWrap}>
          <FacebookSkeleton height={3} width="100%" borderRadius={2} />
        </View>
      </View>
      <View style={styles.toast}>
        <FacebookSkeleton height={12} width="62%" />
        <View style={{ height: 10 }} />
        <FacebookSkeleton height={10} width="100%" />
        <View style={{ height: 7 }} />
        <FacebookSkeleton height={10} width="84%" />
        <View style={{ height: 7 }} />
        <FacebookSkeleton height={10} width="68%" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '45%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    borderRadius: 14,
    padding: 14,
  },
  overlayRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
  },
  topBarTrack: {
    height: 3,
    backgroundColor: 'rgba(251,146,60,0.25)',
  },
  topBarFillWrap: {
    width: '42%',
    height: 3,
  },
  toast: {
    position: 'absolute',
    top: 14,
    right: 12,
    width: 180,
    borderWidth: 1,
    borderColor: '#fed7aa',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 10,
  },
});

