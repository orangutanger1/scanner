import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { StatusBar as RNStatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { DocumentProvider } from "../contexts/DocumentContext";
import { AnalyticsProvider } from "../providers/AnalyticsProvider";
import { DevWrapper } from "../providers/DevWrapper";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
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
          title: "Document"
        }} 
      />
    </Stack>
  );
}

function RootLayout() {
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
      <QueryClientProvider client={queryClient}>
        <DocumentProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <RootLayoutNav />
          </GestureHandlerRootView>
        </DocumentProvider>
      </QueryClientProvider>
    </>
  );
}
export default function RootLayoutWrapper() {
  return (
    <AnalyticsProvider>
      <DevWrapper>
        <RootLayout />
      </DevWrapper>
    </AnalyticsProvider>
  );
}