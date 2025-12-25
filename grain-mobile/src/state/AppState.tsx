/* ASCII PREAMBLE to avoid tooling UTF-8 slicing issue: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA */

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import type { CategoryId, CountryId, KnowledgeCard } from '../types';
import type { GenerateResponse, RuntimeApiConfig } from '../api/grainApi';
import { getGrainApiBaseUrl, setRuntimeApiConfig } from '../api/grainApi';
import { COUNTRIES, CATEGORIES, DEMO_OBJECT, getCardId, getCard as getDemoCard, getDialogue as getDemoDialogue, getChapterMeta as getDemoChapterMeta, getSessionCards as getDemoSessionCards, NODE_TYPES } from '../data/demoContent';
import { getLocalDayKey } from '../utils/day';
import { readJson, writeJson } from '../utils/storage';

type SessionState = {
  objectName: string;
  objectGeneric: string;
  photoUri: string | null;
  photoBase64: string | null;
  categoryId: CategoryId;
  categoryName: string;
  countryA: CountryId;
  countryB: CountryId;
};

type ViewedByDay = Record<string, string[]>;

type AppStats = {
  dailyNewCards: number;
  exploredCountries: number;
  collectedCards: number;
};

type RemoteBundle = {
  context: {
    categoryId: CategoryId;
    countryA: CountryId;
    countryB: CountryId;
  };
  data: GenerateResponse;
};

type AppContextValue = {
  hydrated: boolean;
  session: SessionState;
  setSession: (patch: Partial<SessionState>) => void;
  swapCountries: () => void;

  collectedCardsById: Record<string, KnowledgeCard>;
  toggleCollect: (card: KnowledgeCard) => void;
  isCollected: (cardId: string) => boolean;

  cardImagesById: Record<string, string>;
  setCardImage: (cardId: string, uri: string | null) => void;

  viewedByDay: ViewedByDay;
  exploredCountryIds: Set<CountryId>;
  markViewed: (card: KnowledgeCard) => void;

  cloudConfigured: boolean;
  apiConfig: RuntimeApiConfig | null;
  saveApiConfig: (config: RuntimeApiConfig) => void;
  resetApiConfig: () => void;
  remoteBundle: RemoteBundle | null;
  setRemoteBundle: (data: GenerateResponse) => void;
  clearRemoteBundle: () => void;
  resolveCard: (cardId: string) => KnowledgeCard | null;
  resolveDialogue: (nodeTypeId: KnowledgeCard['nodeTypeId'], countryId: CountryId) => string;
  resolveChapterMeta: (categoryId: CategoryId, nodeTypeId: KnowledgeCard['nodeTypeId']) => ReturnType<typeof getDemoChapterMeta>;
  resolveSessionCards: () => ReturnType<typeof getDemoSessionCards>;

  stats: AppStats;
};

const STORAGE_KEYS = {
  collectedCards: 'grain_collected_cards_v1',
  collectedLegacyIds: 'grain_collected_v1',
  apiConfig: 'grain_api_config_v1',
  viewedByDay: 'grain_viewed_by_day_v1',
  exploredCountries: 'grain_explored_countries_v1',
} as const;

const COUNTRY_ID_SET = new Set(COUNTRIES.map((c) => c.id.toUpperCase()));
const COUNTRY_ID_BY_NAME = new Map(COUNTRIES.map((c) => [c.name, c.id] as const));
const COUNTRY_ID_BY_EN: Record<string, CountryId> = {
  china: 'CN',
  "people's republic of china": 'CN',
  japan: 'JP',
  korea: 'KR',
  'south korea': 'KR',
  vietnam: 'VN',
  thailand: 'TH',
  india: 'IN',
  turkey: 'TR',
  egypt: 'EG',
  france: 'FR',
  'united kingdom': 'GB',
  uk: 'GB',
  britain: 'GB',
  italy: 'IT',
  spain: 'ES',
  germany: 'DE',
  greece: 'GR',
  'united states': 'US',
  usa: 'US',
  mexico: 'MX',
};

function normalizeCountryId(raw: string): CountryId {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  const upper = trimmed.toUpperCase();
  if (COUNTRY_ID_SET.has(upper)) return upper as CountryId;
  const byName = COUNTRY_ID_BY_NAME.get(trimmed);
  if (byName) return byName;
  const byEn = COUNTRY_ID_BY_EN[trimmed.toLowerCase()];
  return byEn ?? trimmed;
}

function makePlaceholderCard(countryId: CountryId, categoryId: CategoryId, nodeTypeId: KnowledgeCard['nodeTypeId']): KnowledgeCard {
  const cardId = getCardId(countryId, nodeTypeId);
  return {
    cardId,
    countryId,
    categoryId,
    nodeTypeId,
    title: '内容暂未生成',
    facts: ['云端未返回该国家/节点的知识卡。', '建议点击“开始对话”重新生成，或更换模型/国家再试一次。'],
    keywords: ['missing', countryId, nodeTypeId],
    sourceHints: [{ sourceHintId: `sh_${cardId}_placeholder`, sourceType: 'other', sourceName: 'placeholder', note: 'auto-filled' }],
    sensitivityTag: 'none',
    factIdsUsed: [],
    sourceHintIdsUsed: [],
    knowledgeBaseVersion: 'placeholder',
  };
}

function completeGenerateResponse(
  data: GenerateResponse,
  ctx: { categoryId: CategoryId; countryA: CountryId; countryB: CountryId }
): GenerateResponse {
  const wantedCountries: CountryId[] = [ctx.countryA, ctx.countryB];
  const wantedNodes = NODE_TYPES.map((n) => n.id);

  const chapterByNode = new Map(
    (data.chapters ?? []).map((ch) => [
      ch.nodeTypeId,
      { ...ch, categoryId: ctx.categoryId, nodeTypeId: ch.nodeTypeId },
    ])
  );

  const cardsNormalized = (data.cards ?? []).map((c) => {
    const countryId = normalizeCountryId(c.countryId);
    const nodeTypeId = c.nodeTypeId;
    const cardId = c.cardId?.trim() ? c.cardId : getCardId(countryId, nodeTypeId);
    return {
      ...c,
      cardId,
      countryId,
      categoryId: ctx.categoryId,
      nodeTypeId,
    } as KnowledgeCard;
  });

  const cardKey = (nodeTypeId: KnowledgeCard['nodeTypeId'], countryId: CountryId) => `${nodeTypeId}_${countryId}`;
  const cardByKey = new Map<string, KnowledgeCard>();
  for (const c of cardsNormalized) cardByKey.set(cardKey(c.nodeTypeId, c.countryId), c);

  const filledCards: KnowledgeCard[] = [];
  for (const nodeTypeId of wantedNodes) {
    for (const countryId of wantedCountries) {
      const existing = cardByKey.get(cardKey(nodeTypeId, countryId));
      filledCards.push(existing ?? makePlaceholderCard(countryId, ctx.categoryId, nodeTypeId));
    }
  }

  const dialogueByKey = new Map<string, string>();
  for (const d of data.dialogues ?? []) {
    const countryId = normalizeCountryId(d.countryId);
    dialogueByKey.set(`${d.nodeTypeId}_${countryId}`, d.text);
  }

  const filledDialogues = wantedNodes.flatMap((nodeTypeId) =>
    wantedCountries.map((countryId) => ({
      nodeTypeId,
      countryId,
      text:
        dialogueByKey.get(`${nodeTypeId}_${countryId}`) ??
        '（该国家/节点对话暂未生成，可稍后重试）',
    }))
  );

  const filledChapters = wantedNodes.map((nodeTypeId) => {
    const existing = chapterByNode.get(nodeTypeId);
    if (existing) return existing;
    return {
      categoryId: ctx.categoryId,
      nodeTypeId,
      chapterTitle: nodeTypeId,
      displayTimeLabel: '',
      timeRange: null,
    };
  });

  return {
    ...data,
    chapters: filledChapters,
    dialogues: filledDialogues,
    cards: filledCards,
  };
}

function normalizeApiConfig(raw: unknown): RuntimeApiConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<RuntimeApiConfig> & Record<string, unknown>;
  const enabled = Boolean(r.enabled);
  const baseUrl = typeof r.baseUrl === 'string' ? r.baseUrl : '';
  const apiKey = typeof r.apiKey === 'string' ? r.apiKey : '';
  const kind = r.kind === 'openai_compatible' || r.kind === 'grain_backend' ? r.kind : 'grain_backend';
  const openaiModel = typeof r.openaiModel === 'string' ? r.openaiModel : undefined;
  const openaiVisionModel = typeof r.openaiVisionModel === 'string' ? r.openaiVisionModel : undefined;
  const imageEnabled = Boolean(r.imageEnabled);
  const imageKind =
    r.imageKind === 'openai_compatible' || r.imageKind === 'grain_backend' || r.imageKind === 'dashscope_wanx'
      ? r.imageKind
      : undefined;
  const imageBaseUrl = typeof r.imageBaseUrl === 'string' ? r.imageBaseUrl : undefined;
  const imageApiKey = typeof r.imageApiKey === 'string' ? r.imageApiKey : undefined;
  const openaiImageModel = typeof r.openaiImageModel === 'string' ? r.openaiImageModel : undefined;
  return {
    enabled,
    kind,
    baseUrl,
    apiKey,
    openaiModel,
    openaiVisionModel,
    imageEnabled,
    imageKind,
    imageBaseUrl,
    imageApiKey,
    openaiImageModel,
  };
}

const DEFAULT_SESSION: SessionState = {
  objectName: DEMO_OBJECT.objectName,
  objectGeneric: DEMO_OBJECT.objectGeneric,
  photoUri: null,
  photoBase64: null,
  categoryId: CATEGORIES[0].id,
  categoryName: CATEGORIES[0].name,
  countryA: 'FR',
  countryB: 'JP',
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [session, setSessionState] = useState<SessionState>(DEFAULT_SESSION);
  const [collectedCardsById, setCollectedCardsById] = useState<Record<string, KnowledgeCard>>({});
  const [cardImagesById, setCardImagesById] = useState<Record<string, string>>({});
  const [viewedByDay, setViewedByDay] = useState<ViewedByDay>({});
  const [exploredCountryIds, setExploredCountryIds] = useState<Set<CountryId>>(new Set());
  const [remoteBundle, setRemoteBundleState] = useState<RemoteBundle | null>(null);
  const [apiConfig, setApiConfig] = useState<RuntimeApiConfig | null>(null);

  const cloudConfigured = Boolean(getGrainApiBaseUrl());

  useEffect(() => {
    (async () => {
      const savedCollectedCards = await readJson<Record<string, KnowledgeCard>>(STORAGE_KEYS.collectedCards);
      const legacyIds = (await readJson<string[]>(STORAGE_KEYS.collectedLegacyIds)) ?? [];
      const savedApiConfigRaw = await readJson<unknown>(STORAGE_KEYS.apiConfig);
      const savedViewedByDay = (await readJson<ViewedByDay>(STORAGE_KEYS.viewedByDay)) ?? {};
      const savedExplored = (await readJson<CountryId[]>(STORAGE_KEYS.exploredCountries)) ?? [];

      const normalizedApiConfig = normalizeApiConfig(savedApiConfigRaw);
      if (normalizedApiConfig) {
        setApiConfig(normalizedApiConfig);
        setRuntimeApiConfig(normalizedApiConfig);
      } else {
        setApiConfig(null);
        setRuntimeApiConfig(null);
      }

      if (savedCollectedCards && Object.keys(savedCollectedCards).length > 0) {
        setCollectedCardsById(savedCollectedCards);
      } else if (legacyIds.length > 0) {
        const migrated: Record<string, KnowledgeCard> = {};
        for (const id of legacyIds) {
          const card = getDemoCard(id);
          if (card) migrated[id] = card;
        }
        setCollectedCardsById(migrated);
        writeJson(STORAGE_KEYS.collectedCards, migrated);
      }
      setViewedByDay(savedViewedByDay);
      setExploredCountryIds(new Set(savedExplored));
      setHydrated(true);
    })();
  }, []);

  const setSession = (patch: Partial<SessionState>) => {
    if (
      patch.categoryId !== undefined ||
      patch.countryA !== undefined ||
      patch.countryB !== undefined ||
      patch.objectName !== undefined ||
      patch.objectGeneric !== undefined
    ) {
      setRemoteBundleState(null);
      setCardImagesById({});
    }
    setSessionState((prev) => ({ ...prev, ...patch }));
  };

  const swapCountries = () => {
    setRemoteBundleState(null);
    setCardImagesById({});
    setSessionState((prev) => ({ ...prev, countryA: prev.countryB, countryB: prev.countryA }));
  };

  const toggleCollect = (card: KnowledgeCard) => {
    setCollectedCardsById((prev) => {
      const next = { ...prev };
      if (next[card.cardId]) {
        delete next[card.cardId];
      } else {
        next[card.cardId] = card;
      }
      writeJson(STORAGE_KEYS.collectedCards, next);
      return next;
    });
  };

  const isCollected = (cardId: string) => Boolean(collectedCardsById[cardId]);

  const setCardImage = (cardId: string, uri: string | null) => {
    setCardImagesById((prev) => {
      const next = { ...prev };
      if (!uri) {
        delete next[cardId];
        return next;
      }
      next[cardId] = uri;

      const keys = Object.keys(next);
      if (keys.length <= 16) return next;

      // Drop oldest-ish entries to avoid keeping too many base64 images in memory.
      for (const k of keys.slice(0, keys.length - 16)) {
        delete next[k];
      }
      return next;
    });
  };

  const saveApiConfig = (config: RuntimeApiConfig) => {
    const normalized = normalizeApiConfig(config) ?? config;
    setApiConfig(normalized);
    setRuntimeApiConfig(normalized);
    writeJson(STORAGE_KEYS.apiConfig, normalized);
    setRemoteBundleState(null);
  };

  const resetApiConfig = () => {
    setApiConfig(null);
    setRuntimeApiConfig(null);
    writeJson(STORAGE_KEYS.apiConfig, null);
    setRemoteBundleState(null);
  };

  const clearRemoteBundle = () => setRemoteBundleState(null);

  const setRemoteBundle = (data: GenerateResponse) => {
    const context = { categoryId: session.categoryId, countryA: session.countryA, countryB: session.countryB };
    setRemoteBundleState({
      context,
      data: completeGenerateResponse(data, context),
    });
  };

  const remoteActive =
    remoteBundle &&
    remoteBundle.context.categoryId === session.categoryId &&
    remoteBundle.context.countryA === session.countryA &&
    remoteBundle.context.countryB === session.countryB;

  const remoteCardsById = useMemo(() => {
    if (!remoteActive) return null;
    const map: Record<string, KnowledgeCard> = {};
    for (const c of remoteBundle.data.cards) map[c.cardId] = c;
    return map;
  }, [remoteActive, remoteBundle]);

  const remoteDialogueByKey = useMemo(() => {
    if (!remoteActive) return null;
    const map = new Map<string, string>();
    for (const d of remoteBundle.data.dialogues) map.set(`${d.nodeTypeId}_${d.countryId}`, d.text);
    return map;
  }, [remoteActive, remoteBundle]);

  const remoteChapterByNodeType = useMemo(() => {
    if (!remoteActive) return null;
    const map = new Map<KnowledgeCard['nodeTypeId'], ReturnType<typeof getDemoChapterMeta>>();
    for (const ch of remoteBundle.data.chapters) map.set(ch.nodeTypeId, ch);
    return map;
  }, [remoteActive, remoteBundle]);

  const resolveCard = (cardId: string): KnowledgeCard | null => {
    const remote = remoteCardsById?.[cardId];
    if (remote) return remote;
    const collected = collectedCardsById[cardId];
    if (collected) return collected;
    return getDemoCard(cardId);
  };

  const resolveDialogue = (nodeTypeId: KnowledgeCard['nodeTypeId'], countryId: CountryId): string => {
    const remote = remoteDialogueByKey?.get(`${nodeTypeId}_${countryId}`);
    if (remote) return remote;
    return getDemoDialogue(nodeTypeId, countryId);
  };

  const resolveChapterMeta = (categoryId: CategoryId, nodeTypeId: KnowledgeCard['nodeTypeId']) => {
    const remote = remoteChapterByNodeType?.get(nodeTypeId);
    if (remote) return remote;
    return getDemoChapterMeta(categoryId, nodeTypeId);
  };

  const resolveSessionCards = () => {
    if (!remoteActive || !remoteCardsById || !remoteChapterByNodeType) {
      const demoA = getDemoCard(getCardId(session.countryA, NODE_TYPES[0].id));
      const demoB = getDemoCard(getCardId(session.countryB, NODE_TYPES[0].id));
      if (demoA && demoB) return getDemoSessionCards(session.categoryId, session.countryA, session.countryB);

      return NODE_TYPES.map(({ id }) => {
        return {
          nodeTypeId: id,
          a: makePlaceholderCard(session.countryA, session.categoryId, id),
          b: makePlaceholderCard(session.countryB, session.categoryId, id),
          chapter: getDemoChapterMeta(session.categoryId, id),
        };
      });
    }

    return NODE_TYPES.map(({ id }) => {
      const chapter = remoteChapterByNodeType.get(id) ?? getDemoChapterMeta(session.categoryId, id);
      const a = remoteCardsById[getCardId(session.countryA, id)] ?? makePlaceholderCard(session.countryA, session.categoryId, id);
      const b = remoteCardsById[getCardId(session.countryB, id)] ?? makePlaceholderCard(session.countryB, session.categoryId, id);
      return { nodeTypeId: id, a, b, chapter };
    });
  };

  const markViewed = (card: KnowledgeCard) => {
    const dayKey = getLocalDayKey();
    setViewedByDay((prev) => {
      const today = prev[dayKey] ?? [];
      if (today.includes(card.cardId)) return prev;
      const next = { ...prev, [dayKey]: [...today, card.cardId] };
      writeJson(STORAGE_KEYS.viewedByDay, next);
      return next;
    });
    setExploredCountryIds((prev) => {
      if (prev.has(card.countryId)) return prev;
      const next = new Set(prev);
      next.add(card.countryId);
      writeJson(STORAGE_KEYS.exploredCountries, [...next]);
      return next;
    });
  };

  const stats: AppStats = useMemo(() => {
    const todayKey = getLocalDayKey();
    return {
      dailyNewCards: (viewedByDay[todayKey] ?? []).length,
      exploredCountries: exploredCountryIds.size,
      collectedCards: Object.keys(collectedCardsById).length,
    };
  }, [collectedCardsById, exploredCountryIds, viewedByDay]);

  const value: AppContextValue = {
    hydrated,
    session,
    setSession,
    swapCountries,
    collectedCardsById,
    toggleCollect,
    isCollected,
    cardImagesById,
    setCardImage,
    viewedByDay,
    exploredCountryIds,
    markViewed,
    cloudConfigured,
    apiConfig,
    saveApiConfig,
    resetApiConfig,
    remoteBundle: remoteActive ? remoteBundle : null,
    setRemoteBundle,
    clearRemoteBundle,
    resolveCard,
    resolveDialogue,
    resolveChapterMeta,
    resolveSessionCards,
    stats,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppState must be used within AppProvider');
  return ctx;
}

export function getCountryName(countryId: CountryId): string {
  return COUNTRIES.find((c) => c.id === countryId)?.name ?? countryId;
}

export function getCategoryName(categoryId: CategoryId): string {
  return CATEGORIES.find((c) => c.id === categoryId)?.name ?? categoryId;
}

export function getDemoCardId(countryId: CountryId, nodeTypeId: KnowledgeCard['nodeTypeId']): string {
  return getCardId(countryId, nodeTypeId);
}
