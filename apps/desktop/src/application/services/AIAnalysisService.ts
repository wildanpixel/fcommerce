import type { AiAnalysisJson, ProductDetail, ReviewEvidence, StoreProfile } from "../../domain/models.js";
import type { AnalyzeProjectPayload } from "../../shared/contracts.js";

export type AnalysisInput = {
  projectId: string;
  subjectType: AiAnalysisJson["subjectType"];
  subjectId?: string;
  keyword: string;
  products: ProductDetail[];
  stores: StoreProfile[];
  reviews: ReviewEvidence[];
  screenshotPaths: string[];
  language: string;
};

export interface AIAnalysisService {
  analyze(input: AnalysisInput, selection?: AnalyzeProjectPayload): Promise<AiAnalysisJson>;
}
