const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const source = fs.readFileSync(path.join(root, 'frontend', 'hero-select.js'), 'utf8');
const networkSource = fs.readFileSync(path.join(root, 'network.js'), 'utf8');

test('main menu contains modes only and delegates fighters to the showcase', () => {
    const mainMenu = html.match(/<div id="menu-screen"[\s\S]*?<\/div>\s*<\/div>/)?.[0] || '';
    for (const id of ['btn-sp', 'btn-mp', 'btn-boss-mode', 'btn-online', 'btn-open-settings']) {
        assert.match(mainMenu, new RegExp(`id="${id}"`));
    }
    assert.doesNotMatch(mainMenu, /hero-grid|p1-roster|p2-roster/);
    assert.match(html, /id="hero-select-screen"/);
    assert.match(html, /id="hero-select-stage"/);
});

test('hero selection is data-driven and supports staged mode flows', () => {
    assert.match(source, /Object\.keys\(HEROES\)/);
    assert.match(source, /addEventListener\('wheel'/);
    assert.match(source, /this\.mode === 'computer'/);
    assert.match(source, /this\.mode === 'local'/);
    assert.match(source, /this\.mode === 'online'/);
    assert.match(source, /this\.mode === 'boss'/);
    assert.match(source, /skillCards\(hero\)/);
    assert.match(source, /new Fighter\(`preview-\$\{key\}`/);
    assert.match(source, /fighter\.draw\(ctx/);
    assert.doesNotMatch(source, /drawWeapon\(ctx/);
    assert.match(networkSource, /heroSelectUI\.open\('online'\)/);
});

test('boss selection uses a dedicated large showcase', () => {
    assert.match(html, /class="boss-showcase"/);
    assert.match(html, /id="boss-preview"/);
    assert.match(html, /id="boss-prev"/);
    assert.match(html, /id="boss-next"/);
    assert.doesNotMatch(html, /class="boss-grid"/);
    assert.match(source, /this\.game\.bossPlayerCount === 1/);
    assert.match(source, /this\.game\.startBossGame\(\)/);
});
