import type { Metadata, Viewport } from "next";
import AppShell from "./components/AppShell";
import ServiceWorkerRegistrar from "./components/ServiceWorkerRegistrar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Free Freela",
  description: "Gestão de recibos, prazos e obrigações fiscais para freelancers.",
  icons: {
    apple: "/icons/icon-192.png",
  },
  appleWebApp: {
    title: "Freela",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <ServiceWorkerRegistrar />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
