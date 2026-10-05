import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const BG2     = '#0E0F13';
const COPPER  = '#D88A5E';
const MUTED   = '#6E6A62';
const INK     = '#ECE6DB';

type TabItem = {
  name:   string;
  href:   string | null;
  icon:   keyof typeof Ionicons.glyphMap;
  iconOn: keyof typeof Ionicons.glyphMap;
  label:  string | null;
};

const TABS: TabItem[] = [
  { name: 'index',  href: '/(tabs)',       icon: 'home-outline',        iconOn: 'home',         label: 'ホーム'     },
  { name: 'shelf',  href: '/(tabs)/shelf', icon: 'library-outline',     iconOn: 'library',      label: '本棚'       },
  { name: '_add',   href: null,            icon: 'add',                 iconOn: 'add',           label: null        },
  { name: 'stats',  href: '/(tabs)/stats', icon: 'stats-chart-outline', iconOn: 'stats-chart',  label: '統計'       },
  { name: 'mypage', href: '/(tabs)/mypage',icon: 'person-outline',      iconOn: 'person',        label: 'マイページ' },
];

function TabBar() {
  const pathname = usePathname();
  const router   = useRouter();

  const isActive = (name: string) => {
    if (name === 'index') return pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/index';
    return pathname.includes(name);
  };

  return (
    <View style={s.bar}>
      {TABS.map((tab) => {
        if (tab.name === '_add') {
          return (
            <View key="_add" style={s.fabSlot}>
              <Pressable
                style={s.fab}
                onPress={() => router.push('/(tabs)/search')}
              >
                <Text style={s.fabPlus}>+</Text>
              </Pressable>
            </View>
          );
        }

        const on = isActive(tab.name);
        return (
          <Pressable
            key={tab.name}
            style={s.tabItem}
            onPress={() => tab.href && router.replace(tab.href as any)}
          >
            <Ionicons
              name={on ? tab.iconOn : tab.icon}
              size={24}
              color={on ? COPPER : MUTED}
            />
            {tab.label ? (
              <Text style={[s.tabLabel, on && s.tabLabelOn]}>
                {tab.label}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <View style={s.root}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0A0B0E' } }}>
        <Stack.Screen name="index"  />
        <Stack.Screen name="shelf"  />
        <Stack.Screen name="search" />
      </Stack>
      <TabBar />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0B0E' },

  bar: {
    position:   'absolute',
    bottom:     0, left: 0, right: 0,
    height:     84,
    backgroundColor: BG2,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    flexDirection:  'row',
    justifyContent: 'space-around',
    alignItems:     'flex-start',
    paddingTop:     12,
    paddingBottom:  24,
  },
  tabItem: {
    flex: 1,
    alignItems:     'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabLabel: {
    fontSize: 10.5, fontWeight: '400', color: MUTED, marginTop: 2,
  },
  tabLabelOn: {
    color: COPPER, fontWeight: '500',
  },

  /* FAB */
  fabSlot: {
    flex: 0, width: 70,
    alignItems: 'center',
    position: 'relative',
  },
  fab: {
    position:   'absolute',
    top:        -22,
    width:      58, height: 58,
    borderRadius: 29,
    backgroundColor: '#8C5634',
    alignItems:     'center',
    justifyContent: 'center',
    boxShadow: '0 8px 18px rgba(140, 86, 52, 0.5)',
    borderWidth:    4,
    borderColor:    BG2,
  },
  fabPlus: {
    fontSize: 30, fontWeight: '300', color: '#fff', lineHeight: 34,
  },
});
