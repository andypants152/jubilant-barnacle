const path = require('path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 1234;
const publicDir = path.join(__dirname, 'public');

app.use(express.static(publicDir));

// Fallback to index.html for any unknown route so the canvas page always loads.
app.use((_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Particle galaxy running at http://localhost:${PORT}`);
});
