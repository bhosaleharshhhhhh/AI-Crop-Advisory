import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profileRouter from "./profile";
import advisoryRouter from "./advisory";

const router: IRouter = Router();

router.use(healthRouter);
router.use(profileRouter);
router.use(advisoryRouter);

export default router;
