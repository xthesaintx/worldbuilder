import { CampaignCodexBaseSheet } from './base-sheet.js';
import { TemplateComponents } from './template-components.js';

export class RegionSheet extends CampaignCodexBaseSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [...super.defaultOptions.classes, "region-sheet"]
    });
  }

  get template() {
    return "modules/campaign-codex/templates/base-sheet.html";
  }

  async getData() {
    const data = await super.getData();
    const regionData = this.document.getFlag("campaign-codex", "data") || {};
    
    // Get linked documents
    data.linkedLocations = await this._getLinkedLocations(regionData.linkedLocations || []);
    data.autoPopulatedNPCs = await this._getAutoPopulatedNPCs(regionData.linkedLocations || []);
    data.autoPopulatedShops = await this._getAutoPopulatedShops(regionData.linkedLocations || []);
    
    // Sheet configuration
    data.sheetType = "region";
    data.sheetTypeLabel = "Region";
    data.customImage = this.document.getFlag("campaign-codex", "image") || "icons/svg/direction.svg";
    
    // Navigation tabs
    data.tabs = [
      { key: 'info', label: 'Info', icon: 'fas fa-info-circle', active: this._currentTab === 'info' },
      { key: 'locations', label: 'Locations', icon: 'fas fa-map-marker-alt', active: this._currentTab === 'locations' },
      { key: 'npcs', label: 'NPCs', icon: 'fas fa-users', active: this._currentTab === 'npcs' },
      { key: 'shops', label: 'Shops', icon: 'fas fa-store', active: this._currentTab === 'shops' },
      { key: 'notes', label: 'Notes', icon: 'fas fa-sticky-note', active: this._currentTab === 'notes' }
    ];
    
    // Statistics
    data.statistics = [
      { icon: 'fas fa-map-marker-alt', value: data.linkedLocations.length, label: 'LOCATIONS', color: '#28a745' },
      { icon: 'fas fa-users', value: data.autoPopulatedNPCs.length, label: 'NPCS', color: '#fd7e14' },
      { icon: 'fas fa-store', value: data.autoPopulatedShops.length, label: 'SHOPS', color: '#6f42c1' }
    ];
    
    // Quick links
    data.quickLinks = [
      ...data.linkedLocations.map(loc => ({ ...loc, type: 'location' }))
    ];
    
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
    return TemplateComponents.formSection('Description', 'fas fa-align-left', 'description', 'Describe this region...', data.sheetData.description, 8);
  }

  _generateLocationsTab(data) {
    return `
      ${TemplateComponents.contentHeader('fas fa-map-marker-alt', 'Locations in this Region')}
      ${TemplateComponents.dropZone('location', 'fas fa-map-marker-alt', 'Add Locations', 'Drag location journals here to add them to this region')}
      ${TemplateComponents.entityGrid(data.linkedLocations, 'location')}
    `;
  }

  _generateNPCsTab(data) {
    const refreshBtn = `
      <button type="button" class="refresh-btn refresh-npcs" title="Refresh auto-populated data">
        <i class="fas fa-sync-alt"></i>
        Refresh
      </button>
    `;

    return `
      ${TemplateComponents.contentHeader('fas fa-users', 'NPCs in this Region', refreshBtn)}
      ${TemplateComponents.infoBanner('NPCs are automatically populated from linked locations. Add locations to see NPCs appear here.')}
      ${TemplateComponents.entityGrid(data.autoPopulatedNPCs, 'npc', true)}
    `;
  }

  _generateShopsTab(data) {
    const refreshBtn = `
      <button type="button" class="refresh-btn refresh-npcs" title="Refresh auto-populated data">
        <i class="fas fa-sync-alt"></i>
        Refresh
      </button>
    `;

    return `
      ${TemplateComponents.contentHeader('fas fa-store', 'Shops in this Region', refreshBtn)}
      ${TemplateComponents.infoBanner('Shops are automatically populated from linked locations. Add locations to see shops appear here.')}
      ${TemplateComponents.entityGrid(data.autoPopulatedShops, 'shop')}
    `;
  }

  _generateNotesTab(data) {
    return `
      ${TemplateComponents.contentHeader('fas fa-sticky-note', 'GM Notes')}
      ${TemplateComponents.formSection('Private Notes', 'fas fa-eye-slash', 'notes', 'Private GM notes about this region...', data.sheetData.notes, 12)}
    `;
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
          meta: `<span class="entity-stat">${(locationData.linkedNPCs || []).length} NPCs</span> <span class="entity-stat">${(locationData.linkedShops || []).length} Shops</span>`
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
            locations: [location.name],
            meta: actor ? `<span class="entity-type">${actor.system.details?.race || 'Unknown'} ${actor.system.details?.class || 'Unknown'}</span>` : '<span class="entity-type">NPC</span>'
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
            locations: [location.name]
          });
        }
      }
    }
    
    return Array.from(shopMap.values());
  }

  _activateSheetSpecificListeners(html) {
    // Remove buttons
    html.find('.remove-location').click((e) => this._onRemoveFromList(e, 'linkedLocations'));

    // Open buttons
    html.find('.open-location').click((e) => this._onOpenDocument(e, 'location'));
    html.find('.open-npc').click((e) => this._onOpenDocument(e, 'npc'));
    html.find('.open-shop').click((e) => this._onOpenDocument(e, 'shop'));
    html.find('.open-actor').click((e) => this._onOpenDocument(e, 'actor'));

    // Refresh button
    html.find('.refresh-npcs').click(this._onRefreshNPCs.bind(this));

    // Quick links
    html.find('.location-link').click((e) => this._onOpenDocument(e, 'location'));
  }

  async _handleDrop(data, event) {
    if (data.type === "JournalEntry") {
      await this._handleJournalDrop(data, event);
    }
  }

  async _handleJournalDrop(data, event) {
    const journal = await fromUuid(data.uuid);
    if (!journal || journal.id === this.document.id) return;

    const journalType = journal.getFlag("campaign-codex", "type");
    
    if (journalType === "location") {
      await game.campaignCodex.linkRegionToLocation(this.document, journal);
      this.render(false);
    }
  }

  async _onRefreshNPCs(event) {
    this.render(false);
    ui.notifications.info("Region data refreshed!");
  }

  getSheetType() {
    return "region";
  }
}