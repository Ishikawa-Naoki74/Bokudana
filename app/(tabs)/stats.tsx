import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { Image } from 'expo-image';
import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { api } from '@/convex/_generated/api';
import { Doc } from '@/convex/_generated/dataModel';
import { getTopGenreId, GENRE_MAP } from '@/lib/genre-map';

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
  blue:   '#7BA7BC',
} as const;

const STATUS_LABEL: Record<string, string> = {
  unread:  '積読',
  reading: '読書中',
  done:    '読了',
  gave_up: '諦めた',
  on_hold: '中断中',
};
const STATUS_COLOR: Record<string, string> = {
  unread:  '#C47B40',  // 積読 — burnt orange
  reading: '#4A80A8',  // 読書中 — steel blue
  done:    '#4B9E6E',  // 読了 — forest green
  on_hold: '#7C8D98',  // 中断 — slate gray
  gave_up: '#B8936A',  // 諦めた — warm tan
};

const numFmt   = new Intl.NumberFormat('ja-JP');
const STATUSES = ['unread', 'reading', 'done', 'gave_up', 'on_hold'] as const;

const GENRE_COLORS = [
  '#D88A5E', '#6FBF8F', '#7BA7BC', '#E27387', '#9B8BCC',
  '#C4A44A', '#5BA89A', '#C47B9A', '#8AA66F', '#7A8FC4',
  '#B87070', '#70B8A0',
];

const GENRE_ICON: Record<string, string> = {
  '001001': 'albums-outline',           // 漫画
  '001002': 'school-outline',           // 語学・学習参考書
  '001003': 'happy-outline',            // 絵本・児童書
  '001004': 'create-outline',           // 小説・エッセイ
  '001005': 'code-slash-outline',       // パソコン・システム開発
  '001006': 'briefcase-outline',        // ビジネス・経済
  '001007': 'compass-outline',          // 旅行・留学
  '001008': 'globe-outline',            // 人文・思想・社会
  '001009': 'color-palette-outline',    // ホビー・スポーツ・美術
  '001010': 'heart-outline',            // 美容・暮らし・健康
  '001011': 'game-controller-outline',  // エンタメ・ゲーム
  '001012': 'flask-outline',            // 科学・技術
  '001013': 'camera-outline',           // 写真集・タレント
  '001016': 'ribbon-outline',           // 資格・検定
  '001017': 'sparkles-outline',         // ライトノベル
  '001018': 'musical-notes-outline',    // 楽譜
  '001019': 'book-outline',             // 文庫
  '001020': 'document-text-outline',    // 新書
  '001021': 'heart-circle-outline',     // BL
  '001022': 'gift-outline',             // 付録付き
  '001023': 'pricetag-outline',         // バーゲン本
  '001025': 'copy-outline',             // セット本
  '001026': 'calendar-outline',         // カレンダー・手帳
  '001027': 'pencil-outline',           // 文具・雑貨
  '001028': 'medical-outline',          // 医学・薬学
  '001029': 'heart-circle-outline',     // TL
  '__none__': 'help-circle-outline',    // ジャンル未設定
};

/* ── Section header ── */
function SectionHeader({ title }: { title: string }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  );
}

/* ── Main ── */
export default function StatsScreen() {
  const rawBooks = useQuery(api.books.list);
  const books: Doc<'books'>[] = rawBooks ?? [];
  const loading = rawBooks === undefined;

  const [barMode, setBarMode] = useState<'count' | 'price'>('count');

  /* ── Status counts ── */
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const st of STATUSES) counts[st] = 0;
    for (const b of books) counts[b.status] = (counts[b.status] ?? 0) + 1;
    return counts;
  }, [books]);

  /* ── Status price totals ── */
  const statusPrices = useMemo(() => {
    const prices: Record<string, number> = {};
    for (const st of STATUSES) prices[st] = 0;
    for (const b of books) prices[b.status] = (prices[b.status] ?? 0) + (b.price ?? 0);
    return prices;
  }, [books]);

  const total      = books.length;
  const totalPrice = useMemo(() => books.reduce((s, b) => s + (b.price ?? 0), 0), [books]);

  /* ── Pie chart data (price-based segments) ── */
  const pieData = useMemo(() =>
    STATUSES
      .filter((st) => statusCounts[st] > 0)
      .map((st) => ({
        value:   statusPrices[st] > 0 ? statusPrices[st] : 1,
        color:   STATUS_COLOR[st],
        focused: false,
      })),
    [statusCounts, statusPrices],
  );

  /* ── Genre breakdown ── */
  const genreBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; count: number; price: number }>();
    for (const b of books) {
      const topId = getTopGenreId(b.genreId);
      const key   = topId ?? '__none__';
      const name  = topId ? (GENRE_MAP[topId]?.name ?? 'その他') : 'ジャンル未設定';
      const prev  = map.get(key);
      if (prev) {
        prev.count += 1;
        prev.price += b.price ?? 0;
      } else {
        map.set(key, { name, count: 1, price: b.price ?? 0 });
      }
    }
    return Array.from(map.entries())
      .map(([id, data], i) => ({ id, ...data, color: GENRE_COLORS[i % GENRE_COLORS.length] }))
      .sort((a, b) => b.price - a.price);
  }, [books]);

  const genrePieData = useMemo(() =>
    genreBreakdown.map((g) => ({
      value:   g.price > 0 ? g.price : 1,
      color:   g.color,
      focused: false,
    })),
    [genreBreakdown],
  );

  /* ── Monthly bar chart (last 6 months) ── */
  const { barData, barMax } = useMemo(() => {
    const now    = new Date();
    const months: { key: string; label: string; count: number; price: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ key, label: `${d.getMonth() + 1}月`, count: 0, price: 0 });
    }

    for (const b of books) {
      const ts  = b.purchasedAt ? new Date(b.purchasedAt).getTime() : b._creationTime;
      const d   = new Date(ts);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const m   = months.find((x) => x.key === key);
      if (m) { m.count += 1; m.price += b.price ?? 0; }
    }

    const vals = months.map((m) => (barMode === 'count' ? m.count : m.price));
    const max  = Math.max(...vals, 1);

    const data = months.map((m) => ({
      value:         barMode === 'count' ? m.count : m.price,
      label:         m.label,
      frontColor:    C.copper,
      gradientColor: 'rgba(216,138,94,0.3)',
    }));

    return { barData: data, barMax: max };
  }, [books, barMode]);

  /* ── Unread ranking (oldest purchasedAt) ── */
  const unreadRanking = useMemo(() => {
    const today = Date.now();
    return books
      .filter((b: Doc<'books'>) => b.status === 'unread' && (b.purchasedAt || b._creationTime))
      .map((b) => {
        const ts         = b.purchasedAt ? new Date(b.purchasedAt).getTime() : b._creationTime;
        const days       = Math.floor((today - ts) / 86_400_000);
        const wasteScore = Math.floor(days * ((b.price ?? 0) / 1000));
        return { ...b, days, wasteScore };
      })
      .sort((a, b) => b.days - a.days)
      .slice(0, 5);
  }, [books]);

  /* ── Empty state ── */
  if (!loading && total === 0) {
    return (
      <View style={s.root}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <View style={s.header}>
          <Text style={s.headerTitle}>統計</Text>
        </View>
        <View style={s.emptyWrap}>
          <Ionicons name="stats-chart-outline" size={48} color={C.muted} />
          <Text style={s.emptyTitle}>まだデータがありません</Text>
          <Text style={s.emptySub}>本を追加すると統計が表示されます</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={s.headerTitle}>統計</Text>
        {loading ? <Text style={s.loadingText}>読み込み中…</Text> : null}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >
        {/* ── Status breakdown ── */}
        <SectionHeader title="ステータス内訳（冊数・金額）" />
        <View style={[s.card, s.pieSection]}>
          {pieData.length > 0 ? (
            <>
              {/* Donut chart */}
              <PieChart
                data={pieData}
                donut
                radius={58}
                innerRadius={38}
                innerCircleColor={'#131519'}
                centerLabelComponent={() => (
                  <View style={{ alignItems: 'center', gap: 2 }}>
                    <Text style={s.pieCenterSub}>合計</Text>
                    <Text style={s.pieCenterPrice}>
                      ¥{numFmt.format(totalPrice)}
                    </Text>
                  </View>
                )}
              />

              {/* Legend: status / count / price / % */}
              <View style={s.legend}>
                {STATUSES.filter((st) => statusCounts[st] > 0).map((st) => {
                  const pct = totalPrice > 0
                    ? Math.round((statusPrices[st] / totalPrice) * 100)
                    : 0;
                  return (
                    <View key={st} style={s.legendItem}>
                      <View style={[s.legendDot, { backgroundColor: STATUS_COLOR[st] }]} />
                      <Text style={s.legendLabel} numberOfLines={1}>{STATUS_LABEL[st]}</Text>
                      <Text style={s.legendCount}>{statusCounts[st]}冊</Text>
                      <Text style={s.legendPrice}>
                        ¥{numFmt.format(statusPrices[st])}
                      </Text>
                      <Text style={s.legendPct}>{pct}%</Text>
                    </View>
                  );
                })}
              </View>
            </>
          ) : null}
        </View>

        {/* ── Genre breakdown ── */}
        <SectionHeader title="ジャンル内訳（冊数・金額）" />
        <View style={[s.card, s.genrePieColumn]}>
          {genreBreakdown.length > 0 ? (
            <>
              <PieChart
                data={genrePieData}
                donut
                radius={58}
                innerRadius={38}
                innerCircleColor={'#131519'}
                centerLabelComponent={() => (
                  <View style={{ alignItems: 'center', gap: 2 }}>
                    <Text style={s.pieCenterSub}>合計</Text>
                    <Text style={s.pieCenterPrice}>¥{numFmt.format(totalPrice)}</Text>
                  </View>
                )}
              />
              <View style={s.genreLegendFull}>
                {genreBreakdown.map((g) => {
                  const pct  = totalPrice > 0 ? Math.round((g.price / totalPrice) * 100) : 0;
                  const icon = (GENRE_ICON[g.id] ?? 'bookmark-outline') as any;
                  return (
                    <View key={g.id} style={s.genreLegendRow}>
                      <View style={[s.genreLegendIconWrap, { backgroundColor: g.color + '28' }]}>
                        <Ionicons name={icon} size={14} color={g.color} />
                      </View>
                      <View style={s.genreLegendContent}>
                        <Text style={s.genreLegendName}>{g.name}</Text>
                        <View style={s.genreLegendStats}>
                          <Text style={s.genreLegendCount}>{g.count}冊</Text>
                          <Text style={s.genreLegendDot}>·</Text>
                          <Text style={s.genreLegendPrice}>¥{numFmt.format(g.price)}</Text>
                          <Text style={s.genreLegendDot}>·</Text>
                          <Text style={s.genreLegendPct}>{pct}%</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          ) : (
            <Text style={s.genreEmpty}>ジャンル情報のある本がありません</Text>
          )}
        </View>

        {/* ── Monthly bar chart ── */}
        <View style={s.sectionHeaderRow}>
          <SectionHeader title="月別推移" />
          <View style={s.toggle}>
            <TouchableOpacity
              style={[s.toggleBtn, barMode === 'count' && s.toggleBtnActive]}
              onPress={() => setBarMode('count')}
            >
              <Text style={[s.toggleText, barMode === 'count' && s.toggleTextActive]}>冊数</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.toggleBtn, barMode === 'price' && s.toggleBtnActive]}
              onPress={() => setBarMode('price')}
            >
              <Text style={[s.toggleText, barMode === 'price' && s.toggleTextActive]}>金額</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={[s.card, s.barSection]}>
          <BarChart
            data={barData}
            barWidth={34}
            spacing={14}
            maxValue={Math.ceil(barMax * 1.25)}
            noOfSections={4}
            barBorderRadius={6}
            frontColor={C.copper}
            gradientColor={'rgba(216,138,94,0.25)'}
            showGradient
            xAxisColor={'rgba(255,255,255,0.10)'}
            yAxisColor={'rgba(255,255,255,0.10)'}
            xAxisLabelTextStyle={{ color: C.muted, fontSize: 10 }}
            yAxisTextStyle={{ color: C.muted, fontSize: 10 }}
            rulesColor={'rgba(255,255,255,0.05)'}
            backgroundColor={C.card}
            labelWidth={36}
            yAxisTextNumberOfLines={1}
            formatYLabel={(v) =>
              barMode === 'price' && Number(v) >= 1000
                ? `${Math.round(Number(v) / 1000)}k`
                : String(v)
            }
          />
        </View>

        {/* ── Unread ranking ── */}
        {unreadRanking.length > 0 ? (
          <>
            <View style={s.sectionHeaderRow}>
              <SectionHeader title="積読ランキング" />
              <Text style={s.rankHeaderHint}>勿体ない度順</Text>
            </View>
            <View style={s.card}>
              {unreadRanking.map((b, i) => (
                <View key={b._id} style={[s.rankRow, i > 0 && s.rankRowBorder]}>
                  <Text style={s.rankNum}>{i + 1}</Text>
                  {b.coverUrl ? (
                    <Image source={{ uri: b.coverUrl }} style={s.rankCover} contentFit="cover" transition={0} />
                  ) : (
                    <View style={[s.rankCover, s.rankCoverBlank]}>
                      <Ionicons name="book-outline" size={16} color={C.muted} />
                    </View>
                  )}
                  <View style={s.rankInfo}>
                    <Text style={s.rankTitle} numberOfLines={2}>{b.title}</Text>
                    {b.author ? (
                      <Text style={s.rankAuthor} numberOfLines={1}>{b.author}</Text>
                    ) : null}
                    <View style={s.rankMetaRow}>
                      {b.price != null ? (
                        <Text style={s.rankPrice}>¥{numFmt.format(b.price)}</Text>
                      ) : null}
                      <Text style={s.rankDot}>·</Text>
                      <Text style={s.rankDaysInline}>{b.days}日</Text>
                    </View>
                  </View>
                  {b.wasteScore > 0 ? (
                    <View style={s.wasteWrap}>
                      <Text style={s.wasteScore}>{b.wasteScore}</Text>
                      <Text style={s.wasteLabel}>勿体ない度</Text>
                    </View>
                  ) : (
                    <View style={s.rankDaysWrap}>
                      <Text style={s.rankDays}>{b.days}</Text>
                      <Text style={s.rankDaysUnit}>日</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

/* ── Styles ── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 28, fontWeight: '600', color: C.ink, letterSpacing: 0.3 },
  loadingText: { fontSize: 12, color: C.muted },

  scrollContent: { paddingHorizontal: 16, paddingBottom: 120 },

  /* section */
  sectionHeader: { marginTop: 24, marginBottom: 10 },
  sectionTitle:  { fontSize: 13, fontWeight: '600', color: C.muted, letterSpacing: 0.8, textTransform: 'uppercase' },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 10 },

  /* toggle */
  toggle: { flexDirection: 'row', backgroundColor: C.card, borderRadius: 8, borderWidth: 1, borderColor: C.line, overflow: 'hidden' },
  toggleBtn: { paddingHorizontal: 14, paddingVertical: 6 },
  toggleBtnActive: { backgroundColor: C.copper + '22' },
  toggleText: { fontSize: 12, fontWeight: '500', color: C.muted },
  toggleTextActive: { color: C.copper },

  /* card base */
  card: {
    backgroundColor: '#131519',
    borderRadius: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },

  /* pie — horizontal layout: chart left, legend right */
  pieSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 10,
    gap: 8,
  },
  pieCenterSub:   { fontSize: 10, color: '#FFFFFF', fontWeight: '500', letterSpacing: 0.3 },
  pieCenterPrice: { fontSize: 11, fontWeight: '700', color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  legend: { flex: 1, gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  legendDot:  { width: 11, height: 11, borderRadius: 6, flexShrink: 0 },
  legendLabel: { flex: 1, fontSize: 14, color: C.ink2 },
  legendCount: {
    fontSize: 13, fontWeight: '600', color: C.ink,
    fontVariant: ['tabular-nums'], minWidth: 28, textAlign: 'right',
  },
  legendPrice: {
    fontSize: 12, color: C.copper,
    fontVariant: ['tabular-nums'], minWidth: 58, textAlign: 'right',
  },
  legendPct: {
    fontSize: 13, fontWeight: '600', color: C.muted,
    fontVariant: ['tabular-nums'], minWidth: 30, textAlign: 'right',
  },

  genreEmpty: { fontSize: 13, color: C.muted, padding: 20 },

  /* genre breakdown — column layout */
  genrePieColumn: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 20,
  },
  genreLegendFull:  { width: '100%', gap: 14 },
  genreLegendRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  genreLegendIconWrap: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  genreLegendContent: { flex: 1, gap: 3 },
  genreLegendName:  { fontSize: 13, fontWeight: '500', color: C.ink2 },
  genreLegendStats: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  genreLegendCount: { fontSize: 11, color: C.muted, fontVariant: ['tabular-nums'] },
  genreLegendDot:   { fontSize: 11, color: C.muted },
  genreLegendPrice: { fontSize: 11, color: C.copper, fontVariant: ['tabular-nums'] },
  genreLegendPct:   { fontSize: 11, fontWeight: '600', color: C.muted, fontVariant: ['tabular-nums'] },

  /* bar */
  barSection: { padding: 16 },

  /* unread ranking */
  rankHeaderHint: { fontSize: 11, color: C.muted },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  rankRowBorder: { borderTopWidth: 1, borderTopColor: C.line },
  rankNum: { fontSize: 15, fontWeight: '700', color: C.muted, width: 18, textAlign: 'center' },
  rankCover: { width: 40, height: 57, borderRadius: 6, flexShrink: 0 },
  rankCoverBlank: { backgroundColor: '#1C1F2A', alignItems: 'center', justifyContent: 'center' },
  rankInfo: { flex: 1, gap: 3 },
  rankTitle: { fontSize: 13, fontWeight: '600', color: C.ink, lineHeight: 18 },
  rankAuthor: { fontSize: 11, color: C.muted },
  rankMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rankPrice: { fontSize: 11, color: C.copper, fontVariant: ['tabular-nums'] },
  rankDot: { fontSize: 11, color: C.muted },
  rankDaysInline: { fontSize: 11, color: C.muted, fontVariant: ['tabular-nums'] },
  rankDaysWrap: { alignItems: 'flex-end' },
  rankDays: { fontSize: 20, fontWeight: '700', color: C.rose, fontVariant: ['tabular-nums'] },
  rankDaysUnit: { fontSize: 10, color: C.muted },
  wasteWrap: { alignItems: 'flex-end', gap: 2 },
  wasteScore: { fontSize: 18, fontWeight: '700', color: C.rose, fontVariant: ['tabular-nums'] },
  wasteLabel: { fontSize: 9, color: C.muted },

  /* empty */
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 80 },
  emptyTitle: { fontSize: 16, fontWeight: '500', color: C.ink2 },
  emptySub:   { fontSize: 13, color: C.muted, textAlign: 'center' },
});
