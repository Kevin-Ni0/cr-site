const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const CR_API_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiIsImtpZCI6IjI4YTMxOGY3LTAwMDAtYTFlYi03ZmExLTJjNzQzM2M2Y2NhNSJ9.eyJpc3MiOiJzdXBlcmNlbGwiLCJhdWQiOiJzdXBlcmNlbGw6Z2FtZWFwaSIsImp0aSI6ImRlN2RiMDdmLWUwNzYtNGQyNC05ZDdmLWM5ODYzZjdjZjAyNSIsImlhdCI6MTc3ODcyNjc1Miwic3ViIjoiZGV2ZWxvcGVyLzAyNTU1ZDA1LTkxNzctMzZlMy1lYTJmLTA0MzMzOTNmNDY3MCIsInNjb3BlcyI6WyJyb3lhbGUiXSwibGltaXRzIjpbeyJ0aWVyIjoiZGV2ZWxvcGVyL3NpbHZlciIsInR5cGUiOiJ0aHJvdHRsaW5nIn0seyJjaWRycyI6WyIxNzMuNTYuMjA1Ljk0Il0sInR5cGUiOiJjbGllbnQifV19.jWTe6UoJQXDS4Z6G1msd91MsCG2RfHBKYIYvVZXyIIUCsi5Bf3SFxmmdKY9yW8enId4Yl64SBuhop_KQrCzgHw'; // 👈 your key here

const rarityStartLevel = {
  common: 1,
  rare: 1,
  epic: 1,
  legendary: 1,
  champion: 1
};

app.get('/api/player/:tag', async (req, res) => {
  try {
    const tag = decodeURIComponent(req.params.tag);
    const encoded = encodeURIComponent(tag.startsWith('#') ? tag : '#' + tag);

    const [playerRes, cardsRes] = await Promise.all([
      fetch(`https://api.clashroyale.com/v1/players/${encoded}`, {
        headers: { Authorization: `Bearer ${CR_API_KEY}`, Accept: 'application/json' }
      }),
      fetch(`https://api.clashroyale.com/v1/cards`, {
        headers: { Authorization: `Bearer ${CR_API_KEY}`, Accept: 'application/json' }
      })
    ]);

    const playerData = await playerRes.json();
    const cardsData = await cardsRes.json();

    if (!playerRes.ok) {
      return res.status(playerRes.status).json({ error: playerData.message || 'Player not found' });
    }

    // Build a map of owned cards by id
    const owned = {};
    (playerData.cards || []).forEach(card => {
      owned[card.id] = card;
    });

    // Merge full card list with owned data
    const allCards = (cardsData.items || []).map(card => {
      if (owned[card.id]) {
        return owned[card.id];
      }
      return {
        ...card,
        level: rarityStartLevel[card.rarity] || 1,
        owned: false,
        isUnownedEvo: card.iconUrls?.evolutionMedium != null,
        isUnownedHero: card.iconUrls?.heroMedium != null
        };
    });

    playerData.cards = allCards;

    let debugCards = 0, debugEvos = 0, debugHeroes = 0, debugBoth = 0, debugCardLevels = 0;
allCards.forEach(card => {
  const isHero = !!card.iconUrls?.heroMedium;
  const isEvo = !!card.iconUrls?.evolutionMedium;
  if (isHero && isEvo) debugBoth++;
  else if (isHero) debugHeroes++;
  else if (isEvo) debugEvos++;
  else { debugCards++; debugCardLevels += card.level || 0; }
});
console.log('Player data keys:', Object.keys(playerData));
allCards.forEach(card => {
  if (card.name?.toLowerCase().includes('tower') || card.elixirCost === undefined) {
    console.log('POSSIBLE TOWER TROOP:', card.name, '| elixirCost:', card.elixirCost, '| rarity:', card.rarity);
  }
});
console.log('Total allCards:', allCards.length, '| Global cards list:', cardsData.items?.length);
console.log('supportCards:', JSON.stringify(playerData.supportCards, null, 2));    

res.json(playerData);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));