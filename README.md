# dpm.js.org

This branch holds the sources of the documentation website. GitHub Actions builds and publishes it, nothing built is committed.

Documentation website of `discord-player-music`, in the style of [discord.js.org](https://discord.js.org/docs).

A static [Next.js](https://nextjs.org) site (`output: 'export'`) that reads the files the module already has:

- `docs/index.json` from `npm run build:docs` (classes, typedefs, enums and the markdown guides of `docs/general`) of every
  branch of the GitHub repository: each branch that has the file ## Commands

```sh-session
$ npm install
$ npm run dev        # http://localhost:3000, the docs of every branch from GitHub
$ npm run dev:local -- --docs=../discord-player-music/docs/index.json
                     # a local docs/index.json (docs you did not push yet) as the "local" version
$ npm run build      # static site in out/
$ npm run preview    # serves out/
```

With `dev:local`, run `npm run build:docs` in the module folder when the JSDoc or the guides changed: the site notices the
new `docs/index.json` by itself. Without `--docs=` it reads `../docs/index.json`.

 run build:docs` in the root folder when the JSDoc or the guides changed: the site notices
the new `docs/index.json` by itself.

## Speed

`scripts/prerender.ts` turns every markdown text and code example into HTML once (about a second) and saves it in
`.cache/prerendered.json`. Pages only read that file, so they do not run markdown and syntax highlighting on every
request. `npm run dev` runs it on start (`dev:local` also when `docs/index.json` changes). The search index is a separate file
(`/search-index/<version>.json`) that loads in the background.

The dev server still compiles each kind of page the first time it is opened. `npm run build && npm run preview` shows the
real speed of the site.

## Versions

`scripts/fetch-docs.ts` (run by `npm run dev` and `npm run build`) asks the GitHub API for the branches of
`xyligan-gp/discord-player-music` and downloads `docs/index.json` of each one into `data/<branch>.json`, with the list in
`data/versions.json`. Branches without the file (`website`, `void`) are skipped. `stable` and `dev` go first in the
version select, the other branches after them by name (`feature/x` becomes `feature-x` in URLs).

- `GITHUB_TOKEN` raises the GitHub API limit (60 requests an hour without it); the deploy workflow passes it.
- Offline or over the limit, the script keeps the versions downloaded before, or tries `stable` and `dev` directly.
- Nothing downloaded at all: the site shows `../docs/index.json` as `local`.

## Deploying

`.github/workflows/deploy.yml` of this branch builds the site and publishes it with GitHub Pages at https://dpm.js.org
(a js.org subdomain that points to `xyligan-gp.github.io/discord-player-music`). It runs:

- on every push to this branch;
- by hand: Actions → Deploy → Run workflow;
- when `docs/index.json` changes in another branch, or a branch is created or deleted: `.github/workflows/docs-updated.yml`
  of the `stable` and `dev` branches starts it.

Settings of the repository (once):

- Settings → Pages → Build and deployment → Source: **GitHub Actions**. The custom domain `dpm.js.org` stays there.
- Settings → Environments → `github-pages` → Deployment branches and tags: add `website` (by default only the default branch
  may deploy).

## Links

- Pages: `/docs/<version>/general/<guide>/`, `/docs/<version>/class/<Class>/#<member>`, `/docs/<version>/typedef/<Typedef>/`.
  Events have the `#event-<name>` anchor.
- Links of the old site (`https://dpm.js.org/#/docs/discord-player-music/stable/class/Player?scrollTo=search`) still work:
  the page sends them to the new address. In the markdown guides they are rewritten when the site is built, and relative links
  to other guides (`./faq.md#some-heading`) work too.
- `sw.js` and `service-worker.js` replace the service worker of the old site: they remove it from the browsers of visitors.

## Credits

The look follows [discord.js.org](https://github.com/discordjs/discord.js/tree/main/apps/website) (Apache-2.0).
