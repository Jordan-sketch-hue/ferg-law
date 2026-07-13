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
    sitemap: "https://fergusonlawja.com/sitemap.xml",
  };
}
