import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/agent", "/pay", "/reset", "/options", "/directory/dashboard"],
      },
    ],
    sitemap: "https://ferguson-law.vercel.app/sitemap.xml",
  };
}
