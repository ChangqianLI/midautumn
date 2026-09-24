# Happy Mid-Autumn Festival — V7

## V7 changes

### 1. Chiikawa changed again
The player now uses a calmer, cute transparent GIPHY sticker rather than the
more energetic dancing sprite.

There is no rectangular/square background around the character.

### 2. Ending music plays directly
The result screen now starts the Chiikawa ending theme `ひとりごつ` directly
through an embedded player.

There is:
- no Spotify link
- no Spotify popup
- no extra music button

The audio stream begins when the result is triggered.

Note: browser autoplay policy can still depend on the browser, but the result
is triggered by the player's `E / Enter` key action, which gives the embedded
player the best chance to start with sound.

### 3. NPC dialogue simplified
NPCs no longer explain routes or where collectibles might be.

Hachiware only says hello, talks about the moon, and encourages Chiikawa.

Usagi says hello / Happy Mid-Autumn Festival and cheers Chiikawa on.

### Existing V6 behavior retained
- ⭐ 5 total
- 🥮 23 total
- all 5 stars reachable
- result words and ending conversation
- perfect collection redirects to the supplied Notion page
- browser title: `Happy Mid-Autumn Festival`

## Run

Open the folder in VS Code, right-click `index.html`, and choose:

`Open with Live Server`

Internet is needed for the external GIFs and ending-theme stream.


## Flat file layout

This version has no subfolders. All files sit together:

```text
index.html
style.css
game.js
README.md
ASSET_SOURCES.md
chiikawa.svg
hachiware.svg
usagi.svg
```


## V8 audio update

The ending music is now completely local and ad-free.

- no YouTube
- no Spotify
- no iframe
- no external audio stream
- no possibility of platform advertisements

The ending melody is generated directly in the browser using the Web Audio API.
It is an original melody written for this game rather than a copied Chiikawa
song. It also works offline.


## V9 music update

The game no longer generates its own ending melody.

Instead, it expects a file named exactly:

`music.mp4`

Place `music.mp4` in the same folder as:

- `index.html`
- `game.js`
- `style.css`

When the result screen appears, the game will:

1. load `music.mp4`
2. play it directly
3. loop it while the result screen is open
4. stop it and reset it when the game restarts

No online music service is used.

Important: the filename must be exactly `music.mp4` unless you also change the
filename in `game.js`.
