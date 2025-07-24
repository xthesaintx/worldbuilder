export class NPCSheet extends JournalSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["sheet", "journal-sheet", "campaign-codex", "npc-sheet"],
      width: 900,
      height: 700,
      resizable: true,
      tabs: [{ navSelector: ".sidebar-tabs", contentSelector: ".main-content", initial: "info" }]
    });
  }

  get template() {
    return "modules/campaign-codex/templates/npc-sheet.html";
  }

  async getData() {
    const data = await super.getData();
    const npcData = this.document.getFlag("campaign-codex", "data") || {};
    
    // Get linked documents
    data.linkedActor = npcData.linkedActor ? await this._getLinkedActor(npcData.linkedActor) : null;
    data.linkedLocations = await this._getLinkedLocations(npcData.linkedLocations || []);
    data.linkedShops = await this._getLinkedShops(npcData.linkedShops || []);
    data.associates = await this._getAssociates(npcData.associates || []);
    
    // NPC specific data
    data.npcData = {
      description: npcData.description || "",
      notes: npcData.notes || ""
    };

    data.canEdit = this.document.canUserModify(game.user, "update");
    
    return data;
  }

  async _getLinkedActor(actorId) {
    const actor = game.actors.get(actorId);
    if (actor) {
      return {
        id: actor.id,
        name: actor.name,
        img: actor.img,
        race: actor.system.details?.race || "Unknown",
        class: actor.system.details?.class || "Unknown",
        level: actor.system.details?.level || 1,
        ac: actor.system.attributes?.ac?.value || 10,
        hp: actor.system.attributes?.hp || { value: 0, max: 0 },
        speed: actor.system.attributes?.movement?.walk || 30
      };
    }
    return null;
  }

  async _getLinkedLocations(locationIds) {
    const locations = [];
    for (const id of locationIds) {
      const journal = game.journal.get(id);
      if (journal) {
        locations.push({
          id: journal.id,
          name: journal.name,
          img: journal.img || "icons/svg/direction.svg"
        });
      }
    }
    return locations;
  }

  async _getLinkedShops(shopIds) {
    const shops = [];
    for (const id of shopIds) {
      const journal = game.journal.get(id);
      if (journal) {
        shops.push({
          id: journal.id,
          name: journal.name,
          img: "icons/svg/item-bag.svg"
        });
      }
    }
    return shops;
  }

  async _getAssociates(associateIds) {
    const associates = [];
    for (const id of associateIds) {
      const journal = game.journal.get(id);
      if (journal) {
        const npcData = journal.getFlag("campaign-codex", "data") || {};
        const actor = npcData.linkedActor ? game.actors.get(npcData.linkedActor) : null;
        associates.push({
          id: journal.id,
          name: journal.name,
          img: actor ? actor.img : "icons/svg/mystery-man.svg",
          actor: actor
        });
      }
    }
    return associates;
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
    html.find('.remove-actor').click(this._onRemoveActor.bind(this));
    html.find('.remove-location').click(this._onRemoveLocation.bind(this));
    html.find('.remove-shop').click(this._onRemoveShop.bind(this));
    html.find('.remove-associate').click(this._onRemoveAssociate.bind(this));

    // Open document buttons
    html.find('.open-actor').click(this._onOpenActor.bind(this));
    html.find('.open-location').click(this._onOpenLocation.bind(this));
    html.find('.open-shop').click(this._onOpenShop.bind(this));
    html.find('.open-associate').click(this._onOpenAssociate.bind(this));
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

    if (data.type === "Actor") {
      await this._handleActorDrop(data);
    } else if (data.type === "JournalEntry") {
      await this._handleJournalDrop(data);
    } else if (data.type === "Tile") {
      await this._handleTileDrop(data);
    }
  }

  async _handleActorDrop(data) {
    const actor = await fromUuid(data.uuid);
    if (!actor) return;

    // Check if this is for the main actor link or an associate
    const dropZone = event.target.closest('.drop-zone');
    const dropType = dropZone?.dataset.dropType;

    if (dropType === "actor") {
      // Link main actor
      const currentData = this.document.getFlag("campaign-codex", "data") || {};
      currentData.linkedActor = actor.id;
      await this.document.setFlag("campaign-codex", "data", currentData);
      this.render();
    } else if (dropType === "associate" && actor.type === "npc") {
      // Create or find NPC journal for this actor and add as associate
      let npcJournal = game.journal.find(j => {
        const npcData = j.getFlag("campaign-codex", "data");
        return npcData && npcData.linkedActor === actor.id;
      });

      if (!npcJournal) {
        npcJournal = await game.campaignCodex.createNPCJournal(actor);
      }

      await game.campaignCodex.linkNPCToNPC(this.document, npcJournal);
      this.render();
    }
  }

  async _handleJournalDrop(data) {
    const journal = await fromUuid(data.uuid);
    if (!journal) return;

    const journalType = journal.getFlag("campaign-codex", "type");
    
    if (journalType === "location") {
      await game.campaignCodex.linkLocationToNPC(journal, this.document);
      this.render();
    } else if (journalType === "shop") {
      await game.campaignCodex.linkShopToNPC(journal, this.document);
      this.render();
    } else if (journalType === "npc") {
      await game.campaignCodex.linkNPCToNPC(this.document, journal);
      this.render();
    }
  }

  async _handleTileDrop(data) {
    // Handle tile drops for image associations
    const tile = await fromUuid(data.uuid);
    if (!tile) return;

    const currentData = this.document.getFlag("campaign-codex", "data") || {};
    const imageTiles = currentData.imageTiles || [];
    
    if (!imageTiles.find(t => t.id === tile.id)) {
      imageTiles.push({
        id: tile.id,
        img: tile.texture.src,
        scene: tile.parent.id
      });
      
      currentData.imageTiles = imageTiles;
      await this.document.setFlag("campaign-codex", "data", currentData);
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
      ui.notifications.info("NPC data saved successfully!");
      
      const saveBtn = $(event.currentTarget);
      saveBtn.addClass('success');
      setTimeout(() => saveBtn.removeClass('success'), 2000);
      
    } catch (error) {
      console.error("Campaign Codex | Error saving NPC data:", error);
      ui.notifications.error("Failed to save NPC data!");
      
      const saveBtn = $(event.currentTarget);
      saveBtn.addClass('error');
      setTimeout(() => saveBtn.removeClass('error'), 2000);
    }
  }

  async _onRemoveActor(event) {
    const currentData = this.document.getFlag("campaign-codex", "data") || {};
    currentData.linkedActor = null;
    await this.document.setFlag("campaign-codex", "data", currentData);
    this.render();
  }

  async _onRemoveLocation(event) {
    const locationId = event.currentTarget.dataset.locationId;
    const currentData = this.document.getFlag("campaign-codex", "data") || {};
    
    currentData.linkedLocations = (currentData.linkedLocations || []).filter(id => id !== locationId);
    await this.document.setFlag("campaign-codex", "data", currentData);
    
    this.render();
  }

  async _onRemoveShop(event) {
    const shopId = event.currentTarget.dataset.shopId;
    const currentData = this.document.getFlag("campaign-codex", "data") || {};
    
    currentData.linkedShops = (currentData.linkedShops || []).filter(id => id !== shopId);
    await this.document.setFlag("campaign-codex", "data", currentData);
    
    this.render();
  }

  async _onRemoveAssociate(event) {
    const associateId = event.currentTarget.dataset.associateId;
    const currentData = this.document.getFlag("campaign-codex", "data") || {};
    
    currentData.associates = (currentData.associates || []).filter(id => id !== associateId);
    await this.document.setFlag("campaign-codex", "data", currentData);
    
    this.render();
  }

  _onOpenActor(event) {
    const actorId = event.currentTarget.dataset.actorId;
    const actor = game.actors.get(actorId);
    if (actor) actor.sheet.render(true);
  }

  _onOpenLocation(event) {
    const locationId = event.currentTarget.dataset.locationId;
    const journal = game.journal.get(locationId);
    if (journal) journal.sheet.render(true);
  }

  _onOpenShop(event) {
    const shopId = event.currentTarget.dataset.shopId;
    const journal = game.journal.get(shopId);
    if (journal) journal.sheet.render(true);
  }

  _onOpenAssociate(event) {
    const associateId = event.currentTarget.dataset.associateId;
    const journal = game.journal.get(associateId);
    if (journal) journal.sheet.render(true);
  }
}