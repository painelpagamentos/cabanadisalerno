const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the root directory
app.use(express.static(__dirname));

// For SPA-like behavior or clean URLs
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/cabanas', (req, res) => {
    res.sendFile(path.join(__dirname, 'cabanas.html'));
});

app.get('/quem-somos', (req, res) => {
    res.sendFile(path.join(__dirname, 'quem-somos.html'));
});

app.get('/contato', (req, res) => {
    res.sendFile(path.join(__dirname, 'contato.html'));
});

// Fallback for other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
