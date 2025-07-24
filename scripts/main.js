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


// Add Campaign Codex creation buttons to Journal Directory
Hooks.on('renderJournalDirectory', (app, html, data) => {
  // Create the button container
  const header = html.find('.directory-header');
  
  // Create Campaign Codex button group
  const buttonGroup = $(`
    <div class="campaign-codex-buttons" style="margin-top: 8px;">
      <div class="flexrow" style="gap: 4px;">
        <button class="create-location-btn" title="Create New Location">
          <i class="fas fa-map-marker-alt"></i> Location
        </button>
        <button class="create-shop-btn" title="Create New Shop">
          <i class="fas fa-store"></i> Shop
        </button>
        <button class="create-npc-btn" title="Create New NPC Journal">
          <i class="fas fa-user"></i> NPC
        </button>
        <button class="create-region-btn" title="Create New Region">
          <i class="fas fa-globe"></i> Region
        </button>
      </div>
    </div>
  `);

  // Add the button group after the header
  header.after(buttonGroup);

  // Event listeners for the buttons
  html.find('.create-location-btn').click(async () => {
    const name = await promptForName("Location");
    if (name) await game.campaignCodex.createLocationJournal(name);
  });

  html.find('.create-shop-btn').click(async () => {
    const name = await promptForName("Shop");
    if (name) await game.campaignCodex.createShopJournal(name);
  });

  html.find('.create-npc-btn').click(async () => {
    const name = await promptForName("NPC Journal");
    if (name) await game.campaignCodex.createNPCJournal(null, name);
  });

  html.find('.create-region-btn').click(async () => {
    const name = await promptForName("Region");
    if (name) await game.campaignCodex.createRegionJournal(name);
  });
});

// Helper function to prompt for name with better UX
async function promptForName(type) {
  return new Promise((resolve) => {
    new Dialog({
      title: `Create New ${type}`,
      content: `
        <form>
          <div class="form-group">
            <label>Name:</label>
            <input type="text" name="name" placeholder="Enter ${type.toLowerCase()} name..." autofocus />
          </div>
        </form>
      `,
      buttons: {
        create: {
          icon: '<i class="fas fa-check"></i>',
          label: "Create",
          callback: (html) => {
            const name = html.find('[name="name"]').val().trim();
            resolve(name || `New ${type}`);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel",
          callback: () => resolve(null)
        }
      },
      default: "create",
      render: (html) => {
        // Submit on enter key
        html.find('input[name="name"]').focus().keypress((e) => {
          if (e.which === 13) {
            const name = e.target.value.trim();
            html.closest('.dialog').find('.dialog-button.create').click();
          }
        });
      }
    }).render(true);
  });
}


