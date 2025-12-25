/* ASCII PREAMBLE to avoid tooling UTF-8 slicing issue: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA */

import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { RootStackParamList } from '../navigation/RootNavigator';
import { Screen } from '../components/Screen';
import { colors, radius, spacing } from '../theme';
import { NODE_TYPES, isCountryCovered } from '../data/demoContent';
import { getCountryName, useAppState } from '../state/AppState';
import type { NodeTypeId } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Dialogue'>;

export function DialogueScreen({ navigation }: Props) {
  const { session, resolveChapterMeta, resolveDialogue, remoteBundle, cloudConfigured } = useAppState();
  const [nodeTypeId, setNodeTypeId] = useState<NodeTypeId>('ORIGIN');

  useFocusEffect(
    useCallback(() => {
      if (session.countryA === session.countryB) {
        navigation.replace('CountryPicker');
        return;
      }
      if (!cloudConfigured) {
        const okA = isCountryCovered(session.countryA, session.categoryId);
        const okB = isCountryCovered(session.countryB, session.categoryId);
        if (!okA || !okB) navigation.replace('CountryPicker');
      }
    }, [cloudConfigured, navigation, session.categoryId, session.countryA, session.countryB])
  );

  const chapter = useMemo(
    () => resolveChapterMeta(session.categoryId, nodeTypeId),
    [resolveChapterMeta, session.categoryId, nodeTypeId]
  );
  const dialogueA = useMemo(
    () => resolveDialogue(nodeTypeId, session.countryA),
    [resolveDialogue, nodeTypeId, session.countryA]
  );
  const dialogueB = useMemo(
    () => resolveDialogue(nodeTypeId, session.countryB),
    [resolveDialogue, nodeTypeId, session.countryB]
  );

  return (
    <Screen style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>返回</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.hTitle}>时光机对话</Text>
          <Text style={styles.hSub}>
            {session.objectGeneric} · {getCountryName(session.countryA)} vs {getCountryName(session.countryB)}
          </Text>
          {remoteBundle ? <Text style={styles.hCloud}>云端内容已启用</Text> : null}
        </View>
        <Pressable onPress={() => navigation.navigate('Cards', { focusNodeTypeId: nodeTypeId })} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>卡片</Text>
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
        <View style={{ flex: 1 }}>
          <Text style={styles.chapterTitle}>{chapter.chapterTitle}</Text>
          <Text style={styles.chapterTime}>{chapter.displayTimeLabel}</Text>
        </View>
        <View style={styles.sticker}>
          {session.photoUri ? <Image source={{ uri: session.photoUri }} style={styles.stickerImg} /> : null}
          {!session.photoUri ? <Text style={styles.stickerFallback}>{session.objectName}</Text> : null}
        </View>
      </View>

      <View style={styles.dual}>
        <Pressable
          onPress={() => navigation.navigate('Cards', { focusNodeTypeId: nodeTypeId, focusSide: 'A' })}
          style={({ pressed }) => [styles.bubble, pressed && { opacity: 0.92 }]}
        >
          <Text style={styles.bubbleMeta}>{getCountryName(session.countryA)}</Text>
          <Text style={styles.bubbleText}>{dialogueA}</Text>
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate('Cards', { focusNodeTypeId: nodeTypeId, focusSide: 'B' })}
          style={({ pressed }) => [styles.bubble, pressed && { opacity: 0.92 }]}
        >
          <Text style={styles.bubbleMeta}>{getCountryName(session.countryB)}</Text>
          <Text style={styles.bubbleText}>{dialogueB}</Text>
        </Pressable>
      </View>

      <View style={styles.bottom}>
        <Pressable onPress={() => navigation.navigate('Cards', { focusNodeTypeId: nodeTypeId })} style={styles.cta}>
          <Text style={styles.ctaText}>查看本节点知识卡</Text>
        </Pressable>
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
  hCloud: { color: colors.muted2, fontSize: 11, fontWeight: '800', marginTop: 4 },
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  chapterTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  chapterTime: { color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: 6 },
  sticker: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerImg: { width: '100%', height: '100%' },
  stickerFallback: { color: colors.muted, fontSize: 11, fontWeight: '800', textAlign: 'center' },
  dual: {
    marginTop: spacing.m,
    flex: 1,
    gap: spacing.m,
  },
  bubble: {
    padding: spacing.l,
    backgroundColor: colors.panel,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.line,
  },
  bubbleMeta: { color: colors.muted2, fontSize: 12, fontWeight: '800', marginBottom: spacing.s },
  bubbleText: { color: colors.text, fontSize: 14, lineHeight: 21, fontWeight: '600' },
  bottom: {
    marginTop: spacing.m,
    alignItems: 'center',
  },
  cta: {
    width: '100%',
    paddingVertical: spacing.m,
    borderRadius: radius.l,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '900' },
});
