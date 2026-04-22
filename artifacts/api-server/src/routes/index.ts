import { Router, type IRouter } from "express";
import healthRouter from "./health";
import stripeRouter from "./stripe";
import contractsRouter from "./contracts";
import settingsRouter from "./settings";
import notificationsRouter from "./notifications";
import pushTokensRouter from "./pushTokens";
import walletRouter from "./wallet";
import availabilityRouter from "./availability";
import locationRouter from "./location";
import profileRouter from "./profile";

const router: IRouter = Router();

router.use(healthRouter);
router.use(stripeRouter);
router.use(contractsRouter);
router.use(settingsRouter);
router.use(notificationsRouter);
router.use(pushTokensRouter);
router.use(walletRouter);
router.use(availabilityRouter);
router.use(locationRouter);
router.use(profileRouter);

export default router;
