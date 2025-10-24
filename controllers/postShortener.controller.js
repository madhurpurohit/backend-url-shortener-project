import crypto from "crypto";
import {
  addShortenerLinks,
  checkShortCode,
  deleteShortLinkById,
  findShortLinkById,
  loadLinks,
  updateShortCode,
} from "../services/drizzle.services.js";
import z from "zod";
import {
  shortenerSchema,
  shortenerSearchParamsSchema,
} from "../validation/shortener.validator.js";

export const getShortenerPage = async (req, res) => {
  try {
    if (!req.user) return res.redirect("/login");
    const searchParams = shortenerSearchParamsSchema.parse(req.query);

    const { shortLinks, totalCount } = await loadLinks({
      userId: req.user.id,
      limit: 10,
      offset: (searchParams.page - 1) * 10,
    });

    const totalPages = Math.ceil(totalCount / 10);

    return res.render("index", {
      links: shortLinks,
      host: req.hostname,
      currentPage: searchParams.page,
      totalPages,
      errors: req.flash("errors"),
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

export const addShortener = async (req, res) => {
  try {
    if (!req.user) return res.redirect("/login");

    const { url, shortCode } = req.body;
    const finalShortCode = shortCode || crypto.randomBytes(4).toString("hex");
    const link = await checkShortCode(finalShortCode);

    if (link?.length > 0) {
      req.flash(
        "errors",
        "URL with that shortcode already exists. Please choose another."
      );
      return res.redirect("/");
    }

    await addShortenerLinks({
      shortCode: finalShortCode,
      url,
      userId: req.user.id,
    });

    return res.redirect("/");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

export const linkShortener = async (req, res) => {
  try {
    const { shortcode } = req.params;
    const links = await checkShortCode(shortcode);

    if (links.length === 0) {
      return res.status(404).send("Short Code not found");
    }

    return res.redirect(links[0].url);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

export const getShortenerEditPage = async (req, res) => {
  if (!req.user) return res.redirect("/login");

  const { data: id, error } = z.coerce.number().int().safeParse(req.params.id);

  if (error) return res.redirect("/404");

  try {
    const shortLink = await findShortLinkById(id);

    if (!shortLink) return res.redirect("/404");

    res.render("edit-shortLink", {
      id: shortLink.id,
      url: shortLink.url,
      shortCode: shortLink.shortCode,
      errors: req.flash("errors"),
    });
  } catch (error) {
    return res.status(500).send("Internal server error.");
  }
};

export const postShortenerEditPage = async (req, res) => {
  if (!req.user) return res.redirect("/login");

  const { data: id, error } = z.coerce.number().int().safeParse(req.params.id);

  if (error) return res.redirect("/404");

  try {
    const { data, error } = shortenerSchema.safeParse(req.body);

    if (error) {
      req.flash("errors", error.message);
      return res.redirect(`/edit/${id}`);
    }

    const newUpdateShortCode = await updateShortCode({
      id,
      url: data.url,
      shortCode: data.shortCode,
    });

    if (!newUpdateShortCode.changedRows) {
      req.flash("errors", "Short Code already exists. Please choose another.");
      return res.redirect(`/edit/${id}`);
    }

    res.redirect("/");
  } catch (error) {
    if (error.cause.code === "ER_DUP_ENTRY") {
      req.flash("errors", "Short Code already exists. Please choose another.");
      return res.redirect(`/edit/${id}`);
    }
    return res.status(500).send("Internal server error.");
  }
};

export const deleteShortenerLink = async (req, res) => {
  if (!req.user) return res.redirect("/login");

  const { data: id, error } = z.coerce.number().int().safeParse(req.params.id);

  if (error) return res.send("Id is not valid");

  try {
    await deleteShortLinkById(id);
    res.redirect("/");
  } catch (error) {
    return res.status(500).send("Internal server error.");
  }
};
