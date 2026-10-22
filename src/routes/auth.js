const router = require('express').Router();
const jwt = require('jsonwebtoken');
// Demo auth: swap for your MERN store's User model.
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
    return res.json({ token: jwt.sign({ sub: username }, process.env.JWT_SECRET, { expiresIn: '2h' }) });
  }
  res.status(401).json({ error: 'Invalid credentials' });
});
module.exports = router;
