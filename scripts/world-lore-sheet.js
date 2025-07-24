export class WorldLoreSheet extends JournalSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["sheet", "journal-sheet", "campaign-codex", "world-lore"],
      width: 720,
      height: 800,
      resizable: true,
      tabs: [{ navSelector: ".tabs", contentSelector: ".content", initial: "content" }]
    });
  }

  get template() {
    return "modules/campaign-codex/templates/world-lore-sheet.hbs";
  }

  async getData() {
    const data = await super.getData();
    const loreData = this.document.getFlag("campaign-codex", "loreData") || {};
    
    // Process linked entries
    data.linkedEntries = await this.processLinkedEntries(loreData.linkedEntries || []);
    
    // Lore data
    data.loreData = {
      category: loreData.category || "General",
      content: loreData.content || "",
      tags: loreData.tags || [],
      playerVisible: loreData.playerVisible !== false,
      gmNotes: loreData.gmNotes || ""
    };

    // Categories for dropdown
    data.categories = [
      "General",
      "Geography",
      "History", 
      "Organizations",
      "Culture",
      "Magic & Mysteries",
      "Pantheon",
      "Politics",
      "Economics",
      "NPCs",
      "Locations"
    ];

    data.canEdit = this.document.canUserModify(game.user, "update");
    data.isGM = game.user.isGM;
    
    return data;
  }

  async processLinkedEntries(linkedEntries) {
    const processed = [];
    for (const link of linkedEntries) {
      let document = null;
      if (link.type === "journal") {
        document = game.journal.get(link.id);
      } else if (link.type === "actor") {
        document = game.actors.get(link.id);
      }
      
      if (document) {
        processed.push({
          linkId: link.linkId,
          document: document,
          type: link.type,
          description: link.description
        });
      }
    }
    return processed;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Make the sheet a drop target
    html[0].addEventListener('drop', this._onDrop.bind(this));
    html[0].addEventListener('dragover', this._onDragOver.bind(this));

    // Save button
    html.find('.save-lore-data').click(this._onSaveData.bind(this));

    // Tag management
    html.find('.add-tag').click(this._onAddTag.bind(this));
    html.find('.remove-tag').click(this._onRemoveTag.bind(this));

    // Delete linked entry
    html.find('.delete-link').click(this._onDeleteLink.bind(this));

    // Open linked documents
    html.find('.open-document').click(this._onOpenDocument.bind(this));

    // Search and link existing entries
    html.find('.search-link').click(this._onSearchLink.bind(this));
  }

  _onDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "link";
  }

  async _onDrop(event) {
    event.preventDefault();
    
    let data;
    try {
      data = JSON.parse(event.dataTransfer.getData('text/plain'));
    } catch (err) {
      return;
    }

    if (data.type === "JournalEntry" || data.type === "Actor") {
      await this._handleDocumentDrop(data);
    }
  }

  async _handleDocumentDrop(data) {
    const document = await fromUuid(data.uuid);
    if (!document) return;

    // Show link description dialog
    const description = await this._showLinkDialog(document.name);
    if (description === null) return;

    const linkedEntries = this.document.getFlag("campaign-codex", "loreData.linkedEntries") || [];
    linkedEntries.push({
      id: document.id,
      type: data.type.toLowerCase(),
      description: description,
      linkId: foundry.utils.randomID()
    });

    await this.document.setFlag("campaign-codex", "loreData.linkedEntries", linkedEntries);
    this.render();
  }

  async _showLinkDialog(documentName) {
    return new Promise((resolve) => {
      new Dialog({
        title: "Link Document",
        content: `
          <form>
            <p>Linking: <strong>${documentName}</strong></p>
            <div class="form-group">
              <label>Description of Connection:</label>
              <textarea name="description" placeholder="How is this related to the lore entry?"></textarea>
            </div>
          </form>
        `,
        buttons: {
          ok: {
            label: "Link",
            callback: (html) => {
              resolve(html.find('[name="description"]').val());
            }
          },
          cancel: {
            label: "Cancel",
            callback: () => resolve(null)
          }
        },
        default: "ok"
      }).render(true);
    });
  }

  async _onSaveData(event) {
    event.preventDefault();
    const form = event.currentTarget.closest('form');
    const formData = new FormDataExtended(form);
    const data = formData.object;

    // Get current tags
    const currentTags = this.document.getFlag("campaign-codex", "loreData.tags") || [];
    const currentLinkedEntries = this.document.getFlag("campaign-codex", "loreData.linkedEntries") || [];

    await this.document.setFlag("campaign-codex", "loreData", {
      category: data.category || "General",
      content: data.content || "",
      tags: currentTags,
      playerVisible: data.playerVisible || false,
      gmNotes: data.gmNotes || "",
      linkedEntries: currentLinkedEntries
    });

    ui.notifications.info("World lore saved successfully!");
  }

  async _onAddTag(event) {
    const tagName = await new Promise((resolve) => {
      new Dialog({
        title: "Add Tag",
        content: `
          <form>
            <div class="form-group">
              <label>Tag Name:</label>
              <input type="text" name="tagName" placeholder="Enter tag name..." autofocus>
            </div>
          </form>
        `,
        buttons: {
          ok: {
            label: "Add",
            callback: (html) => resolve(html.find('[name="tagName"]').val())
          },
          cancel: {
            label: "Cancel",
            callback: () => resolve(null)
          }
        },
        default: "ok"
      }).render(true);
    });

    if (tagName && tagName.trim()) {
      const currentTags = this.document.getFlag("campaign-codex", "loreData.tags") || [];
      if (!currentTags.includes(tagName.trim())) {
        currentTags.push(tagName.trim());
        await this.document.setFlag("campaign-codex", "loreData.tags", currentTags);
        this.render();
      }
    }
  }

  async _onRemoveTag(event) {
    const tagName = event.currentTarget.dataset.tag;
    const currentTags = this.document.getFlag("campaign-codex", "loreData.tags") || [];
    const filtered = currentTags.filter(t => t !== tagName);
    
    await this.document.setFlag("campaign-codex", "loreData.tags", filtered);
    this.render();
  }

  async _onDeleteLink(event) {
    const linkId = event.currentTarget.dataset.linkId;
    const linkedEntries = this.document.getFlag("campaign-codex", "loreData.linkedEntries") || [];
    const filtered = linkedEntries.filter(l => l.linkId !== linkId);
    
    await this.document.setFlag("campaign-codex", "loreData.linkedEntries", filtered);
    this.render();
  }

  _onOpenDocument(event) {
    const documentId = event.currentTarget.dataset.documentId;
    const documentType = event.currentTarget.dataset.documentType;
    
    let document = null;
    if (documentType === "journal") {
      document = game.journal.get(documentId);
    } else if (documentType === "actor") {
      document = game.actors.get(documentId);
    }
    
    if (document) document.sheet.render(true);
  }

  async _onSearchLink(event) {
    // Create a searchable dialog of all journals and NPCs
    const journals = game.journal.contents.filter(j => j.id !== this.document.id);
    const npcs = game.actors.contents.filter(a => a.type === "npc");
    
    const journalOptions = journals.map(j => `<option value="journal-${j.id}">[Journal] ${j.name}</option>`).join("");
    const npcOptions = npcs.map(a => `<option value="actor-${a.id}">[NPC] ${a.name}</option>`).join("");
    
    const selection = await new Promise((resolve) => {
      new Dialog({
        title: "Search and Link",
        content: `
          <form>
            <div class="form-group">
              <label>Search for document to link:</label>
              <input type="text" name="search" placeholder="Type to filter..." style="margin-bottom: 10px;">
              <select name="document" size="10" style="width: 100%; height: 200px;">
                ${journalOptions}
                ${npcOptions}
              </select>
            </div>
            <div class="form-group">
              <label>Description:</label>
              <textarea name="description" placeholder="How is this related?"></textarea>
            </div>
          </form>
        `,
        buttons: {
          ok: {
            label: "Link",
            callback: (html) => {
              const selection = html.find('[name="document"]').val();
              const description = html.find('[name="description"]').val();
              if (selection) {
                const [type, id] = selection.split('-');
                resolve({ type, id, description });
              } else {
                resolve(null);
              }
            }
          },
          cancel: {
            label: "Cancel",
            callback: () => resolve(null)
          }
        },
        default: "ok",
        render: (html) => {
          // Add search functionality
          const searchInput = html.find('[name="search"]');
          const select = html.find('[name="document"]');
          const allOptions = select.find('option');
          
          searchInput.on('input', function() {
            const searchTerm = this.value.toLowerCase();
            allOptions.each(function() {
              const option = $(this);
              const text = option.text().toLowerCase();
              option.toggle(text.includes(searchTerm));
            });
          });
        }
      }).render(true);
    });

    if (selection) {
      const linkedEntries = this.document.getFlag("campaign-codex", "loreData.linkedEntries") || [];
      linkedEntries.push({
        id: selection.id,
        type: selection.type,
        description: selection.description,
        linkId: foundry.utils.randomID()
      });

      await this.document.setFlag("campaign-codex", "loreData.linkedEntries", linkedEntries);
      this.render();
    }
  }
}
