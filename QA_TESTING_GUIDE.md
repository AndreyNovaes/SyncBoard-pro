# Guia de Testes de QA - SyncBoard Pro

Este guia fornece cenários de teste detalhados para validar o comportamento do SyncBoard Pro, focando em desafios de sincronização, race conditions e testes multi-sessão.

## 🎯 Objetivos dos Testes

O SyncBoard Pro foi arquitetado para **deliberadamente expor** desafios complexos de QA:

1. Sincronização de estado entre múltiplas sessões
2. Condições de corrida e resolução de conflitos
3. Rastreamento de cursores em tempo real
4. Controle de acesso baseado em papéis (RBAC)
5. Performance sob carga (stress testing)

## 🛠️ Preparação do Ambiente de Testes

### Configuração Inicial

1. **Servidor WebSocket rodando**: `cd websocket-server && npm start`
2. **Frontend rodando**: `cd frontend && npm run dev`
3. **Múltiplos navegadores/janelas**: Use Chrome, Firefox, Safari, ou janelas incógnito

### Ferramentas Recomendadas

- **Playwright** ou **Cypress**: Para automação de testes E2E
- **Navegadores DevTools**: Para monitorar WebSocket e performance
- **Console dos Navegadores**: Para logs de debug
- **Logs do Servidor**: Terminal onde o WebSocket está rodando

## 📋 Cenários de Teste

---

## 1️⃣ TESTE: Sincronização Básica Multi-Sessão

**Objetivo**: Validar que objetos criados em uma sessão aparecem instantaneamente em outras.

### Passos:

1. Abrir **Navegador A**: `http://localhost:3000/board/test-sync`
   - Nome: "Usuário A"
   - Papel: Editor

2. Abrir **Navegador B**: `http://localhost:3000/board/test-sync`
   - Nome: "Usuário B"
   - Papel: Editor

3. No **Navegador A**:
   - Clicar em "📝 Nota Adesiva"
   - Clicar no quadro para criar uma nota

4. **Validar** no **Navegador B**:
   - A nota deve aparecer imediatamente (<100ms)
   - A nota deve ter a mesma posição, texto e cor

### Critérios de Sucesso:
- ✅ Objeto aparece em todas as sessões
- ✅ Latência < 100ms
- ✅ Estado visual idêntico em todas as sessões

### Automação com Playwright:

```javascript
test('sincronização básica multi-sessão', async ({ browser }) => {
  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();

  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();

  await pageA.goto('http://localhost:3000/board/test-sync');
  await pageB.goto('http://localhost:3000/board/test-sync');

  // Criar objeto no navegador A
  await pageA.click('[data-testid="tool-sticky-note"]');
  await pageA.click('.board-canvas', { position: { x: 200, y: 200 } });

  // Esperar objeto aparecer no navegador B
  await pageB.waitForSelector('[data-testid^="board-object-"]', { timeout: 1000 });

  // Validar que o objeto está presente
  const objectsInB = await pageB.$$('[data-testid^="board-object-"]');
  expect(objectsInB.length).toBeGreaterThan(0);
});
```

---

## 2️⃣ TESTE: Condição de Corrida (Race Condition)

**Objetivo**: Validar que o servidor resolve conflitos usando Last Write Wins.

### Passos:

1. Abrir **Navegador A**: `http://localhost:3000/board/race-test`
   - Nome: "Usuário A"
   - Papel: Editor

2. No **Navegador A**:
   - Clicar no botão **"🏁 Race Test"**

3. **Observar**:
   - Console do navegador
   - Logs do servidor WebSocket

4. **Validar**:
   - Um objeto de teste é criado
   - Duas mensagens MOVE são enviadas quase simultaneamente
   - O objeto termina na posição da **última mensagem** (posição B: 400, 400)

### Critérios de Sucesso:
- ✅ Servidor loga "RACE CONDITION TEST INICIADO"
- ✅ Servidor loga "CONFLITO DETECTADO"
- ✅ Objeto final na posição (400, 400)
- ✅ Last Write Wins aplicado corretamente

### Automação com Playwright:

```javascript
test('resolução de race condition', async ({ page }) => {
  await page.goto('http://localhost:3000/board/race-test');

  // Disparar teste de race condition
  await page.click('[data-testid="trigger-race-condition"]');

  // Aguardar resolução
  await page.waitForTimeout(500);

  // Encontrar o objeto de teste
  const raceObject = await page.$('[data-testid="board-object-race-test-object"]');
  expect(raceObject).not.toBeNull();

  // Validar posição final (deve ser 400, 400 - última escrita)
  const position = await raceObject.boundingBox();
  expect(position.x).toBeCloseTo(400, 10);
  expect(position.y).toBeCloseTo(400, 10);
});
```

---

## 3️⃣ TESTE: Rastreamento de Cursores em Tempo Real

**Objetivo**: Validar que cursores de outros usuários são renderizados em tempo real.

### Passos:

1. Abrir **Navegador A**: `http://localhost:3000/board/cursor-test`
   - Nome: "Alice"
   - Papel: Editor

2. Abrir **Navegador B**: `http://localhost:3000/board/cursor-test`
   - Nome: "Bob"
   - Papel: Editor

3. No **Navegador A**:
   - Mover o mouse pelo quadro

4. **Validar** no **Navegador B**:
   - Um cursor com o nome "Alice" deve aparecer
   - O cursor deve seguir o movimento do mouse de Alice
   - Latência < 100ms

5. **Validar** no **Navegador A**:
   - Um cursor com o nome "Bob" deve aparecer quando Bob mover o mouse

### Critérios de Sucesso:
- ✅ Cursores de outros usuários são visíveis
- ✅ Cursores seguem movimento em tempo real
- ✅ Cada cursor tem nome e cor únicos
- ✅ Cursor do próprio usuário não é renderizado

### Automação com Playwright:

```javascript
test('rastreamento de cursores', async ({ browser }) => {
  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();

  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();

  await pageA.goto('http://localhost:3000/board/cursor-test');
  await pageB.goto('http://localhost:3000/board/cursor-test');

  // Mover mouse no navegador A
  await pageA.mouse.move(200, 200);
  await pageA.mouse.move(300, 300);

  // Aguardar cursor aparecer no navegador B
  await pageB.waitForSelector('[data-testid^="cursor-"]', { timeout: 1000 });

  // Validar que cursor está visível
  const cursors = await pageB.$$('[data-testid^="cursor-"]');
  expect(cursors.length).toBe(1);

  // Validar movimento do cursor
  const cursorPosition = await cursors[0].boundingBox();
  expect(cursorPosition.x).toBeCloseTo(300, 50);
  expect(cursorPosition.y).toBeCloseTo(300, 50);
});
```

---

## 4️⃣ TESTE: Controle de Acesso (RBAC) - Viewer

**Objetivo**: Validar que usuários com papel "Viewer" não podem editar.

### Passos:

1. Abrir **Navegador**: `http://localhost:3000/board/rbac-test`
   - Nome: "Viewer User"
   - Papel: **Viewer** (importante!)

2. **Validar UI**:
   - Botão "📝 Nota Adesiva" deve estar **desabilitado** (opacity 50%)
   - Botão "✏️ Caneta" deve estar **desabilitado**
   - Badge "👁️ Viewer" deve estar visível na Toolbar

3. **Tentar** clicar em "📝 Nota Adesiva":
   - Nada deve acontecer (botão desabilitado)

4. **Tentar** via Console do DevTools:
   ```javascript
   // Tentar forçar criação via WebSocket
   // Isso deve ser rejeitado pelo servidor
   ```

5. **Validar** nos logs do servidor:
   - Deve logar: "Tentativa bloqueada: viewer tentou criar objeto"
   - Cliente deve receber mensagem de erro

### Critérios de Sucesso:
- ✅ Botões de edição desabilitados para Viewer
- ✅ Badge "Viewer" visível
- ✅ Tentativas de edição bloqueadas pela UI
- ✅ Tentativas de edição bloqueadas pelo servidor
- ✅ Mensagem de erro enviada ao cliente

### Automação com Playwright:

```javascript
test('viewer não pode editar', async ({ page }) => {
  await page.goto('http://localhost:3000/board/rbac-test');

  // Selecionar papel Viewer
  await page.click('button:has-text("👁️ Viewer")');
  await page.click('button:has-text("Entrar no Quadro")');

  // Validar que botão de nota está desabilitado
  const stickyButton = await page.$('[data-testid="tool-sticky-note"]');
  const isDisabled = await stickyButton.isDisabled();
  expect(isDisabled).toBe(true);

  // Validar badge Viewer
  const viewerBadge = await page.$('text=👁️ Viewer');
  expect(viewerBadge).not.toBeNull();
});
```

---

## 5️⃣ TESTE: Controle de Acesso (RBAC) - Editor

**Objetivo**: Validar que usuários com papel "Editor" podem editar livremente.

### Passos:

1. Abrir **Navegador**: `http://localhost:3000/board/rbac-test`
   - Nome: "Editor User"
   - Papel: **Editor**

2. **Validar UI**:
   - Botão "📝 Nota Adesiva" deve estar **habilitado**
   - Badge "✏️ Editor" deve estar visível

3. **Criar** uma nota adesiva:
   - Clicar em "📝 Nota Adesiva"
   - Clicar no quadro
   - Nota deve ser criada

4. **Editar** a nota:
   - Dar duplo-clique na nota
   - Alterar o texto
   - Clicar fora (blur)
   - Texto deve ser atualizado

5. **Deletar** a nota:
   - Clicar no botão "×" da nota
   - Nota deve desaparecer

### Critérios de Sucesso:
- ✅ Botões de edição habilitados
- ✅ Badge "Editor" visível
- ✅ Pode criar objetos
- ✅ Pode editar objetos
- ✅ Pode deletar objetos

---

## 6️⃣ TESTE: Estresse e Performance

**Objetivo**: Validar performance sob carga pesada (500+ objetos).

### Passos:

1. Abrir **Navegador**: `http://localhost:3000/board/stress-test`
   - Nome: "Tester"
   - Papel: Editor

2. Clicar no botão **"⚡ Stress Test"**

3. **Observar**:
   - Console do navegador (tempo de criação)
   - FPS do navegador (DevTools > Performance)
   - Uso de memória

4. Após criação dos 500 objetos:
   - Tentar **arrastar** um objeto
   - Tentar **aplicar zoom** (Ctrl + Scroll)
   - Medir **tempo de resposta**

### Critérios de Sucesso:
- ✅ 500 objetos criados com sucesso
- ✅ Tempo de criação < 10 segundos
- ✅ FPS > 30 após criação
- ✅ Arrastar objetos ainda responsivo
- ✅ Sem travamentos ou crashes

### Métricas a Coletar:

```javascript
// No console do navegador
console.time('stress-test');
// Clicar no botão
console.timeEnd('stress-test');

// Medir FPS
const fps = await page.evaluate(() => {
  return new Promise((resolve) => {
    requestAnimationFrame((t1) => {
      requestAnimationFrame((t2) => {
        resolve(1000 / (t2 - t1));
      });
    });
  });
});
```

---

## 7️⃣ TESTE: Desconexão e Reconexão

**Objetivo**: Validar reconexão automática após perda de conexão.

### Passos:

1. Abrir **Navegador**: `http://localhost:3000/board/reconnect-test`
   - Nome: "User"
   - Papel: Editor

2. Criar algumas notas adesivas

3. **Desconectar** o servidor WebSocket:
   - Parar o servidor: `Ctrl+C` no terminal do websocket-server

4. **Validar** no navegador:
   - Status de conexão muda para "Desconectado" (bolinha vermelha)
   - Mensagem de erro pode aparecer

5. **Reconectar** o servidor:
   - Iniciar novamente: `npm start`

6. **Validar** no navegador:
   - Status de conexão volta para "Conectado" (bolinha verde)
   - Estado sincronizado (objetos reaparecem)

### Critérios de Sucesso:
- ✅ Desconexão detectada e exibida
- ✅ Reconexão automática após 3 segundos
- ✅ Estado sincronizado após reconexão
- ✅ Máximo 5 tentativas de reconexão

---

## 8️⃣ TESTE: Múltiplos Usuários Concorrentes

**Objetivo**: Validar comportamento com 10+ usuários simultâneos.

### Passos:

1. Abrir **10 navegadores/abas**: `http://localhost:3000/board/multi-user`
   - Nomes diferentes para cada um

2. Em cada navegador, criar 5 objetos cada

3. **Validar**:
   - Total de 50 objetos visíveis em todos os navegadores
   - Nenhuma perda de mensagens
   - Performance aceitável

### Script de Automação:

```javascript
test('10 usuários concorrentes', async ({ browser }) => {
  const contexts = [];
  const pages = [];

  // Criar 10 contextos/páginas
  for (let i = 0; i < 10; i++) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('http://localhost:3000/board/multi-user');
    contexts.push(context);
    pages.push(page);
  }

  // Cada usuário cria 5 objetos
  for (let i = 0; i < pages.length; i++) {
    for (let j = 0; j < 5; j++) {
      await pages[i].click('[data-testid="tool-sticky-note"]');
      await pages[i].click('.board-canvas', {
        position: { x: Math.random() * 500, y: Math.random() * 500 }
      });
    }
  }

  // Validar que todos os 50 objetos estão visíveis em todos os navegadores
  for (const page of pages) {
    const objects = await page.$$('[data-testid^="board-object-"]');
    expect(objects.length).toBe(50);
  }
});
```

---

## 🔍 Checklist de Testes Completo

### Funcionalidades Básicas
- [ ] Criar nota adesiva
- [ ] Editar texto da nota (duplo-clique)
- [ ] Mover nota (arrastar)
- [ ] Deletar nota (botão ×)
- [ ] Trocar de ferramenta (Selecionar, Caneta, Nota)

### Sincronização
- [ ] Objeto criado em A aparece em B
- [ ] Objeto movido em A atualiza em B
- [ ] Objeto editado em A atualiza em B
- [ ] Objeto deletado em A desaparece em B
- [ ] Latência < 100ms

### Cursores
- [ ] Cursor de outro usuário visível
- [ ] Cursor segue movimento em tempo real
- [ ] Nome e cor do usuário exibidos
- [ ] Cursor desaparece quando usuário sai

### RBAC
- [ ] Viewer: botões de edição desabilitados
- [ ] Viewer: tentativas de edição bloqueadas
- [ ] Viewer: mensagem de erro recebida
- [ ] Editor: pode criar, editar e deletar

### Race Conditions
- [ ] Botão de race test funciona
- [ ] Conflito resolvido com Last Write Wins
- [ ] Logs do servidor corretos

### Performance
- [ ] Stress test cria 500 objetos
- [ ] FPS > 30 após stress test
- [ ] Arrastar objetos ainda responsivo
- [ ] Sem memory leaks

### Robustez
- [ ] Reconexão automática funciona
- [ ] Estado sincronizado após reconexão
- [ ] 10+ usuários simultâneos funcionam
- [ ] Nenhuma perda de mensagens

---

## 📊 Métricas Recomendadas

### Latência
- **Objetivo**: < 100ms entre ação e sincronização
- **Como medir**: `timestamp_recebido - timestamp_enviado`

### Throughput
- **Objetivo**: > 100 mensagens/segundo
- **Como medir**: Contar mensagens em window de 1 segundo

### FPS
- **Objetivo**: > 30 FPS com 500+ objetos
- **Como medir**: Chrome DevTools > Performance

### Memory Usage
- **Objetivo**: < 200MB após 1000 objetos
- **Como medir**: Chrome DevTools > Memory

---

## 🐛 Problemas Conhecidos (Intencionais)

Estes são bugs **intencionais** para prática de QA:

1. **Race Condition em Drag Rápido**: Arrastar muito rápido pode causar saltos
2. **Cursor Lag**: 10+ cursores degradam performance
3. **No Persistence**: Estado perdido ao reiniciar servidor
4. **No Deduplication**: Mensagens duplicadas não são filtradas

---

## 📝 Relatório de Teste Sugerido

```markdown
# Relatório de Teste - SyncBoard Pro

**Data**: YYYY-MM-DD
**Testador**: Seu Nome
**Ambiente**: Chrome 120, localhost

## Resumo Executivo
- Total de testes: 8
- Passou: X
- Falhou: Y
- Bugs encontrados: Z

## Detalhes dos Testes

### ✅ TESTE 1: Sincronização Básica
- **Status**: PASSOU
- **Latência medida**: 45ms
- **Observações**: Funcionou perfeitamente

### ❌ TESTE 2: Race Condition
- **Status**: FALHOU
- **Problema**: Objeto terminou em posição errada
- **Screenshot**: [anexar]
- **Logs**: [anexar]

...
```

---

**Boa sorte nos testes! 🚀**
