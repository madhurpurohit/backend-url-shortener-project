import { Router } from "express";
import {
  getShortenerPage,
  addShortener,
  linkShortener,
  getShortenerEditPage,
  postShortenerEditPage,
  deleteShortenerLink,
} from "../controllers/postShortener.controller.js";

const router = Router();

router.get("/", getShortenerPage);

router.post("/", addShortener);

router.get("/:shortcode", linkShortener);

router.route("/edit/:id").get(getShortenerEditPage).post(postShortenerEditPage);

router.route("/delete/:id").post(deleteShortenerLink);

export const shortenerRoutes = router;
