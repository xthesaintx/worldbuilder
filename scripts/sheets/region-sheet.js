export class RegionSheet extends JournalSheet {
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
  }

  _activateTabs(html) {
    // Tab navigation for sidebar tabs
    html.find('.sidebar-tabs .tab-item').click(event => {
      event.preventDefault();
      const tab = event.currentTarget.dataset.tab;
      this._showTab(tab, html);
    });

    // Show first tab by default
    this._showTab('info', html);
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

  _onDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "link";
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
      this.render();
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
    
    this.render();
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
    // Force refresh of auto-populated data
    this.render();
    ui.notifications.info("Region data refreshed!");
  }
}