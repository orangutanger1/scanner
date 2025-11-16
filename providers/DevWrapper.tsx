import React, { PropsWithChildren, useEffect } from "react";

export type DevWrapperProps = PropsWithChildren<{
  /**
   * Optional callback invoked when the wrapper mounts. This mirrors the tiny bit
   * of lifecycle glue that Rork provided so we can hook into it locally if needed.
   */
  onReady?: () => void;
}>;

export function DevWrapper({ children, onReady }: DevWrapperProps) {
  useEffect(() => {
    onReady?.();
  }, [onReady]);

  return <>{children}</>;
}
