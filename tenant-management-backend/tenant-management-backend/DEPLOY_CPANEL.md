# Deploying to cPanel (LiteSpeed Node.js)

## Fixing the errors you saw

### 1. `tenantmanager.app@gmail.com: No such file or directory`

This means **Application startup file** in cPanel is set to the wrong value (e.g. an email).

- In cPanel → **Setup Node.js App** → your app → **Application startup file**
- Set it to exactly: **`run.cjs`** (not `src/server.js`, not an email, not a URL)
- Application root must be the folder that contains `package.json` and `run.cjs`.

### 2. `Cannot find package 'dotenv'`

Dependencies are not installed on the server.

- In cPanel open **Terminal** (or SSH into your account).
- Go to your app directory, then run:
  ```bash
  cd ~/tenant-management-backend
  # or: cd ~/apiaashish/tenant-management-backend  (match your actual path)
  npm install --production
  ```
- Restart the Node.js app in cPanel after `npm install` finishes.

### 3. `ERR_REQUIRE_ASYNC_MODULE` (require() cannot be used on an ESM graph with top-level await)

LiteSpeed starts the app with `require()`. The app is ESM, so you must use the CommonJS bootstrap so LiteSpeed never `require()`-loads ESM.

- Use **`run.cjs`** as the **Application startup file** (see step 1).
- Do **not** use `src/server.js` or `src/app.js` as the startup file when running under LiteSpeed.

---

## Checklist

| Step | What to do                                                                                                                 |
| ---- | -------------------------------------------------------------------------------------------------------------------------- |
| 1    | Application root = folder containing `package.json` (e.g. `~/apiaashish/tenant-management-backend`)                        |
| 2    | Application startup file = **`run.cjs`** (no path, just `run.cjs`)                                                         |
| 3    | In Terminal: `cd` to that folder, run `npm install --production`                                                           |
| 4    | Set env vars in cPanel (e.g. `NODE_ENV`, `PORT`, `MONGODB_URI`, `FRONTEND_URL`, etc.) or use a `.env` file in the app root |
| 5    | Restart the Node.js app in cPanel                                                                                          |

---

## Optional: run without LiteSpeed (direct Node)

If you run the app with `node src/server.js` (e.g. from Terminal or your own process manager), you do **not** need `run.cjs`; use `src/server.js` as the entry. The `run.cjs` file is only for environments that start the app with `require()` (e.g. LiteSpeed’s lsnode).
