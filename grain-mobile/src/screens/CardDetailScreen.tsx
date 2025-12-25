/* ASCII PREAMBLE to avoid tooling UTF-8 slicing issue: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import type { RootStackParamList } from '../navigation/RootNavigator';
import { Screen } from '../components/Screen';
import { colors, radius, spacing } from '../theme';
import { NODE_TYPES } from '../data/demoContent';
import { getCountryName, useAppState } from '../state/AppState';
import { getLocalDayKey } from '../utils/day';
import { readJson, writeJson } from '../utils/storage';
import type { KnowledgeCard } from '../types';
import { GrainButton } from '../components/GrainButton';
import {
  generateCardImageWithDashscopeWanx,
  generateCardImageWithGrainBackend,
  generateCardImageWithOpenAiCompatible,
  submitFeedback as submitFeedbackToCloud,
  type GenerateCardImageRequest,
} from '../api/grainApi';
import { humanizeCloudError } from '../utils/errors';

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
    session,
    cardImagesById,
    setCardImage,
    markViewed,
    viewedByDay,
    cloudConfigured,
    apiConfig,
    resolveCard,
    resolveChapterMeta,
  } = useAppState();
  const { width } = useWindowDimensions();
  const card = useMemo(() => resolveCard(cardId), [cardId, resolveCard]);
  const nodeLabel = useMemo(
    () => (card ? NODE_TYPES.find((n) => n.id === card.nodeTypeId)?.label ?? card.nodeTypeId : ''),
    [card]
  );
  const chapter = useMemo(
    () => (card ? resolveChapterMeta(card.categoryId, card.nodeTypeId) : null),
    [card, resolveChapterMeta]
  );

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

  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const autoImageTriggeredRef = useRef<string | null>(null);
  const imageUri = card ? cardImagesById[card.cardId] : undefined;
  const imageFeatureEnabled = Boolean(apiConfig?.imageEnabled);
  const imageEnabled = imageFeatureEnabled;

  useEffect(() => {
    setImageError(null);
    setImageLoading(false);
    autoImageTriggeredRef.current = null;
  }, [cardId]);

  const generateImage = useCallback(async () => {
    if (!card || !chapter) return;
    if (!imageEnabled) return;
    if (imageLoading) return;

    const kind = apiConfig?.imageKind ?? apiConfig?.kind ?? 'grain_backend';
    const baseUrl = (apiConfig?.imageBaseUrl ?? apiConfig?.baseUrl ?? '').trim();
    const apiKey = (apiConfig?.imageApiKey ?? apiConfig?.apiKey ?? '').trim();
    const effectiveBaseUrl = baseUrl || (apiConfig?.baseUrl ?? '').trim();
    const effectiveApiKey = apiKey || (apiConfig?.apiKey ?? '').trim();

    setImageLoading(true);
    setImageError(null);
    try {
      if (!effectiveBaseUrl) throw new Error('请在“API 设置”里填写生图 Base URL（或 Base URL）。');

      if (kind === 'openai_compatible') {
        const model = (apiConfig?.openaiImageModel ?? '').trim();
        if (!effectiveApiKey) throw new Error('请在“API 设置”里填写 API Key（或生图 API Key）。');
        if (!model) throw new Error('请在“API 设置”里填写生图模型名。');

        const countryName = getCountryName(card.countryId);
        const prompt = [
          `Create a clean, modern illustration (no text, no logos).`,
          `Topic: ${card.title}.`,
          `Object: ${session.objectGeneric || session.objectName}.`,
          `Culture/Country: ${countryName}.`,
          `Time: ${chapter.displayTimeLabel}.`,
          `Style: flat illustration, cinematic lighting, minimal, high quality, no faces, no flags.`,
        ].join(' ');

        const res = await generateCardImageWithOpenAiCompatible({
          baseUrl: effectiveBaseUrl,
          apiKey: effectiveApiKey,
          model,
          prompt,
          size: '512x512',
        });
        const uri = res.imageBase64
          ? `data:${res.mimeType ?? 'image/png'};base64,${res.imageBase64}`
          : res.imageUrl;
        if (!uri) throw new Error('MODEL_EMPTY_IMAGE');
        setCardImage(card.cardId, uri);
        return;
      }

      if (kind === 'dashscope_wanx') {
        const model = (apiConfig?.openaiImageModel ?? '').trim();
        if (!effectiveApiKey) throw new Error('请在“API 设置”里填写 API Key（或生图 API Key）。');
        if (!model) throw new Error('请在“API 设置”里填写万相模型名（例如：wanx-v2）。');

        const countryName = getCountryName(card.countryId);
        const prompt = [
          `生成一张高质量插画：主题=${card.title}。`,
          `物体=${session.objectGeneric || session.objectName}。`,
          `国家/文化=${countryName}。时间=${chapter.displayTimeLabel}。`,
          `要求：无文字无Logo，尽量不出现人脸，风格统一、现代、干净。`,
        ].join(' ');

        const res = await generateCardImageWithDashscopeWanx({
          baseUrl: effectiveBaseUrl,
          apiKey: effectiveApiKey,
          model,
          prompt,
          size: '1024x1024',
        });
        const uri = res.imageBase64
          ? `data:${res.mimeType ?? 'image/png'};base64,${res.imageBase64}`
          : res.imageUrl;
        if (!uri) throw new Error('MODEL_EMPTY_IMAGE');
        setCardImage(card.cardId, uri);
        return;
      }

      const req: GenerateCardImageRequest = {
        requestedLocale: 'zh',
        categoryId: card.categoryId,
        nodeTypeId: card.nodeTypeId,
        countryId: card.countryId,
        objectName: session.objectName,
        objectGeneric: session.objectGeneric,
        chapterTitle: chapter.chapterTitle,
        displayTimeLabel: chapter.displayTimeLabel,
        cardTitle: card.title,
        facts: card.facts.slice(0, 3),
        keywords: card.keywords.slice(0, 6),
      };

      const res = await generateCardImageWithGrainBackend({
        baseUrl: effectiveBaseUrl,
        apiKey: effectiveApiKey,
        req,
      });
      const uri = res.imageBase64 ? `data:${res.mimeType ?? 'image/png'};base64,${res.imageBase64}` : res.imageUrl;
      if (!uri) throw new Error('IMAGE_EMPTY_RESPONSE');
      setCardImage(card.cardId, uri);
    } catch (e) {
      setImageError(humanizeCloudError(e));
    } finally {
      setImageLoading(false);
    }
  }, [apiConfig, card, chapter, imageEnabled, imageLoading, session.objectGeneric, session.objectName, setCardImage]);

  useEffect(() => {
    if (!card || !chapter) return;
    if (!imageEnabled) return;
    if (imageUri) return;
    if (autoImageTriggeredRef.current === card.cardId) return;
    autoImageTriggeredRef.current = card.cardId;
    void generateImage();
  }, [card, chapter, generateImage, imageEnabled, imageUri]);

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

  if (!chapter) {
    return (
      <Screen style={styles.root}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>返回</Text>
          </Pressable>
          <Text style={styles.hTitle}>章节不存在</Text>
        </View>
        <Text style={styles.body}>该章节元信息缺失。</Text>
      </Screen>
    );
  }

  const isWide = width >= 700;

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
        <View style={[styles.detailWrap, isWide && styles.detailWrapWide]}>
          <View style={[styles.imageBox, isWide && styles.imageBoxWide]}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : (
              <View style={styles.imagePlaceholder}>
                {imageEnabled ? <ActivityIndicator color={colors.text} /> : null}
                <Text style={styles.imagePlaceholderText}>
                  {imageEnabled
                    ? imageLoading
                      ? '配图生成中…'
                      : '暂无配图'
                    : '未启用配图（去“API 设置”打开）'}
                </Text>
              </View>
            )}
            {imageEnabled && !imageUri ? (
              <View style={styles.imageFooter}>
                {imageError ? <Text style={styles.imageErrorText}>{imageError}</Text> : null}
                <View style={styles.imageFooterActions}>
                  <GrainButton
                    label={imageLoading ? '生成中…' : imageError ? '重试' : '生成图片'}
                    variant="ghost"
                    disabled={imageLoading}
                    onPress={() => void generateImage()}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            ) : null}

            {!imageEnabled ? (
              <View style={styles.imageFooter}>
                <View style={styles.imageFooterActions}>
                  <GrainButton
                    label="去 API 设置开启"
                    variant="ghost"
                    onPress={() => navigation.navigate('ApiSettings')}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            ) : null}
          </View>

          <View style={[styles.panel, isWide && styles.panelRight]}>
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
  detailWrap: {
    marginTop: spacing.m,
    gap: spacing.m,
  },
  detailWrapWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  imageBox: {
    height: 200,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel,
    overflow: 'hidden',
  },
  imageBoxWide: {
    width: 220,
    height: 320,
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s,
    padding: spacing.m,
  },
  imagePlaceholderText: { color: colors.muted, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  imageFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.m,
    gap: spacing.s,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  imageErrorText: { color: '#fff', fontSize: 11, lineHeight: 16, fontWeight: '700' },
  imageFooterActions: { flexDirection: 'row', gap: spacing.s },
  panel: {
    padding: spacing.l,
    backgroundColor: colors.panel,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.m,
  },
  panelRight: {
    flex: 1,
    minWidth: 0,
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
