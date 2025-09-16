const { CardFactory } = require('./Card');

class Deck {
  constructor() {
    this.cards = [];
    this.discardPile = [];
  }

  initializeGameDeck() {
    // Создаем начальную колоду согласно правилам
    const cards = [];

    // 10 карт героев (пример)
    for (let i = 1; i <= 10; i++) {
      cards.push({
        id: `hero_${i}`,
        name: `Герой ${i}`,
        type: 'hero',
        hp: Math.floor(Math.random() * 5) + 5, // 5-10 HP
        attack: Math.floor(Math.random() * 3) + 2, // 2-4 атаки
      });
    }

    // 13 карт баффов/дебаффов согласно новым правилам
    const buffs = [
      { type: 'buff', buffType: 'hp', value: 2 }, // +2 HP
      { type: 'buff', buffType: 'hp', value: 2 },
      { type: 'buff', buffType: 'attack', value: 1 }, // +1 атака
      { type: 'buff', buffType: 'attack', value: 1 },
      { type: 'buff', buffType: 'barricade', value: 3 }, // баррикада 3 HP
      { type: 'buff', buffType: 'barricade', value: 4 }, // баррикада 4 HP
      { type: 'buff', buffType: 'bleed', value: 1 }, // кровотечение
      { type: 'buff', buffType: 'bleed', value: 1 },
      { type: 'buff', buffType: 'stun', value: 1 }, // оглушение
      { type: 'buff', buffType: 'stun', value: 1 },
      { type: 'buff', buffType: 'curse', value: 1 }, // проклятие
      { type: 'buff', buffType: 'curse', value: 1 },
      { type: 'debuff', debuffType: 'remove_bleed' }, // анти-кровотечение
      { type: 'debuff', debuffType: 'remove_stun' }, // анти-оглушение
      { type: 'debuff', debuffType: 'remove_curse' }, // анти-проклятие
    ];

    buffs.forEach((buff, index) => {
      cards.push({
        id: `buff_${index + 1}`,
        name: this.getBuffName(buff),
        ...buff,
      });
    });

    this.cards = cards.map((cardData) => CardFactory.createCard(cardData));
    this.shuffle();
  }

  getBuffName(buff) {
    const names = {
      hp: 'Увеличение здоровья',
      attack: 'Усиление атаки',
      barricade: 'Баррикада',
      bleed: 'Кровотечение',
      stun: 'Оглушение',
      curse: 'Проклятие',
      remove_bleed: 'Лечение',
      remove_stun: 'Избавление от страха',
      remove_curse: 'Снятие проклятия',
    };
    return names[buff.buffType || buff.debuffType];
  }

  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  drawCard() {
    if (this.cards.length === 0) {
      // Если колода пуста, перемешиваем сброс (кроме текущих карт в игре)
      if (this.discardPile.length > 0) {
        this.cards = [...this.discardPile];
        this.discardPile = [];
        this.shuffle();
      } else {
        return null;
      }
    }
    return this.cards.pop();
  }

  discard(card) {
    this.discardPile.push(card);
  }

  getCards(count) {
    const drawnCards = [];
    for (let i = 0; i < count; i++) {
      const card = this.drawCard();
      if (card) {
        drawnCards.push(card);
      }
    }
    return drawnCards;
  }
}

module.exports = Deck;
