# CERNIQ.APP — ETAPA 5: WORKERS C-D
## Geospatial Analysis & Graph Analysis
### Versiunea 1.0 | 19 Ianuarie 2026

---

## Categoria C: Geospatial Analysis - PostGIS (5 workers)

### C15: geo:proximity:calculate

```typescript
// workers/geospatial/proximity-calculate.worker.ts
interface ProximityCalculatePayload {
  tenantId: string;
  anchorClientId: string;
  radiusKm: number;
  maxResults?: number;
}

export const proximityCalculateWorker = new Worker<ProximityCalculatePayload>(
  'geospatial',
  async (job: Job<ProximityCalculatePayload>) => {
    const { tenantId, anchorClientId, radiusKm = 10, maxResults = 50 } = job.data;
    
    job.log(`Calculating proximity for anchor ${anchorClientId} within ${radiusKm}km`);
    
    // 1. Get anchor client with location
    const anchor = await db.query.goldClients.findFirst({
      where: and(
        eq(goldClients.id, anchorClientId),
        isNotNull(goldClients.locationGeography)
      )
    });
    
    if (!anchor || !anchor.locationGeography) {
      throw new Error(`Anchor client ${anchorClientId} has no location`);
    }
    
    // 2. PostGIS KNN query for nearby prospects
    const nearbyProspects = await db.execute(sql`
      SELECT 
        prospect.id,
        prospect.company_name,
        prospect.location_geography,
        prospect.county,
        prospect.main_crop,
        prospect.farm_size_ha,
        ST_Distance(
          prospect.location_geography, 
          ${anchor.locationGeography}::geography
        ) as distance_meters,
        ST_Distance(
          prospect.location_geography, 
          ${anchor.locationGeography}::geography
        ) / 1000 as distance_km
      FROM gold_contacts prospect
      WHERE 
        prospect.tenant_id = ${tenantId}
        AND prospect.status != 'CLIENT'
        AND prospect.location_geography IS NOT NULL
        AND ST_DWithin(
          prospect.location_geography, 
          ${anchor.locationGeography}::geography, 
          ${radiusKm * 1000}
        )
      ORDER BY prospect.location_geography <-> ${anchor.locationGeography}::geography
      LIMIT ${maxResults}
    `);
    
    // 3. Get anchor quality metrics
    const anchorState = await db.query.goldNurturingState.findFirst({
      where: eq(goldNurturingState.clientId, anchorClientId)
    });
    
    // 4. Calculate proximity scores
    const proximityScores: ProximityScore[] = [];
    
    for (const prospect of nearbyProspects) {
      // Score = f(distance, anchor quality, shared attributes)
      const distanceScore = Math.max(0, 100 - (prospect.distance_km / radiusKm) * 100);
      const anchorQuality = anchorState?.npsScore ? anchorState.npsScore * 10 : 50;
      
      // Check shared attributes
      const sharedAttributes: string[] = [];
      if (prospect.county === anchor.county) sharedAttributes.push('SAME_COUNTY');
      if (prospect.main_crop === anchor.mainCrop) sharedAttributes.push('SAME_CROP');
      
      const sharedBonus = sharedAttributes.length * 10;
      
      const proximityScore = (distanceScore * 0.5 + anchorQuality * 0.3 + sharedBonus * 0.2);
      
      proximityScores.push({
        tenantId,
        anchorClientId,
        anchorLocation: anchor.locationGeography,
        prospectId: prospect.id,
        prospectLocation: prospect.location_geography,
        distanceMeters: prospect.distance_meters,
        proximityScore,
        sharedAttributes,
        anchorNpsScore: anchorState?.npsScore,
        anchorIsAdvocate: anchorState?.isAdvocate
      });
    }
    
    // 5. Bulk insert proximity scores
    if (proximityScores.length > 0) {
      await db.insert(goldProximityScores).values(proximityScores)
        .onConflictDoUpdate({
          target: [goldProximityScores.anchorClientId, goldProximityScores.prospectId],
          set: {
            proximityScore: sql`EXCLUDED.proximity_score`,
            calculatedAt: new Date()
          }
        });
    }
    
    job.log(`Found ${proximityScores.length} prospects within ${radiusKm}km`);
    
    return { 
      anchorClientId, 
      prospectsFound: proximityScores.length,
      avgDistance: proximityScores.reduce((s, p) => s + p.distanceMeters, 0) / proximityScores.length / 1000
    };
  },
  { 
    connection: redisConnection, 
    concurrency: 5,
    limiter: { max: 20, duration: 60000 }
  }
);
```

### C16: geo:neighbor:identify

```typescript
// workers/geospatial/neighbor-identify.worker.ts
interface NeighborIdentifyPayload {
  tenantId: string;
  clientId: string;
  maxNeighbors?: number;
  maxDistanceKm?: number;
}

export const neighborIdentifyWorker = new Worker<NeighborIdentifyPayload>(
  'geospatial',
  async (job: Job<NeighborIdentifyPayload>) => {
    const { tenantId, clientId, maxNeighbors = 10, maxDistanceKm = 5 } = job.data;
    
    // 1. Get client location
    const client = await db.query.goldClients.findFirst({
      where: eq(goldClients.id, clientId)
    });
    
    if (!client?.locationGeography) return { neighborsFound: 0 };
    
    // 2. Find other clients nearby (not prospects)
    const neighbors = await db.execute(sql`
      SELECT 
        neighbor.id,
        neighbor.company_name,
        ST_Distance(
          neighbor.location_geography,
          ${client.locationGeography}::geography
        ) as distance_meters
      FROM gold_clients neighbor
      WHERE 
        neighbor.tenant_id = ${tenantId}
        AND neighbor.id != ${clientId}
        AND neighbor.location_geography IS NOT NULL
        AND ST_DWithin(
          neighbor.location_geography,
          ${client.locationGeography}::geography,
          ${maxDistanceKm * 1000}
        )
      ORDER BY neighbor.location_geography <-> ${client.locationGeography}::geography
      LIMIT ${maxNeighbors}
    `);
    
    // 3. Create NEIGHBOR relationships
    for (const neighbor of neighbors) {
      await db.insert(goldEntityRelationships)
        .values({
          tenantId,
          sourceEntityType: 'CLIENT',
          sourceEntityId: clientId,
          targetEntityType: 'CLIENT',
          targetEntityId: neighbor.id,
          relationType: 'NEIGHBOR',
          strength: Math.max(10, 100 - (neighbor.distance_meters / (maxDistanceKm * 1000)) * 100),
          confidenceScore: 95,
          bidirectional: true,
          evidenceSource: 'PROXIMITY',
          distanceMeters: neighbor.distance_meters
        })
        .onConflictDoNothing();
    }
    
    // 4. Update neighbor count in nurturing state
    await db.update(goldNurturingState)
      .set({ neighborCount: neighbors.length, updatedAt: new Date() })
      .where(eq(goldNurturingState.clientId, clientId));
    
    return { neighborsFound: neighbors.length };
  },
  { connection: redisConnection, concurrency: 10 }
);
```

### C17: geo:territory:calculate

```typescript
// workers/geospatial/territory-calculate.worker.ts
interface TerritoryCalculatePayload {
  tenantId: string;
  clusterId?: string;
  associationId?: string;
  entityType: 'CLUSTER' | 'OUAI' | 'COOPERATIVE';
}

export const territoryCalculateWorker = new Worker<TerritoryCalculatePayload>(
  'geospatial',
  async (job: Job<TerritoryCalculatePayload>) => {
    const { tenantId, clusterId, associationId, entityType } = job.data;
    
    const targetId = clusterId || associationId;
    if (!targetId) throw new Error('No target ID provided');
    
    // 1. Get all members with locations
    const members = await db.execute(sql`
      SELECT 
        gc.id,
        gc.location_geography
      FROM gold_affiliations ga
      JOIN gold_clients gc ON ga.source_entity_id = gc.id
      WHERE 
        ga.tenant_id = ${tenantId}
        AND ga.target_group_id = ${targetId}
        AND ga.is_current = true
        AND gc.location_geography IS NOT NULL
    `);
    
    if (members.length < 3) {
      job.log(`Not enough members with locations (${members.length}) for territory calculation`);
      return { calculated: false, reason: 'insufficient_members' };
    }
    
    // 2. Calculate Convex Hull
    const territory = await db.execute(sql`
      SELECT 
        ST_ConvexHull(ST_Collect(gc.location_geography::geometry)) as territory_polygon,
        ST_Centroid(ST_Collect(gc.location_geography::geometry)) as center_point,
        ST_Area(ST_ConvexHull(ST_Collect(gc.location_geography::geometry))::geography) / 1000000 as area_km2
      FROM gold_affiliations ga
      JOIN gold_clients gc ON ga.source_entity_id = gc.id
      WHERE 
        ga.tenant_id = ${tenantId}
        AND ga.target_group_id = ${targetId}
        AND ga.is_current = true
        AND gc.location_geography IS NOT NULL
    `);
    
    const result = territory[0];
    
    // 3. Update cluster/association with territory
    if (entityType === 'CLUSTER') {
      await db.update(goldClusters)
        .set({
          territoryPolygon: result.territory_polygon,
          centerPoint: result.center_point,
          radiusKm: Math.sqrt(result.area_km2 / Math.PI),
          updatedAt: new Date()
        })
        .where(eq(goldClusters.id, targetId));
    } else {
      await db.update(goldAssociations)
        .set({
          coveragePolygon: result.territory_polygon,
          locationPoint: result.center_point,
          updatedAt: new Date()
        })
        .where(eq(goldAssociations.id, targetId));
    }
    
    return { 
      calculated: true, 
      memberCount: members.length,
      areaKm2: result.area_km2 
    };
  },
  { connection: redisConnection, concurrency: 3 }
);
```

---

## Categoria D: Graph Analysis - NetworkX (5 workers)

### D20: graph:build:relationships

```typescript
// workers/graph/build-relationships.worker.ts
interface BuildRelationshipsPayload {
  tenantId: string;
  scope: 'FULL' | 'INCREMENTAL';
  sinceDate?: string;
}

export const buildRelationshipsWorker = new Worker<BuildRelationshipsPayload>(
  'graph',
  async (job: Job<BuildRelationshipsPayload>) => {
    const { tenantId, scope, sinceDate } = job.data;
    
    job.log(`Building relationship graph (${scope}) for tenant ${tenantId}`);
    
    // 1. Call Python service for graph building
    const response = await pythonGraphService.post('/graph/build', {
      tenant_id: tenantId,
      scope,
      since_date: sinceDate,
      relationship_types: [
        'NEIGHBOR',
        'SAME_ASSOCIATION',
        'SHARED_SHAREHOLDER',
        'RECOMMENDED_BY',
        'BEHAVIORAL_CLUSTER'
      ],
      min_confidence: 0.5
    });
    
    // 2. Graph statistics
    const stats = response.data;
    
    job.log(`Graph built: ${stats.nodes} nodes, ${stats.edges} edges`);
    
    // 3. Queue community detection
    await graphQueue.add('community:detect:leiden', {
      tenantId,
      graphId: stats.graph_id
    });
    
    return {
      nodes: stats.nodes,
      edges: stats.edges,
      graphId: stats.graph_id
    };
  },
  { 
    connection: redisConnection, 
    concurrency: 2,
    timeout: 600000 // 10 min
  }
);
```

### D21: community:detect:leiden

```typescript
// workers/graph/community-detect-leiden.worker.ts
interface CommunityDetectPayload {
  tenantId: string;
  graphId: string;
  minCommunitySize?: number;
  resolution?: number;
}

export const communityDetectLeidenWorker = new Worker<CommunityDetectPayload>(
  'graph',
  async (job: Job<CommunityDetectPayload>) => {
    const { tenantId, graphId, minCommunitySize = 3, resolution = 1.0 } = job.data;
    
    // 1. Call Python Leiden algorithm
    const response = await pythonGraphService.post('/graph/community/leiden', {
      tenant_id: tenantId,
      graph_id: graphId,
      min_community_size: minCommunitySize,
      resolution
    });
    
    const communities = response.data.communities;
    
    job.log(`Detected ${communities.length} communities`);
    
    // 2. Save communities as implicit clusters
    for (const community of communities) {
      // Check if formal association exists
      const isFormal = await checkFormalAssociation(community.member_ids);
      
      if (!isFormal && community.members.length >= minCommunitySize) {
        // Create implicit cluster
        const cluster = await db.insert(goldClusters).values({
          tenantId,
          clusterName: `Cluster ${community.id}`,
          clusterType: 'IMPLICIT_COOPERATIVE',
          detectionMethod: 'LEIDEN',
          detectionConfidence: community.modularity * 100,
          memberCount: community.members.length,
          cohesionScore: community.cohesion * 100,
          modularityScore: community.modularity * 100,
          kolClientId: community.central_node,
          lastAnalyzedAt: new Date()
        }).returning();
        
        // Add members
        for (const memberId of community.member_ids) {
          await db.insert(goldClusterMembers).values({
            tenantId,
            clusterId: cluster.id,
            entityType: 'CLIENT',
            entityId: memberId,
            membershipType: memberId === community.central_node ? 'CORE' : 'PERIPHERAL',
            centralityScore: community.centrality_scores[memberId],
            isKol: memberId === community.central_node
          });
        }
        
        // Queue territory calculation
        await geospatialQueue.add('geo:territory:calculate', {
          tenantId,
          clusterId: cluster.id,
          entityType: 'CLUSTER'
        });
      }
    }
    
    return { 
      communitiesDetected: communities.length,
      clustersCreated: communities.filter(c => !c.is_formal && c.members.length >= minCommunitySize).length
    };
  },
  { 
    connection: redisConnection, 
    concurrency: 2,
    timeout: 600000
  }
);
```

### D23: kol:identify

```typescript
// workers/graph/kol-identify.worker.ts
interface KolIdentifyPayload {
  tenantId: string;
  clientId?: string;  // Specific client or all
  minConnections?: number;
}

export const kolIdentifyWorker = new Worker<KolIdentifyPayload>(
  'graph',
  async (job: Job<KolIdentifyPayload>) => {
    const { tenantId, clientId, minConnections = 5 } = job.data;
    
    // 1. Calculate centrality metrics via Python
    const response = await pythonGraphService.post('/graph/centrality', {
      tenant_id: tenantId,
      client_id: clientId,
      metrics: ['degree', 'betweenness', 'eigenvector', 'pagerank']
    });
    
    const centralities = response.data.centralities;
    
    // 2. Identify KOLs
    for (const node of centralities) {
      // KOL criteria
      const isKol = 
        node.degree_centrality >= minConnections &&
        node.betweenness_centrality >= 0.1 &&
        node.eigenvector_centrality >= 0.2;
      
      // Calculate overall KOL score
      const kolScore = (
        node.degree_centrality * 0.3 +
        node.betweenness_centrality * 100 * 0.3 +
        node.eigenvector_centrality * 100 * 0.2 +
        node.pagerank * 100 * 0.2
      );
      
      // Determine tier
      let kolTier: string | null = null;
      if (kolScore >= 80) kolTier = 'ELITE';
      else if (kolScore >= 60) kolTier = 'ESTABLISHED';
      else if (kolScore >= 40) kolTier = 'EMERGING';
      
      // Upsert KOL profile
      await db.insert(goldKolProfiles)
        .values({
          tenantId,
          clientId: node.client_id,
          isKol,
          kolTier,
          kolSince: isKol ? new Date() : null,
          overallKolScore: kolScore,
          networkCentrality: node.betweenness_centrality * 100,
          directConnections: node.degree,
          lastCalculatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: goldKolProfiles.clientId,
          set: {
            isKol,
            kolTier,
            overallKolScore: kolScore,
            networkCentrality: node.betweenness_centrality * 100,
            directConnections: node.degree,
            lastCalculatedAt: new Date(),
            updatedAt: new Date()
          }
        });
      
      // If new KOL, queue for promotion
      if (isKol && kolTier === 'EMERGING') {
        await stateQueue.add('state:advocate:promote', {
          tenantId,
          clientId: node.client_id,
          kolScore
        });
      }
    }
    
    return { 
      analyzed: centralities.length,
      kolsIdentified: centralities.filter(n => n.is_kol).length 
    };
  },
  { connection: redisConnection, concurrency: 3 }
);
```

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
