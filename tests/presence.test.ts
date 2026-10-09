import assert from "node:assert/strict";

/**
 * Testes unitários para a máquina de estados e temporização do Presence.
 * Garante que:
 * 1. Entrada monta imediatamente.
 * 2. Saída mantém elemento montado com flag `isExiting` durante a animação.
 * 3. Após o tempo da animação, o elemento é desmontado (`shouldRender = false`).
 * 4. Alternâncias rápidas (rapid toggles) cancelam o timer de saída sem engasgos.
 */

interface PresenceState {
  shouldRender: boolean;
  isExiting: boolean;
}

class PresenceController {
  private isVisible: boolean;
  private durationMs: number;
  private state: PresenceState;
  private timer: NodeJS.Timeout | null = null;

  constructor(initialVisible: boolean, durationMs: number = 200) {
    this.isVisible = initialVisible;
    this.durationMs = durationMs;
    this.state = {
      shouldRender: initialVisible,
      isExiting: false,
    };
  }

  getState(): PresenceState {
    return { ...this.state };
  }

  setVisible(visible: boolean) {
    if (this.isVisible === visible) return;
    this.isVisible = visible;

    if (visible) {
      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }
      this.state = {
        shouldRender: true,
        isExiting: false,
      };
    } else {
      if (this.state.shouldRender) {
        this.state.isExiting = true;
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(() => {
          this.state = {
            shouldRender: false,
            isExiting: false,
          };
          this.timer = null;
        }, this.durationMs);
      }
    }
  }

  destroy() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

async function runPresenceTests() {
  console.log("Iniciando testes de Presence...");

  // Teste 1: Estado inicial fechado
  {
    const controller = new PresenceController(false, 100);
    const state = controller.getState();
    assert.equal(state.shouldRender, false, "Inicial fechado não deve renderizar");
    assert.equal(state.isExiting, false, "Não deve estar saindo inicialmente");
    controller.destroy();
  }

  // Teste 2: Entrada imediata
  {
    const controller = new PresenceController(false, 100);
    controller.setVisible(true);
    const state = controller.getState();
    assert.equal(state.shouldRender, true, "Ao abrir, deve renderizar imediatamente");
    assert.equal(state.isExiting, false, "Não deve estar no estado saindo");
    controller.destroy();
  }

  // Teste 3: Saída com animação e unmount após duration
  {
    const controller = new PresenceController(true, 100);
    controller.setVisible(false);
    
    // Imediatamente após fechar: deve continuar renderizado, mas marcado como isExiting
    let state = controller.getState();
    assert.equal(state.shouldRender, true, "Durante a animação de saída, ainda deve renderizar");
    assert.equal(state.isExiting, true, "Deve marcar isExiting como true");

    // Aguarda o término da animação
    await new Promise((r) => setTimeout(r, 120));

    state = controller.getState();
    assert.equal(state.shouldRender, false, "Após durationMs, deve desmontar (shouldRender = false)");
    assert.equal(state.isExiting, false, "isExiting deve resetar para false");
    controller.destroy();
  }

  // Teste 4: Alternância rápida (abrir -> fechar -> reabrir antes do timeout)
  {
    const controller = new PresenceController(true, 100);
    controller.setVisible(false);
    assert.equal(controller.getState().isExiting, true);

    // Reabre antes do tempo de 100ms
    await new Promise((r) => setTimeout(r, 30));
    controller.setVisible(true);

    const state = controller.getState();
    assert.equal(state.shouldRender, true, "Deve manter renderizado ao reabrir");
    assert.equal(state.isExiting, false, "Deve cancelar o estado de saída imediatamente");

    // Aguarda tempo que seria do timeout original para garantir que não desmonta indevidamente
    await new Promise((r) => setTimeout(r, 100));
    assert.equal(controller.getState().shouldRender, true, "Não deve ter desmontado pelo timer antigo");
    controller.destroy();
  }

  console.log("✅ Todos os testes de Presence passaram com sucesso!");
}

runPresenceTests().catch((err) => {
  console.error("❌ Falha nos testes de Presence:", err);
  process.exit(1);
});
