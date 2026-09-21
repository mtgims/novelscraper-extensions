# NovelScraper extensions

The sources for the NovelScraper app (Android and Linux). Each source is an
extension: a small JavaScript plugin that knows how to list, search and read one
site. The app installs extensions from repositories like this one.

## Use them in the app

Browse → Extensions → Repositories, and add:

```
https://raw.githubusercontent.com/mtgims/novelscraper-extensions/master/index.json
```

The sources then appear under Available; install the ones you want. Updates show
up there when a plugin's version here goes up.

The app reads any repository in this format, so LNReader's plugins work too
(add `https://raw.githubusercontent.com/lnreader/lnreader-plugins/plugins/v3.0.0/.dist/plugins.min.json`),
and so does a repository of your own.

## What's here

```
plugins/<language>/<name>.js   one plugin per source
icons/<name>.png               its icon (same file name)
index.json                     the repository index the app reads (generated)
scripts/build-index.mjs        regenerates index.json
```

| Source | Site | Notes |
|---|---|---|
| Free Web Novel | freewebnovel.com | from LNReader's plugin |
| FuckNovelpia | fucknovelpia.com | from LNReader's plugin |
| Novel Archive | novelarchive.cc | ours; uses the site's JSON API |
| Novel Bin | novel-bin.com | ours; the site lists 30 chapters, the rest are numbered in order |
| NovelBuddy | novelbuddy.me | from LNReader's plugin |
| NovelCool | novelcool.com | from LNReader's plugin |
| Novel Fire | novelfire.net | from LNReader's plugin |
| Novel Hall | novelhall.com | from LNReader's plugin; often behind a browser check |
| Novel Phoenix | novelphoenix.com | from LNReader's plugin |
| OpenQuill | openquill.net | ours; paged chapter lists, author-locked chapters reported |
| Ranobes | ranobes.net | LNReader's ranobes template pointed at ranobes.net |
| Royal Road | royalroad.com | from LNReader's plugin |
| Scribble Hub | scribblehub.com | from LNReader's plugin; often behind a browser check |
| Wuxiabox | wuxiabox.com | from LNReader's plugin; often behind a browser check |
| Wuxia Click | wuxia.click | ours; WuxiaWorld.eu family, JSON API |

"Behind a browser check" means Cloudflare asks for a real browser on some
connections; the app says so when it happens.

Plugins marked "from LNReader's plugin" are LNReader's code (lnreader-plugins,
MIT License, Copyright (c) 2021 Rajarshee Chatterjee) with the plugin id changed;
each file says which plugin it came from and carries that notice.

## Write an extension

A plugin is CommonJS JavaScript whose default export is the plugin object, the
same format LNReader uses, so its
[plugin guide](https://github.com/lnreader/lnreader-plugins) applies. The app
runs it in QuickJS (modern JavaScript, ES2020+, classes and async/await are fine).

```js
const { fetchApi } = require('@libs/fetch');
const { load } = require('cheerio');
const { NovelStatus } = require('@libs/novelStatus');

const site = 'https://example.com/';

class Example {
  id = 'novelscraper.example';   // unique; ours start with "novelscraper."
  name = 'Example';
  site = site;
  version = '1.0.0';             // raise it to publish an update
  icon = '';

  // A page of novels: popular, or the latest when showLatestNovels is true.
  async popularNovels(page, { showLatestNovels }) {
    const $ = load(await (await fetchApi(`${site}list?page=${page}`)).text());
    return $('.novel a').map((_, a) => ({
      name: $(a).text().trim(),
      path: $(a).attr('href').replace(/^\//, ''),   // site-relative; your own key
      cover: $(a).find('img').attr('src'),
    })).get();
  }

  async searchNovels(searchTerm, page) { /* same shape as popularNovels */ }

  // Details and the chapter list. For a paged list, return the first page plus
  // totalPages and implement parsePage(path, page).
  async parseNovel(novelPath) {
    return {
      name: '...', path: novelPath, cover: '...', author: '...', genres: 'A, B',
      summary: '...', status: NovelStatus.Ongoing,
      chapters: [{ name: 'Chapter 1', path: 'novel/x/1', releaseTime: '2026-01-01', chapterNumber: 1 }],
    };
  }

  // The chapter as HTML (paragraphs, images).
  async parseChapter(chapterPath) { return '<p>...</p>'; }

  resolveUrl = (path, isNovel) => site + path;   // optional: the page's web address
}

exports.default = new Example();
```

What a plugin can `require`: `@libs/fetch` (`fetchApi`, `fetchText`),
`cheerio` (`load`), `htmlparser2`, `dayjs`, `urlencode`, `@libs/novelStatus`,
`@libs/filterInputs`, `@libs/defaultCover`, `@libs/storage`,
`@libs/isAbsoluteUrl`, `@libs/aes`, `@libs/utils`. Globals: `fetch`, `Headers`,
`FormData`, `URL`, `URLSearchParams`, `TextEncoder`/`TextDecoder` (any charset),
`atob`/`btoa`, `setTimeout`, `console`. Requests go out from the reader's own
device, with a browser User-Agent and cookies kept between calls.

Throwing an `Error` shows its message to the reader, so say what went wrong
("This chapter is locked by its author").

## Publish

1. Add `plugins/<language>/<name>.js` and, if you have one, `icons/<name>.png`.
2. `node scripts/build-index.mjs` (checks every plugin loads and ids are unique,
   then rewrites `index.json`).
3. Commit and push. Apps pick up new plugins and higher versions from
   `index.json`.

To try a plugin against its site before publishing, the app repository has a
live test: from `app/`,
`./gradlew :composeApp:desktopTest --tests '*LivePluginTest*' -PliveRepo=<this checkout> -PlivePlugins=<id>`
(popular list, one novel, its first chapter; a few requests, spaced out).
