import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/p/"],
        disallow: [
          "/dashboard",
          "/attendance",
          "/students",
          "/exams",
          "/groups",
          "/finance",
          "/super-admin",
          "/api",
          "/_next",
        ],
      },
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "PerplexityBot",
          "ClaudeBot",
          "Google-Extended",
          "Bingbot",
          "cohere-ai",
        ],
        allow: ["/", "/login", "/p/", "/llms.txt"],
        disallow: ["/api", "/super-admin", "/dashboard"],
      },
    ],
    sitemap: "https://academy.fulkegy.com/sitemap.xml",
    host: "https://academy.fulkegy.com",
  };
}
