// Template component system for Campaign Codex
export class TemplateComponents {
  
  // Standard form section
  static formSection(label, icon, name, placeholder, value = "", rows = 4) {
    return `
      <div class="form-section">
        <label class="form-label">
          <i class="${icon}"></i>
          ${label}
        </label>
        <textarea name="${name}" class="form-textarea" rows="${rows}" placeholder="${placeholder}">${value}</textarea>
      </div>
    `;
  }

  // Drop zone component
  static dropZone(type, icon, title, description) {
    return `
      <div class="drop-zone" data-drop-type="${type}">
        <div class="drop-content">
          <i class="${icon}"></i>
          <h3>${title}</h3>
          <p>${description}</p>
        </div>
      </div>
    `;
  }

  // Entity grid component
  static entityGrid(entities, type, showActorButton = false) {
    if (!entities || entities.length === 0) {
      return this.emptyState(type);
    }

    return `
      <div class="entity-grid">
        ${entities.map(entity => this.entityCard(entity, type, showActorButton)).join('')}
      </div>
    `;
  }

  // Individual entity card
  static entityCard(entity, type, showActorButton = false) {
    const actorButton = showActorButton && entity.actor ? `
      <button type="button" class="action-btn open-actor" data-actor-id="${entity.actor.id}" title="Open Actor Sheet">
        <i class="fas fa-user"></i>
      </button>
    ` : '';

    return `
      <div class="entity-card ${type}-card">
        <div class="entity-image">
          <img src="${entity.img}" alt="${entity.name}">
        </div>
        <div class="entity-content">
          <h4 class="entity-name">${entity.name}</h4>
          <div class="entity-meta">
            ${entity.meta || `<span class="entity-type">${type}</span>`}
          </div>
          ${entity.locations ? `
            <div class="entity-locations">
              <i class="fas fa-map-marker-alt"></i>
              ${entity.locations.map(loc => `<span class="location-tag">${loc}</span>`).join('')}
            </div>
          ` : ''}
        </div>
        <div class="entity-actions">
          <button type="button" class="action-btn open-${type}" data-${type}-id="${entity.id}" title="Open ${type}">
            <i class="fas fa-external-link-alt"></i>
          </button>
          ${actorButton}
          <button type="button" class="action-btn remove-${type}" data-${type}-id="${entity.id}" title="Remove ${type}">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    `;
  }

  // Empty state component
  static emptyState(type) {
    const icons = {
      location: 'fas fa-map-marker-alt',
      shop: 'fas fa-store',
      npc: 'fas fa-users',
      associate: 'fas fa-users',
      item: 'fas fa-boxes'
    };

    const messages = {
      location: 'No Locations',
      shop: 'No Shops', 
      npc: 'No NPCs',
      associate: 'No Associates',
      item: 'No Items'
    };

    const descriptions = {
      location: 'Drag location journals here to add them',
      shop: 'Drag shop journals here to add them',
      npc: 'Drag NPCs here to add them',
      associate: 'Drag NPCs here to create relationships',
      item: 'Drag items here to add to inventory'
    };

    return `
      <div class="empty-state">
        <i class="${icons[type] || 'fas fa-question'}"></i>
        <h3>${messages[type] || 'No Items'}</h3>
        <p>${descriptions[type] || 'Drag items here'}</p>
      </div>
    `;
  }

  // Content header with optional button
  static contentHeader(icon, title, button = null) {
    return `
      <div class="content-header">
        <h2><i class="${icon}"></i> ${title}</h2>
        ${button || ''}
      </div>
    `;
  }

  // Actor link card component
  static actorLinkCard(actor, showActions = true) {
    const actions = showActions ? `
      <div class="actor-actions">
        <button type="button" class="action-btn open-actor" data-actor-id="${actor.id}" title="Open Actor Sheet">
          <i class="fas fa-external-link-alt"></i>
        </button>
        <button type="button" class="action-btn remove-actor" title="Unlink Actor">
          <i class="fas fa-unlink"></i>
        </button>
      </div>
    ` : '';

    return `
      <div class="linked-actor-card">
        <div class="actor-image">
          <img src="${actor.img}" alt="${actor.name}">
        </div>
        <div class="actor-content">
          <h4 class="actor-name">${actor.name}</h4>
          <div class="actor-details">
            <span class="actor-race-class">${actor.race} ${actor.class}</span>
            <span class="actor-level">Level ${actor.level}</span>
          </div>
          <div class="actor-stats-grid">
            <div class="stat-item">
              <span class="stat-label">AC</span>
              <span class="stat-value">${actor.ac}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">HP</span>
              <span class="stat-value">${actor.hp.value}/${actor.hp.max}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Speed</span>
              <span class="stat-value">${actor.speed} ft</span>
            </div>
          </div>
        </div>
        ${actions}
      </div>
    `;
  }

  // Shop inventory table
  static inventoryTable(inventory) {
    if (!inventory || inventory.length === 0) {
      return this.emptyState('item');
    }

    return `
      <div class="inventory-table">
        <div class="table-header">
          <div>Image</div>
          <div>Item Name</div>
          <div>Base Price</div>
          <div>Quantity</div>
          <div>Final Price</div>
          <div>Actions</div>
        </div>
        ${inventory.map(item => `
          <div class="inventory-item">
            <div class="item-image">
              <img src="${item.img}" alt="${item.name}">
            </div>
            <div class="item-details">
              <div class="item-name">${item.name}</div>
              ${item.weight ? `<div class="item-weight">${item.weight} lbs</div>` : ''}
            </div>
            <div class="item-base-price">
              ${item.basePrice} ${item.currency}
            </div>
            <div class="quantity-control">
              <button type="button" class="quantity-btn quantity-decrease" data-item-id="${item.itemId}">
                <i class="fas fa-minus"></i>
              </button>
              <input type="number" class="quantity-input" data-item-id="${item.itemId}" value="${item.quantity}" min="0">
              <button type="button" class="quantity-btn quantity-increase" data-item-id="${item.itemId}">
                <i class="fas fa-plus"></i>
              </button>
            </div>
            <div class="item-final-price">
              <input type="number" class="price-input" data-item-id="${item.itemId}" value="${item.finalPrice}" step="0.01" min="0">
              <span class="price-currency">${item.currency}</span>
            </div>
            <div class="item-actions">
              <button type="button" class="action-btn open-item" data-item-id="${item.itemId}" title="Open Item">
                <i class="fas fa-external-link-alt"></i>
              </button>
              <button type="button" class="action-btn remove-item" data-item-id="${item.itemId}" title="Remove Item">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Markup control component
  static markupControl(markup) {
    return `
      <div class="markup-control">
        <h3><i class="fas fa-percentage"></i> Global Price Markup</h3>
        <div class="markup-input-group">
          <input type="number" class="markup-input" value="${markup}" min="0" max="10" step="0.1">
          <span class="markup-label">x base price</span>
        </div>
        <p class="markup-help">Items without custom prices will use base price × markup</p>
      </div>
    `;
  }

  // Info banner component
  static infoBanner(message) {
    return `
      <div class="info-banner">
        <i class="fas fa-info-circle"></i>
        <p>${message}</p>
      </div>
    `;
  }
}