# SRRouteCalc

A fan-made trade route calculator for the Roblox game **Silk Road: Trading Simulator** (SR:TS). Pick your trader, caravan and reputation, and it ranks the most profitable trades between cities, with an optional line-by-line price breakdown that mirrors the game's own purchase/sale text.

> Fan-made and not affiliated with or endorsed by the game's developers. The game's official support team confirmed the developers don't partner with calculators but don't discourage fan-made ones.

## Features

- Best trade between two cities, every profitable trade, and a best route per good
- Multi-leg route chaining, with an optional best loop back to the start
- Trader profile: culture, religion and Faith Level, languages, gamepasses, reputation ranks, active events
- Caravan: bags, animals, saddlebags, cargo and auto-walk speed
- Travel time and profit per minute
- Optional itemized price breakdown
- Route searches buy goods only where they are produced, with a switch to include imports
- Five reputation tracks, including the Rashidun Caliphate, and a quest money calculator
- Menu with settings, loadouts and a style editor
- Loadouts: save your whole setup (up to 20), then export or import it as a file
- Style editor: colors, text sizes, fonts (including your own uploaded fonts, by button or drag and drop), frame spacing and border thickness, animation speed and effects
- Display options: whole-number rounding, themed dropdowns, an SR:TS Information Hub colour theme, Dynamic frames (a packed multi-column layout), animations and click highlight switches
- Optional game icons next to cultures, religions, events, bags, animals and city traits, placed left, right, above or below the text

No accounts, no tracking, no backend. The site only loads its own data files and the fonts. Settings, loadouts, styles and uploaded fonts stay in your browser (localStorage and IndexedDB) and are never sent anywhere.

## Run it locally

It is plain HTML, CSS and ES modules with no build step, but modules need a web server (not `file://`).

```
npx serve          # or: python3 -m http.server
```

VS Code's Five Server extension works too. Then open the printed address.

## Tests

Node 18+ is enough, with no dependencies:

```
npm test
```

The tests live in `tests/`. They run the real calculator against the real data files and also cover the style, font, icon and layout helpers. Run them before and after any change to `js/core/` or `data/`.

## Where the numbers come from

1. **SR:TS Information Hub** (primary): https://srts-infohub.framer.wiki/
2. **SR:TS Fandom wiki** (secondary): https://srtsimulator.fandom.com/wiki/Silk_Road_Trading_Simulator_Wiki
3. **In-game itemized purchase/sale screenshots** (highest trust, and how formulas are confirmed)

When sources disagree, the Info Hub wins and the discarded value is kept in a `note` field. Anything not confirmed is marked `UNCONFIRMED` in `data/`. Nothing is invented. The Distance Bonus formula is still a best-effort fit.

## Project layout

```
index.html
data/        goods, cities, distances, modifiers, reputation, cargo (JSON)
js/
  main.js    startup and wiring
  core/      pricing and route engine (calc.js re-exports lookup, distanceBonus, religionLines, modifierLines, pricing, routes), travelCalc, cargoCalc, reputationCalc, returnCargo, money, state, storage
  panels/    one file per page section, plus loadoutPanel and stylePanel for the menu
  ui/        menu, confirm dialog, dropdown and theme settings, style store, font store, icons, dynamic frames
style/       base, components, layout, motion, icons, menu, dialog, style editor, per-panel CSS, dropdown CSS, theme-infohub.css
tests/       calc, petra, style, fonts, frames and icons tests
```

## Game icons

Icons are optional and off by default (Menu, Settings, Show icons). The site looks for them in `assets/icons/`, which is not part of this repository. If you want them locally, place the icon folders there. A second host can be set as a fallback with `REMOTE_ICON_BASE` in `js/ui/icons.js`. Missing icons simply stay hidden.

## Roadmap

Rarity for the remaining goods, the Rashidun Caliphate quest and sale reputation, saving the Specific mode routes, and resolving the Petra Distance Bonus mismatches (marked as todo tests). Guild perks are wired but depend on goods rarity, and the game's Junk Hoarding bug is behind a switch.

## Support

Free to use. Optional donations toward server costs: https://ko-fi.com/yuriaranilla123

## AI-assisted

This project is AI-assisted: most of the code was written with AI help, mainly Claude Sonnet 5.5 and other free-tier models, directed by the maintainer. Game numbers are checked against in-game screenshots and the sources above, not taken from the AI.

## Contributors

See [CONTRIBUTORS.md](CONTRIBUTORS.md).

## License

AGPL-3.0-or-later, see [LICENSE](LICENSE). If you run a modified version as a website, AGPLv3 requires you to offer its source code to your users.

Copyright (C) 2026-present Yuri123_YT. No game assets are included in this repository.