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
    
    // Get linked documents with complete location discovery
    data.linkedActor = npcData.linkedActor ? await this._getLinkedActor(npcData.linkedActor) : null;
    data.allLocations = await this._getAllLocations(npcData.linkedLocations || []);
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
    
    // Statistics - use all discovered locations
    data.statistics = [
      { icon: 'fas fa-map-marker-alt', value: data.allLocations.length, label: 'LOCATIONS', color: '#28a745' },
      { icon: 'fas fa-store', value: data.linkedShops.length, label: 'SHOPS', color: '#6f42c1' },
      { icon: 'fas fa-users', value: data.associates.length, label: 'ASSOCIATES', color: '#fd7e14' }
    ];
    
    // Quick links - use all locations
    data.quickLinks = [
      ...data.allLocations.map(loc => ({ ...loc, type: 'location' })),
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
    const refreshBtn = `
      <button type="button" class="refresh-btn refresh-locations" title="Refresh location data">
        <i class="fas fa-sync-alt"></i>
        Refresh
      </button>
    `;

    return `
      ${TemplateComponents.contentHeader('fas fa-map-marker-alt', 'Locations', refreshBtn)}
      ${TemplateComponents.dropZone('location', 'fas fa-map-marker-alt', 'Add Locations', 'Drag location journals here to associate this NPC with them')}
      ${this._generateLocationsBySource(data)}
    `;
  }

  _generateLocationsBySource(data) {
    // Separate direct and shop-based locations
    const directLocations = data.allLocations.filter(loc => loc.source === 'direct');
    const shopLocations = data.allLocations.filter(loc => loc.source === 'shop');

    let content = '';

    // Direct locations
    if (directLocations.length > 0) {
      content += `
        <div class="location-section">
          <h3 style="color: var(--cc-main-text); font-family: var(--cc-font-heading); font-size: 18px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 24px 0 16px 0; border-bottom: 1px solid var(--cc-border-light); padding-bottom: 8px;">
            <i class="fas fa-map-marker-alt" style="color: var(--cc-accent); margin-right: 8px;"></i>
            Direct Locations (${directLocations.length})
          </h3>
          ${TemplateComponents.entityGrid(directLocations, 'location')}
        </div>
      `;
    }

    // Shop-based locations
    if (shopLocations.length > 0) {
      content += `
        <div class="location-section">
          <h3 style="color: var(--cc-main-text); font-family: var(--cc-font-heading); font-size: 18px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 24px 0 16px 0; border-bottom: 1px solid var(--cc-border-light); padding-bottom: 8px;">
            <i class="fas fa-store" style="color: var(--cc-accent); margin-right: 8px;"></i>
            Shop Locations (${shopLocations.length})
          </h3>
          ${TemplateComponents.infoBanner('Locations where this NPC works through shop associations.')}
          ${TemplateComponents.entityGrid(shopLocations, 'location')}
        </div>
      `;
    }

    if (data.allLocations.length === 0) {
      content = TemplateComponents.emptyState('location');
    }

    return content;
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
        img: journal.getFlag("campaign-codex", "image") ||  actor.img,
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

  // Enhanced method to find ALL locations where this NPC appears
  async _getAllLocations(directLocationIds) {
    const locationMap = new Map();
    
    // First, add directly linked locations
    for (const id of directLocationIds) {
      const journal = game.journal.get(id);
      if (journal) {
        locationMap.set(id, {
          id: journal.id,
          name: journal.name,
          img: journal.getFlag("campaign-codex", "image") ||  "icons/svg/direction.svg",
          source: 'direct',
          meta: '<span class="entity-type">Direct Link</span>'
        });
      }
    }
    
    // Then, discover locations through shop associations
    const npcId = this.document.id;
    
    // Find all shops that link to this NPC
    const allShops = game.journal.filter(j => j.getFlag("campaign-codex", "type") === "shop");
    
    for (const shop of allShops) {
      const shopData = shop.getFlag("campaign-codex", "data") || {};
      const linkedNPCs = shopData.linkedNPCs || [];
      
      if (linkedNPCs.includes(npcId)) {
        // This shop links to our NPC, now find locations that link to this shop
        const allLocations = game.journal.filter(j => j.getFlag("campaign-codex", "type") === "location");
        
        for (const location of allLocations) {
          const locationData = location.getFlag("campaign-codex", "data") || {};
          const linkedShops = locationData.linkedShops || [];
          
          if (linkedShops.includes(shop.id)) {
            // This location contains the shop that employs our NPC
            if (!locationMap.has(location.id)) {
              locationMap.set(location.id, {
                id: location.id,
                name: location.name,
                img: location.getFlag("campaign-codex", "image") ||  "icons/svg/direction.svg",
                source: 'shop',
                shops: [shop.name],
                meta: `<span class="entity-type">Via ${shop.name}</span>`
              });
            } else {
              // Location already exists, add shop to the list
              const existingLocation = locationMap.get(location.id);
              if (existingLocation.source === 'shop') {
                if (!existingLocation.shops.includes(shop.name)) {
                  existingLocation.shops.push(shop.name);
                  existingLocation.meta = `<span class="entity-type">Via ${existingLocation.shops.join(', ')}</span>`;
                }
              }
            }
          }
        }
      }
    }
    
    return Array.from(locationMap.values());
  }

  async _getLinkedShops(shopIds) {
    const shops = [];
    for (const id of shopIds) {
      const journal = game.journal.get(id);
      if (journal) {
        // Find which location this shop is in
        const shopData = journal.getFlag("campaign-codex", "data") || {};
        const linkedLocationId = shopData.linkedLocation;
        let locationName = 'Unknown';
        
        if (linkedLocationId) {
          const location = game.journal.get(linkedLocationId);
          if (location) {
            locationName = location.name;
          }
        }
        
        shops.push({
          id: journal.id,
          name: journal.name,
          img: journal.getFlag("campaign-codex", "image") || "icons/svg/item-bag.svg",
          meta: `<span class="entity-type">Located in ${locationName}</span>`
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
          img: journal.getFlag("campaign-codex", "image") ||  actor.img,
          actor: actor,
          meta: game.campaignCodex.getActorDisplayMeta(actor)
        });
      }
    }
    return associates;
  }

  _activateSheetSpecificListeners(html) {
    // Remove buttons - only allow removing direct locations
    html.find('.remove-location').click((e) => {
      e.stopPropagation();
      
      // Check if this button is disabled (shop-based location)
      if (e.currentTarget.style.opacity === '0.3' || e.currentTarget.style.cursor === 'not-allowed') {
        ui.notifications.warn("Cannot remove shop-based locations directly. Remove the NPC from the shop instead.");
        return;
      }
      
      // Check data-source attribute as backup
      const locationCard = e.currentTarget.closest('.entity-card');
      const isShopLocation = locationCard.getAttribute('data-source') === 'shop';
      
      if (isShopLocation) {
        ui.notifications.warn("Cannot remove shop-based locations directly. Remove the NPC from the shop instead.");
        return;
      }
      
      this._onRemoveFromList(e, 'linkedLocations');
    });
    
    html.find('.remove-actor').click(this._onRemoveActor.bind(this));
    html.find('.remove-shop').click((e) => this._onRemoveFromList(e, 'linkedShops'));
    html.find('.remove-associate').click((e) => this._onRemoveFromList(e, 'associates'));

    // Open buttons
    html.find('.open-actor').click((e) => this._onOpenDocument(e, 'actor'));
    html.find('.open-location').click((e) => this._onOpenDocument(e, 'location'));
    html.find('.open-shop').click((e) => this._onOpenDocument(e, 'shop'));
    html.find('.open-npc').click((e) => this._onOpenDocument(e, 'npc'));
    html.find('.open-associate').click((e) => this._onOpenDocument(e, 'associate'));

    // Refresh button
    html.find('.refresh-locations').click(this._onRefreshLocations.bind(this));

    // Quick links
    html.find('.location-link').click((e) => this._onOpenDocument(e, 'location'));
    html.find('.shop-link').click((e) => this._onOpenDocument(e, 'shop'));
    html.find('.npc-link').click((e) => this._onOpenDocument(e, 'npc'));
  }

  async _onRefreshLocations(event) {
    this.render(false);
    ui.notifications.info("Location data refreshed!");
  }

  async _handleDrop(data, event) {
    if (data.type === "Actor") {
      await this._handleActorDrop(data, event);
    } else if (data.type === "JournalEntry") {
      await this._handleJournalDrop(data, event);
    }
  }

  async _handleActorDrop(data, event) {
    let actor;
    
    // Handle different drop sources
    if (data.uuid) {
      const sourceActor = await fromUuid(data.uuid);
      if (!sourceActor) return;
      
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
    }
    
    if (!actor) {
      ui.notifications.warn("Could not find actor");
      return;
    }

    const dropZone = event.target.closest('.drop-zone');
    const dropType = dropZone?.dataset.dropType;

    if (dropType === "actor") {
      // Link main actor to this NPC journal
      const currentData = this.document.getFlag("campaign-codex", "data") || {};
      currentData.linkedActor = actor.id;
      await this.document.setFlag("campaign-codex", "data", currentData);
      this.render(false);
      ui.notifications.info(`Linked "${actor.name}" to NPC journal`);
      
    } else if (dropType === "associate" && actor.type === "npc") {
      // Create associate relationship
      
      // Check if NPC journal already exists for this actor
      let npcJournal = game.journal.find(j => {
        const npcData = j.getFlag("campaign-codex", "data");
        return npcData && npcData.linkedActor === actor.id && j.id !== this.document.id;
      });

      if (!npcJournal) {
        npcJournal = await game.campaignCodex.createNPCJournal(actor);
        ui.notifications.info(`Created NPC journal for "${actor.name}"`);
      }

      // Prevent linking to self
      if (npcJournal.id !== this.document.id) {
        await game.campaignCodex.linkNPCToNPC(this.document, npcJournal);
        this.render(false);
        ui.notifications.info(`Added "${actor.name}" as associate`);
      } else {
        ui.notifications.warn("Cannot link NPC to itself");
      }
    } else {
      // Default behavior - if no specific drop zone, treat as general NPC link
      if (actor.type === "npc") {
        // Check if NPC journal already exists for this actor
        let npcJournal = game.journal.find(j => {
          const npcData = j.getFlag("campaign-codex", "data");
          return npcData && npcData.linkedActor === actor.id && j.id !== this.document.id;
        });

        if (!npcJournal) {
          npcJournal = await game.campaignCodex.createNPCJournal(actor);
          ui.notifications.info(`Created NPC journal for "${actor.name}"`);
        }

        // Add as associate
        if (npcJournal.id !== this.document.id) {
          await game.campaignCodex.linkNPCToNPC(this.document, npcJournal);
          this.render(false);
          ui.notifications.info(`Added "${actor.name}" as associate`);
        }
      } else {
        ui.notifications.warn("Invalid drop target for this actor type");
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