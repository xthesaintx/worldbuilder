export class LocationSheet extends JournalSheet {
  constructor(document, options = {}) {
    super(document, options);
    this._currentTab = 'info';
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["sheet", "journal-sheet", "campaign-codex", "location-sheet"],
      width: 900,
      height: 700,
      resizable: true,
      dragDrop: [{ dragSelector: ".item", dropSelector: null }],
      tabs: [{ navSelector: ".sidebar-tabs", contentSelector: ".main-content", initial: "info" }]
    });
  }

  get template() {
    return "modules/campaign-codex/templates/location-sheet.html";
  }

  async getData() {
    const data = await super.getData();
    const locationData = this.document.getFlag("campaign-codex", "data") || {};
    
    // Get linked documents
    data.linkedNPCs = await this._getLinkedNPCs(locationData.linkedNPCs || []);
    data.linkedShops = await this._getLinkedShops(locationData.linkedShops || []);
    
    // Location specific data
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

  activateListeners(html) {
    super.activateListeners(html);

    // Activate tabs and preserve state
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
    html.find('.remove-npc').click(this._onRemoveNPC.bind(this));
    html.find('.remove-shop').click(this._onRemoveShop.bind(this));

    // Open document buttons
    html.find('.open-npc').click(this._onOpenNPC.bind(this));
    html.find('.open-shop').click(this._onOpenShop.bind(this));
    html.find('.open-actor').click(this._onOpenActor.bind(this));

    // Quick links
    html.find('.npc-link').click(this._onOpenNPC.bind(this));
    html.find('.shop-link').click(this._onOpenShop.bind(this));
  }

  _activateTabs(html) {
    // Tab navigation for sidebar tabs
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
      } else if (data.type === "Actor") {
        await this._handleActorDrop(data);
      }
    } finally {
      this._dropping = false;
    }
  }

  async _handleJournalDrop(data) {
    const journal = await fromUuid(data.uuid);
    if (!journal || journal.id === this.document.id) return; // Prevent self-linking

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

    // Check if there's already an NPC journal for this actor
    let npcJournal = game.journal.find(j => {
      const npcData = j.getFlag("campaign-codex", "data");
      return npcData && npcData.linkedActor === actor.id;
    });

    // If no journal exists, create one
    if (!npcJournal) {
      npcJournal = await game.campaignCodex.createNPCJournal(actor);
    }

    // Link the location to the NPC journal
    await game.campaignCodex.linkLocationToNPC(this.document, npcJournal);
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
      ui.notifications.info("Location saved successfully!");
      
      const saveBtn = $(event.currentTarget);
      saveBtn.addClass('success');
      setTimeout(() => saveBtn.removeClass('success'), 2000);
      
    } catch (error) {
      console.error("Campaign Codex | Error saving location data:", error);
      ui.notifications.error("Failed to save location data!");
      
      const saveBtn = $(event.currentTarget);
      saveBtn.addClass('error');
      setTimeout(() => saveBtn.removeClass('error'), 2000);
    }
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

  // Fixed open methods
  _onOpenNPC(event) {
    event.stopPropagation();
    const npcId = event.currentTarget.dataset.npcId || event.currentTarget.closest('[data-npc-id]').dataset.npcId;
    const journal = game.journal.get(npcId);
    if (journal) journal.sheet.render(true);
  }

  _onOpenShop(event) {
    event.stopPropagation();
    const shopId = event.currentTarget.dataset.shopId || event.currentTarget.closest('[data-shop-id]').dataset.shopId;
    const journal = game.journal.get(shopId);
    if (journal) journal.sheet.render(true);
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