# Bild-Credits: Übungskatalog

Übungsbilder in `public/exercises/<id>/{0,1}.jpg` stammen aus zwei Open-Source-Quellen.
Beide werden über Skripte in `scripts/` bezogen und sind reproduzierbar.

## 1. Fotos: `yuhonas/free-exercise-db`

45 der 58 Übungen zeigen Fotos aus [yuhonas/free-exercise-db](https://github.com/yuhonas/free-exercise-db)
("Public Domain" laut Projekt-README). Zuordnung in `scripts/mapping.json`
(erzeugt von `scripts/generate-mapping.js`), Download über `scripts/download-images.ps1`.
Anzeige-Text: „Free Exercise DB (Public Domain)“.

## 2. Illustrationen: `@bryllim/workout-guide` (Everkinetic)

Für 13 Maschinen-/Kabelübungen, die im free-exercise-db-Datensatz keinen brauchbaren
Treffer haben, verwenden wir Strichzeichnungen aus
[bryllim/workout-guide](https://github.com/bryllim/workout-guide), lizenziert unter
**CC BY-SA 4.0**. Ursprung der Posen ist größtenteils
[Everkinetic](https://github.com/everkinetic/data) (ebenfalls CC BY-SA 4.0); wo
`manifest.json` keine Everkinetic-Quelle nennt, ist die Illustration eine
eigenständige Ergänzung von Bryl Lim unter derselben Lizenz.

**Vorgenommene Änderungen** (relevant für die Share-Alike-Pflicht, CC BY-SA 4.0
verlangt eine Angabe): Die Original-SVGs sind weiße Linien auf transparentem Grund
(für das Dark-Theme der workout-guide-Website). Für unsere Übungskarten wurden sie
mit `sharp` rasterisiert, auf Schwarz geflacht, invertiert (→ schwarze Linien auf
weißem Grund) und als JPEG (1024×1024) exportiert. Skript: `scripts/fetch-workout-guide-images.mjs`.
Anzeige-Text: „Illustration: Bryl Lim / workout-guide, nach Everkinetic (CC BY-SA 4.0)“.

Lizenztext: <https://creativecommons.org/licenses/by-sa/4.0/legalcode>

| Übung (id) | workout-guide-Slug | Ausgangsquelle |
| --- | --- | --- |
| `ex_abduktoren` | [hip-abduction-machine](https://bryllim.github.io/workout-guide/exercises/hip-abduction-machine) | Bryl Lim (eigene Ergänzung) |
| `ex_adduktoren` | [hip-adduction-machine](https://bryllim.github.io/workout-guide/exercises/hip-adduction-machine) | Bryl Lim (eigene Ergänzung) |
| `ex_beinbeuger_sitzend` | [seated-leg-curl](https://bryllim.github.io/workout-guide/exercises/seated-leg-curl) | [Everkinetic 0119](https://github.com/everkinetic/data/blob/main/dist/svg/0119-tension.svg) |
| `ex_brustpresse` | [machine-chest-press](https://bryllim.github.io/workout-guide/exercises/machine-chest-press) | [Everkinetic 0066](https://github.com/everkinetic/data/blob/main/dist/svg/0066-tension.svg) |
| `ex_einarm_rudern` | [one-arm-dumbbell-row](https://bryllim.github.io/workout-guide/exercises/one-arm-dumbbell-row) | Bryl Lim (eigene Ergänzung) |
| `ex_kabel_seitheben` | [cable-lateral-raise](https://bryllim.github.io/workout-guide/exercises/cable-lateral-raise) | Bryl Lim (eigene Ergänzung) |
| `ex_latzug_eng` | [close-grip-lat-pulldown](https://bryllim.github.io/workout-guide/exercises/close-grip-lat-pulldown) | [Everkinetic 0096](https://github.com/everkinetic/data/blob/main/dist/svg/0096-tension.svg) |
| `ex_rueckenstrecker` | [back-extension](https://bryllim.github.io/workout-guide/exercises/back-extension) | [Everkinetic 0103](https://github.com/everkinetic/data/blob/main/dist/svg/0103-tension.svg) |
| `ex_schulterpresse_maschine` | [machine-shoulder-press](https://bryllim.github.io/workout-guide/exercises/machine-shoulder-press) | Bryl Lim (eigene Ergänzung) |
| `ex_seitheben_maschine` | [machine-lateral-raise](https://bryllim.github.io/workout-guide/exercises/machine-lateral-raise) | Bryl Lim (eigene Ergänzung) |
| `ex_trizeps_ueberkopf_seil` | [overhead-tricep-extension](https://bryllim.github.io/workout-guide/exercises/overhead-tricep-extension) | Bryl Lim (eigene Ergänzung) |
| `ex_trizepsmaschine` | [tricep-pushdown](https://bryllim.github.io/workout-guide/exercises/tricep-pushdown) (Näherung: Kabel- statt Maschinen-Pushdown, kein exakter Treffer verfügbar) | [Everkinetic 0205](https://github.com/everkinetic/data/blob/main/dist/svg/0205-tension.svg) |
| `ex_wadenheben_sitzend` | [seated-calf-raise](https://bryllim.github.io/workout-guide/exercises/seated-calf-raise) | [Everkinetic 0279](https://github.com/everkinetic/data/blob/main/dist/svg/0279-tension.svg) |

Volle Metadaten (Frame-URLs, genaue Attribution je Bild) in `scripts/mapping-workout-guide.json`.

## Geprüfte, aber nicht verwendete Quellen

- **wger-project** (`wger.de`, CC BY-SA 3.0/4.0, öffentliche API): deckt dieselben 13
  Übungen ebenfalls ab, allerdings mit uneinheitlicher Bildqualität und mindestens
  einem Bild, dessen `license_derivative_source_url` auf ein fremdes, kommerzielles
  Foto (fitnessvolt.com) verweist — rechtlich unklar genug, um es zu vermeiden.
  workout-guide/Everkinetic lieferte für alle 13 Übungen einen saubereren, passenderen
  Treffer, daher wurde wger nicht eingebunden.
- **ExerciseDB (RapidAPI) / MuscleWiki API**: kommerziell, Download/Offline-Speicherung
  der Bilder vertraglich ausgeschlossen — keine Option für einen selbst gehosteten Katalog.
