// Gerenciamento de Dados via API
let cabanas = [];
let bloqueios = [];

let reservaAtual = {
    cabanaId: null,
    checkIn: '',
    checkOut: '',
    checkInTime: '14:00',
    checkOutTime: '14:00',
    diarias: 0,
    adultos: 1,
    criancas: 0,
    nome: '',
    cpf: '',
    telefone: '',
    total: 0,
    sinal: 0,
    restante: 0
};

let stepAtual = 1;
let datePicker = null;

document.addEventListener('DOMContentLoaded', async () => {
    const isReservaPage = !!document.getElementById('userInlinePicker');
    if (!isReservaPage) return;

    await carregarDados();
    configurarEventos();

    const params = new URLSearchParams(window.location.search);
    const preselectCabanaId = params.get('cabana') || sessionStorage.getItem('cabanaSelecionada');
    if (!preselectCabanaId) {
        alert('Selecione uma cabana clicando em "FAZER MINHA RESERVA" na página inicial.');
        window.location.href = '/#cabanas';
        return;
    }
    selectCabin(preselectCabanaId);
    sessionStorage.setItem('cabanaSelecionada', preselectCabanaId);
});

async function carregarDados() {
    const [resC, resB] = await Promise.all([
        fetch('/api/cabanas'),
        fetch('/api/bloqueios')
    ]);
    cabanas = await resC.json();
    bloqueios = await resB.json();
}

function configurarEventos() {
    const btnNext = document.getElementById('btnNext');
    const btnPrev = document.getElementById('btnPrev');
    const btnConfirm = document.getElementById('btnConfirm');
    if (btnNext) btnNext.onclick = () => moveStep(1);
    if (btnPrev) btnPrev.onclick = () => moveStep(-1);
    if (btnConfirm) btnConfirm.onclick = () => confirmarEIrParaPagamento();

    datePicker = flatpickr('#userInlinePicker', {
        inline: true,
        mode: "range",
        minDate: "today",
        dateFormat: "Y-m-d",
        locale: "pt",
        theme: "dark",
        onChange: function(selectedDates) {
            const diariasInfo = document.getElementById('diariasInfo');
            if (selectedDates.length === 2) {
                const start = selectedDates[0];
                const end = selectedDates[1];
                const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
                reservaAtual.diarias = diff;
                reservaAtual.checkIn = start.toISOString().split('T')[0];
                reservaAtual.checkOut = end.toISOString().split('T')[0];
                if (diariasInfo) diariasInfo.innerText = `Total de diárias: ${diff}`;
            } else {
                reservaAtual.diarias = 0;
                reservaAtual.checkIn = '';
                reservaAtual.checkOut = '';
                if (diariasInfo) diariasInfo.innerText = '';
            }
        }
    });

    const timeCheckin = document.getElementById('timeCheckin');
    const timeCheckout = document.getElementById('timeCheckout');
    if (timeCheckin) {
        reservaAtual.checkInTime = timeCheckin.value || reservaAtual.checkInTime;
        reservaAtual.checkOutTime = reservaAtual.checkInTime;
        if (timeCheckout) timeCheckout.value = reservaAtual.checkOutTime;

        timeCheckin.oninput = (e) => {
            const value = e.target.value || '14:00';
            reservaAtual.checkInTime = value;
            reservaAtual.checkOutTime = value;
            if (timeCheckout) timeCheckout.value = value;
        };
    }

    const respCpf = document.getElementById('respCpf');
    const respTel = document.getElementById('respTel');
    if (respCpf) respCpf.oninput = (e) => maskCpf(e.target);
    if (respTel) respTel.oninput = (e) => maskTel(e.target);
}

function selectCabin(id) {
    reservaAtual.cabanaId = id;

    const cabana = cabanas.find(c => c.id === id);
    if (cabana) {
        const display = document.getElementById('selectedCabinNameDisplay');
        if (display) display.innerText = "Você está reservando: " + cabana.nome;
        
        const bloqueiosCabana = bloqueios
            .filter(b => b.cabanaId === id)
            .map(b => ({ from: b.inicio, to: b.fim }));
        
        if (datePicker) {
            datePicker.clear();
            datePicker.set('disable', bloqueiosCabana);
        }
    }
}

function iniciarReservaDireta(id) {
    sessionStorage.setItem('cabanaSelecionada', id);
    window.location.href = `/reserva?cabana=${encodeURIComponent(id)}`;
}

function moveStep(dir) {
    if (dir === 1 && !validateStep(stepAtual)) return;
    stepAtual += dir;
    if (stepAtual < 1) stepAtual = 1;
    if (stepAtual > 4) stepAtual = 4;

    // Atualizar visibilidade dos passos
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    const currentStepEl = document.getElementById(`step${stepAtual}`);
    if (currentStepEl) currentStepEl.classList.add('active');

    if (stepAtual === 3 || stepAtual === 4) updateSummary();

    updateButtonVisibility();
}

function updateButtonVisibility() {
    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');
    const btnConfirm = document.getElementById('btnConfirm');

    if (!btnPrev || !btnNext || !btnConfirm) return;

    // Botão Voltar: Oculto no primeiro passo
    btnPrev.style.visibility = stepAtual === 1 ? 'hidden' : 'visible';
    
    if (stepAtual === 3) {
        btnNext.style.display = 'none';
        btnConfirm.style.display = 'block';
        btnConfirm.innerText = 'Confirmar e Ir para Pagamento';
    } else if (stepAtual === 4) {
        btnNext.style.display = 'none';
        btnConfirm.style.display = 'none';
    } else {
        btnNext.style.display = 'block';
        btnConfirm.style.display = 'none';
        btnNext.innerText = 'Próximo';
    }
}

function validateStep(step) {
    if (step === 1) {
        if (!reservaAtual.cabanaId) return alert('Selecione uma cabana primeiro.');
        if (!reservaAtual.checkIn || !reservaAtual.checkOut) return alert('Selecione o período.');

        const timeCheckin = document.getElementById('timeCheckin');
        const selectedTime = timeCheckin ? timeCheckin.value : reservaAtual.checkInTime;
        if (!selectedTime) return alert('Selecione o horário de check-in.');
        reservaAtual.checkInTime = selectedTime;
        reservaAtual.checkOutTime = selectedTime;
    }
    if (step === 2) {
        const nome = document.getElementById('respNome').value;
        const cpf = document.getElementById('respCpf').value;
        const tel = document.getElementById('respTel').value;
        if (!nome || cpf.length < 14 || tel.length < 14) return alert('Preencha seus dados corretamente.');
        reservaAtual.nome = nome;
        reservaAtual.cpf = cpf;
        reservaAtual.telefone = tel;
    }
    return true;
}

function updateSummary() {
    const cabana = cabanas.find(c => c.id === reservaAtual.cabanaId);
    if (!cabana) return;

    function formatPeriodo(isoDate) {
        if (!isoDate) return '';
        const [year, month, day] = isoDate.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
        const dd = String(date.getDate()).padStart(2, '0');
        return `${dd} de ${meses[date.getMonth()]}`;
    }

    reservaAtual.total = cabana.valor * reservaAtual.diarias;
    reservaAtual.sinal = reservaAtual.total * 0.5;
    reservaAtual.restante = reservaAtual.total - reservaAtual.sinal;

    const periodoFormatado = `${formatPeriodo(reservaAtual.checkIn)} até ${formatPeriodo(reservaAtual.checkOut)}`.trim();

    const summaryHtml = `
        <div class="summary-row"><span>Cabana:</span> <strong>${cabana.nome}</strong></div>
        <div class="summary-row"><span>Diária:</span> <strong>R$ ${cabana.valor.toFixed(2)}</strong></div>
        <div class="summary-row"><span>Período:</span> <strong>${periodoFormatado}</strong></div>
        <div class="summary-row"><span>Horário (check-in e check-out):</span> <strong>${reservaAtual.checkInTime}</strong></div>
        <div class="summary-row"><span>Diárias:</span> <strong>${reservaAtual.diarias}</strong></div>
        <div class="summary-row summary-total"><span>TOTAL:</span> <strong>R$ ${reservaAtual.total.toFixed(2)}</strong></div>
        <div class="summary-row summary-pix"><span>SINAL (50%):</span> <strong>R$ ${reservaAtual.sinal.toFixed(2)}</strong></div>
        <div class="summary-row"><span>Restante (no check-in):</span> <strong>R$ ${reservaAtual.restante.toFixed(2)}</strong></div>
        <div style="margin-top: 12px; font-size: 0.9em; color: #333;">
            Para efetivar a reserva, é pago 50% do valor agora (sinal). O restante é pago no check-in.
        </div>
    `;

    const summaryEl = document.getElementById('summaryContent');
    if (summaryEl) summaryEl.innerHTML = summaryHtml;

    const summaryPaymentEl = document.getElementById('summaryContentPayment');
    if (summaryPaymentEl) summaryPaymentEl.innerHTML = summaryHtml;
}

// Blackcat Pay integration via Backend
async function createPixCharge(amount, description, customerData) {
    console.log('Frontend: Solicitando geração de PIX ao backend...', { amount, description, customerData });
    try {
        const response = await fetch('/api/pix/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: amount,
                description: description,
                customer: customerData
            })
        });
        
        const data = await response.json();
        console.log('Frontend: Resposta do backend recebida:', data);

        if (!data.success) {
            console.error('Frontend: Erro retornado pelo backend:', data.message);
            throw new Error(data.message || 'Falha ao criar cobrança PIX');
        }
        
        return {
            qrCodeUrl: data.qrCodeUrl,
            copyPaste: data.copyPaste
        };
    } catch (err) {
        console.error('Frontend: Falha na requisição de PIX:', err);
        throw err;
    }
}

function prepararTelaPagamento() {
    const pixImg = document.getElementById('pixQrImg');
    if (pixImg) pixImg.src = 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=Reserva_Cabanas_di_Salerno';
    const pixCodeEl = document.getElementById('pixCode');
    if (pixCodeEl) pixCodeEl.innerText = 'Gerando PIX...';
}

async function confirmarEIrParaPagamento() {
    const btnConfirm = document.getElementById('btnConfirm');
    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');
    const originalText = btnConfirm ? btnConfirm.innerText : '';

    if (btnConfirm) {
        btnConfirm.disabled = true;
        btnConfirm.innerText = 'Gerando PIX...';
    }
    if (btnPrev) btnPrev.disabled = true;
    if (btnNext) btnNext.disabled = true;

    updateSummary();
    stepAtual = 4;
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById('step4').classList.add('active');
    updateButtonVisibility();

    prepararTelaPagamento();
    try {
        await gerarPix();
    } finally {
        if (btnConfirm) {
            btnConfirm.disabled = false;
            btnConfirm.innerText = originalText || 'Confirmar e Ir para Pagamento';
        }
        if (btnPrev) btnPrev.disabled = false;
        if (btnNext) btnNext.disabled = false;
    }
}

async function gerarPix() {
    // Calculate total amount to charge (using signal 50% as per UI)
    const amount = reservaAtual.sinal;
    const description = `Sinal Reserva Cabana ${reservaAtual.cabanaId} - ${reservaAtual.checkIn} to ${reservaAtual.checkOut} - ${reservaAtual.checkInTime}`;
    
    console.log('Iniciando gerarPix...', { amount, description });

    const customerData = {
        name: reservaAtual.nome,
        cpf: reservaAtual.cpf,
        phone: reservaAtual.telefone,
        email: 'contato@cabanasdisalerno.com.br' // E-mail padrão já que não pedimos no form
    };

    try {
        const pixData = await createPixCharge(amount, description, customerData);
        console.log('PIX gerado com sucesso!', pixData);

        // Update UI with PIX info
        const pixImg = document.getElementById('pixQrImg');
        if (pixImg && pixData.qrCodeUrl) {
            pixImg.src = pixData.qrCodeUrl;
        }
        const pixCodeEl = document.getElementById('pixCode');
        if (pixCodeEl) {
            pixCodeEl.innerText = pixData.copyPaste;
        }
    } catch (e) {
        console.error('Erro detalhado no gerarPix:', e);
        alert('Erro ao gerar PIX: ' + e.message);
        throw e;
    }
}

function maskCpf(i) {
    let v = i.value.replace(/\D/g, '');
    if (v.length > 11) v = v.substring(0, 11);
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    i.value = v;
}

function maskTel(i) {
    let v = i.value.replace(/\D/g, '');
    if (v.length > 11) v = v.substring(0, 11);
    v = v.replace(/^(\d{2})(\d)/g, '($1) $2');
    v = v.replace(/(\d)(\d{4})$/, '$1-$2');
    i.value = v;
}

function copyPix() {
    const code = document.getElementById('pixCode').innerText;
    navigator.clipboard.writeText(code).then(() => alert('Código Pix copiado!'));
}

window.copyPix = copyPix;
window.iniciarReservaDireta = iniciarReservaDireta;
window.openModalReserva = () => window.location.href = '/#cabanas';
