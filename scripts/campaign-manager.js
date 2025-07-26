export class CampaignManager {
  constructor() {
    this.relationshipCache = new Map();
    this._creationQueue = new Set(); // Prevent duplicate creation
  }

  getActorDisplayMeta(actor) {
    if (!actor) return '<span class="entity-type">NPC</span>';
    
    // Check actor type first
    if (actor.type === 'character') {
      // Player character
      const race = actor.system.details?.race?.value || actor.system.details?.race || '';
      const charClass = actor.system.details?.class?.value || actor.system.details?.class || '';
      return `<span class="entity-type">${(race + ' ' + charClass).trim() || 'Character'}</span>`;
    } 
    else if (actor.type === 'npc') {
      // Check if it has race/class (humanoid NPC) or creature type (monster)
      const race = actor.system.details?.race?.value || actor.system.details?.race;
      const charClass = actor.system.details?.class?.value || actor.system.details?.class;
      const creatureType = actor.system.details?.type?.value || actor.system.details?.type;
      const size = actor.system.traits?.size?.value || actor.system.traits?.size;
      const cr = actor.system.details?.cr || actor.system.attributes?.cr?.value;
      
      if (race || charClass) {
        // Humanoid NPC with race/class
        return `<span class="entity-type">${(race + ' ' + charClass).trim() || 'NPC'}</span>`;
      } else if (creatureType) {
        // Monster with creature type
        let displayText = '';
        if (size && size !== 'med') displayText += `${size.charAt(0).toUpperCase() + size.slice(1)} `;
        displayText += creatureType;
        if (cr) displayText += ` (CR ${cr})`;
        return `<span class="entity-type">${displayText}</span>`;
      } else {
        // Fallback
        return '<span class="entity-type">NPC</span>';
      }
    } 
    else {
      // Unknown actor type
      return `<span class="entity-type">${actor.type || 'Actor'}</span>`;
    }
  }




  // === JOURNAL CREATION METHODS ===

  async createLocationJournal(name = "New Location") {
    // Prevent duplicate creation
    const creationKey = `location-${name}`;
    if (this._creationQueue.has(creationKey)) return;
    this._creationQueue.add(creationKey);

    try {
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
          },
          "core": {
            sheetClass: "campaign-codex.LocationSheet"
          }
        },
        pages: [{
          name: "Overview",
          type: "text",
          text: { content: `<h1>${name}</h1><p>Location overview...</p>` }
        }]
      };

      const journal = await JournalEntry.create(journalData);
      return journal;
    } finally {
      this._creationQueue.delete(creationKey);
    }
  }

  async createShopJournal(name = "New Shop") {
    const creationKey = `shop-${name}`;
    if (this._creationQueue.has(creationKey)) return;
    this._creationQueue.add(creationKey);

    try {
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
          },
          "core": {
            sheetClass: "campaign-codex.ShopSheet"
          }
        },
        pages: [{
          name: "Overview",
          type: "text",
          text: { content: `<h1>${name}</h1><p>Shop overview...</p>` }
        }]
      };

      const journal = await JournalEntry.create(journalData);
      return journal;
    } finally {
      this._creationQueue.delete(creationKey);
    }
  }

  async createNPCJournal(actor = null, name = null) {
    const journalName = name || (actor ? `${actor.name} - Journal` : "New NPC Journal");
    const creationKey = `npc-${actor?.id || journalName}`;
    
    if (this._creationQueue.has(creationKey)) return;
    this._creationQueue.add(creationKey);

    try {
      // Check if journal already exists for this actor
      if (actor) {
        const existing = game.journal.find(j => {
          const npcData = j.getFlag("campaign-codex", "data");
          return npcData && npcData.linkedActor === actor.id;
        });
        
        if (existing) {
          existing.sheet.render(true);
          return existing;
        }
      }

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
          },
          "core": {
            sheetClass: "campaign-codex.NPCSheet"
          }
        },
        pages: [{
          name: "Overview",
          type: "text",
          text: { content: `<h1>${journalName}</h1><p>NPC details...</p>` }
        }]
      };

      const journal = await JournalEntry.create(journalData);
      return journal;
    } finally {
      this._creationQueue.delete(creationKey);
    }
  }

  async createRegionJournal(name = "New Region") {
    const creationKey = `region-${name}`;
    if (this._creationQueue.has(creationKey)) return;
    this._creationQueue.add(creationKey);

    try {
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
          },
          "core": {
            sheetClass: "campaign-codex.RegionSheet"
          }
        },
        pages: [{
          name: "Overview",
          type: "text",
          text: { content: `<h1>${name}</h1><p>Region overview...</p>` }
        }]
      };

      const journal = await JournalEntry.create(journalData);
      return journal;
    } finally {
      this._creationQueue.delete(creationKey);
    }
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
    await journal.setFlag("core", "sheetClass", "campaign-codex.LocationSheet");
    
    journal.sheet.close();
    setTimeout(() => {
      const LocationSheet = CONFIG.JournalEntry.sheetClasses["campaign-codex.LocationSheet"];
      if (LocationSheet) {
        const sheet = new LocationSheet.cls(journal);
        sheet.render(true);
      }
    }, 100);
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
    await journal.setFlag("core", "sheetClass", "campaign-codex.ShopSheet");
    
    journal.sheet.close();
    setTimeout(() => {
      const ShopSheet = CONFIG.JournalEntry.sheetClasses["campaign-codex.ShopSheet"];
      if (ShopSheet) {
        const sheet = new ShopSheet.cls(journal);
        sheet.render(true);
      }
    }, 100);
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
    await journal.setFlag("core", "sheetClass", "campaign-codex.NPCSheet");
    
    journal.sheet.close();
    setTimeout(() => {
      const NPCSheet = CONFIG.JournalEntry.sheetClasses["campaign-codex.NPCSheet"];
      if (NPCSheet) {
        const sheet = new NPCSheet.cls(journal);
        sheet.render(true);
      }
    }, 100);
  }

  async convertToRegion(journal) {
    await journal.setFlag("campaign-codex", "type", "region");
    await journal.setFlag("campaign-codex", "data", {
      description: "",
      linkedLocations: [],
      notes: ""
    });
    await journal.setFlag("core", "sheetClass", "campaign-codex.RegionSheet");
    
    journal.sheet.close();
    setTimeout(() => {
      const RegionSheet = CONFIG.JournalEntry.sheetClasses["campaign-codex.RegionSheet"];
      if (RegionSheet) {
        const sheet = new RegionSheet.cls(journal);
        sheet.render(true);
      }
    }, 100);
  }

  // === RELATIONSHIP MANAGEMENT ===

  async linkLocationToNPC(locationDoc, npcDoc) {
    // Prevent self-linking
    if (locationDoc.id === npcDoc.id) return;
    
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
    // Prevent self-linking
    if (locationDoc.id === shopDoc.id) return;
    
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
    // Prevent self-linking
    if (shopDoc.id === npcDoc.id) return;
    
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
    // Prevent self-linking
    if (npc1Doc.id === npc2Doc.id) return;
    
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
    // Prevent self-linking
    if (regionDoc.id === locationDoc.id) return;
    
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
    const oldData = foundry.utils.getProperty(shopDoc._source, 'flags.campaign-codex.data') || {};
    const newData = foundry.utils.getProperty(shopDoc, 'flags.campaign-codex.data') || {};

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
            const linkedShops = npcData.linkedShops || [];
            npcData.linkedShops = linkedShops.filter(id => id !== shopDoc.id);
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
            const linkedShops = npcData.linkedShops || [];
            if (!linkedShops.includes(shopDoc.id)) {
              linkedShops.push(shopDoc.id);
              npcData.linkedShops = linkedShops;
              await npcDoc.setFlag("campaign-codex", "data", npcData);
            }
          }
        }
      }
    }

    // Handle location changes
    if (changes.linkedLocation !== undefined) {
      const oldLocation = oldData.linkedLocation;
      const newLocation = newData.linkedLocation;
      
      // Remove from old location
      if (oldLocation && oldLocation !== newLocation) {
        const locationDoc = game.journal.get(oldLocation);
        if (locationDoc) {
          const locationData = locationDoc.getFlag("campaign-codex", "data") || {};
          const linkedShops = locationData.linkedShops || [];
          locationData.linkedShops = linkedShops.filter(id => id !== shopDoc.id);
          await locationDoc.setFlag("campaign-codex", "data", locationData);
        }
      }
      
      // Add to new location
      if (newLocation && newLocation !== oldLocation) {
        const locationDoc = game.journal.get(newLocation);
        if (locationDoc) {
          const locationData = locationDoc.getFlag("campaign-codex", "data") || {};
          const linkedShops = locationData.linkedShops || [];
          if (!linkedShops.includes(shopDoc.id)) {
            linkedShops.push(shopDoc.id);
            locationData.linkedShops = linkedShops;
            await locationDoc.setFlag("campaign-codex", "data", locationData);
          }
        }
      }
    }
  }

  async _handleNPCUpdates(npcDoc, changes) {
    const oldData = foundry.utils.getProperty(npcDoc._source, 'flags.campaign-codex.data') || {};
    const newData = foundry.utils.getProperty(npcDoc, 'flags.campaign-codex.data') || {};

    // Handle location changes
    if (changes.linkedLocations) {
      const oldLocations = oldData.linkedLocations || [];
      const newLocations = newData.linkedLocations || [];
      
      // Remove from old locations
      for (const locationId of oldLocations) {
        if (!newLocations.includes(locationId)) {
          const locationDoc = game.journal.get(locationId);
          if (locationDoc) {
            const locationData = locationDoc.getFlag("campaign-codex", "data") || {};
            const linkedNPCs = locationData.linkedNPCs || [];
            locationData.linkedNPCs = linkedNPCs.filter(id => id !== npcDoc.id);
            await locationDoc.setFlag("campaign-codex", "data", locationData);
          }
        }
      }
      
      // Add to new locations
      for (const locationId of newLocations) {
        if (!oldLocations.includes(locationId)) {
          const locationDoc = game.journal.get(locationId);
          if (locationDoc) {
            const locationData = locationDoc.getFlag("campaign-codex", "data") || {};
            const linkedNPCs = locationData.linkedNPCs || [];
            if (!linkedNPCs.includes(npcDoc.id)) {
              linkedNPCs.push(npcDoc.id);
              locationData.linkedNPCs = linkedNPCs;
              await locationDoc.setFlag("campaign-codex", "data", locationData);
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
            const linkedNPCs = shopData.linkedNPCs || [];
            shopData.linkedNPCs = linkedNPCs.filter(id => id !== npcDoc.id);
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
            const linkedNPCs = shopData.linkedNPCs || [];
            if (!linkedNPCs.includes(npcDoc.id)) {
              linkedNPCs.push(npcDoc.id);
              shopData.linkedNPCs = linkedNPCs;
              await shopDoc.setFlag("campaign-codex", "data", shopData);
            }
          }
        }
      }
    }

    // Handle associate changes
    if (changes.associates) {
      const oldAssociates = oldData.associates || [];
      const newAssociates = newData.associates || [];
      
      // Remove from old associates
      for (const associateId of oldAssociates) {
        if (!newAssociates.includes(associateId)) {
          const associateDoc = game.journal.get(associateId);
          if (associateDoc) {
            const associateData = associateDoc.getFlag("campaign-codex", "data") || {};
            const associates = associateData.associates || [];
            associateData.associates = associates.filter(id => id !== npcDoc.id);
            await associateDoc.setFlag("campaign-codex", "data", associateData);
          }
        }
      }
      
      // Add to new associates
      for (const associateId of newAssociates) {
        if (!oldAssociates.includes(associateId)) {
          const associateDoc = game.journal.get(associateId);
          if (associateDoc) {
            const associateData = associateDoc.getFlag("campaign-codex", "data") || {};
            const associates = associateData.associates || [];
            if (!associates.includes(npcDoc.id)) {
              associates.push(npcDoc.id);
              associateData.associates = associates;
              await associateDoc.setFlag("campaign-codex", "data", associateData);
            }
          }
        }
      }
    }
  }

  async _handleRegionUpdates(regionDoc, changes) {
    // Regions currently only have one-way relationships with locations
    // No bidirectional updates needed for now
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