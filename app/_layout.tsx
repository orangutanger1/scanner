import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { StatusBar as RNStatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { DocumentProvider } from "../contexts/DocumentContext";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ 
      headerBackTitle: "Back",
      contentStyle: { backgroundColor: "#F5F5F5" },
      headerStyle: { backgroundColor: "#F5F5F5" }
    }}>
      <Stack.Screen 
        name="index" 
        options={{ 
          headerShown: true,
          headerLargeTitle: true,
        }} 
      />
      <Stack.Screen 
        name="camera" 
        options={{ 
          headerShown: false,
          presentation: "fullScreenModal",
          animation: "slide_from_bottom"
        }} 
      />
      <Stack.Screen 
        name="edit" 
        options={{ 
          headerShown: false,
          presentation: "modal"
        }} 
      />
      <Stack.Screen 
        name="document" 
        options={{ 
          headerShown: true,
          title: "Document",
          contentStyle: { backgroundColor: "#F5F5F5" },
          headerStyle: { backgroundColor: "#F5F5F5" },
        }} 
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
    RNStatusBar.setHidden(true, "slide");

    return () => {
      RNStatusBar.setHidden(false, "slide");
    };
  }, []);

  return (
    <>
      <StatusBar hidden translucent animated style="light" />
      <DocumentProvider>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
          <RootLayoutNav />
        </GestureHandlerRootView>
      </DocumentProvider>
    </>
  );
}