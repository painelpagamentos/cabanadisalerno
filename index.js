require('dotenv').config();
const express = require('express');
const PORT = process.env.PORT || 3000;
const path = require('path');
const fs = require('fs');
const app = express();

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

// Blackcat Pay PIX Creation
app.post('/api/pix/create', async (req, res) => {
    const { amount, description } = req.body;
    const API_KEY = process.env.BLACKCAT_API_KEY;

    if (!API_KEY) {
        console.error('BLACKCAT_API_KEY is not set');
        return res.status(500).json({ success: false, message: 'Configuração de pagamento ausente no servidor.' });
    }

    try {
        const response = await fetch('https://api.blackcatpay.com.br/v1/pix', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                amount: amount,
                description: description
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Blackcat API error:', errorData);
            throw new Error('Falha ao gerar cobrança PIX na Blackcat.');
        }

        const data = await response.json();
        res.json({
            success: true,
            qrCodeUrl: data.qrCodeUrl || data.qr_image || '',
            copyPaste: data.copyPaste || data.copiable || data.pix_code || ''
        });
    } catch (error) {
        console.error('PIX creation error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
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

app.post('/api/admin/bloqueios/sync', (req, res) => {
    const { cabanaId, dates } = req.body;
    const data = getData();
    
    // Remover bloqueios antigos manuais (que não vêm de reserva) para esta cabana
    data.bloqueios = data.bloqueios.filter(b => b.cabanaId !== cabanaId || b.reservaId);
    
    // Adicionar novos bloqueios (dia a dia para facilitar exibição do X)
    dates.forEach(date => {
        data.bloqueios.push({
            id: Date.now() + Math.random(),
            cabanaId,
            inicio: date,
            fim: date,
            manual: true
        });
    });
    
    saveData(data);
    res.json({ success: true });
});

// For SPA-like behavior or clean URLs
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});


    // New route for cabanas
    app.get('/cabanas', (req, res) => {
        res.sendFile(path.join(__dirname, 'cabanas.html'));
    });

app.get('/quem-somos', (req, res) => {
    res.sendFile(path.join(__dirname, 'quem-somos.html'));
});

// Removed contato route as per user request

app.get('/sabio', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Fallback for other routes (must be last)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
