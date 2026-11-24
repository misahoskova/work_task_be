# Evidence projektů a členů týmů – backend

REST API pro evidenci projektů, osob a týmů. Backend je jednou ze dvou částí aplikace, druhou je frontend v samostatném repozitáři.

Frontend: [work_task_fe](https://github.com/misahoskova/work_task_fe).
Celá aplikace včetně frontendu se spouští z jeho repozitáře, postup je v jeho README.

## Popis aplikace

Aplikace eviduje projekty a osoby, které na nich pracují.

- Projekt má název, popis, stav, datum zahájení a nepovinné datum ukončení.
- Osoba má jméno, příjmení, e-mail, pracovní pozici a patří právě do jednoho týmu.
- Osoba může být přiřazena k více projektům a projekt může mít více osob.
- K projektu lze přiřadit i celý tým. Detail projektu pak vrací všechny účastníky.

## Architektura

Aplikace se skládá ze tří částí:

- **Frontend** zobrazuje data a posílá požadavky na backend.
- **Backend** poskytuje REST API, validuje vstupy a pracuje s databází.
- **Databáze** PostgreSQL uchovává data.

Frontend a backend spolu komunikují jen přes HTTP ve formátu JSON. Backend o frontendu neví nic kromě adresy, ze které smí přicházet požadavky z prohlížeče (CORS).

Databáze se inicializuje sama. Backend při každém startu spustí migrace ze složky `drizzle`, takže na prázdné databázi vzniknou všechny tabulky bez ručního zásahu. Opakovaný start nic nemění.

## Spuštění

### Požadavky

- Docker s Docker Compose

### Postup

Zkopírujte soubor s ukázkovým nastavením a doplňte do něj vlastní hodnoty:

```bash
cp .env.example .env
```

Spusťte databázi, backend a pgAdmin:

```bash
docker compose up -d --build
```

Po spuštění je k dispozici:

| Služba          | Adresa                     | Poznámka                              |
| --------------- | -------------------------- | ------------------------------------- |
| Backend         | http://localhost:3001      | ověření: http://localhost:3001/health |
| Dokumentace API | http://localhost:3001/docs | Swagger UI                            |
| pgAdmin         | http://localhost:8888      | přihlášení údaji z `.env`             |
| Postgres        | localhost:5432             | přihlášení údaji z `.env`             |

V pgAdminu se databáze přidává ručně: hostitel `db`, port `5432`, uživatel, heslo a název databáze z `.env`.

Zastavení:

```bash
docker compose down
```

Zastavení včetně smazání dat:

```bash
docker compose down -v
```

### Proměnné prostředí

| Proměnná                   | Význam                                                                  |
| -------------------------- | ----------------------------------------------------------------------- |
| `POSTGRES_USER`            | uživatel databáze                                                       |
| `POSTGRES_PASSWORD`        | heslo databáze                                                          |
| `POSTGRES_DB`              | název databáze                                                          |
| `DATABASE_URL`             | adresa databáze pro vývoj mimo Docker, hostitel `localhost`             |
| `PGADMIN_DEFAULT_EMAIL`    | přihlašovací e-mail do pgAdminu                                         |
| `PGADMIN_DEFAULT_PASSWORD` | heslo do pgAdminu                                                       |
| `CORS_ORIGIN`              | adresa frontendu, nepovinné, výchozí hodnota je `http://localhost:3000` |

V kontejneru backendu se `DATABASE_URL` sestavuje v `docker-compose.yml` z údajů databáze a s hostitelem `db`.

### Lokální vývoj

Databáze běží v Dockeru, backend přímo na počítači s automatickým restartem při změně kódu:

```bash
docker compose up -d db
npm install
npm run dev
```

## Struktura projektu

| Cesta                   | Obsah                                                                                                     |
| ----------------------- | --------------------------------------------------------------------------------------------------------- |
| `src/index.ts`          | start aplikace: spuštění migrací a HTTP serveru                                                           |
| `src/app.ts`            | definice aplikace: CORS, bezpečnostní hlavičky, připojení rout, dokumentace API, jednotné zpracování chyb |
| `src/routes/`           | endpointy rozdělené podle entit: `teams.ts`, `persons.ts`, `projects.ts`                                  |
| `src/db/schema.ts`      | definice tabulek a vazeb v Drizzle                                                                        |
| `src/db/index.ts`       | připojení k databázi                                                                                      |
| `src/lib/validation.ts` | společná validace vstupů a jednotný formát chyby validace                                                 |
| `src/lib/responses.ts`  | schémata odpovědí pro dokumentaci API                                                                     |
| `drizzle/`              | SQL migrace vygenerované ze schématu                                                                      |
| `tests/`                | testy API                                                                                                 |
| `docs/`                 | ER diagram databáze                                                                                       |
| `Dockerfile`            | image backendu                                                                                            |
| `db/Dockerfile`         | image databáze                                                                                            |
| `docker-compose.yml`    | spuštění databáze, backendu a pgAdminu                                                                    |
| `.github/workflows/`    | kontroly spouštěné při každém pull requestu                                                               |
| `pgadmin/Dockerfile`    | image pgAdminu                                                                                            |

### Skripty

| Příkaz                 | Co dělá                                    |
| ---------------------- | ------------------------------------------ |
| `npm run dev`          | vývojový server s restartem při změně kódu |
| `npm run build`        | překlad TypeScriptu do složky `dist`       |
| `npm start`            | spuštění přeložené aplikace                |
| `npm run format`       | formátování kódu Prettierem                |
| `npm run format:check` | kontrola formátování bez úprav             |
| `npm run typecheck`    | kontrola typů                              |
| `npm run lint`         | kontrola kódu Oxlintem                     |
| `npm test`             | testy API                                  |
| `npm run db:generate`  | vygenerování migrace po změně schématu     |
| `npm run db:migrate`   | ruční spuštění migrací                     |

## Technologie

| Oblast            | Použito                              |
| ----------------- | ------------------------------------ |
| Jazyk a běh       | TypeScript, Node.js                  |
| HTTP server       | Hono, @hono/node-server              |
| Databáze          | PostgreSQL 18                        |
| Přístup k datům   | Drizzle ORM, drizzle-kit pro migrace |
| Testy             | Vitest                               |
| Kvalita kódu      | Prettier, Oxlint, kontrola typů      |
| Kontejnery        | Docker, Docker Compose               |
| Průběžné kontroly | GitHub Actions                       |
| Správa databáze   | pgAdmin                              |
| Validace vstupů   | zod, hono-openapi                    |
| Dokumentace API   | hono-openapi, Swagger UI             |

## API

Základní adresa při lokálním spuštění je `http://localhost:3001`. Požadavky i odpovědi jsou ve formátu JSON.

### Interaktivní dokumentace

Po spuštění backendu jsou k dispozici dvě adresy:

| Adresa                        | Obsah                                                          |
| ----------------------------- | -------------------------------------------------------------- |
| http://localhost:3001/docs    | stránka Swagger UI se všemi endpointy, které jde rovnou zkusit |
| http://localhost:3001/openapi | popis API ve formátu OpenAPI 3.1                               |

Popis se generuje z kódu. Vstupy se přebírají ze stejných zod schémat, která požadavky validují, odpovědi jsou popsané u jednotlivých rout přes `describeRoute`.

### Datové typy

**Tým**

| Pole   | Typ   | Poznámka                |
| ------ | ----- | ----------------------- |
| `id`   | číslo | přiděluje databáze      |
| `name` | text  | povinné, 1 až 200 znaků |

**Osoba**

| Pole       | Typ   | Poznámka                                                |
| ---------- | ----- | ------------------------------------------------------- |
| `id`       | číslo | přiděluje databáze                                      |
| `name`     | text  | povinné, 1 až 200 znaků                                 |
| `surname`  | text  | povinné, 1 až 200 znaků                                 |
| `email`    | text  | povinné, platný e-mail, unikátní                        |
| `position` | text  | `developer`, `analyst`, `project_manager` nebo `tester` |
| `teamId`   | číslo | povinné, musí odkazovat na existující tým               |

**Projekt**

| Pole          | Typ   | Poznámka                                            |
| ------------- | ----- | --------------------------------------------------- |
| `id`          | číslo | přiděluje databáze                                  |
| `name`        | text  | povinné, 1 až 200 znaků                             |
| `description` | text  | nepovinné, může být `null`                          |
| `state`       | text  | `Planned`, `In_progress` nebo `Done`                |
| `startDate`   | text  | povinné, datum ve tvaru `2026-11-16`                |
| `endDate`     | text  | nepovinné, může být `null`, ne dřív než `startDate` |

### Přehled endpointů

**Obecné**

| Metoda | Adresa    | Popis                | Kódy |
| ------ | --------- | -------------------- | ---- |
| GET    | `/health` | ověření, že API běží | 200  |

**Týmy**

| Metoda | Adresa       | Popis                | Kódy          |
| ------ | ------------ | -------------------- | ------------- |
| GET    | `/teams`     | seznam týmů          | 200           |
| GET    | `/teams/:id` | detail týmu se členy | 200, 404      |
| POST   | `/teams`     | vytvoření týmu       | 201, 400      |
| PATCH  | `/teams/:id` | úprava týmu          | 200, 400, 404 |
| DELETE | `/teams/:id` | smazání týmu         | 204, 404, 409 |

Tým, který má členy, smazat nejde. Odpověď je 409.

**Osoby**

| Metoda | Adresa         | Popis                             | Kódy               |
| ------ | -------------- | --------------------------------- | ------------------ |
| GET    | `/persons`     | seznam osob                       | 200                |
| GET    | `/persons/:id` | detail osoby s týmem a projekty   | 200, 404           |
| POST   | `/persons`     | vytvoření osoby                   | 201, 400, 409      |
| PATCH  | `/persons/:id` | úprava vybraných polí osoby       | 200, 400, 404, 409 |
| DELETE | `/persons/:id` | smazání osoby včetně jejích vazeb | 204, 404           |

Neexistující tým vrací 400, e-mail použitý jinou osobou 409. Detail osoby obsahuje projekty přiřazené přímo i přes její tým.

**Projekty**

| Metoda | Adresa                            | Popis                              | Kódy          |
| ------ | --------------------------------- | ---------------------------------- | ------------- |
| GET    | `/projects`                       | seznam projektů                    | 200           |
| GET    | `/projects/:id`                   | detail projektu s týmy a účastníky | 200, 404      |
| POST   | `/projects`                       | vytvoření projektu                 | 201, 400      |
| PATCH  | `/projects/:id`                   | úprava vybraných polí projektu     | 200, 400, 404 |
| DELETE | `/projects/:id`                   | smazání projektu včetně jeho vazeb | 204, 404      |
| PUT    | `/projects/:id/persons/:personId` | přiřazení osoby k projektu         | 204, 404      |
| DELETE | `/projects/:id/persons/:personId` | odebrání osoby z projektu          | 204, 404      |
| PUT    | `/projects/:id/teams/:teamId`     | přiřazení týmu k projektu          | 204, 404      |
| DELETE | `/projects/:id/teams/:teamId`     | odebrání týmu z projektu           | 204, 404      |

Opakované přiřazení téže osoby nebo týmu není chyba a vrací 204. Datum ukončení dřív než datum zahájení vrací 400.

### Chybové odpovědi

Všechny chyby mají stejný tvar:

```json
{ "code": "error", "message": "Tým nebyl nalezen" }
```

| Hodnota `code`     | Kdy nastane                                                       |
| ------------------ | ----------------------------------------------------------------- |
| `validation_error` | vstup neodpovídá pravidlům, odpověď navíc obsahuje pole `details` |
| `not_found`        | adresa neexistuje                                                 |
| `error`            | záměrná chyba routy, rozliší se stavovým kódem 400, 404 nebo 409  |
| `server_error`     | neočekávaná chyba na serveru, stavový kód 500                     |

Příklad chyby validace:

```json
{
  "code": "validation_error",
  "message": "Neplatný vstup",
  "details": [
    {
      "path": "name",
      "message": "Too small: expected string to have >=1 characters"
    }
  ]
}
```

### Příklady

**Vytvoření týmu**

```bash
curl -i -X POST http://localhost:3001/teams \
  -H 'Content-Type: application/json' \
  -d '{"name":"Papa"}'
```

Odpověď 201:

```json
{ "id": 1, "name": "Papa" }
```

**Vytvoření osoby**

```bash
curl -i -X POST http://localhost:3001/persons \
  -H 'Content-Type: application/json' \
  -d '{"name":"Jana","surname":"Nováková","email":"jana.novakova@example.cz","position":"developer","teamId":1}'
```

Odpověď 201:

```json
{
  "id": 1,
  "name": "Jana",
  "surname": "Nováková",
  "email": "jana.novakova@example.cz",
  "position": "developer",
  "teamId": 1
}
```

**Vytvoření projektu**

```bash
curl -i -X POST http://localhost:3001/projects \
  -H 'Content-Type: application/json' \
  -d '{"name":"Web","state":"Planned","startDate":"2026-11-16"}'
```

Odpověď 201:

```json
{
  "id": 1,
  "name": "Web",
  "description": null,
  "state": "Planned",
  "startDate": "2026-11-16",
  "endDate": null
}
```

**Přiřazení týmu k projektu**

```bash
curl -i -X PUT http://localhost:3001/projects/1/teams/1
```

Odpověď 204 bez těla.

**Přiřazení osoby k projektu**

```bash
curl -i -X PUT http://localhost:3001/projects/1/persons/1
```

Odpověď 204 bez těla.

**Detail projektu**

```bash
curl -i http://localhost:3001/projects/1
```

Odpověď 200:

```json
{
  "id": 1,
  "name": "Web",
  "description": null,
  "state": "Planned",
  "startDate": "2026-11-16",
  "endDate": null,
  "teams": [{ "id": 1, "name": "Papa" }],
  "participants": [
    {
      "id": 1,
      "name": "Jana",
      "surname": "Nováková",
      "email": "jana.novakova@example.cz",
      "position": "developer",
      "teamId": 1,
      "direct": true
    }
  ]
}
```

Jana je k projektu přiřazená přímo a zároveň je členkou přiřazeného týmu.
V poli `participants` je přesto jen jednou. Pole `direct` říká, jestli má účastník přímé přiřazení k projektu: `true` znamená, že ho lze odebrat přes `DELETE /projects/:id/persons/:personId`, `false` znamená, že je na projektu jen jako člen přiřazeného týmu.

**Detail osoby**

```bash
curl -i http://localhost:3001/persons/1
```

Odpověď 200:

```json
{
  "id": 1,
  "name": "Jana",
  "surname": "Nováková",
  "email": "jana.novakova@example.cz",
  "position": "developer",
  "teamId": 1,
  "team": { "id": 1, "name": "Papa" },
  "projects": [
    {
      "id": 1,
      "name": "Web",
      "description": null,
      "state": "Planned",
      "startDate": "2026-11-16",
      "endDate": null
    }
  ]
}
```

**Detail týmu**

```bash
curl -i http://localhost:3001/teams/1
```

Odpověď 200:

```json
{
  "id": 1,
  "name": "Papa",
  "members": [
    {
      "id": 1,
      "name": "Jana",
      "surname": "Nováková",
      "email": "jana.novakova@example.cz",
      "position": "developer",
      "teamId": 1
    }
  ]
}
```

**Úprava osoby**

```bash
curl -i -X PATCH http://localhost:3001/persons/1 \
  -H 'Content-Type: application/json' \
  -d '{"position":"tester"}'
```

Odpověď 200 s upravenou osobou.

**Pokus o smazání týmu se členy**

```bash
curl -i -X DELETE http://localhost:3001/teams/1
```

Odpověď 409:

```json
{ "code": "error", "message": "Tým má přiřazené osoby" }
```

## Databázové schéma

![ER diagram databáze](docs/Fyzicky_diagram_db.drawio.png)

Zdrojový soubor diagramu pro draw.io je ve složce `docs`.

### Tabulky

| Tabulka          | Účel                                    |
| ---------------- | --------------------------------------- |
| `team`           | týmy                                    |
| `person`         | osoby, každá s cizím klíčem na svůj tým |
| `project`        | projekty                                |
| `project_person` | vazba M:N mezi projekty a osobami       |
| `project_team`   | vazba M:N mezi projekty a týmy          |

### Vazby

- Tým a osoba: 1:N. Osoba patří právě do jednoho týmu.
- Projekt a osoba: M:N přes tabulku `project_person`.
- Projekt a tým: M:N přes tabulku `project_team`.

Vazební tabulky mají složený primární klíč z obou cizích klíčů, takže stejná dvojice nemůže vzniknout dvakrát.

### Pravidla mazání

- Smazání projektu odstraní jeho řádky v obou vazebních tabulkách.
- Smazání osoby odstraní její řádky v tabulce `project_person`.
- Smazání týmu odstraní jeho řádky v tabulce `project_team`.
- Tým, na který odkazuje nějaká osoba, smazat nejde.

### Změna schématu

Po úpravě `src/db/schema.ts` se nová migrace vytvoří příkazem:

```bash
npm run db:generate
```

Migrace se uloží do složky `drizzle` a backend ji při příštím startu spustí.

## Testy

Testy volají aplikaci přímo, bez spuštěného serveru, a pracují se skutečnou databází PostgreSQL. Před každým testem se obsah všech tabulek smaže.

Testy běží automaticky v GitHub Actions při každém pull requestu, kde si spouští vlastní dočasnou databázi.

Kvůli mazání dat obsahují testy pojistku: spustí se jen tehdy, když název databáze v `DATABASE_URL` končí na `_test`. S běžným souborem `.env` proto `npm test` skončí chybou a vývojová data zůstanou nedotčená.

Lokální spuštění proti samostatné testovací databázi:

```bash
DATABASE_URL=postgres://UZIVATEL:HESLO@localhost:5432/NAZEV_test npm test
```

Databáze s tímto názvem musí předem existovat. Tabulky si v ní testy vytvoří samy.

## Zabezpečení

Vstupy všech endpointů validuje zod. Neplatný požadavek skončí odpovědí 400 a do databáze se nedostane.

Dotazy do databáze jdou přes Drizzle ORM, které hodnoty od uživatele předává odděleně od textu dotazu.

CORS povoluje volání z prohlížeče jen z adresy frontendu nastavené v `CORS_ORIGIN`.

Odpovědi obsahují bezpečnostní hlavičky z mezikroku `secureHeaders`, například `X-Content-Type-Options: nosniff` a `X-Frame-Options: SAMEORIGIN`.

Součástí projektu není přihlašovací logika, protože ji zadání výslovně nevyžadovalo.
Kdokoli s přístupem k API může data číst i měnit.

## CI

Workflow `.github/workflows/ci.yml` se spouští při každém pull requestu a při každém pushi do hlavní větve. Provede instalaci závislostí, kontrolu formátování, kontrolu typů, lint, sestavení a testy.
