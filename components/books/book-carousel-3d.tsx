import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Doc } from '@/convex/_generated/dataModel';

const { width: SW, height: SH } = Dimensions.get('window');

/* ── 3D geometry constants ── */
const CARD_W    = Math.round(SW * 0.28);
const CARD_H    = Math.round(CARD_W * (7 / 5));
const RADIUS    = Math.round(SW * 0.52);
const PERSP     = 900;
const CAROUSEL_H = Math.round(CARD_H * 1.35);

/* Fixed vertical positions — carousel and InfoPanel are independently absolute,
   so InfoPanel height changes never shift the carousel.                        */
const CAROUSEL_TOP = Math.max(Math.round(SH * 0.20), 100);
const INFO_TOP     = CAROUSEL_TOP + CAROUSEL_H + 46; // carousel + hint row + gap

const C = {
  bg:      'rgba(6, 7, 12, 0.96)',
  glass:   'rgba(18, 20, 30, 0.88)',
  glassB:  'rgba(255,255,255,0.10)',
  ink:     '#ECE6DB',
  ink2:    '#C9C2B4',
  muted:   '#6B6760',
  copper:  '#D88A5E',
  rose:    '#E07A8A',
  green:   '#6FBF8F',
  blue:    '#7BA7BC',
} as const;

const STATUS_LABEL: Record<string, string> = {
  unread:  '積読',
  reading: '読書中',
  done:    '読了',
  gave_up: '諦めた',
  on_hold: '中断中',
};
const STATUS_COLOR: Record<string, string> = {
  unread:  C.rose,
  reading: C.copper,
  done:    C.green,
  gave_up: '#888',
  on_hold: C.blue,
};

const numFmt = new Intl.NumberFormat('ja-JP');

/* ── Stars ── */
function Stars({ rating }: { rating?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <Ionicons
          key={i}
          name={i < (rating ?? 0) ? 'star' : 'star-outline'}
          size={12}
          color={i < (rating ?? 0) ? C.copper : C.muted}
        />
      ))}
    </View>
  );
}

/* ── Single carousel card ──
   rotateY は使わず translateX + scale だけで 3D 感を出す。
   重なり順は JSX の render order (奥→手前) で制御する。       */
type CardProps = {
  book:     Doc<'books'>;
  index:    number;
  total:    number;
  rotation: SharedValue<number>;   // continuous radians
  onPress:  (index: number) => void;
};

const CarouselCard = React.memo(function CarouselCard({
  book, index, total, rotation, onPress,
}: CardProps) {
  const style = useAnimatedStyle(() => {
    const step  = (Math.PI * 2) / total;
    const raw   = step * index + rotation.value;
    // normalize to [-π, π]
    const angle = ((raw % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI;

    const sinA = Math.sin(angle);
    const cosA = Math.cos(angle);           // 1 = front, -1 = back

    const z     = RADIUS * cosA;
    const x     = RADIUS * sinA;
    const scale = PERSP / (PERSP - z);

    // front half only: back half fades out completely
    const opacity = interpolate(cosA, [-1, -0.15, 0.35, 1], [0, 0, 0.55, 1], 'clamp');

    // z-ordering handled entirely on the UI thread — no JS re-render needed
    const zIndex = Math.round(interpolate(cosA, [-1, 1], [0, total * 2], 'clamp'));

    return {
      transform: [
        { translateX: x },
        { scale },
      ],
      opacity,
      zIndex,
    };
  });

  return (
    <Animated.View style={[s.cardWrap, style]}>
      <Pressable onPress={() => onPress(index)} style={s.card}>
        {book.coverUrl ? (
          <Image source={{ uri: book.coverUrl }} style={s.cardCover} contentFit="cover" transition={0} />
        ) : (
          <View style={[s.cardCover, s.cardBlank]}>
            <Ionicons name="book-outline" size={28} color={C.muted} />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
});

/* ── Info panel ── */
function InfoPanel({ book }: { book: Doc<'books'> }) {
  const anim = useSharedValue(0);
  useEffect(() => {
    anim.value = 0;
    anim.value = withTiming(1, { duration: 280 });
  }, [book._id, anim]);

  const style = useAnimatedStyle(() => ({
    opacity:   anim.value,
    transform: [{ translateY: interpolate(anim.value, [0, 1], [14, 0]) }],
  }));

  const dateLabel = book.purchasedAt
    ? new Date(book.purchasedAt).toLocaleDateString('ja-JP', {
        year: 'numeric', month: 'short', day: 'numeric',
      })
    : null;

  return (
    <Animated.View style={[s.info, style]}>
      <Text style={s.infoTitle} numberOfLines={2}>{book.title}</Text>
      {book.author ? (
        <Text style={s.infoAuthor} numberOfLines={1}>{book.author}</Text>
      ) : null}
      <View style={s.infoRow}>
        <View style={[s.statusBadge, { backgroundColor: STATUS_COLOR[book.status] + '33' }]}>
          <Text style={[s.statusText, { color: STATUS_COLOR[book.status] }]}>
            {STATUS_LABEL[book.status]}
          </Text>
        </View>
        {book.price != null ? (
          <Text style={s.infoPrice}>¥{numFmt.format(book.price)}</Text>
        ) : null}
        {book.rating ? <Stars rating={book.rating} /> : null}
      </View>
      {book.memo ? (
        <Text style={s.infoMemo} numberOfLines={3}>{book.memo}</Text>
      ) : null}
      <View style={s.infoMeta}>
        {book.isFavorite ? (
          <View style={s.metaChip}>
            <Ionicons name="heart" size={11} color={C.rose} />
            <Text style={[s.metaChipText, { color: C.rose }]}>お気に入り</Text>
          </View>
        ) : null}
        {book.wantToReread ? (
          <View style={s.metaChip}>
            <Ionicons name="refresh" size={11} color={C.blue} />
            <Text style={[s.metaChipText, { color: C.blue }]}>再読したい</Text>
          </View>
        ) : null}
        {dateLabel ? (
          <View style={s.metaChip}>
            <Ionicons name="calendar-outline" size={11} color={C.muted} />
            <Text style={s.metaChipText}>{dateLabel}</Text>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

/* ── Props ── */
export type BookCarousel3DProps = {
  visible:      boolean;
  books:        Doc<'books'>[];
  initialBook?: Doc<'books'> | null;
  onClose:      () => void;
};

/* ── Main component ── */
export function BookCarousel3D({ visible, books, initialBook, onClose }: BookCarousel3DProps) {
  const [show,         setShow]         = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const progress = useSharedValue(0);
  const rotation = useSharedValue(0);
  const prevSnap = useRef(0);

  const N = books.length;

  const snapForIndex = useCallback((idx: number) => {
    if (N === 0) return 0;
    return -((Math.PI * 2) / N) * idx;
  }, [N]);

  const doClose = useCallback(() => {
    progress.value = withTiming(0, { duration: 220 }, (done) => {
      if (done) {
        runOnJS(setShow)(false);
        runOnJS(onClose)();
      }
    });
  }, [onClose, progress]);

  /* Open */
  useEffect(() => {
    if (visible && N > 0) {
      const startIdx = initialBook
        ? Math.max(books.findIndex((b) => b._id === initialBook._id), 0)
        : 0;
      rotation.value = snapForIndex(startIdx);
      setFocusedIndex(startIdx);
      prevSnap.current = startIdx;
      setShow(true);
      progress.value = 0;
      const t = setTimeout(() => {
        progress.value = withSpring(1, { damping: 22, stiffness: 180 });
      }, 20);
      return () => clearTimeout(t);
    }
  }, [visible, books, initialBook]);

  /* Update focusedIndex + haptic when snap changes (UI thread → JS) */
  const updateFocused = useCallback((idx: number) => {
    setFocusedIndex(idx);
    if (idx !== prevSnap.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      prevSnap.current = idx;
    }
  }, []);

  useAnimatedReaction(
    () => {
      if (N === 0) return 0;
      const step = (Math.PI * 2) / N;
      const raw  = -rotation.value / step;
      return ((Math.round(raw) % N) + N) % N;
    },
    (current, previous) => {
      if (current !== previous) {
        runOnJS(updateFocused)(current);
      }
    },
  );


  /* Pan gesture — horizontal-only activation prevents vertical jitter */
  const dragBase = useSharedValue(0);
  const panGesture = Gesture.Pan()
    .activeOffsetX([-6, 6])
    .failOffsetY([-18, 18])
    .onBegin(() => {
      dragBase.value = rotation.value;
    })
    .onUpdate((e) => {
      rotation.value = dragBase.value + (e.translationX / SW) * Math.PI * 1.8;
    })
    .onEnd((e) => {
      if (N === 0) return;
      const step = (Math.PI * 2) / N;
      // Snap to nearest item; velocity nudges by at most ±1 to prevent multi-skip
      const currentIdx = Math.round(-rotation.value / step);
      let targetIdx = currentIdx;
      if (e.velocityX < -400) targetIdx = currentIdx + 1;
      else if (e.velocityX > 400) targetIdx = currentIdx - 1;
      rotation.value = withSpring(-targetIdx * step, { damping: 32, stiffness: 200 });
    });

  /* Card press → snap */
  const handleCardPress = useCallback((idx: number) => {
    const snapped = snapForIndex(idx);
    rotation.value = withSpring(snapped, { damping: 32, stiffness: 200 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [snapForIndex, rotation]);

  /* Overlay + stage animation */
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], 'clamp'),
  }));
  const stageStyle = useAnimatedStyle(() => ({
    opacity:   interpolate(progress.value, [0, 0.4, 1], [0, 0.8, 1], 'clamp'),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.82, 1], 'clamp') }],
  }));

  if (!show || N === 0) return null;

  const focused = books[focusedIndex] ?? books[0];

  return (
    <Modal transparent visible={show} statusBarTranslucent animationType="none">
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[StyleSheet.absoluteFill, overlayStyle]}>
          {/* Backdrop */}
          <BlurView style={StyleSheet.absoluteFill} intensity={32} tint="dark" />
          <View style={[StyleSheet.absoluteFill, s.dim]} />

          {/* Tap outside to close */}
          <Pressable style={StyleSheet.absoluteFill} onPress={doClose} />

          {/* ── Stage (scale-in animation wrapper) ── */}
          <Animated.View style={[StyleSheet.absoluteFill, stageStyle]} pointerEvents="box-none">

            {/* Close — fixed top-right */}
            <Pressable style={s.closeBtn} onPress={doClose} aria-label="閉じる">
              <Ionicons name="close" size={20} color={C.ink2} />
            </Pressable>

            {/* Gesture area: covers carousel + info panel so both areas are swipeable */}
            <GestureDetector gesture={panGesture}>
              <View style={StyleSheet.absoluteFill} pointerEvents="box-none">

                {/* 3D carousel — fixed position */}
                <View style={s.carouselWrap}>
                  <View style={s.carousel} pointerEvents="box-none">
                    {books.map((book, i) => (
                      <CarouselCard
                        key={book._id}
                        book={book}
                        index={i}
                        total={N}
                        rotation={rotation}
                        onPress={handleCardPress}
                      />
                    ))}
                  </View>
                  <View style={s.hintRow} pointerEvents="none">
                    <Ionicons name="chevron-back" size={13} color={C.muted} />
                    <Text style={s.hintText}>スワイプして切り替え</Text>
                    <Ionicons name="chevron-forward" size={13} color={C.muted} />
                  </View>
                </View>

                {/* Info panel — fixed position */}
                <View style={s.infoWrap}>
                  <InfoPanel book={focused} key={focused._id} />
                </View>

              </View>
            </GestureDetector>

          </Animated.View>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

/* ── Styles ── */
const s = StyleSheet.create({
  dim: {
    backgroundColor: 'rgba(4,5,12,0.72)',
  },
  closeBtn: {
    position: 'absolute',
    top: 56,
    right: 24,
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  /* carousel and InfoPanel are independently absolute → no mutual layout shifts */
  carouselWrap: {
    position: 'absolute',
    left: 0, right: 0,
    top: CAROUSEL_TOP,
    alignItems: 'center',
  },
  infoWrap: {
    position: 'absolute',
    left: 24, right: 24,
    top: INFO_TOP,
  },
  carousel: {
    width: SW,
    height: CAROUSEL_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrap: {
    position: 'absolute',
    width: CARD_W,
    height: CARD_H,
    /* vertically center the card so scale grows symmetrically (no up/down drift) */
    top: Math.round(CARD_H * 0.175),
  },
  card: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0 12px 40px rgba(0,0,0,0.80), 0 0 0 1px rgba(255,255,255,0.07)',
  },
  cardCover: {
    width: '100%',
    height: '100%',
  },
  cardBlank: {
    backgroundColor: '#1C1F2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 14,
    marginBottom: 10,
  },
  hintText: {
    fontSize: 11,
    color: C.muted,
    letterSpacing: 0.3,
  },

  /* Info panel */
  info: {
    width: SW - 48,
    backgroundColor: 'rgba(14,16,24,0.90)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    borderRadius: 18,
    padding: 18,
    gap: 10,
  },
  infoTitle: {
    fontSize: 17, fontWeight: '600', color: C.ink, lineHeight: 24,
  },
  infoAuthor: {
    fontSize: 12, color: C.muted,
  },
  infoRow: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10,
  },
  statusBadge: {
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999,
  },
  statusText: {
    fontSize: 11, fontWeight: '600',
  },
  infoPrice: {
    fontSize: 14, fontWeight: '600', color: C.copper,
    fontVariant: ['tabular-nums'],
  },
  infoMemo: {
    fontSize: 12, color: C.ink2, lineHeight: 19,
  },
  infoMeta: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  },
  metaChipText: {
    fontSize: 10, color: C.muted, fontWeight: '500',
  },
});
