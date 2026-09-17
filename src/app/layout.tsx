import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toast";
import { QueryProvider } from "@/providers/query-provider";
import { StructuredData } from "@/components/seo/structured-data";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://academy.fulkegy.com"),
  title: {
    default: "فُلك أكاديمي | Fulk Academy - منصة الإدارة التعليمية والسناتر",
    template: "%s | فُلك أكاديمي",
  },
  description:
    "فُلك أكاديمي (Fulk Academy) - المنصة السحابية لإدارة المعلمين والسناتر والمجموعات، تتبع الحضور بالـ QR Code، إدارة الامتحانات والدرجات، وتقارير أولياء الأمور. تابعة لشركة فُلك للحلول التقنية (نبحر بك نحو التحول الرقمي).",
  applicationName: "فُلك أكاديمي",
  authors: [
    {
      name: "شركة فُلك للحلول التقنية",
      url: "https://fulkegy.com",
    },
  ],
  generator: "Fulk Tech Solutions",
  keywords: [
    "فُلك أكاديمي",
    "Fulk Academy",
    "شركة فُلك للحلول التقنية",
    "fulkegy",
    "fulkegy.com",
    "نبحر بك نحو التحول الرقمي",
    "نظام إدارة الدروس الخصوصية",
    "برنامج إدارة السناتر التعليمية",
    "حضور وغياب الطلاب بالباركود",
    "تسجيل الحضور QR Code",
    "منصة متابعة الطلاب",
    "تقارير أولياء الأمور للدروس",
    "إدارة الامتحانات والدرجات للمدرسين",
    "كروت الطلاب الذكية",
  ],
  creator: "شركة فُلك للحلول التقنية",
  publisher: "شركة فُلك للحلول التقنية",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "https://academy.fulkegy.com",
  },
  openGraph: {
    type: "website",
    locale: "ar_EG",
    url: "https://academy.fulkegy.com",
    siteName: "فُلك أكاديمي | Fulk Academy",
    title: "فُلك أكاديمي | المنصة السحابية المتكاملة لإدارة التعليم والسناتر",
    description:
      "المنصة المتكاملة لإدارة المدرسين والمجموعات والحضور والامتحانات ومتابعة أولياء الأمور. تابعة لشركة فُلك للحلول التقنية (نبحر بك نحو التحول الرقمي).",
    images: [
      {
        url: "/icon.jpeg",
        width: 400,
        height: 400,
        alt: "شعار فُلك أكاديمي",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "فُلك أكاديمي | Fulk Academy",
    description:
      "نظام إدارة المدرسين والسناتر التعليمية والتحول الرقمي - شركة فُلك للحلول التقنية.",
    images: ["/icon.jpeg"],
  },
  icons: {
    icon: [
      { url: "/icon.jpeg", type: "image/jpeg" },
      { url: "/icon.png", type: "image/png" },
    ],
    shortcut: "/icon.jpeg",
    apple: "/icon.jpeg",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <StructuredData />
      </head>
      <body className={`${cairo.variable} font-sans antialiased`}>
        <QueryProvider>{children}</QueryProvider>
        <Toaster />
      </body>
    </html>
  );
}
