import { supabase } from '../config.js';
import { showNotification, getTournamentTypeLabel, getTournamentTypeEmoji } from './utils.js';

let currentAdsIndex = 0;
let ads = [];
let tournaments = [];

const initAdsBanner = async () => {
  try {
    const { data } = await supabase
      .from('advertisements')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    ads = data || [];

    if (ads.length === 0) {
      document.getElementById('ads-banner').style.display = 'none';
      return;
    }

    updateAdsBanner();

    document.querySelector('.ads-next').addEventListener('click', () => {
      currentAdsIndex = (currentAdsIndex + 1) % ads.length;
      updateAdsBanner();
    });

    document.querySelector('.ads-prev').addEventListener('click', () => {
      currentAdsIndex = (currentAdsIndex - 1 + ads.length) % ads.length;
      updateAdsBanner();
    });

    if (ads.length > 1) {
      setInterval(() => {
        currentAdsIndex = (currentAdsIndex + 1) % ads.length;
        updateAdsBanner();
      }, 5000);
    }
  } catch (error) {
    console.error('Error loading ads:', error);
  }
};

const updateAdsBanner = () => {
  const ad = ads[currentAdsIndex];
  const adSlide = document.getElementById('ads-slide');

  if (ad.image_url) {
    adSlide.innerHTML = `
      <a href="${ad.link || '#'}" target="_blank" rel="noopener noreferrer"
         style="background-image: url('${ad.image_url}'); width: 100%; height: 100%;"
         class="ad-item"></a>
    `;
  } else {
    adSlide.innerHTML = `
      <a href="${ad.link || '#'}" target="_blank" rel="noopener noreferrer" class="ad-item">
        ${ad.title}
      </a>
    `;
  }
};

const loadTournaments = async () => {
  try {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .neq('status', 'hidden')
      .order('created_at', { ascending: false });

    if (error) throw error;

    tournaments = data || [];
    renderTournaments();

    updateTournamentSelect();
  } catch (error) {
    console.error('Error loading tournaments:', error);
  }
};

const renderTournaments = () => {
  const container = document.getElementById('tournaments-list');

  if (tournaments.length === 0) {
    container.innerHTML = '<p class="loading">لا توجد بطولات متاحة حالياً</p>';
    return;
  }

  container.innerHTML = tournaments.map((tournament) => `
    <div class="tournament-card">
      <div class="tournament-card-image">
        ${getTournamentTypeEmoji(tournament.type)}
      </div>
      <div class="tournament-card-content">
        <h3>${tournament.name}</h3>
        <span class="tournament-type">${getTournamentTypeLabel(tournament.type)}</span>
        <p class="tournament-description">${tournament.description || 'بدون وصف'}</p>
        <div class="tournament-stats">
          <span>الحد الأقصى: ${tournament.max_participants}</span>
          <span>الحالة: ${tournament.status === 'active' ? 'نشطة' : tournament.status === 'paused' ? 'مؤجلة' : 'منتهية'}</span>
        </div>
        <button class="btn-register" onclick="selectTournament('${tournament.id}')">التسجيل</button>
      </div>
    </div>
  `).join('');
};

const updateTournamentSelect = () => {
  const select = document.getElementById('tournament-select');
  const activeOptions = tournaments.filter((t) => t.status === 'active');

  select.innerHTML = '<option value="">اختر بطولة...</option>' +
    activeOptions.map((tournament) => `
      <option value="${tournament.id}">${tournament.name} (${getTournamentTypeLabel(tournament.type)})</option>
    `).join('');
};

const handleRegistration = async (e) => {
  e.preventDefault();

  const tournamentId = document.getElementById('tournament-select').value;
  const name = document.getElementById('participant-name').value;
  const email = document.getElementById('participant-email').value;
  const phone = document.getElementById('participant-phone').value;
  const platform = document.getElementById('participant-platform').value;

  if (!tournamentId) {
    showNotification('الرجاء اختيار بطولة', 'error');
    return;
  }

  try {
    const { error } = await supabase
      .from('participants')
      .insert({
        tournament_id: tournamentId,
        name,
        email,
        phone,
        platform,
      });

    if (error) throw error;

    showNotification('تم إرسال طلبك بنجاح! سيتم التحقق منه قريباً', 'success');
    document.getElementById('registration-form').reset();
  } catch (error) {
    console.error('Error registering:', error);
    showNotification('حدث خطأ أثناء التسجيل، حاول مجدداً', 'error');
  }
};

const loadSettings = async () => {
  try {
    const { data } = await supabase
      .from('settings')
      .select('*')
      .limit(1)
      .single();

    if (data) {
      const email = document.getElementById('footer-email');
      const phone = document.getElementById('footer-phone');
      const address = document.getElementById('footer-address');
      const socialMedia = document.getElementById('social-media');

      if (email) email.textContent = `البريد: ${data.contact_email || 'N/A'}`;
      if (phone) phone.textContent = `الهاتف: ${data.contact_phone || 'N/A'}`;
      if (address) address.textContent = `العنوان: ${data.contact_address || 'N/A'}`;

      if (socialMedia && data.social_media) {
        const socials = Object.entries(data.social_media);
        socialMedia.innerHTML = socials
          .map(([key, value]) => `
            <a href="${value}" class="social-link" target="_blank" rel="noopener noreferrer">
              ${key}
            </a>
          `).join('');
      }
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
};

window.selectTournament = (tournamentId) => {
  const select = document.getElementById('tournament-select');
  select.value = tournamentId;
  select.scrollIntoView({ behavior: 'smooth' });
};

const init = () => {
  loadTournaments();
  initAdsBanner();
  loadSettings();

  document.getElementById('registration-form').addEventListener('submit', handleRegistration);
};

init();
