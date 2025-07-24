export class NPCJournalSheet extends JournalSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["sheet", "journal-sheet", "campaign-codex", "npc-journal"],
      width: 720,
      height: 800,
      resizable: true,
      tabs: [{ navSelector: ".tabs", contentSelector: ".content", initial: "overview" }]
    });
  }

  get template() {
    return "modules/campaign-codex/templates/npc-journal-sheet.html";
  }

  async getData() {
    const data = await super.getData();
    
    // Use the journal's pages to store our data instead of flags
    let npcPage = this.document.pages.find(p => p.name === "campaign-codex-npc-data");
    let npcData = {};
    
    if (npcPage) {
      try {
        npcData = JSON.parse(npcPage.text.content || "{}");
      } catch (error) {
        console.warn("Campaign Codex | Could not parse NPC data:", error);
        npcData = {};
      }
    } else {
      // Create the data page if it doesn't exist
      npcData = {
        actorId: null,
        history: "",
        currentStatus: "",
        relationships: [],
        locations: [],
        plotHooks: "",
        gmNotes: "",
        playerNotes: ""
      };
      
      try {
        await this.document.createEmbeddedDocuments("JournalEntryPage", [{
          name: "campaign-codex-npc-data",
          type: "text",
          text: { content: JSON.stringify(npcData, null, 2) },
          title: { show: false },
          src: null
        }]);
      } catch (error) {
        console.warn("Campaign Codex | Could not create NPC data page:", error);
      }
    }
    
    // Get linked actor
    data.linkedActor = npcData.actorId ? game.actors.get(npcData.actorId) : null;
    
    // Process relationships
    data.relationships = await this.processRelationships(npcData.relationships || []);
    
    // Process locations
    data.locations = await this.processLocations(npcData.locations || []);
    
    // NPC data
    data.npcData = {
      history: npcData.history || "",
      currentStatus: npcData.currentStatus || "",
      plotHooks: npcData.plotHooks || "",
      gmNotes: npcData.gmNotes || "",
      playerNotes: npcData.playerNotes || ""
    };

    data.canEdit = this.document.canUserModify(game.user, "update");
    data.showPlayerNotes = game.settings.get("campaign-codex", "showPlayerNotes");
    
    return data;
  }

  async processRelationships(relationships) {
    const processed = [];
    for (const rel of relationships) {
      const actor = game.actors.get(rel.actorId);
      if (actor) {
        processed.push({
          id: rel.id,
          actor: actor,
          type: rel.type,
          description: rel.description
        });
      }
    }
    return processed;
  }

  async processLocations(locations) {
    const processed = [];
    for (const loc of locations) {
      const journal = game.journal.get(loc.locationId);
      if (journal) {
        processed.push({
          id: loc.id,
          journal: journal,
          type: loc.type,
          notes: loc.notes
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
    html.find('.save-npc-data').click(this._onSaveData.bind(this));

    // Delete relationship/location buttons
    html.find('.delete-relationship').click(this._onDeleteRelationship.bind(this));
    html.find('.delete-location').click(this._onDeleteLocation.bind(this));

    // Open linked documents
    html.find('.open-actor').click(this._onOpenActor.bind(this));
    html.find('.open-journal').click(this._onOpenJournal.bind(this));

    // Link actor button
    html.find('.link-actor').click(this._onLinkActor.bind(this));
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

    if (data.type === "Actor") {
      await this._handleActorDrop(data);
    } else if (data.type === "JournalEntry") {
      await this._handleJournalDrop(data);
    }
  }

  async _handleActorDrop(data) {
    const actor = await fromUuid(data.uuid);
    if (!actor || actor.type !== "npc") return;

    const currentActorId = this.document.getFlag("campaign-codex", "actorId");
    if (actor.id === currentActorId) return;

    // Show relationship dialog
    const relationshipType = await this._showRelationshipDialog();
    if (!relationshipType) return;

    const relationships = this.document.getFlag("campaign-codex", "npcData.relationships") || [];
    relationships.push({
      actorId: actor.id,
      type: relationshipType.type,
      description: relationshipType.description,
      id: foundry.utils.randomID()
    });

    await this.document.setFlag("campaign-codex", "npcData.relationships", relationships);
    this.render();
  }

  async _handleJournalDrop(data) {
    const journal = await fromUuid(data.uuid);
    if (!journal) return;

    // Show location connection dialog
    const connectionType = await this._showLocationDialog();
    if (!connectionType) return;

    const locations = this.document.getFlag("campaign-codex", "npcData.locations") || [];
    locations.push({
      locationId: journal.id,
      type: connectionType.type,
      notes: connectionType.notes,
      id: foundry.utils.randomID()
    });

    await this.document.setFlag("campaign-codex", "npcData.locations", locations);
    this.render();
  }

  async _showRelationshipDialog() {
    return new Promise((resolve) => {
      new Dialog({
        title: "Add Relationship",
        content: `
          <form>
            <div class="form-group">
              <label>Relationship Type:</label>
              <select name="type">
                <option value="ally">Ally</option>
                <option value="enemy">Enemy</option>
                <option value="friend">Friend</option>
                <option value="rival">Rival</option>
                <option value="family">Family</option>
                <option value="employer">Employer</option>
                <option value="employee">Employee</option>
                <option value="acquaintance">Acquaintance</option>
              </select>
            </div>
            <div class="form-group">
              <label>Description:</label>
              <textarea name="description" placeholder="Brief description of the relationship..."></textarea>
            </div>
          </form>
        `,
        buttons: {
          ok: {
            label: "Add",
            callback: (html) => {
              resolve({
                type: html.find('[name="type"]').val(),
                description: html.find('[name="description"]').val()
              });
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

  async _showLocationDialog() {
    return new Promise((resolve) => {
      new Dialog({
        title: "Add Location Connection",
        content: `
          <form>
            <div class="form-group">
              <label>Connection Type:</label>
              <select name="type">
                <option value="lives">Lives Here</option>
                <option value="works">Works Here</option>
                <option value="owns">Owns This</option>
                <option value="frequents">Frequents</option>
                <option value="avoids">Avoids</option>
                <option value="born">Born Here</option>
                <option value="hideout">Secret Hideout</option>
              </select>
            </div>
            <div class="form-group">
              <label>Notes:</label>
              <textarea name="notes" placeholder="Additional details about this connection..."></textarea>
            </div>
          </form>
        `,
        buttons: {
          ok: {
            label: "Add",
            callback: (html) => {
              resolve({
                type: html.find('[name="type"]').val(),
                notes: html.find('[name="notes"]').val()
              });
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

    // Get or create the data page
    let npcPage = this.document.pages.find(p => p.name === "campaign-codex-npc-data");
    let currentData = {};
    
    if (npcPage) {
      try {
        currentData = JSON.parse(npcPage.text.content || "{}");
      } catch (error) {
        console.warn("Campaign Codex | Could not parse existing NPC data:", error);
      }
    }

    // Update the data
    const updatedData = {
      ...currentData,
      history: data.history || "",
      currentStatus: data.currentStatus || "",
      plotHooks: data.plotHooks || "",
      gmNotes: data.gmNotes || "",
      playerNotes: data.playerNotes || ""
    };

    if (npcPage) {
      await npcPage.update({
        "text.content": JSON.stringify(updatedData, null, 2)
      });
    } else {
      await this.document.createEmbeddedDocuments("JournalEntryPage", [{
        name: "campaign-codex-npc-data",
        type: "text",
        text: { content: JSON.stringify(updatedData, null, 2) },
        title: { show: false }
      }]);
    }

    ui.notifications.info("NPC data saved successfully!");
  }

  async _onDeleteRelationship(event) {
    const relationshipId = event.currentTarget.dataset.relationshipId;
    const relationships = this.document.getFlag("campaign-codex", "npcData.relationships") || [];
    const filtered = relationships.filter(r => r.id !== relationshipId);
    
    await this.document.setFlag("campaign-codex", "npcData.relationships", filtered);
    this.render();
  }

  async _onDeleteLocation(event) {
    const locationId = event.currentTarget.dataset.locationId;
    const locations = this.document.getFlag("campaign-codex", "npcData.locations") || [];
    const filtered = locations.filter(l => l.id !== locationId);
    
    await this.document.setFlag("campaign-codex", "npcData.locations", filtered);
    this.render();
  }

  _onOpenActor(event) {
    const actorId = event.currentTarget.dataset.actorId;
    const actor = game.actors.get(actorId);
    if (actor) actor.sheet.render(true);
  }

  _onOpenJournal(event) {
    const journalId = event.currentTarget.dataset.journalId;
    const journal = game.journal.get(journalId);
    if (journal) journal.sheet.render(true);
  }

  async _onLinkActor(event) {
    // Show actor picker dialog
    const actors = game.actors.filter(a => a.type === "npc");
    const options = actors.map(a => `<option value="${a.id}">${a.name}</option>`).join("");
    
    const actorId = await new Promise((resolve) => {
      new Dialog({
        title: "Link Actor",
        content: `
          <form>
            <div class="form-group">
              <label>Select NPC Actor:</label>
              <select name="actorId">
                <option value="">Choose an actor...</option>
                ${options}
              </select>
            </div>
          </form>
        `,
        buttons: {
          ok: {
            label: "Link",
            callback: (html) => resolve(html.find('[name="actorId"]').val())
          },
          cancel: {
            label: "Cancel",
            callback: () => resolve(null)
          }
        },
        default: "ok"
      }).render(true);
    });

    if (actorId) {
      await this.document.setFlag("campaign-codex", "actorId", actorId);
      this.render();
    }
  }
}
