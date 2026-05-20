import Missed from "@/pages/missed";
import TestIntentPage from "@/pages/test-intent";
import DebugPage from "@/pages/debug";
import CreditsPage from "@/pages/credits";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/lib/mock-data";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";
import { ErrorBoundary } from "@/components/ui/error-boundary";

import Landing from "@/pages/landing";
import AuthPage from "@/pages/auth";
import Dashboard from "@/pages/dashboard";
import CapturePage from "@/pages/capture";
import ReflectionPage from "@/pages/reflection";
import LockInPage from "@/pages/lock-in";
import StakesPage from "@/pages/stakes";
import DetectionPage from "@/pages/detection";
import SettingsPage from "@/pages/settings";
import { Stakes as StakeScreen } from "@/components/stakes";
import AdminPage from "@/pages/admin";
import { VoiceNotesPage } from "@/pages/voice-notes";
import { HistoryPage } from "@/pages/history";
import ConnectedSourcesPage from "@/pages/connected-sources";
import { RecommendationsPage } from "@/pages/recommendations";
import JournalPage from "@/pages/journal";
import OnboardingPage from "@/pages/onboarding";
import ResultPage from "@/pages/result";
import MomentumPage from "@/pages/momentum";
import { ReviewPrompt } from "@/components/review-prompt";
import PactAct from "@/pages/pact-act";
import PactProvePage from "@/pages/pact-prove";
import RecoveryPage from "@/pages/recovery";
import LeaderboardPage from "@/pages/leaderboard";


import { App as CapacitorApp } from "@capacitor/app";
import { LocalNotifications } from "@capacitor/local-notifications";
import { handleDeepLink } from "@/lib/deeplink";
import { routeFromNotificationUrl } from "@/lib/notification-routing";
import { useEffect } from "react";

const isDev = import.meta.env.DEV;

function DeepLinkRuntime() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    let appUrlListener: { remove: () => Promise<void> } | null = null;
    let notificationListener: { remove: () => Promise<void> } | null = null;
    let expoNotificationResponseSub: { remove: () => void } | null = null;

    const register = async () => {
      appUrlListener = await CapacitorApp.addListener("appUrlOpen", ({ url }) => {
        if (url) {
          handleDeepLink(url, setLocation);
        }
      });

      notificationListener = await LocalNotifications.addListener("localNotificationActionPerformed", (event) => {
        const deepLink = event.notification.extra?.deepLink as string | undefined;
        if (deepLink) {
          handleDeepLink(deepLink, setLocation);
        }
      });

      const isNative = typeof window !== "undefined" && Boolean((window as any).Capacitor?.isNativePlatform?.());

      if (isNative) {
        try {
          const Notifications = await import("expo-notifications");
          expoNotificationResponseSub = Notifications.addNotificationResponseReceivedListener((response) => {
            const url = response.notification.request.content.data?.url as string | undefined;
            if (url) {
              routeFromNotificationUrl(url, setLocation);
            }
          });
        } catch (error) {
          console.warn("[DeepLinkRuntime] Expo notifications unavailable", error);
        }
      }

      const launch = await CapacitorApp.getLaunchUrl();
      if (launch?.url) {
        handleDeepLink(launch.url, setLocation);
      }
    };

    void register();

    return () => {
      void appUrlListener?.remove();
      void notificationListener?.remove();
      expoNotificationResponseSub?.remove();
    };
  }, [setLocation]);

  return null;
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/capture" component={CapturePage} />
        <Route path="/detection" component={DetectionPage} />
        <Route path="/reflection" component={ReflectionPage} />
        <Route path="/lock-in" component={LockInPage} />
        <Route path="/credits" component={CreditsPage} />
        <Route path="/stakes" component={StakesPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/voice-notes" component={VoiceNotesPage} />
        <Route path="/history" component={HistoryPage} />
        <Route path="/connected-sources" component={ConnectedSourcesPage} />
        <Route path="/recommendations" component={RecommendationsPage} />
        <Route path="/journal" component={JournalPage} />
        <Route path="/onboarding" component={OnboardingPage} />
        <Route path="/result" component={ResultPage} />
        <Route path="/result/:id" component={ResultPage} />
        <Route path="/pact/:id/act" component={PactAct} />
        <Route path="/pact/:id/prove" component={PactProvePage} />
        <Route path="/recovery/:id" component={RecoveryPage} />
        <Route path="/missed" component={Missed} />
        <Route path="/momentum" component={MomentumPage} />
        <Route path="/leaderboard" component={LeaderboardPage} />
        {isDev && <Route path="/test-intent" component={TestIntentPage} />}
        {isDev && <Route path="/debug" component={DebugPage} />}
        {isDev && (
          <Route path="/stake-test">
            <StakeScreen 
              stake={5} 
              setStake={() => {}} 
              consequence="money" 
              setConsequence={() => {}} 
              commitmentId="test-commitment-id"
              onSuccess={() => alert("Authorized !")}
            />
          </Route>
        )}
        <Route path="/admin" component={AdminPage} />

        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AppProvider>
              <DeepLinkRuntime />
              <Router />
              <ReviewPrompt />
              <Toaster />
            </AppProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
