/* ASCII PREAMBLE to avoid tooling UTF-8 slicing issue: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { RootStackParamList } from '../navigation/RootNavigator';
import { GrainButton } from '../components/GrainButton';
import { Screen } from '../components/Screen';
import { colors, radius, spacing } from '../theme';
import { CATEGORIES, COUNTRIES, isCategoryEnabled, isCountryCovered } from '../data/demoContent';
import { useAppState } from '../state/AppState';
import { identifyImage, identifyImageWithOpenAiCompatible, type IdentifyCategoryCandidate } from '../api/grainApi';
import { humanizeCloudError } from '../utils/errors';

type Props = NativeStackScreenProps<RootStackParamList, 'Identify'>;

export function IdentifyScreen({ navigation }: Props) {
  const { session, setSession, cloudConfigured, apiConfig } = useAppState();
  const [objectName, setObjectName] = useState(session.objectName);
  const [identifying, setIdentifying] = useState(false);
  const [identifyError, setIdentifyError] = useState<string | null>(null);
  const autoTriggeredRef = useRef(false);
  const apiKind = apiConfig?.kind ?? 'grain_backend';

  const availableCountries = useMemo(() => {
    if (cloudConfigured) return COUNTRIES;
    return COUNTRIES.filter((c) => isCountryCovered(c.id, session.categoryId));
  }, [cloudConfigured, session.categoryId]);

  const categoryEnabled = cloudConfigured ? true : isCategoryEnabled(session.categoryId);
  const canContinue = cloudConfigured ? true : categoryEnabled && availableCountries.length >= 2;

  const runIdentify = async () => {
    if (identifying) return;
    if (!cloudConfigured) return;
    if (!session.photoUri) return;

    setIdentifying(true);
    setIdentifyError(null);
    try {
      const res =
        apiKind === 'openai_compatible'
          ? await (async () => {
              if (!apiConfig?.baseUrl) throw new Error('请在“API 设置”里填写 Base URL');
              if (!apiConfig?.apiKey) throw new Error('请在“API 设置”里填写 API Key');
              const model = (apiConfig.openaiVisionModel ?? apiConfig.openaiModel ?? '').trim();
              if (!model) throw new Error('请在“API 设置”里填写视觉模型/模型名');
              if (!session.photoBase64) throw new Error('PHOTO_BASE64_MISSING');
              return identifyImageWithOpenAiCompatible({
                baseUrl: apiConfig.baseUrl,
                apiKey: apiConfig.apiKey,
                model,
                imageBase64: session.photoBase64,
                requestedLocale: 'zh',
                categories: CATEGORIES.map((c) => ({ id: c.id, name: c.name })),
              });
            })()
          : await identifyImage({ photoUri: session.photoUri, requestedLocale: 'zh', maxCandidates: 3 });

      const allowed = new Set(CATEGORIES.map((c) => c.id));
      const best = (res.categoryCandidates ?? []).find((c) => allowed.has(c.categoryId));
      const nextCategoryId = best?.categoryId && allowed.has(best.categoryId) ? best.categoryId : session.categoryId;
      const nextCategoryName =
        CATEGORIES.find((c) => c.id === nextCategoryId)?.name ?? best?.categoryName ?? session.categoryName;

      const nextObjectName = res.objectName?.trim() ? res.objectName.trim() : session.objectName;
      const nextObjectGeneric = res.objectGeneric?.trim() ? res.objectGeneric.trim() : session.objectGeneric;

      setObjectName(nextObjectName);
      setSession({
        objectName: nextObjectName,
        objectGeneric: nextObjectGeneric,
        categoryId: nextCategoryId,
        categoryName: nextCategoryName,
        photoBase64: null,
      });
    } catch (e: any) {
      const msg = humanizeCloudError(e);
      setIdentifyError(msg);
    } finally {
      setIdentifying(false);
    }
  };

  useEffect(() => {
    if (autoTriggeredRef.current) return;
    if (!cloudConfigured) return;
    if (!session.photoUri) return;
    if (apiKind === 'openai_compatible' && !session.photoBase64) return;
    autoTriggeredRef.current = true;
    void runIdentify();
  }, [apiKind, cloudConfigured, session.photoBase64, session.photoUri]);

  return (
    <Screen style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>返回</Text>
        </Pressable>
        <Text style={styles.hTitle}>识别与纠错</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.sticker}>
            {session.photoUri ? (
              <Image source={{ uri: session.photoUri }} style={styles.stickerImg} />
            ) : (
              <View style={styles.stickerPlaceholder}>
                <Text style={styles.stickerText}>示例</Text>
              </View>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>物体名称（可修改）</Text>
            <TextInput
              value={objectName}
              onChangeText={setObjectName}
              placeholder="例如：鸡蛋"
              placeholderTextColor={colors.muted2}
              style={styles.input}
            />
            <Text style={styles.hint}>MVP说明：当前内容库只内置“鸡蛋”示例；后续接真实识别/类目库后，这里会自动给 Top-3 候选。</Text>
          </View>
        </View>

        {cloudConfigured && session.photoUri ? (
          <View style={styles.autoBox}>
            <View style={styles.autoRow}>
              <Text style={styles.autoTitle}>自动识别</Text>
              {identifying ? <ActivityIndicator color={colors.text} /> : null}
              <View style={{ flex: 1 }} />
              <GrainButton
                label={identifying ? '识别中…' : '重新识别'}
                variant="ghost"
                disabled={identifying}
                onPress={() => void runIdentify()}
              />
            </View>
            {identifyError ? <Text style={styles.autoError}>{identifyError}</Text> : null}
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>类目（Top-3候选 / 手动纠错）</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {CATEGORIES.map((cat) => {
            const selected = cat.id === session.categoryId;
            const enabled = cloudConfigured || cat.enabled;
            return (
              <Pressable
                key={cat.id}
                disabled={!enabled}
                onPress={() => setSession({ categoryId: cat.id, categoryName: cat.name })}
                style={({ pressed }) => [
                  styles.chip,
                  selected && styles.chipSelected,
                  !enabled && styles.chipDisabled,
                  pressed && enabled && { opacity: 0.85 },
                ]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {cat.name}
                  {!cloudConfigured && !cat.enabled ? ' · 未开放' : ''}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.coverage}>
          <Text style={styles.coverageText}>
            当前类目可选国家：{availableCountries.length} 个
            {!categoryEnabled ? '（该类目未开放）' : ''}
          </Text>
          {availableCountries.length < 6 ? (
            <Text style={styles.coverageHint}>
              覆盖国家较少属于正常：MVP先验证“对照 + 收藏 + 复访”闭环，后续再扩国家与类目。
            </Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          <GrainButton label="重新拍照" variant="ghost" onPress={() => navigation.replace('Camera')} />
          <GrainButton
            label="继续选国家"
            variant="primary"
            disabled={!canContinue}
            onPress={() => {
              setSession({ objectName, photoBase64: null });
              navigation.replace('CountryPicker');
            }}
          />
        </View>
      </View>
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
  card: {
    marginTop: spacing.m,
    padding: spacing.l,
    backgroundColor: colors.panel,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.m,
  },
  row: { flexDirection: 'row', gap: spacing.m, alignItems: 'center' },
  sticker: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    backgroundColor: colors.panel2,
    borderWidth: 1,
    borderColor: colors.line,
  },
  stickerImg: { width: '100%', height: '100%' },
  stickerPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stickerText: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  label: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  input: {
    marginTop: spacing.s,
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.m,
    borderRadius: radius.m,
    backgroundColor: colors.bg2,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  hint: { marginTop: spacing.s, color: colors.muted2, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  sectionLabel: { color: colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1, marginTop: spacing.m },
  chips: { gap: spacing.s, paddingVertical: spacing.s },
  chip: {
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.m,
    borderRadius: 999,
    backgroundColor: colors.panel2,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipSelected: { backgroundColor: colors.blue, borderColor: 'transparent' },
  chipDisabled: { opacity: 0.45 },
  chipText: { color: colors.text, fontSize: 12, fontWeight: '800' },
  chipTextSelected: { color: '#fff' },
  coverage: {
    padding: spacing.m,
    borderRadius: radius.m,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.s,
  },
  coverageText: { color: colors.text, fontSize: 13, fontWeight: '800' },
  coverageHint: { color: colors.muted2, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  autoBox: {
    marginTop: spacing.m,
    padding: spacing.m,
    borderRadius: radius.m,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.s,
  },
  autoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  autoTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  autoError: { color: '#ffb3b3', fontSize: 12, lineHeight: 18, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: spacing.m, justifyContent: 'space-between', marginTop: spacing.m },
});
