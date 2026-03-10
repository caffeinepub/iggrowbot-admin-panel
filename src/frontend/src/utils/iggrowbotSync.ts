import type { IggrowbotService } from "../backend";

const MARKUP_MULTIPLIER = 6; // 500% markup = original + 5x = 6x
const USD_TO_INR = 85; // approximate conversion

interface RawService {
  service: number | string;
  name: string;
  category: string;
  rate: string | number;
  min: number | string;
  max: number | string;
  description?: string;
  type?: string;
}

export async function fetchIggrowbotServices(
  apiUrl: string,
  apiKey: string,
): Promise<IggrowbotService[]> {
  // Try CORS proxies in sequence
  const proxies = [
    `https://corsproxy.io/?url=${encodeURIComponent(apiUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(apiUrl)}`,
    apiUrl, // direct (may fail due to CORS but try anyway)
  ];

  let lastError: Error | null = null;

  for (const proxyUrl of proxies) {
    try {
      const resp = await fetch(proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `key=${encodeURIComponent(apiKey)}&action=services`,
      });

      if (!resp.ok) {
        lastError = new Error(`HTTP ${resp.status}`);
        continue;
      }

      const raw = await resp.text();

      // Detect error responses (e.g. {"error":"Invalid key"})
      if (raw.includes('"error"')) {
        const errObj = JSON.parse(raw);
        throw new Error(errObj.error || "IGGROWBOT returned an error");
      }

      const data: RawService[] = JSON.parse(raw);
      if (!Array.isArray(data)) throw new Error("Unexpected response format");

      const services: IggrowbotService[] = data.map((s) => ({
        id: String(s.service),
        name: s.name,
        category: s.category,
        // Convert USD -> INR then apply 500% markup
        rate:
          Number.parseFloat(String(s.rate)) * USD_TO_INR * MARKUP_MULTIPLIER,
        min: BigInt(Math.max(1, Number(s.min))),
        max: BigInt(Math.max(1, Number(s.max))),
        description: s.description || s.type || "",
      }));

      return services;
    } catch (err) {
      if (err instanceof Error && err.message.includes("IGGROWBOT")) throw err;
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error("Failed to reach IGGROWBOT API");
}
