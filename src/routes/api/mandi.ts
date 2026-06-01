import { createFileRoute } from "@tanstack/react-router";

const RESOURCE = "9ef84268-d588-465a-a308-a864a43d0070";
// API key read from server-only env var. Set DATA_GOV_IN_API_KEY in project secrets.

// Simple in-memory server cache (per-isolate) to dampen rate-limit hits
const cache = new Map<string, { at: number; data: unknown }>();
const TTL = 6 * 60 * 60 * 1000;

export const Route = createFileRoute("/api/mandi")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const state = url.searchParams.get("state") || "";
        const district = url.searchParams.get("district") || "";
        const key = `${state}|${district}`;
        const hit = cache.get(key);
        if (hit && Date.now() - hit.at < TTL) {
          return new Response(JSON.stringify(hit.data), {
            headers: { "content-type": "application/json", "x-cache": "HIT" },
          });
        }
        const apiKey = process.env.DATA_GOV_IN_API_KEY;
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "missing_data_gov_in_api_key", records: [] }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
        const params = new URLSearchParams({
          "api-key": apiKey,
          format: "json",
          limit: "30",
        });
        if (state) params.set("filters[State.keyword]", state);
        if (district) params.set("filters[District.keyword]", district);
        const upstream = `https://api.data.gov.in/resource/${RESOURCE}?${params.toString()}`;
        try {
          const r = await fetch(upstream);
          const data = await r.json();
          if (data?.records?.length) cache.set(key, { at: Date.now(), data });
          return new Response(JSON.stringify(data), {
            headers: { "content-type": "application/json", "x-cache": "MISS" },
          });
        } catch (e) {
          return new Response(JSON.stringify({ error: String(e), records: [] }), {
            status: 502,
            headers: { "content-type": "application/json" },
          });
        }
      },
    },
  },
});
