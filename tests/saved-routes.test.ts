import assert from "node:assert/strict";

// Configura mock de localStorage e window para simular ambiente do navegador
const storage = new Map<string, string>();
(globalThis as unknown as { window: unknown }).window = {
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {},
};
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
};

async function run() {
  const {
    saveRoute,
    getSavedRoutes,
    isRouteSaved,
    deleteSavedRoute,
  } = await import("../src/lib/bus/saved-routes");

  console.log("--- Testando persistência de rotas salvas de ônibus ---");

  const mockOrigem = {
    linha: { id: "l1", codigo: "01", nomeExibicao: "Linha 01", bairro: "Centro", tipo: "regular" as const, pontos: [] },
    ponto: { id: "p1", nome: "Ponto Praça Central", rua: "Rua XV", bairro: "Centro", ordem: 1, horariosUteis: [], horariosSabado: [], horariosDomingo: [] },
  };

  const mockDestino = {
    linha: { id: "l1", codigo: "01", nomeExibicao: "Linha 01", bairro: "Centro", tipo: "regular" as const, pontos: [] },
    ponto: { id: "p2", nome: "Ponto Unicentro", rua: "Rua Simeão", bairro: "Santa Cruz", ordem: 2, horariosUteis: [], horariosSabado: [], horariosDomingo: [] },
  };

  // 1. Inicialmente não deve haver rotas salvas
  assert.deepEqual(getSavedRoutes(), []);
  assert.equal(isRouteSaved("p1", "p2"), false);

  // 2. Salva uma nova rota
  const saved = saveRoute(mockOrigem, mockDestino);
  assert.ok(saved.id, "Rota salva deve conter um ID gerado");
  assert.equal(isRouteSaved("p1", "p2"), true, "isRouteSaved deve confirmar rota salva");

  const routesAfterSave = getSavedRoutes();
  assert.equal(routesAfterSave.length, 1);
  assert.equal(routesAfterSave[0].id, saved.id);

  // 3. Tenta salvar a mesma rota novamente (não deve duplicar)
  const duplicate = saveRoute(mockOrigem, mockDestino);
  assert.equal(duplicate.id, saved.id, "Rota idêntica deve retornar a rota existente");
  assert.equal(getSavedRoutes().length, 1, "Não deve criar duplicata");

  // 4. Salva uma segunda rota diferente
  const mockDestino2 = {
    linha: { id: "l2", codigo: "02", nomeExibicao: "Linha 02", bairro: "Bonsucesso", tipo: "regular" as const, pontos: [] },
    ponto: { id: "p3", nome: "Ponto Parque do Lago", rua: "Rua Padre Chagas", bairro: "Bonsucesso", ordem: 3, horariosUteis: [], horariosSabado: [], horariosDomingo: [] },
  };
  const saved2 = saveRoute(mockOrigem, mockDestino2);
  assert.equal(getSavedRoutes().length, 2);
  assert.equal(isRouteSaved("p1", "p3"), true);

  // 5. Exclui a primeira rota
  deleteSavedRoute(saved.id);
  const routesAfterDelete = getSavedRoutes();
  assert.equal(routesAfterDelete.length, 1);
  assert.equal(routesAfterDelete[0].id, saved2.id);
  assert.equal(isRouteSaved("p1", "p2"), false, "Rota excluída não deve mais constar como salva");
  assert.equal(isRouteSaved("p1", "p3"), true, "Segunda rota deve permanecer salva");

  console.log("✅ Persistência e gerenciamento de rotas salvas OK");
}

run().catch((err) => {
  console.error("❌ Falha nos testes de rotas salvas:", err);
  process.exit(1);
});
