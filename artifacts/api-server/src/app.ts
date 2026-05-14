import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
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

// CORS: in production the frontend runs on a different origin (Vercel), so
// we must whitelist its origin and enable credentials so the session cookie
// is sent on cross-origin requests. In dev/Replit (same container) the
// default `*` origin without credentials still works because the browser
// treats the request as same-origin.
const frontendOrigin = process.env.FRONTEND_ORIGIN;
app.use(
  cors(
    frontendOrigin
      ? { origin: frontendOrigin, credentials: true }
      : { origin: true, credentials: true },
  ),
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
