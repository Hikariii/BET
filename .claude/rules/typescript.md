---
name: typescript
description: TypeScript-regels voor de redactietool in redactietool/.
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# TypeScript

Kies het strengste type dat de waarde toelaat; maak een type nooit breder om een aanroep stil te krijgen.

## Logica voor één eenheid hoort bij die eenheid

Een functie die maar door één module of klasse gebruikt wordt, staat daar. Een losse `export function` heeft een tweede gebruiker nodig, of een genoemde reden.

## Nooit schrijven tegen een `@deprecated` symbool

Nieuwe code gebruikt nooit iets met `@deprecated`; neem de vervanging die de tag noemt.

## Splits een type in zijn delen

Een genest object krijgt een eigen benoemd type; niet exporteren tenzij een ander bestand het nodig heeft.

```typescript
// Goed
type Herkomst = {
	soort: 'bron' | 'log' | 'open-vraag' | 'boek' | 'suggestie' | 'eigen tekst';
	verwijzing: string;
};

export type Handeling = {
	van: string;
	naar: string;
	herkomst: Herkomst;
};

// Fout: herkomst als anoniem object in Handeling
```

## Liever geen optionele velden

Geen `?` tenzij het echt moet; liever verplichte velden met een expliciete waarde. Een ontbrekend optioneel veld kan "niet gezet", "niet van toepassing", "onwaar" of "nog niet gemigreerd" betekenen.

Wel acceptabel: een veld dat voor een deel van de varianten niet bestaat in een discriminated union, of een extern formaat (bijvoorbeeld de Google Drive API) dat optionele velden heeft.

Meer dan twee toestanden: een union, geen gestapelde optionele booleans (`status: 'akkoord' | 'aangepast' | 'vraag'`, niet `akkoord?: boolean; vraag?: boolean`).

## Normaliseer nullable waarden aan de rand

Types die je zelf bezit zijn niet nullable. Kan een rand `null` opleveren (een leeg bestand op Drive, een ontbrekend veld in opgeslagen JSON), normaliseer dan één keer waar het binnenkomt en geef een niet-nullable type door. Een waarde met één logische lege vorm (`[]`, `''`) is geen `T | null`.

## Echte nullability: `| null`, nooit `| undefined`

Is een waarde echt nullable (geen logische lege vorm), dan is het `T | null`. Verschil tussen producent en gebruiker: maak de `| undefined`-kant `| null`, nooit `?? undefined` bij de aanroep.

## Typereparaties behouden het gedrag

Een type-fout die tot een keuze dwingt, is geen vrijbrief om ander gedrag te repareren. Los het type op met het huidige gedrag; meld het verborgen probleem in de PR.
