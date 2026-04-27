import { registerLocaleData } from '@angular/common';
import localeFrTn from '@angular/common/locales/fr-TN';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

registerLocaleData(localeFrTn);

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
