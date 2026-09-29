import { Router, type IRouter } from "express";
import { and, count, desc, eq } from "drizzle-orm";
import multer, { MulterError } from "multer";
import {
  CreateMarketAdvisoryBody,
  CreateMarketAdvisoryHeader,
  CreateMarketAdvisoryResponse,
  GetDashboardHeader,
  GetDashboardResponse,
  GetHistoryHeader,
  GetHistoryParams,
  GetHistoryResponse,
  SaveInsightBody,
  SaveInsightHeader,
  SaveInsightResponse,
  ScanDiseaseBody,
  ScanDiseaseHeader,
  ScanDiseaseResponse,
} from "@workspace/api-zod";
import {
  db,
  diseaseScansTable,
  marketAdvisoriesTable,
  savedInsightsTable,
  usersTable,
} from "@workspace/db";
import { analyzeCropImage, generateMarketAdvisory } from "../lib/ai";
import {
  formatDiseaseScan,
  formatMarketAdvisory,
  formatSavedInsight,
  formatUser,
} from "../lib/advisory-format";
import { getUserIdFromHeader } from "../lib/user-context";

const router: IRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      callback(new MulterError("LIMIT_UNEXPECTED_FILE", "image"));
      return;
    }
    callback(null, true);
  },
});

function getWeather(location: string, crop: string | null) {
  const month = new Date().getMonth();
  const isRainySeason = [5, 6, 7, 8].includes(month);
  return {
    location,
    temperature: isRainySeason ? 27 : 29,
    condition: isRainySeason ? "Scattered showers" : "Bright and clear",
    high: isRainySeason ? 30 : 33,
    low: isRainySeason ? 23 : 22,
    advisory: isRainySeason
      ? `Keep ${crop ?? "young crops"} well-drained and inspect lower leaves after rain.`
      : `Water ${crop ?? "your crop"} early and check leaves for heat stress before midday.`,
    riskLevel: isRainySeason ? "moderate" : "low",
  } as const;
}

router.get("/dashboard", async (req, res): Promise<void> => {
  const headers = GetDashboardHeader.safeParse({
    "x-user-id": req.headers["x-user-id"],
  });
  if (!headers.success) {
    res.status(400).json({ error: "A valid user identity is required" });
    return;
  }

  const userId = getUserIdFromHeader(req, GetDashboardHeader);
  if (!userId) {
    res.status(400).json({ error: "A valid user identity is required" });
    return;
  }

  const [profile] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const scans = await db
    .select()
    .from(diseaseScansTable)
    .where(eq(diseaseScansTable.userId, userId))
    .orderBy(desc(diseaseScansTable.createdAt))
    .limit(5);
  const advisories = await db
    .select()
    .from(marketAdvisoriesTable)
    .where(eq(marketAdvisoriesTable.userId, userId))
    .orderBy(desc(marketAdvisoriesTable.createdAt))
    .limit(5);
  const [scanCount] = await db
    .select({ count: count() })
    .from(diseaseScansTable)
    .where(eq(diseaseScansTable.userId, userId));
  const [advisoryCount] = await db
    .select({ count: count() })
    .from(marketAdvisoriesTable)
    .where(eq(marketAdvisoriesTable.userId, userId));
  const [savedInsightCount] = await db
    .select({ count: count() })
    .from(savedInsightsTable)
    .where(eq(savedInsightsTable.userId, userId));

  const weather = getWeather(profile?.farmLocation ?? "your farm", profile?.primaryCrop ?? null);
  const result = {
    profile: profile ? formatUser(profile) : null,
    weather,
    recentScans: scans.map(formatDiseaseScan),
    recentAdvisories: advisories.map(formatMarketAdvisory),
    stats: {
      totalScans: Number(scanCount?.count ?? 0),
      totalAdvisories: Number(advisoryCount?.count ?? 0),
      savedInsights: Number(savedInsightCount?.count ?? 0),
      activeAlerts: weather.riskLevel === "moderate" ? 1 : 0,
    },
  };

  res.json(GetDashboardResponse.parse(result));
});

router.post("/insights", async (req, res): Promise<void> => {
  const headers = SaveInsightHeader.safeParse({
    "x-user-id": req.headers["x-user-id"],
  });
  const body = SaveInsightBody.safeParse(req.body);
  if (!headers.success || !body.success) {
    res.status(400).json({ error: "Choose a valid diagnosis or market note to save" });
    return;
  }

  const userId = getUserIdFromHeader(req, SaveInsightHeader);
  if (!userId) {
    res.status(400).json({ error: "A valid user identity is required" });
    return;
  }

  const source = body.data.sourceType === "scan"
    ? await db
        .select({ id: diseaseScansTable.id })
        .from(diseaseScansTable)
        .where(and(eq(diseaseScansTable.id, body.data.sourceId), eq(diseaseScansTable.userId, userId)))
    : await db
        .select({ id: marketAdvisoriesTable.id })
        .from(marketAdvisoriesTable)
        .where(and(eq(marketAdvisoriesTable.id, body.data.sourceId), eq(marketAdvisoriesTable.userId, userId)));

  if (!source.length) {
    res.status(400).json({ error: "That insight is not available in your field notes" });
    return;
  }

  const existing = await db
    .select()
    .from(savedInsightsTable)
    .where(
      and(
        eq(savedInsightsTable.userId, userId),
        eq(savedInsightsTable.sourceType, body.data.sourceType),
        eq(savedInsightsTable.sourceId, body.data.sourceId),
      ),
    );
  if (existing[0]) {
    res.json(SaveInsightResponse.parse(formatSavedInsight(existing[0])));
    return;
  }

  const [saved] = await db
    .insert(savedInsightsTable)
    .values({
      userId,
      sourceType: body.data.sourceType,
      sourceId: body.data.sourceId,
      label: body.data.label,
    })
    .returning();

  res.json(SaveInsightResponse.parse(formatSavedInsight(saved)));
});

router.post("/ai/scan-disease", upload.single("image"), async (req, res): Promise<void> => {
  const headers = ScanDiseaseHeader.safeParse({
    "x-user-id": req.headers["x-user-id"],
  });
  const body = ScanDiseaseBody.pick({ cropType: true }).safeParse(req.body);
  const file = req.file;

  if (!headers.success || !body.success || !file) {
    res.status(400).json({ error: "Choose a crop and upload a JPEG, PNG, or WebP image under 5MB" });
    return;
  }

  const userId = getUserIdFromHeader(req, ScanDiseaseHeader);
  if (!userId) {
    res.status(400).json({ error: "A valid user identity is required" });
    return;
  }

  const diagnosis = await analyzeCropImage({
    cropType: body.data.cropType,
    mimeType: file.mimetype,
    imageBase64: file.buffer.toString("base64"),
  });

  const [scan] = await db
    .insert(diseaseScansTable)
    .values({
      userId,
      cropType: body.data.cropType,
      diseaseName: diagnosis.diseaseName,
      confidenceScore: diagnosis.confidenceScore.toFixed(2),
      symptoms: diagnosis.symptoms,
      organicRemedy: diagnosis.organicRemedy,
      chemicalRemedy: diagnosis.chemicalRemedy,
    })
    .returning();

  res.json(ScanDiseaseResponse.parse(formatDiseaseScan(scan)));
});

router.post("/ai/market-advisory", async (req, res): Promise<void> => {
  const headers = CreateMarketAdvisoryHeader.safeParse({
    "x-user-id": req.headers["x-user-id"],
  });
  const body = CreateMarketAdvisoryBody.safeParse(req.body);
  if (!headers.success || !body.success) {
    res.status(400).json({ error: "Crop type and location are required" });
    return;
  }

  const userId = getUserIdFromHeader(req, CreateMarketAdvisoryHeader);
  if (!userId) {
    res.status(400).json({ error: "A valid user identity is required" });
    return;
  }

  const advisory = await generateMarketAdvisory(body.data);
  const [saved] = await db
    .insert(marketAdvisoriesTable)
    .values({
      userId,
      cropType: body.data.cropType,
      location: body.data.location,
      advisoryContent: advisory,
    })
    .returning();

  res.json(CreateMarketAdvisoryResponse.parse(formatMarketAdvisory(saved)));
});

router.get("/history/:userId", async (req, res): Promise<void> => {
  const headers = GetHistoryHeader.safeParse({
    "x-user-id": req.headers["x-user-id"],
  });
  const params = GetHistoryParams.safeParse(req.params);
  if (!headers.success || !params.success || headers.data["x-user-id"] !== params.data.userId) {
    res.status(403).json({ error: "You can only view your own history" });
    return;
  }

  const scans = await db
    .select()
    .from(diseaseScansTable)
    .where(eq(diseaseScansTable.userId, params.data.userId))
    .orderBy(desc(diseaseScansTable.createdAt));
  const advisories = await db
    .select()
    .from(marketAdvisoriesTable)
    .where(eq(marketAdvisoriesTable.userId, params.data.userId))
    .orderBy(desc(marketAdvisoriesTable.createdAt));
  const savedInsights = await db
    .select()
    .from(savedInsightsTable)
    .where(eq(savedInsightsTable.userId, params.data.userId))
    .orderBy(desc(savedInsightsTable.createdAt));

  res.json(
    GetHistoryResponse.parse({
      scans: scans.map(formatDiseaseScan),
      advisories: advisories.map(formatMarketAdvisory),
      savedInsights: savedInsights.map(formatSavedInsight),
    }),
  );
});

export default router;