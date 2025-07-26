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
    data.customImage = this.document.img || "icons/svg/item-bag.svg";
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
          meta: actor ? `<span class="entity-type">${actor.system.details?.race || 'Unknown'} ${actor.system.details?.class || 'Unknown'}</span>` : '<span class="entity-type">NPC</span>'
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
        img: journal.img || "icons/svg/direction.svg"
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
    const item = await fromUuid(data.uuid);
    if (!item) return;

    // Check if item already exists in inventory
    const currentData = this.document.getFlag("campaign-codex", "data") || {};
    const inventory = currentData.inventory || [];
    
    if (inventory.find(i => i.itemId === item.id)) {
      ui.notifications.warn("Item already exists in inventory!");
      return;
    }

    await game.campaignCodex.addItemToShop(this.document, item, 1);
    this.render(false);
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
    const actor = await fromUuid(data.uuid);
    if (!actor || actor.type !== "npc") return;

    let npcJournal = game.journal.find(j => {
      const npcData = j.getFlag("campaign-codex", "data");
      return npcData && npcData.linkedActor === actor.id;
    });

    if (!npcJournal) {
      npcJournal = await game.campaignCodex.createNPCJournal(actor);
    }

    await game.campaignCodex.linkShopToNPC(this.document, npcJournal);
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
}