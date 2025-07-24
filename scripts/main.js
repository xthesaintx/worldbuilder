import { CampaignCodexJournal } from './campaign-journal.js';
import { NPCJournalSheet } from './npc-journal-sheet.js';
import { WorldLoreSheet } from './world-lore-sheet.js';

Hooks.once('init', async function() {
  console.log('Campaign Codex | Initializing');
  
  // Register sheet classes for journal entries
  DocumentSheetConfig.registerSheet(JournalEntry, "campaign-codex", NPCJournalSheet, {
    makeDefault: false,
    label: "Campaign Codex: NPC Journal"
  });

  DocumentSheetConfig.registerSheet(JournalEntry, "campaign-codex", WorldLoreSheet, {
    makeDefault: false,
    label: "Campaign Codex: World Lore"
  });

  console.log('Campaign Codex | Sheets registered');

  // Register settings
  game.settings.register("campaign-codex", "showPlayerNotes", {
    name: "Show Player Notes Section",
    hint: "Allow players to add their own notes to NPCs they've met",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  // Add custom CSS classes for drag and drop
  document.documentElement.style.setProperty('--campaign-codex-primary', '#4a5568');
  document.documentElement.style.setProperty('--campaign-codex-secondary', '#718096');
});

Hooks.once('ready', async function() {
  console.log('Campaign Codex | Ready');
  
  // Initialize the journal interface
  game.campaignCodex = new CampaignCodexJournal();
  
  // Log registered sheets for debugging
  console.log('Campaign Codex | Module ready, sheets should be available');
});

// Add context menu options to actors
Hooks.on('getActorDirectoryEntryContext', (html, options) => {
  options.push({
    name: "Create NPC Journal Entry",
    icon: '<i class="fas fa-book"></i>',
    condition: li => {
      const actor = game.actors.get(li.data("documentId"));
      return actor && actor.type === "npc";
    },
    callback: li => {
      const actor = game.actors.get(li.data("documentId"));
      game.campaignCodex.createNPCJournal(actor);
    }
  });
});

// Add journal entry creation buttons
Hooks.on('getJournalDirectoryEntryContext', (html, options) => {
  options.unshift({
    name: "New NPC Journal",
    icon: '<i class="fas fa-user"></i>',
    callback: async () => {
      const journal = await game.campaignCodex.createNPCJournal();
      // Manually set the sheet class
      journal._sheet = null;
      const sheet = new NPCJournalSheet(journal);
      sheet.render(true);
    }
  });
  
  options.unshift({
    name: "New World Lore",
    icon: '<i class="fas fa-globe"></i>',
    callback: async () => {
      const journal = await game.campaignCodex.createWorldLore("New Lore Entry");
      // Manually set the sheet class
      journal._sheet = null;
      const sheet = new WorldLoreSheet(journal);
      sheet.render(true);
    }    
  });
  
  // Add option to convert existing journal to NPC journal
  options.push({
    name: "Convert to NPC Journal",
    icon: '<i class="fas fa-user-cog"></i>',
    condition: li => {
      const journal = game.journal.get(li.data("documentId"));
      return journal && !journal.pages.find(p => p.name === "campaign-codex-npc-data");
    },
    callback: async li => {
      const journal = game.journal.get(li.data("documentId"));
      // Add our data page
      await journal.createEmbeddedDocuments("JournalEntryPage", [{
        name: "campaign-codex-npc-data",
        type: "text",
        text: { content: JSON.stringify({
          actorId: null,
          history: "",
          currentStatus: "",
          relationships: [],
          locations: [],
          plotHooks: "",
          gmNotes: "",
          playerNotes: ""
        }, null, 2) },
        title: { show: false }
      }]);
      
      // Force our sheet
      journal._sheet = null;
      if (journal.sheet) journal.sheet.close();
      const sheet = new NPCJournalSheet(journal);
      sheet.render(true);
    }
  });
  
  // Add option to convert existing journal to lore journal
  options.push({
    name: "Convert to World Lore",
    icon: '<i class="fas fa-globe"></i>',
    condition: li => {
      const journal = game.journal.get(li.data("documentId"));
      return journal && !journal.pages.find(p => p.name === "campaign-codex-lore-data");
    },
    callback: async li => {
      const journal = game.journal.get(li.data("documentId"));
      // Add our data page
      await journal.createEmbeddedDocuments("JournalEntryPage", [{
        name: "campaign-codex-lore-data",
        type: "text",
        text: { content: JSON.stringify({
          category: "General",
          content: "",
          linkedEntries: [],
          tags: [],
          playerVisible: true,
          gmNotes: ""
        }, null, 2) },
        title: { show: false }
      }]);
      
      // Force our sheet
      journal._sheet = null;
      if (journal.sheet) journal.sheet.close();
      const sheet = new WorldLoreSheet(journal);
      sheet.render(true);
    }
  });
});

// Automatically use custom sheets for our journal types
Hooks.on('renderJournalEntry', (journal, html, data) => {
  // Check if this journal should use our custom sheets
  const hasNPCData = journal.pages.find(p => p.name === "campaign-codex-npc-data");
  const hasLoreData = journal.pages.find(p => p.name === "campaign-codex-lore-data");
  
  if (hasNPCData && !(journal.sheet instanceof NPCJournalSheet)) {
    // Force NPC sheet
    journal._sheet = null; // Clear existing sheet
    journal.sheet.close();
    new NPCJournalSheet(journal).render(true);
  } else if (hasLoreData && !(journal.sheet instanceof WorldLoreSheet)) {
    // Force lore sheet
    journal._sheet = null; // Clear existing sheet
    journal.sheet.close();
    new WorldLoreSheet(journal).render(true);
  }
});

// Handle drag and drop functionality
Hooks.on('dropCanvasData', async (canvas, data) => {
  if (data.type === "Actor" && canvas.activeSheet?.constructor.name === "NPCJournalSheet") {
    canvas.activeSheet.handleActorDrop(data);
  }
});
