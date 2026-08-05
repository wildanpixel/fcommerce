import { useQueries } from "@tanstack/react-query";
import { apiClient } from "../api/client.js";
import type { AppLanguage } from "../app/languages.js";

export function useEvidenceTranslations(
  sourceValues: Array<string | null | undefined>,
  language: AppLanguage
) {
  const uniqueValues = Array.from(new Set(
    sourceValues.map((value) => value?.trim() ?? "").filter(Boolean)
  )).slice(0, 400);
  const batches = chunk(uniqueValues, 60);
  const translationQueries = useQueries({
    queries: batches.map((texts) => ({
      queryKey: ["evidence-translations", language, JSON.stringify(texts)],
      queryFn: () => apiClient.translateEvidence({ language, texts }),
      enabled: language !== "en-US" && texts.length > 0,
      staleTime: Number.POSITIVE_INFINITY,
      gcTime: 30 * 60 * 1000,
      retry: 1
    }))
  });

  const translatedBySource = new Map<string, string>();
  batches.forEach((batch, batchIndex) => {
    const translations = translationQueries[batchIndex]?.data?.translations ?? batch;
    batch.forEach((source, index) => translatedBySource.set(source, translations[index] ?? source));
  });

  return {
    text(value: string | null | undefined): string {
      if (!value) return "";
      return translatedBySource.get(value.trim()) ?? value;
    },
    isTranslating: translationQueries.some((query) => query.isFetching),
    providers: Array.from(new Set(translationQueries.map((query) => query.data?.provider).filter(Boolean)))
  };
}

function chunk<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}
