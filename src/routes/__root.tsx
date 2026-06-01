import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";


import appCss from "../styles.css?url";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { VoiceFab } from "@/components/VoiceFab";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass-card rounded-2xl p-8 max-w-sm text-center">
        <div className="text-6xl mb-2">🌾</div>
        <h1 className="text-2xl font-bold text-primary">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">Page not found</p>
        <Link to="/" className="mt-4 inline-block min-touch px-6 gradient-primary text-primary-foreground rounded-xl font-semibold leading-[56px]">
          Go home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass-card rounded-2xl p-6 max-w-sm text-center">
        <p className="text-sm text-muted-foreground">{error.message}</p>
        <button onClick={reset} className="mt-4 min-touch px-6 gradient-primary text-primary-foreground rounded-xl font-semibold">
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1" },
      { title: "farmentum" },
      { name: "description", content: "AI-powered crop suggestions, disease detection and mandi prices for Indian farmers." },
      { name: "theme-color", content: "#2D6A4F" },
      { property: "og:title", content: "farmentum" },
      { name: "twitter:title", content: "farmentum" },
      { property: "og:description", content: "AI-powered crop suggestions, disease detection and mandi prices for Indian farmers." },
      { name: "twitter:description", content: "AI-powered crop suggestions, disease detection and mandi prices for Indian farmers." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/ae91d8e1-1b0d-41d7-9633-c191a4484181" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/ae91d8e1-1b0d-41d7-9633-c191a4484181" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700;800&family=Noto+Sans:wght@400;500;600;700&family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <div className="farm-bg min-h-screen">
          <div className="max-w-md mx-auto pb-24">
            <Header />
            <main className="px-4 py-4">
              <Outlet />
            </main>
            <BottomNav />
            <VoiceFab />
          </div>
        </div>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
