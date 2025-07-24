# Campaign Codex

A comprehensive campaign journal module for Foundry VTT and D&D 5e that helps GMs organize NPCs, world lore, and interconnected storytelling elements.

## Features

### NPC Journal Management
- **Drag & Drop Integration**: Drop any NPC actor directly into a journal entry
- **Relationship Tracking**: Connect NPCs with detailed relationship types and descriptions
- **Location Connections**: Link NPCs to locations with connection types (lives, works, owns, etc.)
- **Organized Sections**: History, current status, plot hooks, GM notes, and optional player notes
- **Actor Integration**: Direct links to actor sheets with quick stat display

### World Lore Database
- **Hierarchical Organization**: Categorize lore by Geography, History, Organizations, Culture, etc.
- **Cross-Referencing**: Link lore entries to NPCs and other journal entries
- **Tagging System**: Custom tags for easy searching and organization  
- **Player Visibility Control**: Toggle what information players can see
- **GM Tools**: Private notes, handout generation, and duplicate functionality

### Smart Linking System
- **Visual Connections**: See relationships between NPCs, locations, and lore at a glance
- **Drag & Drop Linking**: Intuitive interface for creating connections
- **Search & Link**: Find and connect existing entries easily
- **Backlink Tracking**: Know which entries reference each other

## Installation

1. In Foundry VTT, go to the **Add-on Modules** tab
2. Click **Install Module**
3. Paste the manifest URL: `[Your manifest URL here]`
4. Click **Install**
5. Enable the module in your world settings

## Quick Start Guide

### Creating an NPC Journal
1. **From Actor Directory**: Right-click any NPC actor → "Create NPC Journal Entry"
2. **From Journal Directory**: Right-click → "New NPC Journal"
3. **Manual Creation**: Create new journal entry and select "campaign-npc" type

### Building Relationships
1. Open an NPC journal
2. Go to the **Relationships** tab
3. Drag another NPC actor into the drop zone
4. Select relationship type and add description
5. The relationship is automatically added to both NPCs

### Connecting to Locations  
1. In the **Locations** tab of an NPC journal
2. Drag a journal entry into the drop zone
3. Select connection type (lives here, works here, etc.)
4. Add optional notes about the connection

### Creating World Lore
1. Right-click in Journal Directory → "New World Lore"
2. Choose appropriate category (Geography, History, etc.)
3. Add content in the **Content** tab
4. Link related entries in the **Connections** tab
5. Add tags in the **Organization** tab for easy searching

## Usage Tips

### For Game Masters
- Use **GM Notes** sections for secret information and future plot developments
- Toggle **Player Visible** to control what lore players can see
- Create plot hooks that connect NPCs to locations and world events
- Use tags to quickly find related lore entries during sessions

### For Players (if enabled)
- Add your own notes about NPCs you've met in the **Player Notes** section
- Reference connected locations to understand NPC relationships
- Use the search functionality to find information quickly

### Organization Best Practices
- **Consistent Tagging**: Use standardized tags like "Waterdeep", "Harper", "Act1"
- **Relationship Detail**: Add context to relationships beyond just the type
- **Location Hierarchy**: Organize locations from broad (kingdoms) to specific (taverns)
- **Plot Threading**: Use connections to weave storylines between NPCs and locations

## Module Settings

### Show Player Notes Section
- **Default**: False
- **Description**: Allows players to add their own notes to NPC entries
- **Use Case**: Great for collaborative worldbuilding and player agency

## Technical Details

### Compatibility
- **Foundry VTT**: Version 12+
- **Game System**: D&D 5e (required)
- **Dependencies**: None

### File Structure
```
campaign-codex/
├── module.json
├── scripts/
│   ├── main.js
│   ├── campaign-journal.js
│   ├── npc-journal-sheet.js
│   └── world-lore-sheet.js
├── templates/
│   ├── npc-journal-sheet.hbs
│   └── world-lore-sheet.hbs
├── styles/
│   └── campaign-codex.css
├── lang/
│   └── en.json
└── README.md
```

### Data Storage
- All data is stored in Foundry's journal entry flags
- NPC data stored under `campaign-codex.npcData`
- World lore data stored under `campaign-codex.loreData`
- Relationships and connections use unique IDs for referencing

## Troubleshooting

### Common Issues

**NPC not linking properly**
- Ensure the actor is of type "npc"
- Check that the actor exists and hasn't been deleted
- Try refreshing the journal sheet

**Drag & drop not working**
- Make sure you're dragging from the sidebar, not an open sheet
- Verify the sheet is in edit mode
- Check browser console for JavaScript errors

**Relationships not appearing**
- Confirm both NPCs have journal entries created
- Check that the relationship data was saved properly
- Try re-opening the journal sheet

**Search not finding entries**
- Verify the search term matches content in the entry
- Check that the entry type filter is set correctly
- Ensure the entry hasn't been deleted

### Performance Notes
- Large campaigns (500+ entries) may experience slower load times
- Consider organizing lore into separate compendiums for very large worlds
- Regular cleanup of unused entries improves performance

## Roadmap

### Planned Features
- **Visual Relationship Maps**: Graphical network view of NPC connections
- **Timeline Integration**: Link events to specific dates and timelines  
- **Import/Export Tools**: Share journal content between campaigns
- **Advanced Search**: Full-text search across all journal content
- **Template System**: Pre-built NPC and location templates
- **Encounter Integration**: Link encounters directly to NPCs and locations

### Community Contributions
We welcome contributions! Please see our GitHub repository for:
- Bug reports and feature requests  
- Code contributions and pull requests
- Translation help for additional languages
- Community-created templates and examples

## Support

For support, questions, or feature requests:
- **GitHub Issues**: [Your GitHub repo URL]
- **Discord**: #campaign-codex channel in [Discord server]
- **Foundry Community**: Tag @YourUsername in the Foundry Discord

## License

This module is released under the MIT License. See LICENSE file for details.

## Acknowledgments

- Thanks to the Foundry VTT community for inspiration and feedback
- Special thanks to contributors and beta testers
- Built with love for tabletop storytelling

---

*Campaign Codex - Organize your world, enhance your story.*
