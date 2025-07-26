import { CampaignCodexBaseSheet } from './base-sheet.js';
import { TemplateComponents } from './template-components.js';

export class ShopSheet extends CampaignCodexBaseSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [...super.defaultOptions.classes, "shop-sheet"]
    });
  }

  get template() {
    return "modules/campaign-codex/templates/base-sheet.html";
  }

  async getData() {
    const data = await super.getData();
    const shopData = this.document.getFlag("campaign-codex", "data") || {};
    
    // Get linked documents
    data.linkedNPCs = await this._getLinkedNPCs(shopData.linkedNPCs || []);
    data.linkedLocation = shopData.linkedLocation ? await this._getLinkedLocation(shopData.linkedLocation) : null;
    data.inventory = await this._getInventory(shopData.inventory || []);
    
    // Sheet configuration
    data.sheetType = "shop";
    data.sheetTypeLabel = "Shop";
    data.customImage = this.document.getFlag("campaign-codex", "image") || "icons/svg/item-bag.svg";
    data.markup = shopData.markup || 1.0;
    
    // Navigation tabs
    data.tabs = [
      { key: 'info', label: 'Info', icon: 'fas fa-info-circle', active: this._currentTab === 'info' },
      { key: 'inventory', label: 'Inventory', icon: 'fas fa-boxes', active: this._currentTab === 'inventory' },
      { key: 'npcs', label: 'NPCs', icon: 'fas fa-users', active: this._currentTab === 'npcs' },
      { key: 'notes', label: 'Notes', icon: 'fas fa-sticky-note', active: this._currentTab === 'notes' }
    ];
    
    // Statistics
    data.statistics = [
      { icon: 'fas fa-boxes', value: data.inventory.length, label: 'ITEMS', color: '#28a745' },
      { icon: 'fas fa-users', value: data.linkedNPCs.length, label: 'NPCS', color: '#fd7e14' },
      { icon: 'fas fa-percentage', value: `${data.markup}x`, label: 'MARKUP', color: '#d4af37' }
    ];
    
    // Quick links
    data.quickLinks = [
      ...(data.linkedLocation ? [{ ...data.linkedLocation, type: 'location' }] : []),
      ...data.linkedNPCs.map(npc => ({ ...npc, type: 'npc' }))
    ];
    
    // Custom header content (location info)
    if (data.linkedLocation) {
      data.customHeaderContent = `
        <div class="location-info">
          <span class="location-label">Located in:</span>
          <span class="location-name">${data.linkedLocation.name}</span>
        </div>
      `;
    }
    
    // Tab panels
    data.tabPanels = [
      {
        key: 'info',
        active: this._currentTab === 'info',
        content: this._generateInfoTab(data)
      },
      {
        key: 'inventory',
        active: this._currentTab === 'inventory',
        content: this._generateInventoryTab(data)
      },
      {
        key: 'npcs', 
        active: this._currentTab === 'npcs',
        content: this._generateNPCsTab(data)
      },
      {
        key: 'notes',
        active: this._currentTab === 'notes',
        content: this._generateNotesTab(data)
      }
    ];
    
    return data;
  }

  _generateInfoTab(data) {
    let locationSection = '';
    
    if (data.linkedLocation) {
      locationSection = `
        <div class="form-section">
          <h3><i class="fas fa-map-marker-alt"></i> Location</h3>
          <div class="linked-actor-card">
            <div class="actor-image">
              <img src="${data.linkedLocation.img}" alt="${data.linkedLocation.name}">
            </div>
            <div class="actor-content">
              <h4 class="actor-name">${data.linkedLocation.name}</h4>
              <div class="actor-details">
                <span class="actor-race-class">Location</span>
              </div>
            </div>
            <div class="actor-actions">
              <button type="button" class="action-btn open-location" data-location-id="${data.linkedLocation.id}" title="Open Location">
                <i class="fas fa-external-link-alt"></i>
              </button>
              <button type="button" class="action-btn remove-location" title="Remove Location">
                <i class="fas fa-unlink"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    } else {
      locationSection = `
        <div class="form-section">
          <h3><i class="fas fa-map-marker-alt"></i> Location</h3>
          ${TemplateComponents.dropZone('location', 'fas fa-map-marker-alt', 'Set Location', 'Drag a location journal here to set where this shop is located')}
        </div>
      `;
    }
    
    return `
      ${TemplateComponents.formSection('Description', 'fas fa-align-left', 'description', 'Describe this shop...', data.sheetData.description, 8)}
      ${locationSection}
    `;
  }

  _generateInventoryTab(data) {
    return `
      ${TemplateComponents.contentHeader('fas fa-boxes', 'Shop Inventory')}
      ${TemplateComponents.markupControl(data.markup)}
      ${TemplateComponents.dropZone('item', 'fas fa-plus-circle', 'Add Items', 'Drag items from the items directory to add them to inventory')}
      ${TemplateComponents.inventoryTable(data.inventory)}
    `;
  }

  _generateNPCsTab(data) {
    return `
      ${TemplateComponents.contentHeader('fas fa-users', 'Shop NPCs')}
      ${TemplateComponents.dropZone('npc', 'fas fa-user-plus', 'Add NPCs', 'Drag NPCs or actors here to associate them with this shop')}
      ${TemplateComponents.entityGrid(data.linkedNPCs, 'npc', true)}
    `;
  }

  _generateNotesTab(data) {
    return `
      ${TemplateComponents.contentHeader('fas fa-sticky-note', 'GM Notes')}
      ${TemplateComponents.formSection('Private Notes', 'fas fa-eye-slash', 'notes', 'Private GM notes about this shop...', data.sheetData.notes, 12)}
    `;
  }

  async _getLinkedNPCs(npcIds) {
    const npcs = [];
    for (const id of npcIds) {
      const journal = game.journal.get(id);
      if (journal) {
        const npcData = journal.getFlag("campaign-codex", "data") || {};
        const actor = npcData.linkedActor ? game.actors.get(npcData.linkedActor) : null;
        npcs.push({
          id: journal.id,
          name: journal.name,
          img: actor ? actor.img : "icons/svg/mystery-man.svg",
          actor: actor,
          meta: game.campaignCodex.getActorDisplayMeta(actor)

        });
      }
    }
    return npcs;
  }

  async _getLinkedLocation(locationId) {
    const journal = game.journal.get(locationId);
    if (journal) {
      return {
        id: journal.id,
        name: journal.name,
        img: journal.getFlag("campaign-codex", "image") ||  "icons/svg/direction.svg"
      };
    }
    return null;
  }

  async _getInventory(inventoryData) {
    const inventory = [];
    for (const itemData of inventoryData) {
      const item = game.items.get(itemData.itemId);
      if (item) {
        const basePrice = item.system.price ? item.system.price.value : 0;
        const currency = item.system.price ? item.system.price.denomination : "gp";
        const markup = this.document.getFlag("campaign-codex", "data.markup") || 1.0;
        const finalPrice = itemData.customPrice || (basePrice * markup);
        
        inventory.push({
          itemId: item.id,
          name: item.name,
          img: item.img,
          basePrice: basePrice,
          finalPrice: finalPrice,
          currency: currency,
          quantity: itemData.quantity || 1,
          weight: item.system.weight || 0
        });
      }
    }
    return inventory;
  }

  _activateSheetSpecificListeners(html) {
    // Markup input
    html.find('.markup-input').change(this._onMarkupChange.bind(this));

    // Remove buttons
    html.find('.remove-npc').click((e) => this._onRemoveFromList(e, 'linkedNPCs'));
    html.find('.remove-item').click(this._onRemoveItem.bind(this));
    html.find('.remove-location').click(this._onRemoveLocation.bind(this));

    // Quantity controls
    html.find('.quantity-decrease').click(this._onQuantityDecrease.bind(this));
    html.find('.quantity-increase').click(this._onQuantityIncrease.bind(this));
    html.find('.quantity-input').change(this._onQuantityChange.bind(this));

    // Price controls
    html.find('.price-input').change(this._onPriceChange.bind(this));

    // Open buttons
    html.find('.open-npc').click((e) => this._onOpenDocument(e, 'npc'));
    html.find('.open-location').click((e) => this._onOpenDocument(e, 'location'));
    html.find('.open-item').click((e) => this._onOpenDocument(e, 'item'));
    html.find('.open-actor').click((e) => this._onOpenDocument(e, 'actor'));

    // Quick links
    html.find('.location-link').click((e) => this._onOpenDocument(e, 'location'));
    html.find('.npc-link').click((e) => this._onOpenDocument(e, 'npc'));
  }

  async _handleDrop(data, event) {
    if (data.type === "Item") {
      await this._handleItemDrop(data, event);
    } else if (data.type === "JournalEntry") {
      await this._handleJournalDrop(data, event);
    } else if (data.type === "Actor") {
      await this._handleActorDrop(data, event);
    }
  }

async _handleItemDrop(data, event) {
  let item;
  
  // Handle different drop sources
  if (data.uuid) {
    // This handles both world items and compendium items
    const sourceItem = await fromUuid(data.uuid);
    if (!sourceItem) return;
    
    // If it's from a compendium, import it to the world first
    if (data.uuid.includes('Compendium.')) {
      console.log('Campaign Codex | Importing item from compendium:', sourceItem.name);
      const itemData = sourceItem.toObject();
      // Remove the _id to let Foundry generate a new one
      delete itemData._id;
      const importedItems = await Item.createDocuments([itemData]);
      item = importedItems[0];
      ui.notifications.info(`Imported "${item.name}" from compendium`);
    } else {
      // It's already a world item
      item = sourceItem;
    }
  } else if (data.id) {
    // Direct item ID (fallback)
    item = game.items.get(data.id);
  }
  
  if (!item) {
    ui.notifications.warn("Could not find item to add to shop");
    return;
  }

  // Check if item already exists in inventory
  const currentData = this.document.getFlag("campaign-codex", "data") || {};
  const inventory = currentData.inventory || [];
  
  if (inventory.find(i => i.itemId === item.id)) {
    ui.notifications.warn("Item already exists in inventory!");
    return;
  }

  await game.campaignCodex.addItemToShop(this.document, item, 1);
  this.render(false);
  ui.notifications.info(`Added "${item.name}" to shop inventory`);
}

  async _handleJournalDrop(data, event) {
    const journal = await fromUuid(data.uuid);
    if (!journal || journal.id === this.document.id) return;

    const journalType = journal.getFlag("campaign-codex", "type");
    
    if (journalType === "npc") {
      await game.campaignCodex.linkShopToNPC(this.document, journal);
      this.render(false);
    } else if (journalType === "location") {
      await game.campaignCodex.linkLocationToShop(journal, this.document);
      this.render(false);
    }
  }


async _handleActorDrop(data, event) {
  let actor;
  
  // Handle different drop sources
  if (data.uuid) {
    const sourceActor = await fromUuid(data.uuid);
    if (!sourceActor || sourceActor.type !== "npc") return;
    
    // If it's from a compendium, import it to the world first
    if (data.uuid.includes('Compendium.')) {
      console.log('Campaign Codex | Importing actor from compendium:', sourceActor.name);
      const actorData = sourceActor.toObject();
      // Remove the _id to let Foundry generate a new one
      delete actorData._id;
      const importedActors = await Actor.createDocuments([actorData]);
      actor = importedActors[0];
      ui.notifications.info(`Imported "${actor.name}" from compendium`);
    } else {
      // It's already a world actor
      actor = sourceActor;
    }
  } else if (data.id) {
    // Direct actor ID (fallback)
    actor = game.actors.get(data.id);
    if (!actor || actor.type !== "npc") return;
  }
  
  if (!actor) {
    ui.notifications.warn("Could not find NPC actor");
    return;
  }

  // Check if there's already an NPC journal for this actor
  let npcJournal = game.journal.find(j => {
    const npcData = j.getFlag("campaign-codex", "data");
    return npcData && npcData.linkedActor === actor.id;
  });

  // If no journal exists, create one
  if (!npcJournal) {
    npcJournal = await game.campaignCodex.createNPCJournal(actor);
    ui.notifications.info(`Created NPC journal for "${actor.name}"`);
  }

  // Automatically link to current sheet based on sheet type
  if (this.getSheetType() === "location") {
    await game.campaignCodex.linkLocationToNPC(this.document, npcJournal);
    ui.notifications.info(`Added "${actor.name}" to location`);
  } else if (this.getSheetType() === "shop") {
    await game.campaignCodex.linkShopToNPC(this.document, npcJournal);
    ui.notifications.info(`Added "${actor.name}" to shop`);
  }
  
  this.render(false);
}

  async _onMarkupChange(event) {
    const markup = parseFloat(event.target.value) || 1.0;
    const currentData = this.document.getFlag("campaign-codex", "data") || {};
    currentData.markup = markup;
    await this.document.setFlag("campaign-codex", "data", currentData);
    this.render(false);
  }

  async _onQuantityChange(event) {
    const quantity = parseInt(event.target.value) || 1;
    const itemId = event.currentTarget.dataset.itemId;
    await this._updateInventoryItem(itemId, { quantity });
  }

  async _onQuantityDecrease(event) {
    const itemId = event.currentTarget.dataset.itemId;
    const currentData = this.document.getFlag("campaign-codex", "data") || {};
    const inventory = currentData.inventory || [];
    const item = inventory.find(i => i.itemId === itemId);
    
    if (item && item.quantity > 0) {
      await this._updateInventoryItem(itemId, { quantity: item.quantity - 1 });
    }
  }

  async _onQuantityIncrease(event) {
    const itemId = event.currentTarget.dataset.itemId;
    const currentData = this.document.getFlag("campaign-codex", "data") || {};
    const inventory = currentData.inventory || [];
    const item = inventory.find(i => i.itemId === itemId);
    
    if (item) {
      await this._updateInventoryItem(itemId, { quantity: item.quantity + 1 });
    }
  }

  async _onPriceChange(event) {
    const price = parseFloat(event.target.value) || null;
    const itemId = event.currentTarget.dataset.itemId;
    await this._updateInventoryItem(itemId, { customPrice: price });
  }

  async _updateInventoryItem(itemId, updates) {
    const currentData = this.document.getFlag("campaign-codex", "data") || {};
    const inventory = currentData.inventory || [];
    const itemIndex = inventory.findIndex(i => i.itemId === itemId);
    
    if (itemIndex !== -1) {
      inventory[itemIndex] = { ...inventory[itemIndex], ...updates };
      currentData.inventory = inventory;
      await this.document.setFlag("campaign-codex", "data", currentData);
      this.render(false);
    }
  }

  async _onRemoveItem(event) {
    const itemId = event.currentTarget.dataset.itemId;
    const currentData = this.document.getFlag("campaign-codex", "data") || {};
    
    currentData.inventory = (currentData.inventory || []).filter(i => i.itemId !== itemId);
    await this.document.setFlag("campaign-codex", "data", currentData);
    
    this.render(false);
  }

  async _onRemoveLocation(event) {
    const currentData = this.document.getFlag("campaign-codex", "data") || {};
    currentData.linkedLocation = null;
    await this.document.setFlag("campaign-codex", "data", currentData);
    this.render(false);
  }

  getSheetType() {
    return "shop";
  }


// Add these methods to the ShopSheet class in scripts/sheets/shop-sheet.js

_activateSheetSpecificListeners(html) {
  // Markup input
  html.find('.markup-input').change(this._onMarkupChange.bind(this));

  // Remove buttons
  html.find('.remove-npc').click((e) => this._onRemoveFromList(e, 'linkedNPCs'));
  html.find('.remove-item').click(this._onRemoveItem.bind(this));
  html.find('.remove-location').click(this._onRemoveLocation.bind(this));

  // Quantity controls
  html.find('.quantity-decrease').click(this._onQuantityDecrease.bind(this));
  html.find('.quantity-increase').click(this._onQuantityIncrease.bind(this));
  html.find('.quantity-input').change(this._onQuantityChange.bind(this));

  // Price controls
  html.find('.price-input').change(this._onPriceChange.bind(this));

  // Open buttons
  html.find('.open-npc').click((e) => this._onOpenDocument(e, 'npc'));
  html.find('.open-location').click((e) => this._onOpenDocument(e, 'location'));
  html.find('.open-item').click(this._onOpenItem.bind(this)); // Updated to use custom method
  html.find('.open-actor').click((e) => this._onOpenDocument(e, 'actor'));

  // Player transfer buttons
  html.find('.send-to-player').click(this._onSendToPlayer.bind(this));

  // Quick links
  html.find('.location-link').click((e) => this._onOpenDocument(e, 'location'));
  html.find('.npc-link').click((e) => this._onOpenDocument(e, 'npc'));

  // Item dragging
  html.find('.inventory-item').on('dragstart', this._onItemDragStart.bind(this));
}

// New method to handle opening item sheets
async _onOpenItem(event) {
  event.stopPropagation();
  const itemId = event.currentTarget.dataset.itemId;
  const item = game.items.get(itemId);
  
  if (item) {
    item.sheet.render(true);
  } else {
    ui.notifications.warn("Item not found in world items");
  }
}

// New method to handle sending items to players
async _onSendToPlayer(event) {
  event.stopPropagation();
  const itemId = event.currentTarget.dataset.itemId;
  const item = game.items.get(itemId);
  
  if (!item) {
    ui.notifications.warn("Item not found");
    return;
  }


  TemplateComponents.createPlayerSelectionDialog(item.name, async (targetActor) => {
    await this._transferItemToActor(item, targetActor);
  });
}

// Method to transfer item to actor
async _transferItemToActor(item, targetActor) {
  try {
    // Create a copy of the item data
    const itemData = item.toObject();
    delete itemData._id; // Remove ID to create a new item
    
    // Get the quantity from the shop inventory
    const currentData = this.document.getFlag("campaign-codex", "data") || {};
    const inventory = currentData.inventory || [];
    const shopItem = inventory.find(i => i.itemId === item.id);
    const quantity = shopItem ? shopItem.quantity : 1;
    
    // Set the quantity
    itemData.system.quantity = Math.min(quantity, 1); // Transfer 1 item at a time
    
    // Add item to target actor
    await targetActor.createEmbeddedDocuments("Item", [itemData]);
    
    // Reduce quantity in shop by 1
    if (shopItem && shopItem.quantity > 1) {
      await this._updateInventoryItem(item.id, { quantity: shopItem.quantity - 1 });
    } else {
      // Remove item from shop if quantity is 1 or less
      await this._onRemoveItem({ currentTarget: { dataset: { itemId: item.id } } });
    }
    
    ui.notifications.info(`Sent "${item.name}" to ${targetActor.name}`);
    
    // Notify the player if they're online
    const targetUser = game.users.find(u => u.character?.id === targetActor.id);
    if (targetUser && targetUser.active) {
      ChatMessage.create({
        content: `<p><strong>${game.user.name}</strong> sent you <strong>${item.name}</strong> from ${this.document.name}!</p>`,
        whisper: [targetUser.id]
      });
    }
    
  } catch (error) {
    console.error("Error transferring item:", error);
    ui.notifications.error("Failed to transfer item");
  }
}

// New method to handle item dragging
_onItemDragStart(event) {
  const itemId = event.currentTarget.dataset.itemId;
  const itemName = event.currentTarget.dataset.itemName;
  
  const dragData = {
    type: "Item",
    id: itemId,
    uuid: `Item.${itemId}`,
    source: "shop",
    shopId: this.document.id,
    shopName: this.document.name
  };
  
  event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  
  // Visual feedback
  event.currentTarget.style.opacity = "0.5";
  setTimeout(() => {
    if (event.currentTarget) {
      event.currentTarget.style.opacity = "1";
    }
  }, 100);
}





}