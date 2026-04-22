import { Router, type IRouter } from "express";
import healthRouter from "./health";
import stripeRouter from "./stripe";
import contractsRouter from "./contracts";
import settingsRouter from "./settings";
import notificationsRouter from "./notifications";
import pushTokensRouter from "./pushTokens";

const router: IRouter = Router();

router.use(healthRouter);
router.use(stripeRouter);
router.use(contractsRouter);
router.use(settingsRouter);
router.use(notificationsRouter);
router.use(pushTokensRouter);

export default router;
