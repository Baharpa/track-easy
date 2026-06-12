const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const passport = require('passport');
const mongoose = require('mongoose');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;
const mongoUrl = process.env.MONGO_URL || process.env.MONGODB_CONN_STRING;

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));
app.use(express.json());
app.use(passport.initialize());

require('./config/passport')(passport);

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
