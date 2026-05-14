import { Router, type IRouter, type Request, type Response } from "express";
import { LoginBody } from "@workspace/api-zod";
import {
  loginByEmail,
  setSessionCookie,
  clearSessionCookie,
  readSession,
} from "../lib/auth";
import { requestMeta } from "../lib/activity";

const router: IRouter = Router();

/**
 * POST /auth/login — verify email + password, issue a session cookie.
 */
router.post("/auth/login", async (req: Request, res: Response) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "بيانات الدخول غير صحيحة" });
    return;
  }

  try {
    const meta = requestMeta(req);
    const result = await loginByEmail(
      parsed.data.email,
      parsed.data.password,
      meta,
    );
    if (!result) {
      res
        .status(401)
        .json({ error: "البريد أو كلمة المرور غير صحيحة" });
      return;
    }

    setSessionCookie(res, result.token);
    res.json({ user: result.user });
  } catch (err) {
    req.log.error({ err }, "login failed");
    res.status(500).json({ error: "خطأ غير متوقع" });
  }
});

/**
 * POST /auth/logout — clear the session cookie. Idempotent.
 */
router.post("/auth/logout", (_req: Request, res: Response) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

/**
 * GET /auth/me — return the current session's identity, or 401.
 */
router.get("/auth/me", async (req: Request, res: Response) => {
  const session = await readSession(req);
  if (!session) {
    res.status(401).json({ error: "UNAUTHENTICATED" });
    return;
  }
  res.json({
    userId: session.userId,
    email: session.email,
    fullName: session.fullName,
  });
});

export default router;
