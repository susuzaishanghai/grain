/* ASCII PREAMBLE to avoid tooling UTF-8 slicing issue: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { RootStackParamList } from '../navigation/RootNavigator';
import { GrainButton } from '../components/GrainButton';
import { Screen } from '../components/Screen';
import { colors, radius, spacing } from '../theme';
import { getCountryName, useAppState } from '../state/AppState';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export function ProfileScreen({ navigation }: Props) {
  const { stats, session } = useAppState();

  return (
    <Screen style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>返回</Text>
        </Pressable>
        <Text style={styles.hTitle}>我的</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <View style={styles.statsGrid}>
          <StatCard label="今日新知识卡" value={String(stats.dailyNewCards)} />
          <StatCard label="已探索国家" value={String(stats.exploredCountries)} />
          <StatCard label="已收藏卡片" value={String(stats.collectedCards)} />
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>当前会话</Text>
          <Text style={styles.panelBody}>
            {session.objectName} · {session.categoryName}
          </Text>
          <Text style={styles.panelBody}>
            {getCountryName(session.countryA)} vs {getCountryName(session.countryB)}
          </Text>
          <View style={styles.panelActions}>
            <GrainButton label="继续对话" variant="primary" onPress={() => navigation.navigate('Dialogue')} />
            <GrainButton label="知识卡" variant="ghost" onPress={() => navigation.navigate('Cards')} />
          </View>
        </View>

        <View style={styles.navGrid}>
          <GrainButton label="收藏夹" variant="default" onPress={() => navigation.navigate('Collection')} />
          <GrainButton label="日历" variant="default" onPress={() => navigation.navigate('Calendar')} />
          <GrainButton label="地图" variant="default" onPress={() => navigation.navigate('Map')} />
          <GrainButton label="API 设置" variant="default" onPress={() => navigation.navigate('ApiSettings')} />
          <GrainButton label="重新拍照" variant="ghost" onPress={() => navigation.navigate('Camera')} />
        </View>
      </ScrollView>
    </Screen>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: spacing.l,
    paddingBottom: spacing.xl,
  },
  header: {
    paddingTop: spacing.l,
    paddingBottom: spacing.m,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.m,
  },
  headerBtn: {
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.m,
    borderRadius: radius.m,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
  },
  headerBtnText: { color: colors.text, fontSize: 12, fontWeight: '800' },
  hTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.m,
    marginTop: spacing.m,
  },
  statCard: {
    flexGrow: 1,
    minWidth: 140,
    padding: spacing.l,
    backgroundColor: colors.panel,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.s,
  },
  statValue: { color: colors.text, fontSize: 28, fontWeight: '900' },
  statLabel: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  panel: {
    marginTop: spacing.l,
    padding: spacing.l,
    backgroundColor: colors.panel,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.s,
  },
  panelTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  panelBody: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  panelActions: {
    marginTop: spacing.m,
    flexDirection: 'row',
    gap: spacing.m,
    justifyContent: 'space-between',
  },
  navGrid: {
    marginTop: spacing.l,
    gap: spacing.m,
  },
});
