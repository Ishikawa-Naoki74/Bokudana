import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

/* ── Exported types ── */
export type SortKey = 'newest' | 'oldest' | 'price_desc' | 'price_asc';
export type FilterStatus = 'all' | 'unread' | 'reading' | 'done' | 'gave_up' | 'on_hold' | 'favorite' | 'want_to_reread';

export type BookCounts = Record<FilterStatus, number>;

type Props = {
  sortKey:        SortKey;
  onSortChange:   (key: SortKey) => void;
  filter:         FilterStatus;
  onFilterChange: (status: FilterStatus) => void;
  bookCounts:     BookCounts;
};

/* ── Design tokens ── */
const COPPER     = '#D88A5E';
const COPPER_DIM = 'rgba(216,138,94,0.12)';
const COPPER_MID = 'rgba(216,138,94,0.25)';
const SHEET      = '#0C0D12';
const CARD       = '#131520';
const CARD_ACT   = '#1A1D2A';
const LINE       = 'rgba(255,255,255,0.07)';
const INK        = '#ECE6DB';
const INK2       = '#C9C2B4';
const MUTED      = '#6B6760';

/* ── Filter config ── */
const FILTER_OPTIONS: {
  key:   FilterStatus;
  label: string;
  icon:  keyof typeof Ionicons.glyphMap;
  color: string;
}[] = [
  { key: 'all',            label: 'すべて',          icon: 'layers-outline',        color: MUTED     },
  { key: 'unread',         label: '積読',             icon: 'bookmark-outline',      color: '#E07A8A' },
  { key: 'reading',        label: '読書中',           icon: 'book-outline',          color: '#D88A5E' },
  { key: 'done',           label: '読了',             icon: 'checkmark-circle-outline', color: '#6BAF82' },
  { key: 'gave_up',        label: '諦めた',           icon: 'close-circle-outline',  color: '#888888' },
  { key: 'on_hold',        label: '中断中',           icon: 'pause-circle-outline',  color: '#7BA7BC' },
  { key: 'favorite',       label: 'お気に入り',       icon: 'heart-outline',         color: '#E07A8A' },
  { key: 'want_to_reread', label: 'もう一度',         icon: 'refresh-outline',       color: '#6BAF82' },
];

/* ── Sort config ── */
const SORT_OPTIONS: {
  key:   SortKey;
  icon:  keyof typeof Ionicons.glyphMap;
  label: string;
  desc:  string;
  color: string;
}[] = [
  { key: 'newest',     icon: 'time-outline',           label: '追加が新しい順',  desc: '最近追加した本から',  color: '#5BB8C4' },
  { key: 'oldest',     icon: 'hourglass-outline',      label: '追加が古い順',   desc: '最初に出会った本から', color: '#D88A5E' },
  { key: 'price_desc', icon: 'trending-up-outline',    label: '価格が高い順',   desc: '高価な本から',        color: '#E07A8A' },
  { key: 'price_asc',  icon: 'trending-down-outline',  label: '価格が安い順',   desc: '手頃な本から',        color: '#6BAF82' },
];

/* ── Component ── */
export function ShelfControls({
  sortKey,
  onSortChange,
  filter,
  onFilterChange,
  bookCounts,
}: Props) {
  const [visible, setVisible] = useState(false);

  const sheetY          = useSharedValue(700);
  const backdropOpacity = useSharedValue(0);

  const show = () => {
    setVisible(true);
    sheetY.value          = withSpring(0, { damping: 22, stiffness: 200, mass: 0.9 });
    backdropOpacity.value = withTiming(1, { duration: 200 });
  };

  const hide = () => {
    sheetY.value          = withSpring(700, { damping: 22, stiffness: 200 });
    backdropOpacity.value = withTiming(0, { duration: 180 });
    setTimeout(() => setVisible(false), 280);
  };

  const sheetStyle    = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const isFiltered = filter !== 'all';
  const isSorted   = sortKey !== 'newest';
  const hasActive  = isFiltered || isSorted;

  return (
    <>
      {/* ── Floating button ── */}
      <Pressable
        style={[s.fab, hasActive && s.fabActive]}
        onPress={show}
        aria-label="フィルター・並び替え"
      >
        <Ionicons name="options-outline" size={20} color={hasActive ? COPPER : INK2} />
        {hasActive ? <View style={s.fabDot} /> : null}
      </Pressable>

      {/* ── Bottom sheet ── */}
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={hide}
        statusBarTranslucent
      >
        <View style={s.modalRoot}>
          {/* Backdrop */}
          <Animated.View style={[s.backdrop, backdropStyle]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={hide} />
          </Animated.View>

          {/* Sheet */}
          <Animated.View style={[s.sheet, sheetStyle]}>
            {/* Handle */}
            <View style={s.handleWrap}>
              <View style={s.handle} />
            </View>

            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={s.scrollContent}
            >
              {/* Header */}
              <View style={s.header}>
                <View style={s.headerIcon}>
                  <Ionicons name="options" size={16} color={COPPER} />
                </View>
                <View style={s.headerText}>
                  <Text style={s.headerTitle}>フィルター & 並び替え</Text>
                  <Text style={s.headerSub}>表示する本を絞り込む</Text>
                </View>
                <Pressable style={s.headerClose} onPress={hide} aria-label="閉じる">
                  <Ionicons name="close" size={18} color={MUTED} />
                </Pressable>
              </View>

              {/* ── Section: Filter ── */}
              <View style={s.section}>
                <View style={s.sectionHeader}>
                  <Text style={s.sectionLabel}>ステータス</Text>
                  {isFiltered ? (
                    <Pressable onPress={() => onFilterChange('all')}>
                      <Text style={s.resetLink}>リセット</Text>
                    </Pressable>
                  ) : null}
                </View>

                <View style={s.filterGrid}>
                  {FILTER_OPTIONS.map((f) => {
                    const active = filter === f.key;
                    const count  = bookCounts[f.key];
                    return (
                      <Pressable
                        key={f.key}
                        style={[
                          s.filterChip,
                          active && s.filterChipActive,
                          active && { borderColor: f.color + '55' },
                        ]}
                        onPress={() => onFilterChange(f.key)}
                      >
                        {/* アイコンは常時カラー表示、選択時は背景を強調 */}
                        <View style={[
                          s.filterIconWrap,
                          { backgroundColor: f.color + '20' },
                          active && { backgroundColor: f.color + '35' },
                        ]}>
                          <Ionicons
                            name={active ? (f.icon.replace('-outline', '') as any) : f.icon}
                            size={14}
                            color={f.color}
                          />
                        </View>
                        <Text style={[s.filterChipLabel, active && { color: f.color }]}>
                          {f.label}
                        </Text>
                        <View style={[s.countBadge, active && { backgroundColor: f.color + '22' }]}>
                          <Text style={[s.countBadgeText, active && { color: f.color }]}>
                            {count}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* ── Divider ── */}
              <View style={s.divider} />

              {/* ── Section: Sort ── */}
              <View style={s.section}>
                <View style={s.sectionHeader}>
                  <Text style={s.sectionLabel}>並び替え</Text>
                  {isSorted ? (
                    <Pressable onPress={() => onSortChange('newest')}>
                      <Text style={s.resetLink}>リセット</Text>
                    </Pressable>
                  ) : null}
                </View>

                <View style={s.sortGrid}>
                  {SORT_OPTIONS.map((opt) => {
                    const active = sortKey === opt.key;
                    return (
                      <Pressable
                        key={opt.key}
                        style={[
                          s.sortChip,
                          active && s.sortChipActive,
                          active && { borderColor: opt.color + '55' },
                        ]}
                        onPress={() => onSortChange(opt.key)}
                      >
                        {/* 各並び替えアイコンも固有色で常時表示 */}
                        <View style={[
                          s.sortIconWrap,
                          { backgroundColor: opt.color + '20' },
                          active && { backgroundColor: opt.color + '35' },
                        ]}>
                          <Ionicons
                            name={opt.icon}
                            size={15}
                            color={opt.color}
                          />
                        </View>
                        <View style={s.sortText}>
                          <Text style={[s.sortLabel, active && { color: opt.color, fontWeight: '600' }]}>
                            {opt.label}
                          </Text>
                          <Text style={s.sortDesc}>{opt.desc}</Text>
                        </View>
                        {active ? (
                          <View style={[s.sortCheckWrap, { backgroundColor: opt.color + '25' }]}>
                            <Ionicons name="checkmark" size={13} color={opt.color} />
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* ── Apply button ── */}
              <Pressable style={s.applyBtn} onPress={hide}>
                <Text style={s.applyBtnText}>完了</Text>
              </Pressable>

              <View style={{ height: 12 }} />
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  /* FAB */
  fab: {
    position:   'absolute',
    bottom:     106,
    right:      20,
    width:      48, height: 48,
    borderRadius: 24,
    backgroundColor: '#10121A',
    borderWidth: 1,
    borderColor: LINE,
    alignItems:     'center',
    justifyContent: 'center',
    boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
  },
  fabActive: {
    borderColor: COPPER_MID,
    backgroundColor: '#141622',
    boxShadow: '0 4px 20px rgba(216,138,94,0.18)',
  },
  fabDot: {
    position: 'absolute', top: 9, right: 9,
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: COPPER,
  },

  /* Modal */
  modalRoot: {
    flex: 1, justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },

  /* Sheet */
  sheet: {
    backgroundColor: SHEET,
    borderTopLeftRadius:  24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    boxShadow: '0 -12px 48px rgba(0,0,0,0.8)',
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 12, paddingBottom: 4,
  },
  handle: {
    width: 32, height: 3.5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 2,
  },
  scrollContent: {
    paddingBottom: 4,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 18,
    gap: 12,
  },
  headerIcon: {
    width: 34, height: 34,
    borderRadius: 10,
    backgroundColor: COPPER_DIM,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COPPER_MID,
  },
  headerText: { flex: 1 },
  headerTitle: {
    fontSize: 15, fontWeight: '600', color: INK,
    letterSpacing: 0.2,
  },
  headerSub: {
    fontSize: 11, color: MUTED, marginTop: 1,
  },
  headerClose: {
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Section */
  section: {
    paddingHorizontal: 18,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: MUTED,
    letterSpacing: 1.0, textTransform: 'uppercase',
  },
  resetLink: {
    fontSize: 12, color: COPPER, fontWeight: '500',
  },

  /* Filter chips — 2-column grid */
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 8,
    borderRadius: 12,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE,
    width: '47.5%',
  },
  filterChipActive: {
    backgroundColor: CARD_ACT,
  },
  filterIconWrap: {
    width: 26, height: 26,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipLabel: {
    flex: 1,
    fontSize: 13, fontWeight: '500', color: INK2,
  },
  countBadge: {
    minWidth: 22, height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  countBadgeText: {
    fontSize: 10, fontWeight: '600', color: MUTED,
    fontVariant: ['tabular-nums'],
  },

  /* Divider */
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: 18,
    marginBottom: 16,
  },

  /* Sort chips — 2-column grid */
  sortGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 10,
    borderRadius: 12,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE,
    width: '47.5%',
  },
  sortChipActive: {
    backgroundColor: CARD_ACT,
    borderColor: COPPER_MID,
    boxShadow: '0 0 12px rgba(216,138,94,0.08)',
  },
  sortIconWrap: {
    width: 30, height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortIconWrapActive: {
    backgroundColor: COPPER_DIM,
    borderWidth: 1,
    borderColor: COPPER_MID,
  },
  sortText: { flex: 1 },
  sortLabel: {
    fontSize: 12, fontWeight: '500', color: INK2,
    lineHeight: 16,
  },
  sortLabelActive: {
    color: COPPER, fontWeight: '600',
  },
  sortDesc: {
    fontSize: 10, color: MUTED, marginTop: 1,
  },
  sortCheckWrap: {
    width: 20, height: 20,
    borderRadius: 10,
    backgroundColor: COPPER_DIM,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Apply */
  applyBtn: {
    marginHorizontal: 18,
    marginTop: 4,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: COPPER_DIM,
    borderWidth: 1,
    borderColor: COPPER_MID,
    alignItems: 'center',
  },
  applyBtnText: {
    fontSize: 15, fontWeight: '600', color: COPPER,
    letterSpacing: 0.4,
  },
});
