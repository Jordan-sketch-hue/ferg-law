import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import ChatWidget from "@/components/chat/ChatWidget";
import ContentApply from "@/components/editor/ContentApply";
import EditorOverlay from "@/components/editor/EditorOverlay";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://fergusonlawja.com"),
  title: {
    default: "Ferguson Law | Jamaica Property Lawyer & Conveyancing — Kingston",
    template: "%s | Ferguson Law Jamaica",
  },
  description:
    "Ferguson Law — your trusted legal partner. Conveyancing, title transfers, real estate transactions and legal guidance for buyers, sellers and the diaspora. Based in Kingston.",
  keywords: [
    "Jamaica property lawyer",
    "conveyancing Jamaica",
    "real estate attorney Jamaica",
    "property purchase Jamaica",
    "title transfer Jamaica",
    "Jamaica conveyancing attorney",
    "Ferguson Law",
    "Kingston attorney",
    "diaspora property Jamaica",
    "NHT conveyancing",
    "buy property Jamaica",
    "sell property Jamaica",
    "Jamaican law firm",
  ],
  authors: [{ name: "Ferguson Law", url: "https://fergusonlawja.com" }],
  creator: "Ferguson Law",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large" },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: "/favicon-180.png",
  },
  openGraph: {
    title: "Ferguson Law | Jamaica Property Lawyer & Conveyancing",
    description:
      "Your trusted legal partner — guiding buyers, sellers and the diaspora from first question to registered title. Based in Kingston.",
    type: "website",
    url: "https://fergusonlawja.com",
    siteName: "Ferguson Law",
    locale: "en_JM",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ferguson Law | Jamaica Property Lawyer & Conveyancing",
    description:
      "Your trusted legal partner — guiding buyers, sellers and the diaspora from first question to registered title.",
  },
  alternates: {
    canonical: "https://fergusonlawja.com",
  },
};

export const viewport: Viewport = {
  themeColor: "#102A1E",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["LegalService", "LocalBusiness"],
      "@id": "https://fergusonlawja.com/#firm",
      name: "Ferguson Law",
      description:
        "Full-service Jamaican law firm specialising in real estate conveyancing, property transactions, corporate law, family law, intellectual property and sports law.",
      url: "https://fergusonlawja.com",
      telephone: "+18763200235",
      email: "contact@fergusonlawja.com",
      address: {
        "@type": "PostalAddress",
        streetAddress: "22B Old Hope Road",
        addressLocality: "Kingston 5",
        addressCountry: "JM",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: 17.9971,
        longitude: -76.7936,
      },
      areaServed: [
        { "@type": "Country", name: "Jamaica" },
        { "@type": "Country", name: "United States" },
        { "@type": "Country", name: "Canada" },
        { "@type": "Country", name: "United Kingdom" },
      ],
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Legal Services",
        itemListElement: [
          { "@type": "Offer", itemOffered: { "@type": "Service", name: "Real Estate Conveyancing" } },
          { "@type": "Offer", itemOffered: { "@type": "Service", name: "Property Title Transfer" } },
          { "@type": "Offer", itemOffered: { "@type": "Service", name: "Corporate & Commercial Law" } },
          { "@type": "Offer", itemOffered: { "@type": "Service", name: "Wills & Estate Planning" } },
          { "@type": "Offer", itemOffered: { "@type": "Service", name: "Family Law" } },
          { "@type": "Offer", itemOffered: { "@type": "Service", name: "Intellectual Property" } },
          { "@type": "Offer", itemOffered: { "@type": "Service", name: "Sports Law" } },
        ],
      },
      founder: {
        "@type": "Person",
        name: "Owen K. Ferguson",
        honorificSuffix: "JP",
        jobTitle: "Attorney-at-Law",
        alumniOf: [
          { "@type": "EducationalOrganization", name: "Norman Manley Law School" },
          { "@type": "EducationalOrganization", name: "University of London" },
        ],
        memberOf: [
          { "@type": "Organization", name: "Jamaican Bar Association" },
          { "@type": "Organization", name: "International Bar Association" },
        ],
      },
      priceRange: "$$",
      currenciesAccepted: "JMD, USD",
      openingHours: "Mo-Fr 09:00-17:00",
    },
    {
      "@type": "WebSite",
      "@id": "https://fergusonlawja.com/#website",
      url: "https://fergusonlawja.com",
      name: "Ferguson Law",
      description: "Jamaica property lawyer & conveyancing — Kingston",
      publisher: { "@id": "https://fergusonlawja.com/#firm" },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <head>
        <link rel="preload" as="image" href="/img/hero-banner.webp" type="image/webp" fetchPriority="high" />
        <link rel="preload" as="image" href="/img/hero-banner.jpg" fetchPriority="high" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        {children}
        <ChatWidget />
        <ContentApply />
        <EditorOverlay />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
