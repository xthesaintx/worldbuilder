export class LocationSheet extends JournalSheet {
  constructor(document, options = {}) {
    super(document, options);
    this._currentTab = 'info';
    this._autoSaveTimeout = null;
    this._isDragging = false;
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["sheet", "journal-sheet", "campaign-codex", "location-sheet"],
      width: 900,
      height: 700,
      resizable: true,
      dragDrop: [{ dragSelector: null, dropSelector: null }],
      tabs: [{ navSelector: ".sidebar-tabs", contentSelector: ".main-content", initial: "info" }]
    });
  }

  /** @override */
  get template() {
    return "modules/campaign-codex/templates/location-sheet.html";
  }

  /** @override */
  async getData() {
    const data = await super.getData();
    const locationData = this.document.getFlag("campaign-codex", "data") || {};
    
    data.linkedNPCs = await this._getLinkedNPCs(locationData.linkedNPCs || []);
    data.linkedShops = await this._getLinkedShops(locationData.linkedShops || []);
    
    data.locationData = {
      description: locationData.description || "",
      notes: locationData.notes || ""
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

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    this._activateTabs(html);
    this._setupDragAndDrop(html);
    this._setupAutoSave(html);

    // Image change functionality
    html.find('.location-image').click(this._onImageClick.bind(this));
    html.find('.image-change-btn').click(this._onImageClick.bind(this));

    // Remove buttons
    html.find('.remove-npc').click(this._onRemoveNPC.bind(this));
    html.find('.remove-shop').click(this._onRemoveShop.bind(this));

    // Open document buttons
    html.find('.open-npc').click(this._onOpenNPC.bind(this));
    html.find('.open-shop').click(this._onOpenShop.bind(this));
    html.find('.open-actor').click(this._onOpenActor.bind(this));
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
    } else if (data.type === "Actor") {
      await this._handleActorDrop(data);
    }
  }

  async _handleJournalDrop(data) {
    const journal = await fromUuid(data.uuid);
    if (!journal) return;

    const journalType = journal.getFlag("campaign-codex", "type");
    
    if (journalType === "npc") {
      await game.campaignCodex.linkLocationToNPC(this.document, journal);
      this.render(false);
    } else if (journalType === "shop") {
      await game.campaignCodex.linkLocationToShop(this.document, journal);
      this.render(false);
    }
  }

  async _handleActorDrop(data) {
    const actor = await fromUuid(data.uuid);
    if (!actor || actor.type !== "npc") return;

    let npcJournal = game.journal.find(j => {
      const npcData = j.getFlag("campaign-codex", "data");
      return npcData && npcData.linkedActor === actor.id;
    });

    if (!npcJournal) {
      npcJournal = await game.campaignCodex.createNPCJournal(actor);
    }

    await game.campaignCodex.linkLocationToNPC(this.document, npcJournal);
    this.render(false);
  }

  async _onRemoveNPC(event) {
    const npcId = event.currentTarget.dataset.npcId;
    const currentData = this.document.getFlag("campaign-codex", "data") || {};
    
    currentData.linkedNPCs = (currentData.linkedNPCs || []).filter(id => id !== npcId);
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

  /** @override */
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

  /** @override */
  close(options = {}) {
    if (this._autoSaveTimeout) {
      clearTimeout(this._autoSaveTimeout);
    }
    return super.close(options);
  }
}