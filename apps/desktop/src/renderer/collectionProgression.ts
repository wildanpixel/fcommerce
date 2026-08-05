export function nextPendingCollectionActionId(
  actionIds: readonly string[],
  currentActionId: string | undefined,
  completedActionIds: ReadonlySet<string>
): string | undefined {
  if (actionIds.length === 0) {
    return undefined;
  }

  const currentIndex = Math.max(-1, currentActionId ? actionIds.indexOf(currentActionId) : -1);
  return actionIds.slice(currentIndex + 1).find((actionId) => !completedActionIds.has(actionId));
}

export function previousCollectionActionId(
  actionIds: readonly string[],
  currentActionId: string | undefined
): string | undefined {
  if (actionIds.length === 0) {
    return undefined;
  }
  const currentIndex = currentActionId ? actionIds.indexOf(currentActionId) : -1;
  return currentIndex > 0 ? actionIds[currentIndex - 1] : undefined;
}

export type CollectionAdvanceMode = "next-action" | "next-step" | "stay";

export function collectionAdvanceMode(
  stage: "KEYWORD_GENERAL" | "PRODUCT_DETAILS" | "EVALUATION_KEY_STORE",
  subActionId: string | undefined,
  collectionHasData = true
): CollectionAdvanceMode {
  if (!collectionHasData) {
    return "stay";
  }
  if (stage === "EVALUATION_KEY_STORE") {
    return "next-action";
  }
  if (stage !== "PRODUCT_DETAILS" || !subActionId) {
    return "next-step";
  }
  if (subActionId === "media-in-user") {
    return "next-step";
  }
  if (subActionId === "shop-homepage") {
    return "next-step";
  }
  return "stay";
}

export type ProductCollectionTarget = {
  stepIndex: number;
  stepId: string;
  firstActionId?: string;
  targetUrl?: string;
};

export function nextProductCollectionTarget<T extends {
  id: string;
  ownerId?: string;
  targetUrl?: string;
  subActions?: Array<{ id: string; targetUrl?: string }>;
}>(
  steps: readonly T[],
  currentProductId: string | undefined
): ProductCollectionTarget | undefined {
  if (!currentProductId) return undefined;
  const currentIndex = steps.findIndex((step) => step.ownerId === currentProductId);
  if (currentIndex < 0 || currentIndex >= steps.length - 1) return undefined;
  const nextIndex = steps.findIndex((step, index) => index > currentIndex && Boolean(step.ownerId));
  if (nextIndex < 0) return undefined;
  const next = steps[nextIndex];
  const firstAction = next.subActions?.[0];
  return {
    stepIndex: nextIndex,
    stepId: next.id,
    firstActionId: firstAction?.id,
    targetUrl: firstAction?.targetUrl ?? next.targetUrl
  };
}
