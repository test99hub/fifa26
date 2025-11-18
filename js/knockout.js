import { supabase } from '../config.js';
import { generateKnockoutBracket, formatDate } from './utils.js';

let currentTournamentId = null;
let tournaments = [];

const loadKnockoutTournaments = async () => {
  try {
    const { data } = await supabase
      .from('tournaments')
      .select('*')
      .eq('type', 'knockout')
      .neq('status', 'hidden')
      .order('created_at', { ascending: false });

    tournaments = data || [];

    if (tournaments.length === 0) {
      document.querySelector('.tournament-detail h1').textContent += ' - لا توجد بطولات';
      return;
    }

    currentTournamentId = tournaments[0].id;
    loadTournamentInfo();
    loadBracket();
  } catch (error) {
    console.error('Error loading tournaments:', error);
  }
};

const loadTournamentInfo = async () => {
  if (!currentTournamentId) return;

  try {
    const { data } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', currentTournamentId)
      .single();

    if (!data) return;

    const infoContainer = document.getElementById('knockout-info');
    const { data: participants } = await supabase
      .from('participants')
      .select('*')
      .eq('tournament_id', currentTournamentId)
      .eq('is_approved', true);

    infoContainer.innerHTML = `
      <div class="info-item">
        <div class="info-label">اسم البطولة</div>
        <div class="info-value">${data.name}</div>
      </div>
      <div class="info-item">
        <div class="info-label">الحالة</div>
        <div class="info-value">${data.status === 'active' ? '🟢 نشطة' : data.status === 'paused' ? '⏸️ مؤجلة' : '❌ منتهية'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">تاريخ البدء</div>
        <div class="info-value">${formatDate(data.start_date)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">تاريخ الانتهاء</div>
        <div class="info-value">${formatDate(data.end_date) || 'لم يتحدد بعد'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">عدد المشتركين</div>
        <div class="info-value">${participants?.length || 0} / ${data.max_participants}</div>
      </div>
      <div class="info-item">
        <div class="info-label">الوصف</div>
        <div class="info-value">${data.description || 'بدون وصف'}</div>
      </div>
    `;
  } catch (error) {
    console.error('Error loading tournament info:', error);
  }
};

const loadBracket = async () => {
  if (!currentTournamentId) return;

  try {
    const { data: matches } = await supabase
      .from('matches')
      .select(`
        *,
        participant1:participant1_id(name),
        participant2:participant2_id(name)
      `)
      .eq('tournament_id', currentTournamentId)
      .order('round', { ascending: true });

    const container = document.getElementById('bracket');

    if (!matches || matches.length === 0) {
      const { data: participants } = await supabase
        .from('participants')
        .select('*')
        .eq('tournament_id', currentTournamentId)
        .eq('is_approved', true);

      if (participants && participants.length > 0) {
        container.innerHTML = '<p class="loading">جاري إنشاء قوس البطولة...</p>';
        await generateKnockoutBracket(currentTournamentId);
        setTimeout(loadBracket, 1000);
      } else {
        container.innerHTML = '<div class="loading">انتظر موافقة المشتركين</div>';
      }
      return;
    }

    const rounds = {};
    matches.forEach((match) => {
      const round = match.round;
      if (!rounds[round]) rounds[round] = [];
      rounds[round].push(match);
    });

    const bracketHTML = Object.keys(rounds)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map((roundNum) => `
        <div class="bracket-round">
          <h3>الدور ${roundNum}</h3>
          ${rounds[roundNum]
        .map(
          (match) => `
            <div class="bracket-match">
              <div class="bracket-team ${match.participant1_score > match.participant2_score ? 'winner' : ''}">
                ${match.participant1?.name || 'بانتظار...'} ${match.status === 'completed' ? `(${match.participant1_score})` : ''}
              </div>
              <div class="bracket-team ${match.participant2_score > match.participant1_score ? 'winner' : ''}">
                ${match.participant2?.name || 'بانتظار...'} ${match.status === 'completed' ? `(${match.participant2_score})` : ''}
              </div>
            </div>
          `
        )
        .join('')}
        </div>
      `)
      .join('');

    container.innerHTML = bracketHTML;
  } catch (error) {
    console.error('Error loading bracket:', error);
  }
};

const handleTabChange = (e) => {
  if (!e.target.classList.contains('tab-btn')) return;

  document.querySelectorAll('.tab-btn').forEach((btn) => btn.classList.remove('active'));
  e.target.classList.add('active');

  const tabId = e.target.dataset.tab;
  document.querySelectorAll('.tab-content').forEach((content) => content.classList.remove('active'));
  document.getElementById(`${tabId}-tab`).classList.add('active');

  if (tabId === 'bracket') loadBracket();
  if (tabId === 'info') loadTournamentInfo();
};

const init = () => {
  loadKnockoutTournaments();
  document.querySelector('.tournament-tabs').addEventListener('click', handleTabChange);
};

init();
