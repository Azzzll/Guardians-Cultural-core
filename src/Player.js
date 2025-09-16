class Player {
  constructor(socketId, name) {
    this.socketId = socketId;
    this.name = name;
    this.hero = null; // 'hero' или 'villain'
    this.hand = []; // Карты на руках
    this.field = Array(4).fill(null); // 4 слота для карт
    this.health = 20; // Основное HP игрока
    this.actions = 3; // Доступные действия за ход
    this.isTurn = false;
  }

  drawCards(deck, count) {
    const newCards = deck.getCards(count);
    this.hand = [...this.hand, ...newCards];
    return newCards;
  }

  playCard(cardIndex, slotIndex) {
    if (cardIndex >= this.hand.length || slotIndex >= this.field.length) {
      return null;
    }

    if (this.field[slotIndex] !== null) {
      return null; // Слот уже занят
    }

    const card = this.hand[cardIndex];

    // Проверяем тип карты
    if (
      card.type === 'hero' &&
      this.field.filter((c) => c && c.type === 'hero').length >= 2
    ) {
      return null; // Не больше 2 героев
    }

    // Перемещаем карту из руки на поле
    this.hand.splice(cardIndex, 1);
    this.field[slotIndex] = card;
    this.actions--;

    return card;
  }

  useBuff(buffIndex, targetSlotIndex) {
    if (buffIndex >= this.hand.length || targetSlotIndex >= this.field.length) {
      return null;
    }

    const buffCard = this.hand[buffIndex];
    const target = this.field[targetSlotIndex];

    if (buffCard.type !== 'buff' && buffCard.type !== 'debuff') {
      return null;
    }

    if (!target || target.type !== 'hero') {
      return null; // Бафф можно использовать только на героя
    }

    // Применяем бафф
    if (buffCard.type === 'buff') {
      target.addBuff(buffCard);
    } else if (buffCard.type === 'debuff') {
      // Логика дебаффа (снятие эффектов)
      this.applyDebuff(target, buffCard);
    }

    this.hand.splice(buffIndex, 1);
    this.actions--;
    return buffCard;
  }

  applyDebuff(target, debuffCard) {
    switch (debuffCard.debuffType) {
      case 'remove_bleed':
        target.debuffs = target.debuffs.filter((d) => d !== 'bleed');
        break;
      case 'remove_stun':
        target.debuffs = target.debuffs.filter((d) => d !== 'stun');
        break;
      case 'remove_curse':
        target.debuffs = target.debuffs.filter((d) => d !== 'curse');
        break;
    }
  }

  attack(attackerSlotIndex, targetPlayer, targetSlotIndex) {
    if (attackerSlotIndex >= this.field.length) {
      return false;
    }

    const attacker = this.field[attackerSlotIndex];
    if (!attacker || attacker.type !== 'hero' || !attacker.canAttack) {
      return false;
    }

    let target = null;
    if (
      targetSlotIndex !== null &&
      targetSlotIndex < targetPlayer.field.length
    ) {
      target = targetPlayer.field[targetSlotIndex];
    }

    let damageDealt = attacker.attack;
    let targetDestroyed = false;

    if (target) {
      // Атака по карте противника
      targetDestroyed = target.takeDamage(damageDealt);
      if (targetDestroyed) {
        targetPlayer.field[targetSlotIndex] = null;
      }
    } else {
      // Атака по пустому слоту (прямо по игроку)
      targetPlayer.health -= Math.min(damageDealt, 1); // Макс 1 урон по игроку
    }

    attacker.canAttack = false;
    this.actions--;

    return {
      damageDealt,
      targetDestroyed,
      targetHealth: target ? target.hp : targetPlayer.health,
    };
  }

  resetTurn() {
    this.actions = 3;
    // Сбрасываем статус атаки для всех героев
    this.field.forEach((card) => {
      if (card && card.type === 'hero') {
        card.canAttack = true;
      }
    });
  }
}

module.exports = Player;
