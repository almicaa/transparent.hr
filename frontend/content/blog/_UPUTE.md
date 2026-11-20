# Kako dodati članak na blog

Ova datoteka počinje s `_` pa se ne prikazuje na stranici. Služi samo kao uputa.

## 1. Napravi novu datoteku

U ovoj mapi (`frontend/content/blog/`) napravi datoteku čije ime postaje adresa članka:

- `bruto-ili-neto.md` → `transparent.hr/blog/bruto-ili-neto`

Ime piši malim slovima, bez kvačica i razmaka, a riječi odvoji crticom (`kako-pregovarati-o-placi.md`).

## 2. Na vrh datoteke stavi ovo zaglavlje

```
---
title: Bruto ili neto: koliko ti zapravo sjedne na račun
description: Jedna do dvije rečenice o čemu je članak. Ovo se vidi na popisu članaka i u Googleu.
date: 2026-10-15
draft: true
---
```

- **title**: naslov članka
- **description**: kratki opis, najbolje do 160 znakova
- **date**: datum objave u obliku godina-mjesec-dan; članci su poredani od najnovijeg
- **draft**: `true` dok pišeš (članak vidiš samo lokalno, s oznakom „Nacrt”). Kad je spreman, stavi `false` ili obriši taj red, i članak se objavljuje.

## 3. Ispod zaglavlja piši tekst

```
Običan odlomak je samo tekst. Prazan red između odlomaka.

## Podnaslov

### Manji podnaslov

**podebljano** i *ukošeno*

- stavka liste
- još jedna stavka

1. numerirana lista
2. drugi korak

[tekst linka](https://transparent.hr/jobs)

> Istaknuti citat ili važna napomena (prikazuje se u narančastom okviru).

| Grana | Prosječna plaća |
|---|---|
| Turizam | 1.250 € |
```

Naslov članka ne treba ponovno pisati u tekstu, on se prikazuje iz zaglavlja.

## 4. Objava

Kad je `draft: false`, članak ide na stranicu sa sljedećim deployem. Link „Blog” u izborniku pojavljuje se automatski čim postoji barem jedan objavljeni članak.

## 5. Engleski prijevod (nije obavezan)

Engleska verzija članka ide u mapu `en/` (`frontend/content/blog/en/`), s engleskim imenom datoteke:

- `en/gross-or-net.md` → `transparent.hr/en/blog/gross-or-net`

Zaglavlje je isto, plus red `hr:` s imenom hrvatske datoteke (bez `.md`), da stranica zna da su to isti članak:

```
---
title: Gross or net: how much actually lands in your account
description: One or two sentences about the article.
date: 2026-10-15
draft: false
hr: bruto-ili-neto
---
```

Tada izbornik jezika s hrvatskog članka vodi ravno na engleski i obrnuto, a Google zna da je jedno prijevod drugog. Linkove unutar engleskog teksta piši s `/en` na početku (`/en/jobs`, `/en/blog/...`). Članak bez prijevoda vidi se samo na hrvatskom blogu.
