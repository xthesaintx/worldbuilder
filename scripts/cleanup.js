export class TemplateComponents {

  // Cleanup relationships when documents are deleted
  Hooks.on('preDeleteJournalEntry', async (document, options, userId) => {
    const type = document.getFlag("campaign-codex", "type");
    if (!type) return;

    try {
      await game.campaignCodex.cleanupRelationships(document, type);
    } catch (error) {
      console.warn(`Campaign Codex | Cleanup failed for ${document.name}:`, error);
      // Don't throw - allow deletion to proceed
    }
  });

  Hooks.on('preDeleteJournalEntry', async (document, options, userId) => {
    // Mark document as pending deletion to prevent cleanup loops
    document._pendingDeletion = true;
    
    const type = document.getFlag("campaign-codex", "type");
    if (!type) return;

    try {
      await game.campaignCodex.cleanupRelationships(document, type);
    } catch (error) {
      console.warn(`Campaign Codex | Cleanup failed for ${document.name}:`, error);
    }
  });

  async cleanupRelationships(document, type) {
    console.log(`Campaign Codex | Cleaning up relationships for ${type}: ${document.name}`);
    
    // Get all related document IDs before we start cleanup
    const data = document.getFlag("campaign-codex", "data") || {};
    const relatedIds = this._getAllRelatedIds(data, type);
    
    // Filter out documents that still exist
    const validIds = relatedIds.filter(id => {
      const doc = game.journal.get(id) || game.actors.get(id);
      return doc && !doc._pendingDeletion; // Check if not pending deletion
    });
    
    // Process cleanup in batches to avoid race conditions
    await this._processBatchCleanup(document.id, validIds, type);
  }

  _getAllRelatedIds(data, type) {
    const ids = [];
    
    // Collect all possible relationship IDs based on type
    switch (type) {
      case "location":
        ids.push(...(data.linkedNPCs || []));
        ids.push(...(data.linkedShops || []));
        break;
      case "shop":
        ids.push(...(data.linkedNPCs || []));
        if (data.linkedLocation) ids.push(data.linkedLocation);
        break;
      case "npc":
        ids.push(...(data.linkedLocations || []));
        ids.push(...(data.linkedShops || [])); 
        ids.push(...(data.associates || []));
        if (data.linkedActor) ids.push(data.linkedActor);
        break;
      case "region":
        ids.push(...(data.linkedLocations || []));
        break;
    }
    
    return [...new Set(ids)]; // Remove duplicates
  }

  async _processBatchCleanup(deletedId, relatedIds, type) {
    const batchSize = 5; // Process in small batches
    
    for (let i = 0; i < relatedIds.length; i += batchSize) {
      const batch = relatedIds.slice(i, i + batchSize);
      
      await Promise.allSettled(
        batch.map(id => this._cleanupSingleRelationship(deletedId, id, type))
      );
      
      // Small delay between batches to prevent overwhelming the system
      if (i + batchSize < relatedIds.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
  }

  async _cleanupSingleRelationship(deletedId, relatedId, deletedType) {
    try {
      const relatedDoc = game.journal.get(relatedId) || game.actors.get(relatedId);
      
      if (!relatedDoc || relatedDoc._pendingDeletion) {
        return; // Skip if document doesn't exist or is being deleted
      }
      
      // Only update journals (actors don't need cleanup)
      if (relatedDoc.documentName !== "JournalEntry") return;
      
      const relatedData = relatedDoc.getFlag("campaign-codex", "data") || {};
      let needsUpdate = false;
      const updates = { ...relatedData };
      
      // Remove the deleted document's ID from all relevant arrays
      for (const [key, value] of Object.entries(updates)) {
        if (Array.isArray(value) && value.includes(deletedId)) {
          updates[key] = value.filter(id => id !== deletedId);
          needsUpdate = true;
        } else if (value === deletedId) {
          updates[key] = null;
          needsUpdate = true;
        }
      }
      
      if (needsUpdate) {
        await relatedDoc.setFlag("campaign-codex", "data", updates);
        console.log(`Campaign Codex | Cleaned up ${relatedDoc.name}`);
      }
      
    } catch (error) {
      console.warn(`Campaign Codex | Failed to cleanup relationship with ${relatedId}:`, error);
      // Continue processing other relationships
    }
  }


}