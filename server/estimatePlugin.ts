import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { heuristicEstimate, payingSeats, type EstimateRequest } from "../src/lib/estimateCost";

const SYSTEM = `You estimate 2026 US national-park trip costs in USD for the whole group.
Return JSON only with keys: flights, hotels, rental, food, extras.
Each key is { "low": number, "high": number, "note": string }.

Flights:
- Totals are for ALL paying seats, not per person.
- On US domestic flights, children 2+ pay the same fare as adults. Do not discount kids.
- Use current Google Flights-like economy round-trip prices, including basic economy.
- Transcontinental (e.g. JFK–SFO/LAX, ~2,500 miles) is typically $450–$900 per person round-trip, so 4 people is about $1,800–$3,600. A cheap found fare around $2,200 for 4 is normal, not $800.
- Never return a group flight total below the provided flightsFloor.
- If flying is false, flights low and high must be 0.
- Name the airport pair in the flights note.

Hotels: 3-star / park-adjacent, not hostels. Yosemite, Glacier, and Yellowstone run higher than average motels.
Rental: Hertz/Enterprise SUV if kids > 0.
Stay realistic for 2026. Round to whole dollars.`;

export function estimatePlugin(env: Record<string, string>): Plugin {
  const handler = async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end("Method not allowed");
      return;
    }
    const key = env.OPENAI_API_KEY;
    if (!key) {
      json(res, 501, { error: "missing_key" });
      return;
    }
    try {
      const body = JSON.parse(await readBody(req)) as EstimateRequest;
      const floor = heuristicEstimate(body);
      const model = env.OPENAI_MODEL || "gpt-4o-mini";
      const ai = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM },
            {
              role: "user",
              content: JSON.stringify({
                trip: body,
                payingSeats: payingSeats(body.adults, body.kids),
                flightPair: `${body.homeAirport}–${body.gatewayAirport}`,
                flightsFloor: floor.flights,
              }),
            },
          ],
        }),
      });
      if (!ai.ok) {
        const detail = await ai.text();
        json(res, 502, { error: "openai_failed", status: ai.status, detail: detail.slice(0, 240) });
        return;
      }
      const payload = (await ai.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) {
        json(res, 502, { error: "empty" });
        return;
      }
      json(res, 200, JSON.parse(content));
    } catch (err) {
      json(res, 500, { error: "estimate_failed", message: String(err) });
    }
  };

  return {
    name: "estimate-cost-api",
    configureServer(server) {
      server.middlewares.use("/api/estimate-cost", handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use("/api/estimate-cost", handler);
    },
  };
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c as Buffer));
    req.on("error", reject);
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

function json(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}
