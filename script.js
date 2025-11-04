// --------- INICIALIZAÇÃO DO FIREBASE ---------
const firebaseConfig = {
  apiKey: "AIzaSyDv8Ib0Ymrg0ceZ4rxEkdoq53fk3p9gnG0",
  authDomain: "tccsenai-9222f.firebaseapp.com",
  projectId: "tccsenai-9222f",
  storageBucket: "tccsenai-9222f.firebasestorage.app",
  messagingSenderId: "439842353121",
  appId: "1:439842353121:web:83cb686a60a5a41734aca0",
  measurementId: "G-7M66CJ184X"
};

const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ----------------------------------------------------------------------
// MODO OFFLINE: Habilita a persistência do Firestore (NOVO CÓDIGO)
// ----------------------------------------------------------------------
db.enablePersistence()
    .then(() => {
        console.log("Firestore Persistência Offline habilitada com sucesso.");
        // O restante do seu código de inicialização e autenticação pode ser executado
        // O observador de autenticação (auth.onAuthStateChanged) é a próxima etapa natural
    })
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            // Se múltiplos tabs/navegadores estão acessando o Firestore
            console.warn("Persistência desabilitada: Múltiplas abas abertas.");
        } else if (err.code == 'unimplemented') {
            // Se o navegador não suporta (raro)
            console.warn("Persistência desabilitada: O navegador não a suporta totalmente.");
        } else {
            console.error("Erro ao habilitar Persistência Offline:", err);
        }
    });
// ----------------------------------------------------------------------


// --------- CONFIGURAÇÃO EMAILJS (LEMBRETES DE CONFIRMAÇÃO) ---------

// SUAS CHAVES FORNECIDAS
const EMAILJS_PUBLIC_KEY = '-c_NFKDw9ZwMHBQm6';
// ... (o restante do seu código EmailJS) ...
const EMAILJS_SERVICE_ID = 'service_j1hucji';
const EMAILJS_TEMPLATE_LEMBRETE_ID = 'template_63xuzeb';

// Inicializa o EmailJS
if (window.emailjs) {
   emailjs.init('-c_NFKDw9ZwMHBQm6');
} else {
    // console.error("EmailJS SDK não carregado. Verifique o script no index.html.");
}

// Função auxiliar para enviar e-mail de confirmação/lembrete
const sendConfirmationEmail = (emailDestino, tipo, titulo, data, hora_ou_prioridade) => {
    if (!window.emailjs || !emailDestino) {
        // console.error("EmailJS não pode enviar e-mail. SDK ausente ou email de destino não encontrado.");
        return;
    }
    
    // O templateParams deve corresponder exatamente aos campos {{...}} do seu Template ID: template_63xuzeb
    const templateParams = {
        email_destino: emailDestino,
        tipo: tipo,
        titulo: titulo,
        data: data,
        hora_ou_prioridade: hora_ou_prioridade
    };

    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_LEMBRETE_ID, templateParams)
        .then(() => {
            console.log(`Lembrete de ${tipo} enviado com sucesso via EmailJS.`);
        }, (error) => {
            console.error(`Erro ao enviar lembrete de ${tipo}:`, error);
        });
};
// ------------------------------------------------------------------

// --------- FERIDOS NACIONAIS (exemplo 2025 BR) ---------
const FERIADOS_BR = [
// ... (seus dados de feriados) ...
  { data: '2025-01-01', nome: 'Confraternização Universal' },
  { data: '2025-02-04', nome: 'Carnaval' },
  { data: '2025-04-18', nome: 'Sexta-feira Santa' },
  { data: '2025-04-21', nome: 'Tiradentes' },
  { data: '2025-05-01', nome: 'Dia do Trabalhador' },
  { data: '2025-06-19', nome: 'Corpus Christi' },
  { data: '2025-09-07', nome: 'Independência do Brasil' },
  { data: '2025-10-12', nome: 'Nossa Senhora Aparecida' },
  { data: '2025-11-02', nome: 'Finados' },
  { data: '2025-11-15', nome: 'Proclamação da República' },
  { data: '2025-12-25', nome: 'Natal' }
];

// --------- UTILIDADES ---------
// ... (suas funções utilitárias) ...
function formatDateBR(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}
function formatTime(timeStr) {
  return timeStr ? timeStr.slice(0, 5) : '';
}
function todayISO() {
  const d = new Date();
  d.setHours(d.getHours() - 3);
  return d.toISOString().slice(0, 10);
}
function generateId() {
    return Math.random().toString(36).substring(2, 15);
}
function inThisWeek(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const start = new Date(now.setDate(now.getDate() - now.getDay()));
  const end = new Date(now.setDate(now.getDate() - now.getDay() + 6));
  start.setHours(0,0,0,0);
  end.setHours(23,59,59,999);
  return d >= start && d <= end;
}
function inThisMonth(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}
function compareDates(a, b) {
  return new Date(a) - new Date(b);
}
function getFeriado(dateStr) {
  return FERIADOS_BR.find(f => f.data === dateStr);
} 

// --------- AUTENTICAÇÃO E DADOS ---------
let currentUser = null;
let userData = { events: [], tasks: [], settings: { theme: 'default' }, plano: 'free', referralCount: 0, inviteCode: '' };

auth.onAuthStateChanged(async (user) => {
  if (user) {
      currentUser = {
          uid: user.uid,
          email: user.email,
          nome: user.displayName || 'Usuário'
      };
      if (user.email === 'admin@agenda.com') {
          currentUser.nome = 'Administrador';
      }
      await loadUserData();
      showMain();
  } else {
      currentUser = null;
      userData = { events: [], tasks: [], settings: { theme: 'default' }, plano: 'free', referralCount: 0, inviteCode: '' };
      showAuthPage();
  }
});

async function loadUserData() {
  if (!currentUser) return;
  try {
      // O get() usará o cache local se o Firestore estiver offline
      const docRef = db.collection('userData').doc(currentUser.uid);
      const doc = await docRef.get(); 
      if (doc.exists) {
          userData = doc.data();
          currentUser.nome = userData.nome || currentUser.nome;
          if (!userData.events) userData.events = [];
          if (!userData.tasks) userData.tasks = [];
          if (!userData.settings) userData.settings = { theme: 'default' };
          if (!userData.settings.theme) userData.settings.theme = 'default';
          if (!userData.plano) userData.plano = 'free';
          // MODIFICAÇÃO CONVITE: Garante que os campos existam
          if (!userData.inviteCode) userData.inviteCode = currentUser.uid.substring(0, 8) + Math.floor(100 + Math.random() * 900).toString();
          if (userData.referralCount === undefined) userData.referralCount = 0;

      } else {
          // MODIFICAÇÃO CONVITE: Adiciona campos no 'initialData'
          const initialData = {
              nome: currentUser.nome,
              email: currentUser.email,
              events: [], tasks: [], 
              settings: { darkMode: false, emailNotif: false, theme: 'default' },
              plano: 'free',
              inviteCode: currentUser.uid.substring(0, 8) + Math.floor(100 + Math.random() * 900).toString(),
              referralCount: 0
          };
          // O set() será enfileirado e sincronizado quando a internet retornar
          await docRef.set(initialData); 
          userData = initialData;
      }
      applyTheme(userData.settings.theme);
  } catch (error) {
      // Se houver erro de conexão, a tela pode ficar travada na autenticação.
      // O Firestore Offline resolve isso.
      console.error("Erro ao carregar dados do usuário:", error);
      alert("Não foi possível carregar seus dados. Tente recarregar a página.");
  }
}

async function saveUserData() {
  if (!currentUser) return;
  try {
      // O set() será enfileirado e sincronizado quando a internet retornar
      const docRef = db.collection('userData').doc(currentUser.uid);
      await docRef.set(userData, { merge: true });
  } catch (error) {
      console.error("Erro ao salvar dados do usuário:", error);
      // Mensagem útil em modo offline
      alert("Ocorreu um erro ao salvar suas alterações. Elas serão sincronizadas assim que a conexão retornar."); 
  }
}

async function logoutUser() {
// ... (sua função de logout) ...
  try {
      await auth.signOut();
      window.location.reload();
  } catch (error) {
      console.error("Erro ao fazer logout:", error);
  }
}

// --------- ESTADO E UI ---------
let currentPage = 'inicio';
let calendarMonth = (new Date()).getMonth();
let calendarYear = (new Date()).getFullYear();

// Elementos da Página Premium
const premiumStatusContainer = document.getElementById('premiumStatusContainer');
const premiumCardsContainer = document.getElementById('premiumCardsContainer');


function showPage(page) {
// ... (sua função showPage) ...
  currentPage = page;
  document.querySelectorAll('#mainPage section').forEach(sec => sec.classList.add('hidden'));
  if (document.getElementById(page + 'Page')) {
      document.getElementById(page + 'Page').classList.remove('hidden');
  }
  document.querySelectorAll('.header nav button').forEach(btn => btn.classList.remove('active'));
  const navBtn = document.getElementById('nav-' + page);
  if (navBtn) navBtn.classList.add('active');

  if (page === 'calendario') renderCalendar();
  if (page === 'tarefas') renderAllTasks();
  if (page === 'admin') renderAdminUsers();
  if (page === 'premium') updatePremiumPage(); // Chama a função para garantir o estado correto da página Premium
  // MODIFICAÇÃO CONQUISTAS: Chama a renderização
  if (page === 'conquistas') renderAchievements();
}


// ... (Restante do seu código: Login, Registro, Navegação, Eventos, Tarefas, Calendário, Admin, Configurações) ...


// --------- LOGIN, REGISTRO, RESET ---------
document.getElementById('toRegister').onclick = () => {
  document.getElementById('loginBox').classList.add('hidden');
  document.getElementById('registerBox').classList.remove('hidden');
  document.getElementById('resetBox').classList.add('hidden');
  clearMsgs();
};
document.getElementById('toLogin1').onclick = document.getElementById('toLogin2').onclick = () => {
  document.getElementById('loginBox').classList.remove('hidden');
  document.getElementById('registerBox').classList.add('hidden');
  document.getElementById('resetBox').classList.add('hidden');
  clearMsgs();
};
document.getElementById('toReset').onclick = () => {
  document.getElementById('loginBox').classList.add('hidden');
  document.getElementById('registerBox').classList.add('hidden');
  document.getElementById('resetBox').classList.remove('hidden');
  clearMsgs();
};
function clearMsgs() {
  document.getElementById('loginMsg').textContent = '';
  document.getElementById('registerMsg').textContent = '';
  document.getElementById('resetMsg').textContent = '';
  document.getElementById('resetMsg').classList.remove('success');
}

document.getElementById('loginForm').onsubmit = async function(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const senha = document.getElementById('loginSenha').value;
  const msgEl = document.getElementById('loginMsg');
  msgEl.textContent = 'Entrando...';

  try {
      await auth.signInWithEmailAndPassword(email, senha);
  } catch (error) {
      msgEl.textContent = 'E-mail ou senha inválidos!';
      console.error("Erro de login:", error.message);
  }
};

// MODIFICAÇÃO CONVITE: Função de registro atualizada
document.getElementById('registerForm').onsubmit = async function(e) {
  e.preventDefault();
  const nome = document.getElementById('regNome').value.trim();
  const email = document.getElementById('regEmail').value.trim().toLowerCase();
  const senha = document.getElementById('regSenha').value;
  const msgEl = document.getElementById('registerMsg');
  msgEl.textContent = 'Registrando...';

  if (!nome || !email || senha.length < 6) {
      msgEl.textContent = 'Preencha todos os campos. A senha deve ter no mínimo 6 caracteres.';
      return;
  }

  // MODIFICAÇÃO CONVITE: Captura o código 'ref' da URL
  const urlParams = new URLSearchParams(window.location.search);
  const refCode = urlParams.get('ref');

  try {
      const userCredential = await auth.createUserWithEmailAndPassword(email, senha);
      await userCredential.user.updateProfile({ displayName: nome });

      // Salva info do cartão fake para teste (últimos 4 dígitos aleatórios)
      const fakeCard = '**** **** **** ' + (Math.floor(1000 + Math.random() * 9000));
      
      // MODIFICAÇÃO CONVITE: Adiciona campos de convite ao novo usuário
      const initialUserData = {
          nome: nome,
          email: email,
          events: [],
          tasks: [],
          settings: { darkMode: false, emailNotif: false, theme: 'default' },
          plano: 'free',
          cartao: fakeCard,
          inviteCode: userCredential.user.uid.substring(0, 8) + Math.floor(100 + Math.random() * 900).toString(),
          referralCount: 0
      };
      await db.collection('userData').doc(userCredential.user.uid).set(initialUserData);
      
      // MODIFICAÇÃO CONVITE: Processa o bônus de referência
      if (refCode) {
          try {
              // Encontra o usuário que convidou
              const query = db.collection('userData').where('inviteCode', '==', refCode).limit(1);
              const snapshot = await query.get();
              if (!snapshot.empty) {
                  const inviterDoc = snapshot.docs[0];
                  const inviterId = inviterDoc.id;
                  const inviterData = inviterDoc.data();
                  
                  // Incrementa a contagem dele
                  const newCount = (inviterData.referralCount || 0) + 1;
                  await db.collection('userData').doc(inviterId).update({
                      referralCount: newCount
                  });
                  console.log(`Referência computada: Usuário ${inviterId} agora tem ${newCount} convidados.`);
              } else {
                  console.warn(`Código de convite ${refCode} não encontrado.`);
              }
          } catch (referralError) {
              console.error("Erro ao processar convite:", referralError);
              // Não bloqueia o registro se o bônus de convite falhar
          }
      }

  } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
          msgEl.textContent = 'Este e-mail já está cadastrado!';
      } else {
          msgEl.textContent = 'Ocorreu um erro ao registrar.';
      }
      console.error("Erro de registro:", error.message);
  }
};

document.getElementById('resetForm').onsubmit = async function(e) {
  e.preventDefault();
  const email = document.getElementById('resetEmail').value.trim().toLowerCase();
  const msgEl = document.getElementById('resetMsg');
  msgEl.textContent = 'Enviando...';
  try {
      await auth.sendPasswordResetEmail(email);
      msgEl.textContent = 'Um e-mail de redefinição de senha foi enviado para você.';
      msgEl.classList.add('success');
      setTimeout(() => { document.getElementById('toLogin2').onclick(); }, 3000);
  } catch (error) {
      msgEl.textContent = 'E-mail não encontrado ou erro ao enviar.';
      msgEl.classList.remove('success');
      console.error("Erro ao resetar senha:", error.message);
  }
};

// --------- PÁGINAS DA APLICAÇÃO ---------
function showAuthPage() {
  document.getElementById('authPage').classList.remove('hidden');
  document.getElementById('header').classList.add('hidden');
  document.getElementById('mainPage').classList.add('hidden');
}

function showMain() {
  document.getElementById('authPage').classList.add('hidden');
  document.getElementById('mainPage').classList.remove('hidden');
  const user = currentUser;

  const nav = document.querySelector('.header nav');
  let adminButton = document.getElementById('nav-admin');
  if (user && user.email === 'admin@agenda.com') {
      document.getElementById('userLabel').textContent = user.nome + ' (Admin)';
      if (!adminButton) {
          adminButton = document.createElement('button');
          adminButton.id = 'nav-admin';
          adminButton.textContent = 'Admin';
          adminButton.onclick = () => showPage('admin');
          document.getElementById('nav-config').after(adminButton);
      }
  } else {
      document.getElementById('userLabel').textContent = user ? user.nome : '';
      if (adminButton) {
          nav.removeChild(adminButton);
      }
  }

  document.getElementById('header').classList.remove('hidden');
  showPage('inicio');

  renderUpcoming();
  renderTasks();
  renderCalendar();
  renderAllTasks();
  updatePlanStatusUI();
  
  document.getElementById('darkMode').checked = !!userData.settings.darkMode;
  document.getElementById('emailNotif').checked = !!userData.settings.emailNotif;
  applyDarkMode(!!userData.settings.darkMode);
  
  document.querySelectorAll('.premium-only').forEach(el => {
    if (userData.plano === 'premium') {
        el.classList.remove('hidden');
    } else {
        el.classList.add('hidden');
    }
  });

  // MODIFICAÇÃO CONVITE: Preenche o link de convite e estatísticas
  if (userData.inviteCode) {
      const inviteLink = `${window.location.origin}${window.location.pathname}?ref=${userData.inviteCode}`;
      document.getElementById('inviteLinkDisplay').value = inviteLink;
  }
  document.getElementById('referralCount').textContent = userData.referralCount || 0;
}

// --------- NAVEGAÇÃO PRINCIPAL ---------
document.getElementById('nav-inicio').onclick = () => showPage('inicio');
document.getElementById('nav-calendario').onclick = () => showPage('calendario');
document.getElementById('nav-tarefas').onclick = () => showPage('tarefas');
// MODIFICAÇÃO CONQUISTAS: Adiciona listener
document.getElementById('nav-conquistas').onclick = () => showPage('conquistas');
document.getElementById('nav-premium').onclick = () => showPage('premium');
document.getElementById('nav-sobre').onclick = () => showPage('sobre');
document.getElementById('nav-config').onclick = () => showPage('config');
document.getElementById('logoutBtn').onclick = logoutUser;

// MODIFICAÇÃO CONVITE: Listener para botão de copiar
document.getElementById('copyInviteLinkBtn').onclick = function() {
    const linkInput = document.getElementById('inviteLinkDisplay');
    linkInput.select();
    linkInput.setSelectionRange(0, 99999); // Para mobile
    try {
        // Usa a API de Clipboard (mais moderna e segura)
        navigator.clipboard.writeText(linkInput.value);
        this.textContent = 'Copiado!';
        setTimeout(() => { this.textContent = 'Copiar'; }, 2000);
    } catch (err) {
        console.error('Falha ao copiar o texto: ', err);
        // Fallback para navegadores antigos (document.execCommand)
        try {
            document.execCommand('copy');
            this.textContent = 'Copiado!';
            setTimeout(() => { this.textContent = 'Copiar'; }, 2000);
        } catch (execErr) {
            console.error('Falha no fallback de cópia: ', execErr);
            alert('Não foi possível copiar o link automaticamente. Selecione e copie manualmente.');
        }
    }
};

// MODIFICAÇÃO EXCLUIR CONTA: Listener para botão de excluir
document.getElementById('deleteAccountBtn').onclick = async function() {
    if (!currentUser) return;

    // 1ª Confirmação (Prompt de E-mail)
    const emailConfirmation = prompt(`ATENÇÃO: Esta ação é irreversível e excluirá TODOS os seus dados (eventos, tarefas, etc).\n\nPara confirmar, digite seu e-mail (${currentUser.email}):`);

    if (emailConfirmation === null) {
        alert('Exclusão cancelada.');
        return;
    }
    
    if (emailConfirmation.toLowerCase().trim() !== currentUser.email.toLowerCase().trim()) {
        alert('E-mail incorreto. A exclusão foi cancelada.');
        return;
    }

    // 2ª Confirmação (Confirm simples)
    if (!confirm('Esta é sua ÚLTIMA CHANCE. Tem certeza que deseja excluir sua conta?')) {
        alert('Exclusão cancelada.');
        return;
    }

    this.textContent = 'Excluindo...';
    this.disabled = true;

    try {
        // 1. Deletar dados do Firestore
        await db.collection('userData').doc(currentUser.uid).delete();
        
        // 2. Deletar usuário do Auth
        const user = auth.currentUser;
        await user.delete();
        
        // 3. onAuthStateChanged fará o resto (redirecionar para login)
        alert('Conta excluída com sucesso.');
        window.location.reload(); // Garante o logout completo

    } catch (error) {
        console.error('Erro ao excluir conta:', error);
        // Erro comum: requer autenticação recente
        if (error.code === 'auth/requires-recent-login') {
            alert('Por segurança, você precisa fazer login novamente antes de excluir sua conta. Faça logout e login, e tente novamente.');
            // Força o logout para que ele possa relogar
            await auth.signOut();
            window.location.reload();
        } else {
            alert('Ocorreu um erro ao excluir sua conta. Tente novamente.');
            this.textContent = 'Excluir Minha Conta';
            this.disabled = false;
        }
    }
};


// --------- EVENTOS ---------
function renderUpcoming() {
  const today = todayISO();
  const events = (userData.events || [])
      .filter(ev => ev.date >= today)
      .sort((a, b) => compareDates(a.date, b.date) || a.time.localeCompare(b.time))
      .slice(0, 4);
  const ul = document.getElementById('upcomingEvents');
  ul.innerHTML = '';
  if (events.length === 0) {
      ul.innerHTML = `<li style="color:var(--text-light);">Nenhum evento agendado.</li>`;
      return;
  }
  events.forEach((ev) => {
      const li = document.createElement('li');
      li.innerHTML = `
          <div>
              <span class="event-title">${ev.title}</span>
              <div class="event-time">${formatDateBR(ev.date)} - ${formatTime(ev.time)}</div>
              ${ev.desc ? `<div class="event-desc">${ev.desc}</div>` : ''}
          </div>
          <button class="delete-btn" title="Excluir" onclick="deleteEvent('${ev.id}')">&times;</button>
      `;
      ul.appendChild(li);
  });
}

window.deleteEvent = async function(eventId) {
  userData.events = userData.events.filter(ev => ev.id !== eventId);
  await saveUserData();
  renderUpcoming();
  renderCalendar();
};

document.getElementById('addEventForm').onsubmit = async function(e) {
  e.preventDefault();
  
  if (userData.plano === 'free' && userData.events.length >= 5) {
      alert('Você atingiu o limite de 5 eventos do plano gratuito. Assine o Premium para adicionar eventos ilimitados!');
      showPage('premium');
      return;
  }
  
  const title = document.getElementById('eventTitle').value.trim();
  const date = document.getElementById('eventDate').value;
  const time = document.getElementById('eventTime').value;
  const desc = document.getElementById('eventDesc').value.trim();
  if (!title || !date || !time) return;
  
  const newEvent = { id: generateId(), title, date, time, desc };
  userData.events.push(newEvent);
  await saveUserData();

  // NOVO: Envio do Lembrete de Confirmação do Evento
  if (currentUser && currentUser.email && userData.settings.emailNotif) { 
      // Este envio de e-mail FALHA no modo offline, mas a ação principal é salva localmente
      sendConfirmationEmail(
          currentUser.email,
          "EVENTO",
          title,
          formatDateBR(date), // Data formatada
          formatTime(time) // Hora formatada
      );
  }
  
  this.reset();
  renderUpcoming();
  renderCalendar();
};

// --------- TAREFAS ---------
function renderTasks(filter = 'all', ulId = 'upcomingTasks') {
  let tasks = (userData.tasks || []).filter(t => !t.done);
  const today = todayISO();

  if (filter === 'today') tasks = tasks.filter(t => t.date === today);
  else if (filter === 'week') tasks = tasks.filter(t => inThisWeek(t.date));
  else if (filter === 'month') tasks = tasks.filter(t => inThisMonth(t.date));

  tasks.sort((a, b) => compareDates(a.date, b.date));
  const ul = document.getElementById(ulId);
  ul.innerHTML = '';
  if (tasks.length === 0) {
      ul.innerHTML = `<li style="color:var(--text-light);">Nenhuma tarefa pendente.</li>`;
      return;
  }
  tasks.forEach((t) => {
      const li = document.createElement('li');
      li.innerHTML = `
          <div>
              <button class="done-btn" title="Concluir" onclick="markTaskDone('${t.id}')">✓</button>
              <span class="task-title">${t.title}</span>
          </div>
          <div style="display:flex;align-items:center;">
              <span style="font-size:0.95rem;color:var(--text-light);">${formatDateBR(t.date)}</span>
              <button class="delete-btn" title="Excluir" onclick="deleteTask('${t.id}')">&times;</button>
          </div>
      `;
      ul.appendChild(li);
  });
}

function renderAllTasks() {
  renderTasks('all', 'allTasksList');
}

window.markTaskDone = async function(taskId) {
  const task = userData.tasks.find(t => t.id === taskId);
  if (task) {
      task.done = true;
      await saveUserData();
      renderBasedOnCurrentFilters();
  }
};

window.deleteTask = async function(taskId) {
  userData.tasks = userData.tasks.filter(t => t.id !== taskId);
  await saveUserData();
  renderBasedOnCurrentFilters();
};

function renderBasedOnCurrentFilters() {
  const activeFilter1 = document.querySelector('#tasksFilter button.active')?.dataset.filter || 'all';
  const activeFilter2 = document.querySelector('#tasksFilter2 button.active')?.dataset.filter || 'all';
  renderTasks(activeFilter1, 'upcomingTasks');
  renderTasks(activeFilter2, 'allTasksList');
  renderCalendar();
}

async function handleAddTask(title, date, priority) {
  if (!title || !date) return;
  
  if (userData.plano === 'free' && userData.tasks.length >= 10) {
      alert('Você atingiu o limite de 10 tarefas do plano gratuito. Assine o Premium para adicionar tarefas ilimitadas!');
      showPage('premium');
      return;
  }
  
  const newTask = { id: generateId(), title, date, priority, done: false };
  userData.tasks.push(newTask);
  await saveUserData();
  
  // NOVO: Envio do Lembrete de Confirmação da Tarefa
  if (currentUser && currentUser.email && userData.settings.emailNotif) { 
      // Este envio de e-mail FALHA no modo offline, mas a ação principal é salva localmente
      sendConfirmationEmail(
          currentUser.email,
          "TAREFA",
          title,
          formatDateBR(date), // Data formatada
          `Prioridade: ${priority}` // Prioridade
      );
  }

  renderBasedOnCurrentFilters();
}

document.getElementById('addTaskForm').onsubmit = async function(e) { e.preventDefault(); await handleAddTask(document.getElementById('taskTitle').value.trim(), document.getElementById('taskDate').value, document.getElementById('taskPriority').value); this.reset(); };
document.getElementById('addTaskForm2').onsubmit = async function(e) { e.preventDefault(); await handleAddTask(document.getElementById('taskTitle2').value.trim(), document.getElementById('taskDate2').value, document.getElementById('taskPriority2').value); this.reset(); };
document.querySelectorAll('#tasksFilter button, #tasksFilter2 button').forEach(btn => { btn.onclick = function() { this.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('active')); this.classList.add('active'); const filter = this.dataset.filter; if (this.parentElement.id === 'tasksFilter') { renderTasks(filter, 'upcomingTasks'); } else { renderTasks(filter, 'allTasksList'); } }; });

// --------- CALENDÁRIO COM FERIADOS ---------
function renderCalendar() {
  const today = todayISO();
  const firstDay = new Date(calendarYear, calendarMonth, 1);
  const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());
  const endDate = new Date(lastDay);
  endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  document.getElementById('calendarMonthYear').textContent = `${monthNames[calendarMonth]} ${calendarYear}`;
  const table = document.getElementById('calendarTable');
  table.innerHTML = '';
  const headerRow = document.createElement('tr');
  ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].forEach(day => {
      const th = document.createElement('th');
      th.textContent = day;
      headerRow.appendChild(th);
  });
  table.appendChild(headerRow);
  let current = new Date(startDate);
  while (current <= endDate) {
      const row = document.createElement('tr');
      for (let i = 0; i < 7; i++) {
          const td = document.createElement('td');
          current.setHours(12);
          const dateStr = current.toISOString().slice(0, 10);
          td.textContent = current.getDate();
          if (dateStr === today) td.classList.add('today');
          if(current.getMonth() !== calendarMonth) td.classList.add('other-month');
          const hasEvent = (userData.events || []).some(ev => ev.date === dateStr);
          const hasTask = (userData.tasks || []).some(t => t.date === dateStr && !t.done);
          if (hasEvent) td.classList.add('has-event');
          if (hasTask) td.classList.add('has-task');

          // FERIADO
          const feriado = getFeriado(dateStr);
          if (feriado) {
            td.classList.add('is-holiday');
            td.title = feriado.nome;
          }
          td.onclick = () => showDayDetails(dateStr);
          row.appendChild(td);
          current.setDate(current.getDate() + 1);
      }
      table.appendChild(row);
  }
}
function showDayDetails(dateStr) {
  const events = (userData.events || []).filter(ev => ev.date === dateStr).sort((a, b) => a.time.localeCompare(b.time));
  const tasks = (userData.tasks || []).filter(t => t.date === dateStr && !t.done);
  const feriado = getFeriado(dateStr);
  const detailsContent = document.getElementById('dayDetailsContent');
  detailsContent.innerHTML = '';
  let empty = (events.length === 0 && tasks.length === 0 && !feriado);
  if (empty) {
      detailsContent.innerHTML = '<div class="no-items">Nenhum evento, tarefa ou feriado para este dia.</div>';
  } else {
      if (feriado) {
        const div = document.createElement('div');
        div.className = 'day-holiday-item';
        div.innerHTML = `<div class="day-holiday-title">Feriado: ${feriado.nome}</div>`;
        detailsContent.appendChild(div);
      }
      if (events.length > 0) {
          events.forEach(event => {
              const eventDiv = document.createElement('div');
              eventDiv.className = 'day-event-item';
              eventDiv.innerHTML = `<div class="day-event-title">${event.title}</div><div class="day-event-time">${formatTime(event.time)}</div>${event.desc ? `<div class="day-event-desc">${event.desc}</div>` : ''}`;
              detailsContent.appendChild(eventDiv);
          });
      }
      if (tasks.length > 0) {
          tasks.forEach(task => {
              const taskDiv = document.createElement('div');
              taskDiv.className = 'day-task-item';
              taskDiv.innerHTML = `<div class="day-task-title">${task.title}</div><div class="day-task-priority">Prioridade: ${task.priority}</div>`;
              detailsContent.appendChild(taskDiv);
          });
      }
  }
  document.getElementById('dayDetailsTitle').textContent = `Detalhes do Dia - ${formatDateBR(dateStr)}`;
  document.getElementById('dayDetails').classList.remove('hidden');
}
document.getElementById('closeDayDetails').onclick = function() { document.getElementById('dayDetails').classList.add('hidden'); };
document.getElementById('prevMonthBtn').onclick = function() { calendarMonth--; if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; } renderCalendar(); };
document.getElementById('nextMonthBtn').onclick = function() { calendarMonth++; if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; } renderCalendar(); };

// --------- PÁGINA DE ADMINISTRAÇÃO (modificado) ---------
async function renderAdminUsers() {
  const usersListEl = document.getElementById('adminUsersList');
  usersListEl.innerHTML = '<div>Carregando usuários...</div>';
  
  // MODIFICAÇÃO ADMIN: Mostra o container da lista e esconde o de detalhes
  document.getElementById('adminUserListContainer').classList.remove('hidden');
  document.getElementById('adminUserDetails').classList.add('hidden');

  try {
    const snapshot = await db.collection('userData').get();
    if (snapshot.empty) {
      usersListEl.innerHTML = '<div>Nenhum usuário encontrado.</div>';
      return;
    }
    usersListEl.innerHTML = '';
    snapshot.forEach(doc => {
      const u = doc.data();
      const div = document.createElement('div');
      div.className = 'admin-user-info'; // Reutilizando a classe de info para a lista
      // MODIFICAÇÃO CONVITE: Adiciona contagem de convidados
      div.innerHTML = `
        <strong>Nome:</strong> ${u.nome || ''}<br>
        <strong>E-mail:</strong> ${u.email || ''}<br>
        <strong>Plano:</strong> ${u.plano ? (u.plano === 'premium' ? 'Premium' : 'Grátis') : 'Grátis'}<br>
        <strong>Cartão:</strong> ${u.cartao || '---'}<br>
        <strong>Convidados:</strong> ${u.referralCount || 0}<br> 
        <button class="view-details-btn" onclick="showAdminUserDetail('${doc.id}')" style="margin-top: 5px;">Ver Detalhes</button>
      `;
      usersListEl.appendChild(div);
    });
  } catch (err) {
    usersListEl.innerHTML = '<div>Erro ao carregar usuários.</div>';
  }
}

window.showAdminUserDetail = async function(userId) {
  // MODIFICAÇÃO ADMIN: Esconde a lista e mostra os detalhes
  document.getElementById('adminUserListContainer').classList.add('hidden');
  const detailsEl = document.getElementById('adminUserDetails');
  detailsEl.classList.remove('hidden');
  detailsEl.innerHTML = 'Carregando dados...';
  
  try {
    const doc = await db.collection('userData').doc(userId).get();
    if (!doc.exists) {
      detailsEl.innerHTML = 'Usuário não encontrado.';
      return;
    }
    const u = doc.data();
    // MODIFICAÇÃO CONVITE: Adiciona contagem de convidados aos detalhes
    let html = `
      <div class="admin-user-details-header">
        <h3>Detalhes do Usuário: ${u.nome}</h3>
        <button onclick="renderAdminUsers()">Voltar para Lista</button>
      </div>
      <div class="admin-user-info">
        <p><strong>Nome:</strong> ${u.nome}</p>
        <p><strong>E-mail:</strong> ${u.email}</p>
        <p><strong>Plano:</strong> ${u.plano ? (u.plano === 'premium' ? 'Premium' : 'Grátis') : 'Grátis'}</p>
        <p><strong>Cartão:</strong> ${u.cartao || '---'}</p>
        <p><strong>Convidados:</strong> ${u.referralCount || 0}</p>
      </div>
      <div class="panel">
        <h3>Eventos Agendados</h3>
        <ul class="event-list">
          ${
            (u.events && u.events.length > 0) ?
            u.events.map(ev => `<li>
              <div>
                <span class="event-title">${ev.title}</span>
                <span class="event-time">${formatDateBR(ev.date)} ${formatTime(ev.time)}</span>
                ${ev.desc ? `<div class="event-desc">${ev.desc}</div>` : ''}
              </div>
            </li>`).join('')
            : '<li style="color:var(--text-light);">Nenhum evento.</li>'
          }
        </ul>
      </div>
      <div class="panel">
        <h3>Tarefas Agendadas</h3>
        <ul class="task-list">
          ${
            (u.tasks && u.tasks.length > 0) ?
            u.tasks.map(t => `<li>
              <span class="task-title${t.done ? ' done' : ''}">${t.title}</span>
              <span style="font-size:0.97rem;color:var(--text-light);">${formatDateBR(t.date)}</span>
              <span style="margin-left:8px;">Prioridade: ${t.priority || '-'}</span>
              ${t.done ? '<span style="color:var(--success);margin-left:8px;">Concluída</span>' : ''}
            </li>`).join('')
            : '<li style="color:var(--text-light);">Nenhuma tarefa.</li>'
          }
        </ul>
      </div>
    `;
    detailsEl.innerHTML = html;
  } catch (err) {
    detailsEl.innerHTML = 'Erro ao buscar usuário.';
  }
};

// --------- CONFIGURAÇÕES ---------
function applyDarkMode(enabled) {
// ... (sua função applyDarkMode) ...
  if (enabled) {
      document.documentElement.style.setProperty('--background', '#111827');
      document.documentElement.style.setProperty('--white', '#1f2937');
      document.documentElement.style.setProperty('--gray', '#374151');
      document.documentElement.style.setProperty('--gray2', '#4b5563');
      document.documentElement.style.setProperty('--text', '#f9fafb');
      document.documentElement.style.setProperty('--text-light', '#d1d5db');
  } else {
      document.documentElement.style.setProperty('--background', '#f8fafc');
      document.documentElement.style.setProperty('--white', '#fff');
      document.documentElement.style.setProperty('--gray', '#e5e7eb');
      document.documentElement.style.setProperty('--gray2', '#f3f4f6');
      document.documentElement.style.setProperty('--text', '#111827');
      document.documentElement.style.setProperty('--text-light', '#6b7280');
  }
}
document.getElementById('darkMode').onchange = async function() { userData.settings.darkMode = this.checked; await saveUserData(); applyDarkMode(this.checked); };
document.getElementById('emailNotif').onchange = async function() { userData.settings.emailNotif = this.checked; await saveUserData(); };

// ----------------------------------------------------------------------
// LÓGICA DE CANCELAMENTO PREMIUM 
// ----------------------------------------------------------------------

/**
 * Função para cancelar a assinatura Premium do usuário.
 */
async function cancelPremiumSubscription() {
    const user = auth.currentUser;
    if (!user) {
        alert('Usuário não autenticado.');
        return;
    }

    if (!confirm('Tem certeza que deseja cancelar sua assinatura Premium? Você perderá todos os benefícios imediatamente. Seus limites de evento/tarefa serão reativados.')) {
        return;
    }

    try {
        // 1. Atualiza o Firestore, definindo o plano como 'free'
        const userDocRef = db.collection('userData').doc(user.uid);
        await userDocRef.set({
            plano: 'free',
            cancellationDate: firebase.firestore.FieldValue.serverTimestamp() 
        }, { merge: true });

        // 2. Atualiza o estado local
        userData.plano = 'free';

        // 3. Feedback para o usuário
        alert('Assinatura Premium cancelada com sucesso. Sua conta agora é Grátis.');
        
        // 4. Redireciona para a Home e força o recarregamento dos dados/UI
        showPage('inicio'); 
        showMain(); // Força o recarregamento dos dados e atualização da UI Premium
        
    } catch (error) {
        console.error("Erro ao cancelar a assinatura premium:", error);
        alert('Erro ao cancelar a assinatura. Tente novamente mais tarde.');
    }
}


// --------- PREMIUM: Lógica da página, Pagamento e Funcionalidades ---------
function updatePlanStatusUI() {
    const planStatusEl = document.getElementById('planStatus');
    const badge = planStatusEl.querySelector('.plan-badge');
    if (userData.plano === 'premium') { badge.textContent = 'PREMIUM'; badge.className = 'plan-badge premium'; } 
    else { badge.textContent = 'GRÁTIS'; badge.className = 'plan-badge free'; }
}

/**
 * Função Modificada para Atualizar a interface da página Premium.
 */
function updatePremiumPage() {
    const subscribeBtn = document.getElementById('subscribeBtn');
    const premiumCard = subscribeBtn.closest('.premium-card');

    if (userData.plano === 'premium') { 
        // Lógica para USUÁRIO PREMIUM
        subscribeBtn.textContent = 'Seu Plano Atual'; 
        subscribeBtn.disabled = true; 
        premiumCard.classList.remove('featured');
        
        // Mostrar status e botão de Cancelar (usa as novas constantes)
        if(premiumStatusContainer) {
            premiumStatusContainer.innerHTML = `
                <div class="status-box" style="background: var(--gray2); padding: 20px; border-radius: 8px; text-align: center;">
                    <h3 style="color: var(--primary); margin-top: 0;">Seu Plano Atual: Premium</h3>
                    <p>Você tem acesso a todos os recursos ilimitados, temas de cores e exportação para PDF.</p>
                    <button id="cancelPremiumBtn" class="btn-auth logout-btn" style="margin-top: 15px; background-color: var(--error);">Cancelar Assinatura</button>
                </div>
            `;
            premiumStatusContainer.classList.remove('hidden'); // Mostra o status/botão de cancelar
            if (premiumCardsContainer) premiumCardsContainer.classList.add('hidden');    // Esconde os cards
            
            // Adiciona o event listener *após* o botão ser criado
            const cancelBtn = document.getElementById('cancelPremiumBtn');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', cancelPremiumSubscription);
            }
        }

    } else { 
        // Lógica para USUÁRIO FREE
        subscribeBtn.textContent = 'Assinar Agora'; 
        subscribeBtn.disabled = false; 
        premiumCard.classList.add('featured'); 
        
        // Esconder status e mostrar cards
        if(premiumStatusContainer) premiumStatusContainer.classList.add('hidden');    // Esconde a área de status Premium
        if (premiumCardsContainer) premiumCardsContainer.classList.remove('hidden');  // Mostra os cards de planos
    }
}
document.getElementById('subscribeBtn').onclick = () => { document.getElementById('paymentModalOverlay').classList.remove('hidden'); };
document.getElementById('cancelPaymentBtn').onclick = () => { document.getElementById('paymentModalOverlay').classList.add('hidden'); };
document.getElementById('paymentForm').onsubmit = async function(e) {
    e.preventDefault();
    document.getElementById('paymentFormContainer').classList.add('hidden');
    document.getElementById('successAnimationContainer').classList.remove('hidden');
    setTimeout(async () => {
        userData.plano = 'premium';
        // Salva um número fake de cartão para o admin visualizar
        userData.cartao = document.getElementById('cardNumber').value
            ? '**** **** **** ' + document.getElementById('cardNumber').value.slice(-4)
            : (userData.cartao || '**** **** **** 1234');
        await saveUserData();
        window.location.reload();
    }, 2500);
};

// --------- PREMIUM AVANÇADO: Lógica das novas funcionalidades ---------
function applyTheme(themeName) {
    if (!themeName) themeName = 'default';
    document.documentElement.className = themeName === 'default' ? '' : `theme-${themeName}`; // Ajuste para tema padrão
    document.querySelectorAll('.theme-swatch').forEach(swatch => {
        swatch.classList.toggle('active', swatch.dataset.theme === themeName);
    });
}
document.querySelectorAll('.theme-swatch').forEach(swatch => {
    swatch.onclick = async function() {
        const theme = this.dataset.theme;
        userData.settings.theme = theme;
        applyTheme(theme);
        await saveUserData();
    };
});
document.getElementById('supportForm').onsubmit = function(e) {
    e.preventDefault();
    const message = document.getElementById('supportMessage').value;
    // O envio de suporte FALHA no modo offline, mas a experiência do usuário ainda é responsiva
    alert(`Mensagem de suporte enviada com prioridade!\n\nSua solicitação foi recebida e será analisada pela nossa equipe em até 24 horas.\n\nMensagem: "${message}"`);
    this.reset();
};

// --------- EXPORTAR PDF (usando jsPDF) ---------
document.getElementById('exportPdfBtn').onclick = function() {
// ... (sua função de exportação de PDF) ...
    // Gera PDF com eventos e tarefas
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Agenda Online - Exportação', 14, 18);

    let y = 30;

    doc.setFontSize(14);
    doc.text('Eventos:', 14, y);
    y += 8;

    const eventos = (userData.events || []);
    if(eventos.length === 0) {
        doc.setFont('helvetica', 'normal');
        doc.text('Nenhum evento.', 20, y);
        y += 8;
    } else {
        eventos.forEach(ev => {
            doc.setFont('helvetica', 'bold');
            doc.text(ev.title, 20, y);
            doc.setFont('helvetica', 'normal');
            doc.text(`${formatDateBR(ev.date)} ${formatTime(ev.time)}`, 70, y);
            y += 7;
            if(ev.desc) {
                doc.setFontSize(12);
                doc.text(ev.desc, 25, y);
                y += 7;
                doc.setFontSize(14);
            }
            if(y > 270) { doc.addPage(); y = 20; }
        });
    }

    y += 6;
    doc.setFontSize(14);
    doc.text('Tarefas Pendentes:', 14, y);
    y += 8;

    const tarefas = (userData.tasks || []).filter(t => !t.done);
    if(tarefas.length === 0) {
        doc.setFont('helvetica', 'normal');
        doc.text('Nenhuma tarefa.', 20, y);
        y += 8;
    } else {
        tarefas.forEach(t => {
            doc.setFont('helvetica', 'bold');
            doc.text(t.title, 20, y);
            doc.setFont('helvetica', 'normal');
            doc.text(`${formatDateBR(t.date)}  [Prioridade: ${t.priority}]`, 70, y);
            y += 7;
            if(y > 270) { doc.addPage(); y = 20; }
        });
    }

    y += 8;
    doc.setFontSize(10);
    doc.text('Exportado em: ' + new Date().toLocaleString('pt-BR'), 14, y);

    doc.save('agenda-online.pdf');
};

// --------- INICIALIZAÇÃO ---------
window.onload = function() {
  const today = todayISO();
  document.querySelectorAll('input[type="date"]').forEach(input => {
      input.min = today;
      if (!input.value) input.value = today;
  });
};

// --------- CONQUISTAS (ACHIEVEMENTS) ---------
const ALL_ACHIEVEMENTS = {
    'primeiro_passo': { 
        title: "Primeiro Passo", 
        desc: "Agende seu primeiro evento ou tarefa.", 
        criteria: { type: 'total_items', target: 1 } 
    },
    'organizador_junior': { 
        title: "Organizador Júnior", 
        desc: "Agende 10 eventos ou tarefas no total.", 
        criteria: { type: 'total_items', target: 10 } 
    },
    'produtivo': { // Nome alterado de 'mestre_da_semana' para 'produtivo'
        title: "Produtivo",
        desc: "Conclua 5 tarefas no total.",
        criteria: { type: 'tasks_done_total', target: 5 } // Critério simplificado
    },
    'premium_early_adopter': { 
        title: "Apoiador Premium", 
        desc: "Adquira o plano Premium.", 
        criteria: { type: 'premium', target: true } 
    },
    'evangelista_bronze': { 
        title: "Evangelista Bronze", 
        desc: "Convide 1 amigo para se registrar.", 
        criteria: { type: 'referrals', target: 1 } 
    },
    // MODIFICAÇÃO CONQUISTAS: Adicionada nova conquista
    'evangelista_prata': {
        title: "Evangelista Prata",
        desc: "Convide 5 amigos para se registrar.",
        criteria: { type: 'referrals', target: 5 }
    }
};

/**
 * MODIFICAÇÃO CONQUISTAS: Função adicionada para renderizar a página.
 */
function renderAchievements() {
    const listEl = document.getElementById('achievementsList');
    if (!listEl) return;
    listEl.innerHTML = '';

    // 1. Calcular progresso
    const totalItems = (userData.events || []).length + (userData.tasks || []).length;
    const totalTasksDone = (userData.tasks || []).filter(t => t.done).length;
    const isPremium = (userData.plano === 'premium');
    const referrals = userData.referralCount || 0;

    // 2. Iterar e renderizar
    for (const key in ALL_ACHIEVEMENTS) {
        const ach = ALL_ACHIEVEMENTS[key];
        let currentProgress = 0;
        let target = 1;
        let unlocked = false;

        switch (ach.criteria.type) {
            case 'total_items':
                currentProgress = totalItems;
                target = ach.criteria.target;
                unlocked = (currentProgress >= target);
                break;
            case 'tasks_done_total': // Critério simplificado
                currentProgress = totalTasksDone;
                target = ach.criteria.target;
                unlocked = (currentProgress >= target);
                break;
            case 'premium':
                currentProgress = isPremium ? 1 : 0;
                target = 1;
                unlocked = isPremium;
                break;
            case 'referrals':
                currentProgress = referrals;
                target = ach.criteria.target;
                unlocked = (currentProgress >= target);
                break;
        }

        const card = document.createElement('div');
        card.className = 'achievement-card ' + (unlocked ? 'unlocked' : 'locked');
        
        let progressText = '';
        if (unlocked) {
            progressText = 'Concluído!';
        } else if (ach.criteria.type !== 'premium') {
            progressText = `Progresso: ${currentProgress} / ${target}`;
        } else {
            progressText = 'Requer plano Premium';
        }

        card.innerHTML = `
            <div class="achievement-icon">${unlocked ? '🏆' : '🔒'}</div>
            <div class="achievement-info">
                <div class="achievement-title">${ach.title}</div>
                <div class="achievement-desc">${ach.desc}</div>
                <div class="achievement-progress">${progressText}</div>
            </div>
        `;
        listEl.appendChild(card);
    }

}
// --------- ASSISTENTE VIRTUAL (NOVO CÓDIGO - INTEGRADO COM LÓGICA GEMINI) ---------

document.addEventListener('DOMContentLoaded', () => {
    const assistantButton = document.getElementById('assistantButton');
    const assistantChatbox = document.getElementById('assistantChatbox');
    const closeChatBtn = document.getElementById('closeChatBtn');
    const chatBody = document.getElementById('chatBody');
    const userInput = document.getElementById('userInput');
    const sendMessageBtn = document.getElementById('sendMessageBtn');

    // Estado para controlar se o chat está aberto
    let isChatOpen = false;

    // Função para alternar a visibilidade do chatbox
    function toggleChat() {
        isChatOpen = !isChatOpen;
        // Usa a classe CSS 'visible-chat' para ativar a animação
        assistantChatbox.classList.toggle('visible-chat', isChatOpen);
        
        if (isChatOpen) {
            userInput.focus();
            // Garante que o scroll esteja no fim ao abrir
            chatBody.scrollTop = chatBody.scrollHeight;
        }
    }

    // Eventos de clique para abrir/fechar
    assistantButton.addEventListener('click', toggleChat);
    closeChatBtn.addEventListener('click', toggleChat);

    // Função auxiliar para criar e adicionar a mensagem
    function appendMessage(text, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        // Usa innerHTML para permitir quebras de linha ou formatação simples futura
        messageDiv.innerHTML = text.replace(/\n/g, '<br>'); 
        chatBody.appendChild(messageDiv);
        
        // Mantém a rolagem no final
        chatBody.scrollTop = chatBody.scrollHeight;
        return messageDiv; // Retorna o elemento criado
    }
    
    // Função para mostrar o indicador de digitação
    function showTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'typing-indicator';
        indicator.id = 'typingIndicator';
        indicator.innerHTML = `
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
        `;
        chatBody.appendChild(indicator);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    // Função para remover o indicador de digitação
    function removeTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.remove();
        }
    }

    // Função principal para enviar mensagem
    async function sendMessage() {
        const text = userInput.value.trim();
        if (text === '') return;

        // 1. Adiciona a mensagem do usuário
        appendMessage(text, 'user-message');
        userInput.value = '';
        userInput.disabled = true; // Desabilita o input durante a resposta
        sendMessageBtn.disabled = true;

        // 2. Mostra o indicador de digitação
        showTypingIndicator();

        try {
            // **IMPORTANTE: Esta é uma função SIMULADA**
            // Você deve substituir isso pela chamada real ao seu servidor.
            const response = await getGeminiResponseSimulated(text); 
            
            // 3. Remove o indicador e adiciona a resposta
            removeTypingIndicator();
            appendMessage(response, 'assistant-message');

        } catch (error) {
            removeTypingIndicator();
            appendMessage('Desculpe, houve um erro ao comunicar com a assistente. Tente novamente.', 'assistant-message');
            console.error("Erro na comunicação com a assistente:", error);
        } finally {
            // 4. Reabilita o input
            userInput.disabled = false;
            sendMessageBtn.disabled = false;
            userInput.focus();
        }
    }

    // Adiciona o evento de clique e a tecla Enter
    sendMessageBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !userInput.disabled) {
            sendMessage();
        }
    });

    // ** ------------------------------------------------------------------ **
    // ** SIMULAÇÃO DA CHAMADA À API DO GEMINI **
    // ** ------------------------------------------------------------------ **
    // ESTE CÓDIGO PRECISA SER SUBSTITUÍDO POR UMA CHAMADA AO SEU BACKEND.
    // NUNCA COLOQUE SUA CHAVE AIzaSyCBv9WoGEPr2DQFgHHdQvBuaF8PYaoXcJg DIRETAMENTE AQUI.
    async function getGeminiResponseSimulated(userQuery) {
        // Simula o tempo que levaria para o servidor chamar o Gemini e retornar
        await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000)); 

        const lowerQuery = userQuery.toLowerCase();

        // Lógica de resposta simulada, focada no contexto do site.
        if (lowerQuery.includes('premium') || lowerQuery.includes('pagar')) {
            return "O plano Premium está disponível por apenas R$9,90/mês e desbloqueia recursos como a exportação de tarefas para PDF e temas exclusivos de interface. Você pode assinar na seção 'Premium'.";
        } else if (lowerQuery.includes('tarefas') || lowerQuery.includes('lista')) {
            return "Para criar uma nova tarefa, vá para a aba 'Tarefas', clique no botão de adição (+) e preencha os detalhes. Você pode definir prazo, prioridade e marcá-la como concluída.";
        } else if (lowerQuery.includes('calendário') || lowerQuery.includes('agenda')) {
            return "O Calendário mostra todos os seus compromissos e tarefas com data limite. Feriados nacionais são automaticamente destacados em amarelo para ajudar no seu planejamento!";
        } else if (lowerQuery.includes('conquistas')) {
            return "As Conquistas são um sistema de gamificação para recompensar seu progresso na organização, como '100 tarefas concluídas'. Verifique a aba 'Conquistas' para ver o que você já desbloqueou!";
        } else if (lowerQuery.includes('olá') || lowerQuery.includes('oi') || lowerQuery.includes('tudo bem')) {
            return "Olá! Eu sou a Assistente da Agenda Online. Estou pronta para tirar suas dúvidas sobre o aplicativo. O que você gostaria de saber hoje?";
        } else {
            // Esta seria a resposta que viria do Gemini
            return `Entendi que você perguntou sobre "${userQuery}". Se eu fosse o Gemini, eu usaria meu vasto conhecimento para te dar uma resposta completa! Por enquanto, estou focada em te ajudar com as funcionalidades da **Agenda Online** (Tarefas, Premium, Calendário).`;
        }
    }
});