import { CampaignCodexBaseSheet } from './base-sheet.js';
import { TemplateComponents } from './template-components.js';

export class NPCSheet extends CampaignCodexBaseSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [...super.defaultOptions.classes, "npc-sheet"]
    });
  }

  get template() {
    return "modules/campaign-codex/templates/base-sheet.html";
  }

  async getData() {
    const data = await super.getData();
    const npcData = this.document.getFlag("campaign-codex", "data") || {};
    
    // Get linked documents
    data.linkedActor = npcData.linkedActor ? await this._getLinkedActor(npcData.linkedActor) : null;
    data.linkedLocations = await this._getLinkedLocations(npcData.linkedLocations || []);
    data.linkedShops = await this._getLinkedShops(npcData.linkedShops || []);
    data.associates = await this._getAssociates(npcData.associates || []);
    
    // Sheet configuration
    data.sheetType = "npc";
    data.sheetTypeLabel = "NPC Journal";
    data.defaultImage = "icons/svg/mystery-man.svg";
    data.customImage = this.document.getFlag("campaign-codex", "image") || data.linkedActor?.img || "icons/svg/mystery-man.svg";
    
    
    // Navigation tabs
    data.tabs = [
      { key: 'info', label: 'Info', icon: 'fas fa-info-circle', active: this._currentTab === 'info' },
      { key: 'locations', label: 'Locations', icon: 'fas fa-map-marker-alt', active: this._currentTab === 'locations' },
      { key: 'shops', label: 'Shops', icon: 'fas fa-store', active: this._currentTab === 'shops' },
      { key: 'associates', label: 'Associates', icon: 'fas fa-users', active: this._currentTab === 'associates' },
      { key: 'notes', label: 'Notes', icon: 'fas fa-sticky-note', active: this._currentTab === 'notes' }
    ];
    
    // Statistics
    data.statistics = [
      { icon: 'fas fa-map-marker-alt', value: data.linkedLocations.length, label: 'LOCATIONS', color: '#28a745' },
      { icon: 'fas fa-store', value: data.linkedShops.length, label: 'SHOPS', color: '#6f42c1' },
      { icon: 'fas fa-users', value: data.associates.length, label: 'ASSOCIATES', color: '#fd7e14' }
    ];
    
    // Quick links
    data.quickLinks = [
      ...data.linkedLocations.map(loc => ({ ...loc, type: 'location' })),
      ...data.linkedShops.map(shop => ({ ...shop, type: 'shop' })),
      ...data.associates.map(assoc => ({ ...assoc, type: 'npc' }))
    ];
    
    // Custom header content (actor stats)
    if (data.linkedActor) {
      data.customHeaderContent = `
        <div class="actor-stats">
          <div class="stat-row">
            <span class="stat-label">Level ${data.linkedActor.level} ${data.linkedActor.race} ${data.linkedActor.class}</span>
          </div>
          <div class="stat-row">
            <span class="stat-value">AC ${data.linkedActor.ac}</span>
            <span class="stat-value">HP ${data.linkedActor.hp.value}/${data.linkedActor.hp.max}</span>
          </div>
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
        key: 'locations',
        active: this._currentTab === 'locations',
        content: this._generateLocationsTab(data)
      },
      {
        key: 'shops', 
        active: this._currentTab === 'shops',
        content: this._generateShopsTab(data)
      },
      {
        key: 'associates',
        active: this._currentTab === 'associates', 
        content: this._generateAssociatesTab(data)
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
    let actorSection = '';
    
    if (data.linkedActor) {
      actorSection = `
        <div class="form-section">
          <h3><i class="fas fa-link"></i> Linked Actor</h3>
          ${TemplateComponents.actorLinkCard(data.linkedActor)}
        </div>
      `;
    } else {
      actorSection = `
        <div class="form-section">
          <h3><i class="fas fa-link"></i> Link Actor</h3>
          ${TemplateComponents.dropZone('actor', 'fas fa-user-plus', 'Link Actor', 'Drag an NPC actor here to link')}
        </div>
      `;
    }
    
    return `
      ${actorSection}
      ${TemplateComponents.formSection('Description', 'fas fa-align-left', 'description', 'Describe this NPC...', data.sheetData.description, 8)}
    `;
  }

  _generateLocationsTab(data) {
    return `
      ${TemplateComponents.contentHeader('fas fa-map-marker-alt', 'Locations')}
      ${TemplateComponents.dropZone('location', 'fas fa-map-marker-alt', 'Add Locations', 'Drag location journals here to associate this NPC with them')}
      ${TemplateComponents.entityGrid(data.linkedLocations, 'location')}
    `;
  }

  _generateShopsTab(data) {
    return `
      ${TemplateComponents.contentHeader('fas fa-store', 'Associated Shops')}
      ${TemplateComponents.dropZone('shop', 'fas fa-store', 'Add Shops', 'Drag shop journals here to associate this NPC with them')}
      ${TemplateComponents.entityGrid(data.linkedShops, 'shop')}
    `;
  }

  _generateAssociatesTab(data) {
    return `
      ${TemplateComponents.contentHeader('fas fa-users', 'Associates & Contacts')}
      ${TemplateComponents.dropZone('associate', 'fas fa-user-friends', 'Add Associates', 'Drag NPC journals or actors here to create relationships')}
      ${TemplateComponents.entityGrid(data.associates, 'associate', true)}
    `;
  }

  _generateNotesTab(data) {
    return `
      ${TemplateComponents.contentHeader('fas fa-sticky-note', 'GM Notes')}
      ${TemplateComponents.formSection('Private Notes', 'fas fa-eye-slash', 'notes', 'Private GM notes about this NPC...', data.sheetData.notes, 12)}
    `;
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
          actor: actor,
          meta: actor ? `<span class="entity-type">${actor.system.details?.race || 'Unknown'} ${actor.system.details?.class || 'Unknown'}</span>` : '<span class="entity-type">NPC</span>'
        });
      }
    }
    return associates;
  }

  _activateSheetSpecificListeners(html) {
    // Remove buttons
    html.find('.remove-actor').click(this._onRemoveActor.bind(this));
    html.find('.remove-location').click((e) => this._onRemoveFromList(e, 'linkedLocations'));
    html.find('.remove-shop').click((e) => this._onRemoveFromList(e, 'linkedShops'));
    html.find('.remove-associate').click((e) => this._onRemoveFromList(e, 'associates'));

    // Open buttons
    html.find('.open-actor').click((e) => this._onOpenDocument(e, 'actor'));
    html.find('.open-location').click((e) => this._onOpenDocument(e, 'location'));
    html.find('.open-shop').click((e) => this._onOpenDocument(e, 'shop'));
    html.find('.open-npc').click((e) => this._onOpenDocument(e, 'npc'));
    html.find('.open-associate').click((e) => this._onOpenDocument(e, 'associate'));

    // Quick links
    html.find('.location-link').click((e) => this._onOpenDocument(e, 'location'));
    html.find('.shop-link').click((e) => this._onOpenDocument(e, 'shop'));
    html.find('.npc-link').click((e) => this._onOpenDocument(e, 'npc'));
  }

  async _handleDrop(data, event) {
    if (data.type === "Actor") {
      await this._handleActorDrop(data, event);
    } else if (data.type === "JournalEntry") {
      await this._handleJournalDrop(data, event);
    }
  }

  async _handleActorDrop(data, event) {
    const actor = await fromUuid(data.uuid);
    if (!actor) return;

    const dropZone = event.target.closest('.drop-zone');
    const dropType = dropZone?.dataset.dropType;

    if (dropType === "actor") {
      // Link main actor
      const currentData = this.document.getFlag("campaign-codex", "data") || {};
      currentData.linkedActor = actor.id;
      await this.document.setFlag("campaign-codex", "data", currentData);
      this.render(false);
    } else if (dropType === "associate" && actor.type === "npc") {
      // Check if NPC journal already exists for this actor
      let npcJournal = game.journal.find(j => {
        const npcData = j.getFlag("campaign-codex", "data");
        return npcData && npcData.linkedActor === actor.id && j.id !== this.document.id;
      });

      if (!npcJournal) {
        npcJournal = await game.campaignCodex.createNPCJournal(actor);
      }

      // Prevent linking to self
      if (npcJournal.id !== this.document.id) {
        await game.campaignCodex.linkNPCToNPC(this.document, npcJournal);
        this.render(false);
      }
    }
  }

  async _handleJournalDrop(data, event) {
    const journal = await fromUuid(data.uuid);
    if (!journal || journal.id === this.document.id) return; // Prevent self-linking

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

  getSheetType() {
    return "npc";
  }
}