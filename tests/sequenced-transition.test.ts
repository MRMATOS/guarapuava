import assert from "node:assert/strict";

/**
 * Testes para a lógica de transição sequencial entre painéis (FilterPanel <-> OptionsPanel).
 * Garante que:
 * 1. Ao alternar entre painéis, o painel ativo fecha imediatamente.
 * 2. O novo painel aguarda a conclusão da animação de saída (190ms) antes de abrir.
 * 3. Nunca existem dois painéis abertos ou montados simultaneamente.
 * 4. Cancelamentos rápidos não deixam timers zumbis.
 */

class SequencedPanelsManager {
  public isFilterOpen = false;
  public isOptionsOpen = false;
  public pendingTarget: "filter" | "options" | null = null;
  private transitionTimer: NodeJS.Timeout | null = null;
  private durationMs: number;

  constructor(durationMs: number = 190) {
    this.durationMs = durationMs;
  }

  toggleOptions() {
    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }

    if (this.isOptionsOpen || this.pendingTarget === "options") {
      this.isOptionsOpen = false;
      this.pendingTarget = null;
      return;
    }

    if (this.isFilterOpen) {
      // Fecha o filtro primeiro
      this.isFilterOpen = false;
      this.pendingTarget = "options";
      this.transitionTimer = setTimeout(() => {
        this.isOptionsOpen = true;
        this.pendingTarget = null;
        this.transitionTimer = null;
      }, this.durationMs);
    } else {
      this.isOptionsOpen = true;
      this.pendingTarget = null;
    }
  }

  toggleFilter() {
    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }

    if (this.isFilterOpen || this.pendingTarget === "filter") {
      this.isFilterOpen = false;
      this.pendingTarget = null;
      return;
    }

    if (this.isOptionsOpen) {
      // Fecha as opções primeiro
      this.isOptionsOpen = false;
      this.pendingTarget = "filter";
      this.transitionTimer = setTimeout(() => {
        this.isFilterOpen = true;
        this.pendingTarget = null;
        this.transitionTimer = null;
      }, this.durationMs);
    } else {
      this.isFilterOpen = true;
      this.pendingTarget = null;
    }
  }

  closeAll() {
    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }
    this.isFilterOpen = false;
    this.isOptionsOpen = false;
    this.pendingTarget = null;
  }
}

async function runTests() {
  console.log("Iniciando testes de transição sequencial entre painéis...");

  // Teste 1: Abertura direta quando nenhum está aberto
  {
    const manager = new SequencedPanelsManager(100);
    manager.toggleOptions();
    assert.equal(manager.isOptionsOpen, true, "Options deve abrir imediatamente quando nada estiver aberto");
    assert.equal(manager.isFilterOpen, false);

    manager.closeAll();
    manager.toggleFilter();
    assert.equal(manager.isFilterOpen, true, "Filter deve abrir imediatamente quando nada estiver aberto");
    assert.equal(manager.isOptionsOpen, false);
    manager.closeAll();
  }

  // Teste 2: Transição de Filter -> Options (espera o filtro descer)
  {
    const manager = new SequencedPanelsManager(100);
    manager.toggleFilter();
    assert.equal(manager.isFilterOpen, true);

    // Clica em Opções
    manager.toggleOptions();
    // No instante 0: filtro fechou, opções ainda NÃO abriram
    assert.equal(manager.isFilterOpen, false, "Filtro deve iniciar saída imediatamente");
    assert.equal(manager.isOptionsOpen, false, "Opções NÃO devem abrir antes do fim da saída do filtro");
    assert.equal(manager.pendingTarget, "options", "Deve marcar opções como pendente");

    // Aguarda metade do tempo
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(manager.isOptionsOpen, false, "Aos 50ms ainda deve estar aguardando");

    // Aguarda o término da transição (100ms total)
    await new Promise((r) => setTimeout(r, 60));
    assert.equal(manager.isOptionsOpen, true, "Após o timeout, opções devem abrir");
    assert.equal(manager.pendingTarget, null);
    assert.equal(manager.isFilterOpen, false, "Filtro deve continuar fechado");
    manager.closeAll();
  }

  // Teste 3: Transição de Options -> Filter (espera as opções descerem)
  {
    const manager = new SequencedPanelsManager(100);
    manager.toggleOptions();
    assert.equal(manager.isOptionsOpen, true);

    // Clica em Filtrar
    manager.toggleFilter();
    assert.equal(manager.isOptionsOpen, false, "Opções devem iniciar saída imediatamente");
    assert.equal(manager.isFilterOpen, false, "Filtro NÃO deve abrir antes do fim da saída das opções");
    assert.equal(manager.pendingTarget, "filter");

    // Aguarda término da transição
    await new Promise((r) => setTimeout(r, 110));
    assert.equal(manager.isFilterOpen, true, "Filtro deve abrir após a saída das opções");
    assert.equal(manager.isOptionsOpen, false);
    assert.equal(manager.pendingTarget, null);
    manager.closeAll();
  }

  // Teste 4: Cancelamento rápido (clica Filtrar -> clica Opções -> clica Opções novamente para cancelar)
  {
    const manager = new SequencedPanelsManager(100);
    manager.toggleFilter();
    assert.equal(manager.isFilterOpen, true);

    manager.toggleOptions(); // agenda opções
    assert.equal(manager.pendingTarget, "options");

    // Antes de 100ms, usuário clica em Opções novamente (cancela)
    await new Promise((r) => setTimeout(r, 30));
    manager.toggleOptions();
    assert.equal(manager.pendingTarget, null);
    assert.equal(manager.isOptionsOpen, false);

    // Aguarda o tempo original do timer para certificar que nenhum painel fantasma abre
    await new Promise((r) => setTimeout(r, 100));
    assert.equal(manager.isOptionsOpen, false, "Nenhum painel fantasma deve ter aberto");
    assert.equal(manager.isFilterOpen, false);
    manager.closeAll();
  }

  console.log("✅ Todos os testes de transição sequencial passaram com sucesso!");
}

runTests().catch((err) => {
  console.error("❌ Falha no teste de transição sequencial:", err);
  process.exit(1);
});
