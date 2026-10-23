import assert from "node:assert/strict";
import { fuzzyNormalize, matchesFuzzyQuery } from "../src/lib/utils/search";

console.log("--- Testando normalização difusa (fuzzyNormalize) ---");

// Colapso de letras repetidas
assert.equal(fuzzyNormalize("anna"), "ana");
assert.equal(fuzzyNormalize("bassara"), "basara");
assert.equal(fuzzyNormalize("mattos"), "matos");
assert.equal(fuzzyNormalize("guarapuava"), "guarapuava");
assert.equal(fuzzyNormalize("colegio"), "colegio");
assert.equal(fuzzyNormalize("COLÉGIO"), "colegio");

console.log("✅ fuzzyNormalize OK");

console.log("--- Testando matchesFuzzyQuery ---");

const targetPOI = "Colégio Estadual Professora Ana Vanda Bassara";

// 1. Busca exata e parcial
assert.equal(matchesFuzzyQuery(targetPOI, "Ana Vanda"), true);
assert.equal(matchesFuzzyQuery(targetPOI, "professora"), true);

// 2. Busca tolerante a consoantes dobradas
assert.equal(matchesFuzzyQuery(targetPOI, "anna"), true);
assert.equal(matchesFuzzyQuery(targetPOI, "anna vanda"), true);
assert.equal(matchesFuzzyQuery(targetPOI, "bassara"), true);
assert.equal(matchesFuzzyQuery(targetPOI, "colegio anna vanda"), true);
assert.equal(matchesFuzzyQuery(targetPOI, "colegio anna vanda bassara"), true);

// 3. Busca insensível a acentos e maiúsculas
assert.equal(matchesFuzzyQuery(targetPOI, "colegio"), true);
assert.equal(matchesFuzzyQuery(targetPOI, "COLEGIO"), true);
assert.equal(matchesFuzzyQuery(targetPOI, "colégio"), true);

// 4. Múltiplos tokens fora de ordem
assert.equal(matchesFuzzyQuery(targetPOI, "bassara colegio vanda"), true);

// 5. Casos de borda
assert.equal(matchesFuzzyQuery(targetPOI, ""), true, "String vazia deve retornar true");
assert.equal(matchesFuzzyQuery(targetPOI, "   "), true, "Espaços em branco devem retornar true");
assert.equal(matchesFuzzyQuery("", "ana"), false, "Alvo vazio deve retornar false");
assert.equal(matchesFuzzyQuery(targetPOI, "termoinexistente123"), false, "Termo inexistente deve retornar false");

console.log("✅ matchesFuzzyQuery OK");
