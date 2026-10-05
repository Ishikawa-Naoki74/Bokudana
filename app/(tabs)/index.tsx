import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

/* ── Design tokens ── */
const C = {
  bg:      '#0A0B0E',
  bg2:     '#0E0F13',
  card:    '#161820',
  card2:   '#1B1E27',
  line:    'rgba(255,255,255,0.07)',
  ink:     '#ECE6DB',
  ink2:    '#C9C2B4',
  muted:   '#807C73',
  copper:  '#D88A5E',
  copper2: '#B86A3F',
  green:   '#6FBF8F',
  rose:    '#E27387',
};

const numFmt = new Intl.NumberFormat('ja-JP');

/* ── SVG-like icons via Ionicons ── */
function MenuIcon() {
  return <Ionicons name="menu-outline" size={26} color={C.ink} />;
}
function BellIcon() {
  return <Ionicons name="notifications-outline" size={24} color={C.copper} />;
}

/* ── Image (right of money card) ── */
function MoneyCardImage() {
  return (
    <Image
      source={require('@/assets/images/books-total-price.png')}
      style={s.moneyCardImage}
      contentFit="contain"
    />
  );
}

/* ── Status card ── */
type StatusCardProps = {
  image: any;
  label: string;
  value: number;
  progressColor: string;
};
function StatusCard({ image, label, value, progressColor }: StatusCardProps) {
  return (
    <View style={s.statusCard}>
      <Image source={image} style={s.illuImg} contentFit="contain" />
      <View style={s.statusBottom}>
        <Text style={s.statusLbl}>{label}</Text>
        <Text style={[s.statusVal, { color: progressColor }]}>
          {value}
          <Text style={s.statusUnit}>冊</Text>
        </Text>
      </View>
    </View>
  );
}

/* ── Main ── */
export default function HomeScreen() {
  const { user } = useUser();
  const { width: screenWidth } = useWindowDimensions();
  // 横幅いっぱい・縦は画面の約1.1倍（本棚や椅子が見える高さ）
  const imgHeight = Math.round(screenWidth * 1.1);
  const stats       = useQuery(api.books.stats);
  const recentBooks = useQuery(api.books.recent, { limit: 4 });

  const firstName   = user?.firstName ?? 'Haru';
  const totalPrice  = stats?.totalPrice ?? 0;
  const total       = stats?.total   ?? 0;
  const done        = stats?.done    ?? 0;
  const reading     = stats?.reading ?? 0;
  const unread      = stats?.unread  ?? 0;

  const animatedPrice = useSharedValue(0);
  useEffect(() => {
    animatedPrice.value = withTiming(totalPrice, {
      duration: 1400,
      easing: Easing.out(Easing.cubic),
    });
  }, [totalPrice]);

  const priceText = useDerivedValue(() =>
    Math.round(animatedPrice.value)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ','),
  );
  const animatedPriceProps = useAnimatedProps(() => ({
    text: priceText.value,
    defaultValue: priceText.value,
  }));

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── 背景画像（ステータスバー〜合計金額カード中央まで） ── */}
      <Image
        source={require('@/assets/images/top-bg.png')}
        style={[s.topBgImage, { width: screenWidth, height: imgHeight }]}
        contentFit="cover"
        contentPosition="top"
      />
      <LinearGradient
        colors={['rgba(10,11,14,0)', 'rgba(10,11,14,0)', 'rgba(10,11,14,0.82)', 'rgba(10,11,14,1)']}
        locations={[0, 0.38, 0.70, 1]}
        style={[s.topBgGradient, { height: imgHeight }]}
      />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top bar ── */}
        <View style={s.topbar}>
          <MenuIcon />
          <Text style={s.brand}>Booklog</Text>
          <BellIcon />
        </View>

        {/* ── Greeting + hero photo ── */}
        <View style={s.greetWrap}>
          {/* hero image (right side, large) */}
          <View style={s.heroPhotoWrap} pointerEvents="none">
            <Image
              source={require('@/assets/images/cabin.png')}
              style={s.heroPhoto}
              contentFit="contain"
            />
          </View>

          <View style={s.greetLineRow}>
            <Text style={s.greetLine}>おはようございます、{firstName}</Text>
            <Ionicons name="sunny-outline" size={13} color="#E5C58A" />
          </View>
        </View>

        {/* ── Section ── */}
        <View style={s.sectionWrap}>

          {/* Money card */}
          <View style={[s.card, s.moneyCard]}>
            <View style={{ flex: 1 }}>
              <Text style={s.moneyLabel}>登録している本の合計金額</Text>
              <View style={s.moneyAmountRow}>
                <Text style={s.moneyYen}>¥</Text>
                <AnimatedTextInput
                  animatedProps={animatedPriceProps}
                  editable={false}
                  style={s.moneyAmount}
                />
              </View>
              <View style={s.moneySub}>
                <Ionicons name="book-outline" size={13} color={C.muted} />
                <Text style={s.moneySubText}>
                  登録した本 <Text style={s.moneySubN}>{total}</Text> 冊
                </Text>
              </View>
            </View>
            <MoneyCardImage />
          </View>

          {/* Status row */}
          <View style={s.statusRow}>
            <StatusCard
              image={require('@/assets/images/book-complete.png')}
              label="読了"
              value={done}
              progressColor={C.green}
            />
            <StatusCard
              image={require('@/assets/images/book-reading.png')}
              label="読書中"
              value={reading}
              progressColor={C.copper}
            />
            <StatusCard
              image={require('@/assets/images/book-want-to-read.png')}
              label="読みたい"
              value={unread}
              progressColor={C.rose}
            />
          </View>

          {/* Monthly card */}
          <View style={[s.card, s.monthCard]}>
            <Text style={s.cardHeader}>今月の読書記録</Text>
            <View style={s.monthRow}>
              <View style={s.monthStat}>
                <Text style={s.monthLbl}>今月の読了冊数</Text>
                <View style={s.monthBody}>
                  <View style={s.monthIc}>
                    <Image
                      source={require('@/assets/images/book-complete.png')}
                      style={s.monthIcImg}
                      contentFit="contain"
                    />
                  </View>
                  <Text style={s.monthVal}>
                    {done}
                    <Text style={s.monthUnit}>冊</Text>
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Summary card */}
          <View style={[s.card, s.summaryCard]}>
            <View style={s.summaryHead}>
              <Text style={s.cardHeader}>読書データサマリー</Text>
              <Text style={s.summaryTag}>（全期間）</Text>
            </View>
            <View style={s.summaryStats}>
              <View style={s.summaryStat}>
                <View style={s.summaryIc}>
                  <Ionicons name="library-outline" size={22} color={C.copper} />
                </View>
                <View style={s.summaryText}>
                  <Text style={s.summaryLbl}>読了冊数</Text>
                  <Text style={s.summaryVal}>
                    {done}<Text style={s.summaryUnit}>冊</Text>
                  </Text>
                </View>
              </View>
              <View style={s.summaryStat}>
                <View style={s.summaryIc}>
                  <Ionicons name="book-outline" size={22} color={C.copper} />
                </View>
                <View style={s.summaryText}>
                  <Text style={s.summaryLbl}>総ページ数</Text>
                  <Text style={s.summaryVal}>
                    —<Text style={s.summaryUnit}>p</Text>
                  </Text>
                </View>
              </View>
              <View style={s.summaryStat}>
                <View style={s.summaryIc}>
                  <Ionicons name="time-outline" size={22} color={C.copper} />
                </View>
                <View style={s.summaryText}>
                  <Text style={s.summaryLbl}>読書時間</Text>
                  <Text style={s.summaryVal}>
                    —<Text style={s.summaryUnit}>h</Text>
                  </Text>
                </View>
              </View>
            </View>
            <Pressable style={s.summaryCta}>
              <Text style={s.summaryCtaText}>詳細な統計を見る</Text>
              <Ionicons name="chevron-forward" size={14} color={C.ink2} />
            </Pressable>
          </View>

          {/* Recent books */}
          <View style={s.recent}>
            <View style={s.recentHead}>
              <Text style={s.recentTitle}>最近読んだ本</Text>
              <Pressable style={s.recentMore}>
                <Text style={s.recentMoreText}>もっと見る</Text>
                <Ionicons name="chevron-forward" size={11} color={C.muted} />
              </Pressable>
            </View>
            <View style={s.bookRow}>
              {recentBooks && recentBooks.length > 0
                ? recentBooks.slice(0, 4).map((book) => (
                    <View key={book._id} style={s.bookCard}>
                      {book.coverUrl ? (
                        <Image
                          source={{ uri: book.coverUrl }}
                          style={s.bookCover}
                          contentFit="cover"
                        />
                      ) : (
                        <View style={[s.bookCover, s.bookCoverBlank]}>
                          <Text style={s.bookCoverBlankText} numberOfLines={4}>
                            {book.title}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))
                : (
                  <View style={s.emptyBooks}>
                    <Text style={s.emptyText}>まだ本が登録されていません</Text>
                    <Text style={s.emptySubText}>検索タブから追加してみましょう</Text>
                  </View>
                )
              }
            </View>
          </View>

        </View>
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  /* background image layer */
  topBgImage: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
  },
  topBgGradient: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
  },

  /* top bar */
  topbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 22, paddingTop: 56, paddingBottom: 10,
  },
  brand: {
    fontSize: 22, fontWeight: '500', color: C.ink,
    letterSpacing: 1.5, fontStyle: 'italic',
  },

  /* greeting */
  greetWrap: {
    paddingHorizontal: 22, paddingTop: 14, paddingBottom: 30,
    minHeight: 260, overflow: 'visible', zIndex: 2,
  },
  heroPhotoWrap: {
    position: 'absolute', right: -20, top: -50, bottom: -90,
    width: 340,
  },
  heroPhoto: {
    width: '100%', height: '100%',
  },
  greetLineRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 14,
  },
  greetLine: {
    fontSize: 12, color: C.ink2, fontWeight: '400',
  },
  greetTitle: {
    fontSize: 26, fontWeight: '400', color: C.ink,
    lineHeight: 40, letterSpacing: 0.5,
  },
  greetHl: { color: C.copper, fontWeight: '500' },

  /* section */
  sectionWrap: { paddingHorizontal: 16, marginTop: -60, zIndex: 1 },

  /* card base */
  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.line,
  },

  /* money card */
  moneyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 20, marginTop: 6,
  },
  moneyLabel: { fontSize: 12, color: C.ink2, fontWeight: '400', marginBottom: 10 },
  moneyAmountRow: {
    flexDirection: 'row', alignItems: 'baseline', gap: 2,
  },
  moneyAmount: {
    fontSize: 36, fontWeight: '500', color: C.ink,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
    padding: 0, minWidth: 80,
  },
  moneyYen: { fontWeight: '400', fontSize: 30, color: C.ink },
  moneySub: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12,
  },
  moneySubText: { fontSize: 12, color: C.muted, fontWeight: '400' },
  moneySubN: { fontWeight: '500' },
  moneyCardImage: {
    width: 100, height: 100,
    flexShrink: 0,　
  },

  /* status row */
  statusRow: {
    flexDirection: 'row', gap: 8, marginTop: 10,
  },
  statusCard: {
    flex: 1, backgroundColor: C.card,
    borderWidth: 1, borderColor: C.line,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
  },
  illuImg: { width: '100%', height: 100 },
  statusBottom: {
    width: '100%',
    paddingHorizontal: 8, paddingBottom: 8, paddingTop: 0,
    alignItems: 'center',
  },
  statusLbl: { fontSize: 11, color: C.muted, fontWeight: '500', marginBottom: 1 },
  statusVal: {
    fontSize: 17, fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  statusUnit: { fontSize: 10, fontWeight: '400', color: C.ink2 },

  /* monthly */
  monthCard: { padding: 18, marginTop: 10 },
  cardHeader: { fontSize: 14, fontWeight: '500', color: C.ink, marginBottom: 14 },
  monthRow: {
    flexDirection: 'row', gap: 6, alignItems: 'flex-end',
  },
  monthStat: { flex: 1 },
  monthLbl: { fontSize: 11, color: C.ink2, fontWeight: '400', marginBottom: 8 },
  monthBody: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  monthIc: { width: 56, height: 52, alignItems: 'center', justifyContent: 'center' },
  monthIcImg: { width: '100%', height: '100%' },
  monthVal: {
    fontSize: 22, fontWeight: '500', color: C.ink,
    fontVariant: ['tabular-nums'], letterSpacing: 0.5,
  },
  monthUnit: { fontSize: 11, fontWeight: '400', color: C.ink2, marginLeft: 1 },
  /* summary */
  summaryCard: { padding: 18, marginTop: 10 },
  summaryHead: {
    flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 16,
  },
  summaryTag: { fontSize: 12, color: C.copper, fontWeight: '500' },
  summaryStats: {
    flexDirection: 'row', gap: 6,
  },
  summaryStat: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  summaryIc: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  summaryText: { flexDirection: 'column', gap: 3, flex: 1 },
  summaryLbl: { fontSize: 10.5, color: C.ink2, fontWeight: '400' },
  summaryVal: {
    fontSize: 18, fontWeight: '500', color: C.ink,
    fontVariant: ['tabular-nums'], letterSpacing: 0.5,
  },
  summaryUnit: { fontSize: 10, fontWeight: '400', color: C.ink2, marginLeft: 1 },
  summaryCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 16, padding: 12, paddingHorizontal: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 12,
  },
  summaryCtaText: { flex: 1, textAlign: 'center', marginLeft: 14, fontSize: 12.5, color: C.ink },

  /* recent */
  recent: { marginTop: 18, paddingHorizontal: 4 },
  recentHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 2, paddingBottom: 12,
  },
  recentTitle: { fontSize: 14, fontWeight: '500', color: C.ink },
  recentMore: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  recentMoreText: { fontSize: 11, color: C.muted, fontWeight: '400' },
  bookRow: { flexDirection: 'row', gap: 8 },
  bookCard: { flex: 1 },

  /* book covers */
  bookCover: {
    aspectRatio: 5 / 7, borderRadius: 6,
    overflow: 'hidden',
    boxShadow: '0 10px 18px rgba(0, 0, 0, 0.5)',
  },
  bookCoverBlank: {
    backgroundColor: '#222',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center', padding: 8,
  },
  bookCoverBlankText: { fontSize: 11, color: C.muted, textAlign: 'center', lineHeight: 16 },

  emptyBooks: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 32, gap: 6,
  },
  emptyText: { fontSize: 13, color: C.muted, fontWeight: '500' },
  emptySubText: { fontSize: 11, color: C.muted },
});
