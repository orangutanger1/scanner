import { AnalyticsProvider } from '@rork-ai/toolkit-sdk';
import { RorkDevWrapper } from '@rork-ai/toolkit-dev-sdk/v54';
// template
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { DocumentProvider } from "../contexts/DocumentContext";

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
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <DocumentProvider>
        <GestureHandlerRootView>
          <RootLayoutNav />
        </GestureHandlerRootView>
      </DocumentProvider>
    </QueryClientProvider>
  );
}
export default function RorkRootLayoutWrapper() {
  return (
    <AnalyticsProvider><RorkDevWrapper><RootLayout /></RorkDevWrapper></AnalyticsProvider>
  );
}