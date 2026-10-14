# Contributing

Thanks for helping. The most useful contribution is **correct data**.

## Reporting a wrong or missing number

Open an issue with an itemized in-game purchase or sale screenshot (the one that lists every modifier line). Please include:

- The good, the city, and whether you were buying or selling
- Your trader: culture, religion and Faith Level, languages, reputation ranks, gamepasses
- Any active event in that city

A chat message ("someone said X") is a useful lead but is not enough on its own to change the data. A screenshot is.

## Data rules

- The SR:TS Information Hub wins over the Fandom wiki. Keep the discarded value in a `note` field rather than overwriting it silently.
- Never invent a number that can't be traced to a source or a direct in-game measurement. Mark unsure values `UNCONFIRMED`.
- Don't add real game assets (icons, images) to the repository.

## Code

- Plain HTML, CSS and ES modules. No build step and no runtime dependencies.
- Keep comments and docstrings brief, and only where they help.
- Anything built from user-typed text must be escaped before it goes into `innerHTML`.
- The site makes no network requests except for its own data files and fonts. Please keep it that way.
- Run `npm test` before opening a pull request, and add a test when you change `calc.js`.
- Keep pull requests small, one change each.

## License

By contributing you agree your work is licensed under AGPL-3.0-or-later, the same as the project.