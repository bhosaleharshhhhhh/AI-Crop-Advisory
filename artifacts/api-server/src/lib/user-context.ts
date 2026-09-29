import {
  CreateMarketAdvisoryHeader,
  GetDashboardHeader,
  GetHistoryHeader,
  ScanDiseaseHeader,
  UpsertProfileHeader,
} from "@workspace/api-zod";
import type { Request } from "express";

const headerSchemas = [
  CreateMarketAdvisoryHeader,
  GetDashboardHeader,
  GetHistoryHeader,
  ScanDiseaseHeader,
  UpsertProfileHeader,
] as const;

type HeaderSchema = (typeof headerSchemas)[number];

export function getUserIdFromHeader(
  req: Request,
  schema: HeaderSchema = GetDashboardHeader,
): string | null {
  const raw = req.headers["x-user-id"];
  const headerValue = Array.isArray(raw) ? raw[0] : raw;
  const parsed = schema.safeParse({ "x-user-id": headerValue });
  return parsed.success ? parsed.data["x-user-id"] : null;
}