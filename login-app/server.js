const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const path = require("path");

// ---------- Database ----------
const db = new Database(path.join(__dirname, "app.db"));
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);
const findByEmail = db.prepare("SELECT * FROM users WHERE email = ?");
const findById = db.prepare("SELECT id, name, email, created_at FROM users WHERE id = ?");
const insertUser = db.prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)");

// ---------- App ----------
const app = express();
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "change-this-secret-before-deploying",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax", maxAge: 1000 * 60 * 60 * 8 },
  })
);

// Very small in-memory limiter: 10 attempts per IP per 15 minutes on auth routes.
const attempts = new Map();
function limitAuth(req, res, next) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const entry = attempts.get(req.ip) || { count: 0, start: now };
  if (now - entry.start > windowMs) { entry.count = 0; entry.start = now; }
  entry.count += 1;
  attempts.set(req.ip, entry);
  if (entry.count > 10) {
    return res.status(429).json({ error: "Too many attempts. Try again in 15 minutes." });
  }
  next();
}

const emailOk = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

// ---------- Pages ----------
app.get("/", (req, res) => {
  if (req.session.userId) return res.redirect("/dashboard");
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.get("/dashboard", (req, res) => {
  if (!req.session.userId) return res.redirect("/");
  res.sendFile(path.join(__dirname, "views", "dashboard.html"));
});
app.use(express.static(path.join(__dirname, "public"), { index: false }));

// ---------- API ----------
app.post("/api/register", limitAuth, (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (!name) return res.status(400).json({ error: "Enter your name." });
  if (!emailOk(email)) return res.status(400).json({ error: "Enter a valid email address." });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });

  try {
    const hash = bcrypt.hashSync(password, 12);
    const info = insertUser.run(name, email, hash);
    req.session.userId = info.lastInsertRowid;
    res.json({ ok: true });
  } catch (err) {
    if (String(err.code).startsWith("SQLITE_CONSTRAINT")) {
      return res.status(409).json({ error: "An account with this email already exists. Sign in instead." });
    }
    console.error(err);
    res.status(500).json({ error: "Something went wrong. Try again." });
  }
});

app.post("/api/login", limitAuth, (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const user = findByEmail.get(email);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Email or password is incorrect." });
  }
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: "Something went wrong. Try again." });
    req.session.userId = user.id;
    res.json({ ok: true });
  });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/me", (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Not signed in." });
  res.json(findById.get(req.session.userId));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running at http://localhost:${PORT}`));
