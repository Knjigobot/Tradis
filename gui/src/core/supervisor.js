/**
 * Tradis Core: Hot-Swappable Plugin Supervisor (Cordis Theorem 4: Fault Isolation)
 * Erlang/OTP-style supervisor in pure Cordis JS. Rogue plugins are safely quarantined
 * without taking down the 24/7/365 trading engine.
 */
export class PluginSupervisor {
  constructor(context) {
    this.context = context;
    this.plugins = new Map();
    this.auditListeners = new Set();
  }

  onAudit(cb) {
    this.auditListeners.add(cb);
  }

  logAudit(msg, level = 'info') {
    this.auditListeners.forEach(cb => cb(msg, level));
  }

  register(plugin) {
    try {
      if (plugin.onInit) plugin.onInit(this.context);
      this.plugins.set(plugin.id, {
        instance: plugin,
        status: 'Active',
        errorCount: 0,
        processedEvents: 0
      });
      this.logAudit([PLUGIN REGISTERED] '' (v) is now ACTIVE.);
    } catch (err) {
      this.logAudit([PLUGIN INIT FAILED] '': , 'error');
    }
  }

  unregister(pluginId) {
    if (this.plugins.has(pluginId)) {
      const entry = this.plugins.get(pluginId);
      try {
        if (entry.instance.onShutdown) entry.instance.onShutdown(this.context);
      } catch (_) {}
      this.plugins.delete(pluginId);
      this.logAudit([PLUGIN UNREGISTERED] '' removed cleanly.);
    }
  }

  hotReload(newPlugin) {
    this.logAudit([HOT-RELOAD] Reloading plugin '' without engine downtime...);
    this.unregister(newPlugin.id);
    this.register(newPlugin);
    this.logAudit([HOT-RELOAD SUCCESS] Plugin '' upgraded seamlessly.);
  }

  dispatch(event, currentTime) {
    const commands = [];
    for (const [id, entry] of this.plugins.entries()) {
      if (entry.status === 'Active') {
        try {
          const cmds = entry.instance.onEvent(this.context, event, currentTime);
          if (Array.isArray(cmds)) commands.push(...cmds);
          entry.processedEvents++;
        } catch (err) {
          entry.errorCount++;
          entry.status = 'Quarantined';
          this.logAudit([SUPERVISOR INTERCEPT] Rogue plugin '' threw exception: , 'error');
          this.logAudit([INVARIANT T4] Plugin '' safely QUARANTINED. Core engine 100% stable with 0% downtime., 'warn');
        }
      }
    }
    return commands;
  }
}
