const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const multer = require('multer');
const { body, validationResult } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Database
const db = new Database('social_media.db');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    bio TEXT,
    profile_picture TEXT DEFAULT 'default-avatar.png',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    image TEXT,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, user_id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS followers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    follower_id INTEGER NOT NULL,
    following_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(follower_id, following_id),
    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

app.use(session({
  secret: 'social-media-secret-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Authentication middleware
const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// ============== ROUTES ==============

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============== AUTH ROUTES ==============

// Register
app.post('/api/register', [
  body('username').isLength({ min: 3 }).trim().escape(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('full_name').notEmpty().trim().escape()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password, full_name } = req.body;

  try {
    // Check if user exists
    const existingUser = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const result = db.prepare('INSERT INTO users (username, email, password, full_name) VALUES (?, ?, ?, ?)').run(username, email, hashedPassword, full_name);

    req.session.userId = result.lastInsertRowid;
    req.session.username = username;

    res.json({ message: 'Registration successful', userId: result.lastInsertRowid });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/login', [
  body('username').notEmpty().trim().escape(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;

  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    req.session.userId = user.id;
    req.session.username = user.username;

    res.json({ message: 'Login successful', userId: user.id, username: user.username });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out successfully' });
});

// Get current user
app.get('/api/user/current', isAuthenticated, (req, res) => {
  try {
    const user = db.prepare('SELECT id, username, email, full_name, bio, profile_picture, created_at FROM users WHERE id = ?').get(req.session.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get follower and following counts
    const followersCount = db.prepare('SELECT COUNT(*) as count FROM followers WHERE following_id = ?').get(user.id).count;
    const followingCount = db.prepare('SELECT COUNT(*) as count FROM followers WHERE follower_id = ?').get(user.id).count;
    const postsCount = db.prepare('SELECT COUNT(*) as count FROM posts WHERE user_id = ?').get(user.id).count;

    res.json({ 
      ...user, 
      followers_count: followersCount,
      following_count: followingCount,
      posts_count: postsCount
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============== USER ROUTES ==============

// Get user profile
app.get('/api/users/:id', isAuthenticated, (req, res) => {
  try {
    const user = db.prepare('SELECT id, username, full_name, bio, profile_picture, created_at FROM users WHERE id = ?').get(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get follower and following counts
    const followersCount = db.prepare('SELECT COUNT(*) as count FROM followers WHERE following_id = ?').get(user.id).count;
    const followingCount = db.prepare('SELECT COUNT(*) as count FROM followers WHERE follower_id = ?').get(user.id).count;
    const postsCount = db.prepare('SELECT COUNT(*) as count FROM posts WHERE user_id = ?').get(user.id).count;

    // Check if current user follows this user
    const isFollowing = db.prepare('SELECT * FROM followers WHERE follower_id = ? AND following_id = ?').get(req.session.userId, user.id);

    res.json({ 
      ...user, 
      followers_count: followersCount,
      following_count: followingCount,
      posts_count: postsCount,
      is_following: !!isFollowing
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user profile
app.put('/api/users/profile', isAuthenticated, [
  body('full_name').optional().trim().escape(),
  body('bio').optional().trim().escape()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { full_name, bio } = req.body;

  try {
    db.prepare('UPDATE users SET full_name = ?, bio = ? WHERE id = ?').run(full_name, bio, req.session.userId);
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Search users
app.get('/api/users/search/:query', isAuthenticated, (req, res) => {
  try {
    const users = db.prepare('SELECT id, username, full_name, profile_picture FROM users WHERE username LIKE ? OR full_name LIKE ? LIMIT 10').all(`%${req.params.query}%`, `%${req.params.query}%`);
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============== POST ROUTES ==============

// Create post
app.post('/api/posts', isAuthenticated, upload.single('image'), [
  body('content').notEmpty().trim()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { content } = req.body;
  const image = req.file ? req.file.filename : null;

  try {
    const result = db.prepare('INSERT INTO posts (user_id, content, image) VALUES (?, ?, ?)').run(req.session.userId, content, image);
    res.json({ message: 'Post created successfully', postId: result.lastInsertRowid });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all posts (feed)
app.get('/api/posts', isAuthenticated, (req, res) => {
  try {
    const posts = db.prepare(`
      SELECT p.*, u.username, u.full_name, u.profile_picture,
      (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as user_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
      LIMIT 50
    `).all(req.session.userId);

    res.json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get posts by user
app.get('/api/posts/user/:userId', isAuthenticated, (req, res) => {
  try {
    const posts = db.prepare(`
      SELECT p.*, u.username, u.full_name, u.profile_picture,
      (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as user_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `).all(req.session.userId, req.params.userId);

    res.json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete post
app.delete('/api/posts/:id', isAuthenticated, (req, res) => {
  try {
    const post = db.prepare('SELECT * FROM posts WHERE id = ? AND user_id = ?').get(req.params.id, req.session.userId);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found or unauthorized' });
    }

    db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============== LIKE ROUTES ==============

// Like/Unlike post
app.post('/api/posts/:id/like', isAuthenticated, (req, res) => {
  try {
    const existingLike = db.prepare('SELECT * FROM likes WHERE post_id = ? AND user_id = ?').get(req.params.id, req.session.userId);

    if (existingLike) {
      // Unlike
      db.prepare('DELETE FROM likes WHERE post_id = ? AND user_id = ?').run(req.params.id, req.session.userId);
      db.prepare('UPDATE posts SET likes_count = likes_count - 1 WHERE id = ?').run(req.params.id);
      res.json({ message: 'Post unliked', liked: false });
    } else {
      // Like
      db.prepare('INSERT INTO likes (post_id, user_id) VALUES (?, ?)').run(req.params.id, req.session.userId);
      db.prepare('UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?').run(req.params.id);
      res.json({ message: 'Post liked', liked: true });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============== COMMENT ROUTES ==============

// Add comment
app.post('/api/posts/:id/comments', isAuthenticated, [
  body('content').notEmpty().trim().escape()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { content } = req.body;

  try {
    const result = db.prepare('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)').run(req.params.id, req.session.userId, content);
    db.prepare('UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?').run(req.params.id);
    
    const comment = db.prepare(`
      SELECT c.*, u.username, u.profile_picture 
      FROM comments c 
      JOIN users u ON c.user_id = u.id 
      WHERE c.id = ?
    `).get(result.lastInsertRowid);
    
    res.json(comment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get comments for post
app.get('/api/posts/:id/comments', isAuthenticated, (req, res) => {
  try {
    const comments = db.prepare(`
      SELECT c.*, u.username, u.profile_picture 
      FROM comments c 
      JOIN users u ON c.user_id = u.id 
      WHERE c.post_id = ?
      ORDER BY c.created_at DESC
    `).all(req.params.id);

    res.json(comments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete comment
app.delete('/api/comments/:id', isAuthenticated, (req, res) => {
  try {
    const comment = db.prepare('SELECT * FROM comments WHERE id = ? AND user_id = ?').get(req.params.id, req.session.userId);
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found or unauthorized' });
    }

    db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
    db.prepare('UPDATE posts SET comments_count = comments_count - 1 WHERE id = ?').run(comment.post_id);
    
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============== FOLLOW ROUTES ==============

// Follow/Unfollow user
app.post('/api/users/:id/follow', isAuthenticated, (req, res) => {
  const targetUserId = req.params.id;

  if (targetUserId == req.session.userId) {
    return res.status(400).json({ error: 'Cannot follow yourself' });
  }

  try {
    const existingFollow = db.prepare('SELECT * FROM followers WHERE follower_id = ? AND following_id = ?').get(req.session.userId, targetUserId);

    if (existingFollow) {
      // Unfollow
      db.prepare('DELETE FROM followers WHERE follower_id = ? AND following_id = ?').run(req.session.userId, targetUserId);
      res.json({ message: 'Unfollowed successfully', following: false });
    } else {
      // Follow
      db.prepare('INSERT INTO followers (follower_id, following_id) VALUES (?, ?)').run(req.session.userId, targetUserId);
      res.json({ message: 'Followed successfully', following: true });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get followers
app.get('/api/users/:id/followers', isAuthenticated, (req, res) => {
  try {
    const followers = db.prepare(`
      SELECT u.id, u.username, u.full_name, u.profile_picture
      FROM followers f
      JOIN users u ON f.follower_id = u.id
      WHERE f.following_id = ?
    `).all(req.params.id);

    res.json(followers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get following
app.get('/api/users/:id/following', isAuthenticated, (req, res) => {
  try {
    const following = db.prepare(`
      SELECT u.id, u.username, u.full_name, u.profile_picture
      FROM followers f
      JOIN users u ON f.following_id = u.id
      WHERE f.follower_id = ?
    `).all(req.params.id);

    res.json(following);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
