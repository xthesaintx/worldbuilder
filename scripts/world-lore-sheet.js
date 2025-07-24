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
              <textarea name="description" placeholder="How is this related to the lore entry?
