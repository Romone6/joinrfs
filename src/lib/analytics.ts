type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

type PostHogLike = {
  capture: (eventName: string, properties?: AnalyticsProperties) => void;
};

declare global {
  interface Window {
    posthog?: PostHogLike;
  }
}

const trackedEvents = [
  "popup_auto_opened",
  "popup_closed",
  "become_firefighter_clicked",
  "survey_started",
  "survey_submitted",
  "survey_submit_error",
  "package_email_sent",
  "package_email_failed",
] as const;

export type AnalyticsEventName = (typeof trackedEvents)[number];

export function trackEvent(eventName: AnalyticsEventName, properties?: AnalyticsProperties): void {
  if (typeof window === "undefined") {
    return;
  }

  window.posthog?.capture(eventName, properties);
}
