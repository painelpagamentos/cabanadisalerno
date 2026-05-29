const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

const DATA_FILE = path.join(__dirname, 'data.json');

// Helper to read/write data
const getData = () => JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
const saveData = (data) => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

// API Endpoints
app.get('/api/cabanas', (req, res) => {
    const data = getData();
    res.json(data.cabanas);
});

app.get('/api/bloqueios', (req, res) => {
    const data = getData();
    res.json(data.bloqueios);
});

app.post('/api/reservas', (req, res) => {
    const data = getData();
    const novaReserva = { ...req.body, id: Date.now(), status: 'pendente' };
    data.reservas.push(novaReserva);
    
    // Auto-bloqueio de datas
    data.bloqueios.push({
        id: Date.now() + 1,
        cabanaId: novaReserva.cabanaId,
        inicio: novaReserva.checkIn,
        fim: novaReserva.checkOut,
        reservaId: novaReserva.id
    });
    
    saveData(data);
    res.json({ success: true, reserva: novaReserva });
});

// Admin API
app.post('/api/admin/login', (req, res) => {
    const { user, pass } = req.body;
    const data = getData();
    if (user === data.config.adminUser && pass === data.config.adminPass) {
        res.json({ success: true, token: 'fake-admin-token' });
    } else {
        res.status(401).json({ success: false, message: 'Credenciais inválidas' });
    }
});

app.get('/api/admin/reservas', (req, res) => {
    const data = getData();
    res.json(data.reservas);
});

app.post('/api/admin/cabanas/update', (req, res) => {
    const { id, valor } = req.body;
    const data = getData();
    const index = data.cabanas.findIndex(c => c.id === id);
    if (index !== -1) {
        data.cabanas[index].valor = parseFloat(valor);
        saveData(data);
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false });
    }
});

app.post('/api/admin/bloqueios/add', (req, res) => {
    const data = getData();
    data.bloqueios.push({ ...req.body, id: Date.now() });
    saveData(data);
    res.json({ success: true });
});

app.post('/api/admin/bloqueios/delete', (req, res) => {
    const { id } = req.body;
    const data = getData();
    data.bloqueios = data.bloqueios.filter(b => b.id !== id);
    saveData(data);
    res.json({ success: true });
});

// For SPA-like behavior or clean URLs
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
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
