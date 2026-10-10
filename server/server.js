import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

if (!MONGO_URI || !JWT_SECRET) {
  console.error("❌ Missing MONGO_URI or JWT_SECRET. Copy server/.env.example to server/.env and fill in both values (on Render, add them under Environment).");
  process.exit(1);
}

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

const allowedOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map(o => o.trim().replace(/\/$/, ""))
  .filter(Boolean);
app.use(cors(allowedOrigins.length ? { origin: allowedOrigins } : undefined));
app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => res.json({ status: "Fieldnotes API is running" }));

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

const tooMany = { error: "Too many attempts. Please wait a few minutes and try again." };
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 20,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooMany
});
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: parseInt(process.env.SIGNUP_RATE_LIMIT_MAX, 10) || 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooMany
});
app.use("/api/auth/login", loginLimiter);
app.use("/api/auth/signup", signupLimiter);

// ---------- Schemas ----------
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  bio: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model("User", userSchema);

const postSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  excerpt: { type: String, default: "" },
  content: { type: String, required: true }, // markdown
  tags: [{ type: String }],
  status: { type: String, enum: ["draft", "published"], default: "draft" },
  readTimeMinutes: { type: Number, default: 1 },
  deleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  publishedAt: { type: Date, default: null }
});
postSchema.index({ status: 1, deleted: 1, publishedAt: -1 });
const Post = mongoose.model("Post", postSchema);

// ---------- Helpers ----------
const WORDS_PER_MIN = 200;
function readTime(markdown) {
  const words = (markdown || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MIN));
}
function makeExcerpt(markdown) {
  const plain = (markdown || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#*_`>[\]()!-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > 180 ? plain.slice(0, 177) + "…" : plain;
}
function slugify(title) {
  return (title || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80) || "post";
}
async function uniqueSlug(title, excludeId) {
  const base = slugify(title);
  let slug = base;
  let n = 2;
  while (await Post.exists({ slug, _id: { $ne: excludeId } })) {
    slug = `${base}-${n++}`;
  }
  return slug;
}
function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}
function cleanTags(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of value) {
    const t = cleanText(raw).toLowerCase().replace(/^#+/, "").slice(0, 30);
    if (t && !seen.has(t) && out.length < 8) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
async function findUserByEmail(email) {
  return (await User.findOne({ email })) ||
    (await User.findOne({ email: new RegExp(`^${escapeRegex(email)}$`, "i") }));
}
function publicUser(user) {
  return { id: user._id, name: user.name, email: user.email, bio: user.bio };
}
function publicPost(post, viewerId) {
  const obj = post.toObject ? post.toObject() : post;
  return { ...obj, isOwner: viewerId ? String(obj.userId) === String(viewerId) : false };
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access token required" });
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token" });
    req.userId = decoded.userId;
    next();
  });
}
// Like authenticateToken, but lets a logged-out visitor through (req.userId stays undefined)
function optionalAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return next();
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (!err) req.userId = decoded.userId;
    next();
  });
}

// ---------- AUTH ----------
app.post("/api/auth/signup", async (req, res) => {
  try {
    const name = cleanText(req.body.name);
    const email = cleanText(req.body.email).toLowerCase();
    const password = typeof req.body.password === "string" ? req.body.password : "";

    if (!name || !email || !password) return res.status(400).json({ error: "All fields are required" });
    if (name.length > 60) return res.status(400).json({ error: "Name is too long (max 60 characters)" });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: "Please enter a valid email" });
    if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
    if (await findUserByEmail(email)) return res.status(400).json({ error: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword });
    await user.save();

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json({ token, user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ error: "Email already registered" });
    res.status(500).json({ error: "Signup failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = cleanText(req.body.email).toLowerCase();
    const password = typeof req.body.password === "string" ? req.body.password : "";
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

    const user = await findUserByEmail(email);
    if (!user) return res.status(400).json({ error: "Invalid credentials" });
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});

app.get("/api/auth/me", authenticateToken, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(publicUser(user));
});

// ---------- POSTS ----------

// Public feed: published posts only. Supports ?q= search and ?tag= filter.
app.get("/api/posts", optionalAuth, async (req, res) => {
  try {
    const q = cleanText(req.query.q);
    const tag = cleanText(req.query.tag).toLowerCase();
    const mine = req.query.mine === "true";

    const filter = { deleted: false };
    if (mine) {
      if (!req.userId) return res.status(401).json({ error: "Access token required" });
      filter.userId = req.userId;
    } else {
      filter.status = "published";
    }
    if (tag) filter.tags = tag;
    if (q) {
      const pattern = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ title: pattern }, { content: pattern }, { excerpt: pattern }, { tags: pattern }];
    }

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(30, Math.max(1, Number.parseInt(req.query.limit, 10) || 9));
    const total = await Post.countDocuments(filter);
    const posts = await Post.find(filter)
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    res.json({ posts: posts.map(p => publicPost(p, req.userId)), page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// A logged-in user's own posts, drafts included
app.get("/api/posts/mine", authenticateToken, async (req, res) => {
  try {
    const posts = await Post.find({ userId: req.userId, deleted: false }).sort({ updatedAt: -1 });
    res.json(posts.map(p => publicPost(p, req.userId)));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch your posts" });
  }
});

app.get("/api/tags", async (req, res) => {
  try {
    const tags = await Post.distinct("tags", { status: "published", deleted: false });
    res.json(tags.sort());
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tags" });
  }
});

app.get("/api/posts/:slug", optionalAuth, async (req, res) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug, deleted: false });
    if (!post) return res.status(404).json({ error: "Post not found" });
    const isOwner = req.userId && String(post.userId) === String(req.userId);
    if (post.status !== "published" && !isOwner) return res.status(404).json({ error: "Post not found" });

    const author = await User.findById(post.userId).select("name bio");
    res.json({ ...publicPost(post, req.userId), author: author ? { name: author.name, bio: author.bio } : null });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch post" });
  }
});

app.post("/api/posts", authenticateToken, async (req, res) => {
  try {
    const title = cleanText(req.body.title);
    const content = cleanText(req.body.content);
    const tags = cleanTags(req.body.tags);
    const status = req.body.status === "published" ? "published" : "draft";

    if (!title) return res.status(400).json({ error: "Title is required" });
    if (title.length > 150) return res.status(400).json({ error: "Title is too long (max 150 characters)" });
    if (!content) return res.status(400).json({ error: "Post content cannot be empty" });
    if (content.length > 50000) return res.status(400).json({ error: "Post content is too long" });

    const slug = await uniqueSlug(title);
    const post = new Post({
      userId: req.userId,
      title,
      slug,
      content,
      excerpt: makeExcerpt(content),
      tags,
      status,
      readTimeMinutes: readTime(content),
      publishedAt: status === "published" ? new Date() : null
    });
    await post.save();
    res.status(201).json(publicPost(post, req.userId));
  } catch (error) {
    console.error("Create post failed:", error);
    if (error.code === 11000) return res.status(409).json({ error: "A post with that URL already exists. Please try again." });
    res.status(500).json({ error: "Failed to create post. Please try again." });
  }
});

app.patch("/api/posts/:id", authenticateToken, async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, userId: req.userId, deleted: false });
    if (!post) return res.status(404).json({ error: "Post not found" });

    if (req.body.title !== undefined) {
      const title = cleanText(req.body.title);
      if (!title) return res.status(400).json({ error: "Title cannot be empty" });
      if (title.length > 150) return res.status(400).json({ error: "Title is too long (max 150 characters)" });
      // Keep the original slug so bookmarks and existing links continue to work.
      post.title = title;
    }
    if (req.body.content !== undefined) {
      const content = cleanText(req.body.content);
      if (!content) return res.status(400).json({ error: "Post content cannot be empty" });
      if (content.length > 50000) return res.status(400).json({ error: "Post content is too long" });
      post.content = content;
      post.excerpt = makeExcerpt(content);
      post.readTimeMinutes = readTime(content);
    }
    if (req.body.tags !== undefined) post.tags = cleanTags(req.body.tags);
    if (req.body.status !== undefined) {
      if (!["draft", "published"].includes(req.body.status)) return res.status(400).json({ error: "Status must be draft or published" });
      if (req.body.status === "published" && post.status !== "published") post.publishedAt = new Date();
      post.status = req.body.status;
    }
    post.updatedAt = new Date();

    await post.save();
    res.json(publicPost(post, req.userId));
  } catch (error) {
    console.error("Update post failed:", error);
    if (error.name === "CastError") return res.status(400).json({ error: "Invalid post ID" });
    if (error.code === 11000) return res.status(409).json({ error: "A post with that URL already exists." });
    res.status(500).json({ error: "Failed to update post. Please try again." });
  }
});

app.delete("/api/posts/:id", authenticateToken, async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, userId: req.userId, deleted: false });
    if (!post) return res.status(404).json({ error: "Post not found" });
    post.deleted = true;
    post.updatedAt = new Date();
    await post.save();
    res.json({ success: true, message: "Post deleted" });
  } catch (error) {
    console.error("Delete post failed:", error);
    if (error.name === "CastError") return res.status(400).json({ error: "Invalid post ID" });
    res.status(500).json({ error: "Failed to delete post. Please try again." });
  }
});

app.post("/api/posts/:id/restore", authenticateToken, async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, userId: req.userId, deleted: true });
    if (!post) return res.status(404).json({ error: "Post not found" });
    post.deleted = false;
    post.updatedAt = new Date();
    await post.save();
    res.json(publicPost(post, req.userId));
  } catch (error) {
    console.error("Restore post failed:", error);
    if (error.name === "CastError") return res.status(400).json({ error: "Invalid post ID" });
    res.status(500).json({ error: "Failed to restore post. Please try again." });
  }
});

app.use((req, res) => res.status(404).json({ error: "Route not found" }));
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid JSON in request" });
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
});

const PORT = Number(process.env.PORT) || 5001;
let httpServer;

async function start() {
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    console.log("✅ Connected to MongoDB");
    httpServer = app.listen(PORT, () => console.log(`🚀 Fieldnotes API running on http://localhost:${PORT}`));
  } catch (error) {
    console.error("❌ Could not connect to MongoDB. Check MONGO_URI and network access.", error.message);
    process.exit(1);
  }
}

async function shutdown(signal) {
  console.log(`${signal} received; shutting down Fieldnotes…`);
  if (httpServer) await new Promise(resolve => httpServer.close(resolve));
  await mongoose.disconnect();
  process.exit(0);
}
process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
start();
