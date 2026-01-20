# CERNIQ.APP — TESTE E4: SCHEMA & API

## Teste pentru Orders schema și API

---

## SCHEMA

```typescript
describe('Orders Schema', () => {
  it('should have orders table', async () => {
    const tables = await getTableNames();
    expect(tables).toContain('orders');
    expect(tables).toContain('order_items');
    expect(tables).toContain('payments');
  });
  
  it('should enforce FK constraints', async () => {
    await expect(
      insertOrderItem({ orderId: 'nonexistent', sku: 'SKU-001' })
    ).rejects.toThrow();
  });
});
```

## API

```typescript
describe('Orders API', () => {
  it('should create order', async () => {
    const response = await api.post('/api/v1/orders').send({
      customerId: 'cust-1',
      items: [{ sku: 'SKU-001', qty: 10 }],
    });
    expect(response.status).toBe(201);
  });
  
  it('should list orders', async () => {
    const response = await api.get('/api/v1/orders');
    expect(response.body.data).toBeInstanceOf(Array);
  });
  
  it('should update order status', async () => {
    const order = await createOrder();
    const response = await api.patch(`/api/v1/orders/${order.id}`).send({ status: 'shipped' });
    expect(response.body.status).toBe('shipped');
  });
});

describe('Payments API', () => {
  it('should list payments', async () => {
    const response = await api.get('/api/v1/payments');
    expect(response.status).toBe(200);
  });
});
```

---

**Document generat:** 20 Ianuarie 2026
