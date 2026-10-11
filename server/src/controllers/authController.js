import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { env } from '../config/env.js';

const generateToken = (id) => {
  return jwt.sign({ id }, env.JWT_SECRET, { expiresIn: '12h' });
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (user && (await user.comparePassword(password))) {
    res.json({ _id: user.id, email: user.email, role: user.role, token: generateToken(user._id) });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
};

export const getMe = async (req, res) => {
  res.json({ _id: req.user.id, email: req.user.email, role: req.user.role });
};

export const register = async (req, res) => {
  if (env.ALLOW_REGISTER !== 'true') {
    return res.status(403).json({ message: 'Registration is disabled' });
  }
  const { email, password } = req.body;
  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({ message: 'User already exists' });
  }
  const user = await User.create({ email, password });
  if (user) {
    res.status(201).json({ _id: user.id, email: user.email, role: user.role, token: generateToken(user._id) });
  } else {
    res.status(400).json({ message: 'Invalid user data' });
  }
};
