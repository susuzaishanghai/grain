/* ASCII PREAMBLE to avoid tooling UTF-8 slicing issue: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import type { RootStackParamList } from '../navigation/RootNavigator';
import { GrainButton } from '../components/GrainButton';
import { Screen } from '../components/Screen';
import { colors, radius, spacing } from '../theme';
import { fetchCoverage, getGrainApiBaseUrl, testOpenAiCompatibleConnection } from '../api/grainApi';
import { useAppState } from '../state/AppState';
import { humanizeCloudError } from '../utils/errors';

type Props = NativeStackScreenProps<RootStackParamList, 'ApiSettings'>;

export function ApiSettingsScreen({ navigation }: Props) {
  const { apiConfig, cloudConfigured, saveApiConfig, resetApiConfig, clearRemoteBundle, session } = useAppState();

  const effectiveBaseUrl = useMemo(() => getGrainApiBaseUrl() ?? '', [apiConfig, cloudConfigured]);
  const usingLocalOverride = Boolean(apiConfig);

  const [enabled, setEnabled] = useState<boolean>(apiConfig?.enabled ?? cloudConfigured);
  const [kind, setKind] = useState<'grain_backend' | 'openai_compatible'>(apiConfig?.kind ?? 'grain_backend');
  const [baseUrl, setBaseUrl] = useState<string>(apiConfig?.baseUrl ?? effectiveBaseUrl);
  const [apiKey, setApiKey] = useState<string>(apiConfig?.apiKey ?? '');
  const [openaiModel, setOpenaiModel] = useState<string>(apiConfig?.openaiModel ?? 'gpt-4o-mini');
  const [openaiVisionModel, setOpenaiVisionModel] = useState<string>(apiConfig?.openaiVisionModel ?? '');
  const [imageEnabled, setImageEnabled] = useState<boolean>(Boolean(apiConfig?.imageEnabled ?? false));
  const [imageKind, setImageKind] = useState<'grain_backend' | 'openai_compatible' | 'dashscope_wanx'>(
    apiConfig?.imageKind ?? apiConfig?.kind ?? 'grain_backend'
  );
  const [imageBaseUrl, setImageBaseUrl] = useState<string>(apiConfig?.imageBaseUrl ?? '');
  const [imageApiKey, setImageApiKey] = useState<string>(apiConfig?.imageApiKey ?? '');
  const [openaiImageModel, setOpenaiImageModel] = useState<string>(apiConfig?.openaiImageModel ?? '');
  const [testing, setTesting] = useState(false);

  const saveNow = (nextEnabled: boolean) => {
    const url = baseUrl.trim().replace(/\/+$/, '');
    const imageUrl = imageBaseUrl.trim().replace(/\/+$/, '');
    const imageKey = imageApiKey.trim();
    const imageModel = openaiImageModel.trim();
    if (nextEnabled && !url) {
      Alert.alert('请填写 Base URL', '启用云端时必须配置后端地址。');
      return;
    }
    if (nextEnabled && kind === 'openai_compatible' && !apiKey.trim()) {
      Alert.alert('请填写 API Key', 'OpenAI兼容直连模式需要提供供应商 API Key（Bearer）。');
      return;
    }
    if (nextEnabled && kind === 'openai_compatible' && !openaiModel.trim()) {
      Alert.alert('请填写模型名', '例如：gpt-4o-mini / qwen-plus / deepseek-chat（以你的供应商为准）。');
      return;
    }
    if (nextEnabled && imageEnabled && imageKind !== 'grain_backend' && !(imageKey || apiKey.trim())) {
      Alert.alert('请填写生图 API Key', '启用配图且选择 OpenAI 兼容直连生图时，需要提供 API Key（可填在生图 API Key 或上面的 API Key）。');
      return;
    }
    if (nextEnabled && imageEnabled && imageKind !== 'grain_backend' && !imageModel) {
      Alert.alert('请填写生图模型名', '启用配图后，需要填写生图模型名（例如：gpt-image-1 / qwen-image / wanx-v2 等）。');
      return;
    }
    saveApiConfig({
      enabled: nextEnabled,
      kind,
      baseUrl: url,
      apiKey: apiKey.trim(),
      openaiModel: openaiModel.trim(),
      openaiVisionModel: openaiVisionModel.trim() ? openaiVisionModel.trim() : undefined,
      imageEnabled,
      imageKind,
      imageBaseUrl: imageUrl ? imageUrl : undefined,
      imageApiKey: imageKey ? imageKey : undefined,
      openaiImageModel: imageModel ? imageModel : undefined,
    });
    clearRemoteBundle();
    Alert.alert('已保存', nextEnabled ? '云端 API 已启用。' : '云端 API 已关闭（强制走本地示例）。');
  };

  const onSave = () => saveNow(enabled);

  const onResetToPackaged = () => {
    Alert.alert('恢复打包配置', '将清除本机设置（若打包时未配置云端，则会变为关闭）。', [
      { text: '取消', style: 'cancel' },
      {
        text: '确认',
        style: 'destructive',
        onPress: () => {
          resetApiConfig();
          clearRemoteBundle();
          const next = getGrainApiBaseUrl() ?? '';
          setEnabled(Boolean(next));
            setKind('grain_backend');
            setBaseUrl(next);
            setApiKey('');
            setOpenaiModel('gpt-4o-mini');
            setOpenaiVisionModel('');
            setImageEnabled(false);
            setImageKind('grain_backend');
            setImageBaseUrl('');
            setImageApiKey('');
            setOpenaiImageModel('');
          },
        },
      ]);
  };

  const onTest = async () => {
    setTesting(true);
    try {
      const url = baseUrl.trim();
      if (!url) throw new Error('请填写 Base URL');
      if (kind === 'openai_compatible') {
        if (!apiKey.trim()) throw new Error('请填写 API Key');
        if (!openaiModel.trim()) throw new Error('请填写模型名');
        await testOpenAiCompatibleConnection({ baseUrl: url, apiKey: apiKey.trim(), model: openaiModel.trim() });
        Alert.alert('连接成功', 'OpenAI兼容接口可用（已完成 chat/completions 测试）。');
      } else {
        const res = await fetchCoverage({ categoryId: session.categoryId });
        Alert.alert('连接成功', `覆盖国家数：${res.coveredCountries.length}`);
      }
    } catch (e: any) {
      const msg = humanizeCloudError(e);
      Alert.alert('连接失败', msg);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Screen style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>返回</Text>
        </Pressable>
        <Text style={styles.hTitle}>API 设置</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: spacing.xl }}
      >
      <View style={styles.panel}>
        <Text style={styles.label}>当前生效</Text>
        <Text style={styles.value}>{cloudConfigured ? effectiveBaseUrl : '云端已关闭（使用本地示例）'}</Text>
        <Text style={styles.hint}>
          {usingLocalOverride ? '来源：本机设置（可随时修改）' : '来源：打包配置/默认（本机未覆盖）'}
        </Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.label}>API 类型</Text>
        <View style={styles.kindRow}>
          <Pressable
            onPress={() => setKind('grain_backend')}
            style={[styles.kindBtn, kind === 'grain_backend' && styles.kindBtnOn]}
          >
            <Text style={[styles.kindText, kind === 'grain_backend' && styles.kindTextOn]}>Grain 后端</Text>
          </Pressable>
          <Pressable
            onPress={() => setKind('openai_compatible')}
            style={[styles.kindBtn, kind === 'openai_compatible' && styles.kindBtnOn]}
          >
            <Text style={[styles.kindText, kind === 'openai_compatible' && styles.kindTextOn]}>OpenAI 兼容（直连）</Text>
          </Pressable>
        </View>

        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>启用云端 API</Text>
            <Text style={styles.hint}>
              关闭后会强制走本地示例内容（无需重打包）。OpenAI兼容直连模式会把供应商 Key 放进客户端，请自行评估风险。
            </Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{ false: 'rgba(255,255,255,0.18)', true: 'rgba(47,107,255,0.6)' }}
            thumbColor={enabled ? colors.blue : 'rgba(255,255,255,0.75)'}
          />
        </View>

        <Text style={[styles.label, { marginTop: spacing.m }]}>Base URL</Text>
        <TextInput
          value={baseUrl}
          onChangeText={setBaseUrl}
          placeholder={kind === 'openai_compatible' ? 'https://.../v1 或 https://.../compatible-mode/v1' : 'https://api.yourdomain.com'}
          placeholderTextColor={colors.muted2}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />

        <Text style={[styles.label, { marginTop: spacing.m }]}>
          API Key（{kind === 'openai_compatible' ? '必填' : '可选'}）
        </Text>
        <TextInput
          value={apiKey}
          onChangeText={setApiKey}
          placeholder={kind === 'openai_compatible' ? '供应商 API Key（Bearer）' : 'App → 后端的 token（可留空）'}
          placeholderTextColor={colors.muted2}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          style={styles.input}
        />

        {kind === 'openai_compatible' ? (
          <>
            <Text style={[styles.label, { marginTop: spacing.m }]}>模型名（必填）</Text>
            <TextInput
              value={openaiModel}
              onChangeText={setOpenaiModel}
              placeholder="例如：qwen-plus / gpt-4o-mini"
              placeholderTextColor={colors.muted2}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />

            <Text style={[styles.label, { marginTop: spacing.m }]}>视觉模型（可选）</Text>
            <TextInput
              value={openaiVisionModel}
              onChangeText={setOpenaiVisionModel}
              placeholder="例如：qwen-vl-plus / gpt-4o-mini（留空=复用上面的模型）"
              placeholderTextColor={colors.muted2}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
          </>
        ) : null}

        <View style={[styles.rowBetween, { marginTop: spacing.l }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>启用知识卡配图（生图）</Text>
            <Text style={styles.hint}>打开“知识卡详情”时会生成一张插画；失败不影响阅读，可重试。</Text>
          </View>
          <Switch
            value={imageEnabled}
            onValueChange={setImageEnabled}
            trackColor={{ false: 'rgba(255,255,255,0.18)', true: 'rgba(47,107,255,0.6)' }}
            thumbColor={imageEnabled ? colors.blue : 'rgba(255,255,255,0.75)'}
          />
        </View>

        {imageEnabled ? (
          <>
            <Text style={[styles.label, { marginTop: spacing.m }]}>生图接口类型</Text>
            <View style={styles.kindRow}>
              <Pressable
                onPress={() => setImageKind('grain_backend')}
                style={[styles.kindBtn, imageKind === 'grain_backend' && styles.kindBtnOn]}
              >
                <Text style={[styles.kindText, imageKind === 'grain_backend' && styles.kindTextOn]}>Grain 后端</Text>
              </Pressable>
              <Pressable
                onPress={() => setImageKind('openai_compatible')}
                style={[styles.kindBtn, imageKind === 'openai_compatible' && styles.kindBtnOn]}
              >
                <Text style={[styles.kindText, imageKind === 'openai_compatible' && styles.kindTextOn]}>OpenAI 兼容（直连）</Text>
              </Pressable>
              <Pressable
                onPress={() => setImageKind('dashscope_wanx')}
                style={[styles.kindBtn, imageKind === 'dashscope_wanx' && styles.kindBtnOn]}
              >
                <Text style={[styles.kindText, imageKind === 'dashscope_wanx' && styles.kindTextOn]}>DashScope 万相</Text>
              </Pressable>
            </View>

            <Text style={[styles.label, { marginTop: spacing.m }]}>生图 Base URL（可选）</Text>
            <TextInput
              value={imageBaseUrl}
              onChangeText={setImageBaseUrl}
              placeholder={
                imageKind === 'dashscope_wanx'
                  ? '留空=默认 https://dashscope.aliyuncs.com（不要填 /api/v1）'
                  : '留空=复用上面的 Base URL'
              }
              placeholderTextColor={colors.muted2}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />

            <Text style={[styles.label, { marginTop: spacing.m }]}>生图 API Key（可选）</Text>
            <TextInput
              value={imageApiKey}
              onChangeText={setImageApiKey}
              placeholder="留空=复用上面的 API Key"
              placeholderTextColor={colors.muted2}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              style={styles.input}
            />

            {imageKind === 'openai_compatible' ? (
              <>
                <Text style={[styles.label, { marginTop: spacing.m }]}>生图模型名（必填）</Text>
                <TextInput
                  value={openaiImageModel}
                  onChangeText={setOpenaiImageModel}
                  placeholder="例如：gpt-image-1 / wanx-v2（以你的供应商为准）"
                  placeholderTextColor={colors.muted2}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />
              </>
            ) : imageKind === 'dashscope_wanx' ? (
              <>
                <Text style={[styles.label, { marginTop: spacing.m }]}>DashScope 生图模型 Code（必填）</Text>
                <TextInput
                  value={openaiImageModel}
                  onChangeText={setOpenaiImageModel}
                  placeholder="例如：qwen-image / wanx-v2（以 DashScope 控制台为准）"
                  placeholderTextColor={colors.muted2}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />
                <Text style={[styles.hint, { marginTop: spacing.s }]}>
                  说明：DashScope 不支持 OpenAI 生图接口 `/v1/images/generations`；这里会走 DashScope 原生生图接口（App 已内置）。Base URL 建议填
                  `https://dashscope.aliyuncs.com`（不要填 `/api/v1`）。
                </Text>
              </>
            ) : (
              <Text style={[styles.hint, { marginTop: spacing.s }]}>
                Grain 后端模式：App 会调用 `POST /v1/image`，由你的后端决定接哪家生图服务。
              </Text>
            )}
          </>
        ) : null}

        <View style={styles.actions}>
          <GrainButton label={testing ? '测试中…' : '测试连接'} variant="ghost" disabled={testing} onPress={() => void onTest()} />
          <GrainButton label="保存" variant="primary" onPress={onSave} />
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.hint}>
          安全提示：不要把供应商 Key（OpenAI/火山/通义等）直接放进 App；建议放在你自己的后端里。这里的 Key 仅建议用于“App → 你后端”的低权限访问控制。
        </Text>
        <View style={[styles.actions, { marginTop: spacing.m }]}>
          <GrainButton label="恢复打包配置" variant="ghost" onPress={onResetToPackaged} />
          <GrainButton
            label="关闭云端"
            variant="ghost"
            onPress={() => {
              setEnabled(false);
              saveNow(false);
            }}
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
  panel: {
    marginTop: spacing.m,
    padding: spacing.l,
    backgroundColor: colors.panel,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.s,
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.m },
  label: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  value: { color: colors.text, fontSize: 13, fontWeight: '800', marginTop: 4 },
  hint: { color: colors.muted2, fontSize: 12, lineHeight: 18, fontWeight: '600' },
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
    fontWeight: '700',
  },
  actions: { flexDirection: 'row', gap: spacing.m, justifyContent: 'space-between', marginTop: spacing.l },
  kindRow: { flexDirection: 'row', gap: spacing.s, marginTop: spacing.s },
  kindBtn: {
    flex: 1,
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.m,
    borderRadius: radius.m,
    backgroundColor: colors.panel2,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
  },
  kindBtnOn: { backgroundColor: colors.blue, borderColor: 'transparent' },
  kindText: { color: colors.text, fontSize: 12, fontWeight: '900' },
  kindTextOn: { color: '#fff' },
});
