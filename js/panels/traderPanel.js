import { getModifiersData } from '../core/state.js';
import { getPlayerRanks } from './reputationPanel.js';
import { getGuildPerks } from './guildPanel.js';

export function populateLanguageFields() {
    const modifiersData = getModifiersData();
    const container = document.getElementById('language-fields');
    container.innerHTML = modifiersData.languages.map(lang => `
    <label class="form-field">
      ${lang}
      <select class="language-select" data-language="${lang}">
        <option value="Broken">Broken</option>
        <option value="Proficient">Proficient</option>
        <option value="Fluent">Fluent</option>
        <option value="Native" class="native-option" hidden>Native</option>
      </select>
    </label>
  `).join('');
    updateNativeLanguageLock();
}

export function updateNativeLanguageLock() {
    const modifiersData = getModifiersData();
    const culture = document.getElementById('culture').value;
    const nativeLanguage = modifiersData.nativeLanguageByCulture[culture];

    document.querySelectorAll('.language-select').forEach(select => {
        const isNative = select.dataset.language === nativeLanguage;
        const nativeOption = select.querySelector('.native-option');
        select.disabled = isNative;
        nativeOption.hidden = !isNative;
        if (isNative) {
            select.value = 'Native';
        } else if (select.value === 'Native') {
            select.value = 'Broken';
        }
    });
}

export function renderFaithHint() {
    const modifiersData = getModifiersData();
    const religion = document.getElementById('religion').value;
    const level = parseInt(document.getElementById('faith-level').value, 10) || 0;
    const hint = document.getElementById('faith-level-hint');
    const rel = modifiersData.religionModifiers[religion];

    if (!rel || level === 0) {
        hint.textContent = 'No Faith Level effects active yet - pray at your religion\'s site in-game to earn Faith.';
        return;
    }

    const active = [];
    for (let lvl = 1; lvl <= level; lvl++) {
        const levelData = rel.levels[String(lvl)];
        if (levelData) active.push(levelData.name);
    }
    hint.textContent = active.length ? `Active: ${active.join(', ')}.` : 'No Faith Level effects active yet.';
}

export function getContext() {
    const languages = {};
    document.querySelectorAll('.language-select').forEach(select => {
        languages[select.dataset.language] = select.value;
    });
    return {
        culture: document.getElementById('culture').value,
        religion: document.getElementById('religion').value,
        faithLevel: parseInt(document.getElementById('faith-level').value, 10) || 0,
        playerRanks: getPlayerRanks(),
        hasNobility: document.getElementById('gamepass-nobility').checked,
        matchGameBugs: document.getElementById('match-game-bugs').checked,
        allowImports: document.getElementById('allow-imports').checked,
        guildPerks: getGuildPerks(),
        languages,
    };
}

export function wireTraderControls() {
    document.getElementById('culture').addEventListener('change', updateNativeLanguageLock);
    document.getElementById('religion').addEventListener('change', renderFaithHint);
    document.getElementById('faith-level').addEventListener('change', renderFaithHint);
}