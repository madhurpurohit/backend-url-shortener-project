import {
  authenticateUser,
  clearResetPasswordToken,
  clearUserSession,
  clearVerifyEmailTokens,
  comparePassword,
  createResetPasswordLink,
  createUser,
  createUserWithOauth,
  findUserByEmail,
  findUserById,
  findVerificationEmailToken,
  getAllShortLinks,
  getHashedPassword,
  getResetPasswordToken,
  getUserByEmail,
  getUserWithOauthId,
  linkUserWithOauth,
  sendNewVerifyEmailLink,
  updateUserByName,
  updateUserPassword,
  verifyUserEmailAndUpdate,
} from "../services/auth.services.js";
import {
  forgotPasswordSchema,
  loginUserSchema,
  registerUserSchema,
  verifyEmailSchema,
  verifyPasswordSchema,
  verifyResetPasswordSchema,
  setPasswordSchema,
  verifyUserSchema,
} from "../validation/auth.validation.js";
import { getHtmlFromMjmlTemplate } from "../lib/get-html-from-mjml-template.js";
import { decodeIdToken, generateCodeVerifier, generateState } from "arctic";
import { google } from "../lib/oauth/google.js";
import { OAUTH_EXCHANGE_EXPIRY } from "../config/constants.js";
import { github } from "../lib/oauth/github.js";
import { sendMail } from "../lib/nodemailer.js";

export const getRegisterPage = (req, res) => {
  if (req.user) return res.redirect("/");

  res.render("auth/register", { errors: req.flash("errors") });
};

export const getLoginPage = (req, res) => {
  if (req.user) return res.redirect("/");

  res.render("../views/auth/login", { errors: req.flash("errors") });
};

export const postLogin = async (req, res) => {
  try {
    if (req.user) return res.redirect("/");

    const validateResult = loginUserSchema.safeParse(req.body);

    if (validateResult.success === false) {
      const errors = validateResult.error.issues[0].message;
      req.flash("errors", errors);
      return res.redirect("/login");
    }

    const { email, password } = validateResult?.data;

    const user = await getUserByEmail(email);

    if (!user) {
      req.flash("errors", "Invalid Email or Password");
      return res.redirect("/login");
    }

    if (!user.password) {
      req.flash(
        "errors",
        "You have created account using social login. Please login with your social account."
      );
      res.redirect("/login");
    }

    const isPasswordMatch = await comparePassword(password, user.password);

    if (!isPasswordMatch) {
      req.flash("errors", "Invalid Email or Password");
      return res.redirect("/login");
    }

    await authenticateUser({ req, res, user });

    res.redirect("/");
  } catch (error) {
    console.error(error);
    req.flash("errors", "Something went wrong. Please try again.");
    return res.redirect("/login");
  }
};

export const postRegister = async (req, res) => {
  try {
    if (req.user) return res.redirect("/");

    const validateResult = registerUserSchema.safeParse(req.body);
    if (validateResult.success === false) {
      const errors = validateResult.error.issues[0].message;
      req.flash("errors", errors);
      return res.redirect("/register");
    }

    const { name, email, password } = validateResult?.data;

    const userExists = await getUserByEmail(email);

    if (userExists) {
      req.flash("errors", "Email already exists");
      return res.redirect("/register");
    }

    const hashPassword = await getHashedPassword(password);

    const user = await createUser({ name, email, password: hashPassword });

    await authenticateUser({ req, res, user, name, email });

    await sendNewVerifyEmailLink({ email: email, userId: user.id });

    res.redirect("/");
  } catch (error) {
    console.error(error);
    req.flash("errors", "Something went wrong. Please try again.");
    return res.redirect("/register");
  }
};

export const logoutUser = async (req, res) => {
  try {
    await clearUserSession(req.user.sessionId);
  } catch (error) {
    console.error(error);
  }
  res.clearCookie("access_token");
  res.clearCookie("refresh_token");
  res.redirect("/login");
};

export const getProfilePage = async (req, res) => {
  try {
    if (!req.user) return res.redirect("/login");

    const user = await findUserById(req.user.id);

    if (!user) return res.redirect("/login");

    const userShortLinks = await getAllShortLinks(user.id);

    return res.render("auth/profile", {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isEmailValid: user.isEmailValid,
        hasPassword: Boolean(user.password),
        createdAt: user.createdAt,
        links: userShortLinks,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    console.error(error);
    req.flash("errors", "Something went wrong.");
    return res.redirect("/login");
  }
};

export const getVerifyEmailPage = async (req, res) => {
  try {
    if (!req.user) return res.redirect("/login");

    const user = await findUserById(req.user.id);

    if (!user || user.isEmailValid) return res.redirect("/login");

    return res.render("auth/verify-email", {
      email: req.user.email,
    });
  } catch (error) {
    console.error(error);
    req.flash("errors", "Something went wrong.");
    return res.redirect("/login");
  }
};

export const resendVerificationLink = async (req, res) => {
  try {
    if (!req.user) return res.redirect("/login");

    const user = await findUserById(req.user.id);
    if (!user || user.isEmailValid) return res.redirect("/login");

    await sendNewVerifyEmailLink({
      email: req.user.email,
      userId: req.user.id,
    });

    res.redirect("/verify-email");
  } catch (error) {
    console.error(error);
    req.flash("errors", "Something went wrong.");
    return res.redirect("/verify-email");
  }
};

export const verifyEmailToken = async (req, res) => {
  try {
    const { data, error } = verifyEmailSchema.safeParse(req.query);

    if (error) return res.send("Verification link invalid or expired.");

    const [token] = await findVerificationEmailToken(data);

    if (!token) return res.send("Verification link invalid or expired.");

    await verifyUserEmailAndUpdate(token.email);

    await clearVerifyEmailTokens(token.userId).catch(console.error);

    return res.redirect("/profile");
  } catch (error) {
    console.error(error);
    return res.send("An error occurred. Please try again.");
  }
};

export const getEditProfilePage = async (req, res) => {
  try {
    if (!req.user) return res.redirect("/login");

    const user = await findUserById(req.user.id);

    if (!user) return res.redirect("/login");

    return res.render("auth/edit-profile", {
      name: user.name,
      errors: req.flash("errors"),
      avatarUrl: user.avatarUrl,
    });
  } catch (error) {
    console.error(error);
    req.flash("errors", "Something went wrong.");
    return res.redirect("/profile");
  }
};

export const postEditProfile = async (req, res) => {
  try {
    if (!req.user) return res.redirect("/login");

    const { data, error } = verifyUserSchema.safeParse(req.body);

    if (error) {
      const errorMessage = error.issues.map((err) => err.message);
      req.flash("errors", errorMessage);
      return res.redirect("/edit-profile");
    }

    const fileUrl = req.file
      ? `uploads/avatars/${req.file.filename}`
      : undefined;

    await updateUserByName({
      userId: req.user.id,
      name: data.name,
      avatarUrl: fileUrl,
    });

    return res.redirect("/profile");
  } catch (error) {
    console.error(error);
    req.flash("errors", "Something went wrong.");
    return res.redirect("/edit-profile");
  }
};

export const getChangePasswordPage = (req, res) => {
  if (!req.user) return res.redirect("/login");

  return res.render("auth/change-password", {
    errors: req.flash("errors"),
  });
};

export const postChangePassword = async (req, res) => {
  try {
    if (!req.user) return res.redirect("/login");

    const { data, error } = verifyPasswordSchema.safeParse(req.body);

    if (error) {
      const errorMessage = error.issues.map((err) => err.message);
      req.flash("errors", errorMessage);
      return res.redirect("/change-password");
    }

    const user = await findUserById(req.user.id);

    if (!user) return res.redirect("/login");

    const isPasswordMatch = comparePassword(data.newPassword, user.password);

    if (!isPasswordMatch) {
      req.flash("errors", "Old Password that you entered is invalid");
      return res.redirect("/change-password");
    }

    await updateUserPassword({ userId: user.id, password: data.newPassword });

    return res.redirect("/profile");
  } catch (error) {
    console.error(error);
    req.flash("errors", "Something went wrong.");
    return res.redirect("/change-password");
  }
};

export const getForgotPasswordPage = (req, res) => {
  return res.render("auth/forgot-password", {
    formSubmitted: req.flash("formSubmitted")[0],
    errors: req.flash("errors"),
  });
};

export const postForgotPassword = async (req, res) => {
  try {
    const { data, error } = forgotPasswordSchema.safeParse(req.body);

    if (error) {
      const errorMessage = error.issues.map((err) => err.message);
      req.flash("errors", errorMessage[0]);
      return res.redirect("reset-password");
    }

    const user = await findUserByEmail(data.email);

    if (user) {
      const createPasswordLink = await createResetPasswordLink({
        userId: user.id,
      });

      const html = await getHtmlFromMjmlTemplate("reset-password-email", {
        name: user.name,
        link: createPasswordLink,
      });

      sendMail({
        to: user.email,
        subject: "Reset Your Password",
        html,
      });

      req.flash("formSubmitted", true);
      return res.redirect("/reset-password");
    }

    req.flash("errors", "Email is not registered, or invalid.");
    return res.redirect("/reset-password");
  } catch (error) {
    console.error(error);
    req.flash("errors", "Something went wrong.");
    return res.redirect("/reset-password");
  }
};

export const getResetPasswordPage = async (req, res) => {
  try {
    const { token } = req.params;

    const tokenValid = await getResetPasswordToken(token);

    if (!tokenValid) {
      return res.render("auth/wrong-reset-password-token");
    }

    return res.render("auth/reset-password", {
      formSubmitted: req.flash("formSubmitted")[0],
      errors: req.flash("errors"),
      token,
    });
  } catch (error) {
    console.error(error);
    return res.render("auth/wrong-reset-password-token");
  }
};

export const postResetPassword = async (req, res) => {
  try {
    const { token } = req.params;

    const tokenValid = await getResetPasswordToken(token);

    if (!tokenValid) {
      req.flash("errors", "Invalid Reset Password Token");
      return res.render("auth/wrong-reset-password-token");
    }

    const { data, error } = verifyResetPasswordSchema.safeParse(req.body);

    if (error) {
      const errorMessage = error.issues.map((err) => err.message);
      req.flash("errors", errorMessage[0]);
      return res.redirect(`/reset-password/${token}`);
    }

    const { newPassword } = data;

    const user = await findUserById(tokenValid.userId);

    await clearResetPasswordToken(user.id);

    await updateUserPassword({ userId: user.id, password: newPassword });

    return res.redirect("/login");
  } catch (error) {
    console.error(error);
    req.flash("errors", "Something went wrong.");
    return res.redirect(`/reset-password/${req.params.token}`);
  }
};

export const getGoogleLoginPage = async (req, res) => {
  try {
    if (req.user) return res.redirect("/");

    const state = generateState();

    const codeVerifier = generateCodeVerifier();

    const url = google.createAuthorizationURL(state, codeVerifier, [
      "openid",
      "profile",
      "email",
    ]);

    const cookieConfig = {
      httpOnly: true,
      secure: true,
      maxAge: OAUTH_EXCHANGE_EXPIRY,
      sameSite: "lax",
    };

    res.cookie("google_auth_state", state, cookieConfig);
    res.cookie("google_code_verifier", codeVerifier, cookieConfig);

    res.redirect(url.toString());
  } catch (error) {
    console.error(error);
    req.flash("errors", "Something went wrong with Google login.");
    return res.redirect("/login");
  }
};

export const getGoogleLoginCallback = async (req, res) => {
  try {
    const { code, state } = req.query;

    const {
      google_code_verifier: codeVerifier,
      google_auth_state: storedState,
    } = req.cookies;

    if (
      !code ||
      !state ||
      !codeVerifier ||
      !storedState ||
      state !== storedState
    ) {
      req.flash(
        "errors",
        "Couldn't login with Google because of invalid login attempt. Please try again!"
      );
      return res.redirect("/login");
    }

    let token;
    try {
      token = await google.validateAuthorizationCode(code, codeVerifier);
    } catch (error) {
      req.flash(
        "errors",
        "Couldn't login with Google because of invalid login attempt. Please try again!"
      );
      return res.redirect("/login");
    }

    const claim = decodeIdToken(token.idToken());
    const { sub: googleUserId, name, email, picture } = claim;

    let user = await getUserWithOauthId({
      provider: "google",
      email,
    });

    if (user && !user.providerAccountId) {
      try {
        await linkUserWithOauth({
          userId: user.id,
          provider: "google",
          providerAccountId: googleUserId,
          avatarUrl: picture,
        });
      } catch {
        req.flash(
          "errors",
          "Email already exists, & Linked with another account. Please try again!"
        );
        return res.redirect("/login");
      }
    }

    if (!user) {
      user = await createUserWithOauth({
        name,
        email,
        provider: "google",
        providerAccountId: googleUserId,
        avatarUrl: picture,
      });
    }

    await authenticateUser({ req, res, user, name, email });

    res.redirect("/");
  } catch (error) {
    console.error(error);
    req.flash("errors", "Something went wrong with Google login.");
    return res.redirect("/login");
  }
};

export const getGithubLoginPage = async (req, res) => {
  try {
    if (req.user) return res.redirect("/");

    const state = generateState();

    const url = github.createAuthorizationURL(state, ["user:email"]);

    const cookieConfig = {
      httpOnly: true,
      secure: true,
      maxAge: OAUTH_EXCHANGE_EXPIRY,
      sameSite: "lax",
    };

    res.cookie("github_auth_state", state, cookieConfig);

    res.redirect(url.toString());
  } catch (error) {
    console.error(error);
    req.flash("errors", "Something went wrong with GitHub login.");
    return res.redirect("/login");
  }
};

export const getGithubLoginCallback = async (req, res) => {
  function handleError() {
    req.flash(
      "errors",
      "Couldn't login with GitHub because of invalid login attempt. Please try again!"
    );
    return res.redirect("/login");
  }

  try {
    const { code, state } = req.query;
    const { github_auth_state: storedState } = req.cookies;

    if (!code || !state || !storedState || state !== storedState) {
      return handleError();
    }

    let token;

    try {
      token = await github.validateAuthorizationCode(code);
    } catch (error) {
      return handleError();
    }

    const githubUserResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token.accessToken()}`,
      },
    });

    if (!githubUserResponse.ok) return handleError();

    const githubUser = await githubUserResponse.json();

    const { id: githubUserId, name, avatar_url: avatarUrl } = githubUser;

    const githubEmailResponse = await fetch(
      "https.api.github.com/user/emails",
      {
        headers: {
          Authorization: `Bearer ${token.accessToken()}`,
        },
      }
    );

    if (!githubEmailResponse.ok) return handleError();

    const emails = await githubEmailResponse.json();

    const email = emails.filter((e) => e.primary)[0].email;
    if (!email) return handleError();

    let user = await getUserWithOauthId({
      provider: "github",
      email,
    });

    if (user && !user.providerAccountId) {
      try {
        await linkUserWithOauth({
          userId: user.id,
          provider: "github",
          providerAccountId: githubUserId.toString(),
          avatarUrl,
        });
      } catch {
        res.flash(
          "errors",
          "Email already exists, & Linked with another account. Please try again!"
        );
        return res.redirect("/login");
      }
    }

    if (!user) {
      user = await createUserWithOauth({
        name,
        email,
        provider: "github",
        providerAccountId: githubUserId,
        avatarUrl,
      });
    }

    await authenticateUser({ req, res, user, name, email });

    res.redirect("/");
  } catch (error) {
    console.error(error);
    return handleError();
  }
};

export const getSetPasswordPage = (req, res) => {
  if (!req.user) return res.redirect("/login");

  return res.render("auth/set-password", {
    errors: req.flash("errors"),
  });
};

export const postSetPassword = async (req, res) => {
  try {
    if (!req.user) return res.redirect("/login");

    const { data, error } = setPasswordSchema.safeParse(req.body);

    if (error) {
      const errorMessage = error.issues.map((err) => err.message);
      req.flash("errors", errorMessage);
      return res.redirect("/set-password");
    }

    const { newPassword } = data;

    const user = await findUserById(req.user.id);
    if (user.password) {
      req.flash(
        "errors",
        "You already have a password. Instead of setting a new password, you can change your password."
      );
      return res.redirect("/set-password");
    }

    await updateUserPassword({ userId: user.id, password: newPassword });

    return res.redirect("/profile");
  } catch (error) {
    console.error(error);
    req.flash("errors", "Something went wrong.");
    return res.redirect("/set-password");
  }
};
