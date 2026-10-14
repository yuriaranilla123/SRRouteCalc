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
- Display options: whole-number rounding, themed dropdowns, and an SR:TS Information Hub colour theme

No accounts, no tracking, no backend. The site only loads its own data files and the fonts.

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

The tests run the real `calc.js` against the real data files. Run them before and after any change to `calc.js` or `data/`.

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
  core/      calc.js (pricing engine), travelCalc, cargoCalc, reputationCalc, returnCargo, money, state
  panels/    one file per page section (trader, caravan, reputation, events, route finder, trades table, credits, funding bar)
  ui/        dropdown style, themed select, goods search box, theme setting
style/       base, components, per-panel CSS, dropdowns.css, theme-infohub.css
tests/       calc.test.mjs
```

## Roadmap

Hamburger menu and settings panel, saving and loading loadouts as a local file, and guild perks (waiting on the game to fix them).

## Support

Free to use. Optional donations toward server costs: https://ko-fi.com/yuriaranilla123

## AI-assisted

This project is AI-assisted: most of the code was written with AI help, mainly Claude Sonnet 5.5 and other free-tier models, directed by the maintainer. Game numbers are checked against in-game screenshots and the sources above, not taken from the AI.

## Contributors

See [CONTRIBUTORS.md](CONTRIBUTORS.md).

## License

AGPL-3.0-or-later, see [LICENSE](LICENSE). If you run a modified version as a website, AGPLv3 requires you to offer its source code to your users.

Copyright (C) 2026-present Yuri123_YT. No game assets are included in this repository.