import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  UpsertProfileBody,
  UpsertProfileHeader,
  UpsertProfileResponse,
} from "@workspace/api-zod";
import { db, usersTable } from "@workspace/db";
import { formatUser } from "../lib/advisory-format";
import { getUserIdFromHeader } from "../lib/user-context";

const router: IRouter = Router();

router.post("/users/profile", async (req, res): Promise<void> => {
  const headers = UpsertProfileHeader.safeParse({
    "x-user-id": req.headers["x-user-id"],
  });
  const body = UpsertProfileBody.safeParse(req.body);

  if (!headers.success || !body.success) {
    req.log.warn({ headerError: headers.error?.message, bodyError: body.error?.message }, "Invalid profile request");
    res.status(400).json({ error: "A valid user profile is required" });
    return;
  }

  const userId = getUserIdFromHeader(req, UpsertProfileHeader);
  if (!userId || userId !== body.data.id) {
    res.status(403).json({ error: "User identity does not match this profile" });
    return;
  }

  const [user] = await db
    .insert(usersTable)
    .values({
      id: body.data.id,
      email: body.data.email,
      farmLocation: body.data.farmLocation,
      primaryCrop: body.data.primaryCrop,
    })
    .onConflictDoUpdate({
      target: usersTable.id,
      set: {
        email: body.data.email,
        farmLocation: body.data.farmLocation,
        primaryCrop: body.data.primaryCrop,
      },
    })
    .returning();

  res.json(UpsertProfileResponse.parse(formatUser(user)));
});

export default router;