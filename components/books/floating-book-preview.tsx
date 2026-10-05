import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Doc } from '@/convex/_generated/dataModel';

const { width: SW } = Dimensions.get('window');
const COVER_W = Math.round(SW * 0.38);
const COVER_H = Math.round(COVER_W * (7 / 5));

const C = {
  glass:  'rgba(16, 18, 26, 0.90)',
  glassB: 'rgba(255,255,255,0.09)',
  ink:    '#ECE6DB',
  ink2:   '#C9C2B4',
  muted:  '#6B6760',
  copper: '#D88A5E',
  rose:   '#E07A8A',
} as const;

const numFmt = new Intl.NumberFormat('ja-JP');

/* ── Rating stars ── */
function Stars({ rating }: { rating?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 3, marginTop: 3 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <Ionicons
          key={i}
          name={i < (rating ?? 0) ? 'star' : 'star-outline'}
          size={13}
          color={i < (rating ?? 0) ? C.copper : C.muted}
        />
      ))}
    </View>
  );
}

/* ── Staggered glass card ── */
type CardProps = {
  progress: SharedValue<number>;
  index: number;
  full?: boolean;
  children: React.ReactNode;
};

function GlassCard({ progress, index, full, children }: CardProps) {
  const style = useAnimatedStyle(() => {
    const start = index * 0.09;
    const end   = Math.min(start + 0.44, 1);
    const p     = interpolate(progress.value, [start, end], [0, 1], 'clamp');
    return {
      opacity:   p,
      transform: [{ translateY: interpolate(p, [0, 1], [20, 0]) }],
    };
  });
  return (
    <Animated.View style={[s.glassCard, full === true && s.glassCardFull, style]}>
      {children}
    </Animated.View>
  );
}

/* ── Props ── */
export type FloatingBookPreviewProps = {
  visible: boolean;
  book:    Doc<'books'> | null;
  onClose: () => void;
};

/* ── Component ── */
export function FloatingBookPreview({ visible, book, onClose }: FloatingBookPreviewProps) {
  const [show, setShow] = useState(false);
  const progress = useSharedValue(0);
  const dragY    = useSharedValue(0);

  const doClose = useCallback(() => {
    progress.value = withTiming(0, { duration: 220 }, (done) => {
      if (done) {
        runOnJS(setShow)(false);
        runOnJS(onClose)();
      }
    });
    dragY.value = withTiming(0, { duration: 220 });
  }, [onClose, progress, dragY]);

  useEffect(() => {
    if (visible && book) {
      setShow(true);
      progress.value = 0;
      dragY.value    = 0;
      const t = setTimeout(() => {
        progress.value = withSpring(1, { damping: 24, stiffness: 200 });
      }, 20);
      return () => clearTimeout(t);
    }
  }, [visible, book]);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) dragY.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationY > 90 || e.velocityY > 600) {
        runOnJS(doClose)();
      } else {
        dragY.value = withSpring(0, { damping: 20 });
      }
    });

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], 'clamp'),
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.4, 1], [0, 0.9, 1], 'clamp'),
    transform: [
      { scale:      interpolate(progress.value, [0, 1], [0.86, 1], 'clamp') },
      { translateY: dragY.value },
    ],
  }));

  if (!show || !book) return null;

  const dateLabel = book.purchasedAt
    ? new Date(book.purchasedAt).toLocaleDateString('ja-JP', {
        year: 'numeric', month: 'short', day: 'numeric',
      })
    : '—';

  return (
    <Modal transparent visible={show} statusBarTranslucent animationType="none">
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[StyleSheet.absoluteFill, overlayStyle]}>

            {/* Background blur + dim */}
            <BlurView style={StyleSheet.absoluteFill} intensity={28} tint="dark" />
            <View style={[StyleSheet.absoluteFill, s.dimOverlay]} />

            {/* Tap outside → close */}
            <Pressable style={StyleSheet.absoluteFill} onPress={doClose} />

            {/* Floating content */}
            <Animated.View
              style={[s.content, contentStyle]}
              onStartShouldSetResponder={() => true}
            >
              {/* Amber glow */}
              <View style={s.glow} pointerEvents="none" />

              {/* Cover */}
              <View style={s.coverShadowWrap}>
                {book.coverUrl ? (
                  <Image source={{ uri: book.coverUrl }} style={s.cover} contentFit="cover" />
                ) : (
                  <View style={[s.cover, s.coverBlank]}>
                    <Ionicons name="book-outline" size={40} color={C.muted} />
                  </View>
                )}
              </View>

              {/* Title + author */}
              <Text style={s.title} numberOfLines={2}>{book.title}</Text>
              {book.author ? (
                <Text style={s.author} numberOfLines={1}>{book.author}</Text>
              ) : null}

              {/* Info cards */}
              <View style={s.cardGrid}>
                <GlassCard progress={progress} index={0}>
                  <View style={s.cardIconRow}>
                    <Ionicons name="pricetag-outline" size={12} color={C.copper} />
                    <Text style={s.cardLabel}>価格</Text>
                  </View>
                  <Text style={s.cardValue}>
                    {book.price != null ? `¥${numFmt.format(book.price)}` : '—'}
                  </Text>
                </GlassCard>

                <GlassCard progress={progress} index={1}>
                  <View style={s.cardIconRow}>
                    <Ionicons name="calendar-outline" size={12} color={C.copper} />
                    <Text style={s.cardLabel}>登録日</Text>
                  </View>
                  <Text style={s.cardValue}>{dateLabel}</Text>
                </GlassCard>

                <GlassCard progress={progress} index={2}>
                  <View style={s.cardIconRow}>
                    <Ionicons name="star-outline" size={12} color={C.copper} />
                    <Text style={s.cardLabel}>評価</Text>
                  </View>
                  <Stars rating={book.rating} />
                </GlassCard>

                <GlassCard progress={progress} index={3}>
                  <View style={s.cardIconRow}>
                    <Ionicons
                      name={book.isFavorite ? 'heart' : 'heart-outline'}
                      size={12}
                      color={book.isFavorite ? C.rose : C.muted}
                    />
                    <Text style={s.cardLabel}>お気に入り</Text>
                  </View>
                  <Text style={[s.cardValue, { color: book.isFavorite ? C.rose : C.muted }]}>
                    {book.isFavorite ? 'ON' : 'OFF'}
                  </Text>
                </GlassCard>

                {book.memo ? (
                  <GlassCard progress={progress} index={4} full>
                    <View style={s.cardIconRow}>
                      <Ionicons name="document-text-outline" size={12} color={C.copper} />
                      <Text style={s.cardLabel}>メモ</Text>
                    </View>
                    <Text style={s.cardMemo} numberOfLines={3}>{book.memo}</Text>
                  </GlassCard>
                ) : null}
              </View>

              {/* Swipe hint bar */}
              <View style={s.swipeHint} pointerEvents="none">
                <View style={s.swipeBar} />
              </View>
            </Animated.View>

          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

/* ── Styles ── */
const s = StyleSheet.create({
  dimOverlay: {
    backgroundColor: 'rgba(4,5,10,0.68)',
  },
  content: {
    position: 'absolute',
    left: 24, right: 24,
    top: '10%',
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    top: -20,
    width:  COVER_W + 100,
    height: COVER_H + 100,
    borderRadius: 30,
    backgroundColor: 'rgba(216,138,94,0.07)',
    boxShadow: '0 0 80px 40px rgba(216,138,94,0.10)',
  },
  coverShadowWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 18,
    boxShadow: '0 20px 60px rgba(0,0,0,0.90), 0 0 0 1px rgba(255,255,255,0.07)',
  },
  cover: {
    width:  COVER_W,
    height: COVER_H,
  },
  coverBlank: {
    backgroundColor: '#1C1F2A',
    alignItems: 'center', justifyContent: 'center',
  },
  title: {
    fontSize: 17, fontWeight: '600', color: C.ink,
    textAlign: 'center', lineHeight: 25,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  author: {
    fontSize: 12, color: C.muted,
    textAlign: 'center',
    marginBottom: 20,
  },
  cardGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 8,
    width: '100%',
  },
  glassCard: {
    width: '47.5%',
    backgroundColor: C.glass,
    borderWidth: 1, borderColor: C.glassB,
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  glassCardFull: { width: '100%' },
  cardIconRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
  },
  cardLabel: {
    fontSize: 10, color: C.muted, fontWeight: '500', letterSpacing: 0.4,
  },
  cardValue: {
    fontSize: 14, fontWeight: '600', color: C.ink,
    fontVariant: ['tabular-nums'],
  },
  cardMemo: {
    fontSize: 12, color: C.ink2, lineHeight: 19,
  },
  swipeHint: {
    alignItems: 'center',
    paddingTop: 20, paddingBottom: 8,
  },
  swipeBar: {
    width: 36, height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
});
