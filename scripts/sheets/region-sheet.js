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
    
    // Get linked documents with complete hierarchy
    data.linkedLocations = await this._getLinkedLocations(regionData.linkedLocations || []);
    data.allNPCs = await this._getAllNPCs(regionData.linkedLocations || []);
    data.allShops = await this._getAllShops(regionData.linkedLocations || []);
    
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
      { icon: 'fas fa-users', value: data.allNPCs.length, label: 'NPCS', color: '#fd7e14' },
      { icon: 'fas fa-store', value: data.allShops.length, label: 'SHOPS', color: '#6f42c1' }
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
      ${TemplateComponents.infoBanner('NPCs are automatically populated from all locations and shops in this region.')}
      ${this._generateNPCsBySource(data)}
    `;
  }

  _generateNPCsBySource(data) {
    // Group NPCs by their source
    const directNPCs = data.allNPCs.filter(npc => npc.source === 'location');
    const shopNPCs = data.allNPCs.filter(npc => npc.source === 'shop');

    let content = '';

    // Direct Location NPCs
    if (directNPCs.length > 0) {
      content += `
        <div class="npc-section">
          <h3 style="color: var(--cc-main-text); font-family: var(--cc-font-heading); font-size: 18px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 24px 0 16px 0; border-bottom: 1px solid var(--cc-border-light); padding-bottom: 8px;">
            <i class="fas fa-map-marker-alt" style="color: var(--cc-accent); margin-right: 8px;"></i>
            Location NPCs (${directNPCs.length})
          </h3>
          ${TemplateComponents.entityGrid(directNPCs, 'npc', true)}
        </div>
      `;
    }

    // Shop NPCs
    if (shopNPCs.length > 0) {
      content += `
        <div class="npc-section">
          <h3 style="color: var(--cc-main-text); font-family: var(--cc-font-heading); font-size: 18px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 24px 0 16px 0; border-bottom: 1px solid var(--cc-border-light); padding-bottom: 8px;">
            <i class="fas fa-store" style="color: var(--cc-accent); margin-right: 8px;"></i>
            Shop NPCs (${shopNPCs.length})
          </h3>
          ${TemplateComponents.entityGrid(shopNPCs, 'npc', true)}
        </div>
      `;
    }

    // If no NPCs
    if (data.allNPCs.length === 0) {
      content = TemplateComponents.emptyState('npc');
    }

    return content;
  }

  _generateShopsTab(data) {
    const refreshBtn = `
      <button type="button" class="refresh-btn refresh-shops" title="Refresh auto-populated data">
        <i class="fas fa-sync-alt"></i>
        Refresh
      </button>
    `;

    return `
      ${TemplateComponents.contentHeader('fas fa-store', 'Shops in this Region', refreshBtn)}
      ${TemplateComponents.infoBanner('Shops are automatically populated from all locations in this region.')}
      ${TemplateComponents.entityGrid(data.allShops, 'shop')}
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
        const directNPCCount = (locationData.linkedNPCs || []).length;
        
        // Count shop NPCs
        let shopNPCCount = 0;
        const shopIds = locationData.linkedShops || [];
        for (const shopId of shopIds) {
          const shop = game.journal.get(shopId);
          if (shop) {
            const shopData = shop.getFlag("campaign-codex", "data") || {};
            shopNPCCount += (shopData.linkedNPCs || []).length;
          }
        }
        
        const totalNPCs = directNPCCount + shopNPCCount;
        const shopCount = shopIds.length;
        
        locations.push({
          id: journal.id,
          name: journal.name,
          img: journal.getFlag("campaign-codex", "image") ||  "icons/svg/direction.svg",
          meta: `<span class="entity-stat">${totalNPCs} NPCs</span> <span class="entity-stat">${shopCount} Shops</span>`
        });
      }
    }
    return locations;
  }

  async _getAllNPCs(locationIds) {
    const npcMap = new Map();
    
    for (const locationId of locationIds) {
      const location = game.journal.get(locationId);
      if (!location) continue;
      
      const locationData = location.getFlag("campaign-codex", "data") || {};
      
      // Get direct location NPCs
      const directNPCs = locationData.linkedNPCs || [];
      for (const npcId of directNPCs) {
        const npcJournal = game.journal.get(npcId);
        if (!npcJournal) continue;
        
        if (!npcMap.has(npcId)) {
          const npcData = npcJournal.getFlag("campaign-codex", "data") || {};
          const actor = npcData.linkedActor ? game.actors.get(npcData.linkedActor) : null;
          
          npcMap.set(npcId, {
            id: npcJournal.id,
            name: npcJournal.name,
            img: journal.getFlag("campaign-codex", "image") ||  actor.img ,
            actor: actor,
            locations: [location.name],
            shops: [],
            meta: game.campaignCodex.getActorDisplayMeta(actor),
            source: 'location'
          });
        } else {
          const npc = npcMap.get(npcId);
          if (!npc.locations.includes(location.name)) {
            npc.locations.push(location.name);
          }
        }
      }
      
      // Get shop NPCs from this location
      const shopIds = locationData.linkedShops || [];
      for (const shopId of shopIds) {
        const shop = game.journal.get(shopId);
        if (!shop) continue;
        
        const shopData = shop.getFlag("campaign-codex", "data") || {};
        const shopNPCs = shopData.linkedNPCs || [];
        
        for (const npcId of shopNPCs) {
          const npcJournal = game.journal.get(npcId);
          if (!npcJournal) continue;
          
          if (!npcMap.has(npcId)) {
            const npcData = npcJournal.getFlag("campaign-codex", "data") || {};
            const actor = npcData.linkedActor ? game.actors.get(npcData.linkedActor) : null;
            
            npcMap.set(npcId, {
              id: npcJournal.id,
              name: npcJournal.name,
              img: journal.getFlag("campaign-codex", "image") || actor.img ,
              actor: actor,
              locations: [location.name],
              shops: [shop.name],
              meta: game.campaignCodex.getActorDisplayMeta(actor),
              source: 'shop'
            });
          } else {
            const npc = npcMap.get(npcId);
            
            // Add location if not already present
            if (!npc.locations.includes(location.name)) {
              npc.locations.push(location.name);
            }
            
            // Add shop if not already present
            if (!npc.shops.includes(shop.name)) {
              npc.shops.push(shop.name);
            }
            
            // Update source if this NPC is now found in a shop
            if (npc.source === 'location' && shopNPCs.includes(npcId)) {
              npc.source = 'shop';
            }
          }
        }
      }
    }
    
    return Array.from(npcMap.values());
  }

  async _getAllShops(locationIds) {
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
          const shopData = shopJournal.getFlag("campaign-codex", "data") || {};
          const npcCount = (shopData.linkedNPCs || []).length;
          const inventoryCount = (shopData.inventory || []).length;
          
          shopMap.set(shopId, {
            id: shopJournal.id,
            name: shopJournal.name,
            img: shopJournal.getFlag("campaign-codex", "image") || "icons/svg/item-bag.svg",
            locations: [location.name],
            meta: `<span class="entity-stat">${npcCount} NPCs</span> <span class="entity-stat">${inventoryCount} Items</span>`
          });
        } else {
          const shop = shopMap.get(shopId);
          if (!shop.locations.includes(location.name)) {
            shop.locations.push(location.name);
          }
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

    // Refresh buttons
    html.find('.refresh-npcs').click(this._onRefreshData.bind(this));
    html.find('.refresh-shops').click(this._onRefreshData.bind(this));

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

  async _onRefreshData(event) {
    this.render(false);
    ui.notifications.info("Region data refreshed!");
  }

  getSheetType() {
    return "region";
  }
}