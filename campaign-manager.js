export class CampaignManager {
  constructor() {
    this.relationshipCache = new Map();
  }

  // === JOURNAL CREATION METHODS ===

  async createLocationJournal(name = "New Location") {
    const journalData = {
      name: name,
      flags: {
        "campaign-codex": {
          type: "location",
          data: {
            description: "",
            linkedNPCs: [],
            linkedShops: [],
            notes: ""
          }
        }
      },
      pages: [{
        name: "Overview",
        type: "text",
        text: { content: `<h1>${name}</h1><p>Location overview...</p>` }
      }]
    };

    const journal = await JournalEntry.create(journalData);
    new (await import('./sheets/location-sheet.js')).LocationSheet(journal).render(true);
    return journal;
  }

  async createShopJournal(name = "New Shop") {
    const journalData = {
      name: name,
      flags: {
        "campaign-codex": {
          type: "shop",
          data: {
            description: "",
            linkedNPCs: [],
            linkedLocation: null,
            inventory: [],
            markup: 1.0,
            notes: ""
          }
        }
      },
      pages: [{
        name: "Overview",
        type: "text",
        text: { content: `<h1>${name}</h1><p>Shop overview...</p>` }
      }]
    };

    const journal = await JournalEntry.create(journalData);
    new (await import('./sheets/shop-sheet.js')).ShopSheet(journal).render(true);
    return journal;
  }

  async createNPCJournal(actor = null, name = null) {
    const journalName = name || (actor ? `${actor.name} - Journal` : "New NPC Journal");
    
    const journalData = {
      name: journalName,
      flags: {
        "campaign-codex": {
          type: "npc",
          data: {
            linkedActor: actor ? actor.id : null,
            description: "",
            linkedLocations: [],
            linkedShops: [],
            associates: [],
            notes: ""
          }
        }
      },
      pages: [{
        name: "Overview",
        type: "text",
        text: { content: `<h1>${journalName}</h1><p>NPC details...</p>` }
      }]
    };

    const journal = await JournalEntry.create(journalData);
    new (await import('./sheets/npc-sheet.js')).NPCSheet(journal).render(true);
    return journal;
  }

  async createRegionJournal(name = "New Region") {
    const journalData = {
      name: name,
      flags: {
        "campaign-codex": {
          type: "region",
          data: {
            description: "",
            linkedLocations: [],
            notes: ""
          }
        }
      },
      pages: [{
        name: "Overview",
        type: "text",
        text: { content: `<h1>${name}</h1><p>Region overview...</p>` }
      }]
    };

    const journal = await JournalEntry.create(journalData);
    new (await import('./sheets/region-sheet.js')).RegionSheet(journal).render(true);
    return journal;
  }

  // === CONVERSION METHODS ===

  async convertToLocation(journal) {
    await journal.setFlag("campaign-codex", "type", "location");
    await journal.setFlag("campaign-codex", "data", {
      description: "",
      linkedNPCs: [],
      linkedShops: [],
      notes: ""
    });
    
    journal.sheet.close();
    new (await import('./sheets/location-sheet.js')).LocationSheet(journal).render(true);
  }

  async convertToShop(journal) {
    await journal.setFlag("campaign-codex", "type", "shop");
    await journal.setFlag("campaign-codex", "data", {
      description: "",
      linkedNPCs: [],
      linkedLocation: null,
      inventory: [],
      markup: 1.0,
      notes: ""
    });
    
    journal.sheet.close();
    new (await import('./sheets/shop-sheet.js')).ShopSheet(journal).render(true);
  }

  async convertToNPC(journal) {
    await journal.setFlag("campaign-codex", "type", "npc");
    await journal.setFlag("campaign-codex", "data", {
      linkedActor: null,
      description: "",
      linkedLocations: [],
      linkedShops: [],
      associates: [],
      notes: ""
    });
    
    journal.sheet.close();
    new (await import('./sheets/npc-sheet.js')).NPCSheet(journal).render(true);
  }

  async convertToRegion(journal) {
    await journal.setFlag("campaign-codex", "type", "region");
    await journal.setFlag("campaign-codex", "data", {
      description: "",
      linkedLocations: [],
      notes: ""
    });
    
    journal.sheet.close();
    new (await import('./sheets/region-sheet.js')).RegionSheet(journal).render(true);
  }

  // === RELATIONSHIP MANAGEMENT ===

  async linkLocationToNPC(locationDoc, npcDoc) {
    // Add NPC to location
    const locationData = locationDoc.getFlag("campaign-codex", "data") || {};
    const linkedNPCs = locationData.linkedNPCs || [];
    if (!linkedNPCs.includes(npcDoc.id)) {
      linkedNPCs.push(npcDoc.id);
      locationData.linkedNPCs = linkedNPCs;
      await locationDoc.setFlag("campaign-codex", "data", locationData);
    }

    // Add location to NPC
    const npcData = npcDoc.getFlag("campaign-codex", "data") || {};
    const linkedLocations = npcData.linkedLocations || [];
    if (!linkedLocations.includes(locationDoc.id)) {
      linkedLocations.push(locationDoc.id);
      npcData.linkedLocations = linkedLocations;
      await npcDoc.setFlag("campaign-codex", "data", npcData);
    }
  }

  async linkLocationToShop(locationDoc, shopDoc) {
    // Add shop to location
    const locationData = locationDoc.getFlag("campaign-codex", "data") || {};
    const linkedShops = locationData.linkedShops || [];
    if (!linkedShops.includes(shopDoc.id)) {
      linkedShops.push(shopDoc.id);
      locationData.linkedShops = linkedShops;
      await locationDoc.setFlag("campaign-codex", "data", locationData);
    }

    // Set location for shop (single location per shop)
    const shopData = shopDoc.getFlag("campaign-codex", "data") || {};
    shopData.linkedLocation = locationDoc.id;
    await shopDoc.setFlag("campaign-codex", "data", shopData);
  }

  async linkShopToNPC(shopDoc, npcDoc) {
    // Add NPC to shop
    const shopData = shopDoc.getFlag("campaign-codex", "data") || {};
    const linkedNPCs = shopData.linkedNPCs || [];
    if (!linkedNPCs.includes(npcDoc.id)) {
      linkedNPCs.push(npcDoc.id);
      shopData.linkedNPCs = linkedNPCs;
      await shopDoc.setFlag("campaign-codex", "data", shopData);
    }

    // Add shop to NPC
    const npcData = npcDoc.getFlag("campaign-codex", "data") || {};
    const linkedShops = npcData.linkedShops || [];
    if (!linkedShops.includes(shopDoc.id)) {
      linkedShops.push(shopDoc.id);
      npcData.linkedShops = linkedShops;
      await npcDoc.setFlag("campaign-codex", "data", npcData);
    }
  }

  async linkNPCToNPC(npc1Doc, npc2Doc) {
    // Add NPC2 to NPC1's associates
    const npc1Data = npc1Doc.getFlag("campaign-codex", "data") || {};
    const associates1 = npc1Data.associates || [];
    if (!associates1.includes(npc2Doc.id)) {
      associates1.push(npc2Doc.id);
      npc1Data.associates = associates1;
      await npc1Doc.setFlag("campaign-codex", "data", npc1Data);
    }

    // Add NPC1 to NPC2's associates
    const npc2Data = npc2Doc.getFlag("campaign-codex", "data") || {};
    const associates2 = npc2Data.associates || [];
    if (!associates2.includes(npc1Doc.id)) {
      associates2.push(npc1Doc.id);
      npc2Data.associates = associates2;
      await npc2Doc.setFlag("campaign-codex", "data", npc2Data);
    }
  }

  async linkRegionToLocation(regionDoc, locationDoc) {
    // Add location to region
    const regionData = regionDoc.getFlag("campaign-codex", "data") || {};
    const linkedLocations = regionData.linkedLocations || [];
    if (!linkedLocations.includes(locationDoc.id)) {
      linkedLocations.push(locationDoc.id);
      regionData.linkedLocations = linkedLocations;
      await regionDoc.setFlag("campaign-codex", "data", regionData);
    }
  }

  // === ITEM MANAGEMENT ===

  async addItemToShop(shopDoc, itemDoc, quantity = 1) {
    const shopData = shopDoc.getFlag("campaign-codex", "data") || {};
    const inventory = shopData.inventory || [];
    
    // Check if item already exists
    const existingItem = inventory.find(i => i.itemId === itemDoc.id);
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      inventory.push({
        itemId: itemDoc.id,
        quantity: quantity,
        customPrice: null // null means use item's base price + markup
      });
    }
    
    shopData.inventory = inventory;
    await shopDoc.setFlag("campaign-codex", "data", shopData);
  }

  // === UPDATE HANDLERS ===

  async handleRelationshipUpdates(document, changes, type) {
    // This handles cascading updates when relationships change
    const flagChanges = changes.flags?.["campaign-codex"]?.data;
    if (!flagChanges) return;

    // Debounce to prevent infinite loops
    if (this._updating) return;
    this._updating = true;

    try {
      switch (type) {
        case "location":
          await this._handleLocationUpdates(document, flagChanges);
          break;
        case "shop":
          await this._handleShopUpdates(document, flagChanges);
          break;
        case "npc":
          await this._handleNPCUpdates(document, flagChanges);
          break;
        case "region":
          await this._handleRegionUpdates(document, flagChanges);
          break;
      }
    } finally {
      this._updating = false;
    }
  }

  async _handleLocationUpdates(locationDoc, changes) {
    const oldData = foundry.utils.getProperty(locationDoc._source, 'flags.campaign-codex.data') || {};
    const newData = foundry.utils.getProperty(locationDoc, 'flags.campaign-codex.data') || {};

    // Handle NPC changes
    if (changes.linkedNPCs) {
      const oldNPCs = oldData.linkedNPCs || [];
      const newNPCs = newData.linkedNPCs || [];
      
      // Remove from old NPCs
      for (const npcId of oldNPCs) {
        if (!newNPCs.includes(npcId)) {
          const npcDoc = game.journal.get(npcId);
          if (npcDoc) {
            const npcData = npcDoc.getFlag("campaign-codex", "data") || {};
            const linkedLocations = npcData.linkedLocations || [];
            npcData.linkedLocations = linkedLocations.filter(id => id !== locationDoc.id);
            await npcDoc.setFlag("campaign-codex", "data", npcData);
          }
        }
      }
      
      // Add to new NPCs
      for (const npcId of newNPCs) {
        if (!oldNPCs.includes(npcId)) {
          const npcDoc = game.journal.get(npcId);
          if (npcDoc) {
            const npcData = npcDoc.getFlag("campaign-codex", "data") || {};
            const linkedLocations = npcData.linkedLocations || [];
            if (!linkedLocations.includes(locationDoc.id)) {
              linkedLocations.push(locationDoc.id);
              npcData.linkedLocations = linkedLocations;
              await npcDoc.setFlag("campaign-codex", "data", npcData);
            }
          }
        }
      }
    }

    // Handle shop changes
    if (changes.linkedShops) {
      const oldShops = oldData.linkedShops || [];
      const newShops = newData.linkedShops || [];
      
      // Remove from old shops
      for (const shopId of oldShops) {
        if (!newShops.includes(shopId)) {
          const shopDoc = game.journal.get(shopId);
          if (shopDoc) {
            const shopData = shopDoc.getFlag("campaign-codex", "data") || {};
            shopData.linkedLocation = null;
            await shopDoc.setFlag("campaign-codex", "data", shopData);
          }
        }
      }
      
      // Add to new shops
      for (const shopId of newShops) {
        if (!oldShops.includes(shopId)) {
          const shopDoc = game.journal.get(shopId);
          if (shopDoc) {
            const shopData = shopDoc.getFlag("campaign-codex", "data") || {};
            shopData.linkedLocation = locationDoc.id;
            await shopDoc.setFlag("campaign-codex", "data", shopData);
          }
        }
      }
    }
  }

  async _handleShopUpdates(shopDoc, changes) {
    // Similar pattern for shop updates...
    // Implementation would follow the same bidirectional update pattern
  }

  async _handleNPCUpdates(npcDoc, changes) {
    // Similar pattern for NPC updates...
    // Implementation would follow the same bidirectional update pattern
  }

  async _handleRegionUpdates(regionDoc, changes) {
    // Similar pattern for region updates...
    // Implementation would follow the same bidirectional update pattern
  }

  // === CLEANUP METHODS ===

  async cleanupRelationships(document, type) {
    const data = document.getFlag("campaign-codex", "data") || {};

    switch (type) {
      case "location":
        // Remove this location from all linked NPCs and shops
        for (const npcId of data.linkedNPCs || []) {
          const npcDoc = game.journal.get(npcId);
          if (npcDoc) {
            const npcData = npcDoc.getFlag("campaign-codex", "data") || {};
            npcData.linkedLocations = (npcData.linkedLocations || []).filter(id => id !== document.id);
            await npcDoc.setFlag("campaign-codex", "data", npcData);
          }
        }
        
        for (const shopId of data.linkedShops || []) {
          const shopDoc = game.journal.get(shopId);
          if (shopDoc) {
            const shopData = shopDoc.getFlag("campaign-codex", "data") || {};
            shopData.linkedLocation = null;
            await shopDoc.setFlag("campaign-codex", "data", shopData);
          }
        }
        break;

      case "shop":
        // Remove this shop from all linked NPCs and location
        for (const npcId of data.linkedNPCs || []) {
          const npcDoc = game.journal.get(npcId);
          if (npcDoc) {
            const npcData = npcDoc.getFlag("campaign-codex", "data") || {};
            npcData.linkedShops = (npcData.linkedShops || []).filter(id => id !== document.id);
            await npcDoc.setFlag("campaign-codex", "data", npcData);
          }
        }
        
        if (data.linkedLocation) {
          const locationDoc = game.journal.get(data.linkedLocation);
          if (locationDoc) {
            const locationData = locationDoc.getFlag("campaign-codex", "data") || {};
            locationData.linkedShops = (locationData.linkedShops || []).filter(id => id !== document.id);
            await locationDoc.setFlag("campaign-codex", "data", locationData);
          }
        }
        break;

      case "npc":
        // Remove this NPC from all linked locations, shops, and associates
        for (const locationId of data.linkedLocations || []) {
          const locationDoc = game.journal.get(locationId);
          if (locationDoc) {
            const locationData = locationDoc.getFlag("campaign-codex", "data") || {};
            locationData.linkedNPCs = (locationData.linkedNPCs || []).filter(id => id !== document.id);
            await locationDoc.setFlag("campaign-codex", "data", locationData);
          }
        }
        
        for (const shopId of data.linkedShops || []) {
          const shopDoc = game.journal.get(shopId);
          if (shopDoc) {
            const shopData = shopDoc.getFlag("campaign-codex", "data") || {};
            shopData.linkedNPCs = (shopData.linkedNPCs || []).filter(id => id !== document.id);
            await shopDoc.setFlag("campaign-codex", "data", shopData);
          }
        }
        
        for (const associateId of data.associates || []) {
          const associateDoc = game.journal.get(associateId);
          if (associateDoc) {
            const associateData = associateDoc.getFlag("campaign-codex", "data") || {};
            associateData.associates = (associateData.associates || []).filter(id => id !== document.id);
            await associateDoc.setFlag("campaign-codex", "data", associateData);
          }
        }
        break;

      case "region":
        // Regions don't need cleanup as they don't create bidirectional relationships
        break;
    }
  }

  async cleanupActorRelationships(actorDoc) {
    // Remove this actor from all NPC journals that link to it
    const npcJournals = game.journal.filter(j => {
      const data = j.getFlag("campaign-codex", "data");
      return data && data.linkedActor === actorDoc.id;
    });

    for (const journal of npcJournals) {
      const data = journal.getFlag("campaign-codex", "data") || {};
      data.linkedActor = null;
      await journal.setFlag("campaign-codex", "data", data);
    }
  }

  // === UTILITY METHODS ===

  getLinkedDocuments(sourceDoc, linkType) {
    const data = sourceDoc.getFlag("campaign-codex", "data") || {};
    const linkedIds = data[linkType] || [];
    
    if (linkType === 'linkedActor') {
      return linkedIds ? [game.actors.get(linkedIds)].filter(Boolean) : [];
    }
    
    return linkedIds.map(id => game.journal.get(id)).filter(Boolean);
  }

  async refreshAllSheets(documentId) {
    // Refresh all open sheets that might be affected by relationship changes
    for (const app of Object.values(ui.windows)) {
      if (app.document && (app.document.id === documentId || 
          this._isRelatedDocument(app.document, documentId))) {
        app.render(false);
      }
    }
  }

  _isRelatedDocument(doc, changedDocId) {
    if (!doc.getFlag) return false;
    
    const data = doc.getFlag("campaign-codex", "data") || {};
    const allLinkedIds = [
      ...(data.linkedNPCs || []),
      ...(data.linkedShops || []),
      ...(data.linkedLocations || []),
      ...(data.associates || []),
      data.linkedLocation,
      data.linkedActor
    ].filter(Boolean);
    
    return allLinkedIds.includes(changedDocId);
  }
}