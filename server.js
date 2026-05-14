require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const CR_API_KEY = process.env.CR_API_KEY;

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
  return res.status(playerRes.status).json({
    error: playerData.message || 'Player not found'
  });
}

if (!cardsRes.ok) {
  return res.status(cardsRes.status).json({
    error: 'Failed to fetch cards data'
  });
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

res.json(playerData);

  } catch (err) {
  console.error("FULL ERROR:", err);
  res.status(500).json({ error: err.message });
}
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});