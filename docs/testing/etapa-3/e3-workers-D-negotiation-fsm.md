# CERNIQ.APP — TESTE E3: NEGOTIATION FSM

## Teste pentru XState negotiation machine

**Categorie:** D | **Workeri:** 8

---

## TESTE

```typescript
describe('Negotiation FSM', () => {
  it('should start in greeting state', () => {
    const fsm = createNegotiationMachine();
    fsm.start();
    expect(fsm.state.value).toBe('greeting');
  });
  
  it('should transition greeting → discovery', () => {
    const fsm = createNegotiationMachine();
    fsm.start();
    fsm.send('USER_INQUIRY');
    expect(fsm.state.value).toBe('discovery');
  });
  
  it('should transition to proposal', () => {
    const fsm = createNegotiationMachine();
    fsm.start();
    fsm.send('USER_INQUIRY');
    fsm.send('NEEDS_IDENTIFIED');
    expect(fsm.state.value).toBe('proposal');
  });
  
  it('should require HITL for large discount', () => {
    const fsm = createNegotiationMachine();
    fsm.start();
    fsm.send('REQUEST_DISCOUNT', { percent: 20 });
    expect(fsm.state.value).toBe('pending_approval');
  });
  
  it('should allow auto-approve small discount', () => {
    const fsm = createNegotiationMachine();
    fsm.start();
    fsm.send('REQUEST_DISCOUNT', { percent: 5 });
    expect(fsm.state.value).not.toBe('pending_approval');
  });
  
  it('should transition to closing', () => {
    const fsm = createNegotiationMachine();
    fsm.start();
    fsm.send('USER_ACCEPTS');
    expect(fsm.state.value).toBe('closing');
  });
  
  it('should handle objections', () => {
    const fsm = createNegotiationMachine();
    fsm.start();
    fsm.send('OBJECTION');
    expect(fsm.state.value).toBe('handling_objection');
  });
});
```

---

**Document generat:** 20 Ianuarie 2026
