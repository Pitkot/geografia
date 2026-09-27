# MAPA 101

Edukacyjna aplikacja SPA do nauki 197 obiektów geograficznych z pliku `geografia.md`.

## Uruchomienie na Linuksie

Wymagany jest Node.js 18 lub nowszy. Projekt nie ma zewnętrznych zależności npm.

```bash
npm start
```

Następnie otwórz `http://localhost:4173`.

Możesz też użyć skryptu, który uruchomi serwer i automatycznie otworzy aplikację w przeglądarce:

```bash
./run.sh
```

## Uruchomienie na Windows bez Node.js

Wersja Windows korzysta wyłącznie z Windows PowerShell 5.1 i składników .NET obecnych standardowo w Windows 10 i Windows 11. Nie wymaga instalowania Node.js, npm, Pythona ani dodatkowych bibliotek.

1. Skopiuj lub rozpakuj cały folder aplikacji na komputerze z Windows.
2. Kliknij dwukrotnie plik `run-windows.bat`.
3. Zaczekaj na uruchomienie domyślnej przeglądarki.
4. Nie zamykaj okna `MAPA 101` podczas korzystania z aplikacji.

Aplikacja zostanie otwarta pod adresem `http://127.0.0.1:4173/`. Zamknięcie okna konsoli lub naciśnięcie `Ctrl+C` zatrzymuje lokalny serwer.

Serwer Windows nasłuchuje wyłącznie na komputerze lokalnym. Nie udostępnia aplikacji innym urządzeniom w sieci i nie wymaga uprawnień administratora ani zmian w Zaporze Windows.

Jeśli port `4173` jest zajęty, zamknij inną uruchomioną instancję aplikacji i ponownie kliknij `run-windows.bat`.

Nie należy uruchamiać `index.html` bezpośrednio z dysku, ponieważ przeglądarka może zablokować wczytanie lokalnego pliku JSON.

## Testy

```bash
npm test
npm run check
```

Testy sprawdzają między innymi:

- dokładnie 197 lokalizacji i 591 ciekawostek,
- komplet źródeł i metadanych zdjęć,
- długość i format wszystkich ciekawostek,
- projekcję współrzędnych na raster mapy,
- cztery unikalne odpowiedzi w sprawdzianie,
- kolejkę błędnych odpowiedzi i możliwość ich poprawiania do 100% skuteczności.

## Dane

- `src/data/locations.json` — gotowy lokalny katalog wykorzystywany przez aplikację,
- `scripts/manual-facts.json` — ręcznie zredagowane fakty dla krótszych lub niejednoznacznych haseł,
- `scripts/wiki-pages-cache.json` — lokalny cache materiałów źródłowych i metadanych obrazów,
- `scripts/build-data.mjs` — deterministyczny generator końcowego JSON-a.

Ponowne zbudowanie katalogu:

```bash
npm run build:data
```

Aplikacja nie wyszukuje ciekawostek podczas działania. Zdjęcia korzystają z wcześniej zapisanych adresów Wikimedia; gdy sieć lub obraz jest niedostępny, panel pokazuje kolorowy fallback.

## Sterowanie

- kliknięcie znacznika — karta miejsca i trzy ciekawostki,
- przeciąganie lub kółko myszy — przesuwanie i zoom mapy,
- strzałki lewo/prawo — poprzednie lub następne miejsce,
- cyfry 1–4 — odpowiedź w sprawdzianie,
- filtry regionów i kategorii — zawężenie mapy oraz puli pytań.

Nieprawidłowe odpowiedzi trafiają do sekcji „Popraw odpowiedzi”. Po poprawieniu wszystkich pomyłek aktualna skuteczność wraca do 100%.

Postęp sprawdzianu jest przechowywany w `localStorage` przeglądarki.