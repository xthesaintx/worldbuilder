export class ShopSheet extends JournalSheet {
  constructor(document, options = {}) {
    super(document, options);
    this._currentTab = 'info';
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["sheet", "journal-sheet", "campaign-codex", "shop-sheet"],
      width: 900,
      height: 700,
      resizable: true,
      tabs: [{ navSelector: ".sidebar-tabs", contentSelector: ".main-content", initial: "info" }]
    });
  }

  get template() {
    return "modules/campaign-codex/templates/shop-sheet.html";
  }

  async getData() {
    const data = await super.getData();
    const shopData = this.document.getFlag("campaign-codex", "data") || {};
    
    // Get linked documents
    data.linkedNPCs = await this._getLinkedNPCs(shopData.linkedNPCs || []);
    data.linkedLocation = shopData.linkedLocation ? await this._getLinkedLocation(shopData.linkedLocation) : null;
    data.inventory = await this._getInventory(shopData.inventory || []);
    
    // Shop specific data
    data.shopData = {
      description: shopData.description || "",
      markup: shopData.markup || 1.0,
      notes: shopData.notes || ""
    };

    data.canEdit = this.document.canUserModify(game.user, "update");
    data.currentTab = this._currentTab;
    
    return data;
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
          actor: actor
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
        img: "icons/svg/direction.svg"
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
          name: item.name, // Just the name, no additional description
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

  activateListeners(html) {
    super.activateListeners(html);

    // Activate tabs
    this._activateTabs(html);

    // Make the sheet a drop target
    html[0].addEventListener('drop', this._onDrop.bind(this));
    html[0].addEventListener('dragover', this._onDragOver.bind(this));

    // Name editing
    html.find('.location-name').click(this._onNameEdit.bind(this));
    html.find('.name-input').blur(this._onNameSave.bind(this));
    html.find('.name-input').keypress(this._onNameKeypress.bind(this));

    // Image change functionality
    html.find('.location-image').click(this._onImageClick.bind(this));
    html.find('.image-change-btn').click(this._onImageClick.bind(this));

    // Save button (remove auto-save, only manual save)
    html.find('.save-data').click(this._onSaveData.bind(this));

    // Markup input
    html.find('.markup-input').change(this._onMarkupChange.bind(this));

    // Remove buttons
    html.find('.remove-npc').click(this._onRemoveNPC.bind(this));
    html.find('.remove-item').click(this._onRemoveItem.bind(this));
    html.find('.remove-location').click(this._onRemoveLocation.bind(this));

    // Quantity controls
    html.find('.quantity-decrease').click(this._onQuantityDecrease.bind(this));
    html.find('.quantity-increase').click(this._onQuantityIncrease.bind(this));
    html.find('.quantity-input').change(this._onQuantityChange.bind(this));

    // Price controls
    html.find('.price-input').change(this._onPriceChange.bind(this));

    // Open document buttons
    html.find('.open-npc').click(this._onOpenNPC.bind(this));
    html.find('.open-location').click(this._onOpenLocation.bind(this));
    html.find('.open-item').click(this._onOpenItem.bind(this));
    html.find('.open-actor').click(this._onOpenActor.bind(this));

    // Quick links
    html.find('.location-link').click(this._onOpenLocation.bind(this));
    html.find('.npc-link').click(this._onOpenNPC.bind(this));
  }

  _activateTabs(html) {
    // Tab navigation for sidebar tabs
    html.find('.sidebar-tabs .tab-item').click(event => {
      event.preventDefault();
      const tab = event.currentTarget.dataset.tab;
      this._currentTab = tab;
      this._showTab(tab, html);
    });

    // Show current tab
    this._showTab(this._currentTab, html);
  }

  _showTab(tabName, html) {
    const $html = html instanceof jQuery ? html : $(html);
    
    // Remove active from all tabs and panels
    $html.find('.sidebar-tabs .tab-item').removeClass('active');
    $html.find('.tab-panel').removeClass('active');

    // Add active to the correct tab and panel
    $html.find(`.sidebar-tabs .tab-item[data-tab="${tabName}"]`).addClass('active');
    $html.find(`.tab-panel[data-tab="${tabName}"]`).addClass('active');
  }

  // Name editing functionality
  async _onNameEdit(event) {
    const nameElement = $(event.currentTarget);
    const currentName = nameElement.text();
    
    const input = $(`<input type="text" class="name-input" value="${currentName}" style="background: transparent; border: 1px solid rgba(255,255,255,0.3); color: white; padding: 2px 8px; border-radius: 4px; font-size: 24px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">`);
    
    nameElement.replaceWith(input);
    input.focus().select();
  }

  async _onNameSave(event) {
    const input = $(event.currentTarget);
    const newName = input.val().trim();
    
    if (newName && newName !== this.document.name) {
      await this.document.update({ name: newName });
    }
    
    const nameElement = $(`<h1 class="location-name">${this.document.name}</h1>`);
    input.replaceWith(nameElement);
    nameElement.click(this._onNameEdit.bind(this));
  }

  async _onNameKeypress(event) {
    if (event.which === 13) { // Enter key
      event.currentTarget.blur();
    }
  }

  async _onImageClick(event) {
    event.preventDefault();
    
    const current = this.document.img;
    const fp = new FilePicker({
      type: "image",
      current: current,
      callback: async (path) => {
        await this.document.update({ img: path });
        this.render(false);
      }
    });
    
    return fp.browse();
  }

  _onDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "link";
  }

  async _onDrop(event) {
    event.preventDefault();
    
    // Prevent duplicate drops
    if (this._dropping) return;
    this._dropping = true;
    
    let data;
    try {
      data = JSON.parse(event.dataTransfer.getData('text/plain'));
    } catch (err) {
      this._dropping = false;
      return;
    }

    try {
      if (data.type === "Item") {
        await this._handleItemDrop(data);
      } else if (data.type === "JournalEntry") {
        await this._handleJournalDrop(data);
      } else if (data.type === "Actor") {
        await this._handleActorDrop(data);
      }
    } finally {
      this._dropping = false;
    }
  }

  async _handleItemDrop(data) {
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

  async _handleJournalDrop(data) {
    const journal = await fromUuid(data.uuid);
    if (!journal || journal.id === this.document.id) return; // Prevent self-linking

    const journalType = journal.getFlag("campaign-codex", "type");
    
    if (journalType === "npc") {
      await game.campaignCodex.linkShopToNPC(this.document, journal);
      this.render(false);
    } else if (journalType === "location") {
      await game.campaignCodex.linkLocationToShop(journal, this.document);
      this.render(false);
    }
  }

  async _handleActorDrop(data) {
    const actor = await fromUuid(data.uuid);
    if (!actor || actor.type !== "npc") return;

    // Check if there's already an NPC journal for this actor
    let npcJournal = game.journal.find(j => {
      const npcData = j.getFlag("campaign-codex", "data");
      return npcData && npcData.linkedActor === actor.id;
    });

    // If no journal exists, create one
    if (!npcJournal) {
      npcJournal = await game.campaignCodex.createNPCJournal(actor);
    }

    // Link the shop to the NPC journal
    await game.campaignCodex.linkShopToNPC(this.document, npcJournal);
    this.render(false);
  }

  async _onSaveData(event) {
    event.preventDefault();
    
    const form = this.element.find('form')[0];
    const formData = new FormDataExtended(form);
    const data = formData.object;

    const currentData = this.document.getFlag("campaign-codex", "data") || {};
    const updatedData = {
      ...currentData,
      description: data.description || "",
      notes: data.notes || ""
    };

    try {
      await this.document.setFlag("campaign-codex", "data", updatedData);
      ui.notifications.info("Shop data saved successfully!");
      
      const saveBtn = $(event.currentTarget);
      saveBtn.addClass('success');
      setTimeout(() => saveBtn.removeClass('success'), 2000);
      
    } catch (error) {
      console.error("Campaign Codex | Error saving shop data:", error);
      ui.notifications.error("Failed to save shop data!");
      
      const saveBtn = $(event.currentTarget);
      saveBtn.addClass('error');
      setTimeout(() => saveBtn.removeClass('error'), 2000);
    }
  }

  async _onMarkupChange(event) {
    const markup = parseFloat(event.target.value) || 1.0;
    const currentData = this.document.getFlag("campaign-codex", "data") || {};
    currentData.markup = markup;
    await this.document.setFlag("campaign-codex", "data", currentData);
    this.render(false); // Re-render to update prices
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

  async _onRemoveNPC(event) {
    const npcId = event.currentTarget.dataset.npcId;
    const currentData = this.document.getFlag("campaign-codex", "data") || {};
    
    currentData.linkedNPCs = (currentData.linkedNPCs || []).filter(id => id !== npcId);
    await this.document.setFlag("campaign-codex", "data", currentData);
    
    this.render(false);
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

  // Fixed open methods
  _onOpenNPC(event) {
    event.stopPropagation();
    const npcId = event.currentTarget.dataset.npcId || event.currentTarget.closest('[data-npc-id]').dataset.npcId;
    const journal = game.journal.get(npcId);
    if (journal) journal.sheet.render(true);
  }

  _onOpenLocation(event) {
    event.stopPropagation();
    const locationId = event.currentTarget.dataset.locationId || event.currentTarget.closest('[data-location-id]').dataset.locationId;
    const journal = game.journal.get(locationId);
    if (journal) journal.sheet.render(true);
  }

  _onOpenItem(event) {
    event.stopPropagation();
    const itemId = event.currentTarget.dataset.itemId;
    const item = game.items.get(itemId);
    if (item) item.sheet.render(true);
  }

  _onOpenActor(event) {
    event.stopPropagation();
    const actorId = event.currentTarget.dataset.actorId;
    const actor = game.actors.get(actorId);
    if (actor) actor.sheet.render(true);
  }

  // Override render to preserve tab state
  async render(force = false, options = {}) {
    const currentTab = this._currentTab;
    const result = await super.render(force, options);
    
    if (this._element && currentTab) {
      setTimeout(() => {
        this._showTab(currentTab, this._element);
      }, 50);
    }
    
    return result;
  }

  // Override close to save on close
  async close(options = {}) {
    // Auto-save on close
    const form = this.element?.find('form')[0];
    if (form) {
      const formData = new FormDataExtended(form);
      const data = formData.object;
      const currentData = this.document.getFlag("campaign-codex", "data") || {};
      const updatedData = {
        ...currentData,
        description: data.description || "",
        notes: data.notes || ""
      };
      await this.document.setFlag("campaign-codex", "data", updatedData);
    }
    
    return super.close(options);
  }
}