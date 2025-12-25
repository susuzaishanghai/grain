/* ASCII PREAMBLE to avoid tooling UTF-8 slicing issue: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { RootStackParamList } from '../navigation/RootNavigator';
import { Screen } from '../components/Screen';
import { colors, radius, spacing } from '../theme';
import { NODE_TYPES } from '../data/demoContent';
import { getCountryName, useAppState } from '../state/AppState';
import { getLocalDayKey } from '../utils/day';
import { readJson, writeJson } from '../utils/storage';
import type { KnowledgeCard } from '../types';
import { GrainButton } from '../components/GrainButton';
import { submitFeedback as submitFeedbackToCloud } from '../api/grainApi';

type Props = NativeStackScreenProps<RootStackParamList, 'CardDetail'>;

const VIEWED_DWELL_MS = 6000;
const VIEWED_SCROLL_DEPTH = 0.3;
const VIEWED_DWELL_AFTER_SCROLL_MS = 3000;

type FeedbackRecord = {
  id: string;
  createdAt: number;
  cardId: string;
  countryId: string;
  categoryId: string;
  nodeTypeId: string;
  feedbackType: 'inaccurate' | 'irrelevant' | 'other';
  factIdsUsed: string[];
  sourceHintIdsUsed: string[];
  note?: string;
};

const FEEDBACK_KEY = 'grain_feedback_v1';

export function CardDetailScreen({ navigation, route }: Props) {
  const { cardId } = route.params;
  const {
    isCollected,
    toggleCollect,
    markViewed,
    viewedByDay,
    cloudConfigured,
    apiConfig,
    resolveCard,
    resolveChapterMeta,
  } = useAppState();
  const card = useMemo(() => resolveCard(cardId), [cardId, resolveCard]);

  const todayKey = getLocalDayKey();
  const alreadyViewed = useMemo(() => (viewedByDay[todayKey] ?? []).includes(cardId), [cardId, todayKey, viewedByDay]);

  const viewedTriggeredRef = useRef(false);
  const [viewedTriggered, setViewedTriggered] = useState(false);
  const scrollQualifiedRef = useRef(false);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dwellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    viewedTriggeredRef.current = alreadyViewed;
    setViewedTriggered(alreadyViewed);
  }, [alreadyViewed]);

  const triggerViewed = useCallback(
    (reason: 'dwell' | 'scroll') => {
      if (!card) return;
      if (viewedTriggeredRef.current) return;
      viewedTriggeredRef.current = true;
      setViewedTriggered(true);
      markViewed(card);
      void reason;
    },
    [card, markViewed]
  );

  useEffect(() => {
    if (!card) return;
    dwellTimerRef.current = setTimeout(() => triggerViewed('dwell'), VIEWED_DWELL_MS);
    return () => {
      if (dwellTimerRef.current) clearTimeout(dwellTimerRef.current);
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, [card, triggerViewed]);

  const onScroll = useCallback(
    (evt: any) => {
      if (!card) return;
      if (viewedTriggeredRef.current) return;
      if (scrollQualifiedRef.current) return;
      const offsetY: number = evt?.nativeEvent?.contentOffset?.y ?? 0;
      const contentH: number = evt?.nativeEvent?.contentSize?.height ?? 1;
      const viewH: number = evt?.nativeEvent?.layoutMeasurement?.height ?? 1;
      const maxScroll = Math.max(1, contentH - viewH);
      const depth = offsetY / maxScroll;
      if (depth < VIEWED_SCROLL_DEPTH) return;
      scrollQualifiedRef.current = true;
      scrollTimerRef.current = setTimeout(() => triggerViewed('scroll'), VIEWED_DWELL_AFTER_SCROLL_MS);
    },
    [card, triggerViewed]
  );

  const submitFeedback = useCallback(
    async (feedbackType: FeedbackRecord['feedbackType']) => {
      if (!card) return;
      const record: FeedbackRecord = {
        id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        createdAt: Date.now(),
        cardId: card.cardId,
        countryId: card.countryId,
        categoryId: card.categoryId,
        nodeTypeId: card.nodeTypeId,
        feedbackType,
        factIdsUsed: card.factIdsUsed,
        sourceHintIdsUsed: card.sourceHintIdsUsed,
      };

      const existing = (await readJson<FeedbackRecord[]>(FEEDBACK_KEY)) ?? [];
      await writeJson(FEEDBACK_KEY, [record, ...existing].slice(0, 200));

      if (cloudConfigured && (apiConfig?.kind ?? 'grain_backend') === 'grain_backend') {
        submitFeedbackToCloud({
          cardId: card.cardId,
          countryId: card.countryId,
          categoryId: card.categoryId,
          nodeTypeId: card.nodeTypeId,
          feedbackType,
          factIdsUsed: card.factIdsUsed,
          sourceHintIdsUsed: card.sourceHintIdsUsed,
        }).catch(() => void 0);
      }
      Alert.alert('已记录反馈', 'MVP阶段先本地保存，后续可接入上报。');
    },
    [apiConfig?.kind, card, cloudConfigured]
  );

  if (!card) {
    return (
      <Screen style={styles.root}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>返回</Text>
          </Pressable>
          <Text style={styles.hTitle}>卡片不存在</Text>
        </View>
        <Text style={styles.body}>该卡片可能未覆盖或数据版本不一致。</Text>
      </Screen>
    );
  }

  const nodeLabel = NODE_TYPES.find((n) => n.id === card.nodeTypeId)?.label ?? card.nodeTypeId;
  const chapter = resolveChapterMeta(card.categoryId, card.nodeTypeId);

  return (
    <Screen style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>返回</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.hTitle}>知识卡详情</Text>
          <Text style={styles.hSub}>
            {getCountryName(card.countryId)} · {nodeLabel} · {chapter.displayTimeLabel}
          </Text>
        </View>
        <Pressable onPress={() => toggleCollect(card)} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>{isCollected(card.cardId) ? '已收藏' : '收藏'}</Text>
        </Pressable>
      </View>

      <ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={styles.scroll}>
        <View style={styles.panel}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLeft}>{chapter.chapterTitle}</Text>
            <Text style={[styles.metaRight, viewedTriggered && styles.metaRightOn]}>
              {viewedTriggered ? '已计入今日学习' : '浏览中…'}
            </Text>
          </View>

          {card.sensitivityTag === 'disputed' ? (
            <View style={styles.disputed}>
              <Text style={styles.disputedText}>该主题存在不同记载/观点，卡片以“关键词+来源线索”便于你自行核验。</Text>
            </View>
          ) : null}

          <Text style={styles.cardTitle}>{card.title}</Text>
          <Text style={styles.section}>事实点</Text>
          <View style={styles.factList}>
            {card.facts.map((f, i) => (
              <Text key={i} style={styles.factText}>
                {i + 1}. {f}
              </Text>
            ))}
          </View>

          <Text style={styles.section}>关键词</Text>
          <View style={styles.keywordRow}>
            {card.keywords.map((k) => (
              <View key={k} style={styles.keywordChip}>
                <Text style={styles.keywordText}>{k}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.section}>来源线索</Text>
          <View style={styles.sourceList}>
            {card.sourceHints.map((s) => (
              <View key={s.sourceHintId} style={styles.sourceRow}>
                <Text style={styles.sourceType}>{s.sourceType}</Text>
                <Text style={styles.sourceName}>
                  {s.sourceName}
                  {s.year ? ` · ${s.year}` : ''}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.actions}>
            <GrainButton
              label="不准确"
              variant="ghost"
              onPress={() =>
                Alert.alert('反馈：不准确', '确认提交吗？', [
                  { text: '取消', style: 'cancel' },
                  { text: '提交', style: 'default', onPress: () => void submitFeedback('inaccurate') },
                ])
              }
            />
            <GrainButton
              label="不相关"
              variant="ghost"
              onPress={() =>
                Alert.alert('反馈：不相关', '确认提交吗？', [
                  { text: '取消', style: 'cancel' },
                  { text: '提交', style: 'default', onPress: () => void submitFeedback('irrelevant') },
                ])
              }
            />
          </View>
        </View>
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
  scroll: { paddingBottom: spacing.xl },
  panel: {
    marginTop: spacing.m,
    padding: spacing.l,
    backgroundColor: colors.panel,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.m,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.m },
  metaLeft: { color: colors.muted, fontSize: 12, fontWeight: '800', flex: 1 },
  metaRight: {
    color: colors.muted2,
    fontSize: 11,
    fontWeight: '900',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
  },
  metaRightOn: { color: colors.green, borderColor: 'rgba(53,208,127,0.5)' },
  disputed: {
    padding: spacing.m,
    borderRadius: radius.m,
    backgroundColor: 'rgba(255,212,0,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,212,0,0.28)',
  },
  disputedText: { color: colors.muted, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  section: { color: colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  factList: { gap: spacing.s },
  factText: { color: colors.text, fontSize: 13, lineHeight: 20, fontWeight: '600' },
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
  sourceList: { gap: spacing.s },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  sourceType: {
    color: colors.muted2,
    fontSize: 11,
    fontWeight: '900',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
  },
  sourceName: { color: colors.text, fontSize: 12, fontWeight: '600', flex: 1, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: spacing.m, justifyContent: 'space-between' },
  body: { color: colors.muted, fontSize: 14, lineHeight: 20 },
});
