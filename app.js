import cookieParser from "cookie-parser";
import express from "express";
import flash from "connect-flash";
import path from "path";
import requestIp from "request-ip";
import session from "express-session";
import { authRoutes } from "./routes/auth.route.js";
import { envSchema } from "./config/env.js";
import { shortenerRoutes } from "./routes/shortener.route.js";
import { verifyAuthentication } from "./middlewares/verify-auth.middleware.js";

const app = express();

const staticPath = path.join(import.meta.dirname, "public");

app.use(express.static(staticPath));
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

app.use(session({ secret: "Madhur", resave: true, saveUninitialized: false }));
app.use(flash());

app.use(requestIp.mw());

app.use(verifyAuthentication);

app.use((req, res, next) => {
  res.locals.user = req.user;
  return next();
});

app.use(authRoutes);
app.use(shortenerRoutes);

app.set("view engine", "ejs");

app.listen(envSchema.PORT, () => {
  console.log(`Server is running on port no. ${envSchema.PORT}`);
});
