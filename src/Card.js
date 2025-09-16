class Card {
  constructor(id, name, type) {
    this.id = id;
    this.name = name;
    this.type = type; // 'hero', 'buff', 'debuff'
  }
}

class HeroCard extends Card {
  constructor(id, name, hp, attack) {
    super(id, name, 'hero');
    this.hp = hp;
    this.attack = attack;
    this.maxHp = hp;
    this.buffs = [];
    this.debuffs = [];
    this.canAttack = true;
  }

  addBuff(buff) {
    // Проверяем, нет ли уже такого же баффа
    const hasSameBuff = this.buffs.some((b) => b.buffType === buff.buffType);
    if (!hasSameBuff) {
      this.buffs.push(buff);
      this.applyBuffEffects(buff);
    }
  }

  applyBuffEffects(buff) {
    switch (buff.buffType) {
      case 'attack':
        this.attack += buff.value;
        break;
      case 'hp':
        this.maxHp += buff.value;
        this.hp += buff.value;
        break;
      case 'barricade':
        // Баррикада - особый тип баффа
        this.buffs.push(buff);
        break;
    }
  }

  takeDamage(damage) {
    // Сначала damage поглощается баррикадой, если есть
    const barricade = this.buffs.find((b) => b.buffType === 'barricade');
    if (barricade) {
      if (barricade.value > damage) {
        barricade.value -= damage;
        damage = 0;
      } else {
        damage -= barricade.value;
        barricade.value = 0;
        // Удаляем баррикаду если она уничтожена
        this.buffs = this.buffs.filter((b) => b !== barricade);
      }
    }

    if (damage > 0) {
      this.hp -= damage;
    }

    return this.hp <= 0;
  }
}

class BuffCard extends Card {
  constructor(id, name, buffType, value) {
    super(id, name, 'buff');
    this.buffType = buffType; // 'attack', 'hp', 'barricade', 'bleed', 'stun', 'curse'
    this.value = value;
  }
}

class DebuffCard extends Card {
  constructor(id, name, debuffType) {
    super(id, name, 'debuff');
    this.debuffType = debuffType; // 'remove_bleed', 'remove_stun', 'remove_curse'
  }
}

// Фабрика карт
class CardFactory {
  static createCard(cardData) {
    switch (cardData.type) {
      case 'hero':
        return new HeroCard(
          cardData.id,
          cardData.name,
          cardData.hp,
          cardData.attack
        );
      case 'buff':
        return new BuffCard(
          cardData.id,
          cardData.name,
          cardData.buffType,
          cardData.value
        );
      case 'debuff':
        return new DebuffCard(cardData.id, cardData.name, cardData.debuffType);
      default:
        throw new Error(`Unknown card type: ${cardData.type}`);
    }
  }
}

module.exports = { Card, HeroCard, BuffCard, DebuffCard, CardFactory };
