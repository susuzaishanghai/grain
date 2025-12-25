/* ASCII PREAMBLE to avoid tooling UTF-8 slicing issue: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { RootStackParamList } from '../navigation/RootNavigator';
import { GrainButton } from '../components/GrainButton';
import { Screen } from '../components/Screen';
import { colors, radius, spacing } from '../theme';
import { CATEGORIES, COUNTRIES, isCountryCovered, NODE_TYPES } from '../data/demoContent';
import { useAppState, getCountryName } from '../state/AppState';
import { fetchCoverage, generateContent, generateContentWithOpenAiCompatible } from '../api/grainApi';
import { humanizeCloudError } from '../utils/errors';

type Props = NativeStackScreenProps<RootStackParamList, 'CountryPicker'>;

export function CountryPickerScreen({ navigation }: Props) {
  const { session, setSession, swapCountries, cloudConfigured, apiConfig, setRemoteBundle, clearRemoteBundle } =
    useAppState();
  const [coveredSet, setCoveredSet] = React.useState<Set<string> | null>(null);
  const [coverageLoading, setCoverageLoading] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);

  const apiKind = apiConfig?.kind ?? 'grain_backend';

  React.useEffect(() => {
    let canceled = false;
    if (!cloudConfigured || apiKind !== 'grain_backend') {
      setCoveredSet(null);
      setCoverageLoading(false);
      return;
    }
    setCoverageLoading(true);
    (async () => {
      try {
        const res = await fetchCoverage({ categoryId: session.categoryId });
        if (canceled) return;
        setCoveredSet(new Set(res.coveredCountries));
      } catch {
        if (canceled) return;
        setCoveredSet(null);
      } finally {
        if (canceled) return;
        setCoverageLoading(false);
      }
    })();
    return () => {
      canceled = true;
    };
  }, [apiKind, cloudConfigured, session.categoryId]);

  const isCovered = (countryId: string) => {
    if (cloudConfigured && apiKind === 'openai_compatible') return true;
    if (coveredSet) return coveredSet.has(countryId);
    return isCountryCovered(countryId, session.categoryId);
  };

  const availableCountries = useMemo(() => {
    return COUNTRIES.filter((c) => isCovered(c.id));
  }, [apiKind, cloudConfigured, coveredSet, session.categoryId]);

  const canPickA = (countryId: string) => isCovered(countryId);
  const canPickB = (countryId: string) => isCovered(countryId) && countryId !== session.countryA;

  const canStart =
    canPickA(session.countryA) && canPickB(session.countryB) && session.countryA !== session.countryB;

  const onStart = async () => {
    if (!canStart) return;
    clearRemoteBundle();

    if (!cloudConfigured) {
      navigation.navigate('Dialogue');
      return;
    }

    setGenerating(true);
    try {
      const req = {
        requestedLocale: 'zh',
        categoryId: session.categoryId,
        objectName: session.objectName,
        objectGeneric: session.objectGeneric,
        countryA: session.countryA,
        countryB: session.countryB,
        nodeTypeIds: NODE_TYPES.map((n) => n.id),
      } as const;

      if (apiKind === 'openai_compatible') {
        if (!apiConfig?.baseUrl) throw new Error('请在“API 设置”里填写 Base URL');
        if (!apiConfig?.apiKey) throw new Error('请在“API 设置”里填写 API Key');
        if (!apiConfig?.openaiModel) throw new Error('请在“API 设置”里填写模型名');
      }

      const data =
        apiKind === 'openai_compatible'
          ? await generateContentWithOpenAiCompatible({
              baseUrl: apiConfig?.baseUrl ?? '',
              apiKey: apiConfig?.apiKey ?? '',
              model: apiConfig?.openaiModel ?? '',
              req,
            })
          : await generateContent(req);
      setRemoteBundle(data);
      navigation.navigate('Dialogue');
    } catch (e: any) {
      const msg = humanizeCloudError(e);
      Alert.alert('云端生成失败', msg, [
        { text: '取消', style: 'cancel' },
        {
          text: '用示例继续',
          style: 'default',
          onPress: () => {
            clearRemoteBundle();
            navigation.navigate('Dialogue');
          },
        },
      ]);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Screen style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.hTitle}>选择对照国家</Text>
        <GrainButton label="我的" variant="ghost" onPress={() => navigation.navigate('Profile')} />
      </View>

      <View style={styles.objectRow}>
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
          <Text style={styles.objectName}>{session.objectName}</Text>
          <Text style={styles.objectMeta}>类目：{session.categoryName}</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>类目（MVP仅开放示例）</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {CATEGORIES.map((cat) => {
          const selected = cat.id === session.categoryId;
          return (
            <Pressable
              key={cat.id}
              disabled={!cat.enabled}
              onPress={() => setSession({ categoryId: cat.id, categoryName: cat.name })}
              style={({ pressed }) => [
                styles.chip,
                selected && styles.chipSelected,
                !cat.enabled && styles.chipDisabled,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {cat.name}
                {!cat.enabled ? ' · 未开放' : ''}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {coverageLoading ? (
        <View style={styles.tip}>
          <ActivityIndicator color={colors.text} />
          <Text style={styles.tipText}>正在从云端获取覆盖信息…</Text>
        </View>
      ) : null}

      {availableCountries.length < 6 ? (
        <View style={styles.tip}>
          <Text style={styles.tipText}>
            该类目目前覆盖国家较少（{availableCountries.length}个），先体验示例对照；后续可扩充国家池。
          </Text>
        </View>
      ) : null}

      <View style={styles.pickers}>
        <View style={styles.pickerCol}>
          <Text style={styles.sectionLabel}>左侧国家</Text>
          <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: spacing.l }}>
            {COUNTRIES.map((c) => {
              const enabled = canPickA(c.id);
              const selected = session.countryA === c.id;
              return (
                <Pressable
                  key={c.id}
                  disabled={!enabled}
                  onPress={() => setSession({ countryA: c.id })}
                  style={({ pressed }) => [
                    styles.row,
                    selected && styles.rowSelected,
                    !enabled && styles.rowDisabled,
                    pressed && enabled && { opacity: 0.85 },
                  ]}
                >
                  <Text style={styles.rowText}>{c.name}</Text>
                  <Text style={styles.rowMeta}>{enabled ? '可用' : '未覆盖'}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.pickerCol}>
          <Text style={styles.sectionLabel}>右侧国家</Text>
          <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: spacing.l }}>
            {COUNTRIES.map((c) => {
              const enabled = canPickB(c.id);
              const selected = session.countryB === c.id;
              return (
                <Pressable
                  key={c.id}
                  disabled={!enabled}
                  onPress={() => setSession({ countryB: c.id })}
                  style={({ pressed }) => [
                    styles.row,
                    selected && styles.rowSelected,
                    !enabled && styles.rowDisabled,
                    pressed && enabled && { opacity: 0.85 },
                  ]}
                >
                  <Text style={styles.rowText}>{c.name}</Text>
                  <Text style={styles.rowMeta}>
                    {c.id === session.countryA ? '同侧不可选' : enabled ? '可用' : '未覆盖'}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.selected}>
          <Text style={styles.selectedText}>
            {getCountryName(session.countryA)} vs {getCountryName(session.countryB)}
          </Text>
        </View>
        <View style={styles.footerActions}>
          <GrainButton label="互换" variant="ghost" onPress={swapCountries} />
          <GrainButton
            label="开始对话"
            variant="primary"
            disabled={!canStart || generating}
            onPress={() => void onStart()}
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
  },
  hTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  objectRow: {
    flexDirection: 'row',
    gap: spacing.m,
    alignItems: 'center',
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.m,
    backgroundColor: colors.panel,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.line,
  },
  sticker: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: colors.panel2,
    borderWidth: 1,
    borderColor: colors.line,
  },
  stickerImg: { width: '100%', height: '100%' },
  stickerPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  objectName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  objectMeta: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  sectionLabel: {
    marginTop: spacing.l,
    marginBottom: spacing.s,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  chips: { gap: spacing.s, paddingVertical: spacing.s },
  chip: {
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.m,
    borderRadius: 999,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipSelected: {
    backgroundColor: colors.blue,
    borderColor: 'transparent',
  },
  chipDisabled: {
    opacity: 0.45,
  },
  chipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextSelected: {
    color: '#fff',
  },
  tip: {
    marginTop: spacing.m,
    padding: spacing.m,
    backgroundColor: colors.panel,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.line,
  },
  tipText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  pickers: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.m,
    marginTop: spacing.m,
  },
  pickerCol: { flex: 1 },
  list: {
    backgroundColor: colors.panel,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.line,
    maxHeight: 320,
  },
  row: {
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowSelected: {
    backgroundColor: 'rgba(47,107,255,0.22)',
  },
  rowDisabled: {
    opacity: 0.4,
  },
  rowText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  rowMeta: { color: colors.muted2, fontSize: 11, fontWeight: '700' },
  footer: {
    marginTop: spacing.l,
    padding: spacing.m,
    backgroundColor: colors.panel,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.m,
  },
  selected: { alignItems: 'center' },
  selectedText: { color: colors.text, fontSize: 14, fontWeight: '800' },
  footerActions: {
    flexDirection: 'row',
    gap: spacing.m,
    justifyContent: 'space-between',
  },
});
