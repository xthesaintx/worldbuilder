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

  async _renderInner(data) {
    // Create inline template if external file doesn't exist
    const templateContent = `
      <form class="{{cssClass}} flexcol" autocomplete="off">
        
        {{!-- Header with linked actor info --}}
        <header class="sheet-header">
          {{#if linkedActor}}
            <div class="linked-actor-header">
              <img src="{{linkedActor.img}}" alt="{{linkedActor.name}}" class="actor-portrait">
              <div class="actor-info">
                <h1>{{linkedActor.name}}</h1>
                <div class="actor-stats">
                  <span class="stat">AC: {{linkedActor.system.attributes.ac.value}}</span>
                  <span class="stat">HP: {{linkedActor.system.attributes.hp.value}}/{{linkedActor.system.attributes.hp.max}}</span>
                  {{#if linkedActor.system.details.cr}}
                    <span class="stat">CR: {{linkedActor.system.details.cr}}</span>
                  {{/if}}
                </div>
              </div>
              <button type="button" class="open-actor" data-actor-id="{{linkedActor.id}}" title="Open Actor Sheet">
                <i class="fas fa-external-link-alt"></i>
              </button>
            </div>
          {{else}}
            <div class="no-actor-header">
              <h1>{{document.name}}</h1>
              <button type="button" class="link-actor">
                <i class="fas fa-link"></i> Link Actor
              </button>
            </div>
          {{/if}}
        </header>

        {{!-- Navigation tabs --}}
        <nav class="sheet-tabs tabs" data-group="primary">
          <a class="item" data-tab="overview">
            <i class="fas fa-user"></i> Overview
          </a>
          <a class="item" data-tab="relationships">
            <i class="fas fa-users"></i> Relationships
          </a>
          <a class="item" data-tab="locations">
            <i class="fas fa-map-marker-alt"></i> Locations
          </a>
          <a class="item" data-tab="notes">
            <i class="fas fa-sticky-note"></i> Notes
          </a>
        </nav>

        {{!-- Tab content --}}
        <section class="sheet-body">
          
          {{!-- Overview Tab --}}
          <div class="tab" data-group="primary" data-tab="overview">
            <div class="form-group">
              <label>History & Background</label>
              <textarea name="history" placeholder="Write the character's history, background, and motivations...">{{npcData.history}}</textarea>
            </div>
            
            <div class="form-group">
              <label>Current Status</label>
              <textarea name="currentStatus" placeholder="What are they doing now? Current goals, recent events...">{{npcData.currentStatus}}</textarea>
            </div>
            
            <div class="form-group">
              <label>Plot Hooks</label>
              <textarea name="plotHooks" placeholder="Story opportunities involving this character...">{{npcData.plotHooks}}</textarea>
            </div>
          </div>

          {{!-- Relationships Tab --}}
          <div class="tab" data-group="primary" data-tab="relationships">
            <div class="drop-zone" data-drop-type="actor">
              <p><i class="fas fa-user-plus"></i> Drag NPCs here to create relationships</p>
            </div>
            
            {{#if relationships}}
              <div class="relationships-list">
                {{#each relationships}}
                  <div class="relationship-item">
                    <img src="{{actor.img}}" alt="{{actor.name}}" class="relationship-portrait">
                    <div class="relationship-info">
                      <h4>{{actor.name}}</h4>
                      <span class="relationship-type">{{type}}</span>
                      {{#if description}}
                        <p class="relationship-desc">{{description}}</p>
                      {{/if}}
                    </div>
                    <div class="relationship-controls">
                      <button type="button" class="open-actor" data-actor-id="{{actor.id}}" title="Open Actor">
                        <i class="fas fa-external-link-alt"></i>
                      </button>
                      <button type="button" class="delete-relationship" data-relationship-id="{{id}}" title="Remove Relationship">
                        <i class="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                {{/each}}
              </div>
            {{/if}}
          </div>

          {{!-- Locations Tab --}}
          <div class="tab" data-group="primary" data-tab="locations">
            <div class="drop-zone" data-drop-type="journal">
              <p><i class="fas fa-map-marker-alt"></i> Drag location journals here to create connections</p>
            </div>
            
            {{#if locations}}
              <div class="locations-list">
                {{#each locations}}
                  <div class="location-item">
                    <div class="location-info">
                      <h4>{{journal.name}}</h4>
                      <span class="location-type">{{type}}</span>
                      {{#if notes}}
                        <p class="location-notes">{{notes}}</p>
                      {{/if}}
                    </div>
                    <div class="location-controls">
                      <button type="button" class="open-journal" data-journal-id="{{journal.id}}" title="Open Journal">
                        <i class="fas fa-external-link-alt"></i>
                      </button>
                      <button type="button" class="delete-location" data-location-id="{{id}}" title="Remove Connection">
                        <i class="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                {{/each}}
              </div>
            {{/if}}
          </div>

          {{!-- Notes Tab --}}
          <div class="tab" data-group="primary" data-tab="notes">
            {{#if canEdit}}
              <div class="form-group">
                <label>GM Notes</label>
                <textarea name="gmNotes" placeholder="Private GM notes, secrets, future plans...">{{npcData.gmNotes}}</textarea>
              </div>
            {{/if}}
            
            {{#if showPlayerNotes}}
              <div class="form-group">
                <label>Player Notes</label>
                <textarea name="playerNotes" placeholder="What the players have learned about this character...">{{npcData.playerNotes}}</textarea>
              </div>
            {{/if}}
          </div>
          
        </section>

        {{!-- Footer with save button --}}
        <footer class="sheet-footer">
          <button type="button" class="save-npc-data">
            <i class="fas fa-save"></i> Save Changes
          </button>
        </footer>

      </form>
    `;

    // Try to render with external template first, fall back to inline
    try {
      return await super._renderInner(data);
    } catch (error) {
      console.warn("Campaign Codex | Using inline template for NPC sheet");
      const compiled = Handlebars.compile(templateContent);
      return $(compiled(data));
    }
  }
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

    // Activate tabs
    this._activateTabs(html);

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

  _activateTabs(html) {
    // Tab navigation
    html.find('.tabs .item').click(event => {
      const tab = event.currentTarget.dataset.tab;
      this._onChangeTab(event, tab, html);
    });

    // Show first tab by default
    const firstTab = html.find('.tabs .item').first();
    if (firstTab.length) {
      this._onChangeTab({currentTarget: firstTab[0]}, firstTab[0].dataset.tab, html);
    }
  }

  _onChangeTab(event, tabName, html) {
    // Remove active from all tabs and content
    html.find('.tabs .item').removeClass('active');
    html.find('.tab').removeClass('active');

    // Add active to clicked tab and corresponding content
    $(event.currentTarget).addClass('active');
    html.find(`.tab[data-tab="${tabName}"]`).addClass('active');
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
    
    // Get form data from the sheet's form element
    const form = this.element.find('form')[0];
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

    try {
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
      
      // Add visual feedback
      const saveBtn = $(event.currentTarget);
      saveBtn.addClass('success');
      setTimeout(() => saveBtn.removeClass('success'), 2000);
      
    } catch (error) {
      console.error("Campaign Codex | Error saving NPC data:", error);
      ui.notifications.error("Failed to save NPC data!");
      
      const saveBtn = $(event.currentTarget);
      saveBtn.addClass('error');
      setTimeout(() => saveBtn.removeClass('error'), 2000);
    }
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