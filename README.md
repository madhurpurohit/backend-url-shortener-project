# DevFlux URL Shortener

A backend service that takes a long URL and generates a unique short ID, which then redirects to the original URL. This project provides a fast and reliable way to shorten links, making them easier to share.

## Live Demo

You can view the live demo here: [https://devflux-url-shortener.onrender.com/](https://devflux-url-shortener.onrender.com/)

## Key Features

- **Secure & Fast Shortening:** Instantly generate a unique short link for any valid URL.
- **Reliable Redirection:** Seamlessly redirect users from the short link to the original destination.
- **Robust Error Handling:** Provides clear feedback for invalid URL submissions.
- **User Authentication:** Secure user registration and login system.
- **Social Logins:** Support for GitHub and Google OAuth.
- **Custom URL:** User can create custom URL for their links.
- **Link Management:** Users can view, edit, and delete their shortened links.
- **Profile Management:** Users can view and edit their profile information.

## Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** MySQL with Drizzle ORM
- **Deployment:** Render
- **Others:**
  - `zod` for validation
  - `jsonwebtoken` for authentication
  - `argon2` for password hashing
  - `resend` for sending emails
  - `mjml` for email templates
  - `multer` for file uploads
  - `ejs` for server-side rendering
  - `arctic` for OAuth

## Installation & Setup

1.  Clone the repository:
    ```bash
    git clone https://github.com/madhurpurohit/backend-url-shortener-project
    ```
2.  Navigate to the project directory:
    ```bash
    cd url-shortener
    ```
3.  Install dependencies:
    ```bash
    npm install
    ```
4.  Create a `.env` file in the root directory and add the necessary environment variables (see the section below).
5.  Run the database migrations:
    ```bash
    npm run db:migrate
    ```
6.  Run the development server:
    ```bash
    npm run dev
    ```

## Environment Variables

Create a `.env` file in the root directory and add the following variables.

```.env
PORT=8000
DATABASE_URL="mysql://<user>:<password>@<host>:<port>/<database>"

# JWT
JWT_SECRET="<your_jwt_secret>"
JWT_EXPIRES_IN="1d"

# OAuth
GITHUB_CLIENT_ID="<your_github_client_id>"
GITHUB_CLIENT_SECRET="<your_github_client_secret>"
GOOGLE_CLIENT_ID="<your_google_client_id>"
GOOGLE_CLIENT_SECRET="<your_google_client_secret>"
GOOGLE_REDIRECT_URI="http://localhost:8000/auth/google/callback"

# Resend
RESEND_API_KEY="<your_resend_api_key>"
```

## API Endpoints

- ### Create Short URL
  - **Route:** `POST /`
  - **Body (JSON):**
    ```json
    {
      "url": "https://your-long-url.com"
    }
    ```
  - **Success Response (JSON):**
    ```json
    {
      "shortId": "uQx7aZ3"
    }
    ```
- ### Redirect to Original URL
  - **Route:** `GET /:shortId`
  - **Description:** Redirects the user to the original URL associated with the `shortId`.
  - **Example:** `https://devflux-url-shortener.onrender.com/uQx7aZ3` will redirect to `https://your-long-url.com`.

## Author

- Created by Madhur Purohit
- GitHub: [@madhur-purohit](https://github.com/madhur-purohit)
- LinkedIn: [Madhur Purohit](https://www.linkedin.com/in/madhur-purohit-686322209/)
- X: [Madhur Purohit](https://x.com/Madhurdotdev)

## License

This project is licensed under the MIT License.
