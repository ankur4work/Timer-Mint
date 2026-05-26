(function() {
  'use strict';

  // ============================================================================
  // STORAGE KEYS
  // ============================================================================
  const STORAGE_KEYS = {
    CLOSED: 'timer_mint_timer_closed',
    IMPRESSIONS: 'timer_mint_timer_impressions',
    EVERGREEN_PREFIX: 'timer_mint_evergreen_',
    CART_PREFIX: 'timer_mint_cart_',
  };

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Generate a visitor ID for evergreen timer persistence
   */
  function getVisitorId() {
    const key = 'timer_mint_visitor_id';
    let visitorId = null;
    try {
      visitorId = localStorage.getItem(key);
      if (!visitorId) {
        visitorId = 'v_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem(key, visitorId);
      }
    } catch (e) {
      visitorId = 'v_' + Math.random().toString(36).substring(2, 15);
    }
    return visitorId;
  }

  /**
   * Safely get from localStorage
   */
  function safeGetStorage(key, defaultValue = null) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  }

  /**
   * Safely set to localStorage
   */
  function safeSetStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Safely get from sessionStorage
   */
  function safeGetSession(key, defaultValue = null) {
    try {
      const value = sessionStorage.getItem(key);
      return value ? JSON.parse(value) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  }

  /**
   * Safely set to sessionStorage
   */
  function safeSetSession(key, value) {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Pad number with zero
   */
  function padZero(num) {
    return num.toString().padStart(2, '0');
  }

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Get current time in a specific timezone
   */
  function getTimeInTimezone(timezone = 'UTC') {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      const parts = formatter.formatToParts(new Date());
      const values = {};
      parts.forEach(part => {
        values[part.type] = part.value;
      });
      return {
        year: parseInt(values.year, 10),
        month: parseInt(values.month, 10) - 1,
        day: parseInt(values.day, 10),
        hour: parseInt(values.hour, 10),
        minute: parseInt(values.minute, 10),
        second: parseInt(values.second, 10),
        dayOfWeek: new Date().getDay(),
      };
    } catch (e) {
      const now = new Date();
      return {
        year: now.getFullYear(),
        month: now.getMonth(),
        day: now.getDate(),
        hour: now.getHours(),
        minute: now.getMinutes(),
        second: now.getSeconds(),
        dayOfWeek: now.getDay(),
      };
    }
  }

  /**
   * Get day of week in timezone
   */
  function getDayOfWeekInTimezone(timezone = 'UTC') {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        weekday: 'short',
      });
      const dayStr = formatter.format(new Date());
      const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      return dayMap[dayStr] ?? new Date().getDay();
    } catch (e) {
      return new Date().getDay();
    }
  }

  /**
   * Parse time string (HH:MM) to minutes since midnight
   */
  function parseTimeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Check if current page is cart page
   */
  function isCartPage() {
    const path = window.location.pathname;
    if (path === '/cart' || path.endsWith('/cart')) return true;
    if (window.Shopify && window.Shopify.routes && window.Shopify.routes.cartUrl) {
      return path === window.Shopify.routes.cartUrl;
    }
    return false;
  }

  /**
   * Get cart total from Shopify
   */
  async function getCartTotal() {
    try {
      const response = await fetch('/cart.js');
      if (response.ok) {
        const cart = await response.json();
        return cart.total_price / 100;
      }
    } catch (e) {
      // Cart fetch failed
    }
    return 0;
  }

  // ============================================================================
  // TIMER DATA EXTRACTION FROM DOM
  // ============================================================================

  /**
   * Extract timer data from a DOM element's data attributes
   */
  function extractTimerData(timerEl) {
    const dataset = timerEl.dataset;
    return {
      id: dataset.timerId,
      type: dataset.timerType || 'COUNTDOWN',
      endDate: dataset.endTime,
      timezone: dataset.timezone || 'UTC',
      evergreenDuration: dataset.evergreenDuration ? parseInt(dataset.evergreenDuration) : null,
      evergreenResetDelay: dataset.evergreenResetDelay ? parseInt(dataset.evergreenResetDelay) : null,
      dailyStartTime: dataset.dailyStartTime || null,
      dailyEndTime: dataset.dailyEndTime || null,
      recurringDays: dataset.recurringDays || null,
      shippingCutoffTime: dataset.shippingCutoffTime || null,
      shippingExcludedDays: dataset.shippingExcludedDays || null,
      shippingHolidays: dataset.shippingHolidays || null,
      shippingNextDayText: dataset.shippingNextDayText || null,
      cartThreshold: dataset.cartThreshold ? parseFloat(dataset.cartThreshold) : null,
      cartTimerDuration: dataset.cartTimerDuration ? parseInt(dataset.cartTimerDuration) : null,
      expiredText: dataset.expiredText || null,
      preText: dataset.preText || null,
      postText: dataset.postText || null,
      linkUrl: dataset.linkUrl || null,
      linkText: dataset.linkText || null,
      backgroundColor: dataset.backgroundColor || '#000000',
      textColor: dataset.textColor || '#FFFFFF',
      accentColor: dataset.accentColor || '#FF0000',
      position: dataset.position || 'TOP',
      showDays: dataset.showDays !== 'false',
      showHours: dataset.showHours !== 'false',
      showMinutes: dataset.showMinutes !== 'false',
      showSeconds: dataset.showSeconds !== 'false',
      showLabels: dataset.showLabels !== 'false',
      closeButton: dataset.closeButton !== 'false',
      showOnAllPages: dataset.showOnAllPages !== 'false',
      targetPages: dataset.targetPages || null,
      excludePages: dataset.excludePages || null,
    };
  }

  function getWrapperPositionStyle(position) {
    switch (position) {
      case 'BOTTOM':
      case 'FLOATING_BOTTOM':
        return 'position: fixed; bottom: 0; left: 0; right: 0; width: 100%;';
      case 'FLOATING_TOP':
      case 'TOP':
        return 'position: fixed; top: 0; left: 0; right: 0; width: 100%;';
      case 'TOP_LEFT':
        return 'position: fixed; top: 20px; left: 20px; width: 320px; max-width: calc(100vw - 40px);';
      case 'TOP_RIGHT':
        return 'position: fixed; top: 20px; right: 20px; width: 320px; max-width: calc(100vw - 40px);';
      case 'BOTTOM_LEFT':
        return 'position: fixed; bottom: 20px; left: 20px; width: 320px; max-width: calc(100vw - 40px);';
      case 'BOTTOM_RIGHT':
        return 'position: fixed; bottom: 20px; right: 20px; width: 320px; max-width: calc(100vw - 40px);';
      case 'LEFT_VERTICAL':
        return 'position: fixed; top: 50%; left: 0; transform: translateY(-50%); width: auto;';
      case 'RIGHT_VERTICAL':
        return 'position: fixed; top: 50%; right: 0; transform: translateY(-50%); width: auto;';
      default:
        return 'position: fixed; top: 0; left: 0; right: 0; width: 100%;';
    }
  }

  function renderTimerMarkup(timer) {
    const showDays = timer.showDays !== false;
    const showHours = timer.showHours !== false;
    const showMinutes = timer.showMinutes !== false;
    const showSeconds = timer.showSeconds !== false;
    const showLabels = timer.showLabels !== false;
    const closeButton = timer.closeButton !== false;
    const position = timer.position || 'TOP';

    return `
      <div
        class="countdown-timer-bar countdown-timer-bar--${escapeHTML(String(position).toLowerCase())}"
        data-timer-id="${escapeHTML(String(timer.id || ''))}"
        data-timer-type="${escapeHTML(String(timer.type || 'COUNTDOWN'))}"
        data-end-time="${escapeHTML(String(timer.endDate || ''))}"
        data-timezone="${escapeHTML(String(timer.timezone || 'UTC'))}"
        ${timer.evergreenDuration != null ? `data-evergreen-duration="${escapeHTML(String(timer.evergreenDuration))}"` : ''}
        ${timer.evergreenResetDelay != null ? `data-evergreen-reset-delay="${escapeHTML(String(timer.evergreenResetDelay))}"` : ''}
        ${timer.dailyStartTime ? `data-daily-start-time="${escapeHTML(String(timer.dailyStartTime))}"` : ''}
        ${timer.dailyEndTime ? `data-daily-end-time="${escapeHTML(String(timer.dailyEndTime))}"` : ''}
        ${timer.recurringDays ? `data-recurring-days="${escapeHTML(String(timer.recurringDays))}"` : ''}
        ${timer.shippingCutoffTime ? `data-shipping-cutoff-time="${escapeHTML(String(timer.shippingCutoffTime))}"` : ''}
        ${timer.shippingExcludedDays ? `data-shipping-excluded-days="${escapeHTML(String(timer.shippingExcludedDays))}"` : ''}
        ${timer.shippingHolidays ? `data-shipping-holidays="${escapeHTML(String(timer.shippingHolidays))}"` : ''}
        ${timer.shippingNextDayText ? `data-shipping-next-day-text="${escapeHTML(String(timer.shippingNextDayText))}"` : ''}
        ${timer.cartThreshold != null ? `data-cart-threshold="${escapeHTML(String(timer.cartThreshold))}"` : ''}
        ${timer.cartTimerDuration != null ? `data-cart-timer-duration="${escapeHTML(String(timer.cartTimerDuration))}"` : ''}
        ${timer.expiredText ? `data-expired-text="${escapeHTML(String(timer.expiredText))}"` : ''}
        ${timer.preText ? `data-pre-text="${escapeHTML(String(timer.preText))}"` : ''}
        ${timer.postText ? `data-post-text="${escapeHTML(String(timer.postText))}"` : ''}
        ${timer.linkUrl ? `data-link-url="${escapeHTML(String(timer.linkUrl))}"` : ''}
        ${timer.linkText ? `data-link-text="${escapeHTML(String(timer.linkText))}"` : ''}
        data-background-color="${escapeHTML(String(timer.backgroundColor || '#000000'))}"
        data-text-color="${escapeHTML(String(timer.textColor || '#FFFFFF'))}"
        data-accent-color="${escapeHTML(String(timer.accentColor || '#FF0000'))}"
        data-position="${escapeHTML(String(position))}"
        data-show-days="${showDays}"
        data-show-hours="${showHours}"
        data-show-minutes="${showMinutes}"
        data-show-seconds="${showSeconds}"
        data-show-labels="${showLabels}"
        data-close-button="${closeButton}"
        data-show-on-all-pages="${timer.showOnAllPages !== false}"
        ${timer.targetPages ? `data-target-pages="${escapeHTML(String(timer.targetPages))}"` : ''}
        ${timer.excludePages ? `data-exclude-pages="${escapeHTML(String(timer.excludePages))}"` : ''}
        style="--timer-bg: ${escapeHTML(String(timer.backgroundColor || '#000000'))}; --timer-text: ${escapeHTML(String(timer.textColor || '#FFFFFF'))}; --timer-accent: ${escapeHTML(String(timer.accentColor || '#FF0000'))}; display: none;"
      >
        <div class="countdown-timer-bar__content">
          ${timer.preText ? `<span class="countdown-timer-bar__pre-text">${escapeHTML(String(timer.preText))}</span>` : ''}
          <div class="countdown-timer-bar__countdown" data-countdown>
            ${showDays ? `<div class="countdown-timer-bar__unit"><span class="countdown-timer-bar__digit" data-days>00</span>${showLabels ? '<span class="countdown-timer-bar__label">Days</span>' : ''}</div><span class="countdown-timer-bar__separator">:</span>` : ''}
            ${showHours ? `<div class="countdown-timer-bar__unit"><span class="countdown-timer-bar__digit" data-hours>00</span>${showLabels ? '<span class="countdown-timer-bar__label">Hrs</span>' : ''}</div><span class="countdown-timer-bar__separator">:</span>` : ''}
            ${showMinutes ? `<div class="countdown-timer-bar__unit"><span class="countdown-timer-bar__digit" data-minutes>00</span>${showLabels ? '<span class="countdown-timer-bar__label">Min</span>' : ''}</div><span class="countdown-timer-bar__separator">:</span>` : ''}
            ${showSeconds ? `<div class="countdown-timer-bar__unit"><span class="countdown-timer-bar__digit" data-seconds>00</span>${showLabels ? '<span class="countdown-timer-bar__label">Sec</span>' : ''}</div>` : ''}
          </div>
          ${timer.postText ? `<span class="countdown-timer-bar__post-text">${escapeHTML(String(timer.postText))}</span>` : ''}
          ${timer.linkUrl && timer.linkText ? `<a href="${escapeHTML(String(timer.linkUrl))}" class="countdown-timer-bar__cta" data-timer-cta="${escapeHTML(String(timer.id || ''))}">${escapeHTML(String(timer.linkText))}</a>` : ''}
        </div>
        ${closeButton ? `<button class="countdown-timer-bar__close" data-timer-close="${escapeHTML(String(timer.id || ''))}" aria-label="Close timer"><svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M12.207 4.793a1 1 0 0 1 0 1.414L9.414 9l2.793 2.793a1 1 0 0 1-1.414 1.414L8 10.414l-2.793 2.793a1 1 0 0 1-1.414-1.414L6.586 9 3.793 6.207a1 1 0 0 1 1.414-1.414L8 7.586l2.793-2.793a1 1 0 0 1 1.414 0z"/></svg></button>` : ''}
      </div>
    `;
  }

  async function fetchProxyTimers(proxyUrl) {
    try {
      const response = await fetch(proxyUrl, {
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return Array.isArray(data.timers) ? data.timers : [];
    } catch (e) {
      return [];
    }
  }

  async function ensureTimerElements(wrapper, container) {
    let timerEls = container.querySelectorAll('[data-timer-id]');
    const hasVisibleMarkup = Array.from(timerEls).some(timerEl => timerEl.dataset.timerType);

    if (hasVisibleMarkup) {
      return timerEls;
    }

    const proxyUrl = wrapper.dataset.proxyUrl || '/apps/timer-mint/active';
    const timers = await fetchProxyTimers(proxyUrl);
    if (timers.length === 0) {
      return timerEls;
    }

    const firstTimer = timers[0];
    const wrapperPosition = firstTimer.position || 'TOP';
    wrapper.dataset.position = wrapperPosition;
    wrapper.className = `countdown-timer-bar-wrapper countdown-timer-bar-wrapper--${String(wrapperPosition)}`;
    wrapper.style.cssText = `${getWrapperPositionStyle(wrapperPosition)} z-index: 999999;`;
    container.innerHTML = timers.map(renderTimerMarkup).join('');

    return container.querySelectorAll('[data-timer-id]');
  }

  // ============================================================================
  // BASE TIMER HANDLER
  // ============================================================================

  class TimerHandler {
    constructor(timer, engine) {
      this.timer = timer;
      this.engine = engine;
      this.endTime = null;
      this.isInitialized = false;
    }

    initialize() {
      this.isInitialized = true;
    }

    calculateEndTime() {
      return null;
    }

    getTimeRemaining() {
      if (!this.endTime) return null;

      const now = Date.now();
      const total = this.endTime - now;

      if (total <= 0) {
        return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        total,
        days: Math.floor(total / (1000 * 60 * 60 * 24)),
        hours: Math.floor((total / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((total / (1000 * 60)) % 60),
        seconds: Math.floor((total / 1000) % 60),
      };
    }

    isActive() {
      const remaining = this.getTimeRemaining();
      return remaining && remaining.total > 0;
    }

    onExpire() {
      // Override in subclasses
    }

    cleanup() {
      this.isInitialized = false;
    }

    getDisplayMessage() {
      return null;
    }
  }

  // ============================================================================
  // FIXED TIMER HANDLER (COUNTDOWN)
  // ============================================================================

  class FixedTimerHandler extends TimerHandler {
    initialize() {
      super.initialize();
      this.endTime = this.calculateEndTime();
    }

    calculateEndTime() {
      if (!this.timer.endDate) return null;
      const endDate = new Date(this.timer.endDate);
      return endDate.getTime();
    }

    onExpire() {
      if (this.timer.expiredText) {
        this.engine.showExpiredState(this.timer);
      }
    }
  }

  // ============================================================================
  // EVERGREEN TIMER HANDLER
  // ============================================================================

  class EvergreenTimerHandler extends TimerHandler {
    constructor(timer, engine) {
      super(timer, engine);
      this.storageKey = STORAGE_KEYS.EVERGREEN_PREFIX + timer.id + '_' + getVisitorId();
    }

    initialize() {
      super.initialize();
      this.endTime = this.calculateEndTime();
    }

    calculateEndTime() {
      if (!this.timer.evergreenDuration) return null;

      const stored = safeGetStorage(this.storageKey);
      const now = Date.now();

      if (stored) {
        const { startTime, resetAt } = stored;

        if (resetAt && now >= resetAt) {
          return this.setNewStartTime(now);
        }

        const endTime = startTime + (this.timer.evergreenDuration * 60 * 1000);

        if (now >= endTime) {
          const resetDelay = (this.timer.evergreenResetDelay || 0) * 60 * 1000;

          if (resetDelay > 0) {
            const resetAt = endTime + resetDelay;
            safeSetStorage(this.storageKey, { startTime, resetAt });

            if (now < resetAt) {
              return null;
            }
            return this.setNewStartTime(now);
          } else {
            return this.setNewStartTime(now);
          }
        }

        return endTime;
      }

      return this.setNewStartTime(now);
    }

    setNewStartTime(startTime) {
      const endTime = startTime + (this.timer.evergreenDuration * 60 * 1000);
      safeSetStorage(this.storageKey, { startTime, resetAt: null });
      return endTime;
    }

    onExpire() {
      const newEndTime = this.calculateEndTime();
      if (newEndTime && newEndTime > Date.now()) {
        this.endTime = newEndTime;
        this.engine.refreshTimer(this.timer);
      } else if (this.timer.expiredText) {
        this.engine.showExpiredState(this.timer);
      }
    }

    isActive() {
      this.endTime = this.calculateEndTime();
      return super.isActive();
    }
  }

  // ============================================================================
  // RECURRING TIMER HANDLER (DAILY)
  // ============================================================================

  class RecurringTimerHandler extends TimerHandler {
    initialize() {
      super.initialize();
      this.updateEndTime();
    }

    updateEndTime() {
      this.endTime = this.calculateEndTime();
    }

    calculateEndTime() {
      const timezone = this.timer.timezone || 'UTC';
      const currentDay = getDayOfWeekInTimezone(timezone);
      const timeInfo = getTimeInTimezone(timezone);
      const currentMinutes = timeInfo.hour * 60 + timeInfo.minute;

      const recurringDays = this.parseRecurringDays();
      if (!recurringDays.includes(currentDay)) {
        return null;
      }

      const startMinutes = parseTimeToMinutes(this.timer.dailyStartTime);
      const endMinutes = parseTimeToMinutes(this.timer.dailyEndTime);

      const isOvernight = endMinutes < startMinutes;
      let isInWindow = false;
      let minutesUntilEnd = 0;

      if (isOvernight) {
        if (currentMinutes >= startMinutes || currentMinutes < endMinutes) {
          isInWindow = true;
          if (currentMinutes >= startMinutes) {
            minutesUntilEnd = (24 * 60 - currentMinutes) + endMinutes;
          } else {
            minutesUntilEnd = endMinutes - currentMinutes;
          }
        }
      } else {
        if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
          isInWindow = true;
          minutesUntilEnd = endMinutes - currentMinutes;
        }
      }

      if (!isInWindow) {
        return null;
      }

      return Date.now() + (minutesUntilEnd * 60 * 1000);
    }

    parseRecurringDays() {
      if (!this.timer.recurringDays) {
        return [0, 1, 2, 3, 4, 5, 6];
      }
      try {
        return JSON.parse(this.timer.recurringDays);
      } catch (e) {
        return [0, 1, 2, 3, 4, 5, 6];
      }
    }

    isActive() {
      this.updateEndTime();
      return super.isActive();
    }

    onExpire() {
      setTimeout(() => {
        this.updateEndTime();
        if (this.isActive()) {
          this.engine.refreshTimer(this.timer);
        } else if (this.timer.expiredText) {
          this.engine.showExpiredState(this.timer);
        }
      }, 1000);
    }
  }

  // ============================================================================
  // CART TIMER HANDLER
  // ============================================================================

  class CartTimerHandler extends TimerHandler {
    constructor(timer, engine) {
      super(timer, engine);
      this.storageKey = STORAGE_KEYS.CART_PREFIX + timer.id;
      this.cartTotal = 0;
    }

    async initialize() {
      super.initialize();

      if (!isCartPage()) {
        this.endTime = null;
        return;
      }

      this.cartTotal = await getCartTotal();

      if (this.timer.cartThreshold && this.cartTotal < this.timer.cartThreshold) {
        this.endTime = null;
        return;
      }

      this.endTime = this.calculateEndTime();
    }

    calculateEndTime() {
      if (!isCartPage()) return null;

      const duration = this.timer.cartTimerDuration || this.timer.evergreenDuration || 15;
      const stored = safeGetSession(this.storageKey);
      const now = Date.now();

      if (stored && stored.startTime) {
        const endTime = stored.startTime + (duration * 60 * 1000);
        if (now < endTime) {
          return endTime;
        }
      }

      const startTime = now;
      const endTime = startTime + (duration * 60 * 1000);
      safeSetSession(this.storageKey, { startTime });
      return endTime;
    }

    isActive() {
      if (!isCartPage()) return false;

      if (this.timer.cartThreshold && this.cartTotal < this.timer.cartThreshold) {
        return false;
      }

      return super.isActive();
    }

    onExpire() {
      if (this.timer.expiredText) {
        this.engine.showExpiredState(this.timer);
      }
    }

    getDisplayMessage() {
      if (this.timer.cartThreshold && this.cartTotal < this.timer.cartThreshold) {
        const remaining = this.timer.cartThreshold - this.cartTotal;
        return `Add $${remaining.toFixed(2)} more to qualify!`;
      }
      return null;
    }
  }

  // ============================================================================
  // SHIPPING TIMER HANDLER
  // ============================================================================

  class ShippingTimerHandler extends TimerHandler {
    constructor(timer, engine) {
      super(timer, engine);
      this.isPastCutoff = false;
      this.nextShippingDay = null;
    }

    initialize() {
      super.initialize();
      this.updateState();
    }

    updateState() {
      const timezone = this.timer.timezone || 'UTC';
      const timeInfo = getTimeInTimezone(timezone);
      const currentDay = getDayOfWeekInTimezone(timezone);
      const currentMinutes = timeInfo.hour * 60 + timeInfo.minute;
      const cutoffMinutes = parseTimeToMinutes(this.timer.shippingCutoffTime || '14:00');

      const excludedDays = this.parseExcludedDays();
      const holidays = this.parseHolidays();
      const todayStr = this.formatDateStr(timeInfo);

      const isTodayExcluded = excludedDays.includes(currentDay) || holidays.includes(todayStr);

      if (isTodayExcluded || currentMinutes >= cutoffMinutes) {
        this.isPastCutoff = true;
        this.nextShippingDay = this.findNextShippingDay(currentDay, excludedDays, holidays, timeInfo);
        this.endTime = null;
      } else {
        this.isPastCutoff = false;
        this.endTime = this.calculateEndTime(cutoffMinutes, currentMinutes);
      }
    }

    calculateEndTime(cutoffMinutes, currentMinutes) {
      if (cutoffMinutes === undefined) {
        cutoffMinutes = parseTimeToMinutes(this.timer.shippingCutoffTime || '14:00');
      }
      if (currentMinutes === undefined) {
        const timezone = this.timer.timezone || 'UTC';
        const timeInfo = getTimeInTimezone(timezone);
        currentMinutes = timeInfo.hour * 60 + timeInfo.minute;
      }

      const minutesUntilCutoff = cutoffMinutes - currentMinutes;
      if (minutesUntilCutoff <= 0) {
        return null;
      }

      return Date.now() + (minutesUntilCutoff * 60 * 1000);
    }

    parseExcludedDays() {
      if (!this.timer.shippingExcludedDays) {
        return [0, 6];
      }
      try {
        return JSON.parse(this.timer.shippingExcludedDays);
      } catch (e) {
        return [0, 6];
      }
    }

    parseHolidays() {
      if (!this.timer.shippingHolidays) {
        return [];
      }
      try {
        return JSON.parse(this.timer.shippingHolidays);
      } catch (e) {
        return [];
      }
    }

    formatDateStr(timeInfo) {
      const year = timeInfo.year;
      const month = String(timeInfo.month + 1).padStart(2, '0');
      const day = String(timeInfo.day).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    findNextShippingDay(currentDay, excludedDays, holidays, timeInfo) {
      let daysToAdd = 1;
      const maxDays = 14;

      while (daysToAdd <= maxDays) {
        const checkDay = (currentDay + daysToAdd) % 7;

        const checkDate = new Date();
        checkDate.setDate(checkDate.getDate() + daysToAdd);
        const checkDateStr = checkDate.toISOString().split('T')[0];

        if (!excludedDays.includes(checkDay) && !holidays.includes(checkDateStr)) {
          return {
            dayOfWeek: checkDay,
            daysAway: daysToAdd,
            date: checkDate,
          };
        }

        daysToAdd++;
      }

      return null;
    }

    isActive() {
      this.updateState();
      return !this.isPastCutoff && super.isActive();
    }

    onExpire() {
      this.updateState();
    }

    getDisplayMessage() {
      if (this.isPastCutoff) {
        if (this.timer.shippingNextDayText) {
          return this.timer.shippingNextDayText;
        }
        if (this.nextShippingDay) {
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          if (this.nextShippingDay.daysAway === 1) {
            return 'Order now for delivery tomorrow!';
          }
          return `Order now for ${dayNames[this.nextShippingDay.dayOfWeek]} delivery!`;
        }
        return 'Order now for next business day delivery!';
      }
      return null;
    }
  }

  // ============================================================================
  // TIMER ENGINE
  // ============================================================================

  class TimerEngine {
    constructor() {
      this.handlers = new Map();
      this.timers = [];
      this.animationFrameId = null;
      this.lastUpdateTime = 0;
    }

    static handlerTypes = {
      FIXED: FixedTimerHandler,
      COUNTDOWN: FixedTimerHandler,
      EVERGREEN: EvergreenTimerHandler,
      RECURRING: RecurringTimerHandler,
      DAILY_RECURRING: RecurringTimerHandler,
      DAILY: RecurringTimerHandler,
      CART: CartTimerHandler,
      SHIPPING: ShippingTimerHandler,
    };

    async registerTimer(timer) {
      const HandlerClass = TimerEngine.handlerTypes[timer.type] || FixedTimerHandler;
      const handler = new HandlerClass(timer, this);

      await handler.initialize();

      this.handlers.set(timer.id, handler);
      this.timers.push(timer);
    }

    unregisterTimer(id) {
      const handler = this.handlers.get(id);
      if (handler) {
        handler.cleanup();
        this.handlers.delete(id);
      }
      this.timers = this.timers.filter(t => t.id !== id);
    }

    getTimeRemaining(id) {
      const handler = this.handlers.get(id);
      return handler ? handler.getTimeRemaining() : null;
    }

    isTimerActive(id) {
      const handler = this.handlers.get(id);
      return handler ? handler.isActive() : false;
    }

    getDisplayMessage(id) {
      const handler = this.handlers.get(id);
      return handler ? handler.getDisplayMessage() : null;
    }

    getEndTime(id) {
      const handler = this.handlers.get(id);
      return handler ? handler.endTime : null;
    }

    refreshTimer(timer) {
      const timerEl = document.querySelector(`[data-timer-id="${timer.id}"]`);
      if (timerEl) {
        this.updateTimerDisplay(timerEl, timer.id);
      }
    }

    showExpiredState(timer) {
      const timerEl = document.querySelector(`[data-timer-id="${timer.id}"]`);
      if (timerEl && !timerEl.classList.contains('countdown-timer-bar--expired')) {
        timerEl.classList.add('countdown-timer-bar--expired');
        const content = timerEl.querySelector('.countdown-timer-bar__content');
        if (content && timer.expiredText) {
          content.innerHTML = `<span class="countdown-timer-bar__expired-text">${escapeHTML(timer.expiredText)}</span>`;
        }
      }
    }

    startCountdown() {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
      }

      const update = (timestamp) => {
        if (timestamp - this.lastUpdateTime >= 1000) {
          this.lastUpdateTime = timestamp;
          this.updateAllDisplays();
        }
        this.animationFrameId = requestAnimationFrame(update);
      };

      this.animationFrameId = requestAnimationFrame(update);
    }

    stopCountdown() {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
    }

    updateAllDisplays() {
      const timerEls = document.querySelectorAll('[data-timer-id]');
      timerEls.forEach(timerEl => {
        const timerId = timerEl.dataset.timerId;
        this.updateTimerDisplay(timerEl, timerId);
      });
    }

    updateTimerDisplay(timerEl, timerId) {
      const handler = this.handlers.get(timerId);
      if (!handler) return;

      const remaining = handler.getTimeRemaining();

      if (!remaining || remaining.total <= 0) {
        if (!timerEl.classList.contains('countdown-timer-bar--expired')) {
          handler.onExpire();

          const message = handler.getDisplayMessage();
          if (message) {
            this.showMessage(timerEl, message);
          }
        }
        return;
      }

      this.updateDigit(timerEl, '[data-days]', remaining.days);
      this.updateDigit(timerEl, '[data-hours]', remaining.hours);
      this.updateDigit(timerEl, '[data-minutes]', remaining.minutes);
      this.updateDigit(timerEl, '[data-seconds]', remaining.seconds);
    }

    updateDigit(timerEl, selector, value) {
      const digit = timerEl.querySelector(selector);
      if (!digit) return;

      const newValue = padZero(value);
      if (digit.textContent !== newValue) {
        digit.classList.add('countdown-timer-bar__digit--flip');
        digit.textContent = newValue;

        setTimeout(() => {
          digit.classList.remove('countdown-timer-bar__digit--flip');
        }, 300);
      }
    }

    showMessage(timerEl, message) {
      const content = timerEl.querySelector('.countdown-timer-bar__content');
      if (content) {
        timerEl.classList.add('countdown-timer-bar--message');
        content.innerHTML = `<span class="countdown-timer-bar__message-text">${escapeHTML(message)}</span>`;
      }
    }
  }

  // ============================================================================
  // CLOSED TIMERS MANAGEMENT
  // ============================================================================

  function getClosedTimers() {
    const data = safeGetStorage(STORAGE_KEYS.CLOSED, {});
    const now = Date.now();
    const filtered = {};

    Object.entries(data).forEach(([id, timestamp]) => {
      if (now - timestamp < 24 * 60 * 60 * 1000) {
        filtered[id] = timestamp;
      }
    });

    if (Object.keys(filtered).length !== Object.keys(data).length) {
      safeSetStorage(STORAGE_KEYS.CLOSED, filtered);
    }

    return Object.keys(filtered);
  }

  function saveClosedTimer(timerId) {
    const data = safeGetStorage(STORAGE_KEYS.CLOSED, {});
    data[timerId] = Date.now();
    safeSetStorage(STORAGE_KEYS.CLOSED, data);
  }

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  /**
   * Send analytics event to the server via app proxy
   */
  function sendAnalytics(event, timerId) {
    const analyticsUrl = '/apps/timer-mint/analytics';
    const payload = JSON.stringify({
      event: event,
      timerId: timerId,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    });

    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(analyticsUrl, blob);
      } else {
        fetch(analyticsUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(function() {});
      }
    } catch (e) {
      // Analytics failure should never break the timer
    }
  }

  /**
   * Track an impression (once per timer per day per device)
   */
  function trackImpression(timerId) {
    const data = safeGetStorage(STORAGE_KEYS.IMPRESSIONS, {});
    const sessionKey = `${timerId}_${new Date().toDateString()}`;

    if (!data[sessionKey]) {
      data[sessionKey] = true;
      safeSetStorage(STORAGE_KEYS.IMPRESSIONS, data);
      sendAnalytics('impression', timerId);
    }
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  function attachEventListeners(container) {
    container.querySelectorAll('[data-timer-close]').forEach(btn => {
      btn.addEventListener('click', handleClose);
    });

    container.querySelectorAll('[data-timer-cta]').forEach(link => {
      link.addEventListener('click', handleCtaClick);
    });
  }

  function handleClose(event) {
    const timerId = event.currentTarget.dataset.timerClose;
    const timerEl = document.querySelector(`[data-timer-id="${timerId}"]`);

    if (timerEl) {
      timerEl.classList.add('countdown-timer-bar--closing');

      setTimeout(() => {
        timerEl.remove();

        const remaining = document.querySelectorAll('[data-timer-id]');
        if (remaining.length === 0) {
          const wrapper = document.querySelector('.countdown-timer-bar-wrapper');
          if (wrapper) wrapper.style.display = 'none';
        }
      }, 300);
    }

    saveClosedTimer(timerId);
  }

  function handleCtaClick(event) {
    const timerId = event.currentTarget.dataset.timerCta;
    sendAnalytics('click', timerId);
  }

  // ============================================================================
  // PAGE TARGETING
  // ============================================================================

  function parsePagePatterns(value) {
    if (!value) return [];

    if (Array.isArray(value)) {
      return value.map(pattern => String(pattern).trim()).filter(Boolean);
    }

    if (typeof value !== 'string') {
      return [];
    }

    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map(pattern => String(pattern).trim()).filter(Boolean);
      }
      if (typeof parsed === 'string' && parsed.trim()) {
        return [parsed.trim()];
      }
    } catch (e) {
      // Fall back to plain-text parsing
    }

    return trimmed
      .split(/[\n,]+/)
      .map(pattern => pattern.trim())
      .filter(Boolean);
  }

  /**
   * Check if timer should show on current page
   */
  function shouldShowOnPage(timer) {
    const currentPath = window.location.pathname;
    const excludePatterns = parsePagePatterns(timer.excludePages);
    const targetPatterns = parsePagePatterns(timer.targetPages);

    // Show on all pages by default
    if (timer.showOnAllPages) {
      if (excludePatterns.some(pattern => matchPage(currentPath, pattern))) {
        return false;
      }
      return true;
    }

    if (targetPatterns.length > 0) {
      return targetPatterns.some(pattern => matchPage(currentPath, pattern));
    }

    return false;
  }

  /**
   * Match current path against a pattern
   */
  function matchPage(path, pattern) {
    // Simple pattern matching
    if (pattern === '*' || pattern === '/') return true;

    // Exact match
    if (path === pattern) return true;

    // Wildcard matching (e.g., /collections/*)
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      return path.startsWith(prefix);
    }

    // Page type matching
    const pageTypes = {
      'home': '/',
      'collection': '/collections/',
      'product': '/products/',
      'cart': '/cart',
      'checkout': '/checkout',
      'page': '/pages/',
      'blog': '/blogs/',
    };

    if (pageTypes[pattern]) {
      if (pattern === 'home') {
        return path === '/' || path === '';
      }
      return path.startsWith(pageTypes[pattern]);
    }

    return false;
  }

  // ============================================================================
  // MAIN INITIALIZATION
  // ============================================================================

  let globalEngine = null;

  async function initTimers() {
    const wrapper = document.querySelector('.countdown-timer-bar-wrapper');
    if (!wrapper) {
      console.log('Timer Mint: No timer wrapper found');
      return;
    }

    const container = wrapper.querySelector('[data-timer-container]');
    if (!container) {
      console.log('Timer Mint: No timer container found');
      return;
    }

    // Get all timer elements rendered by Liquid or fetched from the app proxy fallback
    const timerEls = await ensureTimerElements(wrapper, container);
    if (timerEls.length === 0) {
      console.log('Timer Mint: No timer elements found in DOM or proxy');
      return;
    }

    // Get closed timers list
    const closedTimers = getClosedTimers();

    // Create engine
    globalEngine = new TimerEngine();

    // Process each timer
    let visibleCount = 0;
    for (const timerEl of timerEls) {
      const timer = extractTimerData(timerEl);

      // Skip closed timers
      if (closedTimers.includes(timer.id)) {
        timerEl.style.display = 'none';
        continue;
      }

      // Check page targeting
      if (!shouldShowOnPage(timer)) {
        timerEl.style.display = 'none';
        continue;
      }

      // Register with engine
      await globalEngine.registerTimer(timer);

      // Check if timer is active
      if (globalEngine.isTimerActive(timer.id)) {
        timerEl.style.display = '';
        visibleCount++;
        trackImpression(timer.id);
      } else {
        // Check for display message (e.g., shipping "next day" message)
        const message = globalEngine.getDisplayMessage(timer.id);
        if (message) {
          timerEl.style.display = '';
          visibleCount++;
          const content = timerEl.querySelector('.countdown-timer-bar__content');
          if (content) {
            content.innerHTML = `<span class="countdown-timer-bar__message-text">${escapeHTML(message)}</span>`;
          }
        } else if (timer.expiredText) {
          // Show expired state
          timerEl.style.display = '';
          visibleCount++;
          timerEl.classList.add('countdown-timer-bar--expired');
          const content = timerEl.querySelector('.countdown-timer-bar__content');
          if (content) {
            content.innerHTML = `<span class="countdown-timer-bar__expired-text">${escapeHTML(timer.expiredText)}</span>`;
          }
        } else {
          timerEl.style.display = 'none';
        }
      }
    }

    if (visibleCount > 0) {
      wrapper.style.display = 'block';
      attachEventListeners(container);
      globalEngine.startCountdown();
      console.log('Timer Mint: Initialized', visibleCount, 'timer(s)');
    } else {
      wrapper.style.display = 'none';
      console.log('Timer Mint: No active timers to display');
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTimers);
  } else {
    initTimers();
  }

  // Export for testing
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      TimerEngine,
      TimerHandler,
      FixedTimerHandler,
      EvergreenTimerHandler,
      RecurringTimerHandler,
      CartTimerHandler,
      ShippingTimerHandler,
      getVisitorId,
      getTimeInTimezone,
      getDayOfWeekInTimezone,
      parseTimeToMinutes,
      isCartPage,
      padZero,
      escapeHTML,
    };
  }
})();
