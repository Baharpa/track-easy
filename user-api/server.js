const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const passport = require('passport');
const mongoose = require('mongoose');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;
const mongoUrl = process.env.MONGO_URL || process.env.MONGODB_CONN_STRING;

function normalizeOrigin(origin) {
  return origin ? origin.replace(/\/+$/, '') : origin;
}

function getAllowedOrigins() {
  const configuredOrigins = [
    process.env.CLIENT_URL,
    process.env.CLIENT_URLS
  ].filter(Boolean).flatMap(value => value.split(','));

  const origins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    ...configuredOrigins
  ];

  return [...new Set(origins.map(origin => normalizeOrigin(origin.trim())).filter(Boolean))];
}

const allowedOrigins = getAllowedOrigins();

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    return callback(null, allowedOrigins.includes(normalizeOrigin(origin)));
  }
}));
app.use(express.json());
app.use(passport.initialize());

require('./config/passport')(passport);

if (!mongoUrl) console.warn('MongoDB connection string is missing. Set MONGO_URL or MONGODB_CONN_STRING.');
if (!process.env.JWT_SECRET) console.warn('JWT_SECRET is missing. Login and protected routes will fail.');

mongoose.connect(mongoUrl)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB error:', err));

app.get('/', (req, res) => res.json({ message: 'Track Easy API is running' }));

app.use('/api/user', require('./routes/userRoutes'));
app.use('/api/ingredients', require('./routes/ingredientRoutes'));
app.use('/api/meals', require('./routes/mealRoutes'));
app.use('/api/tracker', require('./routes/trackerRoutes'));
app.use('/api/convert', require('./routes/utilityRoutes'));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
