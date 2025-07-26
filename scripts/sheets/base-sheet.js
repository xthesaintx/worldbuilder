// Base sheet class with shared functionality
export class CampaignCodexBaseSheet extends JournalSheet {
  constructor(document, options = {}) {
    super(document, options);
    this._currentTab = 'info';
  }

static get defaultOptions() {
  return foundry.utils.mergeObject(super.defaultOptions, {
    classes: ["sheet", "journal-sheet", "campaign-codex"],
    width: 1000,
    height: 700,
    resizable: true,
    minimizable: true, // Add this
    tabs: [{ navSelector: ".sidebar-tabs", contentSelector: ".main-content", initial: "info" }]
  });
}

  async getData() {
    const data = await super.getData();
    const sheetData = this.document.getFlag("campaign-codex", "data") || {};
    
    // Common data structure
    data.sheetData = {
      description: sheetData.description || "",
      notes: sheetData.notes || ""
    };
    
    data.canEdit = this.document.canUserModify(game.user, "update");
    data.currentTab = this._currentTab;
    
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Common listeners
    this._activateTabs(html);
    this._setupDropZones(html);
    this._setupNameEditing(html);
    this._setupImageChange(html);
    this._setupSaveButton(html);
    
    // Let subclasses add their own listeners
    this._activateSheetSpecificListeners(html);
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

  _setupDropZones(html) {
    html[0].addEventListener('drop', this._onDrop.bind(this));
    html[0].addEventListener('dragover', this._onDragOver.bind(this));
  }

  _setupNameEditing(html) {
    html.find('.sheet-title').click(this._onNameEdit.bind(this));
    // Use event delegation since the input is created dynamically
    html.on('blur', '.name-input', this._onNameSave.bind(this));
    html.on('keypress', '.name-input', this._onNameKeypress.bind(this));
  }

  _setupImageChange(html) {
    html.find('.image-change-btn').off('click').on('click', this._onImageClick.bind(this));
  }

  _setupSaveButton(html) {
    html.find('.save-data').click(this._onSaveData.bind(this));
  }

  // Name editing functionality
  async _onNameEdit(event) {
    const nameElement = $(event.currentTarget);
    const currentName = nameElement.text();
    
    const input = $(`<input type="text" class="name-input" value="${currentName}" style="background: transparent; border: 1px solid rgba(255,255,255,0.3); color: white; padding: 4px 8px; border-radius: 4px; font-family: 'Modesto Condensed', serif; font-size: 28px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; width: 100%;">`);
    
    nameElement.replaceWith(input);
    input.focus().select();
  }

  async _onNameSave(event) {
    const input = $(event.currentTarget);
    const newName = input.val().trim();
    
    if (newName && newName !== this.document.name) {
      await this.document.update({ name: newName });
    }
    
    const nameElement = $(`<h1 class="sheet-title">${this.document.name}</h1>`);
    input.replaceWith(nameElement);
    nameElement.click(this._onNameEdit.bind(this));
  }

  async _onNameKeypress(event) {
    if (event.which === 13) {
      event.currentTarget.blur();
    }
  }
  
async _onImageClick(event) {
  event.preventDefault();
  event.stopPropagation();
  
  const current = this.document.getFlag("campaign-codex", "image") || this.document.img;
  const fp = new FilePicker({
    type: "image",
    current: current,
    callback: async (path) => {
      try {
        console.log("Updating image to:", path);
        await this.document.setFlag("campaign-codex", "image", path);
        
        // Force immediate visual update
        const imgElement = this.element.find('.sheet-image img');
        if (imgElement.length) {
          imgElement.attr('src', path);
        }
        
        // Re-render the entire sheet to ensure all image references update
        setTimeout(() => {
          this.render(false);
        }, 100);
        
        ui.notifications.info("Image updated successfully!");
      } catch (error) {
        console.error("Failed to update image:", error);
        ui.notifications.error("Failed to update image");
      }
    },
    top: this.position.top + 40,
    left: this.position.left + 10
  });
  
  return fp.browse();
}

  _onDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "link";
  }

  async _onDrop(event) {
    event.preventDefault();
    
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
      await this._handleDrop(data, event);
    } finally {
      this._dropping = false;
    }
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
      ui.notifications.info(`${this.constructor.name.replace('Sheet', '')} saved successfully!`);
      
      const saveBtn = $(event.currentTarget);
      saveBtn.addClass('success');
      setTimeout(() => saveBtn.removeClass('success'), 1500);
      
    } catch (error) {
      console.error("Campaign Codex | Error saving data:", error);
      ui.notifications.error("Failed to save data!");
      
      const saveBtn = $(event.currentTarget);
      saveBtn.addClass('error');
      setTimeout(() => saveBtn.removeClass('error'), 1500);
    }
  }

  // Generic open/remove methods
  _onOpenDocument(event, type) {
    event.stopPropagation();
    const id = event.currentTarget.dataset[`${type}Id`] || 
               event.currentTarget.closest(`[data-${type}-id]`).dataset[`${type}Id`];
    
    if (type === 'actor') {
      const doc = game.actors.get(id);
      if (doc) doc.sheet.render(true);
    } else {
      const doc = game.journal.get(id);
      if (doc) doc.sheet.render(true);
    }
  }

  async _onRemoveFromList(event, listName) {
    const itemId = event.currentTarget.dataset[Object.keys(event.currentTarget.dataset)[0]];
    const currentData = this.document.getFlag("campaign-codex", "data") || {};
    
    if (Array.isArray(currentData[listName])) {
      currentData[listName] = currentData[listName].filter(id => id !== itemId);
    } else {
      currentData[listName] = null;
    }
    
    await this.document.setFlag("campaign-codex", "data", currentData);
    this.render(false);
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
  // Check if we're being force-closed due to document deletion
  if (this._forceClose) {
    return super.close(options);
  }

  // Check if document still exists before trying to save
  const documentExists = this.document && game.journal.get(this.document.id);
  
  if (documentExists && !this.document._pendingDeletion) {
    const form = this.element?.find('form')[0];
    if (form) {
      try {
        const formData = new FormDataExtended(form);
        const data = formData.object;
        const currentData = this.document.getFlag("campaign-codex", "data") || {};
        const updatedData = {
          ...currentData,
          description: data.description || "",
          notes: data.notes || ""
        };
        await this.document.setFlag("campaign-codex", "data", updatedData);
      } catch (error) {
        console.warn("Campaign Codex | Could not save on close:", error);
      }
    }
  }
  
  return super.close(options);
}

  // Abstract methods to be implemented by subclasses
  _activateSheetSpecificListeners(html) {
    // Override in subclasses
  }

  async _handleDrop(data, event) {
    // Override in subclasses
  }

  getSheetType() {
    // Override in subclasses
    return "base";
}

_isRelatedDocument(changedDocId) {
  if (!this.document.getFlag) return false;
  
  const data = this.document.getFlag("campaign-codex", "data") || {};
  const allLinkedIds = [
    ...(data.linkedNPCs || []),
    ...(data.linkedShops || []),
    ...(data.linkedLocations || []),
    ...(data.associates || []),
    data.linkedLocation,
    data.linkedActor
  ].filter(Boolean);
  
  return allLinkedIds.includes(changedDocId);
}





  }
