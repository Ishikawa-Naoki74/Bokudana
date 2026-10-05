import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { searchBooks, type BookSearchResult } from '@/lib/api/books-search';
import React, { memo, useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

/* ── Design tokens ── */
const C = {
  bg:     '#0A0B0E',
  card:   '#161820',
  line:   'rgba(255,255,255,0.07)',
  ink:    '#ECE6DB',
  ink2:   '#C9C2B4',
  muted:  '#807C73',
  copper: '#D88A5E',
  green:  '#6FBF8F',
  rose:   '#E27387',
};

const numFmt = new Intl.NumberFormat('ja-JP');

/* ── Book result row ── */
type ItemProps = { item: BookSearchResult; onAdd: (item: BookSearchResult) => void };

const BookResultItem = memo(function BookResultItem({ item, onAdd }: ItemProps) {
  return (
    <View style={s.resultItem}>
      {item.coverUrl ? (
        <Image source={{ uri: item.coverUrl }} style={s.cover} contentFit="cover" />
      ) : (
        <View style={[s.cover, s.coverBlank]}>
          <Ionicons name="book-outline" size={20} color={C.muted} />
        </View>
      )}
      <View style={s.itemInfo}>
        <Text style={s.itemTitle} numberOfLines={2}>{item.title}</Text>
        {item.author ? (
          <Text style={s.itemAuthor} numberOfLines={1}>{item.author}</Text>
        ) : null}
        {item.price ? (
          <Text style={s.itemPrice}>¥{numFmt.format(item.price)}</Text>
        ) : null}
      </View>
      <Pressable style={s.addBtn} onPress={() => onAdd(item)} aria-label="追加">
        <Ionicons name="add" size={24} color={C.copper} />
      </Pressable>
    </View>
  );
});

/* ── Status options ── */
const STATUS_OPTIONS: { key: 'unread' | 'reading' | 'done'; label: string; color: string }[] = [
  { key: 'unread',  label: '未読',   color: C.rose },
  { key: 'reading', label: '読書中', color: C.copper },
  { key: 'done',    label: '読了',   color: C.green },
];

/* ── Main ── */
export default function SearchScreen() {
  const router     = useRouter();
  const createBook = useMutation(api.books.create);

  const [query,       setQuery]       = useState('');
  const [results,     setResults]     = useState<BookSearchResult[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [selected,    setSelected]    = useState<BookSearchResult | null>(null);
  const [price,       setPrice]       = useState('');
  const [purchasedAt, setPurchasedAt] = useState(new Date().toISOString().split('T')[0]);
  const [status,      setStatus]      = useState<'unread' | 'reading' | 'done'>('unread');
  const [saving,      setSaving]      = useState(false);
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    setErrorMsg(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        setResults(await searchBooks(text));
      } catch (e) {
        setResults([]);
        setErrorMsg(e instanceof Error ? e.message : '検索に失敗しました');
        console.error('[searchBooks]', e);
      } finally {
        setLoading(false);
      }
    }, 400);
  }, []);

  const handleAdd = useCallback((item: BookSearchResult) => {
    setSelected(item);
    setPrice(item.price ? String(item.price) : '');
    setStatus('unread');
    setPurchasedAt(new Date().toISOString().split('T')[0]);
  }, []);

  const handleSave = useCallback(async () => {
    if (!selected || saving) return;
    setSaving(true);
    try {
      const priceNum = price.trim() ? parseInt(price.trim(), 10) : undefined;
      await createBook({
        title:       selected.title,
        author:      selected.author,
        coverUrl:    selected.coverUrl,
        price:       Number.isFinite(priceNum) ? priceNum : undefined,
        purchasedAt: purchasedAt.trim() || undefined,
        status,
        genreId:     selected.genreId,
      });
      setSelected(null);
      router.back();
    } catch {
      /* keep modal open on error */
    } finally {
      setSaving(false);
    }
  }, [selected, price, purchasedAt, status, saving, createBook, router]);

  const renderItem = useCallback(
    ({ item }: { item: BookSearchResult }) => <BookResultItem item={item} onAdd={handleAdd} />,
    [handleAdd],
  );

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.back()} aria-label="戻る">
          <Ionicons name="chevron-back" size={24} color={C.ink} />
        </Pressable>
        <Text style={s.headerTitle}>書籍を追加</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Search input */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={18} color={C.muted} />
        <TextInput
          style={s.searchInput}
          placeholder="タイトル・著者名で検索"
          placeholderTextColor={C.muted}
          value={query}
          onChangeText={handleQueryChange}
          autoFocus
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Results / states */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={C.copper} />
        </View>
      ) : results.length > 0 ? (
        <FlashList
          data={results}
          renderItem={renderItem}
          estimatedItemSize={88}
          keyExtractor={(item, i) => item.isbn ?? `${item.title}-${i}`}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : errorMsg ? (
        <View style={s.center}>
          <Text style={[s.hintText, { color: '#E27387', textAlign: 'center', paddingHorizontal: 24 }]}>
            {errorMsg}
          </Text>
        </View>
      ) : (
        <View style={s.center}>
          <Text style={s.hintText}>
            {query.trim() ? '見つかりませんでした' : 'タイトルや著者名を入力してください'}
          </Text>
        </View>
      )}

      {/* Add modal */}
      <Modal
        visible={selected !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelected(null)}
      >
        <View style={s.sheet}>
          <View style={s.sheetHandle} />

          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>本を追加</Text>
            <Pressable style={s.closeBtn} onPress={() => setSelected(null)} aria-label="閉じる">
              <Ionicons name="close" size={22} color={C.muted} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={s.sheetBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Book preview */}
            <View style={s.bookPreview}>
              {selected?.coverUrl ? (
                <Image source={{ uri: selected.coverUrl }} style={s.previewCover} contentFit="cover" />
              ) : (
                <View style={[s.previewCover, s.coverBlank]}>
                  <Ionicons name="book-outline" size={28} color={C.muted} />
                </View>
              )}
              <View style={s.previewInfo}>
                <Text style={s.previewTitle} numberOfLines={3}>{selected?.title}</Text>
                {selected?.author ? (
                  <Text style={s.previewAuthor} numberOfLines={1}>{selected.author}</Text>
                ) : null}
              </View>
            </View>

            {/* Price */}
            <View style={s.field}>
              <Text style={s.fieldLabel}>価格（円）</Text>
              <View style={s.inputWrap}>
                <Text style={s.inputPrefix}>¥</Text>
                <TextInput
                  style={s.fieldInput}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                  placeholder="1,760"
                  placeholderTextColor={C.muted}
                />
              </View>
            </View>

            {/* Purchase date */}
            <View style={s.field}>
              <Text style={s.fieldLabel}>購入日</Text>
              <View style={s.inputWrap}>
                <TextInput
                  style={s.fieldInput}
                  value={purchasedAt}
                  onChangeText={setPurchasedAt}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={C.muted}
                />
              </View>
            </View>

            {/* Status */}
            <View style={s.field}>
              <Text style={s.fieldLabel}>読書ステータス</Text>
              <View style={s.statusRow}>
                {STATUS_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.key}
                    style={[
                      s.statusBtn,
                      status === opt.key && { borderColor: opt.color, backgroundColor: `${opt.color}18` },
                    ]}
                    onPress={() => setStatus(opt.key)}
                  >
                    <Text style={[s.statusBtnText, status === opt.key && { color: opt.color }]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Save */}
            <Pressable
              style={[s.saveBtn, saving && s.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.saveBtnText}>登録する</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  /* header */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingTop: 58, paddingBottom: 12,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: C.ink },

  /* search bar */
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: C.card,
    borderRadius: 12, borderWidth: 1, borderColor: C.line,
    paddingHorizontal: 14, height: 46,
  },
  searchInput: { flex: 1, fontSize: 15, color: C.ink, padding: 0 },

  /* empty / loading */
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hintText: { fontSize: 13, color: C.muted },

  /* result list */
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  resultItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.line,
  },
  cover: { width: 52, height: 74, borderRadius: 4, overflow: 'hidden', flexShrink: 0 },
  coverBlank: {
    backgroundColor: C.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.line,
  },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: '500', color: C.ink, lineHeight: 20, marginBottom: 2 },
  itemAuthor: { fontSize: 12, color: C.ink2, marginBottom: 4 },
  itemPrice: { fontSize: 13, color: C.copper, fontWeight: '500', fontVariant: ['tabular-nums'] },
  addBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  /* modal sheet */
  sheet: { flex: 1, backgroundColor: C.bg },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.line,
  },
  sheetTitle: { fontSize: 16, fontWeight: '600', color: C.ink },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  sheetBody: { padding: 20, gap: 20, paddingBottom: 60 },

  /* book preview */
  bookPreview: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    backgroundColor: C.card, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: C.line,
  },
  previewCover: { width: 64, height: 90, borderRadius: 6, overflow: 'hidden', flexShrink: 0 },
  previewInfo: { flex: 1, paddingTop: 2 },
  previewTitle: { fontSize: 15, fontWeight: '500', color: C.ink, lineHeight: 22, marginBottom: 6 },
  previewAuthor: { fontSize: 13, color: C.ink2 },

  /* form */
  field: { gap: 8 },
  fieldLabel: { fontSize: 12, color: C.ink2, fontWeight: '500' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, borderRadius: 10,
    borderWidth: 1, borderColor: C.line,
    paddingHorizontal: 14, height: 48,
  },
  inputPrefix: { fontSize: 16, color: C.muted, marginRight: 4 },
  fieldInput: { flex: 1, fontSize: 15, color: C.ink, padding: 0 },

  /* status selector */
  statusRow: { flexDirection: 'row', gap: 8 },
  statusBtn: {
    flex: 1, height: 44,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, borderWidth: 1, borderColor: C.line,
    backgroundColor: C.card,
  },
  statusBtnText: { fontSize: 13, fontWeight: '500', color: C.muted },

  /* save button */
  saveBtn: {
    height: 52, borderRadius: 14,
    backgroundColor: C.copper,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
