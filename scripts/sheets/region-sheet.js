export class RegionSheet extends JournalSheet {
  constructor(document, options = {}) {
    super(document, options);
    this._currentTab = 'info';
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["sheet", "journal-sheet", "campaign-codex", "region-sheet"],
      width: 900,
      height: 700,
      resizable: true,
      tabs: [{ navSelector: ".sidebar-tabs", contentSelector: ".main-content", initial: "info" }]
    });
  }

  get template() {
    return "modules/campaign-codex/templates/region-sheet.html";
  }

  async getData() {
    const data = await super.getData();
    const regionData = this.document.getFlag("campaign-codex", "data") || {};
    
    // Get linked documents
    data.linkedLocations = await this._getLinkedLocations(regionData.linkedLocations || []);
    data.autoPopulatedNPCs = await this._getAutoPopulatedNPCs(regionData.linkedLocations || []);
    data.autoPopulatedShops = await this._getAutoPopulatedShops(regionData.linkedLocations || []);
    
    // Region specific data
    data.regionData = {
      description: regionData.description || "",
      notes: regionData.notes || ""
    };

    data.canEdit = this.document.canUserModify(game.user, "update");
    data.currentTab = this._currentTab;
    
    return data;
  }

  async _getLinkedLocations(locationIds) {
    const locations = [];
    for (const id of locationIds) {
      const journal = game.journal.get(id);
      if (journal) {
        const locationData = journal.getFlag("campaign-codex", "data") || {};
        locations.push({
          id: journal.id,
          name: journal.name,
          img: journal.img || "icons/svg/direction.svg",
          npcCount: (locationData.linkedNPCs || []).length,
          shopCount: (locationData.linkedShops || []).length
        });
      }
    }
    return locations;
  }

  async _getAutoPopulatedNPCs(locationIds) {
    const npcMap = new Map();
    
    for (const locationId of locationIds) {
      const location = game.journal.get(locationId);
      if (!location) continue;
      
      const locationData = location.getFlag("campaign-codex", "data") || {};
      const linkedNPCs = locationData.linkedNPCs || [];
      
      for (const npcId of linkedNPCs) {
        const npcJournal = game.journal.get(npcId);
        if (!npcJournal) continue;
        
        if (!npcMap.has(npcId)) {
          const npcData = npcJournal.getFlag("campaign-codex", "data") || {};
          const actor = npcData.linkedActor ? game.actors.get(npcData.linkedActor) : null;
          
          npcMap.set(npcId, {
            id: npcJournal.id,
            name: npcJournal.name,
            img: actor ? actor.img : "icons/svg/mystery-man.svg",
            actor: actor,
            locations: [location.name]
          });
        } else {
          // Add this location to the NPC's location list
          const npc = npcMap.get(npcId);
          if (!npc.locations.includes(location.name)) {
            npc.locations.push(location.name);
          }
        }
      }
    }
    
    return Array.from(npcMap.values());
  }

  async _getAutoPopulatedShops(locationIds) {
    const shopMap = new Map();
    
    for (const locationId of locationIds) {
      const location = game.journal.get(locationId);
      if (!location) continue;
      
      const locationData = location.getFlag("campaign-codex", "data") || {};
      const linkedShops = locationData.linkedShops || [];
      
      for (const shopId of linkedShops) {
        const shopJournal = game.journal.get(shopId);
        if (!shopJournal) continue;
        
        if (!shopMap.has(shopId)) {
          shopMap.set(shopId, {
            id: shopJournal.id,
            name: shopJournal.name,
            img: "icons/svg/item-bag.svg",
            location: location.name
          });
        }
      }
    }
    
    return Array.from(shopMap.values());
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

    // Save button
    html.find('.save-data').click(this._onSaveData.bind(this));

    // Remove buttons
    html.find('.remove-location').click(this._onRemoveLocation.bind(this));

    // Open document buttons
    html.find('.open-location').click(this._onOpenLocation.bind(this));
    html.find('.open-npc').click(this._onOpenNPC.bind(this));
    html.find('.open-shop').click(this._onOpenShop.bind(this));
    html.find('.open-actor').click(this._onOpenActor.bind(this));

    // Refresh NPCs button
    html.find('.refresh-npcs').click(this._onRefreshNPCs.bind(this));

    // Quick links
    html.find('.location-link').click(this._onOpenLocation.bind(this));
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
      if (data.type === "JournalEntry") {
        await this._handleJournalDrop(data);
      }
    } finally {
      this._dropping = false;
    }
  }

  async _handleJournalDrop(data) {
    const journal = await fromUuid(data.uuid);
    if (!journal || journal.id === this.document.id) return; // Prevent self-linking

    const journalType = journal.getFlag("campaign-codex", "type");
    
    if (journalType === "location") {
      await game.campaignCodex.linkRegionToLocation(this.document, journal);
      this.render(false);
    }
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
      ui.notifications.info("Region data saved successfully!");
      
      const saveBtn = $(event.currentTarget);
      saveBtn.addClass('success');
      setTimeout(() => saveBtn.removeClass('success'), 2000);
      
    } catch (error) {
      console.error("Campaign Codex | Error saving region data:", error);
      ui.notifications.error("Failed to save region data!");
      
      const saveBtn = $(event.currentTarget);
      saveBtn.addClass('error');
      setTimeout(() => saveBtn.removeClass('error'), 2000);
    }
  }

  async _onRemoveLocation(event) {
    const locationId = event.currentTarget.dataset.locationId;
    const currentData = this.document.getFlag("campaign-codex", "data") || {};
    
    currentData.linkedLocations = (currentData.linkedLocations || []).filter(id => id !== locationId);
    await this.document.setFlag("campaign-codex", "data", currentData);
    
    this.render(false);
  }

  // Fixed open methods
  _onOpenLocation(event) {
    event.stopPropagation();
    const locationId = event.currentTarget.dataset.locationId || event.currentTarget.closest('[data-location-id]').dataset.locationId;
    const journal = game.journal.get(locationId);
    if (journal) journal.sheet.render(true);
  }

  _onOpenNPC(event) {
    event.stopPropagation();
    const npcId = event.currentTarget.dataset.npcId;
    const journal = game.journal.get(npcId);
    if (journal) journal.sheet.render(true);
  }

  _onOpenShop(event) {
    event.stopPropagation();
    const shopId = event.currentTarget.dataset.shopId;
    const journal = game.journal.get(shopId);
    if (journal) journal.sheet.render(true);
  }

  _onOpenActor(event) {
    event.stopPropagation();
    const actorId = event.currentTarget.dataset.actorId;
    const actor = game.actors.get(actorId);
    if (actor) actor.sheet.render(true);
  }

  async _onRefreshNPCs(event) {
    // Force refresh of auto-populated data
    this.render(false);
    ui.notifications.info("Region data refreshed!");
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