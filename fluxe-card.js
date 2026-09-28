window.customCards = window.customCards || [];
if (!window.customCards.some(c => c.type === 'fluxe-card')) {
  window.customCards.push({
    type: 'fluxe-card',
    name: 'Fluxe Card',
    preview: true,
    description: 'Ultra-clean, instant energy flow card with dynamic curves.'
  });
}

class FluxeCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._resizeObserver = null;
    this._showAll = undefined;
    this._renderedKey = null;
  }

  static getConfigElement() {
    return document.createElement('fluxe-card-editor');
  }

  static getStubConfig() {
    return {
      title: 'Instant Energy Flow',
      main_entity: 'sensor.power_meter',
      main_name: 'Grid',
      main_icon: 'mdi:transmission-tower',
      main_color: '#f97316',
      max_power: 3000,
      show_other: true,
      other_mode: 'difference',
      other_entity: '',
      default_view: 'active',
      show_toggle_button: true,
      devices: []
    };
  }

  setConfig(config) {
    this.config = config;
    if (this._showAll === undefined) {
      this._showAll = config.default_view === 'all';
    }
    this._renderedKey = null;
    if (this._hass) {
      this.render();
    }
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.config) return;

    if (!this._renderedKey) {
      this.render();
    } else {
      this.updateValues();
    }
  }

  connectedCallback() {
    if (!this._resizeObserver) {
      this._resizeObserver = new ResizeObserver(() => this.updateLines());
    }
    const card = this.shadowRoot.querySelector('.card');
    if (card) {
      this._resizeObserver.observe(card);
    }
  }

  disconnectedCallback() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
  }

  render() {
    if (!this.config || !this._hass) return;

    const hass = this._hass;
    const config = this.config;

    if (this._showAll === undefined) {
      this._showAll = config.default_view === 'all';
    }

    const mainEntity = hass.states[config.main_entity];
    const mainVal = mainEntity ? parseFloat(mainEntity.state) || 0 : 0;
    const mainTitle = config.main_name || 'Grid';
    const mainIcon = config.main_icon || 'mdi:transmission-tower';
    const mainColor = config.main_color || '#f97316';

    const formatPower = (val) => {
      if (val >= 1000) return (val / 1000).toFixed(2) + ' kW';
      return Math.round(val) + ' W';
    };

    let monitoredSum = 0;
    const monitoredDevices = (config.devices || [])
      .filter(dev => dev && dev.entity)
      .map(dev => {
        const stateObj = hass.states[dev.entity];
        const val = stateObj ? parseFloat(stateObj.state) || 0 : 0;
        monitoredSum += val;
        
        const name = dev.name || (stateObj && stateObj.attributes && stateObj.attributes.friendly_name) || dev.entity;
        const icon = dev.icon || (stateObj && stateObj.attributes && stateObj.attributes.icon) || 'mdi:flash';
        const color = dev.color || '#38bdf8';

        return {
          ...dev,
          name: name,
          val: val,
          formatted: formatPower(val),
          color: color,
          icon: icon,
          isOther: false
        };
      })
      .sort((a, b) => b.val - a.val);

    let allDevices = [...monitoredDevices];

    const showOther = config.show_other !== false;
    if (showOther) {
      let altroVal = 0;
      const otherMode = config.other_mode || 'difference';

      if (otherMode === 'entity' && config.other_entity) {
        const otherStateObj = hass.states[config.other_entity];
        altroVal = otherStateObj ? parseFloat(otherStateObj.state) || 0 : 0;
      } else {
        altroVal = Math.max(0, mainVal - monitoredSum);
      }

      const altroDev = {
        entity: config.other_entity || null,
        name: config.other_name || 'Other / Unmonitored',
        val: altroVal,
        formatted: formatPower(altroVal),
        color: config.other_color || '#64748b',
        icon: config.other_icon || 'mdi:dots-horizontal-circle-outline',
        isOther: true
      };

      allDevices.push(altroDev);
    }

    this._devices = this._showAll 
      ? allDevices 
      : allDevices.filter(dev => dev.val > 2);

    this._renderedKey = this._devices.map(d => d.entity + d.name).join('|') + '|' + this._showAll;

    const deviceHeight = 70;
    const minCardHeight = Math.max(200, this._devices.length * deviceHeight);

    let pillsHtml = '';
    if (this._devices.length === 0) {
      pillsHtml = `
        <div style="color: #64748b; font-size: 13px; text-align: center; padding: 20px 0;">
          No active loads
        </div>
      `;
    } else {
      this._devices.forEach((dev) => {
        const isOther = dev.isOther;
        const canClick = !isOther || (isOther && dev.entity);
        pillsHtml += `
          <div class="pill-wrapper">
            <div class="pill ${canClick ? 'clickable' : ''} ${isOther ? 'pill-other' : ''}" 
                 ${canClick ? `data-entity="${dev.entity}"` : ''} 
                 style="--pill-color: ${dev.color}; opacity: ${isOther ? 0.7 : (dev.val > 2 ? 1 : 0.5)};">
              <div class="pill-icon">
                <ha-icon icon="${dev.icon}"></ha-icon>
              </div>
              <div class="pill-info">
                <span class="pill-name">${dev.name}</span>
                <span class="pill-val">${dev.formatted}</span>
              </div>
            </div>
          </div>
        `;
      });
    }

    const toggleIcon = this._showAll ? 'mdi:eye-off' : 'mdi:eye';
    const toggleText = this._showAll ? 'Active only' : 'Show all';
    const showToggleButton = config.show_toggle_button !== false;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        .card {
          background: #0f172a;
          border-radius: 20px;
          padding: 16px 20px;
          color: #fff;
          font-family: system-ui, -apple-system, sans-serif;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
          position: relative;
          overflow: hidden;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .title {
          font-size: 15px;
          font-weight: 600;
          color: #94a3b8;
        }
        .toggle-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 500;
          color: #94a3b8;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          padding: 4px 10px;
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          user-select: none;
        }
        .toggle-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          color: #f8fafc;
          border-color: rgba(255, 255, 255, 0.25);
        }
        .toggle-btn ha-icon {
          --mdc-icon-size: 14px;
        }
        .layout {
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
          min-height: ${minCardHeight}px;
          gap: 15px;
        }

        .main-node {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          border: 3px solid ${mainColor};
          background: #0f172a;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 2;
          cursor: pointer;
          box-shadow: 0 0 20px ${mainColor}4d;
          transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.25s ease;
          flex-shrink: 0;
        }
        .main-node:hover {
          transform: scale(1.08);
          box-shadow: 0 0 28px ${mainColor};
          background: #1e293b;
        }
        .main-node * {
          pointer-events: none;
        }

        .main-node ha-icon {
          --mdc-icon-size: 26px;
          color: ${mainColor};
        }
        .main-val {
          font-size: 14px;
          font-weight: 700;
          margin-top: 2px;
        }
        .main-title {
          font-size: 10px;
          color: #94a3b8;
        }

        .pills-container {
          display: flex;
          flex-direction: column;
          justify-content: space-around;
          min-height: ${minCardHeight}px;
          z-index: 2;
          width: max-content;
          min-width: 150px;
          gap: 16px;
        }
        .pill-wrapper {
          display: flex;
          align-items: center;
          width: 100%;
        }

        .pill {
          width: 100%;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 14px;
          border-radius: 25px;
          background: #1e293b;
          border: 2px solid var(--pill-color);
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.25s ease, opacity 0.3s ease;
        }
        .pill.clickable {
          cursor: pointer;
        }
        .pill.clickable:hover {
          transform: translateX(-6px);
          box-shadow: 0 0 18px var(--pill-color);
          background: #334155;
        }
        .pill * {
          pointer-events: none;
        }

        .pill.pill-other {
          border-style: dashed;
          background: rgba(15, 23, 42, 0.7);
        }
        .pill-icon {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .pill-icon ha-icon {
          --mdc-icon-size: 16px;
          color: var(--pill-color);
        }
        .pill-info {
          display: flex;
          flex-direction: column;
          white-space: nowrap;
        }
        .pill-name {
          font-size: 12px;
          font-weight: 600;
          color: #f8fafc;
        }
        .pill-val {
          font-size: 11px;
          color: #94a3b8;
        }
        svg.connections {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
          pointer-events: none;
        }
      </style>

      <div class="card">
        <div class="header">
          <span class="title">${config.title || 'Energy Flow'}</span>
          ${showToggleButton ? `
            <div class="toggle-btn">
              <ha-icon icon="${toggleIcon}"></ha-icon>
              <span>${toggleText}</span>
            </div>
          ` : ''}
        </div>
        <div class="layout">
          <div class="main-node clickable" data-entity="${config.main_entity}">
            <ha-icon icon="${mainIcon}"></ha-icon>
            <span class="main-val">${formatPower(mainVal)}</span>
            <span class="main-title">${mainTitle}</span>
          </div>

          <svg class="connections"></svg>

          <div class="pills-container">
            ${pillsHtml}
          </div>
        </div>
      </div>
    `;

    if (showToggleButton) {
      const toggleBtn = this.shadowRoot.querySelector('.toggle-btn');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this._showAll = !this._showAll;
          this._renderedKey = null;
          this.render();
        });
      }
    }

    this.shadowRoot.querySelectorAll('.clickable').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const entityId = el.getAttribute('data-entity');
        if (entityId) {
          const event = new CustomEvent('hass-more-info', {
            detail: { entityId: entityId },
            bubbles: true,
            composed: true
          });
          this.dispatchEvent(event);
        }
      });
    });

    if (this._resizeObserver) {
      const card = this.shadowRoot.querySelector('.card');
      if (card) this._resizeObserver.observe(card);
    }

    requestAnimationFrame(() => this.updateLines());
  }

  updateValues() {
    if (!this.shadowRoot || !this.config || !this._hass) return;

    const hass = this._hass;
    const config = this.config;

    const mainEntity = hass.states[config.main_entity];
    const mainVal = mainEntity ? parseFloat(mainEntity.state) || 0 : 0;

    const formatPower = (val) => {
      if (val >= 1000) return (val / 1000).toFixed(2) + ' kW';
      return Math.round(val) + ' W';
    };

    let monitoredSum = 0;
    const monitoredDevices = (config.devices || [])
      .filter(dev => dev && dev.entity)
      .map(dev => {
        const stateObj = hass.states[dev.entity];
        const val = stateObj ? parseFloat(stateObj.state) || 0 : 0;
        monitoredSum += val;
        
        const name = dev.name || (stateObj && stateObj.attributes && stateObj.attributes.friendly_name) || dev.entity;
        const icon = dev.icon || (stateObj && stateObj.attributes && stateObj.attributes.icon) || 'mdi:flash';
        const color = dev.color || '#38bdf8';

        return {
          ...dev,
          name: name,
          val: val,
          formatted: formatPower(val),
          color: color,
          icon: icon,
          isOther: false
        };
      })
      .sort((a, b) => b.val - a.val);

    let allDevices = [...monitoredDevices];

    const showOther = config.show_other !== false;
    if (showOther) {
      let altroVal = 0;
      const otherMode = config.other_mode || 'difference';

      if (otherMode === 'entity' && config.other_entity) {
        const otherStateObj = hass.states[config.other_entity];
        altroVal = otherStateObj ? parseFloat(otherStateObj.state) || 0 : 0;
      } else {
        altroVal = Math.max(0, mainVal - monitoredSum);
      }

      const altroDev = {
        entity: config.other_entity || null,
        name: config.other_name || 'Other / Unmonitored',
        val: altroVal,
        formatted: formatPower(altroVal),
        color: config.other_color || '#64748b',
        icon: config.other_icon || 'mdi:dots-horizontal-circle-outline',
        isOther: true
      };

      allDevices.push(altroDev);
    }

    const newDevices = this._showAll 
      ? allDevices 
      : allDevices.filter(dev => dev.val > 2);

    const newKey = newDevices.map(d => d.entity + d.name).join('|') + '|' + this._showAll;

    if (this._renderedKey !== newKey) {
      this.render();
      return;
    }

    this._devices = newDevices;

    const mainValEl = this.shadowRoot.querySelector('.main-val');
    if (mainValEl) mainValEl.textContent = formatPower(mainVal);

    const pillValEls = this.shadowRoot.querySelectorAll('.pill-val');
    this._devices.forEach((dev, index) => {
      if (pillValEls[index]) {
        pillValEls[index].textContent = dev.formatted;
      }
    });

    this.updateLines();
  }

  updateLines() {
    if (!this.shadowRoot || !this._devices) return;

    const layout = this.shadowRoot.querySelector('.layout');
    const mainNode = this.shadowRoot.querySelector('.main-node');
    const pills = this.shadowRoot.querySelectorAll('.pill');
    const svg = this.shadowRoot.querySelector('svg.connections');

    if (!layout || !mainNode || !svg) return;

    const getLayoutOffset = (el) => {
      let left = 0;
      let top = 0;
      let curr = el;
      while (curr && curr !== layout) {
        left += curr.offsetLeft;
        top += curr.offsetTop;
        curr = curr.offsetParent;
      }
      return { left, top, width: el.offsetWidth, height: el.offsetHeight };
    };

    const mainOffset = getLayoutOffset(mainNode);
    const startX = mainOffset.left + mainOffset.width;
    const startY = mainOffset.top + (mainOffset.height / 2);

    const maxExpected = this.config.max_power || 3000;
    let pathsHtml = '';

    pills.forEach((pill, i) => {
      const dev = this._devices[i];
      if (!dev) return;

      const pillOffset = getLayoutOffset(pill);
      const endX = pillOffset.left;
      const targetY = pillOffset.top + (pillOffset.height / 2);

      const minThickness = 2;
      const maxThickness = 20;
      let thickness = minThickness;
      if (dev.val > 0) {
        thickness = Math.max(minThickness, Math.min(maxThickness, (dev.val / maxExpected) * maxThickness));
      }

      const isDashed = dev.isOther ? 'stroke-dasharray="5 5"' : '';
      const opacity = dev.isOther ? '0.45' : (dev.val > 2 ? '0.85' : '0.25');

      const deltaX = Math.max(25, (endX - startX) * 0.45);
      const path = `M ${startX} ${startY} C ${startX + deltaX} ${startY}, ${endX - deltaX} ${targetY}, ${endX} ${targetY}`;

      pathsHtml += `
        <path d="${path}" 
              stroke="${dev.color}" 
              stroke-width="${thickness}" 
              fill="none" 
              stroke-linecap="round"
              ${isDashed}
              opacity="${opacity}" 
              style="transition: stroke-width 0.4s ease, opacity 0.4s ease;" />
      `;
    });

    const layoutWidth = layout.offsetWidth;
    const layoutHeight = layout.offsetHeight;
    svg.setAttribute('viewBox', `0 0 ${layoutWidth} ${layoutHeight}`);
    svg.innerHTML = pathsHtml;
  }
}

class FluxeCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._editingIndex = null;
    this._isInternalChange = false;
  }

  setConfig(config) {
    this._config = config;
    if (this._isInternalChange) {
      this._isInternalChange = false;
      return;
    }
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    const forms = this.shadowRoot.querySelectorAll('ha-form');
    if (forms.length > 0) {
      forms.forEach(f => { f.hass = hass; });
      return;
    }
    this.render();
  }

  render() {
    if (!this._config || !this._hass) return;

    if (!Array.isArray(this._config.devices)) {
      this._config.devices = [];
    }

    let globalForm = this.shadowRoot.querySelector('#global-form');
    let listContainer = this.shadowRoot.querySelector('#device-list');
    let addForm = this.shadowRoot.querySelector('#add-form');

    if (!globalForm) {
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            padding: 10px 0;
          }
          .section-title {
            font-weight: 600;
            font-size: 15px;
            color: var(--primary-text-color, #fff);
            margin: 24px 0 12px 0;
            padding-bottom: 6px;
            border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
          }
          .device-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .device-row {
            background: var(--card-background-color, rgba(255, 255, 255, 0.04));
            border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
            border-radius: 8px;
            overflow: hidden;
          }
          .device-row-main {
            display: flex;
            align-items: center;
            padding: 10px 12px;
            gap: 12px;
          }
          .device-icon {
            color: var(--secondary-text-color, #94a3b8);
            display: flex;
            align-items: center;
          }
          .device-info {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }
          .device-title {
            font-size: 14px;
            font-weight: 500;
            color: var(--primary-text-color, #fff);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .device-subtitle {
            font-size: 12px;
            color: var(--secondary-text-color, #94a3b8);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .device-actions {
            display: flex;
            align-items: center;
            gap: 4px;
          }
          .action-btn {
            background: transparent;
            border: none;
            color: var(--secondary-text-color, #94a3b8);
            cursor: pointer;
            padding: 6px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s, color 0.2s;
          }
          .action-btn:hover {
            background: rgba(255, 255, 255, 0.08);
            color: var(--primary-text-color, #fff);
          }
          .device-edit-form {
            padding: 12px;
            background: rgba(0, 0, 0, 0.15);
            border-top: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
          }
          .add-picker-wrapper {
            margin-top: 12px;
          }
        </style>

        <ha-form id="global-form"></ha-form>

        <div class="section-title">⚡ Monitored Devices / Loads</div>
        <div class="device-list" id="device-list"></div>

        <div class="add-picker-wrapper">
          <ha-form id="add-form"></ha-form>
        </div>
      `;

      globalForm = this.shadowRoot.querySelector('#global-form');
      listContainer = this.shadowRoot.querySelector('#device-list');
      addForm = this.shadowRoot.querySelector('#add-form');

      globalForm.addEventListener('value-changed', (e) => {
        e.stopPropagation();
        this._fireConfigChanged({ ...this._config, ...e.detail.value }, true);
      });

      addForm.addEventListener('value-changed', (e) => {
        e.stopPropagation();
        const selectedEntity = e.detail.value.add_entity;
        if (selectedEntity) {
          const stateObj = this._hass.states[selectedEntity];
          const friendlyName = stateObj?.attributes?.friendly_name || '';
          const newDev = {
            entity: selectedEntity,
            name: friendlyName,
            icon: stateObj?.attributes?.icon || 'mdi:flash',
            color: '#38bdf8'
          };
          const updated = [...(this._config.devices || []), newDev];
          addForm.data = { add_entity: '' };
          this._fireConfigChanged({ ...this._config, devices: updated }, false);
        }
      });
    }

    const showOther = this._config.show_other !== false;
    const otherMode = this._config.other_mode || 'difference';

    const globalSchema = [
      { name: 'title', label: 'Card Title', selector: { text: {} } },
      { name: 'main_entity', label: 'Main Meter Entity', selector: { entity: { domain: 'sensor' } } },
      { name: 'main_name', label: 'Main Meter Label', selector: { text: {} } },
      { name: 'main_icon', label: 'Main Meter Icon', selector: { icon: {} } },
      { name: 'main_color', label: 'Main Meter Color (HEX e.g. #f97316)', selector: { text: {} } },
      { name: 'max_power', label: 'Max Power for line scaling (Watts)', selector: { number: { min: 500, max: 15000, step: 100, mode: 'box' } } },
      { name: 'default_view', label: 'Default View', selector: { select: { mode: 'dropdown', options: [{ value: 'active', label: 'Active only (Consumption > 2W)' }, { value: 'all', label: 'Show all' }] } } },
      { name: 'show_toggle_button', label: 'Show view toggle button', selector: { boolean: {} } },
      { name: 'show_other', label: 'Show "Other / Unmonitored" chip', selector: { boolean: {} } }
    ];

    if (showOther) {
      globalSchema.push({
        name: 'other_mode',
        label: 'Calculate "Other" value',
        selector: { select: { mode: 'dropdown', options: [{ value: 'difference', label: 'Automatic difference (Total - Monitored)' }, { value: 'entity', label: 'Specific entity' }] } }
      });
      if (otherMode === 'entity') {
        globalSchema.push({
          name: 'other_entity',
          label: 'Entity for "Other"',
          selector: { entity: { domain: 'sensor' } }
        });
      }
    }

    globalForm.hass = this._hass;
    globalForm.data = this._config;
    globalForm.schema = globalSchema;
    globalForm.computeLabel = (item) => item.label || item.name;

    listContainer.innerHTML = '';
    this._config.devices.forEach((dev, index) => {
      const stateObj = this._hass.states[dev.entity];
      const friendlyName = stateObj?.attributes?.friendly_name || '';
      const displayName = dev.name || friendlyName || dev.entity || 'Unnamed';
      const displaySub = dev.name && friendlyName ? `${friendlyName} (${dev.entity})` : dev.entity;
      const displayIcon = dev.icon || stateObj?.attributes?.icon || 'mdi:flash';

      const isEditing = this._editingIndex === index;

      const row = document.createElement('div');
      row.className = 'device-row';
      row.innerHTML = `
        <div class="device-row-main">
          <div class="device-icon">
            <ha-icon icon="${displayIcon}" style="${dev.color ? `color: ${dev.color};` : ''}"></ha-icon>
          </div>
          <div class="device-info">
            <div class="device-title">${displayName}</div>
            <div class="device-subtitle">${displaySub}</div>
          </div>
          <div class="device-actions">
            <button class="action-btn btn-delete" title="Delete">
              <ha-icon icon="mdi:close"></ha-icon>
            </button>
            <button class="action-btn btn-edit" title="Edit">
              <ha-icon icon="${isEditing ? 'mdi:chevron-up' : 'mdi:pencil'}"></ha-icon>
            </button>
          </div>
        </div>
        ${isEditing ? `<div class="device-edit-form"><ha-form id="edit-form-${index}"></ha-form></div>` : ''}
      `;

      row.querySelector('.btn-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        const updated = this._config.devices.filter((_, i) => i !== index);
        if (this._editingIndex === index) this._editingIndex = null;
        this._fireConfigChanged({ ...this._config, devices: updated }, false);
      });

      row.querySelector('.btn-edit').addEventListener('click', (e) => {
        e.stopPropagation();
        this._editingIndex = isEditing ? null : index;
        this._isInternalChange = false;
        this.render();
      });

      if (isEditing) {
        const editForm = row.querySelector(`#edit-form-${index}`);
        editForm.hass = this._hass;
        editForm.data = dev;
        editForm.schema = [
          { name: 'name', label: 'Custom Name', selector: { text: {} } },
          { name: 'icon', label: 'Icon', selector: { icon: {} } },
          { name: 'color', label: 'Color (HEX e.g. #3498db)', selector: { text: {} } }
        ];
        editForm.computeLabel = (item) => item.label || item.name;
        editForm.addEventListener('value-changed', (e) => {
          e.stopPropagation();
          const updated = [...this._config.devices];
          updated[index] = { ...updated[index], ...e.detail.value };
          this._fireConfigChanged({ ...this._config, devices: updated }, true);
        });
      }

      listContainer.appendChild(row);
    });

    addForm.hass = this._hass;
    addForm.data = { add_entity: '' };
    addForm.schema = [
      {
        name: 'add_entity',
        label: 'Select an entity',
        selector: { entity: { domain: 'sensor' } }
      }
    ];
    addForm.computeLabel = (item) => item.label || item.name;
  }

  _fireConfigChanged(newConfig, isInternal = true) {
    this._config = newConfig;
    this._isInternalChange = isInternal;
    const event = new CustomEvent('config-changed', {
      detail: { config: newConfig },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }
}

customElements.define('fluxe-card', FluxeCard);
customElements.define('fluxe-card-editor', FluxeCardEditor);
