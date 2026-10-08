import { Injectable, signal } from '@angular/core';

/** Captura beforeinstallprompt para ofrecer el boton "Instalar app" (PWA instalable, sin APK). */
@Injectable({ providedIn: 'root' })
export class InstallService {
  private deferred: any = null;
  readonly canInstall = signal(false);
  readonly installed = signal(false);

  constructor() {
    this.installed.set(window.matchMedia('(display-mode: standalone)').matches);
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferred = e;
      this.canInstall.set(true);
    });
    window.addEventListener('appinstalled', () => {
      this.deferred = null;
      this.canInstall.set(false);
      this.installed.set(true);
    });
  }

  async install(): Promise<void> {
    if (!this.deferred) return;
    this.deferred.prompt();
    await this.deferred.userChoice;
    this.deferred = null;
    this.canInstall.set(false);
  }
}
