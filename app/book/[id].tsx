import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

/* ── Design tokens ── */
const C = {
  bg:    '#0A0B0E',
  card:  '#131520',
  card2: '#191C28',
  line:  'rgba(255,255,255,0.07)',
  ink:   '#ECE6DB',
  ink2:  '#C9C2B4',
  muted: '#6B6760',
  gold:  '#D88A5E',
  green: '#6BAF82',
  rose:  '#E07A8A',
  blue:  '#7BA7BC',
};

/* ── Status config ── */
const STATUS_OPTIONS: {
  key:         'unread' | 'reading' | 'done' | 'on_hold' | 'gave_up';
  label:       string;
  icon:        keyof typeof Ionicons.glyphMap;
  iconActive:  keyof typeof Ionicons.glyphMap;
  color:       string;
}[] = [
  { key: 'unread',  label: '積読',   icon: 'layers-outline',         iconActive: 'layers',          color: C.rose  },
  { key: 'reading', label: '読書中', icon: 'book-outline',           iconActive: 'book',            color: C.gold  },
  { key: 'done',    label: '読了',   icon: 'checkmark-circle-outline', iconActive: 'checkmark-circle', color: C.green },
  { key: 'on_hold', label: '中断中', icon: 'pause-circle-outline',   iconActive: 'pause-circle',    color: C.blue  },
  { key: 'gave_up', label: '諦めた', icon: 'close-circle-outline',   iconActive: 'close-circle',    color: '#888888' },
];

type Status = typeof STATUS_OPTIONS[number]['key'];

/* ── Toggle Switch（iOS 標準スタイル・アニメーション付き） ── */
const ToggleSwitch = React.memo(function ToggleSwitch({ on }: { on: boolean }) {
  const anim = useRef(new Animated.Value(on ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: on ? 1 : 0,
      useNativeDriver: false,
      bounciness: 0,
      speed: 22,
    }).start();
  }, [on, anim]);

  const trackBg = anim.interpolate({
    inputRange:  [0, 1],
    outputRange: ['rgba(255,255,255,0.15)', C.gold],
  });
  const thumbX = anim.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, 18],
  });

  return (
    <Animated.View style={[sw.track, { backgroundColor: trackBg }]}>
      <Animated.View style={[sw.thumb, { transform: [{ translateX: thumbX }] }]} />
    </Animated.View>
  );
});

const sw = StyleSheet.create({
  track: {
    width: 44, height: 26, borderRadius: 13,
  },
  thumb: {
    position: 'absolute',
    top: 2, left: 2,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#fff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
  },
});


/* ── Main ── */
export default function BookDetailScreen() {
  const { id }  = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();

  const book       = useQuery(api.books.get, { id: id as Id<'books'> });
  const updateBook = useMutation(api.books.update);
  const removeBook = useMutation(api.books.remove);

  const [memo,         setMemo]         = useState('');
  const [memoEditing,  setMemoEditing]  = useState(false);
  const [priceInput,   setPriceInput]   = useState('');
  const [priceEditing, setPriceEditing] = useState(false);
  const [dateInput,    setDateInput]    = useState('');
  const [dateEditing,  setDateEditing]  = useState(false);

  useEffect(() => {
    if (book) setMemo(book.memo ?? '');
  }, [book?.memo]);

  const handleStatusChange = useCallback((status: Status) => {
    updateBook({ id: book!._id, status });
  }, [book, updateBook]);

  const handleToggle = useCallback((field: 'isFavorite' | 'wantToReread') => {
    updateBook({ id: book!._id, [field]: !book![field] });
  }, [book, updateBook]);

  const handleMemoSave = useCallback(() => {
    setMemoEditing(false);
    updateBook({ id: book!._id, memo: memo.trim() || undefined });
  }, [book, updateBook, memo]);

  const handlePriceEdit = useCallback(() => {
    setPriceInput(book!.price != null ? String(book!.price) : '');
    setPriceEditing(true);
  }, [book]);

  const handlePriceSave = useCallback(() => {
    setPriceEditing(false);
    const trimmed = priceInput.trim().replace(/[^0-9]/g, '');
    if (!trimmed) {
      updateBook({ id: book!._id, price: undefined });
    } else {
      const n = parseInt(trimmed, 10);
      if (!isNaN(n)) updateBook({ id: book!._id, price: n });
    }
  }, [book, updateBook, priceInput]);

  const handleDateEdit = useCallback(() => {
    setDateInput(book!.purchasedAt ?? '');
    setDateEditing(true);
  }, [book]);

  const handleDateSave = useCallback(() => {
    setDateEditing(false);
    const trimmed = dateInput.trim();
    if (!trimmed) {
      updateBook({ id: book!._id, purchasedAt: undefined });
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      updateBook({ id: book!._id, purchasedAt: trimmed });
    }
  }, [book, updateBook, dateInput]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      '削除の確認',
      `「${book!.title}」を本棚から削除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            await removeBook({ id: book!._id });
            router.back();
          },
        },
      ],
    );
  }, [book, removeBook, router]);

  if (book === undefined) {
    return (
      <View style={[s.root, s.center]}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <Text style={s.mutedText}>読み込み中…</Text>
      </View>
    );
  }

  const currentStatus = STATUS_OPTIONS.find((o) => o.key === book.status);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── 背景画像（画面最上部〜ステータスセクションまで） ── */}
      <Image
        source={require('@/assets/images/book-detail-bg.png')}
        style={s.bgImage}
        contentFit="cover"
      />
      <LinearGradient
        colors={['rgba(10,11,14,0)', 'rgba(10,11,14,0)', 'rgba(10,11,14,0.85)', 'rgba(10,11,14,1)']}
        locations={[0, 0.48, 0.80, 1]}
        style={s.bgGradient}
      />

      {/* ── Header ── */}
      <View style={s.header}>
        <Pressable style={s.headerBtn} onPress={() => router.back()} aria-label="戻る">
          <Ionicons name="chevron-back" size={22} color={C.ink} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable style={s.headerBtn} onPress={handleDelete} aria-label="削除">
          <Ionicons name="trash-outline" size={19} color={C.muted} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
      >
        {/* ── Hero ── */}
        <View style={s.heroWrap}>
          {/* 表紙 */}
          {book.coverUrl ? (
            <Image source={{ uri: book.coverUrl }} style={s.cover} contentFit="cover" />
          ) : (
            <View style={[s.cover, s.coverBlank]}>
              <Ionicons name="book-outline" size={44} color={C.muted} />
            </View>
          )}
          {currentStatus ? (
            <View style={[s.coverBadge, { backgroundColor: currentStatus.color + '22', borderColor: currentStatus.color + '60' }]}>
              <View style={[s.coverBadgeDot, { backgroundColor: currentStatus.color }]} />
              <Text style={[s.coverBadgeText, { color: currentStatus.color }]}>
                {currentStatus.label}
              </Text>
            </View>
          ) : null}
        </View>

        {/* ── Status ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>ステータス</Text>
          <View style={s.statusGrid}>
            {STATUS_OPTIONS.map((opt) => {
              const active = book.status === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  style={[
                    s.statusChip,
                    active && { borderColor: opt.color + '80', backgroundColor: opt.color + '14' },
                  ]}
                  onPress={() => handleStatusChange(opt.key)}
                >
                  <Ionicons
                    name={active ? opt.iconActive : opt.icon}
                    size={24}
                    color={active ? opt.color : C.muted}
                  />
                  <Text style={[s.statusLabel, active && { color: opt.color }]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── Labels ── */}
        <View style={s.section}>
          <View style={s.labelRow}>

            {/* お気に入り */}
            <Pressable
              style={[s.labelCard, book.isFavorite && s.labelCardActive]}
              onPress={() => handleToggle('isFavorite')}
            >
              <View style={s.labelLeft}>
                <Ionicons
                  name={book.isFavorite ? 'heart' : 'heart-outline'}
                  size={20}
                  color={book.isFavorite ? C.gold : C.muted}
                />
                <Text style={[s.labelText, book.isFavorite && { color: C.ink }]}>
                  お気に入り
                </Text>
              </View>
              <ToggleSwitch on={!!book.isFavorite} />
            </Pressable>

            {/* もう一度読みたい */}
            <Pressable
              style={[s.labelCard, book.wantToReread && s.labelCardActive]}
              onPress={() => handleToggle('wantToReread')}
            >
              <View style={s.labelLeft}>
                <Ionicons
                  name={book.wantToReread ? 'refresh-circle' : 'refresh-circle-outline'}
                  size={20}
                  color={book.wantToReread ? C.gold : C.muted}
                />
                <Text style={[s.labelText, book.wantToReread && { color: C.ink }]}>
                  {'もう一度\n読みたい'}
                </Text>
              </View>
              <ToggleSwitch on={!!book.wantToReread} />
            </Pressable>

          </View>
        </View>

        {/* ── Price + 登録日 ── */}
        <View style={s.section}>
          <View style={s.infoCard}>
            {/* 価格 */}
            <Pressable style={s.infoCol} onPress={handlePriceEdit}>
              <View style={s.infoIconRow}>
                <Ionicons name="pricetag-outline" size={14} color={C.gold} />
                <Text style={s.infoKeyText}>価格</Text>
                {!priceEditing && (
                  <Ionicons name="pencil-outline" size={11} color={C.muted} />
                )}
              </View>
              {priceEditing ? (
                <TextInput
                  style={s.infoInput}
                  value={priceInput}
                  onChangeText={setPriceInput}
                  keyboardType="number-pad"
                  autoFocus
                  placeholder="例: 1500"
                  placeholderTextColor={C.muted}
                  returnKeyType="done"
                  onBlur={handlePriceSave}
                  onSubmitEditing={handlePriceSave}
                />
              ) : (
                <Text style={s.infoValText} numberOfLines={1}>
                  {book.price != null ? `¥${book.price.toLocaleString('ja-JP')}` : '—'}
                </Text>
              )}
            </Pressable>

            {/* 縦線 */}
            <View style={s.infoDivider} />

            {/* 登録日 */}
            <Pressable style={s.infoCol} onPress={handleDateEdit}>
              <View style={s.infoIconRow}>
                <Ionicons name="calendar-outline" size={14} color={C.gold} />
                <Text style={s.infoKeyText}>登録日</Text>
                {!dateEditing && (
                  <Ionicons name="pencil-outline" size={11} color={C.muted} />
                )}
              </View>
              {dateEditing ? (
                <TextInput
                  style={s.infoInput}
                  value={dateInput}
                  onChangeText={setDateInput}
                  autoFocus
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={C.muted}
                  returnKeyType="done"
                  onBlur={handleDateSave}
                  onSubmitEditing={handleDateSave}
                />
              ) : (
                <Text style={s.infoValText} numberOfLines={1}>
                  {book.purchasedAt
                    ? new Date(book.purchasedAt).toLocaleDateString('ja-JP', {
                        year: 'numeric', month: 'long', day: 'numeric',
                      })
                    : '—'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* ── Memo ── */}
        <View style={s.section}>
          <View style={s.memoCard}>
            <View style={s.memoHeader}>
              <Text style={s.memoTitle}>メモ</Text>
              <Pressable
                style={s.memoEditBtn}
                onPress={() => setMemoEditing((v) => !v)}
                aria-label="メモを編集"
              >
                <Ionicons name="pencil" size={15} color={C.gold} />
              </Pressable>
            </View>

            {memoEditing ? (
              <TextInput
                style={s.memoInput}
                value={memo}
                onChangeText={setMemo}
                multiline
                autoFocus
                placeholder="感想・メモを入力…"
                placeholderTextColor={C.muted}
                onBlur={handleMemoSave}
              />
            ) : memo ? (
              <Pressable onPress={() => setMemoEditing(true)}>
                <Text style={s.memoText}>{memo}</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => setMemoEditing(true)}>
                <Text style={s.memoEmpty}>タップして追加…</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* ── Back button ── */}
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="grid-outline" size={17} color={C.gold} />
          <Text style={s.backBtnText}>本棚に戻る</Text>
        </Pressable>

        <View style={{ height: 16 }} />
      </ScrollView>
    </View>
  );
}

/* ── Styles ── */
const s = StyleSheet.create({
  root:      { flex: 1, backgroundColor: C.bg },
  center:    { alignItems: 'center', justifyContent: 'center' },
  mutedText: { fontSize: 14, color: C.muted },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 56, paddingHorizontal: 8, paddingBottom: 10,
  },
  headerBtn: {
    width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 22,
  },

  /* Scroll */
  scroll: { paddingHorizontal: 16 },

  /* Background image layer */
  bgImage: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 500,
  },
  bgGradient: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 500,
  },

  /* Hero */
  heroWrap: {
    alignItems: 'center',
    paddingTop: 16, paddingBottom: 16,
  },
  cover: {
    width: 124, height: 174,
    borderRadius: 10,
    boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
  },
  coverBlank: {
    backgroundColor: '#1C1F2A',
    alignItems: 'center', justifyContent: 'center',
  },
  coverBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999, borderWidth: 1,
  },
  coverBadgeDot:  { width: 6, height: 6, borderRadius: 3 },
  coverBadgeText: { fontSize: 12, fontWeight: '600' },


  /* Section */
  section: { marginBottom: 10 },
  sectionLabel: {
    fontSize: 10, fontWeight: '700', color: C.muted,
    letterSpacing: 1.1, textTransform: 'uppercase',
    marginBottom: 8,
  },

  /* ── Status: 5-column grid ── */
  statusGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statusChip: {
    flex: 1,
    alignItems: 'center', justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: C.card,
    borderWidth: 1.5, borderColor: C.line,
  },
  statusLabel: {
    fontSize: 11, fontWeight: '600', color: C.muted,
    textAlign: 'center',
  },

  /* ── Label cards ── */
  labelRow: {
    flexDirection: 'row', gap: 10,
  },
  labelCard: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1, borderColor: C.line,
  },
  labelCardActive: {
    backgroundColor: C.card2,
  },
  labelLeft: {
    flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1,
  },
  labelText: {
    fontSize: 13, fontWeight: '500', color: C.muted,
    lineHeight: 18,
  },

  /* ── Info card (price + date) ── */
  infoCard: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: 14, borderWidth: 1, borderColor: C.line,
    overflow: 'hidden',
  },
  infoCol: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  infoIconRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
  },
  infoKeyText: {
    fontSize: 12, color: C.muted, fontWeight: '500',
  },
  infoValText: {
    fontSize: 15, color: C.ink, fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  infoInput: {
    color: C.ink, fontSize: 15, fontWeight: '600',
    paddingVertical: 2,
    borderBottomWidth: 1, borderBottomColor: C.gold + '80',
    fontVariant: ['tabular-nums'],
  },
  infoDivider: {
    width: 1, backgroundColor: C.line,
    marginVertical: 12,
  },

  /* ── Memo ── */
  memoCard: {
    backgroundColor: C.card,
    borderRadius: 14, borderWidth: 1, borderColor: C.line,
    padding: 12,
  },
  memoHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  memoTitle: {
    fontSize: 13, fontWeight: '600', color: C.ink2,
  },
  memoEditBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: C.gold + '22',
    borderWidth: 1, borderColor: C.gold + '50',
    alignItems: 'center', justifyContent: 'center',
  },
  memoInput: {
    color: C.ink, fontSize: 14, lineHeight: 22,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  memoText: {
    color: C.ink2, fontSize: 14, lineHeight: 22,
  },
  memoEmpty: {
    color: C.muted, fontSize: 14,
  },

  /* ── Back button ── */
  backBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 6,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: C.gold + '22',
    borderWidth: 1, borderColor: C.gold + '50',
  },
  backBtnText: {
    fontSize: 15, fontWeight: '600', color: C.gold,
    letterSpacing: 0.3,
  },
});
