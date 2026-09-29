import type { DiseaseScan, MarketAdvisory, SavedInsight, User } from "@workspace/db";

export function formatUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    farmLocation: user.farmLocation,
    primaryCrop: user.primaryCrop,
    createdAt: user.createdAt.toISOString(),
  };
}

export function formatDiseaseScan(scan: DiseaseScan) {
  return {
    id: scan.id,
    cropType: scan.cropType,
    diseaseName: scan.diseaseName,
    confidenceScore: Number(scan.confidenceScore),
    symptoms: scan.symptoms,
    organicRemedy: scan.organicRemedy,
    chemicalRemedy: scan.chemicalRemedy,
    createdAt: scan.createdAt.toISOString(),
  };
}

export function formatMarketAdvisory(advisory: MarketAdvisory) {
  return {
    id: advisory.id,
    cropType: advisory.cropType,
    location: advisory.location,
    weatherRisks: advisory.advisoryContent.weatherRisks,
    harvestRecommendation: advisory.advisoryContent.harvestRecommendation,
    marketSellingStrategy: advisory.advisoryContent.marketSellingStrategy,
    createdAt: advisory.createdAt.toISOString(),
  };
}

export function formatSavedInsight(insight: SavedInsight) {
  return {
    id: insight.id,
    sourceType: insight.sourceType,
    sourceId: insight.sourceId,
    label: insight.label,
    createdAt: insight.createdAt.toISOString(),
  };
}