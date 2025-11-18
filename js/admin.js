import { supabase } from '../config.js';
import { calculateLeagueStandings, showNotification } from './utils.js';

let allParticipants = [];
let allMatches = [];
let allTournaments = [];
let allAdvertisements = [];
let settings = null;

const initAdmin = () => {
  setupTabNavigation();
  loadParticipants();
  loadResults();
  loadTournaments();
  loadAdvertisements();
  loadSettings();
  setupEventListeners();
};

const setupTabNavigation = () => {
  document.querySelectorAll('.admin-tab-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.admin-tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.admin-tab-content').forEach((c) => c.classList.remove('active'));

      e.target.classList.add('active');
      const tabId = e.target.dataset.tab;
      document.getElementById(`${tabId}-tab`).classList.add('active');
    });
  });
};

const loadParticipants = async () => {
  try {
    const { data: participants } = await supabase
      .from('participants')
      .select(`
        *,
        tournaments(name)
      `)
      .order('created_at', { ascending: false });

    allParticipants = participants || [];
    renderParticipants(allParticipants);
    populateTournamentFilter();
  } catch (error) {
    console.error('Error loading participants:', error);
  }
};

const renderParticipants = (participants) => {
  const tbody = document.getElementById('participants-list');

  if (participants.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="loading">لا توجد مشتركين</td></tr>';
    return;
  }

  tbody.innerHTML = participants
    .map((p) => `
      <tr>
        <td>${p.name}</td>
        <td>${p.email}</td>
        <td>${p.phone}</td>
        <td>${p.tournaments?.name || 'N/A'}</td>
        <td>
          <span class="match-status ${p.is_approved ? 'completed' : 'pending'}">
            ${p.is_approved ? '✓ موافق' : '⏳ قيد الانتظار'}
          </span>
        </td>
        <td>
          <div class="action-buttons">
            ${!p.is_approved ? `
              <button class="btn-approve" onclick="approveParticipant('${p.id}')">موافقة</button>
              <button class="btn-reject" onclick="rejectParticipant('${p.id}')">رفض</button>
            ` : ''}
            <button class="btn-delete" onclick="deleteParticipant('${p.id}')">حذف</button>
          </div>
        </td>
      </tr>
    `)
    .join('');
};

const populateTournamentFilter = async () => {
  const select = document.getElementById('filter-tournament');
  const resultSelect = document.getElementById('filter-results-tournament');

  try {
    const { data } = await supabase.from('tournaments').select('id, name');

    allTournaments = data || [];

    select.innerHTML = '<option value="">كل البطولات</option>' +
      allTournaments.map((t) => `<option value="${t.id}">${t.name}</option>`).join('');

    if (resultSelect) {
      resultSelect.innerHTML = '<option value="">كل البطولات</option>' +
        allTournaments.map((t) => `<option value="${t.id}">${t.name}</option>`).join('');
    }
  } catch (error) {
    console.error('Error loading tournaments:', error);
  }
};

const loadResults = async () => {
  try {
    const { data: matches } = await supabase
      .from('matches')
      .select(`
        *,
        participant1:participant1_id(name),
        participant2:participant2_id(name),
        tournaments(name)
      `)
      .order('created_at', { ascending: false });

    allMatches = matches || [];
    renderResults(allMatches);
  } catch (error) {
    console.error('Error loading results:', error);
  }
};

const renderResults = (matches) => {
  const container = document.getElementById('results-list');

  if (matches.length === 0) {
    container.innerHTML = '<div class="loading">لا توجد مباريات</div>';
    return;
  }

  container.innerHTML = `
    <div style="background: white; border-radius: 8px; overflow: hidden;">
      ${matches
      .map(
        (match) => `
        <div class="result-item">
          <div class="result-match-info">
            <strong>${match.participant1?.name || 'بانتظار'} vs ${match.participant2?.name || 'بانتظار'}</strong>
            <div style="font-size: 0.9rem; color: var(--neutral-600);">البطولة: ${match.tournaments?.name || 'N/A'}</div>
          </div>
          <div class="result-score-edit">
            <input type="number" value="${match.participant1_score}" class="p1-score" onchange="updateMatchScore('${match.id}', this.value, document.querySelector('.p2-score[data-match-id=\\\"${match.id}\\\"]').value)">
            <span class="vs">vs</span>
            <input type="number" value="${match.participant2_score}" class="p2-score" data-match-id="${match.id}" onchange="updateMatchScore('${match.id}', document.querySelector('.p1-score[data-match-id=\\\"${match.id}\\\"]').value, this.value)">
            <button class="btn-approve" onclick="completeMatch('${match.id}')" style="margin-right: 1rem;">انتهت</button>
            <button class="btn-delete" onclick="deleteMatch('${match.id}')">حذف</button>
          </div>
        </div>
      `
      )
      .join('')}
    </div>
  `;
};

const loadTournaments = async () => {
  try {
    const { data } = await supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false });

    allTournaments = data || [];
    renderTournaments();
  } catch (error) {
    console.error('Error loading tournaments:', error);
  }
};

const renderTournaments = () => {
  const container = document.querySelector('.tournaments-admin-list') || document.getElementById('tournaments-list');

  if (!allTournaments || allTournaments.length === 0) {
    container.innerHTML = '<div class="loading">لا توجد بطولات</div>';
    return;
  }

  container.innerHTML = allTournaments
    .map(
      (t) => `
      <div class="tournament-admin-card">
        <h3>${t.name}</h3>
        <div class="tournament-admin-info">
          <p><strong>النوع:</strong> ${t.type}</p>
          <p><strong>الحالة:</strong> ${t.status}</p>
          <p><strong>الحد الأقصى:</strong> ${t.max_participants}</p>
        </div>
        <div class="tournament-admin-actions">
          <button class="btn-edit" onclick="editTournament('${t.id}')">تعديل</button>
          <button class="btn-delete" onclick="deleteTournament('${t.id}')">حذف</button>
        </div>
      </div>
    `
    )
    .join('');
};

const loadAdvertisements = async () => {
  try {
    const { data } = await supabase
      .from('advertisements')
      .select('*')
      .order('display_order', { ascending: true });

    allAdvertisements = data || [];
    renderAdvertisements();
  } catch (error) {
    console.error('Error loading advertisements:', error);
  }
};

const renderAdvertisements = () => {
  const container = document.querySelector('.ads-admin-list') || document.getElementById('advertisements-list');

  if (!allAdvertisements || allAdvertisements.length === 0) {
    container.innerHTML = '<div class="loading">لا توجد إعلانات</div>';
    return;
  }

  container.innerHTML = allAdvertisements
    .map(
      (ad) => `
      <div class="ad-admin-card">
        <div class="ad-admin-image">${ad.title}</div>
        <div class="ad-admin-info">
          <h4>${ad.title}</h4>
          <p>الحالة: ${ad.is_active ? '🟢 نشط' : '⛔ معطل'}</p>
          <div class="ad-admin-actions">
            <button class="btn-edit" onclick="editAd('${ad.id}')">تعديل</button>
            <button class="btn-delete" onclick="deleteAd('${ad.id}')">حذف</button>
          </div>
        </div>
      </div>
    `
    )
    .join('');
};

const loadSettings = async () => {
  try {
    let { data } = await supabase
      .from('settings')
      .select('*')
      .limit(1)
      .single();

    if (!data) {
      const { data: newSettings } = await supabase
        .from('settings')
        .insert([{
          site_name: 'FIFA 26 Tournaments',
          social_media: {},
        }])
        .select()
        .single();
      data = newSettings;
    }

    settings = data;

    document.getElementById('site-name').value = data.site_name || '';
    document.getElementById('contact-email').value = data.contact_email || '';
    document.getElementById('contact-phone').value = data.contact_phone || '';
    document.getElementById('contact-address').value = data.contact_address || '';
    document.getElementById('site-description').value = data.description || '';
  } catch (error) {
    console.error('Error loading settings:', error);
  }
};

const setupEventListeners = () => {
  document.getElementById('filter-tournament').addEventListener('change', (e) => {
    const filtered = e.target.value
      ? allParticipants.filter((p) => p.tournament_id === e.target.value)
      : allParticipants;
    renderParticipants(filtered);
  });

  document.getElementById('filter-results-tournament').addEventListener('change', (e) => {
    const filtered = e.target.value
      ? allMatches.filter((m) => m.tournament_id === e.target.value)
      : allMatches;
    renderResults(filtered);
  });

  document.getElementById('add-tournament-form').addEventListener('submit', handleAddTournament);
  document.getElementById('add-ad-form').addEventListener('submit', handleAddAd);
  document.getElementById('settings-form').addEventListener('submit', handleSaveSettings);

  document.querySelectorAll('.close').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.target.closest('.modal').classList.add('hidden');
    });
  });
};

const handleAddTournament = async (e) => {
  e.preventDefault();

  const name = document.getElementById('t-name').value;
  const type = document.getElementById('t-type').value;
  const description = document.getElementById('t-description').value;
  const max_participants = parseInt(document.getElementById('t-max').value);

  try {
    const { error } = await supabase
      .from('tournaments')
      .insert({
        name,
        type,
        description,
        max_participants,
        status: 'active',
      });

    if (error) throw error;

    showNotification('تم إنشاء البطولة بنجاح', 'success');
    document.getElementById('add-tournament-form').reset();
    document.getElementById('add-tournament-modal').classList.add('hidden');
    loadTournaments();
    populateTournamentFilter();
  } catch (error) {
    console.error('Error adding tournament:', error);
    showNotification('خطأ في إنشاء البطولة', 'error');
  }
};

const handleAddAd = async (e) => {
  e.preventDefault();

  const title = document.getElementById('ad-title').value;
  const image_url = document.getElementById('ad-image').value;
  const link = document.getElementById('ad-link').value;

  try {
    const { error } = await supabase
      .from('advertisements')
      .insert({
        title,
        image_url: image_url || null,
        link: link || null,
        is_active: true,
        display_order: allAdvertisements.length,
      });

    if (error) throw error;

    showNotification('تم إضافة الإعلان بنجاح', 'success');
    document.getElementById('add-ad-form').reset();
    document.getElementById('add-ad-modal').classList.add('hidden');
    loadAdvertisements();
  } catch (error) {
    console.error('Error adding ad:', error);
    showNotification('خطأ في إضافة الإعلان', 'error');
  }
};

const handleSaveSettings = async (e) => {
  e.preventDefault();

  const site_name = document.getElementById('site-name').value;
  const contact_email = document.getElementById('contact-email').value;
  const contact_phone = document.getElementById('contact-phone').value;
  const contact_address = document.getElementById('contact-address').value;
  const description = document.getElementById('site-description').value;

  try {
    const { error } = await supabase
      .from('settings')
      .update({
        site_name,
        contact_email,
        contact_phone,
        contact_address,
        description,
      })
      .eq('id', settings.id);

    if (error) throw error;

    showNotification('تم حفظ الإعدادات بنجاح', 'success');
  } catch (error) {
    console.error('Error saving settings:', error);
    showNotification('خطأ في حفظ الإعدادات', 'error');
  }
};

window.approveParticipant = async (id) => {
  try {
    const { error } = await supabase
      .from('participants')
      .update({ is_approved: true })
      .eq('id', id);

    if (error) throw error;

    showNotification('تم الموافقة على المشارك', 'success');
    loadParticipants();
    await calculateLeagueStandings(allParticipants.find((p) => p.id === id)?.tournament_id);
  } catch (error) {
    console.error('Error approving participant:', error);
    showNotification('خطأ في الموافقة', 'error');
  }
};

window.rejectParticipant = async (id) => {
  try {
    const { error } = await supabase
      .from('participants')
      .delete()
      .eq('id', id);

    if (error) throw error;

    showNotification('تم رفض المشارك', 'success');
    loadParticipants();
  } catch (error) {
    console.error('Error rejecting participant:', error);
    showNotification('خطأ في الرفض', 'error');
  }
};

window.deleteParticipant = async (id) => {
  if (!confirm('هل أنت متأكد من حذف هذا المشارك؟')) return;

  try {
    const { error } = await supabase
      .from('participants')
      .delete()
      .eq('id', id);

    if (error) throw error;

    showNotification('تم حذف المشارك', 'success');
    loadParticipants();
  } catch (error) {
    console.error('Error deleting participant:', error);
    showNotification('خطأ في الحذف', 'error');
  }
};

window.updateMatchScore = () => {
  // This function is called from the inline event handler
};

window.completeMatch = async (matchId) => {
  try {
    const { error } = await supabase
      .from('matches')
      .update({ status: 'completed' })
      .eq('id', matchId);

    if (error) throw error;

    const match = allMatches.find((m) => m.id === matchId);
    if (match) {
      await calculateLeagueStandings(match.tournament_id);
    }

    showNotification('تم تحديث حالة المباراة', 'success');
    loadResults();
  } catch (error) {
    console.error('Error completing match:', error);
    showNotification('خطأ في التحديث', 'error');
  }
};

window.deleteMatch = async (matchId) => {
  if (!confirm('هل أنت متأكد من حذف هذه المباراة؟')) return;

  try {
    const { error } = await supabase
      .from('matches')
      .delete()
      .eq('id', matchId);

    if (error) throw error;

    showNotification('تم حذف المباراة', 'success');
    loadResults();
  } catch (error) {
    console.error('Error deleting match:', error);
    showNotification('خطأ في الحذف', 'error');
  }
};

window.deleteTournament = async (tournamentId) => {
  if (!confirm('هل أنت متأكد من حذف هذه البطولة؟ سيتم حذف جميع البيانات المتعلقة بها')) return;

  try {
    const { error } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', tournamentId);

    if (error) throw error;

    showNotification('تم حذف البطولة', 'success');
    loadTournaments();
  } catch (error) {
    console.error('Error deleting tournament:', error);
    showNotification('خطأ في الحذف', 'error');
  }
};

window.deleteAd = async (adId) => {
  if (!confirm('هل أنت متأكد من حذف هذا الإعلان؟')) return;

  try {
    const { error } = await supabase
      .from('advertisements')
      .delete()
      .eq('id', adId);

    if (error) throw error;

    showNotification('تم حذف الإعلان', 'success');
    loadAdvertisements();
  } catch (error) {
    console.error('Error deleting ad:', error);
    showNotification('خطأ في الحذف', 'error');
  }
};

window.showAddTournament = () => {
  document.getElementById('add-tournament-modal').classList.remove('hidden');
};

window.showAddAd = () => {
  document.getElementById('add-ad-modal').classList.remove('hidden');
};

initAdmin();
