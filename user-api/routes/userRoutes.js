const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../config/auth');
const User = require('../models/User');
const Meal = require('../models/Meal');
const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { userName, password } = req.body;
    if (!userName || !password) return res.status(400).json({ message: 'Please enter a username and password.' });

    const existingUser = await User.findOne({ userName });
    if (existingUser) return res.status(400).json({ message: 'Username already exists.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ userName, password: hashedPassword });
    res.status(201).json({ message: 'User registered successfully.', userName: user.userName });
  } catch (err) {
    res.status(500).json({ message: 'Register failed.', error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { userName, password } = req.body;
    const user = await User.findOne({ userName });
    if (!user) return res.status(400).json({ message: 'Invalid username or password.' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ message: 'Invalid username or password.' });

    const payload = { id: user._id, userName: user.userName };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: 'Login failed.', error: err.message });
  }
});

router.get('/profile', auth, async (req, res) => {
  const user = req.user.toObject();
  if (user.sugarGoal === undefined || user.sugarGoal === null) user.sugarGoal = 0;
  res.json(user);
});

router.get('/goals', auth, async (req, res) => {
  res.json({
    calorieGoal: req.user.calorieGoal ?? 0,
    proteinGoal: req.user.proteinGoal ?? 0,
    carbsGoal: req.user.carbsGoal ?? 0,
    fatsGoal: req.user.fatsGoal ?? 0,
    sugarGoal: req.user.sugarGoal ?? 0
  });
});

router.put('/goals', auth, async (req, res) => {
  try {
    const fields = ['calorieGoal', 'proteinGoal', 'carbsGoal', 'fatsGoal', 'sugarGoal'];
    if (fields.some(field => {
      if (req.body[field] === undefined) return false;
      const value = Number(req.body[field]);
      return !Number.isFinite(value) || value < 0;
    })) {
      return res.status(400).json({ message: 'Goals must be 0 or positive numbers.' });
    }

    fields.forEach(field => {
      if (req.body[field] !== undefined) req.user[field] = Number(req.body[field]);
    });
    await req.user.save();
    res.json({ message: 'Goals updated.', goals: req.user });
  } catch (err) {
    res.status(500).json({ message: 'Could not update goals.', error: err.message });
  }
});

router.get('/favourites', auth, async (req, res) => {
  const user = await User.findById(req.user._id).populate('favourites');
  res.json(user.favourites);
});

router.put('/favourites/:id', auth, async (req, res) => {
  const meal = await Meal.findOne({ _id: req.params.id, userId: req.user._id });
  if (!meal) return res.status(404).json({ message: 'Meal not found.' });

  if (!req.user.favourites.some(id => id.toString() === req.params.id)) req.user.favourites.push(req.params.id);
  await req.user.save();
  res.json({ message: 'Added to favourites.' });
});

router.delete('/favourites/:id', auth, async (req, res) => {
  req.user.favourites = req.user.favourites.filter(id => id.toString() !== req.params.id);
  await req.user.save();
  res.json({ message: 'Removed from favourites.' });
});

module.exports = router;
