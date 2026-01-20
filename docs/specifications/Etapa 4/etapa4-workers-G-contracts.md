# CERNIQ.APP — ETAPA 4: WORKERS CATEGORIA G
## Dynamic Contract Workers (5 Workers)
### Versiunea 1.0 | 19 Ianuarie 2026

---

## Overview
Generare contracte dinamice cu clauze bazate pe profilul de risc.

## Worker #32: contract:template:select
```typescript
export async function contractTemplateSelectProcessor(
  job: Job<{orderId: string, clientId: string, riskTier: string}>
): Promise<{templateId: string}> {
  const { orderId, clientId, riskTier, tenantId } = job.data;
  
  // Select appropriate template based on risk
  const template = await db.query.goldContractTemplates.findFirst({
    where: and(
      eq(goldContractTemplates.tenantId, tenantId),
      eq(goldContractTemplates.isActive, true),
      sql`${riskTier} = ANY(applicable_risk_tiers)`
    ),
    orderBy: [desc(goldContractTemplates.isDefault), desc(goldContractTemplates.version)]
  });
  
  if (!template) {
    throw new Error('NO_SUITABLE_TEMPLATE');
  }
  
  // Create contract record
  const [contract] = await db.insert(goldContracts).values({
    tenantId,
    contractNumber: `CTR-${Date.now()}`,
    contractType: template.contractType,
    orderId,
    clientId,
    templateId: template.id,
    status: 'DRAFT',
    title: `Contract vânzare - ${orderId}`,
    riskTier,
    validForDays: 30,
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  }).returning();
  
  // Queue clause assembly
  await flowProducer.add({
    queueName: 'contract:clause:assemble',
    data: { contractId: contract.id, templateId: template.id, riskTier }
  });
  
  return { templateId: template.id, contractId: contract.id };
}
```

## Worker #33: contract:clause:assemble
```typescript
export async function contractClauseAssembleProcessor(
  job: Job<{contractId: string, templateId: string, riskTier: string}>
): Promise<{clauses: string[]}> {
  const { contractId, templateId, riskTier, tenantId } = job.data;
  
  // Get template default clauses
  const template = await db.query.goldContractTemplates.findFirst({
    where: eq(goldContractTemplates.id, templateId)
  });
  
  // Get risk-appropriate clauses
  const clauses = await db.query.goldContractClauses.findMany({
    where: and(
      eq(goldContractClauses.tenantId, tenantId),
      eq(goldContractClauses.isActive, true),
      or(
        eq(goldContractClauses.isMandatory, true),
        sql`${riskTier} = ANY(applicable_risk_tiers)`
      )
    ),
    orderBy: [asc(goldContractClauses.category)]
  });
  
  // Add risk-specific clauses
  const riskClauses = {
    'BLOCKED': ['prepayment_100', 'no_credit'],
    'LOW': ['prepayment_50', 'bank_guarantee', 'penalty_high'],
    'MEDIUM': ['payment_14d', 'penalty_standard'],
    'HIGH': ['payment_30d', 'standard_warranty'],
    'PREMIUM': ['payment_60d', 'extended_warranty', 'volume_discount']
  };
  
  const selectedClauseIds = [
    ...template.defaultClauses,
    ...clauses.filter(c => c.isMandatory).map(c => c.id),
    ...clauses.filter(c => riskClauses[riskTier]?.includes(c.code)).map(c => c.id)
  ];
  
  // Update contract with clauses
  await db.update(goldContracts)
    .set({ clausesUsed: selectedClauseIds })
    .where(eq(goldContracts.id, contractId));
  
  // Queue document generation
  await flowProducer.add({
    queueName: 'contract:generate:docx',
    data: { contractId, clauseIds: selectedClauseIds }
  });
  
  return { clauses: selectedClauseIds };
}
```

## Worker #34: contract:generate:docx
```typescript
export async function contractGenerateDocxProcessor(
  job: Job<{contractId: string, clauseIds: string[]}>
): Promise<{docxUrl: string, pdfUrl: string}> {
  const { contractId, clauseIds, tenantId } = job.data;
  
  const contract = await db.query.goldContracts.findFirst({
    where: eq(goldContracts.id, contractId),
    with: { 
      template: true, 
      client: true, 
      order: { with: { items: true } } 
    }
  });
  
  // Get clause contents
  const clauses = await db.query.goldContractClauses.findMany({
    where: inArray(goldContractClauses.id, clauseIds)
  });
  
  // Prepare template variables
  const variables = {
    contract_number: contract.contractNumber,
    contract_date: new Date().toLocaleDateString('ro-RO'),
    
    // Client
    client_name: contract.client.companyName,
    client_cui: contract.client.cui,
    client_address: contract.client.address,
    client_rep_name: contract.client.contactName,
    
    // Seller
    seller_name: process.env.COMPANY_NAME,
    seller_cui: process.env.COMPANY_CUI,
    seller_address: process.env.COMPANY_ADDRESS,
    
    // Order
    order_number: contract.order.orderNumber,
    order_total: contract.order.totalAmount.toLocaleString('ro-RO'),
    order_currency: contract.order.currency,
    payment_terms: `${contract.order.paymentTermsDays} zile`,
    
    // Items table
    items: contract.order.items.map(item => ({
      name: item.productName,
      quantity: item.quantity,
      unit: item.unitOfMeasure,
      price: item.unitPrice,
      total: item.lineTotal
    })),
    
    // Assembled clauses
    clauses: clauses.map(c => ({
      title: c.title,
      content: c.content
    }))
  };
  
  // Generate DOCX using Python docxtpl
  const docxPath = await generateDocxFromTemplate(contract.template.templateDocxUrl, variables);
  
  // Convert to PDF
  const pdfPath = await convertDocxToPdf(docxPath);
  
  // Upload to storage
  const docxUrl = await uploadToStorage(docxPath, `contracts/${contractId}.docx`);
  const pdfUrl = await uploadToStorage(pdfPath, `contracts/${contractId}.pdf`);
  
  // Update contract
  await db.update(goldContracts)
    .set({
      docxUrl,
      pdfUrl,
      generatedAt: new Date(),
      templateVariables: variables,
      status: 'APPROVED'
    })
    .where(eq(goldContracts.id, contractId));
  
  // Queue for signature
  await flowProducer.add({
    queueName: 'contract:sign:request',
    data: { contractId }
  });
  
  return { docxUrl, pdfUrl };
}

// Python integration for docxtpl
async function generateDocxFromTemplate(templateUrl: string, variables: object): Promise<string> {
  const result = await pythonBridge.call('generate_contract', {
    template_url: templateUrl,
    variables: variables,
    output_path: `/tmp/contract-${Date.now()}.docx`
  });
  return result.output_path;
}
```

## Worker #35: contract:sign:request
```typescript
export async function contractSignRequestProcessor(
  job: Job<{contractId: string}>
): Promise<{envelopeId: string}> {
  const { contractId, tenantId } = job.data;
  
  const contract = await db.query.goldContracts.findFirst({
    where: eq(goldContracts.id, contractId),
    with: { client: true }
  });
  
  // Create DocuSign envelope
  const envelope = await docuSignClient.createEnvelope({
    emailSubject: `Contract de semnat: ${contract.contractNumber}`,
    documents: [{
      documentId: '1',
      name: `Contract ${contract.contractNumber}`,
      documentBase64: await fetchAsBase64(contract.pdfUrl)
    }],
    recipients: {
      signers: [
        {
          recipientId: '1',
          email: contract.client.email,
          name: contract.client.contactName,
          routingOrder: '1',
          tabs: {
            signHereTabs: [{ documentId: '1', pageNumber: '1', xPosition: '100', yPosition: '700' }],
            dateSignedTabs: [{ documentId: '1', pageNumber: '1', xPosition: '300', yPosition: '700' }]
          }
        }
      ]
    },
    status: 'sent'
  });
  
  // Store signature records
  await db.insert(goldContractSignatures).values({
    tenantId,
    contractId,
    signerRole: 'CLIENT',
    signerName: contract.client.contactName,
    signerEmail: contract.client.email,
    signerCompany: contract.client.companyName,
    clientId: contract.clientId,
    status: 'PENDING',
    docusignRecipientId: '1',
    sentAt: new Date()
  });
  
  // Update contract
  await db.update(goldContracts)
    .set({
      docusignEnvelopeId: envelope.envelopeId,
      docusignStatus: 'sent',
      status: 'SENT_FOR_SIGNATURE',
      sentAt: new Date()
    })
    .where(eq(goldContracts.id, contractId));
  
  return { envelopeId: envelope.envelopeId };
}
```

## Worker #36: contract:sign:complete
```typescript
export async function contractSignCompleteProcessor(
  job: Job<{envelopeId: string, status: string, signerEmail: string}>
): Promise<void> {
  const { envelopeId, status, signerEmail } = job.data;
  
  const contract = await db.query.goldContracts.findFirst({
    where: eq(goldContracts.docusignEnvelopeId, envelopeId)
  });
  
  if (!contract) return;
  
  if (status === 'completed') {
    // Download signed document
    const signedPdf = await docuSignClient.getDocument(envelopeId, '1');
    const signedPdfUrl = await uploadToStorage(signedPdf, `contracts/${contract.id}-signed.pdf`);
    
    // Update contract
    await db.update(goldContracts)
      .set({
        status: 'SIGNED',
        signedPdfUrl,
        signedAt: new Date(),
        docusignStatus: 'completed'
      })
      .where(eq(goldContracts.id, contract.id));
    
    // Update signature record
    await db.update(goldContractSignatures)
      .set({ status: 'SIGNED', signedAt: new Date() })
      .where(and(
        eq(goldContractSignatures.contractId, contract.id),
        eq(goldContractSignatures.signerEmail, signerEmail)
      ));
    
    // Update order - ready for shipment
    await db.update(goldOrders)
      .set({ status: 'PROCESSING' })
      .where(eq(goldOrders.id, contract.orderId));
    
    // Trigger AWB generation
    await flowProducer.add({
      queueName: 'sameday:awb:create',
      data: { orderId: contract.orderId }
    });
    
  } else if (status === 'declined') {
    await db.update(goldContracts)
      .set({ status: 'REJECTED', docusignStatus: 'declined' })
      .where(eq(goldContracts.id, contract.id));
    
    await db.update(goldContractSignatures)
      .set({ status: 'DECLINED', declinedAt: new Date() })
      .where(eq(goldContractSignatures.contractId, contract.id));
  }
}
```

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
