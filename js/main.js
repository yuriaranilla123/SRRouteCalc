import { loadData, setRoundToInt, setDetailedMode, getCitiesData } from './core/state.js';
import { setDropdownStyle } from './ui/dropDownStyle.js';
import { setTheme } from './ui/themeStyle.js';
import { populateCaravanSelects, recomputeCaravan, wireCaravanControls } from './panels/caravanPanel.js';
import { populateReputationFields, renderLockedGoodsHint, renderQuestMoney, renderQuestGivers, wireReputationControls } from './panels/reputationPanel.js';
import { populateLanguageFields, wireTraderControls, renderFaithHint, updateNativeLanguageLock } from './panels/traderPanel.js';
import { populateGuildPerks, wireGuildControls } from './panels/guildPanel.js';
import { populateGoodsDatalist, wireGoodsDatalistReactivity } from './ui/goodsDatalist.js';
import { renderGeneralBest, wireTabControls } from './panels/allTradesPanel.js';
import { wireSortControls, refreshTable } from './panels/tradesTable.js';
import { initLegChain, wireLegChainReactivity, recomputeAll } from './panels/legChainPanel.js';
import {
    wireRouteModeTabs,
    wireQuantityStepper,
    wireRouteFinderReactivity,
} from './panels/routeFinderPanel.js';
import { renderFundingBar } from './panels/fundingBar.js';
import { renderCredits } from './panels/creditsPanel.js';
import { wireGoodsCombobox } from './ui/goodsComboBox.js';
import { wireThemedSelects } from './ui/themedSelect.js';
import { wireEventControls, renderEventHint } from './panels/eventPanel.js';
import { wireLoadouts } from './panels/loadoutPanel.js';
import { wireMenu, setMenuSticky } from './ui/menu.js';
import { applySavedStyle, wireStylePanel } from './panels/stylePanel.js';
import { setAnimations, setDynamicFrames, setClickHighlight } from './ui/styleStore.js';
import { wireDynamicFrames } from './ui/dynamicFrames.js';
import { wireIcons, applyIcons } from './ui/icons.js';
import { wireShortcuts } from './ui/shortcuts.js';
import { wireKeybindPanel } from './panels/keybindPanel.js';
import { restoreSettings, wireAutoSave, clearSettings } from './core/storage.js';

function populateCitySelects() {
    const citiesData = getCitiesData();
    document.querySelectorAll('.city-select').forEach(select => {
        citiesData.cities.forEach(city => {
            const opt = document.createElement('option');
            opt.value = city.id;
            opt.textContent = city.name;
            select.appendChild(opt);
        });
    });
}

async function startIntro() {
    try {
        const gate = await import('./ui/introGate.js');
        if (!gate.shouldPlayIntro(new Date(), window.localStorage, window.location.search, window.sessionStorage)) return;
        const intro = await import('./ui/intro.js');
        await intro.mountIntro();
    } catch {
        return;
    }
}

async function init() {
    await startIntro();
    applySavedStyle();
    await loadData();

    document.getElementById('round-to-int').addEventListener('change', (e) => {
        setRoundToInt(e.target.checked);
    });

    document.getElementById('detailed-mode').addEventListener('change', (e) => {
        setDetailedMode(e.target.checked);
        refreshTable();
    });

    document.getElementById('menu-sticky').addEventListener('change', (e) => {
        setMenuSticky(e.target.checked);
    });

    document.getElementById('infohub-style').addEventListener('change', (e) => {
        setTheme(e.target.checked ? 'infohub' : 'default');
    });

    document.getElementById('dropdown-style').addEventListener('change', (e) => {
        setDropdownStyle(e.target.checked ? 'themed' : 'native');
    });

    document.getElementById('dynamic-frames').addEventListener('change', (e) => {
        setDynamicFrames(e.target.checked);
    });

    document.getElementById('click-highlight').addEventListener('change', (e) => {
        setClickHighlight(e.target.checked);
    });

    ['show-icons', 'icon-position'].forEach(id => {
        document.getElementById(id).addEventListener('change', () => {
            applyIcons();
            refreshTable();
            recomputeAll();
        });
    });

    document.getElementById('animations').addEventListener('change', (e) => {
        setAnimations(e.target.checked);
    });

    populateCitySelects();
    populateCaravanSelects();
    populateReputationFields();
    populateLanguageFields();
    populateGuildPerks();
    restoreSettings(updateNativeLanguageLock);
    wireAutoSave();

    wireTraderControls();
    wireCaravanControls();
    wireGuildControls(recomputeCaravan);
    wireReputationControls();
    wireEventControls();
    wireQuantityStepper();
    wireGoodsDatalistReactivity();
    wireGoodsCombobox();
    wireThemedSelects();
    wireTabControls();
    wireSortControls();
    wireRouteModeTabs();
    wireRouteFinderReactivity();

    initLegChain();
    wireLegChainReactivity();

    wireMenu();
    wireLoadouts();
    wireKeybindPanel();
    wireShortcuts();
    wireStylePanel();
    wireDynamicFrames();
    wireIcons();

    recomputeCaravan();
    renderFaithHint();
    renderEventHint();
    renderLockedGoodsHint();
    renderQuestMoney();
    renderQuestGivers();
    populateGoodsDatalist();
    renderGeneralBest();
    renderFundingBar();
    renderCredits();

    document.getElementById('reset-settings').addEventListener('click', () => {
        clearSettings();
        window.location.reload();
    });

    document.getElementById('loading').style.display = 'none';
    document.getElementById('app').style.display = 'block';
}

init();