# External media sources — V7

## Chiikawa character animation

V7 uses a calmer transparent GIPHY sticker for the player character.

GIPHY page:
https://giphy.com/stickers/transparent-yeibee-chiikawa-V2MRU5wYxmNEtBTgCx

Runtime GIF:
https://media4.giphy.com/media/V2MRU5wYxmNEtBTgCx/giphy.gif

It is used as a transparent sticker, so the game displays the character rather
than a rectangular image background.

The local `chiikawa.svg` remains the fallback.

## Ending music

The official Chiikawa anime site lists:

`ひとりごつ`

as the ending theme, sung by Hachiware (CV: Masato Tanaka).

Official anime site:
https://www.anime-chiikawa.jp/

V7 plays the music directly inside the result screen through a hidden YouTube
embed. There is no Spotify button/link in the game.

The ZIP does not redistribute a copied audio file.

Chiikawa characters and music remain third-party intellectual property. Review
the relevant rights and platform terms before public redistribution.


## V8 ending music

The ending music has no external source.

It is an original melody synthesized locally in `game.js` using the browser's
Web Audio API. No music platform, video platform, audio CDN, iframe, or ad
service is used.


## V9 ending music

V9 does not ship an ending-music file.

Add a local file named `music.mp4` beside `index.html`.
The game plays that local file directly with the browser Audio API.
