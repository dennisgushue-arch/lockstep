import Missed from "@/pages/missed";
import TestIntentPage from "@/pages/test-intent";
import DebugPage from "@/pages/debug";
import CreditsPage from "@/pages/credits";
import { Switch, Route } from "wouter";
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

const isDev = import.meta.env.DEV;

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
        <Route path="/missed" component={Missed} />
        <Route path="/momentum" component={MomentumPage} />
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
            <Router />
            <Toaster />
          </AppProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
