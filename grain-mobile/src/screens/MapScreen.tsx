/* ASCII PREAMBLE to avoid tooling UTF-8 slicing issue: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { RootStackParamList } from '../navigation/RootNavigator';
import { Screen } from '../components/Screen';
import { colors, radius, spacing } from '../theme';
import { COUNTRIES } from '../data/demoContent';
import { useAppState } from '../state/AppState';

type Props = NativeStackScreenProps<RootStackParamList, 'Map'>;

export function MapScreen({ navigation }: Props) {
  const { exploredCountryIds, collectedCardsById } = useAppState();
  const [mode, setMode] = useState<'explored' | 'collected'>('explored');

  const collectedCountryIds = useMemo(() => {
    const set = new Set<string>();
    for (const card of Object.values(collectedCardsById)) set.add(card.countryId);
    return set;
  }, [collectedCardsById]);

  const activeSet = mode === 'explored' ? exploredCountryIds : collectedCountryIds;

  return (
    <Screen style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>返回</Text>
        </Pressable>
        <Text style={styles.hTitle}>地图（MVP）</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.switchRow}>
        <Pressable
          onPress={() => setMode('explored')}
          style={[styles.switchBtn, mode === 'explored' && styles.switchBtnOn]}
        >
          <Text style={[styles.switchText, mode === 'explored' && styles.switchTextOn]}>
            已探索（{exploredCountryIds.size}）
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setMode('collected')}
          style={[styles.switchBtn, mode === 'collected' && styles.switchBtnOn]}
        >
          <Text style={[styles.switchText, mode === 'collected' && styles.switchTextOn]}>
            已收藏（{collectedCountryIds.size}）
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        {COUNTRIES.map((c) => {
          const active = activeSet.has(c.id);
          return (
            <View key={c.id} style={[styles.row, active && styles.rowOn]}>
              <Text style={styles.rowName}>{c.name}</Text>
              <Text style={[styles.rowMark, active && styles.rowMarkOn]}>{active ? 'OK' : '—'}</Text>
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
  switchRow: {
    marginTop: spacing.m,
    flexDirection: 'row',
    gap: spacing.m,
  },
  switchBtn: {
    flex: 1,
    paddingVertical: spacing.m,
    borderRadius: radius.l,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
  },
  switchBtnOn: {
    backgroundColor: colors.blue,
    borderColor: 'transparent',
  },
  switchText: { color: colors.text, fontSize: 12, fontWeight: '900' },
  switchTextOn: { color: '#fff' },
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
  rowOn: {
    borderColor: 'rgba(53,208,127,0.5)',
    backgroundColor: 'rgba(53,208,127,0.08)',
  },
  rowName: { color: colors.text, fontSize: 14, fontWeight: '800' },
  rowMark: { color: colors.muted2, fontSize: 16, fontWeight: '900' },
  rowMarkOn: { color: colors.green },
});
