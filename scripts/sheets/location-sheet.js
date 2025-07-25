import { CampaignCodexBaseSheet } from './base-sheet.js';
import { TemplateComponents } from './template-components.js';

export class LocationSheet extends CampaignCodexBaseSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [...super.defaultOptions.classes, "location-sheet"]
    });
  }

  get template() {
    return "modules/campaign-codex/templates/base-sheet.html";
  }

  async getData() {
    const data = await super.getData();
    const locationData = this.document.getFlag("campaign-codex", "data") || {};
    
    // Get linked documents
    data.linkedNPCs = await this._getLinkedNPCs(locationData.linkedNPCs || []);
    data.linkedShops = await this._getLinkedShops(locationData.linkedShops || []);
    
    // Sheet configuration
    data.sheetType = "location";
    data.sheetTypeLabel = "Location";
    data.defaultImage = "icons/svg/direction.svg";
    
    // Navigation tabs
    data.tabs = [
      { key: 'info', label: 'Info', icon: 'fas fa-info-circle', active: this._currentTab === 'info' },
      { key: 'npcs', label: 'NPCs', icon: 'fas fa-users', active: this._currentTab === 'npcs' },
      { key: 'shops', label: 'Shops', icon: 'fas fa-store', active: this._currentTab === 'shops' },
      { key: 'notes', label: 'Notes', icon: 'fas fa-sticky-note', active: this._currentTab === 'notes' }
    ];
    
    // Statistics
    data.statistics = [
      { icon: 'fas fa-users', value: data.linkedNPCs.length, label: 'NPCS', color: '#fd7e14' },
      { icon: 'fas fa-store', value: data.linkedShops.length, label: 'SHOPS', color: '#6f42c1' }
    ];
    
    // Quick links
    data.quickLinks = [
      ...data.linkedNPCs.map(npc => ({ ...npc, type: 'npc' })),
      ...data.linkedShops.map(shop => ({ ...shop, type: 'shop' }))
    ];
    
    // Tab panels
    data.tabPanels = [
      {
        key: 'info',
        active: this._currentTab === 'info',
        content: this._generateInfoTab(data)
      },
      {
        key: 'npcs',
        active: this._currentTab === 'npcs',
        content: this._generateNPCsTab(data)
      },
      {
        key: 'shops', 
        active: this._currentTab === 'shops',
        content: this._generateShopsTab(data)
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
    return TemplateComponents.formSection('Description', 'fas fa-align-left', 'description', 'Describe this location...', data.sheetData.description, 8);
  }

  _generateNPCsTab(data) {
    return `
      ${TemplateComponents.contentHeader('fas fa-users', 'NPCs at this Location')}
      ${TemplateComponents.dropZone('npc', 'fas fa-user-plus', 'Add NPCs', 'Drag NPCs or actors here to add them to this location')}
      ${TemplateComponents.entityGrid(data.linkedNPCs, 'npc', true)}
    `;
  }

  _generateShopsTab(data) {
    return `
      ${TemplateComponents.contentHeader('fas fa-store', 'Shops at this Location')}
      ${TemplateComponents.dropZone('shop', 'fas fa-store', 'Add Shops', 'Drag shop journals here to add them to this location')}
      ${TemplateComponents.entityGrid(data.linkedShops, 'shop')}
    `;
  }

  _generateNotesTab(data) {
    return `
      ${TemplateComponents.contentHeader('fas fa-sticky-note', 'GM Notes')}
      ${TemplateComponents.formSection('Private Notes', 'fas fa-eye-slash', 'notes', 'Private GM notes about this location...', data.sheetData.notes, 12)}
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

  _activateSheetSpecificListeners(html) {
    // Remove buttons
    html.find('.remove-npc').click((e) => this._onRemoveFromList(e, 'linkedNPCs'));
    html.find('.remove-shop').click((e) => this._onRemoveFromList(e, 'linkedShops'));

    // Open buttons
    html.find('.open-npc').click((e) => this._onOpenDocument(e, 'npc'));
    html.find('.open-shop').click((e) => this._onOpenDocument(e, 'shop'));
    html.find('.open-actor').click((e) => this._onOpenDocument(e, 'actor'));

    // Quick links
    html.find('.npc-link').click((e) => this._onOpenDocument(e, 'npc'));
    html.find('.shop-link').click((e) => this._onOpenDocument(e, 'shop'));
  }

  async _handleDrop(data, event) {
    if (data.type === "JournalEntry") {
      await this._handleJournalDrop(data, event);
    } else if (data.type === "Actor") {
      await this._handleActorDrop(data, event);
    }
  }

  async _handleJournalDrop(data, event) {
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

  async _handleActorDrop(data, event) {
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

  getSheetType() {
    return "location";
  }
}