import React, { Suspense } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { useApplyHeadMeta } from "@/hooks/use-site-settings";
import NotFound from "@/pages/not-found";
import LandingPage from "./pages/landing"; // Eager loaded for LCP

// Lazy load non-critical routes to fix "Reduce unused JavaScript"
const PricingPage = React.lazy(() => import("./pages/pricing"));
const LoginPage = React.lazy(() => import("./pages/login"));
const RegisterPage = React.lazy(() => import("./pages/register"));
const DashboardPage = React.lazy(() => import("./pages/dashboard"));
const DocsPage = React.lazy(() => import("./pages/docs"));
const UpgradePage = React.lazy(() => import("./pages/upgrade"));
const AdminPage = React.lazy(() => import("./pages/admin"));
const VerifyPage = React.lazy(() => import("./pages/verify"));
const SupportPage = React.lazy(() => import("./pages/support"));
const SupportNewPage = React.lazy(() => import("./pages/support-new"));
const SupportTicketPage = React.lazy(() => import("./pages/support-ticket"));
const ForgotPasswordPage = React.lazy(() => import("./pages/forgot-password"));
const ResetPasswordPage = React.lazy(() => import("./pages/reset-password"));
const BlogPage = React.lazy(() => import("./pages/blog"));
const BlogPostPage = React.lazy(() => import("./pages/blog-post"));

const queryClient = new QueryClient();

// Protected Route Wrapper
function ProtectedRoute({ component: Component, adminOnly = false }: { component: any, adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (adminOnly && user.role !== "ADMIN") {
    return <Redirect to="/dashboard" />;
  }

  return <Component />;
}

function GlobalHeadManager() {
  useApplyHeadMeta();
  return null;
}

function Router() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex flex-col items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div><p className="mt-4 text-sm text-muted-foreground animate-pulse">Loading app modules...</p></div>}>
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/pricing" component={PricingPage} />
        <Route path="/docs" component={DocsPage} />
        <Route path="/verify" component={VerifyPage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/signup" component={RegisterPage} />
        <Route path="/forgot-password" component={ForgotPasswordPage} />
        <Route path="/reset-password" component={ResetPasswordPage} />
        <Route path="/blog" component={BlogPage} />
        <Route path="/blog/:slug" component={BlogPostPage} />
        
        {/* Protected Routes */}
        <Route path="/dashboard">
          {() => <ProtectedRoute component={DashboardPage} />}
        </Route>
        <Route path="/upgrade">
          {() => <ProtectedRoute component={UpgradePage} />}
        </Route>
        <Route path="/upgrade/success">
          {() => <ProtectedRoute component={UpgradePage} />}
        </Route>
        <Route path="/admin">
          {() => <ProtectedRoute component={AdminPage} adminOnly={true} />}
        </Route>
        <Route path="/support">
          {() => <ProtectedRoute component={SupportPage} />}
        </Route>
        <Route path="/support/new">
          {() => <ProtectedRoute component={SupportNewPage} />}
        </Route>
        <Route path="/support/ticket/:id">
          {() => <ProtectedRoute component={SupportTicketPage} />}
        </Route>
        
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <GlobalHeadManager />
            <Router />
          </AuthProvider>
        </WouterRouter>
        {/* We use Toaster here if it exists. If standard shadcn toaster is not present, we will silently fail which is fine. */}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
