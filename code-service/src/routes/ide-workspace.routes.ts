import { Router } from "express";
import { getIdeWorkspace, saveIdeWorkspace } from "../controllers/ide-workspace.controller";

const router = Router();

router.get("/:userId", getIdeWorkspace);
router.put("/:userId", saveIdeWorkspace);

export default router;
