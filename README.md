# Fieldnotes

A personal study/coding journal — a blog platform with drafts, tags, search, and a
Markdown editor with live preview. React + Vite + Tailwind on the frontend, Node.js +
Express + MongoDB + JWT auth on the backend.

## Folders
- `server/`               Express REST API + MongoDB
- `client/`                React frontend (Vite)

## Run on your computer (needs Node.js LTS and MongoDB running locally)

### 1. Server
1. Inside `server`, copy `.env.example` to `.env` and fill in `MONGO_URI` and `JWT_SECRET`.
   For local use, `MONGO_URI=mongodb://localhost:27017/fieldnotes` works if you have
   MongoDB installed and running on your computer.
2. Open a terminal in `server` and run:

       npm install
       npm run dev

   You should see "Connected to MongoDB".

### 2. Client (open a second terminal)
       cd client
       npm install
       npm run dev

Open http://localhost:5173
sample login - vidhitawde0@gmail.com password - 12345678

## Features
- **Drafts vs Published** — a post isn't public until you publish it. Only you can see
  your own drafts.
- **Markdown editor with live preview** — write in Markdown on the left, see the
  rendered post on the right as you type.
- **Tags and search** — filter the feed by tag, or search titles/content/tags.
- **Auto reading time** — computed from word count, shown next to every post.
- **Soft delete with Undo** — deleting a post shows an "Undo" pop-up for a few seconds.
- **Unpublish** — move a published post back to drafts without losing it.

## How things work
- A post's web address (slug) is generated from its title. If two posts share a title,
  the second gets `-2`, `-3`, and so on.
- Editing a post's title regenerates its slug.
- Deleting is a soft delete on the server — the post is hidden, not erased — so Undo
  can bring it back exactly as it was.
- Rendered Markdown is sanitized (DOMPurify) before being shown, since other people can
  read your published posts.
- The server will not start without `MONGO_URI` and `JWT_SECRET` in `server/.env`.
- Login and signup are rate-limited to slow down password guessing and spam signups.

## API endpoints
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | /api/auth/signup | Register |
| POST | /api/auth/login | Login (returns JWT) |
| GET | /api/auth/me | Current user |
| GET | /api/posts | Public feed (published only). `?q=` search, `?tag=` filter |
| GET | /api/posts/mine | Your own posts, drafts included |
| GET | /api/posts/:slug | One post (drafts only visible to their owner) |
| POST | /api/posts | Create a post |
| PATCH | /api/posts/:id | Edit a post (title/content/tags/status) |
| DELETE | /api/posts/:id | Delete a post (soft delete) |
| POST | /api/posts/:id/restore | Undo a delete |
| GET | /api/tags | All tags in use on published posts |

## Deploying online

You need three free services: a database (MongoDB Atlas), a backend host (Render), and
a frontend host (Netlify). Do them in this order, since each step needs the address
from the one before it.

### 1. Database — MongoDB Atlas
1. Go to mongodb.com/cloud/atlas and create a free account, then create a free (M0) cluster.
2. Under **Database Access**, add a database user with a username and password (save them).
3. Under **Network Access**, click **Add IP Address** → **Allow access from anywhere** (0.0.0.0/0).
4. Click **Connect** on your cluster → **Drivers** → copy the connection string. It looks like
   `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/`. Replace `<username>` and
   `<password>` with your real ones, and add a database name before the `?`, e.g.
   `.../fieldnotes?retryWrites=true`.

### 2. Backend — Render
1. Push this project to GitHub first (see below).
2. Go to render.com, sign in with GitHub, click **New → Web Service**, and pick your repository.
3. Set:
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Under **Environment**, add:
   - `MONGO_URI` = the connection string from step 1
   - `JWT_SECRET` = any long random text
5. Click **Create Web Service**. Once deployed, open the service URL — it should show
   `{"status":"Fieldnotes API is running"}`.
6. **Free-tier note:** the server "sleeps" after inactivity and takes up to ~30 seconds
   to wake back up on the next request. The login/signup screen shows a "please wait"
   message for this.

### 3. Frontend — Netlify
1. Go to app.netlify.com, sign in with GitHub, click **Add new site → Import an existing project**,
   and pick your repository.
2. Set:
   - **Base directory:** `client`
   - **Build command:** `npm run build`
   - **Publish directory:** `client/dist`
3. Under **Environment variables**, add `VITE_API_URL` = your Render URL from step 2
   (no trailing slash).
4. Click **Deploy**. Netlify gives you a link ending in `.netlify.app` — that's your live site.

### 4. Connect them (recommended)
Go back to Render → your service → **Environment**, and add:
- `CLIENT_URL` = your Netlify URL (e.g. `https://your-site.netlify.app`)

This makes the API only answer requests from your website. Render will redeploy
automatically after you add it.

### Pushing to GitHub
Never upload `.env` files — `.gitignore` already excludes them. From this folder:

    git init
    git add .
    git commit -m "Initial commit"
    git branch -M main
    git remote add origin https://github.com/<your-username>/<your-repo>.git
    git push -u origin main


## Local setup and starter content

### Run the app

1. In `server/`, copy `.env.example` to `.env` and set `MONGO_URI` and a long random `JWT_SECRET`. Keep `.env` private.
2. In `client/`, copy `.env.example` to `.env` if your API is not at the default local URL.
3. Open two terminals and run `npm install` in both `server/` and `client/`.
4. Start the API with `npm run dev` from `server/`, then start the frontend with `npm run dev` from `client/`.

### Add editorial starter stories

With MongoDB configured and reachable, run `npm run seed` from `server/`. This inserts four clearly attributed Fieldnotes Editor starter stories. It is safe to rerun: stories with the same seed slugs are skipped, and existing content is not deleted. To remove the sample stories later, delete the four posts with slugs beginning `fieldnotes-` from your local database. The seed author is content-only and is not a login account.

### Notes on this refresh

- The public feed now supports `page` and `limit` and returns `{ posts, page, limit, total, pages }`.
- Existing frontend pages that expect an array should use `/api/posts/mine` for the signed-in user's posts; the public homepage handles the paginated response.
- Post slugs are kept stable when titles are edited, so existing links do not break.
- The API now waits for MongoDB before listening and shuts down cleanly.
- Authentication still uses bearer JWTs stored in browser `localStorage`. For a production deployment, consider a coordinated migration to secure HTTP-only cookies with CSRF protection; do not change only one side of the login flow.
- Before submission, test create/edit/publish/delete/undo, use two accounts to check ownership, test invalid inputs, and verify the website at mobile and desktop widths.
