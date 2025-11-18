import { supabase } from '../config.js';

export const calculateLeagueStandings = async (tournamentId) => {
  try {
    const { data: matches } = await supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('status', 'completed');

    const { data: participants } = await supabase
      .from('participants')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('is_approved', true);

    const standings = {};

    participants.forEach((p) => {
      standings[p.id] = {
        id: p.id,
        name: p.name,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goals_for: 0,
        goals_against: 0,
        points: 0,
      };
    });

    matches.forEach((match) => {
      const p1 = standings[match.participant1_id];
      const p2 = standings[match.participant2_id];

      if (!p1 || !p2) return;

      const score1 = match.participant1_score;
      const score2 = match.participant2_score;

      p1.played++;
      p2.played++;
      p1.goals_for += score1;
      p1.goals_against += score2;
      p2.goals_for += score2;
      p2.goals_against += score1;

      if (score1 > score2) {
        p1.won++;
        p2.lost++;
        p1.points += 3;
      } else if (score1 < score2) {
        p2.won++;
        p1.lost++;
        p2.points += 3;
      } else {
        p1.drawn++;
        p2.drawn++;
        p1.points += 1;
        p2.points += 1;
      }
    });

    const standingsList = Object.values(standings)
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return b.goals_for - b.goals_against - (a.goals_for - a.goals_against);
      });

    for (const standing of standingsList) {
      await supabase
        .from('standings')
        .upsert({
          tournament_id: tournamentId,
          participant_id: standing.id,
          played: standing.played,
          won: standing.won,
          drawn: standing.drawn,
          lost: standing.lost,
          goals_for: standing.goals_for,
          goals_against: standing.goals_against,
          points: standing.points,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'tournament_id,participant_id',
        });
    }

    return standingsList;
  } catch (error) {
    console.error('Error calculating standings:', error);
    throw error;
  }
};

export const generateKnockoutBracket = async (tournamentId) => {
  try {
    const { data: participants } = await supabase
      .from('participants')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('is_approved', true);

    if (!participants || participants.length === 0) return [];

    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    const bracketData = [];

    const rounds = Math.ceil(Math.log2(shuffled.length));

    for (let round = 1; round <= rounds; round++) {
      const matchesInRound = Math.pow(2, rounds - round);

      for (let i = 0; i < matchesInRound; i++) {
        const match = {
          tournament_id: tournamentId,
          round: round,
          position: i,
        };

        if (round === 1) {
          const p1 = shuffled[i * 2];
          const p2 = shuffled[i * 2 + 1];

          const { data: createdMatch } = await supabase
            .from('matches')
            .insert({
              tournament_id: tournamentId,
              participant1_id: p1?.id || null,
              participant2_id: p2?.id || null,
              round: round,
              match_number: i + 1,
              status: 'pending',
            })
            .select();

          match.match_id = createdMatch?.[0]?.id;
        }

        const { data } = await supabase
          .from('bracket')
          .insert(match)
          .select();

        bracketData.push(data?.[0]);
      }
    }

    return bracketData;
  } catch (error) {
    console.error('Error generating bracket:', error);
    throw error;
  }
};

export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const showNotification = (message, type = 'success', duration = 3000) => {
  const messageEl = document.getElementById('registration-message') ||
    document.querySelector('.message');

  if (!messageEl) return;

  messageEl.textContent = message;
  messageEl.className = `message ${type}`;

  if (duration > 0) {
    setTimeout(() => {
      messageEl.className = 'message hidden';
    }, duration);
  }
};

export const getTournamentTypeLabel = (type) => {
  const labels = {
    league: 'نظام الدوري',
    online: 'بطولة أونلاين',
    knockout: 'خروج مغلوب',
  };
  return labels[type] || type;
};

export const getTournamentTypeEmoji = (type) => {
  const emojis = {
    league: '🏆',
    online: '🎮',
    knockout: '⚔️',
  };
  return emojis[type] || '';
};
