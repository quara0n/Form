# Referansebilder til FAL

Dette er det valgte bildeutvalget for de 33 nye apparatøvelsene per 24.09.2026: ett `kort-XX-start.png` per øvelse, og åtte `kort-XX-slutt.png` der en bestemt topp- eller bunnposisjon hjelper videogenereringen. Bildene er samlet i én mappe slik at de kan lastes opp til FAL uten å hente filer fra andre mapper.

[manifest.json](manifest.json) kobler hvert kortnummer og øvelsesnavn til riktig `firstFrame` og eventuell `lastFrame`. Hashverdiene kan brukes til å kontrollere at filene er uendret ved opplasting. Startbildene er kopier av de valgte referansebildene i videoleveransen; sluttbildene er de vurderte posisjonsbildene brukt til H3 Max.

For kort 29 ga FAL best bevegelse med sluttbildet som første FAL-ramme og startbildet som siste. Se `falFirstFrame`, `falLastFrame` og `postprocess` i manifestet før en ny generering.

Kort 1–6 og 11 hadde video fra før. Kort 13, 16 og 38 finnes i biblioteket. Kort 12, 36, 43, 44 og 47 er fjernet. Ingen av disse er med i denne mappen.
