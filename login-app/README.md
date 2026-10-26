# Login app (Express + SQLite)

## Run it
1. Install Node.js 18 or newer from https://nodejs.org
2. In this folder run:
   npm install
   npm start
3. Open http://localhost:3000

The database file (app.db) is created automatically on first run.
Set SESSION_SECRET to a long random string before deploying.

## Files
- server.js: routes, sessions, password hashing, database
- public/index.html, style.css, app.js: sign in / create account page
- views/dashboard.html: page shown only to signed-in users
