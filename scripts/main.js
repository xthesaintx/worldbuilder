import { CampaignManager } from './campaign-manager.js';
import { LocationSheet } from './sheets/location-sheet.js';
import { ShopSheet } from './sheets/shop-sheet.js';
import { NPCSheet } from './sheets/npc-sheet.js';
import { RegionSheet } from './sheets/region-sheet.js';

Hooks.once('init', async function() {
  console.log('Campaign Codex | Initializing v2.0');
  
  // Register sheet classes
  DocumentSheetConfig.registerSheet(JournalEntry, "campaign-codex", LocationSheet, {
    makeDefault: false,
    label: "Campaign Codex: Location"
  });

  DocumentSheetConfig.registerSheet(JournalEntry, "campaign-codex", ShopSheet, {
    makeDefault: false,
    label: "Campaign Codex: Shop"
  });

  DocumentSheetConfig.registerSheet(JournalEntry, "campaign-codex", NPCSheet, {
    makeDefault: false,
    label: "Campaign Codex: NPC"
  });

  DocumentSheetConfig.registerSheet(JournalEntry, "campaign-codex", RegionSheet, {
    makeDefault: false,
    label: "Campaign Codex: Region"
  });

  // Register settings
  game.settings.register("campaign-codex", "showPlayerNotes", {
    name: "Show Player Notes Section",
    hint: "Allow players to add their own notes",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  console.log('Campaign Codex | Sheets registered');
});

Hooks.once('ready', async function() {
  console.log('Campaign Codex | Ready');
  
  // Initialize the campaign manager
  game.campaignCodex = new CampaignManager();
});

// Add context menu options to actors
Hooks.on('getActorDirectoryEntryContext', (html, options) => {
  options.push({
    name: "Create NPC Journal",
    icon: '<i class="fas fa-user"></i>',
    condition: li => {
      const actor = game.actors.get(li.data("documentId"));
      return actor && actor.type === "npc";
    },
    callback: async li => {
      const actor = game.actors.get(li.data("documentId"));
      await game.campaignCodex.createNPCJournal(actor);
    }
  });
});

// Add journal entry creation buttons
Hooks.on('getJournalDirectoryEntryContext', (html, options) => {
  options.unshift({
    name: "New Location",
    icon: '<i class="fas fa-map-marker-alt"></i>',
    callback: () => game.campaignCodex.createLocationJournal()
  });
  
  options.unshift({
    name: "New Shop",
    icon: '<i class="fas fa-store"></i>',
    callback: () => game.campaignCodex.createShopJournal()
  });
  
  options.unshift({
    name: "New NPC Journal",
    icon: '<i class="fas fa-user"></i>',
    callback: () => game.campaignCodex.createNPCJournal()
  });
  
  options.unshift({
    name: "New Region",
    icon: '<i class="fas fa-globe"></i>',
    callback: () => game.campaignCodex.createRegionJournal()
  });

  // Conversion options
  options.push({
    name: "Convert to Location",
    icon: '<i class="fas fa-map-marker-alt"></i>',
    condition: li => {
      const journal = game.journal.get(li.data("documentId"));
      return journal && !journal.getFlag("campaign-codex", "type");
    },
    callback: async li => {
      const journal = game.journal.get(li.data("documentId"));
      await game.campaignCodex.convertToLocation(journal);
    }
  });

  options.push({
    name: "Convert to Shop",
    icon: '<i class="fas fa-store"></i>',
    condition: li => {
      const journal = game.journal.get(li.data("documentId"));
      return journal && !journal.getFlag("campaign-codex", "type");
    },
    callback: async li => {
      const journal = game.journal.get(li.data("documentId"));
      await game.campaignCodex.convertToShop(journal);
    }
  });

  options.push({
    name: "Convert to NPC Journal",
    icon: '<i class="fas fa-user"></i>',
    condition: li => {
      const journal = game.journal.get(li.data("documentId"));
      return journal && !journal.getFlag("campaign-codex", "type");
    },
    callback: async li => {
      const journal = game.journal.get(li.data("documentId"));
      await game.campaignCodex.convertToNPC(journal);
    }
  });

  options.push({
    name: "Convert to Region",
    icon: '<i class="fas fa-globe"></i>',
    condition: li => {
      const journal = game.journal.get(li.data("documentId"));
      return journal && !journal.getFlag("campaign-codex", "type");
    },
    callback: async li => {
      const journal = game.journal.get(li.data("documentId"));
      await game.campaignCodex.convertToRegion(journal);
    }
  });
});

// Auto-select appropriate sheet based on flags
Hooks.on('renderJournalEntry', (journal, html, data) => {
  const journalType = journal.getFlag("campaign-codex", "type");
  if (!journalType) return;

  const currentSheetName = journal.sheet.constructor.name;
  let targetSheet = null;

  switch (journalType) {
    case "location":
      if (currentSheetName !== "LocationSheet") targetSheet = LocationSheet;
      break;
    case "shop":
      if (currentSheetName !== "ShopSheet") targetSheet = ShopSheet;
      break;
    case "npc":
      if (currentSheetName !== "NPCSheet") targetSheet = NPCSheet;
      break;
    case "region":
      if (currentSheetName !== "RegionSheet") targetSheet = RegionSheet;
      break;
  }

  if (targetSheet) {
    setTimeout(() => {
      journal.sheet.close();
      new targetSheet(journal).render(true);
    }, 100);
  }
});

// Handle bidirectional relationship updates
Hooks.on('updateJournalEntry', async (document, changes, options, userId) => {
  if (game.user.id !== userId) return; // Only handle our own updates
  
  const type = document.getFlag("campaign-codex", "type");
  if (!type) return;

  await game.campaignCodex.handleRelationshipUpdates(document, changes, type);
});

// Cleanup relationships when documents are deleted
Hooks.on('preDeleteJournalEntry', async (document, options, userId) => {
  const type = document.getFlag("campaign-codex", "type");
  if (!type) return;

  await game.campaignCodex.cleanupRelationships(document, type);
});

Hooks.on('preDeleteActor', async (document, options, userId) => {
  await game.campaignCodex.cleanupActorRelationships(document);
});