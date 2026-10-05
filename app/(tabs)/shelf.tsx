import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useMutation, useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { api } from '@/convex/_generated/api';
import { Doc } from '@/convex/_generated/dataModel';
import { ShelfControls, type SortKey, type FilterStatus } from '@/components/books/shelf-controls';
import { BookCarousel3D } from '@/components/books/book-carousel-3d';
import { getTopGenreId, GENRE_MAP } from '@/lib/genre-map';

/* ── Design tokens ── */
const C = {
  bg:      '#0A0B0E',
  card:    '#161820',
  line:    'rgba(255,255,255,0.07)',
  ink:     '#ECE6DB',
  ink2:    '#C9C2B4',
  muted:   '#807C73',
  copper:  '#D88A5E',
  green:   '#6FBF8F',
  rose:    '#E27387',
  blue:    '#7BA7BC',
};

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

type ViewMode = 'compact' | 'grid' | 'list';

/* ── Chip ── */
type ChipProps = {
  label: string;
  active: boolean;
  custom?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
};

function Chip({ label, active, custom, onPress, onLongPress }: ChipProps) {
  return (
    <Pressable
      style={[s.chip, active && s.chipActive, custom && s.chipCustom]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
    >
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

/* ── Compact card (コレクション用・5列) ── */
const CompactCard = React.memo(function CompactCard({ book, onPress, onLongPress }: BookCardProps) {
  return (
    <Pressable
      style={s.compactCard}
      onPress={() => onPress(book._id)}
      onLongPress={() => onLongPress(book)}
      delayLongPress={380}
    >
      {book.coverUrl ? (
        <Image source={{ uri: book.coverUrl }} style={s.compactCover} contentFit="cover" />
      ) : (
        <View style={[s.compactCover, s.compactCoverBlank]}>
          <Text style={s.compactBlankText} numberOfLines={3}>{book.title}</Text>
        </View>
      )}
    </Pressable>
  );
});

/* ── Book card (グリッド用) ── */
type BookCardProps = {
  book: Doc<'books'>;
  onPress: (id: string) => void;
  onLongPress: (book: Doc<'books'>) => void;
};

const BookCard = React.memo(function BookCard({ book, onPress, onLongPress }: BookCardProps) {
  return (
    <Pressable
      style={s.card}
      onPress={() => onPress(book._id)}
      onLongPress={() => onLongPress(book)}
      delayLongPress={380}
    >
      {book.coverUrl ? (
        <Image source={{ uri: book.coverUrl }} style={s.cover} contentFit="cover" />
      ) : (
        <View style={[s.cover, s.coverBlank]}>
          <Text style={s.coverBlankText} numberOfLines={4}>{book.title}</Text>
        </View>
      )}
      <View style={[s.badge, { backgroundColor: STATUS_COLOR[book.status] + '33' }]}>
        <Text style={[s.badgeText, { color: STATUS_COLOR[book.status] }]}>
          {STATUS_LABEL[book.status]}
        </Text>
      </View>
    </Pressable>
  );
});

/* ── Book list row (リスト用) ── */
const BookListCard = React.memo(function BookListCard({ book, onPress, onLongPress }: BookCardProps) {
  return (
    <Pressable
      style={s.listCard}
      onPress={() => onPress(book._id)}
      onLongPress={() => onLongPress(book)}
      delayLongPress={380}
    >
      {/* 表紙 */}
      {book.coverUrl ? (
        <Image source={{ uri: book.coverUrl }} style={s.listCover} contentFit="cover" />
      ) : (
        <View style={[s.listCover, s.listCoverBlank]}>
          <Ionicons name="book-outline" size={22} color={C.muted} />
        </View>
      )}

      {/* 情報 */}
      <View style={s.listInfo}>
        <View style={[s.listBadge, { backgroundColor: STATUS_COLOR[book.status] + '28' }]}>
          <Text style={[s.listBadgeText, { color: STATUS_COLOR[book.status] }]}>
            {STATUS_LABEL[book.status]}
          </Text>
        </View>
        <Text style={s.listTitle} numberOfLines={2}>{book.title}</Text>
        {book.author ? (
          <Text style={s.listAuthor} numberOfLines={1}>{book.author}</Text>
        ) : null}
        {book.price != null ? (
          <Text style={s.listPrice}>¥{numFmt.format(book.price)}</Text>
        ) : null}
      </View>

      <Ionicons name="chevron-forward" size={15} color={C.muted} />
    </Pressable>
  );
});

/* ── Main ── */
export default function ShelfScreen() {
  const router      = useRouter();
  const books       = useQuery(api.books.list);
  const stats       = useQuery(api.books.stats);
  const updateBook  = useMutation(api.books.update);

  const [filter,       setFilter]       = useState<FilterStatus>('all');
  const [sortKey,      setSortKey]      = useState<SortKey>('newest');
  const [viewMode,     setViewMode]     = useState<ViewMode>('grid');
  const [selectedBook, setSelectedBook] = useState<Doc<'books'> | null>(null);

  /* ── ジャンルフィルター（楽天API由来） ── */
  const [genreFilter, setGenreFilter] = useState<string>('all');

  /* ── カスタムカテゴリー ── */
  const [customCategoryFilter, setCustomCategoryFilter] = useState<string | null>(null);
  const [showCategoryModal,    setShowCategoryModal]    = useState(false);
  const [modalStep,            setModalStep]            = useState<'name' | 'books'>('name');
  const [newCategoryName,      setNewCategoryName]      = useState('');
  const [pendingCategory,      setPendingCategory]      = useState('');
  const [editingCategory,      setEditingCategory]      = useState<string | null>(null);
  const [selectedBookIds,      setSelectedBookIds]      = useState<Set<string>>(new Set());
  const inputRef = useRef<TextInput>(null);

  const handleLongPress = useCallback((book: Doc<'books'>) => {
    setSelectedBook(book);
  }, []);

  /* ── 楽天ジャンル（本棚に存在するもの） ── */
  const availableGenres = useMemo(() => {
    if (!books) return [];
    const seen = new Map<string, string>();
    for (const b of books) {
      const topId = getTopGenreId(b.genreId);
      if (topId && !seen.has(topId)) seen.set(topId, GENRE_MAP[topId]?.name ?? 'その他');
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [books]);

  /* ── カスタムカテゴリー（全本から収集 + セッション中に作成したもの） ── */
  const [sessionCategories, setSessionCategories] = useState<string[]>([]);

  const allCustomCategories = useMemo(() => {
    if (!books) return sessionCategories;
    const fromBooks = new Set<string>();
    for (const b of books) {
      for (const c of (b.customCategories ?? [])) fromBooks.add(c);
    }
    const merged = new Set([...Array.from(fromBooks), ...sessionCategories]);
    return Array.from(merged);
  }, [books, sessionCategories]);

  /* ── 既存カテゴリーを編集（チップ長押し or 鉛筆アイコン） ── */
  const handleEditCategory = useCallback((name: string) => {
    setPendingCategory(name);
    setEditingCategory(name);
    const initial = new Set(
      (books ?? [])
        .filter((b) => (b.customCategories ?? []).includes(name))
        .map((b) => b._id),
    );
    setSelectedBookIds(initial);
    setModalStep('books');
    setShowCategoryModal(true);
  }, [books]);

  /* ── カテゴリー名確定 → ステップ2へ ── */
  const handleGoToBookSelect = useCallback(() => {
    const name = newCategoryName.trim();
    if (!name) return;
    setPendingCategory(name);
    setEditingCategory(null);
    setSelectedBookIds(new Set());
    setModalStep('books');
  }, [newCategoryName]);

  /* ── 本の選択トグル ── */
  const handleToggleBookSelect = useCallback((id: string) => {
    setSelectedBookIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  /* ── カテゴリー確定・本を一括保存（追加 & 削除） ── */
  const handleConfirmCategory = useCallback(async () => {
    if (!pendingCategory) return;

    const allBooks = books ?? [];

    // 新規カテゴリーならセッションに追加
    if (!editingCategory && !allCustomCategories.includes(pendingCategory)) {
      setSessionCategories((prev) => [...prev, pendingCategory]);
    }

    // 追加が必要な本：選択済み かつ まだカテゴリーに入っていない
    const toAdd = allBooks.filter(
      (b) => selectedBookIds.has(b._id) && !(b.customCategories ?? []).includes(pendingCategory),
    );
    // 削除が必要な本：未選択 かつ すでにカテゴリーに入っている
    const toRemove = allBooks.filter(
      (b) => !selectedBookIds.has(b._id) && (b.customCategories ?? []).includes(pendingCategory),
    );

    await Promise.all([
      ...toAdd.map((b) =>
        updateBook({ id: b._id, customCategories: [...(b.customCategories ?? []), pendingCategory] }),
      ),
      ...toRemove.map((b) =>
        updateBook({ id: b._id, customCategories: (b.customCategories ?? []).filter((c) => c !== pendingCategory) }),
      ),
    ]);

    setCustomCategoryFilter(pendingCategory);
    setGenreFilter('all');
    setNewCategoryName('');
    setPendingCategory('');
    setEditingCategory(null);
    setModalStep('name');
    setShowCategoryModal(false);
  }, [pendingCategory, editingCategory, selectedBookIds, books, allCustomCategories, updateBook]);

  const bookCounts = {
    all:            books?.length ?? 0,
    unread:         books?.filter((b) => b.status === 'unread').length    ?? 0,
    reading:        books?.filter((b) => b.status === 'reading').length   ?? 0,
    done:           books?.filter((b) => b.status === 'done').length      ?? 0,
    gave_up:        books?.filter((b) => b.status === 'gave_up').length   ?? 0,
    on_hold:        books?.filter((b) => b.status === 'on_hold').length   ?? 0,
    favorite:       books?.filter((b) => b.isFavorite === true).length    ?? 0,
    want_to_reread: books?.filter((b) => b.wantToReread === true).length  ?? 0,
  };

  const filtered = books
    ? filter === 'all'            ? books
    : filter === 'favorite'       ? books.filter((b) => b.isFavorite === true)
    : filter === 'want_to_reread' ? books.filter((b) => b.wantToReread === true)
    : books.filter((b) => b.status === filter)
    : [];

  const genreFiltered = customCategoryFilter
    ? filtered.filter((b) => (b.customCategories ?? []).includes(customCategoryFilter))
    : genreFilter === 'all'
      ? filtered
      : filtered.filter((b) => getTopGenreId(b.genreId) === genreFilter);

  const sorted = [...genreFiltered].sort((a, b) => {
    switch (sortKey) {
      case 'newest':     return b._creationTime - a._creationTime;
      case 'oldest':     return a._creationTime - b._creationTime;
      case 'price_desc': return (b.price ?? 0) - (a.price ?? 0);
      case 'price_asc':  return (a.price ?? 0) - (b.price ?? 0);
    }
  });

  const handlePress = useCallback((id: string) => {
    router.push(`/book/${id}` as any);
  }, [router]);

  const renderCompactItem = useCallback(
    ({ item }: { item: Doc<'books'> }) => (
      <CompactCard book={item} onPress={handlePress} onLongPress={handleLongPress} />
    ),
    [handlePress, handleLongPress],
  );
  const renderGridItem = useCallback(
    ({ item }: { item: Doc<'books'> }) => (
      <BookCard book={item} onPress={handlePress} onLongPress={handleLongPress} />
    ),
    [handlePress, handleLongPress],
  );
  const renderListItem = useCallback(
    ({ item }: { item: Doc<'books'> }) => (
      <BookListCard book={item} onPress={handlePress} onLongPress={handleLongPress} />
    ),
    [handlePress, handleLongPress],
  );

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* ── Header ── */}
      <View style={s.header}>
        {/* タイトル行 + グリッド/リスト切り替え */}
        <View style={s.headerRow}>
          <View style={s.headerLeft}>
            <Text style={s.headerTitle}>本棚</Text>
            <Text style={s.headerSub}>
              {stats ? `${stats.total}冊 · ¥${numFmt.format(stats.totalPrice)}` : '読み込み中…'}
            </Text>
          </View>
          <View style={s.viewToggle}>
            <Pressable
              style={[s.toggleBtn, viewMode === 'compact' && s.toggleBtnActive]}
              onPress={() => setViewMode('compact')}
              aria-label="コレクション表示"
            >
              <Ionicons name="apps-outline" size={16} color={viewMode === 'compact' ? C.copper : C.muted} />
            </Pressable>
            <Pressable
              style={[s.toggleBtn, viewMode === 'grid' && s.toggleBtnActive]}
              onPress={() => setViewMode('grid')}
              aria-label="グリッド表示"
            >
              <Ionicons name="grid-outline" size={17} color={viewMode === 'grid' ? C.copper : C.muted} />
            </Pressable>
            <Pressable
              style={[s.toggleBtn, viewMode === 'list' && s.toggleBtnActive]}
              onPress={() => setViewMode('list')}
              aria-label="リスト表示"
            >
              <Ionicons name="list-outline" size={19} color={viewMode === 'list' ? C.copper : C.muted} />
            </Pressable>
          </View>
        </View>

        {/* ジャンル・カテゴリーフィルターバー */}
        {(books?.length ?? 0) > 0 ? (
          <View style={s.genreBarWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={s.genreScroll}
              contentContainerStyle={s.genreBar}
            >
              <Chip
                label="すべて"
                active={genreFilter === 'all' && customCategoryFilter === null}
                onPress={() => { setGenreFilter('all'); setCustomCategoryFilter(null); }}
              />
              {availableGenres.map(({ id, name }) => (
                <Chip
                  key={id}
                  label={name}
                  active={genreFilter === id && customCategoryFilter === null}
                  onPress={() => { setGenreFilter(id); setCustomCategoryFilter(null); }}
                />
              ))}
              {allCustomCategories.map((name) => (
                <Chip
                  key={`custom-${name}`}
                  label={name}
                  custom
                  active={customCategoryFilter === name}
                  onPress={() => { setCustomCategoryFilter(name); setGenreFilter('all'); }}
                />
              ))}
            </ScrollView>

            {/* 常時表示の + ボタン */}
            <Pressable
              style={s.chipAddBtn}
              onPress={() => setShowCategoryModal(true)}
              aria-label="カテゴリーを追加"
            >
              <Ionicons name="add" size={18} color={C.copper} />
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* ── Book list / grid ── */}
      {books === undefined ? (
        <View style={s.center}>
          <Text style={s.loadingText}>読み込み中…</Text>
        </View>
      ) : genreFiltered.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="library-outline" size={48} color={C.muted} />
          <Text style={s.emptyTitle}>本がありません</Text>
          <Text style={s.emptySub}>
            {genreFilter !== 'all'
              ? `「${GENRE_MAP[genreFilter]?.name ?? genreFilter}」の本がまだありません`
              : filter === 'all'
              ? '検索タブから本を追加してみましょう'
              : filter === 'favorite'
              ? '本の詳細画面でお気に入りに登録できます'
              : filter === 'want_to_reread'
              ? '本の詳細画面でもう一度読みたいに登録できます'
              : `「${STATUS_LABEL[filter] ?? filter}」の本がまだありません`}
          </Text>
        </View>
      ) : viewMode === 'compact' ? (
        <FlashList
          key="compact"
          data={sorted}
          renderItem={renderCompactItem}
          numColumns={10}
          estimatedItemSize={50}
          contentContainerStyle={s.compactContent}
          showsVerticalScrollIndicator={false}
          keyExtractor={(item) => item._id}
        />
      ) : viewMode === 'grid' ? (
        <FlashList
          key="grid"
          data={sorted}
          renderItem={renderGridItem}
          numColumns={3}
          estimatedItemSize={160}
          contentContainerStyle={s.gridContent}
          showsVerticalScrollIndicator={false}
          keyExtractor={(item) => item._id}
        />
      ) : (
        <FlashList
          key="list"
          data={sorted}
          renderItem={renderListItem}
          numColumns={1}
          estimatedItemSize={96}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          keyExtractor={(item) => item._id}
        />
      )}

      {/* ── Floating shelf controls ── */}
      <ShelfControls
        sortKey={sortKey}
        onSortChange={setSortKey}
        filter={filter}
        onFilterChange={setFilter}
        bookCounts={bookCounts}
      />

      {/* ── カテゴリー作成モーダル（2ステップ） ── */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowCategoryModal(false);
          setModalStep('name');
          setEditingCategory(null);
          setNewCategoryName('');
          setPendingCategory('');
        }}
        onShow={() => { if (modalStep === 'name') setTimeout(() => inputRef.current?.focus(), 100); }}
      >
        <View style={s.pickerSheet}>
          <View style={s.pickerHandle} />

          {modalStep === 'name' ? (
            /* ── ステップ1: カテゴリー名入力 ── */
            <>
              <View style={s.pickerHeader}>
                <Text style={s.pickerTitle}>カテゴリーを作成</Text>
                <Pressable style={s.pickerClose} onPress={() => setShowCategoryModal(false)} aria-label="閉じる">
                  <Ionicons name="close" size={22} color={C.muted} />
                </Pressable>
              </View>

              <View style={s.categoryInputWrap}>
                <TextInput
                  ref={inputRef}
                  style={s.categoryInput}
                  placeholder="カテゴリー名（例: お気に入り）"
                  placeholderTextColor={C.muted}
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  returnKeyType="next"
                  onSubmitEditing={handleGoToBookSelect}
                  maxLength={20}
                />
              </View>

              <Pressable
                style={[s.categoryNextBtn, !newCategoryName.trim() && s.categoryCreateBtnDisabled]}
                onPress={handleGoToBookSelect}
                disabled={!newCategoryName.trim()}
              >
                <Text style={s.categoryCreateBtnText}>次へ　→</Text>
              </Pressable>

              {/* 既存カテゴリー一覧 */}
              {allCustomCategories.length > 0 ? (
                <>
                  <Text style={s.pickerSectionLabel}>作成済みのカテゴリー</Text>
                  <ScrollView contentContainerStyle={s.pickerList} showsVerticalScrollIndicator={false}>
                    {allCustomCategories.map((name) => {
                      const count = books?.filter((b) => b.customCategories?.includes(name)).length ?? 0;
                      return (
                        <Pressable
                          key={name}
                          style={s.pickerItem}
                          onPress={() => {
                            setCustomCategoryFilter(name);
                            setGenreFilter('all');
                            setShowCategoryModal(false);
                          }}
                        >
                          <View style={s.pickerItemLeft}>
                            <Ionicons name="folder-outline" size={18} color={C.copper} />
                            <Text style={s.pickerItemText}>{name}</Text>
                          </View>
                          <View style={s.pickerItemRight}>
                            <Text style={s.pickerItemCount}>{count}冊</Text>
                            <Pressable
                              style={s.pickerEditBtn}
                              onPress={() => handleEditCategory(name)}
                              hitSlop={8}
                              aria-label={`${name}を編集`}
                            >
                              <Ionicons name="pencil-outline" size={16} color={C.muted} />
                            </Pressable>
                          </View>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </>
              ) : null}
            </>
          ) : (
            /* ── ステップ2: 本を選択 ── */
            <>
              <View style={s.pickerHeader}>
                <Pressable
                  style={s.pickerClose}
                  onPress={() => {
                    if (editingCategory) {
                      setShowCategoryModal(false);
                      setEditingCategory(null);
                      setModalStep('name');
                      setPendingCategory('');
                    } else {
                      setModalStep('name');
                    }
                  }}
                  aria-label="戻る"
                >
                  <Ionicons name="chevron-back" size={22} color={C.ink} />
                </Pressable>
                <Text style={[s.pickerTitle, { flex: 1, textAlign: 'center' }]} numberOfLines={1}>
                  「{pendingCategory}」
                </Text>
                <Pressable style={s.pickerClose} onPress={handleConfirmCategory}>
                  <Text style={{ color: C.copper, fontSize: 15, fontWeight: '600' }}>完了</Text>
                </Pressable>
              </View>

              <Text style={s.bookSelectHint}>
                {editingCategory
                  ? `本をタップして追加・削除（${selectedBookIds.size}冊選択中）`
                  : `追加する本をタップして選択してください（${selectedBookIds.size}冊選択中）`}
              </Text>

              <ScrollView contentContainerStyle={s.pickerList} showsVerticalScrollIndicator={false}>
                {(books ?? []).map((b) => {
                  const selected = selectedBookIds.has(b._id);
                  return (
                    <Pressable
                      key={b._id}
                      style={[s.bookSelectRow, selected && s.bookSelectRowActive]}
                      onPress={() => handleToggleBookSelect(b._id)}
                    >
                      {b.coverUrl ? (
                        <Image source={{ uri: b.coverUrl }} style={s.bookSelectCover} contentFit="cover" />
                      ) : (
                        <View style={[s.bookSelectCover, s.bookSelectCoverBlank]}>
                          <Ionicons name="book-outline" size={16} color={C.muted} />
                        </View>
                      )}
                      <View style={s.bookSelectInfo}>
                        <Text style={s.bookSelectTitle} numberOfLines={2}>{b.title}</Text>
                        {b.author ? <Text style={s.bookSelectAuthor} numberOfLines={1}>{b.author}</Text> : null}
                      </View>
                      <View style={[s.bookSelectCheck, selected && s.bookSelectCheckActive]}>
                        {selected ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </>
          )}
        </View>
      </Modal>

      {/* ── 3D book carousel (long press) ── */}
      <BookCarousel3D
        visible={selectedBook !== null}
        books={books ?? []}
        initialBook={selectedBook}
        onClose={() => setSelectedBook(null)}
      />
    </View>
  );
}

const CARD_GAP = 10;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  /* ── header ── */
  header: {
    paddingTop: 60,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerLeft: { gap: 3 },
  headerTitle: {
    fontSize: 28, fontWeight: '600', color: C.ink, letterSpacing: 0.3,
  },
  headerSub: {
    fontSize: 12, color: C.muted,
    fontVariant: ['tabular-nums'],
  },

  /* view mode toggle */
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: 10,
    borderWidth: 1, borderColor: C.line,
    overflow: 'hidden',
  },
  toggleBtn: {
    width: 38, height: 34,
    alignItems: 'center', justifyContent: 'center',
  },
  toggleBtnActive: {
    backgroundColor: C.copper + '20',
  },

  /* ── genre / category filter bar ── */
  genreBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    paddingRight: 14,
  },
  genreScroll: { flex: 1 },
  genreBar: {
    paddingLeft: 16,
    paddingRight: 6,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipActive: {
    borderColor: C.copper,
  },
  chipCustom: {
    borderColor: C.copper + '40',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: C.muted,
  },
  chipTextActive: {
    color: C.ink,
    fontWeight: '600',
  },
  chipAddBtn: {
    width: 34, height: 34,
    borderRadius: 999,
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: C.copper + '60',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  /* ── category modal ── */
  pickerSheet: { flex: 1, backgroundColor: C.bg },
  pickerHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center', marginTop: 10,
  },
  pickerHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingTop: 14, paddingBottom: 12,
  },
  pickerTitle: { fontSize: 17, fontWeight: '600', color: C.ink },
  pickerClose: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  categoryInputWrap: {
    marginHorizontal: 20, marginBottom: 16,
  },
  categoryInput: {
    height: 50,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1, borderColor: C.line,
    paddingHorizontal: 16,
    fontSize: 15, color: C.ink,
  },
  categoryNextBtn: {
    height: 50, marginHorizontal: 20, marginBottom: 8,
    borderRadius: 14, backgroundColor: C.copper,
    alignItems: 'center', justifyContent: 'center',
  },
  categoryCreateBtnDisabled: { opacity: 0.35 },
  categoryCreateBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },

  pickerSectionLabel: {
    fontSize: 11, fontWeight: '600', color: C.muted,
    letterSpacing: 0.6, textTransform: 'uppercase',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 6,
    borderTopWidth: 1, borderTopColor: C.line,
  },
  pickerList: { paddingBottom: 60 },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.line,
  },
  pickerItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pickerItemRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  pickerItemText: { fontSize: 15, color: C.ink },
  pickerItemCount: { fontSize: 13, color: C.muted, fontVariant: ['tabular-nums'] },
  pickerEditBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },

  /* ── step 2: book selection ── */
  bookSelectHint: {
    fontSize: 13, color: C.muted,
    paddingHorizontal: 20, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: C.line,
  },
  bookSelectRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.line,
  },
  bookSelectRowActive: { backgroundColor: C.copper + '0D' },
  bookSelectCover: { width: 44, height: 62, borderRadius: 6, flexShrink: 0 },
  bookSelectCoverBlank: { backgroundColor: '#1C1F2A', alignItems: 'center', justifyContent: 'center' },
  bookSelectInfo: { flex: 1, gap: 3 },
  bookSelectTitle: { fontSize: 14, fontWeight: '500', color: C.ink, lineHeight: 20 },
  bookSelectAuthor: { fontSize: 12, color: C.muted },
  bookSelectCheck: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.line,
    backgroundColor: C.card,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  bookSelectCheckActive: { backgroundColor: C.copper, borderColor: C.copper },

  /* ── compact (5列コレクション) ── */
  compactContent: { paddingHorizontal: 6, paddingBottom: 110 },
  compactCard: {
    flex: 1,
    margin: 2,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: C.card,
  },
  compactCover: { width: '100%', aspectRatio: 5 / 7 },
  compactCoverBlank: {
    backgroundColor: '#1C1F2A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  compactBlankText: { fontSize: 5, color: C.muted, textAlign: 'center', lineHeight: 7 },

  /* ── grid ── */
  gridContent: { paddingHorizontal: 14, paddingBottom: 110 },
  card: {
    flex: 1,
    margin: CARD_GAP / 2,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1, borderColor: C.line,
    overflow: 'hidden',
  },
  cover: { width: '100%', aspectRatio: 5 / 7 },
  coverBlank: {
    backgroundColor: '#1C1F2A',
    alignItems: 'center', justifyContent: 'center',
    padding: 12,
  },
  coverBlankText: { fontSize: 12, color: C.muted, textAlign: 'center', lineHeight: 18 },
  badge: {
    position: 'absolute', top: 8, right: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: { fontSize: 10, fontWeight: '600' },

  /* ── list ── */
  listContent: { paddingHorizontal: 14, paddingBottom: 110 },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    marginBottom: 8,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1, borderColor: C.line,
  },
  listCover: {
    width: 56, height: 80,
    borderRadius: 8,
    flexShrink: 0,
  },
  listCoverBlank: {
    backgroundColor: '#1C1F2A',
    alignItems: 'center', justifyContent: 'center',
  },
  listInfo: { flex: 1, gap: 5 },
  listBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 999,
  },
  listBadgeText: { fontSize: 10, fontWeight: '600' },
  listTitle: {
    fontSize: 14, fontWeight: '600', color: C.ink, lineHeight: 20,
  },
  listAuthor: { fontSize: 12, color: C.muted },
  listPrice: {
    fontSize: 13, fontWeight: '500', color: C.copper,
    fontVariant: ['tabular-nums'],
  },

  /* ── empty / loading ── */
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12,
    paddingBottom: 80,
  },
  loadingText: { fontSize: 14, color: C.muted },
  emptyTitle:  { fontSize: 16, fontWeight: '500', color: C.ink2 },
  emptySub:    { fontSize: 13, color: C.muted, textAlign: 'center', paddingHorizontal: 40 },
});
