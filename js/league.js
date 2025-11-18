import { supabase } from '../config.js';
import { calculateLeagueStandings, formatDate } from './utils.js';

let currentTournamentId = null;
let tournaments = [];

const loadLeagueTournaments = async () => {
  try {
    const { data } = await supabase
      .from('tournaments')
      .select('*')
      .eq('type', 'league')
      .neq('status', 'hidden')
      .order('created_at', { ascending: false });

    tournaments = data || [];

    if (tournaments.length === 0) {
      document.querySelector('.tournament-detail h1').textContent += ' - لا توجد بطولات';
      return;
    }

    currentTournamentId = tournaments[0].id;
    loadTournamentInfo();
    loadStandings();
    loadMatches();
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

    const infoContainer = document.getElementById('league-info');
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

const loadStandings = async () => {
  if (!currentTournamentId) return;

  try {
    await calculateLeagueStandings(currentTournamentId);

    const { data: standings } = await supabase
      .from('standings')
      .select('*')
      .eq('tournament_id', currentTournamentId)
      .order('points', { ascending: false })
      .order('goals_for', { ascending: false });

    const tbody = document.getElementById('standings-body');

    if (!standings || standings.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" class="loading">لا توجد نتائج حتى الآن</td></tr>';
      return;
    }

    const goalDiff = (standing) => standing.goals_for - standing.goals_against;

    const sorted = [...standings].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return goalDiff(b) - goalDiff(a);
    });

    tbody.innerHTML = sorted
      .map((standing, index) => `
        <tr ${index === 0 ? 'style="background: rgba(52, 168, 83, 0.1);"' : ''}>
          <td>${index + 1}</td>
          <td>${standing.participant_id}</td>
          <td>${standing.played}</td>
          <td>${standing.won}</td>
          <td>${standing.drawn}</td>
          <td>${standing.lost}</td>
          <td>${standing.goals_for}</td>
          <td>${standing.goals_against}</td>
          <td>${standing.goals_for - standing.goals_against}</td>
          <td style="font-weight: bold; color: var(--primary);">${standing.points}</td>
        </tr>
      `)
      .join('');
  } catch (error) {
    console.error('Error loading standings:', error);
  }
};

const loadMatches = async () => {
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
      .order('match_date', { ascending: false });

    const container = document.getElementById('matches');

    if (!matches || matches.length === 0) {
      container.innerHTML = '<div class="loading">لا توجد مباريات حتى الآن</div>';
      return;
    }

    container.innerHTML = matches
      .map((match) => `
        <div class="match-item">
          <div class="match-teams">
            <div class="team">${match.participant1?.name || 'بانتظار المشارك'}</div>
            <div class="match-date">${formatDate(match.match_date)}</div>
          </div>
          <div class="match-score">
            ${match.participant1_score} <span class="vs">vs</span> ${match.participant2_score}
          </div>
          <div style="flex: 1; text-align: right;">
            <div class="team">${match.participant2?.name || 'بانتظار المشارك'}</div>
            <span class="match-status ${match.status}">
              ${match.status === 'pending' ? '⏳ قيد الانتظار' : match.status === 'completed' ? '✓ منتهية' : '❌ ملغاة'}
            </span>
          </div>
        </div>
      `)
      .join('');
  } catch (error) {
    console.error('Error loading matches:', error);
  }
};

const handleTabChange = (e) => {
  if (!e.target.classList.contains('tab-btn')) return;

  document.querySelectorAll('.tab-btn').forEach((btn) => btn.classList.remove('active'));
  e.target.classList.add('active');

  const tabId = e.target.dataset.tab;
  document.querySelectorAll('.tab-content').forEach((content) => content.classList.remove('active'));
  document.getElementById(`${tabId}-tab`).classList.add('active');

  if (tabId === 'standings') loadStandings();
  if (tabId === 'matches') loadMatches();
  if (tabId === 'info') loadTournamentInfo();
};

const init = () => {
  loadLeagueTournaments();
  document.querySelector('.tournament-tabs').addEventListener('click', handleTabChange);
};

init();
