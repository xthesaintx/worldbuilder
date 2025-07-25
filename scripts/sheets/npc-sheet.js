export class NPCSheet extends JournalSheet {
  constructor(document, options = {}) {
    super(document, options);
    this._currentTab = 'info';
    this._autoSaveTimeout = null;
    this._isDragging = false;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["sheet", "journal-sheet", "campaign-codex", "npc-sheet"],
      width: 900,
      height: 700,
      resizable: true,
      dragDrop: [{ dragSelector: null, dropSelector: null }], // Accept drops anywhere
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
    data.currentTab = this._currentTab;
    
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

    // Activate tabs and preserve state
    this._activateTabs(html);

    // Make entire main content area droppable
    this._setupDragAndDrop(html);

    // Auto-save functionality
    this._setupAutoSave(html);

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
    html.find('.sidebar-tabs .tab-item').click(event => {
      event.preventDefault();
      const tab = event.currentTarget.dataset.tab;
      this._currentTab = tab;
      this._showTab(tab, html);
    });

    // Show current tab (preserves state)
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
    
    // Handle drag events for visual feedback
    mainContent.addEventListener('dragenter', (event) => {
      event.preventDefault();
      this._isDragging = true;
      mainContent.classList.add('drag-active');
    });

    mainContent.addEventListener('dragleave', (event) => {
      event.preventDefault();
      // Only remove drag-active if we're actually leaving the main content
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
    // Auto-save on input changes
    html.find('textarea, input').on('input', (event) => {
      this._scheduleAutoSave();
    });
  }

  _scheduleAutoSave() {
    // Clear existing timeout
    if (this._autoSaveTimeout) {
      clearTimeout(this._autoSaveTimeout);
    }

    // Schedule new save after 1 second of inactivity
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
    // Remove existing indicator
    const existing = document.querySelector('.auto-save-indicator');
    if (existing) existing.remove();

    // Create new indicator
    const indicator = document.createElement('div');
    indicator.className = 'auto-save-indicator';
    indicator.textContent = message;
    if (isError) indicator.style.backgroundColor = 'var(--cc-danger)';

    document.body.appendChild(indicator);

    // Show with animation
    setTimeout(() => indicator.classList.add('show'), 10);

    // Hide after 2 seconds
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

    if (data.type === "Actor") {
      await this._handleActorDrop(data);
    } else if (data.type === "JournalEntry") {
      await this._handleJournalDrop(data);
    }
  }

  async _handleActorDrop(data) {
    const actor = await fromUuid(data.uuid);
    if (!actor) return;

    if (actor.type === "npc") {
      const currentData = this.document.getFlag("campaign-codex", "data") || {};
      
      // If no actor is linked, link this one
      if (!currentData.linkedActor) {
        currentData.linkedActor = actor.id;
        await this.document.setFlag("campaign-codex", "data", currentData);
        this.render(false);
      } else {
        // Create or find NPC journal for this actor and add as associate
        let npcJournal = game.journal.find(j => {
          const npcData = j.getFlag("campaign-codex", "data");
          return npcData && npcData.linkedActor === actor.id;
        });

        if (!npcJournal) {
          npcJournal = await game.campaignCodex.createNPCJournal(actor);
        }

        await game.campaignCodex.linkNPCToNPC(this.document, npcJournal);
        this.render(false);
      }
    }
  }

  async _handleJournalDrop(data) {
    const journal = await fromUuid(data.uuid);
    if (!journal) return;

    const journalType = journal.getFlag("campaign-codex", "type");
    
    if (journalType === "location") {
      await game.campaignCodex.linkLocationToNPC(journal, this.document);
      this.render(false);
    } else if (journalType === "shop") {
      await game.campaignCodex.linkShopToNPC(journal, this.document);
      this.render(false);
    } else if (journalType === "npc") {
      await game.campaignCodex.linkNPCToNPC(this.document, journal);
      this.render(false);
    }
  }

  async _onRemoveActor(event) {
    const currentData = this.document.getFlag("campaign-codex", "data") || {};
    currentData.linkedActor = null;
    await this.document.setFlag("campaign-codex", "data", currentData);
    this.render(false);
  }

  async _onRemoveLocation(event) {
    const locationId = event.currentTarget.dataset.locationId;
    const currentData = this.document.getFlag("campaign-codex", "data") || {};
    
    currentData.linkedLocations = (currentData.linkedLocations || []).filter(id => id !== locationId);
    await this.document.setFlag("campaign-codex", "data", currentData);
    
    this.render(false);
  }

  async _onRemoveShop(event) {
    const shopId = event.currentTarget.dataset.shopId;
    const currentData = this.document.getFlag("campaign-codex", "data") || {};
    
    currentData.linkedShops = (currentData.linkedShops || []).filter(id => id !== shopId);
    await this.document.setFlag("campaign-codex", "data", currentData);
    
    this.render(false);
  }

  async _onRemoveAssociate(event) {
    const associateId = event.currentTarget.dataset.associateId;
    const currentData = this.document.getFlag("campaign-codex", "data") || {};
    
    currentData.associates = (currentData.associates || []).filter(id => id !== associateId);
    await this.document.setFlag("campaign-codex", "data", currentData);
    
    this.render(false);
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

  // Cleanup on close
  close(options = {}) {
    if (this._autoSaveTimeout) {
      clearTimeout(this._autoSaveTimeout);
    }
    return super.close(options);
  }
}