import { CampaignCodexJournal } from './campaign-journal.js';
import { NPCJournalSheet } from './npc-journal-sheet.js';
import { WorldLoreSheet } from './world-lore-sheet.js';

Hooks.once('init', async function() {
  console.log('Campaign Codex | Initializing');
  
  // Register custom journal entry types
  CONFIG.JournalEntry.documentClass.TYPES = foundry.utils.mergeObject(
    CONFIG.JournalEntry.documentClass.TYPES, 
    {
      "campaign-npc": "campaign-codex.npc-entry",
      "world-lore": "campaign-codex.world-lore"
    }
  );

  // Register sheet classes
  DocumentSheetConfig.registerSheet(JournalEntry, "campaign-codex", NPCJournalSheet, {
    types: ["campaign-npc"],
    makeDefault: true,
    label: "Campaign Codex: NPC Journal"
  });

  DocumentSheetConfig.registerSheet(JournalEntry, "campaign-codex", WorldLoreSheet, {
    types: ["world-lore"],
    makeDefault: true,
    label: "Campaign Codex: World Lore"
  });

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
    callback: () => {
      JournalEntry.create({
        name: "New NPC Entry",
        type: "campaign-npc",
        pages: [{
          name: "NPC Details",
          type: "text",
          text: { content: "" }
        }]
      });
    }
  });
  
  options.unshift({
    name: "New World Lore",
    icon: '<i class="fas fa-globe"></i>',
    callback: () => {
      JournalEntry.create({
        name: "New Lore Entry",
        type: "world-lore",
        pages: [{
          name: "Lore Details",
          type: "text", 
          text: { content: "" }
        }]
      });
    }
  });
});

// Handle drag and drop functionality
Hooks.on('dropCanvasData', async (canvas, data) => {
  if (data.type === "Actor" && canvas.activeSheet?.constructor.name === "NPCJournalSheet") {
    canvas.activeSheet.handleActorDrop(data);
  }
});
