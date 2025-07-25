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
    
    // Get linked documents - split direct and auto-populated NPCs
    data.directNPCs = await this._getDirectNPCs(locationData.linkedNPCs || []);
    data.shopNPCs = await this._getShopNPCs(locationData.linkedShops || []);
    data.allNPCs = [...data.directNPCs, ...data.shopNPCs];
    data.linkedShops = await this._getLinkedShops(locationData.linkedShops || []);
    data.linkedRegion = await this._getLinkedRegion();
    
    // Sheet configuration
    data.sheetType = "location";
    data.sheetTypeLabel = "Location";
    data.customImage = this.document.getFlag("campaign-codex", "image") || "icons/svg/direction.svg";
    
    // Navigation tabs
    data.tabs = [
      { key: 'info', label: 'Info', icon: 'fas fa-info-circle', active: this._currentTab === 'info' },
      { key: 'npcs', label: 'NPCs', icon: 'fas fa-users', active: this._currentTab === 'npcs' },
      { key: 'shops', label: 'Shops', icon: 'fas fa-store', active: this._currentTab === 'shops' },
      { key: 'notes', label: 'Notes', icon: 'fas fa-sticky-note', active: this._currentTab === 'notes' }
    ];
    
    // Statistics - use total NPC count
    data.statistics = [
      { icon: 'fas fa-users', value: data.allNPCs.length, label: 'NPCS', color: '#fd7e14' },
      { icon: 'fas fa-store', value: data.linkedShops.length, label: 'SHOPS', color: '#6f42c1' }
    ];
    
    // Quick links - use all NPCs
    data.quickLinks = [
      ...data.allNPCs.map(npc => ({ ...npc, type: 'npc' })),
      ...data.linkedShops.map(shop => ({ ...shop, type: 'shop' }))
    ];
    
    // Custom header content (region info)
    if (data.linkedRegion) {
      data.customHeaderContent = `
        <div class="region-info">
          <span class="region-label">Region:</span>
          <span class="region-name region-link" data-region-id="${data.linkedRegion.id}" style="cursor: pointer; color: var(--cc-accent);">${data.linkedRegion.name}</span>
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
    // Create separate sections for direct NPCs and shop NPCs
    let content = `
      ${TemplateComponents.contentHeader('fas fa-users', 'NPCs at this Location')}
      ${TemplateComponents.dropZone('npc', 'fas fa-user-plus', 'Add NPCs', 'Drag NPCs or actors here to add them directly to this location')}
    `;

    // Direct NPCs section
    if (data.directNPCs.length > 0) {
      content += `
        <div class="npc-section">
          <h3 style="color: var(--cc-main-text); font-family: var(--cc-font-heading); font-size: 18px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 24px 0 16px 0; border-bottom: 1px solid var(--cc-border-light); padding-bottom: 8px;">
            <i class="fas fa-user" style="color: var(--cc-accent); margin-right: 8px;"></i>
            Direct NPCs (${data.directNPCs.length})
          </h3>
          ${TemplateComponents.entityGrid(data.directNPCs, 'npc', true)}
        </div>
      `;
    }

    // Shop NPCs section
    if (data.shopNPCs.length > 0) {
      content += `
        <div class="npc-section">
          <h3 style="color: var(--cc-main-text); font-family: var(--cc-font-heading); font-size: 18px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 24px 0 16px 0; border-bottom: 1px solid var(--cc-border-light); padding-bottom: 8px;">
            <i class="fas fa-store" style="color: var(--cc-accent); margin-right: 8px;"></i>
            Shop NPCs (${data.shopNPCs.length})
          </h3>
          ${TemplateComponents.infoBanner('NPCs automatically populated from shops at this location.')}
          ${TemplateComponents.entityGrid(data.shopNPCs, 'npc', true)}
        </div>
      `;
    }

    // If no NPCs at all
    if (data.allNPCs.length === 0) {
      content += TemplateComponents.emptyState('npc');
    }

    return content;
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

  // Get directly linked NPCs
  async _getDirectNPCs(npcIds) {
    const npcs = [];
    for (const id of npcIds) {
      const journal = game.journal.get(id);
      if (journal) {
        const npcData = journal.getFlag("campaign-codex", "data") || {};
        const actor = npcData.linkedActor ? game.actors.get(npcData.linkedActor) : null;
                const imageData = journal.getFlag("campaign-codex", "image") ||  "icons/svg/direction.svg";

        npcs.push({
          id: journal.id,
          name: journal.name,
          img: imageData ,
          actor: actor,
          meta: game.campaignCodex.getActorDisplayMeta(actor),
          source: 'direct'
        });
      }
    }
    return npcs;
  }

  // Get NPCs from linked shops
  async _getShopNPCs(shopIds) {
    const npcMap = new Map();
    
    for (const shopId of shopIds) {
      const shop = game.journal.get(shopId);
      if (!shop) continue;
      
      const shopData = shop.getFlag("campaign-codex", "data") || {};
      const linkedNPCs = shopData.linkedNPCs || [];
      
      for (const npcId of linkedNPCs) {
        const npcJournal = game.journal.get(npcId);
        if (!npcJournal) continue;
        
        if (!npcMap.has(npcId)) {
          const npcData = npcJournal.getFlag("campaign-codex", "data") || {};
          const actor = npcData.linkedActor ? game.actors.get(npcData.linkedActor) : null;
          const imageData = npcJournal.getFlag("campaign-codex", "image") ||  "icons/svg/direction.svg";

          npcMap.set(npcId, {
            id: npcJournal.id,
            name: npcJournal.name,
            img: imageData ,
            actor: actor,
            shops: [shop.name],
            meta: game.campaignCodex.getActorDisplayMeta(actor),
            source: 'shop'
          });
        } else {
          const npc = npcMap.get(npcId);
          if (!npc.shops.includes(shop.name)) {
            npc.shops.push(shop.name);
          }
        }
      }
    }
    
    return Array.from(npcMap.values());
  }

  async _getLinkedShops(shopIds) {
    const shops = [];
    for (const id of shopIds) {
      const journal = game.journal.get(id);
      if (journal) {
        const shopData = journal.getFlag("campaign-codex", "data") || {};
        const npcCount = (shopData.linkedNPCs || []).length;
                const imageData = journal.getFlag("campaign-codex", "image") ||  "icons/svg/direction.svg";

        shops.push({
          id: journal.id,
          name: journal.name,
          img: imageData,
          meta: `<span class="entity-stat">${npcCount} NPCs</span>`
        });
      }
    }
    return shops;
  }

  async _getLinkedRegion() {
    // Find the region that contains this location
    const allRegions = game.journal.filter(j => j.getFlag("campaign-codex", "type") === "region");
    
    for (const region of allRegions) {
      const regionData = region.getFlag("campaign-codex", "data") || {};
      const linkedLocations = regionData.linkedLocations || [];
      
      if (linkedLocations.includes(this.document.id)) {
        return {
          id: region.id,
          name: region.name,
          img: region.getFlag("campaign-codex", "image") || "icons/svg/direction.svg"
        };
      }
    }
    
    return null;
  }

  _activateSheetSpecificListeners(html) {
    // Remove buttons - only allow removing direct NPCs
    html.find('.remove-npc').click((e) => {
      const npcId = e.currentTarget.dataset.npcId;
      // Check if this is a direct NPC or shop NPC
      const npcCard = e.currentTarget.closest('.entity-card');
      const isShopNPC = npcCard.querySelector('.shop-tags');
      
      if (isShopNPC) {
        ui.notifications.warn("Cannot remove shop NPCs directly. Remove them from their shops instead.");
        return;
      }
      
      this._onRemoveFromList(e, 'linkedNPCs');
    });
    
    html.find('.remove-shop').click((e) => this._onRemoveFromList(e, 'linkedShops'));

    // Open buttons
    html.find('.open-npc').click((e) => this._onOpenDocument(e, 'npc'));
    html.find('.open-shop').click((e) => this._onOpenDocument(e, 'shop'));
    html.find('.open-actor').click((e) => this._onOpenDocument(e, 'actor'));

    // Quick links
    html.find('.npc-link').click((e) => this._onOpenDocument(e, 'npc'));
    html.find('.shop-link').click((e) => this._onOpenDocument(e, 'shop'));
    
    // Region link
    html.find('.region-link').click((e) => this._onOpenDocument(e, 'region'));

    // Refresh button for auto-populated data
    html.find('.refresh-npcs').click(this._onRefreshNPCs.bind(this));
  }

  async _onRefreshNPCs(event) {
    this.render(false);
    ui.notifications.info("Location data refreshed!");
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
    let actor;
    
    // Handle different drop sources
    if (data.uuid) {
      const sourceActor = await fromUuid(data.uuid);
      if (!sourceActor || sourceActor.type !== "npc") return;
      
      // If it's from a compendium, import it to the world first
      if (data.uuid.includes('Compendium.')) {
        console.log('Campaign Codex | Importing actor from compendium:', sourceActor.name);
        const actorData = sourceActor.toObject();
        // Remove the _id to let Foundry generate a new one
        delete actorData._id;
        const importedActors = await Actor.createDocuments([actorData]);
        actor = importedActors[0];
        ui.notifications.info(`Imported "${actor.name}" from compendium`);
      } else {
        // It's already a world actor
        actor = sourceActor;
      }
    } else if (data.id) {
      // Direct actor ID (fallback)
      actor = game.actors.get(data.id);
      if (!actor || actor.type !== "npc") return;
    }
    
    if (!actor) {
      ui.notifications.warn("Could not find NPC actor");
      return;
    }

    // Check if there's already an NPC journal for this actor
    let npcJournal = game.journal.find(j => {
      const npcData = j.getFlag("campaign-codex", "data");
      return npcData && npcData.linkedActor === actor.id;
    });

    // If no journal exists, create one
    if (!npcJournal) {
      npcJournal = await game.campaignCodex.createNPCJournal(actor);
      ui.notifications.info(`Created NPC journal for "${actor.name}"`);
    }

    // Link to location as direct NPC
    await game.campaignCodex.linkLocationToNPC(this.document, npcJournal);
    ui.notifications.info(`Added "${actor.name}" to location`);
    
    this.render(false);
  }

  getSheetType() {
    return "location";
  }
}