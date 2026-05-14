import { Router, type IRouter } from "express";
import healthRouter from "./health";
import storageRouter from "./storage";
import authRouter from "./auth";
import rbacRouter from "./rbac";
import usersRouter from "./users";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storageRouter);
router.use(authRouter);
router.use(rbacRouter);
router.use(usersRouter);

export default router;
