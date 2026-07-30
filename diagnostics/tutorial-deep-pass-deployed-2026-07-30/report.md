# Deep pass del tutorial deployed — 30 luglio 2026

## Esito sintetico

Il pass è stato eseguito come un giocatore sulla build pubblica:

- URL: <https://va2k0r.github.io/DeltaV/?debug=1&build=ae8d0be>
- commit applicativo: `ae8d0be1de1a3d2d9172a47f6d82326887b2aed0`
- viewport osservato: 1770 × 1243 px
- percorso: tutorial completo, hand-off alla partita normale e stress fino al turno visivo 36
- prove raccolte: 61 screenshot, 7 serie FPS, GameState dei difetti e GameState finale

Non ho trovato violazioni del regolamento o blocchi del tutorial. Ho però riprodotto tre
problemi visivi concreti nelle preview BURN/FIRE, un clipping della console e due problemi di
comprensione. La scena finale non scende sotto 60 FPS nei campioni visibili, ma presenta
micro-stutter: modalità adattiva `minimal`, 12 frame oltre 20 ms e un picco di 45,7 ms in una
finestra di 1,45 s.

La diagnosi del dump finale indica un collo di bottiglia CPU/main-thread e di submission delle
draw call, non GPU. La soluzione prestazionale è preparata nella sezione
[Piano prestazionale da applicare](#piano-prestazionale-da-applicare); non è stata implementata
in questo pass.

## Metodo

Ho usato esclusivamente la build GitHub Pages, non il dev server locale. Ho eseguito il tutorial
con click, zoom, pan, replay e selezioni errate come farebbe un giocatore, controllando lo schermo
dopo ogni transizione importante.

Edge case stressati:

- target FIRE errato durante un prompt vincolato;
- BURN cortissimo verso una luna, BURN lungo tra pianeti e BURN da un nodo CONTESTED;
- FIRE ravvicinato e FIRE di supporto a grande distanza;
- due lanci obbligatori, incluso un tentativo verso un nodo già al limite di navi;
- CONTESTED, upkeep ΔV, EVADE bloccato, distruzione della nave e replay temporale;
- rewind e resume del log;
- hand-off dal tutorial alla partita normale;
- scena piena con 23 corpi, 22 nodi, 7 navi, 2 transiti e 3 missili.

I valori FPS sono letti dall'output visibile `Frames per second`. Il drawer diagnostico può
alterare leggermente il carico e il contatore è smussato; per questo il dump finale, che include
frame pacing e tempi per sezione, è la fonte principale per la diagnosi.

## Problemi trovati

### DV-VIS-01 — Prima riga della console tagliata

- Severità: P2, bug visivo/leggibilità.
- Riproduzione: durante BURN/FIRE, fare zoom o pan quando il transcript ha iniziato lo
  scrollback.
- Osservato: la prima riga visibile resta parzialmente sopra il bordo superiore della console.
  Si vede in [05-burn-preview-zoomed.png](screens/05-burn-preview-zoomed.png),
  [18-fire-preview-zoomed.png](screens/18-fire-preview-zoomed.png) e
  [28-burn-pretzel-zoomed.png](screens/28-burn-pretzel-zoomed.png).
- Stato: [VIS-001-console-clipped-burn-preview.json](states/VIS-001-console-clipped-burn-preview.json).
- Causa probabile: lo scroll può fermarsi a una posizione frazionaria in una console flex con
  headroom collassabile; manca un allineamento del blocco/riga superiore.
- Correzione proposta: portare sempre il blocco attivo a `block: end` senza lasciare una riga
  parziale, aggiungere uno `scroll-padding-top` pari almeno a una line-height e un test visuale
  con transcript lungo a più aspect ratio.

### DV-VIS-02 — Preview BURN a “pretzel” con quasi auto-intersezione

- Severità: P1, bug visivo che rende ambigua la rotta.
- Riproduzione: al turno 13, da Mars CONTESTED selezionare il BURN corto verso Deimos T+1 e
  fare zoom sul sistema locale.
- Osservato: la curva ciano crea un doppio loop/bow-tie, quasi si interseca e si sovrappone
  agli anelli CONTESTED. Non è chiaro quale sia la direzione di viaggio.
- Evidenza: [27-disengage-nearby-preview.png](screens/27-disengage-nearby-preview.png) e
  [28-burn-pretzel-zoomed.png](screens/28-burn-pretzel-zoomed.png).
- Stato e camera:
  [VIS-005-burn-preview-pretzel.json](states/VIS-005-burn-preview-pretzel.json),
  [VIS-005-camera-pose.json](states/VIS-005-camera-pose.json).
- Causa probabile nel renderer: la traiettoria zoom-stable viene chiusa con un destination loop
  anche quando trasferimento, inserzione e anello locale occupano quasi la stessa area a schermo.
- Correzione proposta: audit di auto-intersezione in screen space; per trasferimenti corti
  scegliere il verso di loop con minor curvatura oppure omettere il loop se separazione e raggio
  proiettati scendono sotto soglia. Aggiungere un golden test Mars→Deimos T+1.

### DV-VIS-03 — Preview FIRE scollegata dalla sorgente

- Severità: P1, bug visivo e di comprensione.
- Riproduzione: FIRE Mars→Phobos T-2, poi zoom.
- Osservato: il segmento rosso appare sospeso nello spazio e non sembra partire da Mars né
  arrivare al bersaglio. La relazione con la traiettoria viola del bersaglio è comprensibile
  solo dopo aver visto l'animazione completa.
- Evidenza: [17-fire-preview-phobos.png](screens/17-fire-preview-phobos.png) e
  [18-fire-preview-zoomed.png](screens/18-fire-preview-zoomed.png).
- Stato: [VIS-003-fire-preview-disconnected.json](states/VIS-003-fire-preview-disconnected.json).
- Causa probabile nel renderer: `getFirePreviewDisplayPath()` taglia la curva prima del marker
  d'impatto usando il massimo fra raggio globale del marker, minimo in pixel e gap. In alcuni
  rapporti zoom/distanza resta soltanto una porzione centrale della soluzione.
- Correzione proposta: preservare un tratto continuo visibile dall'origine, ridurre
  progressivamente gap/marker quando il trimming supera una percentuale della curva e validare
  che il primo punto renderizzato resti entro una soglia in pixel dal lanciatore.

### DV-VIS-04 — FIRE di supporto quasi invisibile nella vista sistema

- Severità: P2, bug di scala/readability; probabilmente stessa famiglia di DV-VIS-03.
- Riproduzione: FIRE Saturn→Mars T-5 con l'intero sistema in vista.
- Osservato: soluzione e marker diventano una piccola “V” rossa isolata; la provenienza da
  Saturn non è leggibile.
- Evidenza: [43-support-fire-preview.png](screens/43-support-fire-preview.png).
- Stato: [VIS-006-support-fire-preview-tiny.json](states/VIS-006-support-fire-preview-tiny.json).
- Correzione proposta: dimensioni minime in screen space per bracci, reticolo e segmento;
  collegamento sorgente→intercetto a opacità ridotta ma sempre presente; label con origine,
  bersaglio e T−n ancorata al marker.

### DV-UX-01 — Posizione futura del bersaglio non spiegata abbastanza

- Severità: P2, comprensione delle regole.
- Osservato: una rotta lunga può sembrare diretta nel vuoto perché il corpo corrente, il ghost
  futuro e il timing link non hanno una legenda. La regola è corretta, ma il giocatore deve
  dedurre che il cerchio tratteggiato è la posizione all'arrivo/impatto.
- Evidenza: [08-shipyard-burn-preview.png](screens/08-shipyard-burn-preview.png) e
  [18-fire-preview-zoomed.png](screens/18-fire-preview-zoomed.png).
- Stato: [UX-001-long-burn-preview-misses-current-target.json](states/UX-001-long-burn-preview-misses-current-target.json).
- Correzione proposta: prima comparsa con label `POSITION AT T+3` / `IMPACT AT T-2`, una breve
  riga tutorial e un leader più evidente dal corpo corrente al ghost.

### DV-UX-02 — Hand-off dal tutorial poco esplicito

- Severità: P3, comprensione/progressione.
- Osservato: dopo il riepilogo e il replay, il runtime passa correttamente da tutorial a partita
  normale (`runtime.tutorial: null`), ma a schermo non appare un messaggio inequivocabile
  `TUTORIAL COMPLETE`. Premendo EXECUTE si continua con turni normali e un'ultima spiegazione
  sull'EVADE/WORK automatico; il giocatore può pensare che il tutorial non sia terminato.
- Evidenza:
  [56-tutorial-complete.png](screens/56-tutorial-complete.png),
  [57-after-final-execute.png](screens/57-after-final-execute.png) e
  [58-turn36-clean.png](screens/58-turn36-clean.png).
- Stato finale: [FINAL-turn-36-deep-pass.json](states/FINAL-turn-36-deep-pass.json).
- Correzione proposta: riga distinta `TUTORIAL COMPLETE — LIVE MATCH CONTINUES`, oppure un
  piccolo pannello con `CONTINUE MATCH` / `RETURN TO MENU`.

## Tremolio e flicker

Non ho riprodotto tremolio geometrico della UI, dei label o delle preview. Tre screenshot a
120 ms di distanza nella fase CONTESTED mostrano geometria e layout stabili:

- [24-contested-frame-0.png](screens/24-contested-frame-0.png)
- [24-contested-frame-1.png](screens/24-contested-frame-1.png)
- [24-contested-frame-2.png](screens/24-contested-frame-2.png)

La variazione di opacità della riga `Left click to confirm burn` è il blink intenzionale definito
da `tutorial-live-hint-blink`, non jitter. Anche i coni neri delle ombre passano dietro la console:
possono ridurre localmente la pulizia visiva, ma non ho confermato un errore di z-index o una
maschera che nasconda il testo.

## Regole ed edge case

Esito delle prove:

| Caso | Risultato |
| --- | --- |
| FIRE sul target tutorial errato | Bloccato con `TUTORIAL LOCKED`; nessun ordine spurio |
| FIRE e WORK nello stesso turno | La regola viene spiegata e l'ordine resta coerente |
| Nave su nodo CONTESTED | Upkeep di 2 ΔV applicato; WORK/EVADE vietati |
| EVADE di nave CONTESTED | `EVADE BLOCKED — CONTESTED`, poi perdita nave all'impatto |
| Lancio obbligatorio su nodo già pieno | `OVER SHIP PRESENT`; nessun crash o ordine invalido |
| Lancio obbligatorio verso destinazione valida | Ordine creato e risolto |
| FIRE su nave in transito | Target futuro e impatto risolti correttamente |
| Replay del primo equipaggio perso | Primo click spiega, secondo rewind, terzo resume |
| Hand-off tutorial→match | Stato tutorial rimosso e partita normale prosegue |

Non è emerso un bug del regolamento. Il problema maggiore di comprensione è che la grafica FIRE
non comunica sempre la stessa correttezza che possiede la simulazione.

## Performance

### Campioni FPS visibili

| Fase | Min | Media | Max |
| --- | ---: | ---: | ---: |
| Landing | 78,0 | 85,64 | 91,5 |
| BURN preview con menu/debug | 106,8 | 107,98 | 109,2 |
| BURN lungo | 95,4 | 99,17 | 110,6 |
| FIRE preview | 103,2 | 113,55 | 128,5 |
| CONTESTED | 98,8 | 109,47 | 119,3 |
| Sistema pieno/produzione | 84,3 | 90,12 | 104,7 |
| Turno visivo 36, sistema pieno | 71,7 | 76,38 | 80,6 |

Serie complete: [fps-samples.csv](fps-samples.csv).

Il calo medio dal FIRE preview al turno visivo 36 è di circa il 32,7%. Non si osserva un crollo
sotto 60 FPS, ma il solo FPS medio nasconde frame lunghi percepibili.

### Profilo del GameState finale

Dal dump finale:

- modalità adattiva: `minimal`;
- FPS stimati interni: 68,14;
- frame smussato: 14,68 ms;
- finestra frame pacing: 1,45 s;
- 12 frame oltre 20 ms, 1 frame oltre 30 ms, massimo 45,7 ms;
- GPU media 0,87 ms, massimo 1,29 ms;
- frame CPU medio 11,10 ms;
- `sceneRender` medio 6,14 ms;
- `baseRender` medio 4,51 ms;
- `fireTargets` medio 3,32 ms, massimo 16,87 ms;
- `presentationOnly` medio 3,53 ms;
- `bodyAnimation` medio 2,08 ms;
- 2.132 scene object, 749 geometrie, 337 draw call e 295.567 triangoli.

Interpretazione: la GPU termina molto prima del frame budget. Il costo dominante è sul
main-thread: aggiornamenti di presentazione, ricostruzione/sincronizzazione dei target FIRE e
submission di centinaia di oggetti/draw call. Ridurre solo risoluzione o triangoli non risolverà
il problema principale.

Il build di produzione segnala inoltre un chunk applicativo da circa 1,44 MB (381,54 kB gzip) e
il vendor Three da circa 569 kB (143,86 kB gzip): è soprattutto un tema di caricamento iniziale,
separato dal frame pacing in partita.

## Piano prestazionale da applicare

### 1. Benchmark ripetibile prima delle modifiche

- Creare uno script debug che riproduca i GameState salvati di Turn 9, 12, 28 e 35.
- Registrare per 10 s: frame p50/p95/p99, frame >20/>30 ms, tempi `fireTargets`,
  `presentationOnly`, `bodyAnimation`, draw call, oggetti e geometrie.
- Target iniziali alla stessa viewport: p95 <16,7 ms, p99 <25 ms, nessun frame >30 ms dopo
  warm-up, media ≥90 FPS al turno finale.

### 2. Fermare il lavoro FIRE quando lo stato non cambia

- Rendere `renderFireFutureTargetPreview` e la generazione di timing dots/ruler/marker
  dipendenti da una signature dirty: turno visivo, camera quantizzata, hover, target e ordini.
- Conservare mesh/geometry e aggiornare solo uniform/opacity; evitare remove/add e rebuild per
  frame.
- Primo obiettivo: `fireTargets` medio <0,8 ms e massimo <4 ms.

### 3. Ridurre draw call e scene object

- Instanziare o unire orbit rails, ring, timing dots, tick e componenti ripetuti delle navi.
- Condividere BufferGeometry e Material immutabili; tenere separati solo gli elementi realmente
  animati o interattivi.
- Obiettivo prudente: <200 draw call, <1.300 scene object, <450 geometrie nella scena finale.

### 4. Alleggerire la presentazione per-frame

- Spostare `time`, `beat`, `sunPosition` e parametri condivisi in uniform comuni dove possibile.
- Aggiornare animazioni dettagliate dei corpi a 30 Hz in modalità `reduced/minimal`, mantenendo
  camera e selezione a refresh pieno.
- Saltare rotazioni, cloud e glow dei corpi fuori frustum o con proiezione sub-pixel.
- Obiettivo: `presentationOnly` <2 ms e `bodyAnimation` <1 ms.

### 5. Mantenere l'adaptive governor come rete di sicurezza

- Non usare il governor come soluzione primaria: nel campione finale è già `minimal`.
- Farlo reagire a p95/p99 e long-frame rate, non soltanto alla media smussata.
- Esportare nel GameState il motivo dell'ultimo downgrade per distinguere CPU, GPU e spike di
  rebuild.

### 6. Separare il caricamento dal rendering

- Lazy-load di tutorial/glossario/debug e strumenti diagnostici.
- Verificare con bundle analyzer quali moduli alimentano il chunk applicativo da 1,44 MB.
- Questa fase migliora startup e cache, ma viene dopo gli interventi sul frame pacing.

## Verifica della build pubblicata

Il workflow GitHub Pages del commit applicativo è completato con successo:

- run: <https://github.com/va2k0r/DeltaV/actions/runs/30545588529>
- test: 47 file, 565 test superati;
- typecheck: superato;
- lint: superato;
- build: superato.

Una prima esecuzione locale di `npm run verify` mentre la scena 3D deployed era attiva ha
prodotto 17 timeout su 565 test, senza failure di assertion. Una seconda esecuzione del profilo
parallelo standard, sotto il carico della sessione Codex, ha prodotto 6 timeout su 565 test,
ancora senza failure di assertion. La verifica finale seriale prevista dal workflow Pages è
invece passata integralmente dopo la generazione del report:

- `npm test -- --no-file-parallelism --testTimeout=30000`: 47 file, 565 test superati;
- `npm run typecheck`: superato;
- `npm run lint`: superato;
- `npm run build`: superato.
