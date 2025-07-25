import { CampaignManager } from './campaign-manager.js';
import { LocationSheet } from './sheets/location-sheet.js';
import { ShopSheet } from './sheets/shop-sheet.js';
import { NPCSheet } from './sheets/npc-sheet.js';
import { RegionSheet } from './sheets/region-sheet.js';

Hooks.once('init', async function() {
  console.log('Campaign Codex | Initializing v2.0 - Modular System');
  
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

  game.settings.register("campaign-codex", "useOrganizedFolders", {
    name: "Organize in Folders",
    hint: "Automatically create and organize Campaign Codex journals in folders",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  console.log('Campaign Codex | Sheets registered');
});

Hooks.once('ready', async function() {
  console.log('Campaign Codex | Ready');
  
  // Initialize the campaign manager
  game.campaignCodex = new CampaignManager();
  
  // Create organization folders if setting is enabled
  if (game.settings.get("campaign-codex", "useOrganizedFolders")) {
    await ensureCampaignCodexFolders();
  }
});

// Ensure Campaign Codex folders exist
async function ensureCampaignCodexFolders() {
  const folderNames = {
    "Campaign Codex - Locations": "location",
    "Campaign Codex - Shops": "shop", 
    "Campaign Codex - NPCs": "npc",
    "Campaign Codex - Regions": "region"
  };

  for (const [folderName, type] of Object.entries(folderNames)) {
    let folder = game.folders.find(f => f.name === folderName && f.type === "JournalEntry");
    
    if (!folder) {
      await Folder.create({
        name: folderName,
        type: "JournalEntry",
        color: getFolderColor(type),
        flags: {
          "campaign-codex": {
            type: type,
            autoOrganize: true
          }
        }
      });
      console.log(`Campaign Codex | Created folder: ${folderName}`);
    }
  }
}

function getFolderColor(type) {
  const colors = {
    location: "#28a745",
    shop: "#6f42c1", 
    npc: "#fd7e14",
    region: "#20c997"
  };
  return colors[type] || "#999999";
}

// Get appropriate folder for document type
function getCampaignCodexFolder(type) {
  if (!game.settings.get("campaign-codex", "useOrganizedFolders")) return null;
  
  const folderNames = {
    location: "Campaign Codex - Locations",
    shop: "Campaign Codex - Shops",
    npc: "Campaign Codex - NPCs", 
    region: "Campaign Codex - Regions"
  };
  
  const folderName = folderNames[type];
  return game.folders.find(f => f.name === folderName && f.type === "JournalEntry");
}

// Add context menu options to actors
Hooks.on('getActorDirectoryEntryContext', (html, options) => {
  options.push({
    name: "Create NPC Journal",
    icon: '<i class="fas fa-user"></i>',
    condition: li => {
      const actor = game.actors.get(li.data("documentId"));
      return actor && actor.type === "npc" && !game.journal.find(j => {
        const npcData = j.getFlag("campaign-codex", "data");
        return npcData && npcData.linkedActor === actor.id;
      });
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

  // Add world overview option
  options.unshift({
    name: "📋 Campaign Overview",
    icon: '<i class="fas fa-globe"></i>',
    callback: () => createCampaignOverview()
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

// Create campaign overview journal
async function createCampaignOverview() {
  const locations = game.journal.filter(j => j.getFlag("campaign-codex", "type") === "location");
  const shops = game.journal.filter(j => j.getFlag("campaign-codex", "type") === "shop");
  const npcs = game.journal.filter(j => j.getFlag("campaign-codex", "type") === "npc");
  const regions = game.journal.filter(j => j.getFlag("campaign-codex", "type") === "region");

  const content = `
    <h1>🌍 Campaign World Overview</h1>
    
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0;">
      <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #28a745;">
        <h3><i class="fas fa-map-marker-alt"></i> Locations (${locations.length})</h3>
        ${locations.map(l => `<p>📍 @UUID[${l.uuid}]{${l.name}}</p>`).join('')}
      </div>
      
      <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #6f42c1;">
        <h3><i class="fas fa-store"></i> Shops (${shops.length})</h3>
        ${shops.map(s => `<p>🏪 @UUID[${s.uuid}]{${s.name}}</p>`).join('')}
      </div>
      
      <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #fd7e14;">
        <h3><i class="fas fa-users"></i> NPCs (${npcs.length})</h3>
        ${npcs.map(n => `<p>👤 @UUID[${n.uuid}]{${n.name}}</p>`).join('')}
      </div>
      
      <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #20c997;">
        <h3><i class="fas fa-globe"></i> Regions (${regions.length})</h3>
        ${regions.map(r => `<p>🗺️ @UUID[${r.uuid}]{${r.name}}</p>`).join('')}
      </div>
    </div>
    
    <hr>
    <p><em>This overview is automatically generated and updates when you recreate it.</em></p>
  `;

  const journalData = {
    name: "📋 Campaign World Overview",
    pages: [{
      name: "Overview",
      type: "text",
      text: { content: content }
    }]
  };

  // Delete existing overview if it exists
  const existing = game.journal.find(j => j.name === "📋 Campaign World Overview");
  if (existing) await existing.delete();

  const overview = await JournalEntry.create(journalData);
  overview.sheet.render(true);
}

// Force correct sheet to open immediately upon creation
Hooks.on('createJournalEntry', async (document, options, userId) => {
  if (game.user.id !== userId) return;
  
  const journalType = document.getFlag("campaign-codex", "type");
  if (!journalType) return;

  // Move to appropriate folder
  const folder = getCampaignCodexFolder(journalType);
  if (folder) {
    await document.update({ folder: folder.id });
  }

  // Set the correct sheet type immediately
  let sheetClass = null;
  switch (journalType) {
    case "location":
      sheetClass = "campaign-codex.LocationSheet";
      break;
    case "shop":
      sheetClass = "campaign-codex.ShopSheet";
      break;
    case "npc":
      sheetClass = "campaign-codex.NPCSheet";
      break;
    case "region":
      sheetClass = "campaign-codex.RegionSheet";
      break;
  }

  if (sheetClass) {
    await document.update({
      "flags.core.sheetClass": sheetClass
    });
  }

  // Open the correct sheet
  setTimeout(() => {
    let targetSheet = null;

    switch (journalType) {
      case "location":
        targetSheet = LocationSheet;
        break;
      case "shop":
        targetSheet = ShopSheet;
        break;
      case "npc":
        targetSheet = NPCSheet;
        break;
      case "region":
        targetSheet = RegionSheet;
        break;
    }

    if (targetSheet) {
      if (document.sheet.rendered) {
        document.sheet.close();
      }
      const sheet = new targetSheet(document);
      sheet.render(true);
      document._campaignCodexSheet = sheet;
    }
  }, 100);
});

// Auto-select appropriate sheet based on flags for existing documents
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
      const sheet = new targetSheet(journal);
      sheet.render(true);
      journal._campaignCodexSheet = sheet;
    }, 100);
  }
});

// Campaign Codex creation buttons for Journal Directory
Hooks.on('renderJournalDirectory', (app, html, data) => {
  // Remove any existing button group to prevent duplicates
  html.find('.campaign-codex-buttons').remove();
  
  // Create the button container
  const buttonGroup = $(`
    <div class="campaign-codex-buttons" style="margin: 8px 0; display: flex; gap: 4px; flex-wrap: wrap;">
      <button class="create-location-btn" type="button" title="Create New Location" style="flex: 1; min-width: 0; padding: 4px 8px; font-size: 11px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">
        <i class="fas fa-map-marker-alt"></i> Location
      </button>
      <button class="create-shop-btn" type="button" title="Create New Shop" style="flex: 1; min-width: 0; padding: 4px 8px; font-size: 11px; background: #6f42c1; color: white; border: none; border-radius: 4px; cursor: pointer;">
        <i class="fas fa-store"></i> Shop
      </button>
      <button class="create-npc-btn" type="button" title="Create New NPC Journal" style="flex: 1; min-width: 0; padding: 4px 8px; font-size: 11px; background: #fd7e14; color: white; border: none; border-radius: 4px; cursor: pointer;">
        <i class="fas fa-user"></i> NPC
      </button>
      <button class="create-region-btn" type="button" title="Create New Region" style="flex: 1; min-width: 0; padding: 4px 8px; font-size: 11px; background: #20c997; color: white; border: none; border-radius: 4px; cursor: pointer;">
        <i class="fas fa-globe"></i> Region
      </button>
    </div>
  `);

  // Insert into the directory header
  const directoryHeader = html.find('.directory-header');
  directoryHeader.append(buttonGroup);

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

// Helper function to prompt for name
async function promptForName(type) {
  return new Promise((resolve) => {
    new Dialog({
      title: `Create New ${type}`,
      content: `
        <form class="flexcol">
          <div class="form-group">
            <label>Name:</label>
            <input type="text" name="name" placeholder="Enter ${type.toLowerCase()} name..." autofocus style="width: 100%;" />
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
        html.find('input[name="name"]').focus().keypress((e) => {
          if (e.which === 13) {
            html.closest('.dialog').find('.dialog-button.create button').click();
          }
        });
      }
    }).render(true);
  });
}

// Handle bidirectional relationship updates
Hooks.on('updateJournalEntry', async (document, changes, options, userId) => {
  if (game.user.id !== userId) return;
  
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

// Export folder management functions for use in campaign manager
window.getCampaignCodexFolder = getCampaignCodexFolder;