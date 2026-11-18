import { connection } from "next/server";
import { describeLLMConfig, describeTTSConfig } from "@/lib/ai/config";
import { getBudget } from "@/lib/daily-budget";
import { jsonResponse } from "@/lib/http";

export async function GET() {
  await connection();
  return jsonResponse({ ai: describeLLMConfig(), voice: describeTTSConfig(), daily: getBudget() });
}
