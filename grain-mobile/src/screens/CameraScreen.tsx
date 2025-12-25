/* ASCII PREAMBLE to avoid tooling UTF-8 slicing issue: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA */

import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { RootStackParamList } from '../navigation/RootNavigator';
import { colors, radius, spacing } from '../theme';
import { DEMO_OBJECT, CATEGORIES } from '../data/demoContent';
import { useAppState } from '../state/AppState';
import { GrainButton } from '../components/GrainButton';
import { Screen } from '../components/Screen';

type Props = NativeStackScreenProps<RootStackParamList, 'Camera'>;

export function CameraScreen({ navigation }: Props) {
  const isFocused = useIsFocused();
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [capturing, setCapturing] = useState(false);
  const { setSession } = useAppState();

  const enabledCategory = CATEGORIES.find((c) => c.enabled) ?? CATEGORIES[0]!;

  const startSession = (photoUri: string | null, photoBase64: string | null) => {
    setSession({
      photoUri,
      photoBase64,
      objectName: DEMO_OBJECT.objectName,
      objectGeneric: DEMO_OBJECT.objectGeneric,
      categoryId: enabledCategory.id,
      categoryName: enabledCategory.name,
    });
    navigation.navigate('Identify');
  };

  const onCapture = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, base64: true });
      startSession(photo.uri, photo.base64 ?? null);
    } catch {
      startSession(null, null);
    } finally {
      setCapturing(false);
    }
  };

  if (!permission) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={colors.text} />
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen style={styles.center}>
        <View style={styles.topBar}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.m }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>GRAIN</Text>
              <Text style={styles.subtitle}>To see the world in a grain</Text>
            </View>
            <GrainButton label="我的" variant="ghost" onPress={() => navigation.navigate('Profile')} />
          </View>
        </View>
        <Text style={styles.body}>需要相机权限来拍照识别物体（MVP示例）。</Text>
        <GrainButton label="允许相机权限" variant="primary" onPress={() => void requestPermission()} />
        <GrainButton label="直接体验示例（无相机）" variant="ghost" onPress={() => startSession(null, null)} />
      </Screen>
    );
  }

  return (
    <View style={styles.cameraRoot}>
      {isFocused ? (
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]} />
      )}

      <View style={styles.topOverlay} pointerEvents="box-none">
        <View style={styles.topBar}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.m }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>GRAIN</Text>
              <Text style={styles.subtitle}>To see the world in a grain</Text>
            </View>
            <GrainButton label="我的" variant="ghost" onPress={() => navigation.navigate('Profile')} />
          </View>
        </View>
      </View>

      <View style={styles.bottomOverlay} pointerEvents="box-none">
        <View style={styles.bottomBar}>
          <GrainButton
            label={facing === 'back' ? '切前置' : '切后置'}
            variant="ghost"
            onPress={() => setFacing((v) => (v === 'back' ? 'front' : 'back'))}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="拍照"
            onPress={() => void onCapture()}
            style={({ pressed }) => [styles.shutter, pressed && { opacity: 0.85 }]}
          >
            <View style={styles.shutterInner} />
          </Pressable>

          <GrainButton label="示例" variant="ghost" onPress={() => startSession(null, null)} />
        </View>
      </View>

      {capturing ? (
        <View style={styles.blocking}>
          <ActivityIndicator color={colors.text} />
          <Text style={styles.body}>处理中…</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cameraRoot: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.l,
  },
  topBar: {
    backgroundColor: 'rgba(0,0,0,0.32)',
    borderRadius: radius.l,
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.l,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  bottomOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.l,
    paddingBottom: spacing.xl,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.m,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderRadius: radius.xl,
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.l,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  blocking: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.m,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.l,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    letterSpacing: 3,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  body: {
    color: colors.muted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
