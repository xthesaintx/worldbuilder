export class CleanUp {
  constructor() {
    this.setupHooks();
  }

  setupHooks() {
    // Cleanup relationships when documents are deleted
    Hooks.on('preDeleteJournalEntry', async (document, options, userId) => {
      // Mark document as pending deletion to prevent cleanup loops
      document._pendingDeletion = true;
      
      const type = document.getFlag("campaign-codex", "type");
      if (!type) return;

      try {
        await game.campaignCodex.cleanupRelationships(document, type);
      } catch (error) {
        console.warn(`Campaign Codex | Cleanup failed for ${document.name}:`, error);
        // Don't throw - allow deletion to proceed
      }
    });

    // Cleanup actor relationships when actors are deleted
    Hooks.on('preDeleteActor', async (document, options, userId) => {
      try {
        await game.campaignCodex.cleanupActorRelationships(document);
      } catch (error) {
        console.warn(`Campaign Codex | Actor cleanup failed for ${document.name}:`, error);
      }
    Hooks.on('deleteJournalEntry', async (document, options, userId) => {
      const type = document.getFlag("campaign-codex", "type");
      if (!type) return;

      // Close any open Campaign Codex sheets for this document
      for (const app of Object.values(ui.windows)) {
        if (app.document && app.document.id === document.id) {
          const isCampaignCodexSheet = [
            'LocationSheet', 'ShopSheet', 'NPCSheet', 'RegionSheet'
          ].includes(app.constructor.name);
          
          if (isCampaignCodexSheet) {
            app._forceClose = true;
            await app.close();
          }
        }
      }
});

  
}


