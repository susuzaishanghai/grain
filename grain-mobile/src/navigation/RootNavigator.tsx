/* ASCII PREAMBLE to avoid tooling UTF-8 slicing issue: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA */

import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { colors } from '../theme';
import { useAppState } from '../state/AppState';
import { CameraScreen } from '../screens/CameraScreen';
import { IdentifyScreen } from '../screens/IdentifyScreen';
import { CountryPickerScreen } from '../screens/CountryPickerScreen';
import { DialogueScreen } from '../screens/DialogueScreen';
import { CardsScreen } from '../screens/CardsScreen';
import { CardDetailScreen } from '../screens/CardDetailScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { CollectionScreen } from '../screens/CollectionScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { MapScreen } from '../screens/MapScreen';
import { ApiSettingsScreen } from '../screens/ApiSettingsScreen';
import type { NodeTypeId } from '../types';

export type RootStackParamList = {
  Camera: undefined;
  Identify: undefined;
  CountryPicker: undefined;
  Dialogue: undefined;
  Cards: { focusNodeTypeId?: NodeTypeId; focusSide?: 'A' | 'B' } | undefined;
  CardDetail: { cardId: string };
  Profile: undefined;
  ApiSettings: undefined;
  Calendar: undefined;
  Map: undefined;
  Collection: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.blue,
    background: colors.bg,
    card: colors.bg2,
    text: colors.text,
    border: colors.line,
    notification: colors.yellow,
  },
};

export function RootNavigator() {
  const { hydrated } = useAppState();

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Camera" component={CameraScreen} />
        <Stack.Screen name="Identify" component={IdentifyScreen} />
        <Stack.Screen name="CountryPicker" component={CountryPickerScreen} />
        <Stack.Screen name="Dialogue" component={DialogueScreen} />
        <Stack.Screen name="Cards" component={CardsScreen} />
        <Stack.Screen name="CardDetail" component={CardDetailScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="ApiSettings" component={ApiSettingsScreen} />
        <Stack.Screen name="Calendar" component={CalendarScreen} />
        <Stack.Screen name="Map" component={MapScreen} />
        <Stack.Screen name="Collection" component={CollectionScreen} />
      </Stack.Navigator>
      {!hydrated ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.35)',
          }}
        >
          <ActivityIndicator color={colors.text} />
        </View>
      ) : null}
    </NavigationContainer>
  );
}
