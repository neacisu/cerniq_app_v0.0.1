export type BronzeContactRow = {
  id: string;
  extractedName: string | null;
  extractedCui: string | null;
  sourceType: string;
  processingStatus: string;
  createdAt?: string;
};

export type SilverCompanyRow = {
  id: string;
  denumire: string | null;
  cui: string | null;
  enrichmentStatus: string;
  promotionStatus: string;
  totalQualityScore: number | string | null;
  updatedAt?: string;
};

export type GoldCompanyRow = {
  id: string;
  denumire: string | null;
  currentState: string;
  judetCod: string | null;
  cifraAfaceri: string | null;
  leadScore: number | string | null;
  updatedAt?: string;
};
