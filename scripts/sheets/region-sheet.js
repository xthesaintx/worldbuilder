export class RegionSheet extends JournalSheet {
  constructor(document, options = {}) {
    super(document, options);
    this._currentTab = 'info';
    this._autoSaveTimeout = null;
    this._isDragging = false;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["sheet", "journal-sheet", "campaign-codex", "region-sheet"],
      width: 900,
      height: 700,
      resizable: true,
      dragDrop: [{ dragSelector: null, dropSelector: null }],
      tabs: [{ navSelector: ".sidebar-tabs", contentSelector: ".main-content", initial: "info" }]
    });
  }

  get template() {
    return "modules/campaign-codex/templates/region-sheet.html";
  }

  async getData() {
    const data = await super.getData();
    const regionData = this.document.getFlag("campaign-codex", "data") || {};
    
    data.linkedLocations = await this._getLinkedLocations(regionData.linkedLocations || []);
    data.autoPopulatedNPCs = await this._getAutoPopulatedNPCs(regionData.linkedLocations || []);
    data.autoPopulatedShops = await this._getAutoPopulatedShops(regionData.linkedLocations || []);
    
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

    this._activateTabs(html);
    this._setupDragAndDrop(html);
    this._setupAutoSave(html);

    // Remove buttons
    html.find('.remove-location').click(this._onRemoveLocation.bind(this));

    // Open document buttons
    html.find('.open-location').click(this._onOpenLocation.bind(this));
    html.find('.open-npc').click(this._onOpenNPC.bind(this));
    html.find('.open-shop').click(this._onOpenShop.bind(this));
    html.find('.open-actor').click(this._onOpenActor.bind(this));

    // Refresh NPCs button
    html.find('.refresh-npcs').click(this._onRefreshNPCs.bind(this));
  }

  _activateTabs(html) {
    html.find('.sidebar-tabs .tab-item').click(event => {
      event.preventDefault();
      const tab = event.currentTarget.dataset.tab;
      this._currentTab = tab;
      this._showTab(tab, html);
    });

    this._showTab(this._currentTab, html);
  }

  _showTab(tabName, html) {
    const $html = html instanceof jQuery ? html : $(html);
    
    $html.find('.sidebar-tabs .tab-item').removeClass('active');
    $html.find('.tab-panel').removeClass('active');

    $html.find(`.sidebar-tabs .tab-item[data-tab="${tabName}"]`).addClass('active');
    $html.find(`.tab-panel[data-tab="${tabName}"]`).addClass('active');
  }

  _setupDragAndDrop(html) {
    const mainContent = html.find('.main-content')[0];
    
    mainContent.addEventListener('dragenter', (event) => {
      event.preventDefault();
      this._isDragging = true;
      mainContent.classList.add('drag-active');
    });

    mainContent.addEventListener('dragleave', (event) => {
      event.preventDefault();
      if (!mainContent.contains(event.relatedTarget)) {
        this._isDragging = false;
        mainContent.classList.remove('drag-active');
      }
    });

    mainContent.addEventListener('dragover', (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "link";
    });

    mainContent.addEventListener('drop', (event) => {
      event.preventDefault();
      this._isDragging = false;
      mainContent.classList.remove('drag-active');
      this._onDrop(event);
    });
  }

  _setupAutoSave(html) {
    html.find('textarea, input').on('input', (event) => {
      this._scheduleAutoSave();
    });
  }

  _scheduleAutoSave() {
    if (this._autoSaveTimeout) {
      clearTimeout(this._autoSaveTimeout);
    }

    this._autoSaveTimeout = setTimeout(() => {
      this._performAutoSave();
    }, 1000);
  }

  async _performAutoSave() {
    const form = this.element.find('form')[0];
    if (!form) return;

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
      this._showAutoSaveIndicator("Saved");
    } catch (error) {
      console.error("Campaign Codex | Auto-save failed:", error);
      this._showAutoSaveIndicator("Save failed", true);
    }
  }

  _showAutoSaveIndicator(message, isError = false) {
    const existing = document.querySelector('.auto-save-indicator');
    if (existing) existing.remove();

    const indicator = document.createElement('div');
    indicator.className = 'auto-save-indicator';
    indicator.textContent = message;
    if (isError) indicator.style.backgroundColor = 'var(--cc-danger)';

    document.body.appendChild(indicator);

    setTimeout(() => indicator.classList.add('show'), 10);
    setTimeout(() => {
      indicator.classList.remove('show');
      setTimeout(() => indicator.remove(), 200);
    }, 2000);
  }

  async _onDrop(event) {
    event.preventDefault();
    
    let data;
    try {
      data = JSON.parse(event.dataTransfer.getData('text/plain'));
    } catch (err) {
      return;
    }

    if (data.type === "JournalEntry") {
      await this._handleJournalDrop(data);
    }
  }

  async _handleJournalDrop(data) {
    const journal = await fromUuid(data.uuid);
    if (!journal) return;

    const journalType = journal.getFlag("campaign-codex", "type");
    
    if (journalType === "location") {
      await game.campaignCodex.linkRegionToLocation(this.document, journal);
      this.render(false);
    }
  }

  async _onRemoveLocation(event) {
    const locationId = event.currentTarget.dataset.locationId;
    const currentData = this.document.getFlag("campaign-codex", "data") || {};
    
    currentData.linkedLocations = (currentData.linkedLocations || []).filter(id => id !== locationId);
    await this.document.setFlag("campaign-codex", "data", currentData);
    
    this.render(false);
  }

  _onOpenLocation(event) {
    const locationId = event.currentTarget.dataset.locationId;
    const journal = game.journal.get(locationId);
    if (journal) journal.sheet.render(true);
  }

  _onOpenNPC(event) {
    const npcId = event.currentTarget.dataset.npcId;
    const journal = game.journal.get(npcId);
    if (journal) journal.sheet.render(true);
  }

  _onOpenShop(event) {
    const shopId = event.currentTarget.dataset.shopId;
    const journal = game.journal.get(shopId);
    if (journal) journal.sheet.render(true);
  }

  _onOpenActor(event) {
    const actorId = event.currentTarget.dataset.actorId;
    const actor = game.actors.get(actorId);
    if (actor) actor.sheet.render(true);
  }

  async _onRefreshNPCs(event) {
    this.render(false);
    this._showAutoSaveIndicator("Refreshed");
  }

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

  close(options = {}) {
    if (this._autoSaveTimeout) {
      clearTimeout(this._autoSaveTimeout);
    }
    return super.close(options);
  }
}
