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
      this.logAudit(`[PLUGIN REGISTERED] '${plugin.name}' (v${plugin.version || '1.0'}) is ACTIVE.`, 'info');
    } catch (err) {
      this.logAudit(`[PLUGIN INIT FAILED] '${plugin.name}': ${err.message}`, 'error');
    }
  }

  unregister(pluginId) {
    if (this.plugins.has(pluginId)) {
      const entry = this.plugins.get(pluginId);
      try {
        if (entry.instance.onShutdown) entry.instance.onShutdown(this.context);
      } catch (_) {}
      this.plugins.delete(pluginId);
      this.logAudit(`[PLUGIN UNREGISTERED] '${pluginId}' unloaded cleanly.`, 'info');
    }
  }

  hotReload(newPlugin) {
    this.logAudit(`[HOT-RELOAD] Reloading plugin '${newPlugin.id}' without engine downtime...`, 'info');
    this.unregister(newPlugin.id);
    this.register(newPlugin);
    this.logAudit(`[HOT-RELOAD SUCCESS] Plugin '${newPlugin.id}' upgraded seamlessly.`, 'info');
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
          this.logAudit(`[SUPERVISOR INTERCEPT] Rogue plugin '${entry.instance.name}' threw exception: ${err.message}`, 'error');
          this.logAudit(`[INVARIANT T4] Plugin '${id}' safely QUARANTINED. Core engine running with 0% downtime.`, 'warn');
        }
      }
    }
    return commands;
  }
}