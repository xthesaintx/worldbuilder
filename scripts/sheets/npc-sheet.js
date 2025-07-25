export class NPCSheet extends JournalSheet {
  constructor(document, options = {}) {
    super(document, options);
    this._currentTab = 'info'; // Track current tab
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["sheet", "journal-sheet", "campaign-codex", "npc-sheet"],
      width: 900,
      height: 700,
      resizable: true,
      dragDrop: [{ dragSelector: ".item", dropSelector: null }],
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
    
    // NPC specific data with basic character info
    data.npcData = {
      // Basic Info
      name: npcData.name || this.document.name,
      race: npcData.race || "",
      alignment: npcData.alignment || "",
      
      // Ability Scores
      abilities: npcData.abilities || {
        str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10
      },
      
      // Skills & Proficiencies (for advanced NPCs)
      skills: npcData.skills || [],
      languages: npcData.languages || [],
      equipment: npcData.equipment || [],
      
      // Descriptions
      description: npcData.description || "",
      personality: npcData.personality || "",
      ideals: npcData.ideals || "",
      bonds: npcData.bonds || "",
      flaws: npcData.flaws || "",
      notes: npcData.notes || ""
    };

    // Calculate ability modifiers
    data.npcData.abilityMods = {};
    for (const [key, value] of Object.entries(data.npcData.abilities)) {
      data.npcData.abilityMods[key] = Math.floor((value - 10) / 2);
    }

    // Available skills list for D&D 5e
    data.availableSkills = [
      "Acrobatics", "Animal Handling", "Arcana", "Athletics", "Deception",
      "History", "Insight", "Intimidation", "Investigation", "Medicine",
      "Nature", "Perception", "Performance", "Persuasion", "Religion",
      "Sleight of Hand", "Stealth", "Survival"
    ];

    // Available languages
    data.availableLanguages = [
      "Common", "Dwarvish", "Elvish", "Giant", "Gnomish", "Goblin", "Halfling",
      "Orc", "Abyssal", "Celestial", "Draconic", "Deep Speech", "Infernal",
      "Primordial", "Sylvan", "Undercommon"
    ];

    data.canEdit = this.document.canUserModify(game.user, "update");
    data.currentTab = this._currentTab; // Pass current tab to template
    
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

    // Make the sheet a drop target
    html[0].addEventListener('drop', this._onDrop.bind(this));
    html[0].addEventListener('dragover', this._onDragOver.bind(this));

    // Auto-save on form changes
    html.find('input, textarea, select').change(this._onAutoSave.bind(this));
    html.find('input, textarea').on('input', foundry.utils.debounce(this._onAutoSave.bind(this), 500));

    // Image functionality
    html.find('.location-image').click(this._onImageClick.bind(this));
    html.find('.image-change-btn').click(this._onImageClick.bind(this));

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

    // Ability score controls
    html.find('.ability-input').change(this._onAbilityChange.bind(this));
    html.find('.ability-roll').click(this._onAbilityRoll.bind(this));

    // Equipment controls
    html.find('.add-equipment').click(this._onAddEquipment.bind(this));
    html.find('.remove-equipment').click(this._onRemoveEquipment.bind(this));

    // Skill controls
    html.find('.add-skill').click(this._onAddSkill.bind(this));
    html.find('.remove-skill').click(this._onRemoveSkill.bind(this));

    // Language controls
    html.find('.add-language').click(this._onAddLanguage.bind(this));
    html.find('.remove-language').click(this._onRemoveLanguage.bind(this));
  }

  _activateTabs(html) {
    // Tab navigation for sidebar tabs
    html.find('.sidebar-tabs .tab-item').click(event => {
      event.preventDefault();
      const tab = event.currentTarget.dataset.tab;
      this._currentTab = tab; // Store current tab
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

  async _onImageClick(event) {
    event.preventDefault();
    
    const current = this.document.img;
    const fp = new FilePicker({
      type: "image",
      current: current,
      callback: async (path) => {
        await this.document.update({ img: path });
        this.render(false); // Re-render without changing tab
      },
      top: this.position.top + 40,
      left: this.position.left + 10
    });
    
    return fp.browse();
  }

  _onDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "link";
    
    // Add visual feedback to main content
    const mainContent = this.element.find('.main-content');
    mainContent.addClass('drag-over');
  }

  async _onDrop(event) {
    event.preventDefault();
    
    // Remove visual feedback
    const mainContent = this.element.find('.main-content');
    mainContent.removeClass('drag-over');
    
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

    if (dropType === "actor" || !this.document.getFlag("campaign-codex", "data.linkedActor")) {
      // Link main actor
      const currentData = this.document.getFlag("campaign-codex", "data") || {};
      currentData.linkedActor = actor.id;
      await this.document.setFlag("campaign-codex", "data", currentData);
      this.render(false); // Preserve current tab
    } else if (actor.type === "npc") {
      // Create or find NPC journal for this actor and add as associate
      let npcJournal = game.journal.find(j => {
        const npcData = j.getFlag("campaign-codex", "data");
        return npcData && npcData.linkedActor === actor.id;
      });

      if (!npcJournal) {
        npcJournal = await game.campaignCodex.createNPCJournal(actor);
      }

      await game.campaignCodex.linkNPCToNPC(this.document, npcJournal);
      this.render(false); // Preserve current tab
    }
  }

  async _handleJournalDrop(data) {
    const journal = await fromUuid(data.uuid);
    if (!journal) return;

    const journalType = journal.getFlag("campaign-codex", "type");
    
    if (journalType === "location") {
      await game.campaignCodex.linkLocationToNPC(journal, this.document);
      this.render(false); // Preserve current tab
    } else if (journalType === "shop") {
      await game.campaignCodex.linkShopToNPC(journal, this.document);
      this.render(false); // Preserve current tab
    } else if (journalType === "npc") {
      await game.campaignCodex.linkNPCToNPC(this.document, journal);
      this.render(false); // Preserve current tab
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
      this.render(false); // Preserve current tab
    }
  }

  // Auto-save functionality
  async _onAutoSave(event) {
    const form = this.element.find('form')[0];
    const formData = new FormDataExtended(form);
    const data = formData.object;

    const currentData = this.document.getFlag("campaign-codex", "data") || {};
    
    // Build updated data structure
    const updatedData = {
      ...currentData,
      // Basic Info
      name: data.name || "",
      race: data.race || "",
      alignment: data.alignment || "",
      
      // Ability Scores
      abilities: {
        str: parseInt(data.str) || 10,
        dex: parseInt(data.dex) || 10,
        con: parseInt(data.con) || 10,
        int: parseInt(data.int) || 10,
        wis: parseInt(data.wis) || 10,
        cha: parseInt(data.cha) || 10
      },
      
      // Skills and Languages (preserve existing arrays)
      skills: currentData.skills || [],
      languages: currentData.languages || [],
      equipment: currentData.equipment || [],
      
      // Descriptions
      description: data.description || "",
      personality: data.personality || "",
      ideals: data.ideals || "",
      bonds: data.bonds || "",
      flaws: data.flaws || "",
      notes: data.notes || ""
    };

    try {
      // Visual feedback
      const targetElement = $(event.target);
      targetElement.addClass('saving');
      
      await this.document.setFlag("campaign-codex", "data", updatedData);
      
      // Also update the document name if it changed
      if (data.name && data.name !== this.document.name) {
        await this.document.update({ name: data.name });
      }
      
      // Success feedback
      targetElement.removeClass('saving').addClass('saved');
      setTimeout(() => targetElement.removeClass('saved'), 1000);
      
    } catch (error) {
      console.error("Campaign Codex | Error auto-saving NPC data:", error);
      
      // Error feedback
      const targetElement = $(event.target);
      targetElement.removeClass('saving').addClass('error');
      setTimeout(() => targetElement.removeClass('error'), 1000);
    }
  }

  async _onRemoveActor(event) {
    const currentData = this.document.getFlag("campaign-codex", "data") || {};
    currentData.linkedActor = null;
    await this.document.setFlag("campaign-codex", "data", currentData);
    this.render(false); // Preserve current tab
  }

  async _onRemoveLocation(event) {
    const locationId = event.currentTarget.dataset.locationId;
    const currentData = this.document.getFlag("campaign-codex", "data") || {};
    
    currentData.linkedLocations = (currentData.linkedLocations || []).filter(id => id !== locationId);
    await this.document.setFlag("campaign-codex", "data", currentData);
    
    this.render(false); // Preserve current tab
  }

  async _onRemoveShop(event) {
    const shopId = event.currentTarget.dataset.shopId;
    const currentData = this.document.getFlag("campaign-codex", "data") || {};
    
    currentData.linkedShops = (currentData.linkedShops || []).filter(id => id !== shopId);
    await this.document.setFlag("campaign-codex", "data", currentData);
    
    this.render(false); // Preserve current tab
  }

  async _onRemoveAssociate(event) {
    const associateId = event.currentTarget.dataset.associateId;
    const currentData = this.document.getFlag("campaign-codex", "data") || {};
    
    currentData.associates = (currentData.associates || []).filter(id => id !== associateId);
    await this.document.setFlag("campaign-codex", "data", currentData);
    
    this.render(false); // Preserve current tab
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

  // Ability score management
  async _onAbilityChange(event) {
    const abilityName = event.currentTarget.dataset.ability;
    const value = parseInt(event.currentTarget.value) || 10;
    
    const currentData = this.document.getFlag("campaign-codex", "data") || {};
    const abilities = currentData.abilities || {};
    abilities[abilityName] = Math.max(1, Math.min(20, value));
    
    currentData.abilities = abilities;
    await this.document.setFlag("campaign-codex", "data", currentData);
    
    // Update the modifier display
    const modifier = Math.floor((abilities[abilityName] - 10) / 2);
    const modifierDisplay = event.currentTarget.closest('.ability-block').querySelector('.ability-modifier');
    if (modifierDisplay) {
      modifierDisplay.textContent = modifier >= 0 ? `+${modifier}` : modifier;
    }
  }

  async _onAbilityRoll(event) {
    event.preventDefault();
    const abilityName = event.currentTarget.dataset.ability;
    
    // Roll 4d6 drop lowest
    const rolls = [];
    for (let i = 0; i < 4; i++) {
      rolls.push(Math.floor(Math.random() * 6) + 1);
    }
    rolls.sort((a, b) => b - a);
    const total = rolls.slice(0, 3).reduce((sum, roll) => sum + roll, 0);
    
    const currentData = this.document.getFlag("campaign-codex", "data") || {};
    const abilities = currentData.abilities || {};
    abilities[abilityName] = total;
    
    currentData.abilities = abilities;
    await this.document.setFlag("campaign-codex", "data", currentData);
    
    ui.notifications.info(`Rolled ${total} for ${abilityName.toUpperCase()}: [${rolls.join(", ")}]`);
    
    // Update just the ability score display without full re-render
    const abilityInput = this.element.find(`[data-ability="${abilityName}"]`);
    abilityInput.val(total);
    
    // Update the modifier display
    const modifier = Math.floor((total - 10) / 2);
    const modifierDisplay = abilityInput.closest('.ability-block').find('.ability-modifier');
    modifierDisplay.text(modifier >= 0 ? `+${modifier}` : modifier);
  }

  async _onAddEquipment(event) {
    const newEquipment = await this._promptForEquipment();
    if (!newEquipment) return;
    
    const currentData = this.document.getFlag("campaign-codex", "data") || {};
    const equipment = currentData.equipment || [];
    equipment.push(newEquipment);
    
    currentData.equipment = equipment;
    await this.document.setFlag("campaign-codex", "data", currentData);
    this.render(false); // Preserve current tab
  }

  async _onRemoveEquipment(event) {
    const index = parseInt(event.currentTarget.dataset.index);
    const currentData = this.document.getFlag("campaign-codex", "data") || {};
    const equipment = currentData.equipment || [];
    
    equipment.splice(index, 1);
    currentData.equipment = equipment;
    await this.document.setFlag("campaign-codex", "data", currentData);
    this.render(false); // Preserve current tab
  }

  async _onAddSkill(event) {
    const skill = await this._promptForSkill();
    if (!skill) return;
    
    const currentData = this.document.getFlag("campaign-codex", "data") || {};
    const skills = currentData.skills || [];
    
    if (!skills.includes(skill)) {
      skills.push(skill);
      currentData.skills = skills;
      await this.document.setFlag("campaign-codex", "data", currentData);
      this.render(false); // Preserve current tab
    }
  }

  async _onRemoveSkill(event) {
    const skill = event.currentTarget.dataset.skill;
    const currentData = this.document.getFlag("campaign-codex", "data") || {};
    const skills = currentData.skills || [];
    
    const index = skills.indexOf(skill);
    if (index > -1) {
      skills.splice(index, 1);
      currentData.skills = skills;
      await this.document.setFlag("campaign-codex", "data", currentData);
      this.render(false); // Preserve current tab
    }
  }

  async _onAddLanguage(event) {
    const language = await this._promptForLanguage();
    if (!language) return;
    
    const currentData = this.document.getFlag("campaign-codex", "data") || {};
    const languages = currentData.languages || [];
    
    if (!languages.includes(language)) {
      languages.push(language);
      currentData.languages = languages;
      await this.document.setFlag("campaign-codex", "data", currentData);
      this.render(false); // Preserve current tab
    }
  }

  async _onRemoveLanguage(event) {
    const language = event.currentTarget.dataset.language;
    const currentData = this.document.getFlag("campaign-codex", "data") || {};
    const languages = currentData.languages || [];
    
    const index = languages.indexOf(language);
    if (index > -1) {
      languages.splice(index, 1);
      currentData.languages = languages;
      await this.document.setFlag("campaign-codex", "data", currentData);
      this.render(false); // Preserve current tab
    }
  }

  // Helper methods for prompts
  async _promptForEquipment() {
    return new Promise((resolve) => {
      new Dialog({
        title: "Add Equipment",
        content: `
          <form>
            <div class="form-group">
              <label>Item Name:</label>
              <input type="text" name="name" placeholder="Enter item name..." autofocus />
            </div>
            <div class="form-group">
              <label>Type:</label>
              <select name="type">
                <option value="Weapon">Weapon</option>
                <option value="Armor">Armor</option>
                <option value="Shield">Shield</option>
                <option value="Tool">Tool</option>
                <option value="Adventuring Gear">Adventuring Gear</option>
                <option value="Treasure">Treasure</option>
              </select>
            </div>
            <div class="form-group">
              <label>Quantity:</label>
              <input type="number" name="quantity" value="1" min="1" />
            </div>
          </form>
        `,
        buttons: {
          add: {
            label: "Add",
            callback: (html) => {
              const name = html.find('[name="name"]').val().trim();
              const type = html.find('[name="type"]').val();
              const quantity = parseInt(html.find('[name="quantity"]').val()) || 1;
              if (name) {
                resolve({ name, type, quantity });
              } else {
                resolve(null);
              }
            }
          },
          cancel: {
            label: "Cancel",
            callback: () => resolve(null)
          }
        }
      }).render(true);
    });
  }

  async _promptForSkill() {
    const availableSkills = [
      "Acrobatics", "Animal Handling", "Arcana", "Athletics", "Deception",
      "History", "Insight", "Intimidation", "Investigation", "Medicine",
      "Nature", "Perception", "Performance", "Persuasion", "Religion",
      "Sleight of Hand", "Stealth", "Survival"
    ];

    return new Promise((resolve) => {
      new Dialog({
        title: "Add Skill",
        content: `
          <form>
            <div class="form-group">
              <label>Skill:</label>
              <select name="skill" autofocus>
                ${availableSkills.map(skill => `<option value="${skill}">${skill}</option>`).join('')}
              </select>
            </div>
          </form>
        `,
        buttons: {
          add: {
            label: "Add",
            callback: (html) => {
              resolve(html.find('[name="skill"]').val());
            }
          },
          cancel: {
            label: "Cancel",
            callback: () => resolve(null)
          }
        }
      }).render(true);
    });
  }

  async _promptForLanguage() {
    const availableLanguages = [
      "Common", "Dwarvish", "Elvish", "Giant", "Gnomish", "Goblin", "Halfling",
      "Orc", "Abyssal", "Celestial", "Draconic", "Deep Speech", "Infernal",
      "Primordial", "Sylvan", "Undercommon"
    ];

    return new Promise((resolve) => {
      new Dialog({
        title: "Add Language",
        content: `
          <form>
            <div class="form-group">
              <label>Language:</label>
              <select name="language" autofocus>
                ${availableLanguages.map(lang => `<option value="${lang}">${lang}</option>`).join('')}
              </select>
            </div>
          </form>
        `,
        buttons: {
          add: {
            label: "Add",
            callback: (html) => {
              resolve(html.find('[name="language"]').val());
            }
          },
          cancel: {
            label: "Cancel",
            callback: () => resolve(null)
          }
        }
      }).render(true);
    });
  }

  // Override render to preserve tab state
  async render(force = false, options = {}) {
    // Store current tab before render
    const currentTab = this._currentTab;
    
    const result = await super.render(force, options);
    
    // Restore tab after render
    if (this._element && currentTab) {
      setTimeout(() => {
        this._showTab(currentTab, this._element);
      }, 50);
    }
    
    return result;
  }
}