// ═══════════════════════════════════════════════════════════════════════════
// S7NEXTTECHNOLOGIES - COMPLETE PRODUCTION BACKEND SERVER
// Copy this entire file as your server.js
// ═══════════════════════════════════════════════════════════════════════════

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const sgMail = require('@sendgrid/mail');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const PORT = process.env.PORT || 5000;
// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const app = express();
app.use(cors({
  origin: [
    'https://create-react-r82fz6tpy-sitakuchibhatla-gmailcoms-projects.vercel.app',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Initialize Services
if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY !== 'dummy-key') {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

if (process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_KEY !== 'dummy') {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'dummy-key',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy-secret',
});

// PostgreSQL Connection Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://s7next:rwNsVf6oyh17wMfl4eCCtWpslQqw5Jsi@dpg-d6s17e0gjchc73bj40ag-a.singapore-postgres.render.com/s7next_k3es',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
  } else {
    console.log('✅ Database connected at:', res.rows[0].now);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════

app.use(helmet({
  // Allow cross-origin popups needed for Firebase Google OAuth
  crossOriginOpenerPolicy: false,
}));
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use('/api/', limiter);

// File upload configuration
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images allowed'));
    }
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS (MUST BE BEFORE ROUTES!)
// ═══════════════════════════════════════════════════════════════════════════

// Generate JWT tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET || 'secret', {
    expiresIn: '15m',
  });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET || 'refresh-secret', {
    expiresIn: '7d',
  });
  return { accessToken, refreshToken };
};

// Verify JWT middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await pool.query('SELECT id, email, role FROM users WHERE id = $1', [decoded.userId]);
    if (user.rows.length === 0) {
      return res.status(403).json({ error: 'User not found' });
    }
    req.user = user.rows[0];
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Admin middleware
const isAdmin = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const user = await pool.query('SELECT email, role FROM users WHERE id = $1', [req.user.id]);

    if (user.rows.length === 0 ||
        user.rows[0].email !== 's7nexttechnologies@gmail.com' ||
        user.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized admin access' });
    }

    next();
  } catch (error) {
    console.error('Admin verification error:', error);
    res.status(500).json({ error: 'Admin verification failed' });
  }
};

// Send email via SendGrid
const sendEmail = async (to, subject, html) => {
  try {
    if (!process.env.SENDGRID_API_KEY || process.env.SENDGRID_API_KEY === 'dummy-key') {
      console.log('📧 Email simulation:', to, '|', subject);
      return { success: true, message: 'Email simulation (no API key)' };
    }
    const msg = {
      to,
      from: process.env.FROM_EMAIL || 's7nexttechnologies@gmail.com',
      subject,
      html,
    };
    await sgMail.send(msg);
    console.log('✅ Email sent to:', to);
    return { success: true };
  } catch (error) {
    console.error('❌ Email error:', error.message);
    return { success: false, error: error.message };
  }
};

// Upload image to Cloudinary
const uploadToCloudinary = async (fileBuffer, folder = 'avatars') => {
  return new Promise((resolve, reject) => {
    if (!process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY === 'dummy') {
      resolve({ secure_url: 'https://via.placeholder.com/150' });
      return;
    }
    const upload = cloudinary.uploader.upload_stream(
      { folder, transformation: [{ width: 500, height: 500, crop: 'fill' }] },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    upload.end(fileBuffer);
  });
};

// ═══════════════════════════════════════════════════════════════════════════
// DATABASE INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

const initDatabase = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20) UNIQUE,
        password_hash VARCHAR(255),
        avatar_url TEXT,
        role VARCHAR(20) DEFAULT 'student',
        is_verified BOOLEAN DEFAULT false,
        auth_provider VARCHAR(50) DEFAULT 'email',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        tagline TEXT,
        description TEXT,
        price INTEGER NOT NULL,
        duration VARCHAR(50),
        level VARCHAR(50),
        icon VARCHAR(10),
        color VARCHAR(20),
        modules INTEGER DEFAULT 40,
        topics JSONB,
        syllabus JSONB,
        enrolled_count INTEGER DEFAULT 0,
        tag VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS enrollments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
        progress INTEGER DEFAULT 0,
        payment_id VARCHAR(255),
        payment_status VARCHAR(50) DEFAULT 'pending',
        amount_paid INTEGER,
        enrolled_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, course_id)
      );

      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS apps (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        icon VARCHAR(10) DEFAULT '💻',
        color VARCHAR(20) DEFAULT '#4F46E5',
        tech_stack JSONB,
        live_url TEXT,
        github_url TEXT,
        cover_image TEXT,
        status VARCHAR(50) DEFAULT 'Live',
        category VARCHAR(100) DEFAULT 'Web App',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
      CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id);
      CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);
    `);

    // Add syllabus column to courses if it doesn't exist (for existing databases)
    await pool.query(`
      ALTER TABLE courses ADD COLUMN IF NOT EXISTS syllabus JSONB;
    `).catch(() => {});

    // Insert default courses
    const coursesCount = await pool.query('SELECT COUNT(*) FROM courses');
    if (parseInt(coursesCount.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO courses (title, tagline, price, duration, level, icon, color, modules, topics, tag, enrolled_count)
        VALUES
          ('Python Basic to Advanced', 'Master Python from ground zero to expert level', 2999, '12 weeks', 'All Levels', '🐍', '#10B981', 48,
           '["Variables & Data Types", "OOP & Inheritance", "File I/O", "Error Handling", "Advanced Patterns"]', 'Bestseller', 1247),
          ('Data Science with Python', 'Turn raw data into powerful insights', 4499, '16 weeks', 'Intermediate', '📊', '#4F46E5', 62,
           '["NumPy & Pandas", "Data Visualization", "Statistical Analysis", "Scikit-learn", "Real-world Projects"]', 'Popular', 893),
          ('Machine Learning & AI', 'Build intelligent systems that learn', 5999, '20 weeks', 'Advanced', '🤖', '#F59E0B', 80,
           '["Supervised Learning", "Neural Networks", "Deep Learning", "NLP", "Model Deployment"]', 'Hot', 654),
          ('Web Development (Flask/Django)', 'Build powerful web apps with Python', 3999, '14 weeks', 'Intermediate', '🌐', '#06B6D4', 55,
           '["Flask Fundamentals", "Django ORM", "REST APIs", "Authentication", "Deployment"]', 'New', 721),
          ('Automation & API Development', 'Automate everything. Connect everything.', 3499, '10 weeks', 'Intermediate', '⚡', '#EC4899', 40,
           '["Web Scraping", "Task Automation", "REST API Design", "FastAPI", "Integration Patterns"]', 'Trending', 532),
          ('Gaming & Robotics (MicroPython)', 'Bring code to life in the physical world', 4999, '18 weeks', 'Beginner+', '🎮', '#A855F7', 70,
           '["MicroPython Basics", "GPIO & Sensors", "Game Development", "Raspberry Pi", "IoT Projects"]', 'Unique', 389)
      `);
      console.log('✅ Default courses inserted');
    }

    // Create admin user with secure credentials
    const adminEmail = 's7nexttechnologies@gmail.com';
    const adminPassword = 'Hyderabad@APR_49';

    const adminExists = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);

    if (adminExists.rows.length === 0) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await pool.query(
        'INSERT INTO users (name, email, password_hash, role, is_verified) VALUES ($1, $2, $3, $4, $5)',
        ['S7Next Admin', adminEmail, passwordHash, 'admin', true]
      );
      console.log('✅ Admin user created:', adminEmail);
    } else {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await pool.query(
        'UPDATE users SET password_hash = $1, role = $2, is_verified = $3, name = $4 WHERE email = $5',
        [passwordHash, 'admin', true, 'S7Next Admin', adminEmail]
      );
      console.log('✅ Admin credentials updated:', adminEmail);
    }

    // Remove admin role from other users
    await pool.query(
      "UPDATE users SET role = 'student' WHERE role = 'admin' AND email != $1",
      [adminEmail]
    );

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// AUTHENTICATION ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// Register with Email
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash, auth_provider) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email, passwordHash, 'email']
    );

    const user = result.rows[0];
    const { accessToken, refreshToken } = generateTokens(user.id);

    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\')',
      [user.id, refreshToken]
    );

    await sendEmail(
      email,
      'Welcome to S7NextTechnologies!',
      `<h2>Welcome ${name}!</h2><p>Thank you for joining S7NextTechnologies - India's premier Python learning platform.</p><p>Start learning today!</p>`
    );

    res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login with Email
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (!user.password_hash) {
      return res.status(401).json({ error: 'Please use OAuth login' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { accessToken, refreshToken } = generateTokens(user.id);

    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\')',
      [user.id, refreshToken]
    );

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar_url,
        role: user.role,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ─── Google OAuth Route ───────────────────────────────────────────────────
// Verifies Firebase idToken on the backend, then creates/finds the user
app.post('/api/auth/google', async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ error: 'ID token required' });
  }

  try {
    // Verify token with Firebase Admin SDK if configured
    let firebaseUser = null;

    if (
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_PRIVATE_KEY &&
      process.env.FIREBASE_CLIENT_EMAIL
    ) {
      // Lazy-load firebase-admin to avoid crash if not installed
      let admin;
      try {
        admin = require('firebase-admin');
      } catch (e) {
        console.error('firebase-admin not installed. Run: npm install firebase-admin');
        return res.status(500).json({ error: 'Firebase Admin SDK not installed on server. Run: npm install firebase-admin' });
      }

      // Initialize Firebase Admin only once
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          }),
        });
      }

      const decoded = await admin.auth().verifyIdToken(idToken);
      firebaseUser = {
        email: decoded.email,
        name: decoded.name || decoded.email.split('@')[0],
        avatar: decoded.picture || null,
        uid: decoded.uid,
      };
    } else {
      // Fallback: decode without verification (dev only — do NOT use in production)
      console.warn('⚠️  Firebase Admin not configured — decoding token without verification (dev mode only)');
      const parts = idToken.split('.');
      if (parts.length !== 3) {
        return res.status(400).json({ error: 'Invalid ID token format' });
      }
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      firebaseUser = {
        email: payload.email,
        name: payload.name || payload.email?.split('@')[0] || 'Google User',
        avatar: payload.picture || null,
        uid: payload.sub,
      };
    }

    if (!firebaseUser.email) {
      return res.status(400).json({ error: 'Could not extract email from Google token' });
    }

    // Find or create user
    let user = await pool.query('SELECT * FROM users WHERE email = $1', [firebaseUser.email]);

    if (user.rows.length === 0) {
      // New user — create account
      const result = await pool.query(
        `INSERT INTO users (name, email, avatar_url, auth_provider, is_verified, role)
         VALUES ($1, $2, $3, 'google', true, 'student')
         RETURNING id, name, email, phone, avatar_url, role`,
        [firebaseUser.name, firebaseUser.email, firebaseUser.avatar]
      );
      user = result;

      await sendEmail(
        firebaseUser.email,
        'Welcome to S7NextTechnologies!',
        `<h2>Welcome ${firebaseUser.name}!</h2><p>Your Google account has been linked. Start learning today!</p>`
      );
    } else {
      // Existing user — update avatar if changed
      if (firebaseUser.avatar && user.rows[0].avatar_url !== firebaseUser.avatar) {
        await pool.query('UPDATE users SET avatar_url = $1 WHERE email = $2', [firebaseUser.avatar, firebaseUser.email]);
        user.rows[0].avatar_url = firebaseUser.avatar;
      }
    }

    const dbUser = user.rows[0];
    const { accessToken, refreshToken } = generateTokens(dbUser.id);

    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\')',
      [dbUser.id, refreshToken]
    );

    res.json({
      user: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        phone: dbUser.phone,
        avatar: dbUser.avatar_url,
        role: dbUser.role,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Google authentication failed: ' + error.message });
  }
});

// Send OTP (Phone Auth)
app.post('/api/auth/send-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number required' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Store OTP temporarily (in production use Redis)
  global.otpStore = global.otpStore || {};
  global.otpStore[phone] = { otp, expires: Date.now() + 10 * 60 * 1000 };

  console.log(`📱 OTP for ${phone}: ${otp}`);

  // In dev mode, return otp in response for testing
  if (process.env.NODE_ENV !== 'production') {
    return res.json({ message: 'OTP sent (dev mode)', otp });
  }

  // Production: send via Twilio
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_ACCOUNT_SID !== 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx') {
    try {
      const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await twilio.messages.create({
        body: `Your S7NextTechnologies OTP is: ${otp}. Valid for 10 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });
      return res.json({ message: 'OTP sent' });
    } catch (err) {
      console.error('Twilio error:', err.message);
      return res.status(500).json({ error: 'Failed to send OTP' });
    }
  }

  res.json({ message: 'OTP sent', otp }); // fallback dev
});

// Verify OTP
app.post('/api/auth/verify-otp', async (req, res) => {
  const { phone, code, name } = req.body;

  global.otpStore = global.otpStore || {};
  const record = global.otpStore[phone];

  if (!record || record.otp !== code || Date.now() > record.expires) {
    return res.status(400).json({ error: 'Invalid or expired OTP' });
  }

  delete global.otpStore[phone];

  try {
    let user = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);

    if (user.rows.length === 0) {
      const result = await pool.query(
        `INSERT INTO users (name, phone, auth_provider, is_verified, role, email)
         VALUES ($1, $2, 'phone', true, 'student', $3)
         RETURNING id, name, email, phone, avatar_url, role`,
        [name || 'User', phone, `${phone.replace('+', '')}@phone.s7next.in`]
      );
      user = result;
    }

    const dbUser = user.rows[0];
    const { accessToken, refreshToken } = generateTokens(dbUser.id);

    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\')',
      [dbUser.id, refreshToken]
    );

    res.json({
      user: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        phone: dbUser.phone,
        avatar: dbUser.avatar_url,
        role: dbUser.role,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('OTP verify error:', error);
    res.status(500).json({ error: 'OTP verification failed' });
  }
});

// Refresh Token
app.post('/api/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'refresh-secret');

    const tokenRecord = await pool.query(
      'SELECT * FROM refresh_tokens WHERE user_id = $1 AND token = $2 AND expires_at > NOW()',
      [decoded.userId, refreshToken]
    );

    if (tokenRecord.rows.length === 0) {
      return res.status(403).json({ error: 'Invalid refresh token' });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.userId);

    await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\')',
      [decoded.userId, newRefreshToken]
    );

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (error) {
    res.status(403).json({ error: 'Invalid refresh token' });
  }
});

// Logout
app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  const { refreshToken } = req.body;
  await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
  res.json({ message: 'Logged out successfully' });
});

// ═══════════════════════════════════════════════════════════════════════════
// USER ROUTES
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const user = await pool.query(
      'SELECT id, name, email, phone, avatar_url, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    const u = user.rows[0];
    res.json({ ...u, avatar: u.avatar_url });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

app.put('/api/user/profile', authenticateToken, async (req, res) => {
  const { name, email, phone } = req.body;

  try {
    const result = await pool.query(
      'UPDATE users SET name = $1, email = $2, phone = $3, updated_at = NOW() WHERE id = $4 RETURNING id, name, email, phone, avatar_url, role',
      [name, email, phone, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

app.post('/api/user/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const result = await uploadToCloudinary(req.file.buffer, 'avatars');

    await pool.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [result.secure_url, req.user.id]);

    res.json({ avatarUrl: result.secure_url });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

app.get('/api/user/enrollments', authenticateToken, async (req, res) => {
  try {
    const enrollments = await pool.query(
      `SELECT e.*, c.title, c.icon, c.color, c.modules, c.duration
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       WHERE e.user_id = $1
       ORDER BY e.enrolled_at DESC`,
      [req.user.id]
    );
    res.json(enrollments.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});

app.put('/api/user/progress/:courseId', authenticateToken, async (req, res) => {
  const { courseId } = req.params;
  const { progress } = req.body;

  try {
    await pool.query(
      'UPDATE enrollments SET progress = $1 WHERE user_id = $2 AND course_id = $3',
      [progress, req.user.id, courseId]
    );
    res.json({ message: 'Progress updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// COURSE ROUTES
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/courses', async (req, res) => {
  try {
    const courses = await pool.query('SELECT * FROM courses ORDER BY created_at DESC');
    res.json(courses.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

app.get('/api/courses/:id', async (req, res) => {
  try {
    const course = await pool.query('SELECT * FROM courses WHERE id = $1', [req.params.id]);
    if (course.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    res.json(course.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// APPS / PROJECTS ROUTES (PUBLIC)
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/apps', async (req, res) => {
  try {
    const apps = await pool.query('SELECT * FROM apps ORDER BY created_at DESC');
    res.json(apps.rows);
  } catch (error) {
    console.error('Fetch apps error:', error);
    res.status(500).json({ error: 'Failed to fetch apps' });
  }
});

app.get('/api/apps/:id', async (req, res) => {
  try {
    const app = await pool.query('SELECT * FROM apps WHERE id = $1', [req.params.id]);
    if (app.rows.length === 0) {
      return res.status(404).json({ error: 'App not found' });
    }
    res.json(app.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch app' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PAYMENT ROUTES (Razorpay)
// ═══════════════════════════════════════════════════════════════════════════

app.post('/api/payment/create-order', authenticateToken, async (req, res) => {
  const { courseId } = req.body;

  try {
    const course = await pool.query('SELECT * FROM courses WHERE id = $1', [courseId]);
    if (course.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const amount = Math.round(course.rows[0].price * 1.18);

    const existing = await pool.query(
      'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [req.user.id, courseId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Already enrolled in this course' });
    }

    if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === 'dummy-key') {
      const mockOrderId = 'order_' + Date.now();
      res.json({
        orderId: mockOrderId,
        amount: amount * 100,
        currency: 'INR',
        keyId: 'mock-key',
        dev: true,
      });
    } else {
      const order = await razorpay.orders.create({
        amount: amount * 100,
        currency: 'INR',
        receipt: `receipt_${req.user.id}_${courseId}`,
      });

      res.json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      });
    }
  } catch (error) {
    console.error('Payment creation error:', error);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

app.post('/api/payment/verify', authenticateToken, async (req, res) => {
  const { orderId, paymentId, signature, courseId, dev } = req.body;

  try {
    if (!dev && process.env.RAZORPAY_KEY_SECRET !== 'dummy-secret') {
      const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(orderId + '|' + paymentId)
        .digest('hex');

      if (generatedSignature !== signature) {
        return res.status(400).json({ error: 'Invalid payment signature' });
      }
    }

    const course = await pool.query('SELECT * FROM courses WHERE id = $1', [courseId]);
    if (course.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const amount = Math.round(course.rows[0].price * 1.18);

    await pool.query(
      `INSERT INTO enrollments (user_id, course_id, payment_id, payment_status, amount_paid)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, courseId, paymentId, 'completed', amount]
    );

    await pool.query('UPDATE courses SET enrolled_count = enrolled_count + 1 WHERE id = $1', [courseId]);

    const user = await pool.query('SELECT name, email FROM users WHERE id = $1', [req.user.id]);

    await sendEmail(
      user.rows[0].email,
      `Enrollment Confirmed: ${course.rows[0].title}`,
      `<h2>🎉 Congratulations ${user.rows[0].name}!</h2><p>You have successfully enrolled in <strong>${course.rows[0].title}</strong>.</p><p><strong>Payment ID:</strong> ${paymentId}</p>`
    );

    res.json({ message: 'Payment verified and enrolled successfully' });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ═══════════════════════════════════════════════════════════════════════════

app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    if (email !== 's7nexttechnologies@gmail.com') {
      return res.status(403).json({ error: 'Unauthorized: Admin access restricted' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1 AND role = $2', [email, 'admin']);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const admin = result.rows[0];
    const validPassword = await bcrypt.compare(password, admin.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const { accessToken, refreshToken } = generateTokens(admin.id);

    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\')',
      [admin.id, refreshToken]
    );

    res.json({
      user: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Admin login failed' });
  }
});

app.get('/api/admin/stats', authenticateToken, isAdmin, async (req, res) => {
  try {
    const totalStudents = await pool.query("SELECT COUNT(DISTINCT user_id) as count FROM enrollments");
    const totalCourses = await pool.query('SELECT COUNT(*) as count FROM courses');
    const totalEnrollments = await pool.query('SELECT COUNT(*) as count FROM enrollments');
    const totalRevenue = await pool.query("SELECT SUM(amount_paid) as total FROM enrollments WHERE payment_status = 'completed'");

    res.json({
      totalStudents: parseInt(totalStudents.rows[0].count),
      totalCourses: parseInt(totalCourses.rows[0].count),
      totalEnrollments: parseInt(totalEnrollments.rows[0].count),
      totalRevenue: parseInt(totalRevenue.rows[0].total || 0),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.get('/api/admin/enrollments', authenticateToken, isAdmin, async (req, res) => {
  try {
    const enrollments = await pool.query(
      `SELECT e.*, u.name as user_name, u.email as user_email, c.title as course_title, c.icon, c.price
       FROM enrollments e
       JOIN users u ON e.user_id = u.id
       JOIN courses c ON e.course_id = c.id
       ORDER BY e.enrolled_at DESC`
    );
    res.json(enrollments.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});

// Admin — Add Course
app.post('/api/admin/courses', authenticateToken, isAdmin, async (req, res) => {
  const { title, tagline, description, price, duration, level, icon, color, modules, topics, syllabus, tag } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO courses (title, tagline, description, price, duration, level, icon, color, modules, topics, syllabus, tag)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [title, tagline, description, price, duration, level, icon, color || '#4F46E5', modules || 40,
       JSON.stringify(topics), JSON.stringify(syllabus || []), tag || 'New']
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Add course error:', error);
    res.status(500).json({ error: 'Failed to add course' });
  }
});

// Admin — Update Course
app.put('/api/admin/courses/:id', authenticateToken, isAdmin, async (req, res) => {
  const { title, tagline, description, price, duration, level, icon, color, modules, topics, syllabus, tag } = req.body;

  try {
    const result = await pool.query(
      `UPDATE courses SET
         title = $1, tagline = $2, description = $3, price = $4, duration = $5,
         level = $6, icon = $7, color = $8, modules = $9, topics = $10,
         syllabus = $11, tag = $12, updated_at = NOW()
       WHERE id = $13 RETURNING *`,
      [title, tagline, description, price, duration, level, icon, color || '#4F46E5', modules || 40,
       JSON.stringify(topics), JSON.stringify(syllabus || []), tag || 'New', req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ error: 'Failed to update course' });
  }
});

// Admin — Delete Course
app.delete('/api/admin/courses/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM courses WHERE id = $1', [req.params.id]);
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

// ─── Admin — Apps / Projects ──────────────────────────────────────────────

// Admin — Add App
app.post('/api/admin/apps', authenticateToken, isAdmin, async (req, res) => {
  const { name, description, icon, color, tech_stack, live_url, github_url, cover_image, status, category } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO apps (name, description, icon, color, tech_stack, live_url, github_url, cover_image, status, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [name, description, icon || '💻', color || '#4F46E5',
       JSON.stringify(Array.isArray(tech_stack) ? tech_stack : []),
       live_url, github_url, cover_image, status || 'Live', category || 'Web App']
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Add app error:', error);
    res.status(500).json({ error: 'Failed to add app' });
  }
});

// Admin — Update App
app.put('/api/admin/apps/:id', authenticateToken, isAdmin, async (req, res) => {
  const { name, description, icon, color, tech_stack, live_url, github_url, cover_image, status, category } = req.body;

  try {
    const result = await pool.query(
      `UPDATE apps SET
         name = $1, description = $2, icon = $3, color = $4, tech_stack = $5,
         live_url = $6, github_url = $7, cover_image = $8, status = $9,
         category = $10, updated_at = NOW()
       WHERE id = $11 RETURNING *`,
      [name, description, icon || '💻', color || '#4F46E5',
       JSON.stringify(Array.isArray(tech_stack) ? tech_stack : []),
       live_url, github_url, cover_image, status || 'Live',
       category || 'Web App', req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'App not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update app error:', error);
    res.status(500).json({ error: 'Failed to update app' });
  }
});

// Admin — Delete App
app.delete('/api/admin/apps/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM apps WHERE id = $1', [req.params.id]);
    res.json({ message: 'App deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete app' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ROOT ROUTE
// ═══════════════════════════════════════════════════════════════════════════

app.get('/', (req, res) => {
  res.json({
    message: 'S7NextTechnologies API Server',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      auth: '/api/auth/*',
      user: '/api/user/*',
      courses: '/api/courses',
      apps: '/api/apps',
      payment: '/api/payment/*',
      admin: '/api/admin/*',
    },
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SERVER START
// ═══════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║   🚀 S7NEXTTECHNOLOGIES BACKEND SERVER                   ║
  ║                                                           ║
  ║   Server: http://localhost:${PORT}                         ║
  ║   Status: ✅ Running                                      ║
  ║                                                           ║
  ║   Admin: s7nexttechnologies@gmail.com                    ║
  ║   Password: Hyderabad@APR_49                             ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
  `);
  await initDatabase();
});

module.exports = app;
