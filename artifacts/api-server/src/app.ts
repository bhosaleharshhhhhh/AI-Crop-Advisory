import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { MulterError } from "multer";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
const allowedOrigins = new Set(
  [process.env.REPLIT_DOMAINS, process.env.REPLIT_DEV_DOMAIN]
    .flatMap((origins) => (origins ?? "").split(","))
    .map((origin) => origin.trim())
    .filter(Boolean)
    .flatMap((origin) => [origin, `https://${origin}`, `http://${origin}`]),
);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin is not allowed"));
    },
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

app.use((error: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof MulterError) {
    const message = error.code === "LIMIT_FILE_SIZE"
      ? "Images must be 5MB or smaller"
      : "Only JPEG, PNG, or WebP images are accepted";
    res.status(400).json({ error: message });
    return;
  }

  req.log.error({ err: error }, "Unhandled API error");
  res.status(500).json({ error: "Something went wrong. Please try again." });
});

export default app;
