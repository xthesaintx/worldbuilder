export class CampaignCodexJournal {
  constructor() {
    this.npcJournals = new Map();
    this.worldLore = new Map();
    this.relationships = new Map();
    this.locations = new Map();
  }

  /**
   * Create a new NPC journal entry from an actor
   * @param {Actor} actor - The actor to create a journal for
   */
  async createNPCJournal(actor = null) {
    if (actor) {
      const existingJournal = this.findNPCJournal(actor.id);
      if (existingJournal) {
        existingJournal.sheet.render(true);
        return existingJournal;
      }
    }

    const npcData = {
      actorId: actor ? actor.id : null,
      history: "",
      currentStatus: "",
      relationships: [],
      locations: [],
      plotHooks: "",
      gmNotes: "",
      playerNotes: ""
    };

    const journalData = {
      name: actor ? `${actor.name} - NPC Journal` : "New NPC Journal",
      pages: [
        {
          name: "NPC Overview",
          type: "text",
          text: { 
            content: actor ? `<h2>${actor.name}</h2><p>Drag and drop actors and locations to build relationships and connections.</p>` : `<p>Link an actor and drag and drop other actors and locations to build relationships and connections.</p>`
          }
        },
        {
          name: "campaign-codex-npc-data",
          type: "text",
          text: { content: JSON.stringify(npcData, null, 2) },
          title: { show: false }
        }
      ]
    };

    const journal = await JournalEntry.create(journalData);
    if (actor) {
      this.npcJournals.set(actor.id, journal);
    }
    journal.sheet.render(true);
    return journal;
  }

  /**
   * Find existing NPC journal by actor ID
   * @param {string} actorId - The actor ID to search for
   */
  findNPCJournal(actorId) {
    return game.journal.find(j => {
      const dataPage = j.pages.find(p => p.name === "campaign-codex-npc-data");
      if (dataPage) {
        try {
          const data = JSON.parse(dataPage.text.content || "{}");
          return data.actorId === actorId;
        } catch (error) {
          return false;
        }
      }
      return false;
    });
  }

  /**
   * Create a new world lore entry
   * @param {string} name - Name of the lore entry
   * @param {string} category - Category (Geography, History, Organizations, etc.)
   */
  async createWorldLore(name, category = "General") {
    const journalData = {
      name: name,
      flags: {
        "campaign-codex": {
          loreData: {
            category: category,
            content: "",
            linkedEntries: [],
            tags: [],
            playerVisible: true,
            gmNotes: ""
          }
        }
      },
      pages: [{
        name: "Lore Content",
        type: "text",
        text: { content: "" }
      }]
    };

    const journal = await JournalEntry.create(journalData);
    journal.sheet.render(true);
    return journal;
  }

  /**
   * Add a relationship between two NPCs
   * @param {string} npcId1 - First NPC actor ID
   * @param {string} npcId2 - Second NPC actor ID
   * @param {string} relationship - Type of relationship
   * @param {string} description - Description of the relationship
   */
  async addRelationship(npcId1, npcId2, relationship, description = "") {
    const journal1 = this.findNPCJournal(npcId1);
    const journal2 = this.findNPCJournal(npcId2);

    if (!journal1 || !journal2) return;

    // Add relationship to first NPC
    const relationships1 = journal1.getFlag("campaign-codex", "npcData.relationships") || [];
    relationships1.push({
      actorId: npcId2,
      type: relationship,
      description: description,
      id: foundry.utils.randomID()
    });

    await journal1.setFlag("campaign-codex", "npcData.relationships", relationships1);

    // Add reciprocal relationship to second NPC
    const relationships2 = journal2.getFlag("campaign-codex", "npcData.relationships") || [];
    const reciprocalType = this.getReciprocalRelationship(relationship);
    relationships2.push({
      actorId: npcId1,
      type: reciprocalType,
      description: description,
      id: foundry.utils.randomID()
    });

    await journal2.setFlag("campaign-codex", "npcData.relationships", relationships2);
  }

  /**
   * Get reciprocal relationship type
   * @param {string} relationship - Original relationship type
   */
  getReciprocalRelationship(relationship) {
    const reciprocals = {
      "parent": "child",
      "child": "parent",
      "spouse": "spouse",
      "employer": "employee",
      "employee": "employer",
      "friend": "friend",
      "enemy": "enemy",
      "ally": "ally",
      "rival": "rival"
    };
    return reciprocals[relationship] || relationship;
  }

  /**
   * Link NPC to a location
   * @param {string} actorId - NPC actor ID
   * @param {string} locationId - Journal entry ID for location
   * @param {string} connectionType - Type of connection
   * @param {string} notes - Additional notes
   */
  async linkToLocation(actorId, locationId, connectionType, notes = "") {
    const journal = this.findNPCJournal(actorId);
    if (!journal) return;

    const locations = journal.getFlag("campaign-codex", "npcData.locations") || [];
    locations.push({
      locationId: locationId,
      type: connectionType,
      notes: notes,
      id: foundry.utils.randomID()
    });

    await journal.setFlag("campaign-codex", "npcData.locations", locations);
  }

  /**
   * Search for entries by text
   * @param {string} searchText - Text to search for
   * @param {string} type - Type of entry to search (npc, lore, all)
   */
  search(searchText, type = "all") {
    const results = [];
    const regex = new RegExp(searchText, 'i');

    if (type === "all" || type === "npc") {
      game.journal.filter(j => j.getFlag("campaign-codex", "actorId")).forEach(journal => {
        const actor = game.actors.get(journal.getFlag("campaign-codex", "actorId"));
        if (actor && regex.test(actor.name)) {
          results.push({ type: "npc", journal, actor });
        }
      });
    }

    if (type === "all" || type === "lore") {
      game.journal.filter(j => j.getFlag("campaign-codex", "loreData")).forEach(journal => {
        if (regex.test(journal.name) || regex.test(journal.pages.contents[0]?.text?.content || "")) {
          results.push({ type: "lore", journal });
        }
      });
    }

    return results;
  }
}
