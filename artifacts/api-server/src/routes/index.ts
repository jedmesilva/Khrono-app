import { Router, type IRouter } from "express";
import healthRouter from "./health";
import stripeRouter from "./stripe";
import contractsRouter from "./contracts";

const router: IRouter = Router();

router.use(healthRouter);
router.use(stripeRouter);
router.use(contractsRouter);

export default router;
