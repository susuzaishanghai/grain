/* ASCII PREAMBLE to avoid tooling UTF-8 slicing issue: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { RootStackParamList } from '../navigation/RootNavigator';
import { Screen } from '../components/Screen';
import { colors, radius, spacing } from '../theme';
import { NODE_TYPES } from '../data/demoContent';
import { getCountryName, useAppState } from '../state/AppState';
import type { KnowledgeCard, NodeTypeId } from '../types';
import { GrainButton } from '../components/GrainButton';

type Props = NativeStackScreenProps<RootStackParamList, 'Cards'>;

export function CardsScreen({ navigation, route }: Props) {
  const { session, isCollected, toggleCollect, resolveSessionCards } = useAppState();
  const initialNodeTypeId = route.params?.focusNodeTypeId ?? 'ORIGIN';
  const [nodeTypeId, setNodeTypeId] = useState<NodeTypeId>(initialNodeTypeId);

  useEffect(() => {
    if (route.params?.focusNodeTypeId) setNodeTypeId(route.params.focusNodeTypeId);
  }, [route.params?.focusNodeTypeId]);

  const focusSide = route.params?.focusSide;

  const groups = useMemo(() => resolveSessionCards(), [resolveSessionCards, session.categoryId, session.countryA, session.countryB]);

  const group = groups.find((g) => g.nodeTypeId === nodeTypeId) ?? groups[0]!;
  const aHighlighted = focusSide === 'A';
  const bHighlighted = focusSide === 'B';

  return (
    <Screen style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>返回</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.hTitle}>知识卡</Text>
          <Text style={styles.hSub}>
            {getCountryName(session.countryA)} vs {getCountryName(session.countryB)}
          </Text>
        </View>
        <Pressable onPress={() => navigation.navigate('Profile')} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>我的</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.nodeTabs}>
        {NODE_TYPES.map((n) => {
          const selected = n.id === nodeTypeId;
          return (
            <Pressable
              key={n.id}
              onPress={() => setNodeTypeId(n.id)}
              style={({ pressed }) => [
                styles.nodeTab,
                selected && styles.nodeTabSelected,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.nodeTabText, selected && styles.nodeTabTextSelected]}>{n.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.chapter}>
        <Text style={styles.chapterTitle}>{group.chapter.chapterTitle}</Text>
        <Text style={styles.chapterTime}>{group.chapter.displayTimeLabel}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <View style={styles.cardRow}>
          <CardPanel
            sideLabel="左侧"
            countryName={getCountryName(session.countryA)}
            card={group.a}
            highlighted={aHighlighted}
            collected={isCollected(group.a.cardId)}
            onToggleCollect={() => toggleCollect(group.a)}
            onOpen={() => navigation.navigate('CardDetail', { cardId: group.a.cardId })}
          />
          <CardPanel
            sideLabel="右侧"
            countryName={getCountryName(session.countryB)}
            card={group.b}
            highlighted={bHighlighted}
            collected={isCollected(group.b.cardId)}
            onToggleCollect={() => toggleCollect(group.b)}
            onOpen={() => navigation.navigate('CardDetail', { cardId: group.b.cardId })}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

function CardPanel({
  sideLabel,
  countryName,
  card,
  highlighted,
  collected,
  onToggleCollect,
  onOpen,
}: {
  sideLabel: string;
  countryName: string;
  card: KnowledgeCard;
  highlighted: boolean;
  collected: boolean;
  onToggleCollect: () => void;
  onOpen: () => void;
}) {
  return (
    <View style={[styles.card, highlighted && styles.cardHighlighted]}>
      <View style={styles.cardTop}>
        <Text style={styles.cardMeta}>
          {sideLabel} · {countryName}
        </Text>
        <Text style={[styles.collectTag, collected && styles.collectTagOn]}>{collected ? '已收藏' : '未收藏'}</Text>
      </View>
      <Text style={styles.cardTitle}>{card.title}</Text>
      <View style={styles.factList}>
        {card.facts.slice(0, 2).map((f, i) => (
          <Text key={i} style={styles.factText}>
            • {f}
          </Text>
        ))}
      </View>
      <View style={styles.keywordRow}>
        {card.keywords.slice(0, 4).map((k) => (
          <View key={k} style={styles.keywordChip}>
            <Text style={styles.keywordText}>{k}</Text>
          </View>
        ))}
      </View>
      <View style={styles.cardActions}>
        <GrainButton
          label={collected ? '取消收藏' : '收藏'}
          variant="ghost"
          onPress={onToggleCollect}
          style={styles.actionBtn}
        />
        <GrainButton label="打开详情" variant="primary" onPress={onOpen} style={styles.actionBtn} />
      </View>
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
  hSub: { color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: 2 },
  nodeTabs: { gap: spacing.s, paddingVertical: spacing.s },
  nodeTab: {
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.m,
    borderRadius: 999,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
  },
  nodeTabSelected: {
    backgroundColor: colors.blue,
    borderColor: 'transparent',
  },
  nodeTabText: { color: colors.text, fontSize: 12, fontWeight: '800' },
  nodeTabTextSelected: { color: '#fff' },
  chapter: {
    marginTop: spacing.m,
    padding: spacing.l,
    backgroundColor: colors.panel,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chapterTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  chapterTime: { color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: spacing.s },
  cardRow: {
    flexDirection: 'row',
    gap: spacing.m,
  },
  card: {
    marginTop: spacing.m,
    padding: spacing.l,
    backgroundColor: colors.panel,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.m,
    flex: 1,
    minWidth: 0,
  },
  cardHighlighted: {
    borderColor: colors.blue,
    backgroundColor: 'rgba(47,107,255,0.12)',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardMeta: { color: colors.muted2, fontSize: 12, fontWeight: '800' },
  collectTag: {
    color: colors.muted2,
    fontSize: 11,
    fontWeight: '900',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
  },
  collectTagOn: {
    color: colors.green,
    borderColor: 'rgba(53,208,127,0.5)',
  },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  factList: { gap: spacing.s },
  factText: { color: colors.text, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  keywordRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s },
  keywordChip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: colors.panel2,
    borderWidth: 1,
    borderColor: colors.line,
  },
  keywordText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
  },
  actionBtn: {
    flexGrow: 1,
    flexBasis: 120,
  },
});
