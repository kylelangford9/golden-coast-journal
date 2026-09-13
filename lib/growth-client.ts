'use client';

type GrowthMetadata = Record<string, string | number | boolean>;
type QueuedGrowthEvent = {
  eventName: string;
  metadata: GrowthMetadata;
};

type GrowthWindow = Window & {
  kyleGrowth?: {
    track: (eventName: string, metadata?: GrowthMetadata) => void;
  };
  __klGrowthQueue?: QueuedGrowthEvent[];
};

export function trackPortfolioGrowth(
  eventName: string,
  metadata: GrowthMetadata = {},
) {
  const growthWindow = window as GrowthWindow;
  if (growthWindow.kyleGrowth) {
    growthWindow.kyleGrowth.track(eventName, metadata);
    return;
  }
  growthWindow.__klGrowthQueue ||= [];
  growthWindow.__klGrowthQueue.push({ eventName, metadata });
}
