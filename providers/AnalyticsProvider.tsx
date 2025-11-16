import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useMemo,
} from "react";

export type TrackEvent = (eventName: string, payload?: Record<string, unknown>) => void;

export type AnalyticsProviderProps = PropsWithChildren<{
  onTrack?: TrackEvent;
}>;

type AnalyticsContextValue = {
  track: TrackEvent;
};

const noop = () => {
  // noop
};

const AnalyticsContext = createContext<AnalyticsContextValue>({ track: noop });

export function AnalyticsProvider({ children, onTrack }: AnalyticsProviderProps) {
  const value = useMemo<AnalyticsContextValue>(() => ({
    track: (eventName, payload) => {
      if (__DEV__) {
        console.debug(`[analytics] ${eventName}`, payload ?? {});
      }

      onTrack?.(eventName, payload);
    },
  }), [onTrack]);

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  return useContext(AnalyticsContext);
}
