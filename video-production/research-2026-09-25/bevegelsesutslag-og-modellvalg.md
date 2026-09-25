# Revisjon av bevegelsesutslag og valg av videomodell

25. september 2026. Dette er en faglig og teknisk prøveplan, ikke en godkjenning av de eksisterende klippene.

## Funn i de leverte videoene

| Kort | Observasjon fra 0 og 2,5 sekunder | Beslutning |
| --- | --- | --- |
| 07, strake rygghev | [Start](frames/kort-07-0.png): overkroppen er omtrent vannrett, ikke i tydelig nedre stilling. [Topp](frames/kort-07-2_5.png): omtrent på linje med bena. Klippet viser derfor hovedsakelig øvre del av banen. | Lag nytt startbilde i en klart lavere, men komfortabel hoftebøy. Generer på nytt. |
| 25, stående tåhev | [Start](frames/kort-25-0.png) og [topp](frames/kort-25-2_5.png): hælen har for lite synlig utslag i forhold til den hevede tåplaten. Klippet er satt sammen av en kort fase og reversering. | Forkast som instruksjonsvideo. Lag nytt bilde med hælen tydelig nedenfor platens *overflate*. |
| 27, sittende tåhev | [Start](frames/kort-27-0.png) viser noe hælsenkning; [topp](frames/kort-27-2_5.png) viser løft. Utslaget er likevel lite og bør vurderes i normal avspillingsstørrelse. | Ny QA før videre bruk. Ikke slå dette sammen med de stående tåhevvariantene. |
| 29, sittende tåpress | [Start](frames/kort-29-0.png) og [topp](frames/kort-29-2_5.png) viser liten bevegelse. | Ny QA; tydelig ankelutslag og stabil knestilling må vises. |
| 32, stående tåhev | [Start](frames/kort-32-0.png) og [topp](frames/kort-32-2_5.png): for liten synlig senkning og heving. Klippet er satt sammen av en kort fase og reversering. | Forkast som instruksjonsvideo og prøv på nytt. |

Tidligere `qa: approved` for disse klippene bygget på for svak kontroll av ytterstillingene. Andre klipp er ikke automatisk frikjent av denne undersøkelsen. For tåhev betyr «nedenfor nivå» under *toppen av en hevet fotplate*, ikke under gulvet. En maskin med føttene på gulvet kan ikke vise dette utslaget.

## Hovedårsak

De eksisterende tekstpromptene sier allerede «lower the heels below platform level» og «torso folded forward at the hips». Teksten korrigerer ikke at bilde 07 starter omtrent horisontalt og at tåhevbildene ikke viser en entydig dyp bunnstilling. Bilde-til-video bevarer visuell inngang og lager en plausibel, ofte for liten bevegelse. Et enkelt startbilde og fem sekunders tekst gir ingen garanti for mellomposisjon eller anatomisk korrekt bevegelsesbane. Reversering av et kort akseptabelt segment lager en pen syklus, men gjenoppretter ikke manglende bevegelsesutslag.

## Referansebilder som må lages

For hvert kort: samme kvinne, klær, apparat, apparatets kontaktpunkter, kamera, utsnitt og lys i alle bilder. Vis hele kroppen, fotplaten og det som faktisk beveger seg. Unngå at puter eller stativ skjuler ankelen eller hofteleddet. Kontroller bildene mot en korrekt demonstrasjon av *samme type apparat* før videogenerering.

1. **Bunn/start:** reell startstilling, ikke halvveis i bevegelsen. For rygghev: overkroppen tydelig hengende ned ved hoftebøy, lårene støttet, føttene festet. For tåhev: tåballene på kanten av en hevet plate, hælene fritt bak kanten og tydelig nedenfor platens overflate, kneet i riktig stilling for varianten.
2. **Topp:** rygghev stopper når kroppen er på linje, uten overstrekk. Tåhev viser hælene klart løftet, mens tåballene fortsatt har kontakt med platen og knærne ikke driver en knebøy eller benpress.
3. **Retur:** lik bunn som i første bilde. Dette må faktisk nås før klippets slutt.

Sjekk at ansikt, maskin og leddplassering er konsistente mellom bildene. Hvis bildet av bunnstillingen ikke er biomekanisk mulig på apparatet, må bildet endres før en videomodell brukes.

## Modellvalg og kostnad

| Tilnærming | Hva den styrer | Pris for 5 sekunder hos fal, 25.09.2026 | Vurdering |
| --- | --- | ---: | --- |
| [MiniMax H3 Max, bilde til video](https://fal.ai/models/minimax/h3-max/image-to-video) | Startbilde, eventuelt sluttbilde og tekst | $0,20 ved 768p i kampanje; oppgitt $0,40 etter 30. september | Billigst per forsøk, men nåværende resultater viser at tekst ikke sikrer fullt utslag. Test bare med korrigerte ytterstillinger. |
| [Kling 2.6 Motion Control Standard](https://fal.ai/models/fal-ai/kling-video/v2.6/standard/motion-control) | Karakterbilde **og en faktisk bevegelsesvideo** | $0,35 | Rimeligste verifiserte modell her med bevegelsesvideo. Første pilotvalg hvis vi har egen eller lisensiert demonstrasjon. |
| [Kling 3 Motion Control Standard](https://fal.ai/models/fal-ai/kling-video/v3/standard/motion-control) | Karakterbilde **og en faktisk bevegelsesvideo** | $0,63 | Andre pilotvalg hvis 2.6 ikke bevarer identitet eller bevegelse godt nok. |

Pris er per generert klipp, uten kostnad for mislykkede forsøk, bildeproduksjon eller ekstra redigering. En dyrere modell er ikke nødvendigvis bedre for apparatmekanikk. [Runways veiledning for Kling 3 Motion Control](https://help.runwayml.com/hc/en-us/articles/50280558448147-Creating-with-Kling-3-0-Motion-Control) beskriver video som den primære bevegelsesreferansen og anbefaler én synlig person, kontinuerlig opptak, synlige lemmer og lik kroppsvinkel. Apparater skjuler ofte lemmer og kan derfor gi feil overføring selv med denne modellen. Leverandøren garanterer ikke klinisk korrekt bevegelsesbane.

Billigste *pålitelige* løsning kan være å filme de fem sekundene selv med riktig apparat, fast kamera og samtykke til bruk, og deretter bruke opptaket som bevegelsesreferanse. Vi må ha rettigheter til referansevideoen. Dersom identisk person er viktigere enn modellens visuelle nytegning av maskinen, kan originalt opptak med henne være enklere enn generering. Ingen gratis løsning er dokumentert her som gir samme kontroll og kvalitet for alle apparatøvelser.

## Pilot før flere videokjøp

Bruk kort 07 og 25 som test, fordi feilene er tydelige og lett å vurdere. Spill inn eller skaff lovlig fem sekunders video av korrekt bevegelse på tilsvarende apparat, med fast sidekamera og nøytral bakgrunn. Bruk den samme kvinnen i et klart karakterbilde, med tilsvarende vinkel og synlige lemmer. Kjør én Kling 2.6-generering per kort. Sammenlign med én H3-generering per kort fra korrigert start- og toppbilde. Test Kling 3 bare hvis 2.6 viser lovende mekanikk, men har visuelle feil.

**Godkjenningskrav:** Ved start og slutt når rygghev faktisk den nedre hoftebøyen; ved midten når hun bare til nøytral linje. Ankler og føtter er låst til apparatet. Ved tåhev er tåballene på platen hele tiden, hælen er synlig nedenfor platens overflate i bunn og tydelig hevet i topp, knærne holder riktig vinkel, og apparatets last følger bevegelsen. Ingen ekstra repetisjoner, endring av apparat eller glidende kontaktpunkter. Kontroller hele klippet, ikke bare tre utvalgte bilder. Ved feil: avvis forsøket; ikke merk det godkjent etter trimming eller reversering.

## Korte promptforslag

Prompt er støtte til riktig referanse, ikke hovedkilden til bevegelsesbanen. Send engelsk prompt til modellen.

**Rygghev, til bevegelsesvideo eller korrigerte nøkkelbilder:**

> One fixed side-view shot of exactly one controlled 45-degree back-extension repetition. Begin in the visibly lowered position: hips flexed, torso hanging downward below horizontal, thighs supported and feet secured. Raise by hinging at the hips until head, torso and legs form one straight line. Do not arch above that line. Lower all the way back to the same visible bottom position. The hips are the moving joint; the feet, pads and bench remain fixed. Preserve the same woman and exact machine. No camera movement, cuts or extra repetitions.

**Stående tåhev, til bevegelsesvideo eller korrigerte nøkkelbilder:**

> One fixed side-view shot of exactly one standing calf raise. At the start, the balls of both feet rest on the edge of a raised footplate and both unsupported heels hang clearly below the *top surface of that plate*. With knees nearly straight and stable, lift both heels high by moving only at the ankles. Pause briefly, then lower both heels below the plate surface again. Keep the balls of the feet planted, the shoulder pads in contact, and the machine connected to the movement. Same woman and exact machine throughout. No squat, leg press, foot sliding, camera movement, cuts or extra repetitions.

**Sittende tåhev:** Bytt «knees nearly straight» til «knees remain bent at the same angle beneath the thigh pads» og behold resten av ankel- og platekravene.

## Kilder til utførelse

- [ExRx: 45° Hyperextension](https://exrx.net/WeightExercises/ErectorSpinae/BW45HyperextensionHips): senk til mild strekk eller omtrent vinkelrett overkropp mot bena; individuelt bevegelsesutslag varierer. Putens plassering må ikke hindre nedre stilling.
- [ExRx: Lever 45° Calf Raise](https://exrx.net/WeightExercises/Gastrocnemius/LV45CalfRaise): tåballer på fotplattform, hæler utenfor kanten; hev hælene høyt og senk til leggen strekkes.

Øvelsesbeskrivelsene er generelle referanser. Endelig godkjenning for et rehabiliteringsbibliotek bør gjøres mot den konkrete apparatvarianten og ønsket pasientgruppe.
