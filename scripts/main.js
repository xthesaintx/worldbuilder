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
      game.campaignCodex.createNPCJournal();
    }
  });
  
  options.unshift({
    name: "New World Lore",
    icon: '<i class="fas fa-globe"></i>',
    callback: () => {
      game.campaignCodex.createWorldLore("New Lore Entry");
    }
  });
});

// Hook to determine which sheet to use for journal entries
Hooks.on('getJournalEntrySheetClass', (journalEntry, sheetClasses) => {
  // Check if this is an NPC journal entry by looking for our data page
  const hasNPCData = journalEntry.pages.find(p => p.name === "campaign-codex-npc-data");
  if (hasNPCData) {
    return NPCJournalSheet;
  }
  
  // Check if this is a world lore entry by looking for our data page
  const hasLoreData = journalEntry.pages.find(p => p.name === "campaign-codex-lore-data");
  if (hasLoreData) {
    return WorldLoreSheet;
  }
  
  return null; // Use default sheet
});

// Handle drag and drop functionality
Hooks.on('dropCanvasData', async (canvas, data) => {
  if (data.type === "Actor" && canvas.activeSheet?.constructor.name === "NPCJournalSheet") {
    canvas.activeSheet.handleActorDrop(data);
  }
});
