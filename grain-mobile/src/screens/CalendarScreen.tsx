/* ASCII PREAMBLE to avoid tooling UTF-8 slicing issue: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { RootStackParamList } from '../navigation/RootNavigator';
import { Screen } from '../components/Screen';
import { colors, radius, spacing } from '../theme';
import { getLocalDayKey } from '../utils/day';
import { useAppState } from '../state/AppState';

type Props = NativeStackScreenProps<RootStackParamList, 'Calendar'>;

function getLastDays(count: number): string[] {
  const days: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(getLocalDayKey(d));
  }
  return days;
}

export function CalendarScreen({ navigation }: Props) {
  const { viewedByDay } = useAppState();

  const days = useMemo(() => getLastDays(14), []);

  return (
    <Screen style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>返回</Text>
        </Pressable>
        <Text style={styles.hTitle}>学习日历</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.tip}>
        <Text style={styles.tipText}>MVP口径：当天首次打开的知识卡（去重）= 今日新知识量。</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        {days.map((day) => {
          const count = (viewedByDay[day] ?? []).length;
          return (
            <View key={day} style={styles.row}>
              <Text style={styles.day}>{day}</Text>
              <View style={[styles.badge, count > 0 && styles.badgeOn]}>
                <Text style={[styles.badgeText, count > 0 && styles.badgeTextOn]}>{count}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </Screen>
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
  tip: {
    marginTop: spacing.m,
    padding: spacing.m,
    backgroundColor: colors.panel,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.line,
  },
  tipText: { color: colors.muted, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  row: {
    marginTop: spacing.m,
    padding: spacing.l,
    backgroundColor: colors.panel,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  day: { color: colors.text, fontSize: 14, fontWeight: '800' },
  badge: {
    minWidth: 36,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
  },
  badgeOn: { borderColor: 'rgba(53,208,127,0.5)' },
  badgeText: { color: colors.muted2, fontSize: 12, fontWeight: '900' },
  badgeTextOn: { color: colors.green },
});

