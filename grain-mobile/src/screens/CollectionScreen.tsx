/* ASCII PREAMBLE to avoid tooling UTF-8 slicing issue: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { RootStackParamList } from '../navigation/RootNavigator';
import { GrainButton } from '../components/GrainButton';
import { Screen } from '../components/Screen';
import { colors, radius, spacing } from '../theme';
import { NODE_TYPES } from '../data/demoContent';
import { getCountryName, useAppState } from '../state/AppState';
import type { KnowledgeCard } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Collection'>;

export function CollectionScreen({ navigation }: Props) {
  const { collectedCardsById, toggleCollect } = useAppState();

  const cards = useMemo(() => {
    const list = Object.values(collectedCardsById) as KnowledgeCard[];
    const order = new Map(NODE_TYPES.map((n, i) => [n.id, i]));
    list.sort((a, b) => {
      if (a.countryId !== b.countryId) return a.countryId.localeCompare(b.countryId);
      return (order.get(a.nodeTypeId) ?? 0) - (order.get(b.nodeTypeId) ?? 0);
    });
    return list;
  }, [collectedCardsById]);

  return (
    <Screen style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>返回</Text>
        </Pressable>
        <Text style={styles.hTitle}>收藏夹</Text>
        <View style={{ width: 60 }} />
      </View>

      {cards.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>还没有收藏</Text>
          <Text style={styles.emptyBody}>在知识卡页点“收藏”，这里会沉淀起来，支持离线查看（MVP本地存储）。</Text>
          <GrainButton label="去看知识卡" variant="primary" onPress={() => navigation.navigate('Cards')} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
          {cards.map((c) => (
            <Pressable
              key={c.cardId}
              onPress={() => navigation.navigate('CardDetail', { cardId: c.cardId })}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.9 }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{c.title}</Text>
                <Text style={styles.rowMeta}>
                  {getCountryName(c.countryId)} · {NODE_TYPES.find((n) => n.id === c.nodeTypeId)?.label ?? c.nodeTypeId}
                </Text>
              </View>
              <Pressable
                onPress={() => toggleCollect(c)}
                style={({ pressed }) => [styles.uncollect, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.uncollectText}>取消</Text>
              </Pressable>
            </Pressable>
          ))}
        </ScrollView>
      )}
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
  row: {
    marginTop: spacing.m,
    padding: spacing.l,
    backgroundColor: colors.panel,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  rowMeta: { marginTop: 6, color: colors.muted, fontSize: 12, fontWeight: '700' },
  uncollect: {
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.m,
    borderRadius: radius.m,
    backgroundColor: 'rgba(255,90,90,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,90,90,0.35)',
  },
  uncollectText: { color: colors.red, fontSize: 12, fontWeight: '900' },
  empty: {
    marginTop: spacing.xl,
    padding: spacing.xl,
    backgroundColor: colors.panel,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.m,
    alignItems: 'center',
  },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  emptyBody: { color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center', fontWeight: '600' },
});
